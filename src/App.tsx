import { startTransition, useEffect, useState, type FormEvent } from 'react'
import 'leaflet/dist/leaflet.css'
import './App.css'
import { api, type StaffUser, type UserRole } from './api'
import { BusesPage } from './pages/BusesPage'
import { DashboardPage } from './pages/DashboardPage'
import { FaresPage } from './pages/FaresPage'
import { PaymentsPage } from './pages/PaymentsPage'
import { ReportsPage } from './pages/ReportsPage'
import { RoutesPage } from './pages/RoutesPage'
import { StopsPage } from './pages/StopsPage'
import { UsersPage } from './pages/UsersPage'
import { formatEnumLabel, getErrorMessage, getStatusTone } from './pages/utils'

type Session = {
  token: string
  user: StaffUser
}

type PageId = 'dashboard' | 'buses' | 'stops' | 'routes' | 'fares' | 'users' | 'payments' | 'reports'

type PageMeta = {
  id: PageId
  label: string
  title: string
  copy: string
}

type LoginFormProps = {
  pending: boolean
  error: string
  onLogin: (email: string, password: string) => Promise<void>
}

type AdminShellProps = {
  session: Session
  onLogout: () => Promise<void>
}

const SESSION_KEY = 'buses-admin-session'
const ALLOWED_ROLES: UserRole[] = ['ADMIN', 'OPERATOR', 'INSPECTOR']
const MANAGE_ROLES: UserRole[] = ['ADMIN', 'OPERATOR']

const PAGES: PageMeta[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    title: 'Operación en tiempo real',
    copy: 'Resumen general de operación, cobertura y actividad del día.',
  },
  {
    id: 'buses',
    label: 'Buses',
    title: 'Flota y estados',
    copy: 'Consulta unidades registradas, ruta asignada y cambios rápidos de estado.',
  },
  {
    id: 'stops',
    label: 'Paradas',
    title: 'Catálogo de paradas',
    copy: 'Inventario de paradas con código, dirección y coordenadas registradas.',
  },
  {
    id: 'routes',
    label: 'Rutas',
    title: 'Rutas y geometrías',
    copy: 'Listado de rutas, detalle de paradas y recálculo de geometría operativo.',
  },
  {
    id: 'fares',
    label: 'Tarifas',
    title: 'Tarifas vigentes',
    copy: 'Consulta montos, vigencias y estado de cada esquema tarifario.',
  },
  {
    id: 'users',
    label: 'Usuarios',
    title: 'Staff y pasajeros',
    copy: 'Control de usuarios, roles y cambios rápidos de estado para operación.',
  },
  {
    id: 'payments',
    label: 'Pagos',
    title: 'Cobros y reversas',
    copy: 'Registro de cobros, seguimiento de transacciones y gestión de reversas.',
  },
  {
    id: 'reports',
    label: 'Reportes',
    title: 'Corte ejecutivo',
    copy: 'Indicadores consolidados, comparativos por ruta y actividad reciente.',
  },
]

function readSession() {
  const stored = localStorage.getItem(SESSION_KEY)
  if (!stored) {
    return null
  }

  try {
    return JSON.parse(stored) as Session
  } catch {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
}

function writeSession(session: Session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

function isRoleAllowed(role: UserRole) {
  return ALLOWED_ROLES.includes(role)
}

function canManageRole(role: UserRole) {
  return MANAGE_ROLES.includes(role)
}

function getPageMeta(page: PageId) {
  return PAGES.find((item) => item.id === page) ?? PAGES[0]
}

function App() {
  const [bootState] = useState(() => {
    const storedSession = readSession()

    return {
      storedSession,
      booting: Boolean(storedSession),
    }
  })
  const [session, setSession] = useState<Session | null>(bootState.storedSession)
  const [isBooting, setIsBooting] = useState(bootState.booting)
  const [loginError, setLoginError] = useState('')
  const [loginPending, setLoginPending] = useState(false)

  useEffect(() => {
    if (!bootState.storedSession) {
      return
    }

    const storedSession = bootState.storedSession
    const controller = new AbortController()

    void (async () => {
      try {
        const user = await api.me(storedSession.token, controller.signal)

        if (!isRoleAllowed(user.role) || user.status !== 'ACTIVE') {
          clearSession()
          setLoginError('La cuenta guardada ya no tiene acceso al panel.')
          setSession(null)
          return
        }

        const nextSession = {
          token: storedSession.token,
          user,
        }

        writeSession(nextSession)
        setSession(nextSession)
      } catch (error) {
        const message = getErrorMessage(error)
        if (message) {
          clearSession()
          setLoginError(`No se pudo restaurar la sesión. ${message}`)
          setSession(null)
        }
      } finally {
        setIsBooting(false)
      }
    })()

    return () => controller.abort()
  }, [bootState.storedSession])

  async function handleLogin(email: string, password: string) {
    setLoginPending(true)
    setLoginError('')

    try {
      const response = await api.login(email, password)

      if (!isRoleAllowed(response.user.role)) {
        throw new Error('Tu usuario no tiene permisos para ingresar al panel web.')
      }

      if (response.user.status !== 'ACTIVE') {
        throw new Error('La cuenta no está activa para operar en el panel.')
      }

      const nextSession = {
        token: response.token,
        user: response.user,
      }

      writeSession(nextSession)
      setSession(nextSession)
    } catch (error) {
      setLoginError(getErrorMessage(error) || 'No se pudo iniciar sesión.')
    } finally {
      setLoginPending(false)
    }
  }

  async function handleLogout() {
    if (!session) {
      clearSession()
      setSession(null)
      return
    }

    try {
      await api.logout(session.token)
    } catch {
    } finally {
      clearSession()
      setSession(null)
      setLoginError('')
    }
  }

  if (isBooting) {
    return (
      <main className="boot-screen">
        <section className="boot-card">
          <p className="eyebrow">Centro de control</p>
          <h1>Reconstruyendo sesión</h1>
          <p>Verificando acceso y restaurando tu espacio de trabajo.</p>
        </section>
      </main>
    )
  }

  if (!session) {
    return <LoginForm pending={loginPending} error={loginError} onLogin={handleLogin} />
  }

  return <AdminShell session={session} onLogout={handleLogout} />
}

function LoginForm({ pending, error, onLogin }: LoginFormProps) {
  const [email, setEmail] = useState('admin@buses.gt')
  const [password, setPassword] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onLogin(email, password)
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="hero-copy">
          <p className="eyebrow">Acceso administrativo</p>
          <h1>Centro de control operativo</h1>
          <p>Gestiona flota, rutas, paradas, usuarios, pagos y reportes desde un solo panel.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="email">Correo</label>
          <input
            id="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@buses.gt"
            required
          />

          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Tu contraseña"
            required
          />

          {error ? <p className="form-error">{error}</p> : null}

          <button className="primary-button" type="submit" disabled={pending}>
            {pending ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </section>
    </main>
  )
}

function AdminShell({ session, onLogout }: AdminShellProps) {
  const [activePage, setActivePage] = useState<PageId>('dashboard')
  const [logoutPending, setLogoutPending] = useState(false)
  const page = getPageMeta(activePage)
  const canManage = canManageRole(session.user.role)

  async function handleLogoutClick() {
    setLogoutPending(true)

    try {
      await onLogout()
    } finally {
      setLogoutPending(false)
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <p className="eyebrow">Transporte urbano</p>
          <strong>Centro de control</strong>
          <span>Panel administrativo operativo</span>
        </div>

        <nav className="sidebar-nav" aria-label="Navegación principal">
          {PAGES.map((item) => (
            <button
              key={item.id}
              className={item.id === activePage ? 'active' : undefined}
              type="button"
              onClick={() => startTransition(() => setActivePage(item.id))}
            >
              <span>{item.label}</span>
              <small>{item.title}</small>
            </button>
          ))}
        </nav>

        <div className="sidebar-card">
          <p className="eyebrow">Acceso</p>
          <strong>{canManage ? 'Modo operativo' : 'Modo consulta'}</strong>
          <p>
            {canManage
              ? 'Puedes ejecutar cambios de estado, reversas y recalcular operaciones de campo.'
              : 'Tu perfil está habilitado para consulta y seguimiento operativo.'}
          </p>
        </div>

        <div className="sidebar-footer">
          <button className="secondary-button" type="button" onClick={handleLogoutClick} disabled={logoutPending}>
            {logoutPending ? 'Cerrando...' : 'Cerrar sesión'}
          </button>
        </div>
      </aside>

      <section className="app-main">
        <header className="topbar">
          <div className="topbar-copy">
            <p className="eyebrow">Panel administrativo</p>
            <h1>{page.title}</h1>
            <p>{page.copy}</p>
          </div>

          <div className="session-card">
            <div className="session-card-head">
              <span className={`badge ${getStatusTone(session.user.status)}`}>{formatEnumLabel(session.user.status)}</span>
              <small>{formatEnumLabel(session.user.role)}</small>
            </div>
            <strong>{session.user.name}</strong>
            <span>{session.user.email}</span>
          </div>
        </header>

        <section className="page-area">
          {!canManage ? (
            <div className="notice-banner">
              Tu sesión está en modo consulta. Las acciones de administración están deshabilitadas.
            </div>
          ) : null}

          {activePage === 'dashboard' ? <DashboardPage token={session.token} /> : null}
          {activePage === 'buses' ? <BusesPage token={session.token} canManage={canManage} /> : null}
          {activePage === 'stops' ? <StopsPage token={session.token} canManage={canManage} /> : null}
          {activePage === 'routes' ? <RoutesPage token={session.token} canManage={canManage} /> : null}
          {activePage === 'fares' ? <FaresPage token={session.token} canManage={canManage} /> : null}
          {activePage === 'users' ? (
            <UsersPage token={session.token} currentUserId={session.user.id} canManage={canManage} />
          ) : null}
          {activePage === 'payments' ? <PaymentsPage token={session.token} canManage={canManage} /> : null}
          {activePage === 'reports' ? <ReportsPage token={session.token} /> : null}
        </section>
      </section>
    </main>
  )
}

export default App
