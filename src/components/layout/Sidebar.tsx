import { NavLink } from 'react-router-dom'
import { appRoutes } from '../../app/routes'

export function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Navegacion principal">
      <div className="brand">
        <span className="brand-mark">PB</span>
        <div>
          <strong>PagoBus</strong>
          <small>Administracion</small>
        </div>
      </div>

      <nav className="sidebar-nav">
        {appRoutes.map((route) => (
          <NavLink
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            to={route.path}
            end={route.path === '/'}
            key={route.path}
          >
            <span className="nav-icon">{route.iconLabel}</span>
            {route.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
