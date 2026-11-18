import React from 'react'
import CIcon from '@coreui/icons-react'
import { cilBuilding, cilList, cilPeople, cilPrint } from '@coreui/icons'
import { CNavItem } from '@coreui/react'

const _nav = [
  { component: CNavItem, name: 'Nuove ricevute', to: '/ricevute', icon: <CIcon icon={cilPrint} customClassName="nav-icon" /> },
  { component: CNavItem, name: 'Registro', to: '/registro', icon: <CIcon icon={cilList} customClassName="nav-icon" /> },
  { component: CNavItem, name: 'Anagrafica', to: '/anagrafica', icon: <CIcon icon={cilPeople} customClassName="nav-icon" /> },
  { component: CNavItem, name: 'Associazione', to: '/associazione', icon: <CIcon icon={cilBuilding} customClassName="nav-icon" /> },
]

export default _nav
