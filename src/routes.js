import React from 'react'

const Ricevute = React.lazy(() => import('./views/ricevute/Ricevute'))
const Registro = React.lazy(() => import('./views/registro/Registro'))
const Anagrafica = React.lazy(() => import('./views/anagrafica/Anagrafica'))
const Associazione = React.lazy(() => import('./views/associazione/Associazione'))

const routes = [
  { path: '/', exact: true, name: 'Home' },
  { path: '/ricevute', name: 'Ricevute', element: Ricevute },
  { path: '/registro', name: 'Registro', element: Registro },
  { path: '/anagrafica', name: 'Anagrafica', element: Anagrafica },
  { path: '/associazione', name: 'Associazione', element: Associazione },
]

export default routes
