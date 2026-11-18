import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { CAlert, CButton, CCard, CCardBody, CCol, CContainer, CRow, CSpinner } from '@coreui/react'
import { useApp } from '../../../context/AppContext'

const Login = () => {
  const { session, authLoading, signInWithGoogle } = useApp()
  const [err, setErr] = useState('')

  if (session) return <Navigate to="/" replace />

  const login = async () => {
    setErr('')
    const { error } = await signInWithGoogle()
    if (error) setErr(error.message)
  }

  return (
    <div className="bg-body-tertiary min-vh-100 d-flex align-items-center">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={7} lg={5}>
            <CCard>
              <CCardBody className="p-4 text-center">
                {authLoading ? (
                  <CSpinner color="primary" />
                ) : (
                  <>
                    <h3>Ricevute</h3>
                    <p className="text-body-secondary">
                      Crea le ricevute in PDF per le tue associazioni. I dati vengono cifrati nel tuo
                      browser prima di essere salvati.
                    </p>
                    {err && <CAlert color="danger">{err}</CAlert>}
                    <CButton color="primary" size="lg" onClick={login}>
                      Accedi con Google
                    </CButton>
                  </>
                )}
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default Login
