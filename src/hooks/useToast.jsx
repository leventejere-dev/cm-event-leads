/** Minimal toast notifications (no dependency). */
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo
} from 'react'

const ToastContext = createContext(null)
let counter = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (message, type = 'info', ms = 4000) => {
      counter += 1
      const id = counter
      setToasts((list) => [...list, { id, message, type }])
      window.setTimeout(() => remove(id), ms)
      return id
    },
    [remove]
  )

  const api = useMemo(
    () => ({
      toast: push,
      success: (m, ms) => push(m, 'success', ms),
      error: (m, ms) => push(m, 'error', ms || 6000),
      info: (m, ms) => push(m, 'info', ms)
    }),
    [push]
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="cm-toast-wrap" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`cm-toast ${t.type === 'error' ? 'is-error' : ''} ${
              t.type === 'success' ? 'is-success' : ''
            }`}
            onClick={() => remove(t.id)}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    return {
      toast: () => {},
      success: () => {},
      error: () => {},
      info: () => {}
    }
  }
  return ctx
}

export default useToast
