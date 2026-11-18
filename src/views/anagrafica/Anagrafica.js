import React, { useMemo, useRef, useState } from 'react'
import { saveAs } from 'file-saver'
import Papa from 'papaparse'
import { CAlert, CButton, CCard, CCardBody, CCardHeader, CFormInput, CSpinner } from '@coreui/react'
import Page from '../../components/Page'
import RecipientModal from '../../components/RecipientModal'
import { useApp } from '../../context/AppContext'
import { useRecipients } from '../../lib/useRecipients'
import { parseRecipientsCsv } from '../../lib/csv'

const Anagrafica = () => {
  const { current } = useApp()
  const { items, loading, error, add, update, remove } = useRecipients(current?.id)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null) // null = chiuso, {} = nuova, {id,...} = modifica
  const [msg, setMsg] = useState(null)
  const fileRef = useRef(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? items.filter((r) => `${r.name} ${r.taxId}`.toLowerCase().includes(q)) : items
  }, [items, query])

  const onCsv = async (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    try {
      const rows = await parseRecipientsCsv(file)
      if (!rows.length) return setMsg({ color: 'warning', text: 'Nessuna riga valida: serve una colonna “nome” o “ragione sociale”.' })
      await add(rows)
      setMsg({ color: 'success', text: `Importate ${rows.length} società.` })
    } catch (err) {
      setMsg({ color: 'danger', text: err.message })
    }
  }

  const exportCsv = () => {
    const csv = Papa.unparse(items.map(({ name, address, taxId }) => ({ nome: name, indirizzo: address, piva: taxId })))
    saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `anagrafica_${current.name.replace(/\W+/g, '_')}.csv`)
  }

  const del = async (r) => {
    if (!window.confirm(`Eliminare “${r.name}” dall’anagrafica?`)) return
    try {
      await remove([r.id])
    } catch (err) {
      setMsg({ color: 'danger', text: err.message })
    }
  }

  return (
    <Page title="Anagrafica società" needsAssociation>
      <CCard>
        <CCardHeader className="d-flex flex-wrap gap-2 align-items-center">
          <CFormInput
            style={{ maxWidth: 260 }}
            placeholder="Cerca per nome o P.IVA"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="ms-auto d-flex flex-wrap gap-2">
            <CButton color="primary" onClick={() => setEditing({})}>Nuova società</CButton>
            <CButton color="secondary" variant="outline" onClick={() => fileRef.current.click()}>Importa CSV</CButton>
            <CButton color="secondary" variant="outline" onClick={exportCsv} disabled={!items.length}>Esporta CSV</CButton>
            <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={onCsv} />
          </div>
        </CCardHeader>
        <CCardBody>
          {msg && <CAlert color={msg.color} dismissible onClose={() => setMsg(null)}>{msg.text}</CAlert>}
          {error && <CAlert color="danger">{error}</CAlert>}
          {loading ? (
            <CSpinner color="primary" />
          ) : !items.length ? (
            <p className="text-body-secondary mb-0">
              Nessuna società salvata. Aggiungila a mano o importa un CSV con le colonne nome, indirizzo e P.IVA.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr><th>Denominazione</th><th>Indirizzo</th><th>C.F. / P.IVA</th><th /></tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id}>
                      <td>{r.name}</td>
                      <td>{r.address}</td>
                      <td>{r.taxId}</td>
                      <td className="text-end text-nowrap">
                        <CButton size="sm" color="secondary" variant="ghost" onClick={() => setEditing(r)}>Modifica</CButton>
                        <CButton size="sm" color="danger" variant="ghost" onClick={() => del(r)}>Elimina</CButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CCardBody>
      </CCard>
      <RecipientModal
        visible={editing !== null}
        initial={editing}
        onClose={() => setEditing(null)}
        onSave={(data) => (editing?.id ? update(editing.id, data) : add([data]))}
      />
    </Page>
  )
}

export default Anagrafica
