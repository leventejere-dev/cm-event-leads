import React, { useState } from 'react'
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { useAuth } from '../../hooks/useAuth'
import { useBranding } from '../../hooks/useBranding'
import { ConnectionBadge, LanguageSwitcher } from '../common'

const NAV = [
  { to: '/admin', end: true, key: 'nav.dashboard', icon: '▤' },
  { to: '/admin/events', key: 'nav.events', icon: '▦' },
  { to: '/admin/leads', key: 'nav.leads', icon: '☰' },
  { to: '/admin/reps', key: 'nav.reps', icon: '◍' },
  { to: '/admin/settings', key: 'nav.settings', icon: '⚙' }
]

export default function AdminLayout() {
  const { t } = useI18n()
  const { profile, user, signOut } = useAuth()
  const { brand } = useBranding()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const logout = async () => {
    await signOut()
    navigate('/admin')
  }

  return (
    <div className="cm-admin">
      {open && <div className="cm-sidebar-scrim" onClick={() => setOpen(false)} />}

      <aside className={`cm-sidebar ${open ? 'is-open' : ''}`}>
        <div className="cm-sidebar-brand">
          <img src={brand.logoLight || brand.logo} alt={brand.companyName} />
          <div className="cm-sidebar-app">{brand.appName}</div>
        </div>

        <nav className="cm-nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? 'is-active' : '')}
              onClick={() => setOpen(false)}
            >
              <span className="cm-nav-ico" aria-hidden="true">
                {item.icon}
              </span>
              {t(item.key)}
            </NavLink>
          ))}
          <Link to="/" target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>
            <span className="cm-nav-ico" aria-hidden="true">
              ▷
            </span>
            {t('nav.openKiosk')}
          </Link>
        </nav>

        <div className="cm-sidebar-foot">
          <div className="cm-user">{profile?.full_name || user?.email}</div>
          <button
            type="button"
            className="cm-btn cm-btn-ghost cm-btn-sm cm-btn-block"
            onClick={logout}
            style={{ color: '#fff', borderColor: 'rgba(255,255,255,.25)' }}
          >
            {t('nav.logout')}
          </button>
        </div>
      </aside>

      <div className="cm-main">
        <header className="cm-topbar">
          <button
            type="button"
            className="cm-btn cm-btn-ghost cm-btn-icon cm-burger"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            ☰
          </button>
          <div className="cm-grow" />
          <LanguageSwitcher />
          <ConnectionBadge />
        </header>

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
