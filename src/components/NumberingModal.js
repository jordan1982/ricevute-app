import React, { useEffect, useState } from 'react'
import { CAlert, CButton, CFormInput, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react'
import { useApp } from '../context/AppContext'
import { getLastNumber, setLastNumber } from '../lib/db'

// Permette al proprietario di far ripartire la numerazione da un numero a scelta
const NumberingModal = ({ visible, onClose }) => {
  const { current, refreshCounter } = useApp()
  const [year, setYear] = useState(new Date().getFullYear())
  const [last, setLast] = useState(null)
  const [value, setValue] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!visible || !current) return undefined
    let off = false
    setLast(null)
    setErr('')
    getLastNumber(current.id, year)
      .then((n) => {
        if (!off) {
          setLast(n)
          setValue(String(n))
        }
      })
      .catch((e) => setErr(e.message))
    return () => {
      off = true
    }
  }, [visible, current, year])

  const save = async () => {
    const n = Number(value)
    if (!Number.isInteger(n) || n < 0) return setErr('Inserisci un numero intero.')
    try {
      await setLastNumber(current.id, year, n)
      refreshCounter()
      onClose()
    } catch (e) {
      setErr(e.message)
    }
  }

  return (
    <CModal visible={visible} onClose={onClose} alignment="center">
      <CModalHeader>
        <CModalTitle>Numerazione ricevute</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <p className="text-body-secondary">
          Inserisci l’ultimo numero già emesso: la prossima ricevuta avrà il numero successivo. La numerazione
          riparte da 1 ogni anno e vale per tutti gli utenti dell’associazione.
        </p>
        {err && <CAlert color="danger">{err}</CAlert>}
        <div className="d-flex gap-3">
          <CFormInput type="number" label="Anno" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          <CFormInput
            type="number" min="0" label="Ultimo numero emesso" value={value}
            disabled={last === null} onChange={(e) => setValue(e.target.value)}
          />
        </div>
        {last !== null && value !== '' && Number.isInteger(Number(value)) && (
          <p className="mt-3 mb-0">
            La prossima ricevuta del {year} sarà la <strong>n. {Number(value) + 1}</strong>.
          </p>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="ghost" onClick={onClose}>Annulla</CButton>
        <CButton color="primary" onClick={save} disabled={last === null}>Salva</CButton>
      </CModalFooter>
    </CModal>
  )
}

export default NumberingModal
