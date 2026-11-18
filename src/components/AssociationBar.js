import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CButton, CFormSelect } from '@coreui/react'
import { useApp } from '../context/AppContext'
import { getLastNumber } from '../lib/db'
import NumberingModal from './NumberingModal'

const AssociationBar = () => {
  const { associations, current, currentId, setCurrentId, session, signOut, counterTick } = useApp()
  const year = new Date().getFullYear()
  const [last, setLast] = useState(null)
  const [modal, setModal] = useState(false)

  useEffect(() => {
    setLast(null)
    if (!current) return undefined
    let off = false
    getLastNumber(current.id, year)
      .then((n) => !off && setLast(n))
      .catch(() => {})
    return () => {
      off = true
    }
  }, [current, year, counterTick])

  return (
    <div className="d-flex flex-wrap align-items-center gap-2 mb-4">
      <CFormSelect
        style={{ maxWidth: 320 }}
        aria-label="Associazione attiva"
        value={currentId ?? ''}
        onChange={(e) => setCurrentId(e.target.value)}
      >
        {associations.length === 0 && <option value="">Nessuna associazione</option>}
        {associations.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </CFormSelect>
      {current && (
        <span className="small">
          Ultima ricevuta {year}: <strong>{last === null ? '…' : last === 0 ? 'nessuna' : `n. ${last}`}</strong>
          {current.role === 'owner' && (
            <CButton color="link" size="sm" className="py-0" onClick={() => setModal(true)}>
              Modifica
            </CButton>
          )}
        </span>
      )}
      <CButton as={Link} to="/associazione" color="secondary" variant="outline" size="sm">
        Gestisci associazioni
      </CButton>
      <span className="ms-auto small text-body-secondary">{session?.user?.email}</span>
      <CButton color="secondary" variant="ghost" size="sm" onClick={signOut}>
        Esci
      </CButton>
      <NumberingModal visible={modal} onClose={() => setModal(false)} />
    </div>
  )
}

export default AssociationBar
