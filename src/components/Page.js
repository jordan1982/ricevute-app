import React from 'react'
import { Link } from 'react-router-dom'
import { CAlert, CButton, CCard, CCardBody, CSpinner } from '@coreui/react'
import { useApp } from '../context/AppContext'
import AssociationBar from './AssociationBar'

const Page = ({ title, needsAssociation = false, children }) => {
  const { current, associationsLoading, loadError } = useApp()
  let body = children
  if (loadError) body = <CAlert color="danger">{loadError}</CAlert>
  else if (needsAssociation && associationsLoading && !current) body = <CSpinner color="primary" />
  else if (needsAssociation && !current) {
    body = (
      <CCard>
        <CCardBody className="text-center py-5">
          <p className="mb-3">Per iniziare, inserisci i dati della tua associazione.</p>
          <CButton as={Link} to="/associazione" color="primary">
            Crea associazione
          </CButton>
        </CCardBody>
      </CCard>
    )
  }
  return (
    <>
      <AssociationBar />
      <h4 className="mb-3">{title}</h4>
      {body}
    </>
  )
}

export default Page
