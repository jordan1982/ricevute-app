import React, { useEffect, useState } from 'react'
import {
  CAlert, CButton, CForm, CFormInput, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle,
} from '@coreui/react'

const EMPTY = { name: '', address: '', taxId: '' }

const RecipientModal = ({ visible, initial, onSave, onClose }) => {
  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (visible) {
      setForm({ ...EMPTY, ...initial })
      setErr('')
    }
  }, [visible, initial])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return setErr('Inserisci la denominazione.')
    setBusy(true)
    try {
      await onSave({ name: form.name.trim(), address: form.address.trim(), taxId: form.taxId.trim() })
      onClose()
    } catch (e2) {
      setErr(e2.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <CModal visible={visible} onClose={onClose} alignment="center">
      <CForm onSubmit={submit}>
        <CModalHeader>
          <CModalTitle>{initial?.id ? 'Modifica società' : 'Nuova società'}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {err && <CAlert color="danger">{err}</CAlert>}
          <CFormInput label="Denominazione" value={form.name} onChange={set('name')} autoFocus className="mb-3" />
          <CFormInput
            label="Indirizzo"
            placeholder="Via Roma 1, 00100 Roma RM"
            value={form.address}
            onChange={set('address')}
            className="mb-3"
          />
          <CFormInput label="C.F. / P.IVA" value={form.taxId} onChange={set('taxId')} />
        </CModalBody>
        <CModalFooter>
          <CButton type="button" color="secondary" variant="ghost" onClick={onClose}>
            Annulla
          </CButton>
          <CButton type="submit" color="primary" disabled={busy}>
            Salva
          </CButton>
        </CModalFooter>
      </CForm>
    </CModal>
  )
}

export default RecipientModal
