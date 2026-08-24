/**
 * Online / offline state + the number of registrations still waiting in the
 * local IndexedDB queue. Used by the tablet banner and the admin top bar.
 */
import { useEffect, useState, useCallback } from 'react'
import {
  onQueueChange,
  getQueueState,
  countPending,
  syncQueue
} from '../lib/offlineQueue'

export function useConnection() {
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine !== false
  )
  const [queue, setQueue] = useState(getQueueState())

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    const unsub = onQueueChange(setQueue)
    countPending().then((n) => setQueue((q) => ({ ...q, pending: n })))

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
      unsub()
    }
  }, [])

  const sync = useCallback(() => syncQueue({ force: true }), [])

  return {
    online,
    pending: queue.pending || 0,
    syncing: !!queue.syncing,
    lastSyncAt: queue.lastSyncAt || null,
    sync
  }
}

export default useConnection
