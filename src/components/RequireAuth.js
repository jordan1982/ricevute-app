import React from 'react'
import { Navigate } from 'react-router-dom'
import { CSpinner } from '@coreui/react'
import { useApp } from '../context/AppContext'
import KeyGate from './KeyGate'

const RequireAuth = ({ children }) => {
  const { session, authLoading, keyState } = useApp()
  if (authLoading) {
    return (
      <div className="pt-5 text-center">
        <CSpinner color="primary" />
      </div>
    )
  }
  if (!session) return <Navigate to="/login" replace />
  if (keyState.status !== 'ready') return <KeyGate />
  return children
}

export default RequireAuth
