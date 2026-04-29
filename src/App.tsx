import * as L from 'leaflet'
import { startTransition, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import 'leaflet/dist/leaflet.css'
import './App.css'
import {
  ApiError,
  api,
  type Bus,
  type BusReport,
  type DashboardResponse,
  type Fare,
  type MapMarker,
  type OperationsMapResponse,
  type OperationalStatus,
  type PageResponse,
  type Payment,
  type PaymentMethod,
  type PaymentStatus,
  type RouteDetail,
  type RoutePath,
  type RouteReport,
  type RouteSummary,
  type StaffUser,
  type Stop,
  type SummaryReport,
  type UserRole,
  type UserStatus,
} from './api'

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

type DashboardPageProps = {
  token: string
}

type BusesPageProps = {
  token: string
  canManage: boolean
}

type StopsPageProps = {
  token: string
  canManage: boolean
}

type RoutesPageProps = {
  token: string
  canManage: boolean
}

type FaresPageProps = {
  token: string
  canManage: boolean
}

type UsersPageProps = {
  token: string
  currentUserId: string
  canManage: boolean
}

type PaymentsPageProps = {
  token: string
  canManage: boolean
}

type ReportsPageProps = {
  token: string
}

type EnumActionProps<T extends string> = {
  value: T
  options: readonly T[]
  actionLabel: string
  disabled?: boolean
  onSubmit: (nextValue: T) => Promise<void>
}

type PaginationProps = {
  page: number
  totalPages: number
  totalElements: number
  size: number
  onPageChange: (page: number) => void
}

type LayoutProps = {
  title: string
  copy: string
  toolbar?: ReactNode
  children: ReactNode
}

const SESSION_KEY = 'buses-admin-session'
const DEFAULT_CENTER: L.LatLngExpression = [14.6349, -90.5069]
const ALLOWED_ROLES: UserRole[] = ['ADMIN', 'OPERATOR', 'INSPECTOR']
const MANAGE_ROLES: UserRole[] = ['ADMIN', 'OPERATOR']
const OPERATIONAL_STATUSES: OperationalStatus[] = ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'SUSPENDED']
const USER_ROLES: UserRole[] = ['ADMIN', 'OPERATOR', 'INSPECTOR', 'PASSENGER']
const USER_STATUSES: UserStatus[] = ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'SUSPENDED']
const PAYMENT_METHODS: PaymentMethod[] = ['CARD', 'QR', 'CASH', 'WALLET']
const PAYMENT_STATUSES: PaymentStatus[] = ['COMPLETED', 'PENDING', 'FAILED', 'REVERSED']
const ROUTE_SORT = 'name,asc'

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

const currencyFormatter = new Intl.NumberFormat('es-GT', {
  style: 'currency',
  currency: 'GTQ',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const dateTimeFormatter = new Intl.DateTimeFormat('es-GT', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const dateFormatter = new Intl.DateTimeFormat('es-GT', {
  dateStyle: 'medium',
})

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

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message
  }

  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return ''
    }

    if (error.message === 'Failed to fetch') {
      return 'No se pudo establecer la conexión en este momento.'
    }

    return error.message
  }

  return 'Ocurrió un error inesperado.'
}

function formatCurrency(value: number) {
  return currencyFormatter.format(value)
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return 'Sin fecha'
  }

  return dateTimeFormatter.format(new Date(value))
}

function formatDate(value?: string | null) {
  if (!value) {
    return 'Sin fecha'
  }

  return dateFormatter.format(new Date(value))
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function getStatusTone(status?: string) {
  if (!status) {
    return 'neutral'
  }

  if (status === 'ACTIVE' || status === 'COMPLETED') {
    return 'success'
  }

  if (status === 'PENDING' || status === 'MAINTENANCE') {
    return 'warning'
  }

  if (status === 'FAILED' || status === 'INACTIVE' || status === 'SUSPENDED' || status === 'REVERSED') {
    return 'danger'
  }

  return 'neutral'
}

function getPageMeta(page: PageId) {
  return PAGES.find((item) => item.id === page) ?? PAGES[0]
}

function getPositionLabel(stop: Stop) {
  if (stop.position && stop.position.length === 2) {
    return `${stop.position[0].toFixed(5)}, ${stop.position[1].toFixed(5)}`
  }

  if (typeof stop.latitude === 'number' && typeof stop.longitude === 'number') {
    return `${stop.latitude.toFixed(5)}, ${stop.longitude.toFixed(5)}`
  }

  return 'Sin coordenadas'
}

type StopMarkerCandidate = {
  id: string
  code: string
  name: string
  status?: string
  position?: [number, number] | null
  latitude?: number
  longitude?: number
}

function isCoordinatePair(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    Number.isFinite(value[0]) &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[1])
  )
}

function getCoordinatePosition(stop: Pick<StopMarkerCandidate, 'position' | 'latitude' | 'longitude'>) {
  if (isCoordinatePair(stop.position)) {
    return stop.position
  }

  if (typeof stop.latitude === 'number' && typeof stop.longitude === 'number') {
    return [stop.latitude, stop.longitude] as [number, number]
  }

  return null
}

function createStopMarker(stop: StopMarkerCandidate) {
  const position = getCoordinatePosition(stop)

  if (!position) {
    return null
  }

  return {
    id: stop.id,
    label: `${stop.code} · ${stop.name}`,
    position,
    ...(stop.status ? { status: stop.status } : {}),
  } as MapMarker
}

function isMapMarker(value: MapMarker | null): value is MapMarker {
  return value !== null
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

function PageLayout({ title, copy, toolbar, children }: LayoutProps) {
  return (
    <div className="page-stack">
      <section className="section-hero">
        <div className="section-heading">
          <p className="eyebrow">Vista</p>
          <h2>{title}</h2>
          <p>{copy}</p>
        </div>
        {toolbar ? <div className="section-toolbar">{toolbar}</div> : null}
      </section>
      {children}
    </div>
  )
}

function CrudActionButtons({
  actions,
  note,
}: {
  actions: Array<{
    label: string
    disabled?: boolean
    variant?: 'primary-button' | 'secondary-button' | 'ghost-button'
    onClick?: () => void
  }>
  note?: string
}) {
  return (
    <div className="crud-actions">
      <div className="crud-actions-list">
        {actions.map((action) => (
          <button
            key={action.label}
            className={action.variant ?? 'ghost-button'}
            type="button"
            onClick={action.onClick}
            disabled={action.disabled ?? false}
          >
            {action.label}
          </button>
        ))}
      </div>
      {note ? <small className="crud-actions-note">{note}</small> : null}
    </div>
  )
}

function askText(label: string, initialValue = '') {
  const value = window.prompt(label, initialValue)
  if (value === null) {
    return null
  }

  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function askOptionalText(label: string, initialValue = '') {
  const value = window.prompt(label, initialValue)
  if (value === null) {
    return null
  }

  return value.trim()
}

function askNumber(label: string, initialValue: number) {
  const value = window.prompt(label, String(initialValue))
  if (value === null) {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function askOperationalStatus(initialValue: OperationalStatus) {
  const value = window.prompt('Estado: ACTIVE, INACTIVE, MAINTENANCE o SUSPENDED', initialValue)
  if (value === null) {
    return null
  }

  const normalized = value.trim().toUpperCase()
  return OPERATIONAL_STATUSES.includes(normalized as OperationalStatus) ? (normalized as OperationalStatus) : null
}

function askUserStatus(initialValue: UserStatus) {
  const value = window.prompt('Estado: ACTIVE, INACTIVE, MAINTENANCE o SUSPENDED', initialValue)
  if (value === null) {
    return null
  }

  const normalized = value.trim().toUpperCase()
  return USER_STATUSES.includes(normalized as UserStatus) ? (normalized as UserStatus) : null
}

function askUserRole(initialValue: UserRole) {
  const value = window.prompt('Rol: ADMIN, OPERATOR, INSPECTOR o PASSENGER', initialValue)
  if (value === null) {
    return null
  }

  const normalized = value.trim().toUpperCase()
  return USER_ROLES.includes(normalized as UserRole) ? (normalized as UserRole) : null
}

function askPaymentMethod(initialValue: PaymentMethod) {
  const value = window.prompt('Método: CARD, QR, CASH o WALLET', initialValue)
  if (value === null) {
    return null
  }

  const normalized = value.trim().toUpperCase()
  return PAYMENT_METHODS.includes(normalized as PaymentMethod) ? (normalized as PaymentMethod) : null
}

function askEditablePaymentStatus(initialValue: Exclude<PaymentStatus, 'REVERSED'> | PaymentStatus) {
  const fallbackValue = initialValue === 'REVERSED' ? 'FAILED' : initialValue
  const value = window.prompt('Estado: COMPLETED, PENDING o FAILED', fallbackValue)
  if (value === null) {
    return null
  }

  const normalized = value.trim().toUpperCase()
  return normalized === 'COMPLETED' || normalized === 'PENDING' || normalized === 'FAILED'
    ? (normalized as Exclude<PaymentStatus, 'REVERSED'>)
    : null
}

function DashboardPage({ token }: DashboardPageProps) {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [operationsMap, setOperationsMap] = useState<OperationsMapResponse | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    void (async () => {
      setIsLoading(true)
      setError('')

      try {
        const [dashboardResponse, operationsMapResponse] = await Promise.all([
          api.getDashboard(token, controller.signal),
          api.getOperationsMap(token, controller.signal),
        ])

        setDashboard(dashboardResponse)
        setOperationsMap(operationsMapResponse)
      } catch (error) {
        const message = getErrorMessage(error)
        if (message) {
          setError(message)
        }
      } finally {
        setIsLoading(false)
      }
    })()

    return () => controller.abort()
  }, [token])

  const totalStops = operationsMap?.stopMarkers.length ?? 0
  const totalRoutePaths = operationsMap?.routePaths.length ?? 0
  const totalVisibleBuses = operationsMap?.busMarkers.length || dashboard?.mapMarkers.length || 0

  return (
    <PageLayout
      title="Dashboard operativo"
      copy="Monitoreo general de flota, cobertura y actividad diaria."
    >
      {error ? <ErrorBanner message={error} /> : null}

      <section className="stats-grid">
        <StatCard
          label="Buses activos"
          value={String(dashboard?.metrics.activeBuses ?? (isLoading ? '...' : 0))}
          caption="Disponibilidad actual"
        />
        <StatCard
          label="Rutas registradas"
          value={String(dashboard?.metrics.registeredRoutes ?? (isLoading ? '...' : 0))}
          caption="Cobertura operativa"
        />
        <StatCard
          label="Pagos hoy"
          value={String(dashboard?.metrics.paymentsToday ?? (isLoading ? '...' : 0))}
          caption="Actividad del día"
        />
        <StatCard
          label="Ingresos hoy"
          value={dashboard ? formatCurrency(dashboard.metrics.revenueToday) : isLoading ? '...' : formatCurrency(0)}
          caption="Recaudación diaria"
        />
      </section>

      <section className="content-grid two-column">
        <article className="panel panel-map">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Mapa</p>
              <h3>Operación geográfica</h3>
            </div>
            <span className="soft-pill">{totalVisibleBuses} buses visibles</span>
          </div>

          <OperationsMapView
            ariaLabel="Mapa operativo de buses y rutas"
            focusMarkers={dashboard?.mapMarkers ?? []}
            busMarkers={operationsMap?.busMarkers ?? []}
            stopMarkers={operationsMap?.stopMarkers ?? []}
            routePaths={operationsMap?.routePaths ?? []}
          />
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Cobertura</p>
              <h3>Lectura rápida</h3>
            </div>
          </div>

          <dl className="summary-list">
            <div>
              <dt>Marcadores de buses</dt>
              <dd>{totalVisibleBuses}</dd>
            </div>
            <div>
              <dt>Paradas en mapa</dt>
              <dd>{totalStops}</dd>
            </div>
            <div>
              <dt>Trazos activos</dt>
              <dd>{totalRoutePaths}</dd>
            </div>
          </dl>

          <div className="stack-list">
            {(operationsMap?.routePaths ?? []).slice(0, 4).map((route) => (
              <div className="mini-row" key={route.id}>
                <div className="mini-dot" style={{ backgroundColor: route.color || '#0f766e' }} />
                <div>
                  <strong>{route.name}</strong>
                  <span>{route.points.length} puntos en el trazo</span>
                </div>
              </div>
            ))}

            {!isLoading && !operationsMap?.routePaths.length ? (
              <EmptyState title="Sin rutas en mapa" copy="No hay trazos disponibles para la vista actual." />
            ) : null}
          </div>
        </article>
      </section>
    </PageLayout>
  )
}

function BusesPage({ token, canManage }: BusesPageProps) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<OperationalStatus | ''>('')
  const [routeId, setRouteId] = useState('')
  const [query, setQuery] = useState({
    search: '',
    status: '' as OperationalStatus | '',
    routeId: '',
    page: 0,
    size: 12,
    sort: 'code,asc',
  })
  const [routes, setRoutes] = useState<PageResponse<RouteSummary> | null>(null)
  const [data, setData] = useState<PageResponse<Bus> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    void (async () => {
      setIsLoading(true)
      setError('')

      try {
        const [busesResponse, routesResponse] = await Promise.all([
          api.getBuses(token, query, controller.signal),
          api.getRoutes(token, { page: 0, size: 100, sort: ROUTE_SORT }, controller.signal),
        ])

        setData(busesResponse)
        setRoutes(routesResponse)
      } catch (error) {
        const message = getErrorMessage(error)
        if (message) {
          setError(message)
        }
      } finally {
        setIsLoading(false)
      }
    })()

    return () => controller.abort()
  }, [query, token])

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setQuery({
      search: search.trim(),
      status,
      routeId,
      page: 0,
      size: query.size,
      sort: query.sort,
    })
  }

  async function handleStatusUpdate(bus: Bus, nextStatus: OperationalStatus) {
    await api.patchBusStatus(token, bus.id, nextStatus)
    setData((current) =>
      current
        ? {
            ...current,
            content: current.content.map((item) => (item.id === bus.id ? { ...item, status: nextStatus } : item)),
          }
        : current,
    )
  }

  async function handleCreateBus() {
    const code = askText('Código del bus')
    if (!code) return
    const plate = askText('Placa del bus')
    if (!plate) return
    const capacity = askNumber('Capacidad', 55)
    if (capacity === null) return
    const routeValue = askOptionalText('Ruta asignada (ID, opcional)', '')
    if (routeValue === null) return
    const nextStatus = askOperationalStatus('ACTIVE')
    if (!nextStatus) return

    await api.createBus(token, {
      code,
      plate,
      capacity,
      routeId: routeValue || null,
      status: nextStatus,
    })
    setQuery((current) => ({ ...current }))
  }

  async function handleEditBus(bus: Bus) {
    const code = askText('Código del bus', bus.code)
    if (!code) return
    const plate = askText('Placa del bus', bus.plate)
    if (!plate) return
    const capacity = askNumber('Capacidad', bus.capacity)
    if (capacity === null) return
    const routeValue = askOptionalText('Ruta asignada (ID, opcional)', bus.route?.id ?? '')
    if (routeValue === null) return
    const nextStatus = askOperationalStatus(bus.status)
    if (!nextStatus) return

    const updated = await api.updateBus(token, bus.id, {
      code,
      plate,
      capacity,
      routeId: routeValue || null,
      status: nextStatus,
    })

    setData((current) =>
      current
        ? {
            ...current,
            content: current.content.map((item) => (item.id === bus.id ? updated : item)),
          }
        : current,
    )
  }

  async function handleDeleteBus(bus: Bus) {
    if (!window.confirm(`Eliminar el bus ${bus.code}?`)) {
      return
    }

    const updated = await api.deleteBus(token, bus.id)
    setData((current) =>
      current
        ? {
            ...current,
            content: current.content.map((item) => (item.id === bus.id ? updated : item)),
          }
        : current,
    )
  }

  return (
    <PageLayout
      title="Buses"
      copy="Filtros por búsqueda, estado y ruta con soporte para actualización rápida de estado."
      toolbar={
        <div className="page-toolbar">
          <form className="filters-grid compact" onSubmit={handleFilterSubmit}>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por placa o código"
            />
            <select value={status} onChange={(event) => setStatus(event.target.value as OperationalStatus | '')}>
              <option value="">Todos los estados</option>
              {OPERATIONAL_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {formatEnumLabel(item)}
                </option>
              ))}
            </select>
            <select value={routeId} onChange={(event) => setRouteId(event.target.value)}>
              <option value="">Todas las rutas</option>
              {(routes?.content ?? []).map((route) => (
                <option key={route.id} value={route.id}>
                  {route.name}
                </option>
              ))}
            </select>
            <button className="primary-button" type="submit">
              Aplicar
            </button>
          </form>

          <CrudActionButtons
            actions={[
              { label: 'Crear bus', disabled: !canManage, variant: 'primary-button', onClick: handleCreateBus },
            ]}
          />
        </div>
      }
    >
      {error ? <ErrorBanner message={error} /> : null}

      <article className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Listado</p>
            <h3>Unidades registradas</h3>
          </div>
          <span className="soft-pill">{data?.totalElements ?? 0} resultados</span>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Placa</th>
                <th>Capacidad</th>
                <th>Ruta</th>
                <th>Estado</th>
                {canManage ? <th>Acción</th> : null}
              </tr>
            </thead>
            <tbody>
              {data?.content.map((bus) => (
                <tr key={bus.id}>
                  <td>{bus.code}</td>
                  <td>{bus.plate}</td>
                  <td>{bus.capacity}</td>
                  <td>
                    <strong>{bus.route?.name ?? 'Sin asignar'}</strong>
                    <span className="cell-subtitle">
                      {bus.route ? `${bus.route.origin} -> ${bus.route.destination}` : 'No asignado a una ruta'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${getStatusTone(bus.status)}`}>{formatEnumLabel(bus.status)}</span>
                  </td>
                  {canManage ? (
                    <td className="actions-cell">
                      <EnumAction
                        key={`bus-status-${bus.id}-${bus.status}`}
                        value={bus.status}
                        options={OPERATIONAL_STATUSES}
                        actionLabel="Actualizar"
                        onSubmit={(nextStatus) => handleStatusUpdate(bus, nextStatus)}
                      />
                      <CrudActionButtons
                        actions={[
                          { label: 'Editar', disabled: !canManage, onClick: () => void handleEditBus(bus) },
                          { label: 'Eliminar', disabled: !canManage, onClick: () => void handleDeleteBus(bus) },
                        ]}
                      />
                    </td>
                  ) : null}
                </tr>
              )) ?? null}
            </tbody>
          </table>
        </div>

        {!isLoading && !data?.content.length ? (
          <EmptyState title="Sin buses" copy="No hay resultados con los filtros actuales." />
        ) : null}

        <PaginationBar
          page={data?.page ?? 0}
          totalPages={data?.totalPages ?? 0}
          totalElements={data?.totalElements ?? 0}
          size={data?.size ?? query.size}
          onPageChange={(page) => setQuery((current) => ({ ...current, page }))}
        />
      </article>
    </PageLayout>
  )
}

function StopsPage({ token, canManage }: StopsPageProps) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<OperationalStatus | ''>('')
  const [selectedStopId, setSelectedStopId] = useState('')
  const [query, setQuery] = useState({
    search: '',
    status: '' as OperationalStatus | '',
    page: 0,
    size: 12,
    sort: 'name,asc',
  })
  const [data, setData] = useState<PageResponse<Stop> | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    void (async () => {
      setError('')

      try {
        const response = await api.getStops(token, query, controller.signal)
        setData(response)
      } catch (error) {
        const message = getErrorMessage(error)
        if (message) {
          setError(message)
        }
      }
    })()

    return () => controller.abort()
  }, [query, token])

  useEffect(() => {
    if (!data?.content.length) {
      setSelectedStopId('')
      return
    }

    setSelectedStopId((current) => (data.content.some((stop) => stop.id === current) ? current : data.content[0].id))
  }, [data])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setQuery((current) => ({
      ...current,
      search: search.trim(),
      status,
      page: 0,
    }))
  }

  async function handleCreateStop() {
    const code = askText('Código de la parada')
    if (!code) return
    const name = askText('Nombre de la parada')
    if (!name) return
    const address = askText('Dirección')
    if (!address) return
    const latitude = askNumber('Latitud', 14.97)
    if (latitude === null) return
    const longitude = askNumber('Longitud', -89.53)
    if (longitude === null) return
    const nextStatus = askOperationalStatus('ACTIVE')
    if (!nextStatus) return

    await api.createStop(token, { code, name, address, latitude, longitude, status: nextStatus })
    setQuery((current) => ({ ...current }))
  }

  async function handleEditStop(stop: Stop) {
    const code = askText('Código de la parada', stop.code)
    if (!code) return
    const name = askText('Nombre de la parada', stop.name)
    if (!name) return
    const address = askText('Dirección', stop.address)
    if (!address) return
    const position = getCoordinatePosition(stop)
    const latitude = askNumber('Latitud', position?.[0] ?? 14.97)
    if (latitude === null) return
    const longitude = askNumber('Longitud', position?.[1] ?? -89.53)
    if (longitude === null) return
    const nextStatus = askOperationalStatus(stop.status)
    if (!nextStatus) return

    const updated = await api.updateStop(token, stop.id, { code, name, address, latitude, longitude, status: nextStatus })
    setData((current) =>
      current
        ? {
            ...current,
            content: current.content.map((item) => (item.id === stop.id ? updated : item)),
          }
        : current,
    )
  }

  async function handleDeleteStop(stop: Stop) {
    if (!window.confirm(`Eliminar la parada ${stop.code}?`)) {
      return
    }

    const updated = await api.deleteStop(token, stop.id)
    setData((current) =>
      current
        ? {
            ...current,
            content: current.content.map((item) => (item.id === stop.id ? updated : item)),
          }
        : current,
    )
  }

  const stopMarkers = (data?.content ?? []).map(createStopMarker).filter(isMapMarker)
  const selectedStop = data?.content.find((stop) => stop.id === selectedStopId) ?? null
  const highlightedStop = selectedStop ? createStopMarker(selectedStop) : null
  const activeStops = (data?.content ?? []).filter((stop) => stop.status === 'ACTIVE').length

  return (
    <PageLayout
      title="Paradas"
      copy="Catálogo de paradas con ubicación, estado y contexto geográfico."
      toolbar={
        <div className="page-toolbar">
          <form className="filters-grid compact" onSubmit={handleSubmit}>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar parada" />
            <select value={status} onChange={(event) => setStatus(event.target.value as OperationalStatus | '')}>
              <option value="">Todos los estados</option>
              {OPERATIONAL_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {formatEnumLabel(item)}
                </option>
              ))}
            </select>
            <button className="primary-button" type="submit">
              Filtrar
            </button>
          </form>

          <CrudActionButtons
            actions={[
              { label: 'Crear parada', disabled: !canManage, variant: 'primary-button', onClick: handleCreateStop },
            ]}
          />
        </div>
      }
    >
      {error ? <ErrorBanner message={error} /> : null}

      <section className="content-grid two-column map-support-grid">
        <article className="panel panel-map">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Mapa</p>
              <h3>Cobertura de paradas</h3>
            </div>
            <span className="soft-pill">{stopMarkers.length} ubicaciones</span>
          </div>

          <OperationsMapView
            ariaLabel="Mapa de paradas registradas"
            focusMarkers={highlightedStop ? [highlightedStop] : []}
            stopMarkers={stopMarkers}
          />
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Contexto</p>
              <h3>{selectedStop?.name ?? 'Selecciona una parada'}</h3>
            </div>
          </div>

          <dl className="summary-list">
            <div>
              <dt>Total en página</dt>
              <dd>{data?.content.length ?? 0}</dd>
            </div>
            <div>
              <dt>Paradas activas</dt>
              <dd>{activeStops}</dd>
            </div>
            <div>
              <dt>Selección actual</dt>
              <dd>{selectedStop?.code ?? 'Sin selección'}</dd>
            </div>
          </dl>

          <div className="detail-card">
            <p className="eyebrow">Ficha rápida</p>
            {selectedStop ? (
              <div className="stack-list">
                <div className="mini-row">
                  <div>
                    <strong>{selectedStop.address}</strong>
                    <span>{getPositionLabel(selectedStop)}</span>
                  </div>
                  <span className={`badge ${getStatusTone(selectedStop.status)}`}>{formatEnumLabel(selectedStop.status)}</span>
                </div>
              </div>
            ) : (
              <EmptyState title="Sin parada seleccionada" copy="Selecciona una fila para inspeccionar su ubicación." />
            )}
          </div>
        </article>
      </section>

      <article className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Inventario</p>
            <h3>Paradas registradas</h3>
          </div>
          <span className="soft-pill">{data?.totalElements ?? 0} resultados</span>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Dirección</th>
                <th>Coordenadas</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data?.content.map((stop) => (
                <tr
                  key={stop.id}
                  className={selectedStopId === stop.id ? 'stop-row is-selected' : 'stop-row'}
                  onClick={() => setSelectedStopId(stop.id)}
                >
                  <td>{stop.code}</td>
                  <td>{stop.name}</td>
                  <td>{stop.address}</td>
                  <td>{getPositionLabel(stop)}</td>
                  <td>
                    <span className={`badge ${getStatusTone(stop.status)}`}>{formatEnumLabel(stop.status)}</span>
                  </td>
                  <td className="actions-cell">
                    <CrudActionButtons
                      actions={[
                        { label: 'Editar', disabled: !canManage, onClick: () => void handleEditStop(stop) },
                        { label: 'Eliminar', disabled: !canManage, onClick: () => void handleDeleteStop(stop) },
                      ]}
                    />
                  </td>
                </tr>
              )) ?? null}
            </tbody>
          </table>
        </div>

        {!data?.content.length ? (
          <EmptyState title="Sin paradas" copy="No hubo coincidencias para los filtros activos." />
        ) : null}

        <PaginationBar
          page={data?.page ?? 0}
          totalPages={data?.totalPages ?? 0}
          totalElements={data?.totalElements ?? 0}
          size={data?.size ?? query.size}
          onPageChange={(page) => setQuery((current) => ({ ...current, page }))}
        />
      </article>
    </PageLayout>
  )
}

function RoutesPage({ token, canManage }: RoutesPageProps) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<OperationalStatus | ''>('')
  const [query, setQuery] = useState({
    search: '',
    status: '' as OperationalStatus | '',
    page: 0,
    size: 10,
    sort: ROUTE_SORT,
  })
  const [data, setData] = useState<PageResponse<RouteSummary> | null>(null)
  const [selectedRouteId, setSelectedRouteId] = useState('')
  const [detail, setDetail] = useState<RouteDetail | null>(null)
  const [error, setError] = useState('')
  const [detailError, setDetailError] = useState('')
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    void (async () => {
      setError('')

      try {
        const response = await api.getRoutes(token, query, controller.signal)
        setData(response)
        if (!selectedRouteId && response.content.length > 0) {
          setSelectedRouteId(response.content[0].id)
        }
        if (response.content.length === 0) {
          setSelectedRouteId('')
          setDetail(null)
        }
      } catch (error) {
        const message = getErrorMessage(error)
        if (message) {
          setError(message)
        }
      }
    })()

    return () => controller.abort()
  }, [query, selectedRouteId, token])

  useEffect(() => {
    if (!selectedRouteId) {
      return
    }

    const controller = new AbortController()

    void (async () => {
      setDetailLoading(true)
      setDetailError('')

      try {
        const response = await api.getRoute(token, selectedRouteId, controller.signal)
        setDetail(response)
      } catch (error) {
        const message = getErrorMessage(error)
        if (message) {
          setDetailError(message)
        }
      } finally {
        setDetailLoading(false)
      }
    })()

    return () => controller.abort()
  }, [selectedRouteId, token])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setQuery((current) => ({
      ...current,
      search: search.trim(),
      status,
      page: 0,
    }))
  }

  async function handleRecalculateGeometry() {
    if (!detail) {
      return
    }

    const updated = await api.recalculateRouteGeometry(token, detail.id)
    setDetail(updated)
  }

  async function handleCreateRoute() {
    const name = askText('Nombre de la ruta')
    if (!name) return
    const stopIdsValue = askText('IDs de paradas separados por coma')
    if (!stopIdsValue) return
    const stopIds = stopIdsValue.split(',').map((item) => item.trim()).filter(Boolean)
    if (stopIds.length < 2) return
    const nextStatus = askOperationalStatus('ACTIVE')
    if (!nextStatus) return

    await api.createRoute(token, { name, stopIds, status: nextStatus })
    setQuery((current) => ({ ...current }))
  }

  async function handleEditRoute() {
    if (!detail) return
    const name = askText('Nombre de la ruta', detail.name)
    if (!name) return
    const stopIdsValue = askText('IDs de paradas separados por coma', detail.stops.map((stop) => stop.id).join(', '))
    if (!stopIdsValue) return
    const stopIds = stopIdsValue.split(',').map((item) => item.trim()).filter(Boolean)
    if (stopIds.length < 2) return
    const nextStatus = askOperationalStatus(detail.status)
    if (!nextStatus) return

    const updated = await api.updateRoute(token, detail.id, { name, stopIds, status: nextStatus })
    setDetail(updated)
    setQuery((current) => ({ ...current }))
  }

  async function handleDeleteRoute() {
    if (!detail || !window.confirm(`Eliminar la ruta ${detail.name}?`)) return
    const updated = await api.deleteRoute(token, detail.id)
    setDetail(updated)
    setData((current) =>
      current
        ? {
            ...current,
            content: current.content.map((item) =>
              item.id === updated.id
                ? {
                    ...item,
                    name: updated.name,
                    origin: updated.origin,
                    destination: updated.destination,
                    status: updated.status,
                  }
                : item,
            ),
          }
        : current,
    )
  }

  const routeStopMarkers = (detail?.stops ?? []).map(createStopMarker).filter(isMapMarker)
  const routeFocusMarkers =
    detail?.stops.length && routeStopMarkers.length
      ? routeStopMarkers.filter((marker) => {
          const firstStop = detail.stops[0]
          const lastStop = detail.stops[detail.stops.length - 1]
          return marker.id === firstStop.id || marker.id === lastStop.id
        })
      : []
  const routePaths =
    detail?.geometry?.coordinates.length
      ? [
          {
            id: detail.id,
            name: detail.name,
            color: '#0f766e',
            points: detail.geometry.coordinates.filter(isCoordinatePair),
          },
        ]
      : []

  return (
    <PageLayout
      title="Rutas"
      copy="Listado de rutas, detalle operativo y visualización del trazado."
      toolbar={
        <div className="page-toolbar">
          <form className="filters-grid compact" onSubmit={handleSubmit}>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar ruta" />
            <select value={status} onChange={(event) => setStatus(event.target.value as OperationalStatus | '')}>
              <option value="">Todos los estados</option>
              {OPERATIONAL_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {formatEnumLabel(item)}
                </option>
              ))}
            </select>
            <button className="primary-button" type="submit">
              Filtrar
            </button>
          </form>

          <CrudActionButtons
            actions={[
              { label: 'Crear ruta', disabled: !canManage, variant: 'primary-button', onClick: handleCreateRoute },
            ]}
          />
        </div>
      }
    >
      {error ? <ErrorBanner message={error} /> : null}

      <section className="content-grid route-detail-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Listado</p>
              <h3>Rutas disponibles</h3>
            </div>
            <span className="soft-pill">{data?.totalElements ?? 0} rutas</span>
          </div>

          <div className="stack-list">
            {data?.content.map((route) => (
              <button
                className={`route-row ${selectedRouteId === route.id ? 'active' : ''}`}
                key={route.id}
                type="button"
                onClick={() => setSelectedRouteId(route.id)}
              >
                <div>
                  <strong>{route.name}</strong>
                  <span>
                    {route.origin} {'->'} {route.destination}
                  </span>
                </div>
                <span className={`badge ${getStatusTone(route.status)}`}>{formatEnumLabel(route.status)}</span>
              </button>
            )) ?? null}
          </div>

          {!data?.content.length ? (
            <EmptyState title="Sin rutas" copy="No se encontraron rutas con los filtros enviados." />
          ) : null}

          <PaginationBar
            page={data?.page ?? 0}
            totalPages={data?.totalPages ?? 0}
            totalElements={data?.totalElements ?? 0}
            size={data?.size ?? query.size}
            onPageChange={(page) => setQuery((current) => ({ ...current, page }))}
          />
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Detalle</p>
              <h3>{detail?.name ?? 'Selecciona una ruta'}</h3>
            </div>
            <div className="panel-actions">
              {canManage && detail ? (
                <button className="primary-button" type="button" onClick={handleRecalculateGeometry}>
                  Recalcular geometría
                </button>
              ) : null}
              <CrudActionButtons
                actions={[
                  { label: 'Editar ruta', disabled: !canManage || !detail, onClick: handleEditRoute },
                  { label: 'Eliminar ruta', disabled: !canManage || !detail, onClick: handleDeleteRoute },
                ]}
              />
            </div>
          </div>

          {detailError ? <ErrorBanner message={detailError} /> : null}

          {detailLoading ? <EmptyState title="Cargando ruta" copy="Preparando el detalle seleccionado." /> : null}

          {!detailLoading && detail ? (
            <div className="detail-stack">
              <section className="content-grid two-column route-map-layout">
                <div className="detail-card">
                  <div className="panel-head">
                    <div>
                      <p className="eyebrow">Mapa</p>
                      <h3>Trazo de la ruta</h3>
                    </div>
                    <span className="soft-pill">{routePaths[0]?.points.length ?? 0} puntos</span>
                  </div>

                  <OperationsMapView
                    ariaLabel={`Mapa de la ruta ${detail.name}`}
                    focusMarkers={routeFocusMarkers}
                    stopMarkers={routeStopMarkers}
                    routePaths={routePaths}
                  />
                </div>

                <div className="detail-card">
                  <p className="eyebrow">Resumen</p>
                  <dl className="summary-list">
                    <div>
                      <dt>Origen</dt>
                      <dd>{detail.origin}</dd>
                    </div>
                    <div>
                      <dt>Destino</dt>
                      <dd>{detail.destination}</dd>
                    </div>
                    <div>
                      <dt>Paradas</dt>
                      <dd>{detail.stops.length}</dd>
                    </div>
                    <div>
                      <dt>Geometría</dt>
                      <dd>{detail.geometry?.coordinates.length ?? 0} puntos</dd>
                    </div>
                  </dl>
                </div>
              </section>

              <div className="detail-card">
                <p className="eyebrow">Secuencia</p>
                <div className="stack-list">
                  {detail.stops.map((stop) => (
                    <div className="mini-row" key={stop.id}>
                      <span className="order-chip">{stop.order}</span>
                      <div>
                        <strong>{stop.name}</strong>
                        <span>
                          {stop.code}
                          {stop.position ? ` · ${stop.position[0].toFixed(5)}, ${stop.position[1].toFixed(5)}` : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </article>
      </section>
    </PageLayout>
  )
}

function FaresPage({ token, canManage }: FaresPageProps) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<OperationalStatus | ''>('')
  const [query, setQuery] = useState({
    search: '',
    status: '' as OperationalStatus | '',
    page: 0,
    size: 12,
    sort: 'validFrom,desc',
  })
  const [data, setData] = useState<PageResponse<Fare> | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    void (async () => {
      setError('')

      try {
        const response = await api.getFares(token, query, controller.signal)
        setData(response)
      } catch (error) {
        const message = getErrorMessage(error)
        if (message) {
          setError(message)
        }
      }
    })()

    return () => controller.abort()
  }, [query, token])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setQuery((current) => ({
      ...current,
      search: search.trim(),
      status,
      page: 0,
    }))
  }

  async function handleCreateFare() {
    const name = askText('Nombre de la tarifa')
    if (!name) return
    const amount = askNumber('Monto', 4)
    if (amount === null) return
    const validFrom = askText('Vigencia desde (YYYY-MM-DD)')
    if (!validFrom) return
    const validTo = askText('Vigencia hasta (YYYY-MM-DD)')
    if (!validTo) return
    const nextStatus = askOperationalStatus('ACTIVE')
    if (!nextStatus) return

    await api.createFare(token, { name, amount, validFrom, validTo, status: nextStatus })
    setQuery((current) => ({ ...current }))
  }

  async function handleEditFare(fare: Fare) {
    const name = askText('Nombre de la tarifa', fare.name)
    if (!name) return
    const amount = askNumber('Monto', fare.amount)
    if (amount === null) return
    const validFrom = askText('Vigencia desde (YYYY-MM-DD)', fare.validFrom.slice(0, 10))
    if (!validFrom) return
    const validTo = askText('Vigencia hasta (YYYY-MM-DD)', fare.validTo.slice(0, 10))
    if (!validTo) return
    const nextStatus = askOperationalStatus(fare.status)
    if (!nextStatus) return

    const updated = await api.updateFare(token, fare.id, { name, amount, validFrom, validTo, status: nextStatus })
    setData((current) =>
      current
        ? {
            ...current,
            content: current.content.map((item) => (item.id === fare.id ? updated : item)),
          }
        : current,
    )
  }

  async function handleDeleteFare(fare: Fare) {
    if (!window.confirm(`Eliminar la tarifa ${fare.name}?`)) return
    const updated = await api.deleteFare(token, fare.id)
    setData((current) =>
      current
        ? {
            ...current,
            content: current.content.map((item) => (item.id === fare.id ? updated : item)),
          }
        : current,
    )
  }

  return (
    <PageLayout
      title="Tarifas"
      copy="Administración de vigencias, montos y estado de las tarifas."
      toolbar={
        <div className="page-toolbar">
          <form className="filters-grid compact" onSubmit={handleSubmit}>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar tarifa" />
            <select value={status} onChange={(event) => setStatus(event.target.value as OperationalStatus | '')}>
              <option value="">Todos los estados</option>
              {OPERATIONAL_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {formatEnumLabel(item)}
                </option>
              ))}
            </select>
            <button className="primary-button" type="submit">
              Filtrar
            </button>
          </form>

          <CrudActionButtons
            actions={[
              { label: 'Crear tarifa', disabled: !canManage, variant: 'primary-button', onClick: handleCreateFare },
            ]}
          />
        </div>
      }
    >
      {error ? <ErrorBanner message={error} /> : null}

      <article className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Catálogo</p>
            <h3>Tarifas registradas</h3>
          </div>
          <span className="soft-pill">{data?.totalElements ?? 0} registros</span>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Monto</th>
                <th>Vigencia</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data?.content.map((fare) => (
                <tr key={fare.id}>
                  <td>{fare.name}</td>
                  <td>{formatCurrency(fare.amount)}</td>
                  <td>
                    {formatDate(fare.validFrom)} {'->'} {formatDate(fare.validTo)}
                  </td>
                  <td>
                    <span className={`badge ${getStatusTone(fare.status)}`}>{formatEnumLabel(fare.status)}</span>
                  </td>
                  <td className="actions-cell">
                    <CrudActionButtons
                      actions={[
                        { label: 'Editar', disabled: !canManage, onClick: () => void handleEditFare(fare) },
                        { label: 'Eliminar', disabled: !canManage, onClick: () => void handleDeleteFare(fare) },
                      ]}
                    />
                  </td>
                </tr>
              )) ?? null}
            </tbody>
          </table>
        </div>

        {!data?.content.length ? <EmptyState title="Sin tarifas" copy="No hay tarifas disponibles para los filtros actuales." /> : null}

        <PaginationBar
          page={data?.page ?? 0}
          totalPages={data?.totalPages ?? 0}
          totalElements={data?.totalElements ?? 0}
          size={data?.size ?? query.size}
          onPageChange={(page) => setQuery((current) => ({ ...current, page }))}
        />
      </article>
    </PageLayout>
  )
}

function UsersPage({ token, currentUserId, canManage }: UsersPageProps) {
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<UserRole | ''>('')
  const [status, setStatus] = useState<UserStatus | ''>('')
  const [query, setQuery] = useState({
    search: '',
    role: '' as UserRole | '',
    status: '' as UserStatus | '',
    page: 0,
    size: 12,
    sort: 'name,asc',
  })
  const [data, setData] = useState<PageResponse<StaffUser> | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    void (async () => {
      setError('')

      try {
        const response = await api.getUsers(token, query, controller.signal)
        setData(response)
      } catch (error) {
        const message = getErrorMessage(error)
        if (message) {
          setError(message)
        }
      }
    })()

    return () => controller.abort()
  }, [query, token])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setQuery((current) => ({
      ...current,
      search: search.trim(),
      role,
      status,
      page: 0,
    }))
  }

  async function handleStatusChange(user: StaffUser, nextStatus: UserStatus) {
    await api.patchUserStatus(token, user.id, nextStatus)
    setData((current) =>
      current
        ? {
            ...current,
            content: current.content.map((item) => (item.id === user.id ? { ...item, status: nextStatus } : item)),
          }
        : current,
    )
  }

  async function handleRoleChange(user: StaffUser, nextRole: UserRole) {
    await api.patchUserRole(token, user.id, nextRole)
    setData((current) =>
      current
        ? {
            ...current,
            content: current.content.map((item) => (item.id === user.id ? { ...item, role: nextRole } : item)),
          }
        : current,
    )
  }

  async function handlePasswordReset(user: StaffUser, password: string) {
    await api.resetUserPassword(token, user.id, password)
  }

  async function handleCreateUser() {
    const name = askText('Nombre del usuario')
    if (!name) return
    const email = askText('Correo del usuario')
    if (!email) return
    const roleValue = askUserRole('OPERATOR')
    if (!roleValue) return
    const statusValue = askUserStatus('ACTIVE')
    if (!statusValue) return
    const password = askText('Contraseña temporal')
    if (!password) return

    await api.createUser(token, { name, email, role: roleValue, status: statusValue, password })
    setQuery((current) => ({ ...current }))
  }

  async function handleEditUser(user: StaffUser) {
    const name = askText('Nombre del usuario', user.name)
    if (!name) return
    const email = askText('Correo del usuario', user.email)
    if (!email) return
    const roleValue = askUserRole(user.role)
    if (!roleValue) return
    const statusValue = askUserStatus(user.status)
    if (!statusValue) return

    const updated = await api.updateUser(token, user.id, { name, email, role: roleValue, status: statusValue })
    setData((current) =>
      current
        ? {
            ...current,
            content: current.content.map((item) => (item.id === user.id ? updated : item)),
          }
        : current,
    )
  }

  async function handleDeleteUser(user: StaffUser) {
    if (!window.confirm(`Eliminar al usuario ${user.name}?`)) return
    const updated = await api.deleteUser(token, user.id)
    setData((current) =>
      current
        ? {
            ...current,
            content: current.content.map((item) => (item.id === user.id ? updated : item)),
          }
        : current,
    )
  }

  return (
    <PageLayout
      title="Usuarios"
      copy="Búsqueda por nombre, correo, rol y estado con acciones rápidas de soporte administrativo."
      toolbar={
        <div className="page-toolbar">
          <form className="filters-grid compact" onSubmit={handleSubmit}>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar usuario" />
            <select value={role} onChange={(event) => setRole(event.target.value as UserRole | '')}>
              <option value="">Todos los roles</option>
              {USER_ROLES.map((item) => (
                <option key={item} value={item}>
                  {formatEnumLabel(item)}
                </option>
              ))}
            </select>
            <select value={status} onChange={(event) => setStatus(event.target.value as UserStatus | '')}>
              <option value="">Todos los estados</option>
              {USER_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {formatEnumLabel(item)}
                </option>
              ))}
            </select>
            <button className="primary-button" type="submit">
              Filtrar
            </button>
          </form>

          <CrudActionButtons
            actions={[
              { label: 'Crear usuario', disabled: !canManage, variant: 'primary-button', onClick: handleCreateUser },
            ]}
          />
        </div>
      }
    >
      {error ? <ErrorBanner message={error} /> : null}

      <article className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Directorio</p>
            <h3>Usuarios del sistema</h3>
          </div>
          <span className="soft-pill">{data?.totalElements ?? 0} registros</span>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
                {canManage ? <th>Acciones</th> : null}
              </tr>
            </thead>
            <tbody>
              {data?.content.map((user) => {
                const isCurrentUser = user.id === currentUserId
                const rowDisabled = isCurrentUser || !canManage

                return (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.name}</strong>
                      <span className="cell-subtitle">{isCurrentUser ? 'Sesión actual' : user.id}</span>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`badge ${getStatusTone(user.role === 'PASSENGER' ? 'INACTIVE' : 'ACTIVE')}`}>
                        {formatEnumLabel(user.role)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getStatusTone(user.status)}`}>{formatEnumLabel(user.status)}</span>
                    </td>
                    {canManage ? (
                      <td className="actions-cell">
                        <EnumAction
                          key={`user-role-${user.id}-${user.role}`}
                          value={user.role}
                          options={USER_ROLES}
                          actionLabel="Rol"
                          disabled={rowDisabled}
                          onSubmit={(nextRole) => handleRoleChange(user, nextRole)}
                        />
                        <EnumAction
                          key={`user-status-${user.id}-${user.status}`}
                          value={user.status}
                          options={USER_STATUSES}
                          actionLabel="Estado"
                          disabled={rowDisabled}
                          onSubmit={(nextStatus) => handleStatusChange(user, nextStatus)}
                        />
                        <PasswordResetAction
                          disabled={rowDisabled}
                          onSubmit={(password) => handlePasswordReset(user, password)}
                        />
                        <CrudActionButtons
                          actions={[
                            { label: 'Editar', disabled: rowDisabled, onClick: () => void handleEditUser(user) },
                            { label: 'Eliminar', disabled: rowDisabled, onClick: () => void handleDeleteUser(user) },
                          ]}
                        />
                      </td>
                    ) : null}
                  </tr>
                )
              }) ?? null}
            </tbody>
          </table>
        </div>

        {!data?.content.length ? <EmptyState title="Sin usuarios" copy="No hubo coincidencias para esta consulta." /> : null}

        <PaginationBar
          page={data?.page ?? 0}
          totalPages={data?.totalPages ?? 0}
          totalElements={data?.totalElements ?? 0}
          size={data?.size ?? query.size}
          onPageChange={(page) => setQuery((current) => ({ ...current, page }))}
        />
      </article>
    </PageLayout>
  )
}

function PaymentsPage({ token, canManage }: PaymentsPageProps) {
  const [userId, setUserId] = useState('')
  const [busId, setBusId] = useState('')
  const [status, setStatus] = useState<PaymentStatus | ''>('')
  const [method, setMethod] = useState<PaymentMethod | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [createUserId, setCreateUserId] = useState('')
  const [createBusId, setCreateBusId] = useState('')
  const [amount, setAmount] = useState('4.00')
  const [createMethod, setCreateMethod] = useState<PaymentMethod>('CASH')
  const [externalReference, setExternalReference] = useState('')
  const [createFeedback, setCreateFeedback] = useState('')
  const [query, setQuery] = useState({
    userId: '',
    busId: '',
    status: '' as PaymentStatus | '',
    method: '' as PaymentMethod | '',
    dateFrom: '',
    dateTo: '',
    page: 0,
    size: 12,
    sort: 'date,desc',
  })
  const [data, setData] = useState<PageResponse<Payment> | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    void (async () => {
      setError('')

      try {
        const response = await api.getPayments(token, query, controller.signal)
        setData(response)
      } catch (error) {
        const message = getErrorMessage(error)
        if (message) {
          setError(message)
        }
      }
    })()

    return () => controller.abort()
  }, [query, token])

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setQuery((current) => ({
      ...current,
      userId: userId.trim(),
      busId: busId.trim(),
      status,
      method,
      dateFrom,
      dateTo,
      page: 0,
    }))
  }

  async function handleCreatePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreateFeedback('')

    const created = await api.createPayment(token, {
      userId: createUserId.trim(),
      busId: createBusId.trim(),
      amount: Number(amount),
      method: createMethod,
      externalReference: externalReference.trim() || undefined,
    })

    setCreateFeedback(`Pago ${created.id} creado para ${created.user} por ${formatCurrency(created.amount)}.`)
    setCreateUserId('')
    setCreateBusId('')
    setExternalReference('')
    setQuery((current) => ({ ...current }))
  }

  async function handleReversePayment(payment: Payment, reason: string) {
    await api.reversePayment(token, payment.id, reason)
    setData((current) =>
      current
        ? {
            ...current,
            content: current.content.map((item) => (item.id === payment.id ? { ...item, status: 'REVERSED' } : item)),
          }
        : current,
    )
  }

  async function handleEditPayment(payment: Payment) {
    if (payment.method === 'WALLET') {
      window.alert('Los pagos de billetera se corrigen con reversa u otros controles operativos.')
      return
    }

    const nextUserId = askText('ID del usuario', payment.userId)
    if (!nextUserId) return
    const nextBusId = askText('ID del bus', payment.busId)
    if (!nextBusId) return
    const nextAmount = askNumber('Monto', payment.amount)
    if (nextAmount === null) return
    const nextMethod = askPaymentMethod(payment.method)
    if (!nextMethod) return
    if (nextMethod === 'WALLET') {
      window.alert('La edición administrativa no permite pagos con método WALLET.')
      return
    }
    const nextStatus = askEditablePaymentStatus(payment.status)
    if (!nextStatus) return
    const nextDate = askText('Fecha y hora (ISO 8601)', payment.date)
    if (!nextDate) return
    const nextReference = askOptionalText('Referencia externa', payment.externalReference ?? '')
    if (nextReference === null) return

    const updated = await api.updatePayment(token, payment.id, {
      userId: nextUserId,
      busId: nextBusId,
      amount: nextAmount,
      method: nextMethod,
      date: nextDate,
      externalReference: nextReference || undefined,
      status: nextStatus,
    })

    setData((current) =>
      current
        ? {
            ...current,
            content: current.content.map((item) => (item.id === payment.id ? updated : item)),
          }
        : current,
    )
  }

  async function handleDeletePayment(payment: Payment) {
    if (!window.confirm(`Eliminar el pago ${payment.id}?`)) return
    if (payment.method === 'WALLET') {
      window.alert('Los pagos de billetera no se eliminan desde este módulo.')
      return
    }

    const result = await api.deletePayment(token, payment.id)
    if (!result.success) {
      return
    }

    setData((current) =>
      current
        ? {
            ...current,
            content: current.content.filter((item) => item.id !== payment.id),
            totalElements: Math.max(0, current.totalElements - 1),
          }
        : current,
    )
  }

  return (
    <PageLayout
      title="Pagos"
      copy="Gestión de cobros, filtros de consulta y acciones administrativas sobre transacciones."
      toolbar={
        <div className="page-toolbar">
          <form className="filters-grid payments" onSubmit={handleFilterSubmit}>
            <input value={userId} onChange={(event) => setUserId(event.target.value)} placeholder="ID de usuario" />
            <input value={busId} onChange={(event) => setBusId(event.target.value)} placeholder="ID de bus" />
            <select value={status} onChange={(event) => setStatus(event.target.value as PaymentStatus | '')}>
              <option value="">Todos los estados</option>
              {PAYMENT_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {formatEnumLabel(item)}
                </option>
              ))}
            </select>
            <select value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod | '')}>
              <option value="">Todos los métodos</option>
              {PAYMENT_METHODS.map((item) => (
                <option key={item} value={item}>
                  {formatEnumLabel(item)}
                </option>
              ))}
            </select>
            <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            <button className="primary-button" type="submit">
              Filtrar
            </button>
          </form>

          <CrudActionButtons
            actions={[
              { label: 'Registrar pago', disabled: !canManage, variant: 'primary-button', onClick: () => {
                const form = document.querySelector('.create-payment button[type="submit"]') as HTMLButtonElement | null
                form?.focus()
              } },
            ]}
          />
        </div>
      }
    >
      {error ? <ErrorBanner message={error} /> : null}

      {canManage ? (
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Caja</p>
              <h3>Registrar pago manual</h3>
            </div>
          </div>

          <form className="filters-grid create-payment" onSubmit={handleCreatePayment}>
            <input
              value={createUserId}
              onChange={(event) => setCreateUserId(event.target.value)}
              placeholder="ID de usuario"
              required
            />
            <input value={createBusId} onChange={(event) => setCreateBusId(event.target.value)} placeholder="ID de bus" required />
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
            />
            <select value={createMethod} onChange={(event) => setCreateMethod(event.target.value as PaymentMethod)}>
              {PAYMENT_METHODS.map((item) => (
                <option key={item} value={item}>
                  {formatEnumLabel(item)}
                </option>
              ))}
            </select>
            <input
              value={externalReference}
              onChange={(event) => setExternalReference(event.target.value)}
              placeholder="Referencia externa"
            />
            <button className="primary-button" type="submit">
              Registrar
            </button>
          </form>

          {createFeedback ? <p className="success-copy">{createFeedback}</p> : null}
        </article>
      ) : null}

      <article className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Transacciones</p>
            <h3>Pagos registrados</h3>
          </div>
          <span className="soft-pill">{data?.totalElements ?? 0} pagos</span>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Usuario</th>
                <th>Bus</th>
                <th>Ruta</th>
                <th>Método</th>
                <th>Monto</th>
                <th>Estado</th>
                {canManage ? <th>Acción</th> : null}
              </tr>
            </thead>
            <tbody>
              {data?.content.map((payment) => {
                const paymentLocked = payment.method === 'WALLET'

                return (
                  <tr key={payment.id}>
                    <td>{formatDateTime(payment.date)}</td>
                    <td>
                      <strong>{payment.user}</strong>
                      <span className="cell-subtitle">{payment.userId}</span>
                    </td>
                    <td>
                      <strong>{payment.bus}</strong>
                      <span className="cell-subtitle">{payment.busPlate}</span>
                    </td>
                    <td>
                      {payment.routeName}
                      <span className="cell-subtitle">
                        {payment.routeOrigin} {'->'} {payment.routeDestination}
                      </span>
                    </td>
                    <td>{formatEnumLabel(payment.method)}</td>
                    <td>{formatCurrency(payment.amount)}</td>
                    <td>
                      <span className={`badge ${getStatusTone(payment.status)}`}>{formatEnumLabel(payment.status)}</span>
                    </td>
                    {canManage ? (
                      <td className="actions-cell">
                        {payment.status === 'COMPLETED' ? (
                          <ReversePaymentAction onSubmit={(reason) => handleReversePayment(payment, reason)} />
                        ) : (
                          <span className="muted-copy">No disponible</span>
                        )}
                        <CrudActionButtons
                          actions={[
                            { label: 'Editar', disabled: !canManage || paymentLocked, onClick: () => void handleEditPayment(payment) },
                            { label: 'Eliminar', disabled: !canManage || paymentLocked, onClick: () => void handleDeletePayment(payment) },
                          ]}
                          note={paymentLocked ? 'Los pagos de billetera se administran por reversa.' : undefined}
                        />
                      </td>
                    ) : null}
                  </tr>
                )
              }) ?? null}
            </tbody>
          </table>
        </div>

        {!data?.content.length ? <EmptyState title="Sin pagos" copy="No hay transacciones para este rango y filtros." /> : null}

        <PaginationBar
          page={data?.page ?? 0}
          totalPages={data?.totalPages ?? 0}
          totalElements={data?.totalElements ?? 0}
          size={data?.size ?? query.size}
          onPageChange={(page) => setQuery((current) => ({ ...current, page }))}
        />
      </article>
    </PageLayout>
  )
}

function ReportsPage({ token }: ReportsPageProps) {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: '' as PaymentStatus | '',
    method: '' as PaymentMethod | '',
    page: 0,
    size: 8,
    sort: 'date,desc',
  })
  const [summary, setSummary] = useState<SummaryReport | null>(null)
  const [routeReport, setRouteReport] = useState<RouteReport[]>([])
  const [busReport, setBusReport] = useState<BusReport[]>([])
  const [paymentReport, setPaymentReport] = useState<PageResponse<Payment> | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    void (async () => {
      setError('')

      try {
        const [summaryResponse, routeReportResponse, busReportResponse, paymentReportResponse] = await Promise.all([
          api.getSummaryReport(token, filters, controller.signal),
          api.getRouteReport(token, controller.signal),
          api.getBusReport(token, controller.signal),
          api.getPaymentReport(token, filters, controller.signal),
        ])

        setSummary(summaryResponse)
        setRouteReport(routeReportResponse)
        setBusReport(busReportResponse)
        setPaymentReport(paymentReportResponse)
      } catch (error) {
        const message = getErrorMessage(error)
        if (message) {
          setError(message)
        }
      }
    })()

    return () => controller.abort()
  }, [filters, token])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFilters((current) => ({
      ...current,
      dateFrom,
      dateTo,
      page: 0,
    }))
  }

  return (
    <PageLayout
      title="Reportes"
      copy="Indicadores consolidados, rankings operativos y actividad reciente."
      toolbar={
        <form className="filters-grid compact" onSubmit={handleSubmit}>
          <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          <button className="primary-button" type="submit">
            Actualizar
          </button>
        </form>
      }
    >
      {error ? <ErrorBanner message={error} /> : null}

      <section className="stats-grid">
        <StatCard label="Buses activos" value={String(summary?.activeBuses ?? 0)} caption="Estado general" />
        <StatCard label="Rutas registradas" value={String(summary?.registeredRoutes ?? 0)} caption="Cobertura total" />
        <StatCard label="Paradas registradas" value={String(summary?.registeredStops ?? 0)} caption="Inventario" />
        <StatCard label="Pagos" value={String(summary?.payments ?? 0)} caption="Movimientos" />
        <StatCard label="Ingresos" value={formatCurrency(summary?.revenue ?? 0)} caption="Recaudación" />
      </section>

      <section className="content-grid three-column">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Ranking</p>
              <h3>Por ruta</h3>
            </div>
          </div>

          <div className="stack-list">
            {routeReport.map((item) => (
              <div className="report-row" key={item.route}>
                <div>
                  <strong>{item.route}</strong>
                  <span>{item.stops} paradas · {item.assignedBuses} buses</span>
                </div>
                <div className="report-metric">
                  <strong>{formatCurrency(item.revenue)}</strong>
                  <span>{item.payments} pagos</span>
                </div>
              </div>
            ))}
          </div>

          {!routeReport.length ? <EmptyState title="Sin datos" copy="No llegaron métricas por ruta." /> : null}
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Ranking</p>
              <h3>Por bus</h3>
            </div>
          </div>

          <div className="stack-list">
            {busReport.map((item) => (
              <div className="report-row" key={item.bus}>
                <div>
                  <strong>{item.bus}</strong>
                </div>
                <div className="report-metric">
                  <strong>{formatCurrency(item.revenue)}</strong>
                  <span>{item.payments} pagos</span>
                </div>
              </div>
            ))}
          </div>

          {!busReport.length ? <EmptyState title="Sin datos" copy="No llegaron métricas por bus." /> : null}
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Reporte</p>
              <h3>Últimos pagos</h3>
            </div>
          </div>

          <div className="stack-list">
            {(paymentReport?.content ?? []).map((payment) => (
              <div className="report-row" key={payment.id}>
                <div>
                  <strong>{payment.user}</strong>
                  <span>
                    {payment.bus} · {formatDateTime(payment.date)}
                  </span>
                </div>
                <div className="report-metric">
                  <strong>{formatCurrency(payment.amount)}</strong>
                  <span>{formatEnumLabel(payment.status)}</span>
                </div>
              </div>
            ))}
          </div>

          {!paymentReport?.content.length ? <EmptyState title="Sin pagos" copy="El reporte no devolvió transacciones." /> : null}
        </article>
      </section>
    </PageLayout>
  )
}

function OperationsMapView({
  ariaLabel,
  focusMarkers = [],
  stopMarkers = [],
  busMarkers = [],
  routePaths = [],
}: {
  ariaLabel: string
  focusMarkers?: MapMarker[]
  stopMarkers?: MapMarker[]
  busMarkers?: MapMarker[]
  routePaths?: RoutePath[]
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const overlayRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return
    }

    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: 12,
      zoomControl: true,
      scrollWheelZoom: true,
    })

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)

    const overlay = L.layerGroup().addTo(map)

    mapRef.current = map
    overlayRef.current = overlay

    return () => {
      map.remove()
      mapRef.current = null
      overlayRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const overlay = overlayRef.current

    if (!map || !overlay) {
      return
    }

    overlay.clearLayers()

    const bounds = L.latLngBounds([])

    for (const route of routePaths) {
      const points = route.points.filter(isCoordinatePair)
      if (!points.length) {
        continue
      }

      L.polyline(points, {
        color: route.color || '#0f766e',
        weight: 4,
        opacity: 0.82,
      })
        .bindPopup(route.name)
        .addTo(overlay)

      points.forEach((point) => bounds.extend(point))
    }

    for (const marker of focusMarkers) {
      if (!isCoordinatePair(marker.position)) {
        continue
      }

      L.circleMarker(marker.position, {
        radius: 8,
        weight: 2,
        color: '#ffffff',
        fillColor: '#d97706',
        fillOpacity: 0.95,
      })
        .bindPopup(`<strong>${marker.label}</strong><br/>${marker.status ?? 'Sin estado'}`)
        .addTo(overlay)

      bounds.extend(marker.position)
    }

    for (const marker of stopMarkers) {
      if (!isCoordinatePair(marker.position)) {
        continue
      }

      L.circleMarker(marker.position, {
        radius: 5,
        weight: 1,
        color: '#0f172a',
        fillColor: '#f8fafc',
        fillOpacity: 1,
      })
        .bindPopup(marker.label)
        .addTo(overlay)

      bounds.extend(marker.position)
    }

    for (const marker of busMarkers) {
      if (!isCoordinatePair(marker.position)) {
        continue
      }

      L.circleMarker(marker.position, {
        radius: 7,
        weight: 2,
        color: '#0f172a',
        fillColor: '#0f766e',
        fillOpacity: 0.9,
      })
        .bindPopup(`<strong>${marker.label}</strong><br/>${marker.status ?? 'Sin estado'}`)
        .addTo(overlay)

      bounds.extend(marker.position)
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.15))
    } else {
      map.setView(DEFAULT_CENTER, 12)
    }
  }, [busMarkers, focusMarkers, routePaths, stopMarkers])

  return <div className="leaflet-host" ref={containerRef} aria-label={ariaLabel} />
}

function StatCard({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{caption}</small>
    </article>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return <div className="error-banner">{message}</div>
}

function EmptyState({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{copy}</p>
    </div>
  )
}

function PaginationBar({ page, totalPages, totalElements, size, onPageChange }: PaginationProps) {
  if (totalPages <= 1) {
    return (
      <div className="pagination-bar">
        <span>{totalElements} resultados</span>
      </div>
    )
  }

  return (
    <div className="pagination-bar">
      <span>
        Página {page + 1} de {totalPages} · {totalElements} resultados · {size} por página
      </span>

      <div className="pagination-actions">
        <button className="ghost-button" type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 0}>
          Anterior
        </button>
        <button
          className="ghost-button"
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page + 1 >= totalPages}
        >
          Siguiente
        </button>
      </div>
    </div>
  )
}

function EnumAction<T extends string>({ value, options, actionLabel, disabled, onSubmit }: EnumActionProps<T>) {
  const [draft, setDraft] = useState(value)
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState('')

  async function handleApply() {
    setPending(true)
    setFeedback('')

    try {
      await onSubmit(draft)
      setFeedback('Actualizado')
    } catch (error) {
      setFeedback(getErrorMessage(error) || 'Error')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="inline-action">
      <select value={draft} onChange={(event) => setDraft(event.target.value as T)} disabled={disabled || pending}>
        {options.map((item) => (
          <option key={item} value={item}>
            {formatEnumLabel(item)}
          </option>
        ))}
      </select>
      <button className="ghost-button" type="button" onClick={handleApply} disabled={disabled || pending}>
        {pending ? '...' : actionLabel}
      </button>
      {feedback ? <small>{feedback}</small> : null}
    </div>
  )
}

function PasswordResetAction({
  disabled,
  onSubmit,
}: {
  disabled?: boolean
  onSubmit: (password: string) => Promise<void>
}) {
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState('')

  async function handleApply() {
    if (!password.trim()) {
      setFeedback('Escribe una clave')
      return
    }

    setPending(true)
    setFeedback('')

    try {
      await onSubmit(password.trim())
      setPassword('')
      setFeedback('Clave actualizada')
    } catch (error) {
      setFeedback(getErrorMessage(error) || 'Error')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="inline-action">
      <input
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Nueva clave"
        disabled={disabled || pending}
      />
      <button className="ghost-button" type="button" onClick={handleApply} disabled={disabled || pending}>
        {pending ? '...' : 'Reset'}
      </button>
      {feedback ? <small>{feedback}</small> : null}
    </div>
  )
}

function ReversePaymentAction({ onSubmit }: { onSubmit: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState('Cobro duplicado')
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState('')

  async function handleReverse() {
    setPending(true)
    setFeedback('')

    try {
      await onSubmit(reason)
      setFeedback('Pago revertido')
    } catch (error) {
      setFeedback(getErrorMessage(error) || 'Error')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="inline-action">
      <input value={reason} onChange={(event) => setReason(event.target.value)} disabled={pending} />
      <button className="ghost-button" type="button" onClick={handleReverse} disabled={pending}>
        {pending ? '...' : 'Revertir'}
      </button>
      {feedback ? <small>{feedback}</small> : null}
    </div>
  )
}

export default App
