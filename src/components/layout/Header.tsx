import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { appRoutes, fallbackRoute } from '../../app/routes'
import { useAuth } from '../../features/auth/useAuth'

export function Header() {
  const { session, logout } = useAuth()
  const location = useLocation()
  const activeRoute = appRoutes.find((route) => route.path === location.pathname) ?? fallbackRoute
  const timestamp = useMemo(
    () =>
      new Intl.DateTimeFormat('es-GT', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date()),
    [],
  )

  return (
    <header className="admin-header">
      <div>
        <span className="eyebrow">Panel administrativo</span>
        <h1>{activeRoute.title}</h1>
      </div>

      <div className="header-actions">
        <span className="sync-pill">Actualizado {timestamp}</span>
        <div className="user-chip">
          <strong>{session?.user.name}</strong>
          <small>{session?.user.role}</small>
        </div>
        <button className="button button-secondary" type="button" onClick={logout}>
          Cerrar sesion
        </button>
      </div>
    </header>
  )
}
