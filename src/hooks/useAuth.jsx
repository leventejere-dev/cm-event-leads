/**
 * ---------------------------------------------------------------------------
 *  SUPABASE AUTH
 * ---------------------------------------------------------------------------
 *  Real authentication — no fake front-end password. A user only reaches the
 *  admin area when BOTH are true:
 *      1. Supabase Auth returned a valid session, and
 *      2. that user has an active row in public.admin_profiles.
 *  Row Level Security enforces the same rule server-side, so hiding a button
 *  is never the only thing protecting the data.
 * ---------------------------------------------------------------------------
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback
} from 'react'
import { supabase, isConfigured } from '../lib/supabase'
import { getMyAdminProfile } from '../lib/db'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (currentSession) => {
    if (!currentSession?.user?.id) {
      setProfile(null)
      return null
    }
    try {
      const p = await getMyAdminProfile(currentSession.user.id)
      setProfile(p)
      return p
    } catch (err) {
      console.warn('[CM] could not load admin profile', err)
      setProfile(null)
      return null
    }
  }, [])

  useEffect(() => {
    let mounted = true

    if (!isConfigured) {
      setLoading(false)
      return () => {}
    }

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session || null)
      await loadProfile(data.session)
      if (mounted) setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, next) => {
      if (!mounted) return
      setSession(next || null)
      await loadProfile(next)
      setLoading(false)
    })

    return () => {
      mounted = false
      sub?.subscription?.unsubscribe()
    }
  }, [loadProfile])

  const signIn = useCallback(async (email, password) => {
    if (!isConfigured) throw new Error('NOT_CONFIGURED')
    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(email).trim(),
      password
    })
    if (error) throw error
    const p = await loadProfile(data.session)
    if (!p || !p.is_active) {
      // Authenticated but not whitelisted — sign back out immediately.
      await supabase.auth.signOut()
      const err = new Error('NO_ADMIN_ACCESS')
      err.code = 'NO_ADMIN_ACCESS'
      throw err
    }
    return data
  }, [loadProfile])

  const signOut = useCallback(async () => {
    if (!isConfigured) return
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }, [])

  const value = useMemo(
    () => ({
      session,
      user: session?.user || null,
      profile,
      isAdmin: Boolean(profile && profile.is_active),
      loading,
      signIn,
      signOut
    }),
    [session, profile, loading, signIn, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

export default useAuth
