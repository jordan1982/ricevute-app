import React, { Suspense, useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { CSpinner, useColorModes } from '@coreui/react'
import './scss/style.scss'

import { AppProvider } from './context/AppContext'
import RequireAuth from './components/RequireAuth'

const DefaultLayout = React.lazy(() => import('./layout/DefaultLayout'))
const Login = React.lazy(() => import('./views/pages/login/Login'))
const Page404 = React.lazy(() => import('./views/pages/page404/Page404'))
const Page500 = React.lazy(() => import('./views/pages/page500/Page500'))

const App = () => {
  const { isColorModeSet, setColorMode } = useColorModes('coreui-free-react-admin-template-theme')
  const storedTheme = useSelector((state) => state.theme)

  useEffect(() => {
    if (!isColorModeSet()) setColorMode(storedTheme)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <HashRouter>
      <AppProvider>
        <Suspense
          fallback={
            <div className="pt-3 text-center">
              <CSpinner color="primary" variant="grow" />
            </div>
          }
        >
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/404" element={<Page404 />} />
            <Route path="/500" element={<Page500 />} />
            <Route path="/" element={<Navigate to="/ricevute" replace />} />
            <Route
              path="*"
              element={
                <RequireAuth>
                  <DefaultLayout />
                </RequireAuth>
              }
            />
          </Routes>
        </Suspense>
      </AppProvider>
    </HashRouter>
  )
}

export default App
