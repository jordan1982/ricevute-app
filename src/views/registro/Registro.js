import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { saveAs } from 'file-saver'
import Papa from 'papaparse'
import { CAlert, CButton, CCard, CCardHeader, CFormCheck, CFormInput, CFormSelect, CSpinner } from '@coreui/react'
import Page from '../../components/Page'
import { useApp } from '../../context/AppContext'
import { listReceiptYears, listReceipts } from '../../lib/db'
import { formatEuro } from '../../lib/numbers'

const fmtDate = (iso) => iso.split('-').reverse().join('/')

const Registro = () => {
  const { current } = useApp()
  const assocId = current?.id
  const thisYear = new Date().getFullYear()
  const [years, setYears] = useState([thisYear])
  const [year, setYear] = useState(thisYear)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(() => new Set())
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    if (!assocId) return
    setLoading(true)
    setError('')
    try {
      const ys = await listReceiptYears(assocId)
      setYears([...new Set([thisYear, ...ys])].sort((a, b) => b - a))
      setRows(await listReceipts(current.key, assocId, year))
      setSelected(new Set())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [assocId, year]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q
      ? rows.filter((r) => `${r.number} ${r.recipient.name} ${r.recipient.taxId} ${r.causale}`.toLowerCase().includes(q))
      : rows
  }, [rows, query])

  const total = filtered.reduce((s, r) => s + r.amountCents, 0)
  const allSel = filtered.length > 0 && filtered.every((r) => selected.has(r.number))
  const toggle = (n) =>
    setSelected((s) => {
      const x = new Set(s)
      x.has(n) ? x.delete(n) : x.add(n)
      return x
    })
  const toggleAll = () =>
    setSelected((s) => {
      const x = new Set(s)
      filtered.forEach((r) => (allSel ? x.delete(r.number) : x.add(r.number)))
      return x
    })

  const download = async (mode) => {
    const chosen = rows.filter((r) => selected.has(r.number))
    try {
      setBusy('Creo i PDF…')
      const { buildSinglePdf, buildZip } = await import('../../lib/pdf')
      const blob = mode === 'zip' ? await buildZip(current, chosen, (n) => setBusy(`Creo i PDF… ${n}/${chosen.length}`)) : await buildSinglePdf(current, chosen)
      saveAs(blob, `ricevute_${year}_${chosen[0].number}-${chosen[chosen.length - 1].number}.${mode === 'zip' ? 'zip' : 'pdf'}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy('')
    }
  }

  const exportCsv = () => {
    const csv = Papa.unparse(
      rows.map((r) => ({
        numero: `${r.number}/${r.year}`, data: fmtDate(r.date), societa: r.recipient.name, piva: r.recipient.taxId,
        importo: (r.amountCents / 100).toFixed(2).replace('.', ','), causale: r.causale, pagamento: r.method, emessa_da: r.by,
      })),
      { delimiter: ';' },
    )
    saveAs(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }), `registro_ricevute_${year}.csv`)
  }

  return (
    <Page title="Registro ricevute" needsAssociation>
      <CCard>
        <CCardHeader className="d-flex flex-wrap gap-2 align-items-center">
          <CFormSelect style={{ maxWidth: 120 }} aria-label="Anno" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => <option key={y}>{y}</option>)}
          </CFormSelect>
          <CFormInput style={{ maxWidth: 240 }} placeholder="Cerca numero, società, causale" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="ms-auto d-flex flex-wrap gap-2 align-items-center">
            {busy && <span className="text-body-secondary"><CSpinner size="sm" className="me-2" />{busy}</span>}
            <CButton color="secondary" variant="outline" size="sm" onClick={load}>Aggiorna</CButton>
            <CButton color="secondary" variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}>Esporta CSV</CButton>
            <CButton color="secondary" variant="outline" size="sm" disabled={!selected.size || !!busy} onClick={() => download('zip')}>ZIP</CButton>
            <CButton color="primary" size="sm" disabled={!selected.size || !!busy} onClick={() => download('pdf')}>Riscarica PDF ({selected.size})</CButton>
          </div>
        </CCardHeader>
        {error && <CAlert color="danger" className="m-3">{error}</CAlert>}
        {loading ? (
          <div className="p-4"><CSpinner color="primary" /></div>
        ) : !rows.length ? (
          <p className="p-4 mb-0 text-body-secondary">Nessuna ricevuta emessa nel {year}.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th className="ps-3" style={{ width: 40 }}><CFormCheck checked={allSel} onChange={toggleAll} aria-label="Seleziona tutte" /></th>
                  <th>N.</th><th>Data</th><th>Società</th><th className="text-end">Importo</th><th>Causale</th><th>Emessa da</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.number} onClick={() => toggle(r.number)} style={{ cursor: 'pointer' }}>
                    <td className="ps-3"><CFormCheck checked={selected.has(r.number)} onChange={() => toggle(r.number)} onClick={(e) => e.stopPropagation()} aria-label={`Seleziona ricevuta ${r.number}`} /></td>
                    <td>{r.number}/{r.year}</td>
                    <td>{fmtDate(r.date)}</td>
                    <td>{r.recipient.name}</td>
                    <td className="text-end">{formatEuro(r.amountCents)}</td>
                    <td>{r.causale}</td>
                    <td className="small text-body-secondary">{r.by}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><th colSpan={4} className="ps-3">{filtered.length} ricevute</th><th className="text-end">{formatEuro(total)}</th><th colSpan={2} /></tr>
              </tfoot>
            </table>
          </div>
        )}
      </CCard>
    </Page>
  )
}

export default Registro
