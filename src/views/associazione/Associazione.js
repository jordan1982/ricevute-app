import React, { useCallback, useEffect, useState } from 'react'
import {
  CAlert, CButton, CCard, CCardBody, CCardHeader, CCol, CForm, CFormInput, CFormLabel, CFormTextarea, CRow,
} from '@coreui/react'
import Page from '../../components/Page'
import { useApp } from '../../context/AppContext'
import { fileToLogo } from '../../lib/image'
import { addMember, getLastNumber, listMembers, removeMember, setLastNumber } from '../../lib/db'

const EMPTY = {
  title: 'RICEVUTA PER EROGAZIONE LIBERALE',
  name: '',
  address: '',
  city: 'ROMA',
  taxId: '',
  contacts: '',
  footerNote: '',
  logo: '',
  timbro: '',
}

const Numbering = ({ assocId, canEdit }) => {
  const [year, setYear] = useState(new Date().getFullYear())
  const [last, setLast] = useState(null)
  const [value, setValue] = useState('')
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    let off = false
    setLast(null)
    getLastNumber(assocId, year)
      .then((n) => {
        if (!off) {
          setLast(n)
          setValue(String(n))
        }
      })
      .catch((e) => setMsg({ color: 'danger', text: e.message }))
    return () => {
      off = true
    }
  }, [assocId, year])

  const save = async () => {
    const n = Number(value)
    if (!Number.isInteger(n) || n < 0) return setMsg({ color: 'warning', text: 'Inserisci un numero intero.' })
    try {
      await setLastNumber(assocId, year, n)
      setLast(n)
      setMsg({ color: 'success', text: `La prossima ricevuta del ${year} sarà la n. ${n + 1}.` })
    } catch (e) {
      setMsg({ color: 'danger', text: e.message })
    }
  }

  return (
    <CCard className="mt-4">
      <CCardHeader>Numerazione</CCardHeader>
      <CCardBody>
        <p className="text-body-secondary">
          Ultimo numero emesso nel {year}: <strong>{last ?? '…'}</strong>. La numerazione riparte da 1 il 1° gennaio
          {canEdit && ' e vale per tutti gli utenti. Se hai già emesso ricevute altrove, inserisci l’ultimo numero usato'}.
        </p>
        {msg && <CAlert color={msg.color}>{msg.text}</CAlert>}
        <CRow className="g-3 align-items-end">
          <CCol xs={6} md={3}>
            <CFormInput type="number" label="Anno" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          </CCol>
          {canEdit && (
            <>
              <CCol xs={6} md={3}>
                <CFormInput type="number" min="0" label="Ultimo numero emesso" value={value} disabled={last === null} onChange={(e) => setValue(e.target.value)} />
              </CCol>
              <CCol xs="auto">
                <CButton color="primary" variant="outline" onClick={save} disabled={last === null}>
                  Aggiorna numerazione
                </CButton>
              </CCol>
            </>
          )}
        </CRow>
      </CCardBody>
    </CCard>
  )
}

const Members = ({ assoc, canEdit }) => {
  const { identity, session } = useApp()
  const [list, setList] = useState([])
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(
    () => listMembers(assoc.id).then(setList).catch((e) => setMsg({ color: 'danger', text: e.message })),
    [assoc.id],
  )
  useEffect(() => {
    load()
  }, [load])

  const add = async (e) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      await addMember(assoc, identity.privateKey, email)
      setEmail('')
      await load()
      setMsg({ color: 'success', text: 'Accesso concesso.' })
    } catch (err) {
      setMsg({ color: 'danger', text: err.message })
    } finally {
      setBusy(false)
    }
  }
  const remove = async (m) => {
    if (!window.confirm(`Togliere l’accesso a ${m.email}?`)) return
    try {
      await removeMember(assoc.id, m.user_id)
      await load()
    } catch (err) {
      setMsg({ color: 'danger', text: err.message })
    }
  }

  return (
    <CCard className="mt-4">
      <CCardHeader>Chi può lavorare su questa associazione</CCardHeader>
      <CCardBody>
        {msg && <CAlert color={msg.color} dismissible onClose={() => setMsg(null)}>{msg.text}</CAlert>}
        <table className="table align-middle">
          <tbody>
            {list.map((m) => (
              <tr key={m.user_id}>
                <td>{m.email}</td>
                <td className="text-body-secondary">{m.role === 'owner' ? 'Proprietario' : 'Membro'}</td>
                <td className="text-end">
                  {m.role !== 'owner' && (canEdit || m.user_id === session.user.id) && (
                    <CButton size="sm" color="danger" variant="ghost" onClick={() => remove(m)}>
                      {m.user_id === session.user.id ? 'Esci' : 'Rimuovi'}
                    </CButton>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {canEdit && (
          <CForm onSubmit={add} className="d-flex flex-wrap gap-2 align-items-end">
            <CFormInput type="email" label="Aggiungi per email Google" placeholder="nome@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ minWidth: 280 }} />
            <CButton type="submit" color="primary" disabled={busy || !email}>Aggiungi</CButton>
          </CForm>
        )}
        {canEdit && (
          <p className="small text-body-secondary mt-3 mb-0">
            La persona deve aver già fatto l’accesso una volta e creato la sua password di cifratura. Potrà vedere
            e usare anagrafica, registro e numerazione.
          </p>
        )}
      </CCardBody>
    </CCard>
  )
}

const Associazione = () => {
  const { current, saveAssociation, deleteAssociation } = useApp()
  const [mode, setMode] = useState('edit')
  const [form, setForm] = useState(EMPTY)
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const isNew = mode === 'new' || !current
  const canEdit = isNew || current.role === 'owner'

  useEffect(() => {
    if (mode === 'edit') setForm({ ...EMPTY, ...(current ?? {}) })
  }, [current, mode])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const onImage = (key) => async (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    try {
      const dataUrl = await fileToLogo(file)
      setForm((f) => ({ ...f, [key]: dataUrl }))
    } catch (err) {
      setMsg({ color: 'danger', text: err.message })
    }
  }

  const save = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return setMsg({ color: 'warning', text: 'Inserisci il nome dell’associazione.' })
    setBusy(true)
    try {
      await saveAssociation({
        ...(isNew ? {} : { id: current.id }),
        title: form.title.trim(),
        name: form.name.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        taxId: form.taxId.trim(),
        contacts: form.contacts.trim(),
        footerNote: form.footerNote.trim(),
        logo: form.logo,
        timbro: form.timbro,
      })
      setMode('edit')
      setMsg({ color: 'success', text: 'Salvato.' })
    } catch (err) {
      setMsg({ color: 'danger', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!window.confirm(`Eliminare “${current.name}” con anagrafica, registro e numerazione, per tutti gli utenti? L’operazione non si può annullare.`)) return
    try {
      await deleteAssociation(current.id)
      setMsg(null)
    } catch (err) {
      setMsg({ color: 'danger', text: err.message })
    }
  }

  return (
    <Page title="Associazione">
      <CCard>
        <CCardHeader>{isNew ? 'Nuova associazione' : 'Dati dell’associazione'}</CCardHeader>
        <CCardBody>
          {msg && <CAlert color={msg.color} dismissible onClose={() => setMsg(null)}>{msg.text}</CAlert>}
          {!canEdit && <CAlert color="info">Solo il proprietario può modificare questi dati.</CAlert>}
          <CForm onSubmit={save}>
            <fieldset disabled={!canEdit}>
              <CRow className="g-3">
                <CCol xs={12}>
                  <CFormInput
                    label="Titolo ricevuta (intestazione)"
                    placeholder="RICEVUTA PER EROGAZIONE LIBERALE"
                    value={form.title}
                    onChange={set('title')}
                  />
                </CCol>
                <CCol md={6}><CFormInput label="Nome associazione" value={form.name} onChange={set('name')} /></CCol>
                <CCol md={6}><CFormInput label="C.F. / P.IVA" value={form.taxId} onChange={set('taxId')} /></CCol>
                <CCol md={8}>
                  <CFormInput label="Indirizzo" placeholder="Viale Gianluigi Bonelli, 138 - 00127 Roma" value={form.address} onChange={set('address')} />
                </CCol>
                <CCol md={4}>
                  <CFormInput label="Luogo emissione (città)" placeholder="ROMA" value={form.city} onChange={set('city')} />
                </CCol>
                <CCol xs={12}>
                  <CFormInput
                    label="Recapiti / Contatti (sito, email, PEC — compaiono nell'intestazione)"
                    placeholder="www.esempio.it, info@esempio.it, pec@pec.it"
                    value={form.contacts}
                    onChange={set('contacts')}
                  />
                </CCol>
                <CCol xs={12}>
                  <CFormTextarea
                    rows={2}
                    label="Nota a piè di pagina (opzionale)"
                    placeholder="Es. Operazione fuori campo IVA ai sensi dell’art. 4 DPR 633/72"
                    value={form.footerNote}
                    onChange={set('footerNote')}
                  />
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Logo (compare in alto a sinistra)</CFormLabel>
                  <div className="d-flex align-items-center gap-3">
                    {form.logo && <img src={form.logo} alt="Logo" style={{ maxHeight: 60, maxWidth: 200 }} />}
                    {canEdit && <input type="file" accept="image/*" className="form-control" style={{ maxWidth: 280 }} onChange={onImage('logo')} />}
                    {canEdit && form.logo && (
                      <CButton type="button" color="secondary" variant="ghost" size="sm" onClick={() => setForm((f) => ({ ...f, logo: '' }))}>
                        Rimuovi
                      </CButton>
                    )}
                  </div>
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Timbro e Firma (compare in basso a destra)</CFormLabel>
                  <div className="d-flex align-items-center gap-3">
                    {form.timbro && <img src={form.timbro} alt="Timbro" style={{ maxHeight: 60, maxWidth: 200 }} />}
                    {canEdit && <input type="file" accept="image/*" className="form-control" style={{ maxWidth: 280 }} onChange={onImage('timbro')} />}
                    {canEdit && form.timbro && (
                      <CButton type="button" color="secondary" variant="ghost" size="sm" onClick={() => setForm((f) => ({ ...f, timbro: '' }))}>
                        Rimuovi
                      </CButton>
                    )}
                  </div>
                </CCol>
              </CRow>
            </fieldset>
            {canEdit && (
              <div className="d-flex flex-wrap gap-2 mt-4">
                <CButton type="submit" color="primary" disabled={busy}>{isNew ? 'Crea associazione' : 'Salva modifiche'}</CButton>
                {current && !isNew && (
                  <CButton type="button" color="secondary" variant="outline" onClick={() => { setMode('new'); setForm(EMPTY); setMsg(null) }}>
                    Nuova associazione
                  </CButton>
                )}
                {current && mode === 'new' && (
                  <CButton type="button" color="secondary" variant="ghost" onClick={() => setMode('edit')}>Annulla</CButton>
                )}
                {current && !isNew && (
                  <CButton type="button" color="danger" variant="ghost" className="ms-auto" onClick={remove}>Elimina associazione</CButton>
                )}
              </div>
            )}
          </CForm>
        </CCardBody>
      </CCard>
      {current && !isNew && <Numbering assocId={current.id} canEdit={canEdit} />}
      {current && !isNew && <Members assoc={current} canEdit={canEdit} />}
    </Page>
  )
}

export default Associazione