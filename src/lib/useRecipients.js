import { useCallback, useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { deleteRecipients, insertRecipients, listRecipients, updateRecipient } from './db'

export function useRecipients(assocId) {
  const { current } = useApp()
  // Correggiamo qui aggiungendo il controllo che current non sia null/undefined
  const key = current && current.id === assocId ? current.key : null
  
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    if (!key || !assocId) {
      setItems([])
      return
    }
    setLoading(true)
    setError('')
    try {
      setItems(await listRecipients(key, assocId))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [key, assocId])

  useEffect(() => {
    reload()
  }, [reload])

  return {
    items,
    loading,
    error,
    add: async (list) => {
      await insertRecipients(key, assocId, list)
      await reload()
    },
    update: async (id, item) => {
      await updateRecipient(key, id, item)
      await reload()
    },
    remove: async (ids) => {
      await deleteRecipients(ids)
      await reload()
    },
  }
}