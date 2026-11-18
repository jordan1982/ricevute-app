import React, { useEffect, useMemo, useRef, useState } from 'react'
import { saveAs } from 'file-saver'
import {
  CAlert, CBadge, CButton, CCard, CCardBody, CCardHeader, CCol, CFormCheck, CFormInput, CFormSelect,
  CInputGroup, CInputGroupText, CRow, CSpinner,
} from '@coreui/react'
import Page from '../../components/Page'
import RecipientModal from '../../components/RecipientModal'
import { useApp } from '../../context/AppContext'
import { useRecipients } from '../../lib/useRecipients'
import { parseRecipientsCsv } from '../../lib/csv'
import { getLastNumber, issueReceipts } from '../../lib/db'
import { formatEuro, toCents } from '../../lib/numbers'

const METHODS = ['Contanti', 'Bonifico', 'Carta / POS', 'Assegno']
const localToday = () => {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

const Ricevute = () => {
  const { current, session, counterTick, refreshCounter } = useApp()
  const assocId = current?.id
  const { items, loading, error, add } = useRecipients(assocId)

  const [form, setForm] = useState({ date: localToday(), amount: '', causale: '', method: METHODS[0] })
  const [temp, setTemp] = useState([]) // società caricate da CSV solo per questa sessione
  const [selected, setSelected] = useState(() => new Set())
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState(false)
  const [saveCsv, setSaveCsv] = useState(false)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState(null)
  const [lastNumber, setLastNumber] = useState(0)
  const fileRef = useRef(null)

  const year = Number(form.date.slice(0, 4))
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(form.date) && year >= 2000

  useEffect(() => {
    setTemp([])
    setSelected(new Set())
    setMsg(null)
  }, [assocId])

  useEffect(() => {
    if (!assocId || !validDate) return undefined
    let off = false
    getLastNumber(assocId, year).then((n) => !off && setLastNumber(n)).catch(() => {})
    return () => {
      off = true
    }
  }, [assocId, year, validDate, counterTick])

  const all = useMemo(() => [...temp, ...items], [temp, items])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? all.filter((r) => `${r.name} ${r.taxId}`.toLowerCase().includes(q)) : all
  }, [all, query])

  const chosen = all.filter((r) => selected.has(r.id))
  const amountCents = toCents(form.amount)
  const canGenerate = !busy && validDate && amountCents && form.causale.trim() && chosen.length > 0
  const allFilteredSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id))

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const toggle = (id) =>
    setSelected((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  const toggleAll = () =>
    setSelected((s) => {
      const n = new Set(s)
      filtered.forEach((r) => (allFilteredSelected ? n.delete(r.id) : n.add(r.id)))
      return n
    })

  const onCsv = async (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    try {
      const rows = await parseRecipientsCsv(file)
      if (!rows.length) return setMsg({ color: 'warning', text: 'Nessuna riga valida: serve una colonna “nome” o “ragione sociale”.' })
      if (saveCsv) {
        await add(rows)
        setMsg({ color: 'success', text: `${rows.length} società salvate in anagrafica: selezionale per emettere le ricevute.` })
      } else {
        const withIds = rows.map((r, i) => ({ ...r, id: `csv-${Date.now()}-${i}`, fromCsv: true }))
        setTemp((t) => [...t, ...withIds])
        setSelected((s) => new Set([...s, ...withIds.map((r) => r.id)]))
        setMsg({ color: 'info', text: `${rows.length} società caricate dal CSV e selezionate (non vengono salvate).` })
      }
    } catch (err) {
      setMsg({ color: 'danger', text: err.message })
    }
  }

  const generate = async (mode) => {
    setMsg(null)
    let first = null
    try {
      setBusy('Registro le ricevute…')
      first = await issueReceipts(
        current.key, assocId, year,
        chosen.map((r) => ({
          recipient: { name: r.name, address: r.address, taxId: r.taxId },
          date: form.date, amountCents, causale: form.causale.trim(), method: form.method,
          by: session.user.email,
        })),
      )
      const last = first + chosen.length - 1
      const receipts = chosen.map((r, i) => ({
        number: first + i, year, date: form.date, recipient: r,
        amountCents, causale: form.causale.trim(), method: form.method,
      }))
      setBusy('Creo i PDF…')
      const { buildSinglePdf, buildZip } = await import('../../lib/pdf')
      const blob =
        mode === 'zip'
          ? await buildZip(current, receipts, (n) => setBusy(`Creo i PDF… ${n}/${receipts.length}`))
          : await buildSinglePdf(current, receipts)
      saveAs(blob, `ricevute_${year}_${first}-${last}.${mode === 'zip' ? 'zip' : 'pdf'}`)
      setMsg({ color: 'success', text: `Create ${chosen.length} ricevute, dalla n. ${first}/${year} alla n. ${last}/${year}.` })
      setSelected(new Set())
    } catch (err) {
      const note = first
        ? ` Le ricevute dal n. ${first} al n. ${first + chosen.length - 1} del ${year} sono già registrate: riscaricale dal Registro.`
        : ''
      setMsg({ color: 'danger', text: `${err.message}.${note}` })
    } finally {
      setBusy('')
      refreshCounter()
    }
  }

  const total = amountCents ? formatEuro(amountCents * chosen.length) : null

  return (
    <Page title="Nuove ricevute" needsAssociation>
      {msg && <CAlert color={msg.color} dismissible onClose={() => setMsg(null)}>{msg.text}</CAlert>}
      <CRow className="g-4">
        <CCol xs={12} lg={4}>
          <CCard>
            <CCardHeader>Dati uguali per tutte</CCardHeader>
            <CCardBody>
              <CFormInput type="date" label="Data" value={form.date} onChange={setField('date')} className="mb-3" />
              <label className="form-label" htmlFor="amount">Importo</label>
              <CInputGroup className="mb-3">
                <CInputGroupText>€</CInputGroupText>
                <CFormInput id="amount" inputMode="decimal" placeholder="50,00" value={form.amount} onChange={setField('amount')} />
              </CInputGroup>
              <CFormInput label="Causale" placeholder="Quota partecipazione evento" value={form.causale} onChange={setField('causale')} className="mb-3" />
              <CFormSelect label="Pagamento" value={form.method} onChange={setField('method')}>
                {METHODS.map((m) => <option key={m}>{m}</option>)}
              </CFormSelect>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xs={12} lg={8}>
          <CCard>
            <CCardHeader className="d-flex flex-wrap gap-2 align-items-center">
              <CFormInput style={{ maxWidth: 220 }} placeholder="Cerca società" value={query} onChange={(e) => setQuery(e.target.value)} />
              <div className="ms-auto d-flex flex-wrap gap-2 align-items-center">
                <CFormCheck id="saveCsv" label="Salva il CSV in anagrafica" checked={saveCsv} onChange={(e) => setSaveCsv(e.target.checked)} />
                <CButton color="secondary" variant="outline" size="sm" onClick={() => fileRef.current.click()}>Carica CSV</CButton>
                <CButton color="primary" size="sm" onClick={() => setModal(true)}>Nuova società</CButton>
                <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={onCsv} />
              </div>
            </CCardHeader>
            <div style={{ maxHeight: 460, overflowY: 'auto' }}>
              {loading ? (
                <div className="p-4"><CSpinner color="primary" /></div>
              ) : error ? (
                <CAlert color="danger" className="m-3">{error}</CAlert>
              ) : !all.length ? (
                <p className="p-4 mb-0 text-body-secondary">
                  Nessuna società. Aggiungine una, carica un CSV o compila prima l’anagrafica.
                </p>
              ) : (
                <table className="table table-hover table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }} className="ps-3">
                        <CFormCheck checked={allFilteredSelected} onChange={toggleAll} aria-label="Seleziona tutte" />
                      </th>
                      <th>Denominazione</th><th>Indirizzo</th><th>C.F. / P.IVA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr key={r.id} onClick={() => toggle(r.id)} style={{ cursor: 'pointer' }}>
                        <td className="ps-3">
                          <CFormCheck checked={selected.has(r.id)} onChange={() => toggle(r.id)} onClick={(e) => e.stopPropagation()} aria-label={`Seleziona ${r.name}`} />
                        </td>
                        <td>{r.name} {r.fromCsv && <CBadge color="info" className="ms-1">CSV</CBadge>}</td>
                        <td>{r.address}</td>
                        <td>{r.taxId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </CCard>
        </CCol>
      </CRow>

      <div className="position-sticky bottom-0 bg-body border-top py-3 mt-4 d-flex flex-wrap align-items-center gap-3">
        <div className="me-auto">
          <strong>{chosen.length}</strong> {chosen.length === 1 ? 'ricevuta' : 'ricevute'}
          {total && <> da {formatEuro(amountCents)}, totale {total}</>}
          {chosen.length > 0 && validDate && (
            <div className="small text-body-secondary">
              Numeri dal {lastNumber + 1}/{year} al {lastNumber + chosen.length}/{year}
            </div>
          )}
        </div>
        {busy && <span className="text-body-secondary"><CSpinner size="sm" className="me-2" />{busy}</span>}
        <CButton color="secondary" variant="outline" disabled={!canGenerate} onClick={() => generate('zip')}>
          ZIP, un PDF per società
        </CButton>
        <CButton color="primary" disabled={!canGenerate} onClick={() => generate('pdf')}>
          Crea PDF unico
        </CButton>
      </div>

      <RecipientModal visible={modal} initial={null} onClose={() => setModal(false)} onSave={(d) => add([d])} />
    </Page>
  )
}

export default Ricevute
