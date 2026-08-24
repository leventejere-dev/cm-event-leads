/**
 * ---------------------------------------------------------------------------
 *  APPLICATION ROUTER
 * ---------------------------------------------------------------------------
 *  HashRouter is used on purpose: GitHub Pages serves only static files and
 *  cannot rewrite deep links, so "/admin/leads/123" would 404 on reload with a
 *  normal router. With the hash router every URL is "/#/admin/leads/123" and
 *  works on GitHub Pages, Netlify, Vercel, a USB stick — anywhere.
 *
 *  Public routes:
 *      /#/                     kiosk registration (active event)
 *      /#/register             same
 *      /#/register?event=slug  a specific event (QR code)
 *
 *  Admin routes (Supabase Auth required):
 *      /#/admin                dashboard (or login form)
 *      /#/admin/events         events
 *      /#/admin/events/:id     event detail, QR code, statistics
 *      /#/admin/events/:id/form   form builder
 *      /#/admin/leads          lead list
 *      /#/admin/leads/:id      lead detail
 *      /#/admin/reps           sales representatives
 *      /#/admin/settings       settings
 * ---------------------------------------------------------------------------
 */
import React from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'

import { I18nProvider } from './i18n'
import { BrandingProvider } from './hooks/useBranding'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ToastProvider } from './hooks/useToast'
import { Spinner } from './components/common'

import RegisterPage from './pages/public/RegisterPage'
import LoginPage from './pages/admin/LoginPage'
import AdminLayout from './components/admin/AdminLayout'
import DashboardPage from './pages/admin/DashboardPage'
import EventsPage from './pages/admin/EventsPage'
import EventDetailPage from './pages/admin/EventDetailPage'
import FormBuilderPage from './pages/admin/FormBuilderPage'
import LeadsPage from './pages/admin/LeadsPage'
import LeadDetailPage from './pages/admin/LeadDetailPage'
import RepsPage from './pages/admin/RepsPage'
import UsersPage from './pages/admin/UsersPage'
import SettingsPage from './pages/admin/SettingsPage'

function RequireAdmin({ children }) {
  const { loading, session, isAdmin } = useAuth()
  if (loading) return <Spinner />
  if (!session || !isAdmin) return <LoginPage />
  return children
}

export default function App() {
  return (
    <I18nProvider>
      <BrandingProvider>
        <AuthProvider>
          <ToastProvider>
            <HashRouter>
              <Routes>
                {/* ------------------------------------------------ public */}
                <Route path="/" element={<RegisterPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* ------------------------------------------------- admin */}
                <Route
                  path="/admin"
                  element={
                    <RequireAdmin>
                      <AdminLayout />
                    </RequireAdmin>
                  }
                >
                  <Route index element={<DashboardPage />} />
                  <Route path="events" element={<EventsPage />} />
                  <Route path="events/:id" element={<EventDetailPage />} />
                  <Route path="events/:id/form" element={<FormBuilderPage />} />
                  <Route path="leads" element={<LeadsPage />} />
                  <Route path="leads/:id" element={<LeadDetailPage />} />
                  <Route path="reps" element={<RepsPage />} />
                  <Route path="users" element={<UsersPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </HashRouter>
          </ToastProvider>
        </AuthProvider>
      </BrandingProvider>
    </I18nProvider>
  )
}
