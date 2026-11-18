import React, { useState } from 'react'
import {
  CAlert, CButton, CCard, CCardBody, CCol, CContainer, CForm, CFormCheck, CFormInput, CRow, CSpinner,
} from '@coreui/react'
import { useApp } from '../context/AppContext'

const Shell = ({ children }) => (
  <div className="bg-body-tertiary min-vh-100 d-flex align-items-center">
    <CContainer>
      <CRow className="justify-content-center">
        <CCol md={7} lg={5}>
          <CCard>
            <CCardBody className="p-4">{children}</CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </CContainer>
  </div>
)

const KeyGate = () => {
  const { keyState, setupKey, unlockKey, signOut, session } = useApp()
  const [pass, setPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [remember, setRemember] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const isSetup = keyState.status === 'setup'

  if (keyState.status === 'idle' || keyState.status === 'checking') {
    return (
      <Shell>
        <div className="text-center">
          <CSpinner color="primary" />
        </div>
      </Shell>
    )
  }

  if (keyState.status === 'error') {
    return (
      <Shell>
        <CAlert color="danger">Impossibile leggere i dati: {keyState.error}</CAlert>
        <CButton color="primary" className="me-2" onClick={() => window.location.reload()}>
          Riprova
        </CButton>
        <CButton color="secondary" variant="outline" onClick={signOut}>
          Esci
        </CButton>
      </Shell>
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    if (isSetup) {
      if (pass.length < 10) return setErr('Usa almeno 10 caratteri.')
      if (pass !== confirm) return setErr('Le due password non coincidono.')
    }
    setBusy(true)
    try {
      await (isSetup ? setupKey : unlockKey)(pass, remember)
    } catch (e2) {
      setErr(e2.message)
      setBusy(false)
    }
  }

  return (
    <Shell>
      <h4>{isSetup ? 'Crea la password di cifratura' : 'Sblocca i tuoi dati'}</h4>
      <p className="text-body-secondary">
        {isSetup
          ? 'Protegge le chiavi con cui vengono cifrati i dati delle tue associazioni, direttamente nel tuo browser. Non è la password di Google e non può essere recuperata: conservala in un gestore di password.'
          : `Accesso come ${session?.user?.email}. Inserisci la password di cifratura.`}
      </p>
      {err && <CAlert color="danger">{err}</CAlert>}
      <CForm onSubmit={submit}>
        <CFormInput
          type="password"
          label="Password di cifratura"
          autoComplete={isSetup ? 'new-password' : 'current-password'}
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          autoFocus
          className="mb-3"
        />
        {isSetup && (
          <CFormInput
            type="password"
            label="Ripeti la password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mb-3"
          />
        )}
        <CFormCheck
          id="remember"
          className="mb-3"
          label="Ricorda su questo dispositivo (non usarlo su computer condivisi)"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
        />
        <div className="d-flex gap-2">
          <CButton type="submit" color="primary" disabled={busy || !pass}>
            {busy ? <CSpinner size="sm" /> : isSetup ? 'Crea e continua' : 'Sblocca'}
          </CButton>
          <CButton type="button" color="secondary" variant="ghost" onClick={signOut}>
            Esci
          </CButton>
        </div>
      </CForm>
    </Shell>
  )
}

export default KeyGate
