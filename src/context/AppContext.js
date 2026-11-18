import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import * as db from '../lib/db'
import {
  clearDeviceKey, createIdentity, createKey, decryptJSON, deriveKey, encryptJSON, importPrivateKey,
  importPublicKey, loadDeviceKey, saveDeviceKey,
} from '../lib/crypto'

const AppContext = createContext(null)
export const useApp = () => useContext(AppContext)

const CURRENT_KEY = 'ricevute.currentAssociation' // solo un UUID, nessun dato personale

export function AppProvider({ children }) {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  // status: idle | checking | setup | locked | ready | error
  // identity: { privateKey, publicKey } = chiavi personali, in memoria
  const [keyState, setKeyState] = useState({ status: 'idle', identity: null, error: '' })
  const [associations, setAssociations] = useState([])
  const [associationsLoading, setAssociationsLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [counterTick, setCounterTick] = useState(0)
  const refreshCounter = useCallback(() => setCounterTick((t) => t + 1), [])
  const [currentId, setCurrentId] = useState(() => localStorage.getItem(CURRENT_KEY))

  const userId = session?.user?.id
  const identity = keyState.identity

  // --- sessione Google ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname },
    })

  const signOut = async () => {
    if (userId) await clearDeviceKey(userId)
    setAssociations([])
    await supabase.auth.signOut()
  }

  // --- password di cifratura: creazione / sblocco ---
  useEffect(() => {
    if (!userId) {
      setKeyState({ status: 'idle', identity: null, error: '' })
      return undefined
    }
    let cancelled = false
    ;(async () => {
      setKeyState({ status: 'checking', identity: null, error: '' })
      try {
        const meta = await db.getUserKeys()
        if (cancelled) return
        if (!meta) return setKeyState({ status: 'setup', identity: null, error: '' })
        const stored = await loadDeviceKey(userId)
        if (stored) {
          const publicKey = await importPublicKey(meta.public_key)
          return !cancelled && setKeyState({ status: 'ready', identity: { privateKey: stored, publicKey }, error: '' })
        }
        setKeyState({ status: 'locked', identity: null, error: '' })
      } catch (e) {
        if (!cancelled) setKeyState({ status: 'error', identity: null, error: e.message })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId])

  const setupKey = async (password, remember) => {
    const { pkcs8, publicKey } = await createIdentity()
    const { key: passKey, meta } = await createKey(password)
    await db.insertUserKeys({ ...meta, public_key: publicKey, wrapped_private: await encryptJSON(passKey, pkcs8) })
    const privateKey = await importPrivateKey(pkcs8)
    if (remember) await saveDeviceKey(userId, privateKey).catch(() => {})
    setKeyState({ status: 'ready', identity: { privateKey, publicKey: await importPublicKey(publicKey) }, error: '' })
  }

  const unlockKey = async (password, remember) => {
    const meta = await db.getUserKeys()
    const passKey = await deriveKey(password, meta.salt, meta.iterations)
    let pkcs8
    try {
      pkcs8 = await decryptJSON(passKey, meta.wrapped_private)
    } catch {
      throw new Error('Password errata.')
    }
    const privateKey = await importPrivateKey(pkcs8)
    if (remember) await saveDeviceKey(userId, privateKey).catch(() => {})
    setKeyState({ status: 'ready', identity: { privateKey, publicKey: await importPublicKey(meta.public_key) }, error: '' })
  }

  // --- associazioni ---
  const reloadAssociations = useCallback(async () => {
    if (!identity || !userId) return
    setAssociationsLoading(true)
    setLoadError('')
    try {
      const list = await db.listAssociations(identity.privateKey, userId)
      setAssociations(list)
      setCurrentId((cur) => (list.some((a) => a.id === cur) ? cur : list[0]?.id ?? null))
    } catch (e) {
      setLoadError(e.message)
    } finally {
      setAssociationsLoading(false)
    }
  }, [identity, userId])

  useEffect(() => {
    if (keyState.status === 'ready') reloadAssociations()
  }, [keyState.status, reloadAssociations])

  useEffect(() => {
    if (currentId) localStorage.setItem(CURRENT_KEY, currentId)
  }, [currentId])

  const saveAssociation = async ({ id, ...fields }) => {
    let target = id
    if (id) await db.updateAssociation(associations.find((a) => a.id === id).key, id, fields)
    else target = await db.createAssociation(identity.publicKey, fields)
    await reloadAssociations()
    setCurrentId(target)
    return target
  }
  const deleteAssociation = async (id) => {
    await db.deleteAssociation(id)
    await reloadAssociations()
  }

  const current = associations.find((a) => a.id === currentId) || null

  return (
    <AppContext.Provider
      value={{
        session, authLoading, signInWithGoogle, signOut,
        keyState, identity, setupKey, unlockKey,
        associations, associationsLoading, loadError, current, currentId, setCurrentId,
        saveAssociation, deleteAssociation, counterTick, refreshCounter,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}
