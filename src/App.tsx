import * as L from 'leaflet'
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import 'leaflet/dist/leaflet.css'
import './App.css'

type BusStatus = 'En ruta' | 'Demorado' | 'Mantenimiento'
type PageId = 'home' | 'fleet' | 'routes' | 'finances' | 'drivers' | 'settings'

type Bus = {
  id: string
  plate: string
  route: string
  driver: string
  status: BusStatus
  riders: number
  capacity: number
  income: number
  lastStop: string
  speed: number
}

type Financials = {
  dailyRevenue: number
  activeBuses: number
  passengers: number
  trips: number
  cardRevenue: number
  cashRevenue: number
  pendingSettlements: number
}

type NavItem = {
  id: PageId
  label: string
  title: string
}

type RoutePlan = {
  name: string
  start: string
  end: string
  stops: number
  frequency: string
  status: string
  fare: number
}

type Driver = {
  name: string
  unit: string
  plate: string
  route: string
  status: string
  lastTrip: string
}

type SettingGroup = {
  title: string
  description: string
  value: string
}

const initialFleet: Bus[] = [
  {
    id: 'BUS-102',
    plate: 'C 102 BAA',
    route: 'Ruta 12 Centro',
    driver: 'M. Garcia',
    status: 'En ruta',
    riders: 42,
    capacity: 55,
    income: 1280,
    lastStop: 'Parada Central',
    speed: 34,
  },
  {
    id: 'BUS-118',
    plate: 'C 118 BBA',
    route: 'Ruta 06 Norte',
    driver: 'A. Lopez',
    status: 'En ruta',
    riders: 0,
    capacity: 50,
    income: 960,
    lastStop: 'Terminal Norte',
    speed: 29,
  },
  {
    id: 'BUS-124',
    plate: 'C 124 BCA',
    route: 'Ruta 18 Express',
    driver: 'R. Mejia',
    status: 'Demorado',
    riders: 48,
    capacity: 60,
    income: 1515,
    lastStop: 'Mercado Municipal',
    speed: 14,
  },
  {
    id: 'BUS-131',
    plate: 'C 131 BDA',
    route: 'Ruta 03 Sur',
    driver: 'C. Perez',
    status: 'En ruta',
    riders: 0,
    capacity: 48,
    income: 745,
    lastStop: 'Zona Industrial',
    speed: 31,
  },
  {
    id: 'BUS-140',
    plate: 'C 140 BEA',
    route: 'Ruta 22 Oeste',
    driver: 'L. Torres',
    status: 'Mantenimiento',
    riders: 0,
    capacity: 52,
    income: 0,
    lastStop: 'Patio 2',
    speed: 0,
  },
]

const navItems: NavItem[] = [
  { id: 'home', label: 'Pagina Principal', title: 'Sistema de buses publicos' },
  { id: 'fleet', label: 'Flota', title: 'Control de flota' },
  { id: 'routes', label: 'Rutas', title: 'Gestion de rutas' },
  { id: 'finances', label: 'Finanzas', title: 'Finanzas y liquidaciones' },
  { id: 'drivers', label: 'Conductores', title: 'Conductores' },
  { id: 'settings', label: 'Configuracion', title: 'Configuracion general' },
]

const routePlans: RoutePlan[] = [
  {
    name: 'Ruta 12 Centro',
    start: 'Terminal Oriente',
    end: 'Parada Central',
    stops: 18,
    frequency: 'Cada 12 min',
    status: 'Alta demanda',
    fare: 5,
  },
  {
    name: 'Ruta 06 Norte',
    start: 'Terminal Norte',
    end: 'Hospital Regional',
    stops: 14,
    frequency: 'Cada 15 min',
    status: 'Normal',
    fare: 4,
  },
  {
    name: 'Ruta 18 Express',
    start: 'Mercado Municipal',
    end: 'Zona Industrial',
    stops: 9,
    frequency: 'Cada 10 min',
    status: 'Demoras',
    fare: 6,
  },
  {
    name: 'Ruta 03 Sur',
    start: 'Calzada Sur',
    end: 'Terminal Centro',
    stops: 16,
    frequency: 'Cada 18 min',
    status: 'Normal',
    fare: 4,
  },
  {
    name: 'Ruta 22 Oeste',
    start: 'Patio 2',
    end: 'Colonia La Reforma',
    stops: 12,
    frequency: 'Suspendida',
    status: 'Mantenimiento',
    fare: 5,
  },
]

const drivers: Driver[] = [
  {
    name: 'M. Garcia',
    unit: 'BUS-102',
    plate: 'C 102 BAA',
    route: 'Ruta 12 Centro',
    status: 'Activa',
    lastTrip: 'Hoy 07:42',
  },
  {
    name: 'A. Lopez',
    unit: 'BUS-118',
    plate: 'C 118 BBA',
    route: 'Ruta 06 Norte',
    status: 'Activa',
    lastTrip: 'Hoy 06:18',
  },
  {
    name: 'R. Mejia',
    unit: 'BUS-124',
    plate: 'C 124 BCA',
    route: 'Ruta 18 Express',
    status: 'En ruta',
    lastTrip: 'Hoy 06:55',
  },
  {
    name: 'C. Perez',
    unit: 'BUS-131',
    plate: 'C 131 BDA',
    route: 'Ruta 03 Sur',
    status: 'Activa',
    lastTrip: 'Ayer 18:05',
  },
  {
    name: 'L. Torres',
    unit: 'BUS-140',
    plate: 'C 140 BEA',
    route: 'Ruta 22 Oeste',
    status: 'Mantenimiento',
    lastTrip: 'Sin salida',
  },
]

const settingGroups: SettingGroup[] = [
  {
    title: 'Tarifa base',
    description: 'Monto usado para reportes de viajes urbanos.',
    value: 'Q4.00',
  },
  {
    title: 'Corte de liquidacion',
    description: 'Hora limite para cerrar ingresos diarios.',
    value: '20:00',
  },
  {
    title: 'Alertas de demora',
    description: 'Tiempo maximo antes de marcar una ruta como demorada.',
    value: '12 min',
  },
  {
    title: 'Zona operativa',
    description: 'Centro del mapa y reportes de ubicacion.',
    value: 'Zacapa',
  },
]

const zacapaCenter: L.LatLngExpression = [14.9722, -89.5306]

const currency = new Intl.NumberFormat('es-GT', {
  style: 'currency',
  currency: 'GTQ',
  maximumFractionDigits: 0,
})

const timeFormatter = new Intl.DateTimeFormat('es-GT', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

function getStatusClass(status: BusStatus) {
  if (status === 'Demorado') return 'warning'
  if (status === 'Mantenimiento') return 'muted'
  return 'success'
}

function getOccupancyLabel(bus: Bus) {
  return bus.riders > 0 ? 'Lleno' : 'Cupo disponible'
}

function getPageTitle(activePage: PageId) {
  return navItems.find((item) => item.id === activePage)?.title ?? navItems[0].title
}

function ZacapaMap() {
  const mapElementRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!mapElementRef.current) {
      return
    }

    const map = L.map(mapElementRef.current, {
      center: zacapaCenter,
      zoom: 14,
      scrollWheelZoom: true,
    })

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)

    return () => {
      map.remove()
    }
  }, [])

  return <div className="leaflet-map" ref={mapElementRef} aria-label="Mapa movible de Zacapa" />
}

function SummaryGrid({ financials, fleet }: { financials: Financials; fleet: Bus[] }) {
  return (
    <section className="summary-grid" aria-label="Resumen operativo">
      <article className="metric">
        <span>Ingresos de hoy</span>
        <strong>{currency.format(financials.dailyRevenue)}</strong>
        <small>+8.4% contra ayer</small>
      </article>
      <article className="metric">
        <span>Buses activos</span>
        <strong>
          {financials.activeBuses}/{fleet.length}
        </strong>
        <small>1 unidad en mantenimiento</small>
      </article>
      <article className="metric">
        <span>Pasajeros actuales</span>
        <strong>{financials.passengers}</strong>
        <small>{financials.trips} viajes registrados</small>
      </article>
    </section>
  )
}

function FleetTable({ fleet }: { fleet: Bus[] }) {
  return (
    <div className="fleet-table-wrap">
      <table className="fleet-table">
        <thead>
          <tr>
            <th>Unidad</th>
            <th>Placa</th>
            <th>Ruta</th>
            <th>Conductor</th>
            <th>Estado</th>
            <th>Ocupacion</th>
            <th>Velocidad</th>
            <th>Ingreso</th>
            <th>Ultima parada</th>
          </tr>
        </thead>
        <tbody>
          {fleet.map((bus) => (
            <tr key={bus.id}>
              <td>{bus.id}</td>
              <td>{bus.plate}</td>
              <td>{bus.route}</td>
              <td>{bus.driver}</td>
              <td>
                <span className={`status ${getStatusClass(bus.status)}`}>{bus.status}</span>
              </td>
              <td>{getOccupancyLabel(bus)}</td>
              <td>{bus.speed} km/h</td>
              <td>{currency.format(bus.income)}</td>
              <td>{bus.lastStop}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PageIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children: ReactNode
}) {
  return (
    <section className="page-intro">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      <p>{children}</p>
    </section>
  )
}

function FinancePanel({ financials }: { financials: Financials }) {
  return (
    <aside className="finance-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Finanzas</p>
          <h2>Ingresos</h2>
        </div>
      </div>

      <dl className="finance-list">
        <div>
          <dt>Pago con tarjeta</dt>
          <dd>{currency.format(financials.cardRevenue)}</dd>
        </div>
        <div>
          <dt>Efectivo reportado</dt>
          <dd>{currency.format(financials.cashRevenue)}</dd>
        </div>
        <div>
          <dt>Por liquidar</dt>
          <dd>{currency.format(financials.pendingSettlements)}</dd>
        </div>
      </dl>

      <IncomeBars />
    </aside>
  )
}

function IncomeBars() {
  return (
    <div className="income-bars" aria-label="Ingresos por franja horaria">
      <div style={{ height: '42%' }}><span>6</span></div>
      <div style={{ height: '64%' }}><span>8</span></div>
      <div style={{ height: '78%' }}><span>10</span></div>
      <div style={{ height: '55%' }}><span>12</span></div>
      <div style={{ height: '88%' }}><span>14</span></div>
      <div style={{ height: '72%' }}><span>16</span></div>
    </div>
  )
}

function HomePage({ financials, fleet }: { financials: Financials; fleet: Bus[] }) {
  return (
    <>
      <SummaryGrid financials={financials} fleet={fleet} />

      <section className="main-grid">
        <div className="map-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Ubicacion</p>
              <h2>Mapa</h2>
            </div>
            <span className="pill success">{financials.activeBuses} operativos</span>
          </div>

          <ZacapaMap />
        </div>

        <FinancePanel financials={financials} />
      </section>

      <section className="fleet-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Control de flota</p>
            <h2>Unidades registradas</h2>
          </div>
          <span className="pill neutral">{fleet.length} buses</span>
        </div>

        <FleetTable fleet={fleet} />
      </section>
    </>
  )
}

function FleetPage({ fleet }: { fleet: Bus[] }) {
  const active = fleet.filter((bus) => bus.status === 'En ruta').length
  const delayed = fleet.filter((bus) => bus.status === 'Demorado').length
  const maintenance = fleet.filter((bus) => bus.status === 'Mantenimiento').length

  return (
    <div className="page-stack">
      <PageIntro eyebrow="Flota" title="Unidades y asignaciones">
        Revisa el estado de cada bus, su conductor asignado, ocupacion y ultima parada registrada.
      </PageIntro>

      <section className="summary-grid" aria-label="Resumen de flota">
        <article className="metric">
          <span>En ruta</span>
          <strong>{active}</strong>
          <small>Unidades prestando servicio</small>
        </article>
        <article className="metric">
          <span>Con demora</span>
          <strong>{delayed}</strong>
          <small>Requieren seguimiento</small>
        </article>
        <article className="metric">
          <span>Mantenimiento</span>
          <strong>{maintenance}</strong>
          <small>Fuera de operacion</small>
        </article>
      </section>

      <section className="page-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Inventario</p>
            <h2>Flota completa</h2>
          </div>
          <span className="pill neutral">{fleet.length} buses</span>
        </div>

        <FleetTable fleet={fleet} />
      </section>
    </div>
  )
}

function RoutesPage({ fleet }: { fleet: Bus[] }) {
  return (
    <div className="page-stack">
      <PageIntro eyebrow="Rutas" title="Cobertura operativa">
        Consulta frecuencias, paradas y unidades asignadas por corredor.
      </PageIntro>

      <section className="route-grid" aria-label="Listado de rutas">
        {routePlans.map((route) => {
          const assignedBuses = fleet.filter((bus) => bus.route === route.name)
          const activeAssigned = assignedBuses.filter((bus) => bus.status !== 'Mantenimiento').length

          return (
            <article className="route-card" key={route.name}>
              <div className="route-card-header">
                <div>
                  <p className="eyebrow">{route.frequency}</p>
                  <h2>{route.name}</h2>
                </div>
                <span className={`pill ${route.status === 'Demoras' ? 'warning' : 'neutral'}`}>
                  {route.status}
                </span>
              </div>

              <dl className="detail-list">
                <div>
                  <dt>Inicio</dt>
                  <dd>{route.start}</dd>
                </div>
                <div>
                  <dt>Destino</dt>
                  <dd>{route.end}</dd>
                </div>
                <div>
                  <dt>Paradas</dt>
                  <dd>{route.stops}</dd>
                </div>
                <div>
                  <dt>Tarifa</dt>
                  <dd>{currency.format(route.fare)}</dd>
                </div>
                <div>
                  <dt>Buses activos</dt>
                  <dd>{activeAssigned}/{assignedBuses.length || 1}</dd>
                </div>
              </dl>
            </article>
          )
        })}
      </section>
    </div>
  )
}

function FinancesPage({ financials, fleet }: { financials: Financials; fleet: Bus[] }) {
  const averagePerBus = financials.activeBuses > 0 ? financials.dailyRevenue / financials.activeBuses : 0

  return (
    <div className="page-stack">
      <PageIntro eyebrow="Finanzas" title="Ingresos y liquidaciones">
        Revisa pagos por metodo, ingresos por unidad y montos pendientes de cierre.
      </PageIntro>

      <section className="summary-grid" aria-label="Resumen financiero">
        <article className="metric">
          <span>Ingreso total</span>
          <strong>{currency.format(financials.dailyRevenue)}</strong>
          <small>{financials.trips} viajes reportados</small>
        </article>
        <article className="metric">
          <span>Promedio por bus</span>
          <strong>{currency.format(averagePerBus)}</strong>
          <small>Sobre unidades operativas</small>
        </article>
        <article className="metric">
          <span>Pendiente por liquidar</span>
          <strong>{currency.format(financials.pendingSettlements)}</strong>
          <small>Cierre a las 20:00</small>
        </article>
      </section>

      <section className="finance-layout">
        <FinancePanel financials={financials} />

        <div className="page-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Por unidad</p>
              <h2>Ingresos reportados</h2>
            </div>
          </div>

          <div className="fleet-table-wrap">
            <table className="fleet-table compact-table">
              <thead>
                <tr>
                  <th>Unidad</th>
                  <th>Placa</th>
                  <th>Ruta</th>
                  <th>Metodo principal</th>
                  <th>Ingreso</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {fleet.map((bus, index) => (
                  <tr key={bus.id}>
                    <td>{bus.id}</td>
                    <td>{bus.plate}</td>
                    <td>{bus.route}</td>
                    <td>{index % 2 === 0 ? 'Tarjeta' : 'Efectivo'}</td>
                    <td>{currency.format(bus.income)}</td>
                    <td>
                      <span className={`status ${getStatusClass(bus.status)}`}>{bus.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}

function DriversPage() {
  const availableDrivers = drivers.filter((driver) => driver.status !== 'Mantenimiento').length
  const maintenanceDrivers = drivers.length - availableDrivers

  return (
    <div className="page-stack">
      <PageIntro eyebrow="Conductores" title="Choferes asignados">
        Revisa conductores, unidades asignadas, ruta actual y ultimo viaje registrado.
      </PageIntro>

      <section className="drivers-grid" aria-label="Resumen de conductores">
        <article className="metric">
          <span>Conductores disponibles</span>
          <strong>{availableDrivers}</strong>
          <small>Asignados a rutas activas</small>
        </article>
        <article className="metric">
          <span>En mantenimiento</span>
          <strong>{maintenanceDrivers}</strong>
          <small>Unidad fuera de servicio</small>
        </article>
      </section>

      <section className="page-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Directorio</p>
            <h2>Conductores registrados</h2>
          </div>
          <button className="primary-button inline-button" type="button">Nuevo conductor</button>
        </div>

        <div className="driver-list">
          {drivers.map((driver) => (
            <article className="driver-row" key={driver.name}>
              <div>
                <strong>{driver.name}</strong>
                <span>{driver.unit} - {driver.plate}</span>
              </div>
              <div>
                <span>{driver.route}</span>
                <small>{driver.lastTrip}</small>
              </div>
              <span className={`status ${driver.status === 'Mantenimiento' ? 'muted' : 'success'}`}>
                {driver.status}
              </span>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function SettingsPage() {
  return (
    <div className="page-stack">
      <PageIntro eyebrow="Configuracion" title="Preferencias del sistema">
        Ajusta parametros operativos usados por rutas, pagos y alertas.
      </PageIntro>

      <section className="settings-grid" aria-label="Configuraciones">
        {settingGroups.map((setting) => (
          <article className="setting-row" key={setting.title}>
            <div>
              <h2>{setting.title}</h2>
              <p>{setting.description}</p>
            </div>
            <strong>{setting.value}</strong>
          </article>
        ))}
      </section>

      <section className="page-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Seguridad</p>
            <h2>Sesion administrativa</h2>
          </div>
        </div>

        <div className="settings-actions">
          <button className="primary-button" type="button">Guardar cambios</button>
          <button className="secondary-button" type="button">Restablecer valores</button>
        </div>
      </section>
    </div>
  )
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [activePage, setActivePage] = useState<PageId>('home')
  const fleet = initialFleet
  const currentTime = useMemo(() => new Date(), [])

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (username.trim() === 'admin' && password === 'password123') {
      setIsAuthenticated(true)
      setLoginError('')
      setPassword('')
      return
    }

    setLoginError('Usuario o contrasena incorrectos.')
  }

  const financials = useMemo<Financials>(() => {
    const dailyRevenue = fleet.reduce((total, bus) => total + bus.income, 0)
    const activeBuses = fleet.filter((bus) => bus.status !== 'Mantenimiento').length
    const passengers = fleet.reduce((total, bus) => total + bus.riders, 0)
    const trips = 184

    return {
      dailyRevenue,
      activeBuses,
      passengers,
      trips,
      cardRevenue: Math.round(dailyRevenue * 0.72),
      cashRevenue: Math.round(dailyRevenue * 0.28),
      pendingSettlements: 1860,
    }
  }, [fleet])

  if (!isAuthenticated) {
    return (
      <main className="login-page">
        <section className="login-card" aria-labelledby="login-title">
          <p className="eyebrow">Acceso administrador</p>
          <h1 id="login-title">Panel de buses publicos</h1>
          <p className="login-copy">Ingresa con tu cuenta para revisar pagos, flota y ubicaciones registradas.</p>

          <form className="login-form" onSubmit={handleLogin}>
            <label htmlFor="username">Usuario</label>
            <input
              id="username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Usuario"
            />

            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Contraseña"
            />

            {loginError && <p className="login-error">{loginError}</p>}

            <button className="primary-button" type="submit">Ingresar</button>
          </form>
        </section>
      </main>
    )
  }

  return (
    <main className="dashboard">
      <header className="topbar">
        <div>
          <p className="eyebrow">Panel de administrador</p>
          <h1>{getPageTitle(activePage)}</h1>
        </div>
        <div className="live-clock" aria-live="polite">
          <span className="live-dot"></span>
          Datos cargados {timeFormatter.format(currentTime)}
        </div>
      </header>

      <div className="nav-bar">
        <nav className="topbar-nav" aria-label="Navegacion principal">
          {navItems.map((item) => (
            <button
              className={activePage === item.id ? 'active' : undefined}
              type="button"
              aria-current={activePage === item.id ? 'page' : undefined}
              key={item.id}
              onClick={() => setActivePage(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <button className="secondary-button" type="button" onClick={() => setIsAuthenticated(false)}>
          Cerrar sesion
        </button>
      </div>

      {activePage === 'home' && <HomePage financials={financials} fleet={fleet} />}
      {activePage === 'fleet' && <FleetPage fleet={fleet} />}
      {activePage === 'routes' && <RoutesPage fleet={fleet} />}
      {activePage === 'finances' && <FinancesPage financials={financials} fleet={fleet} />}
      {activePage === 'drivers' && <DriversPage />}
      {activePage === 'settings' && <SettingsPage />}
    </main>
  )
}

export default App
