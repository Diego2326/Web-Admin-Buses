import * as L from 'leaflet'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import 'leaflet/dist/leaflet.css'
import './App.css'

type BusStatus = 'En ruta' | 'Demorado' | 'Mantenimiento'

type Bus = {
  id: string
  route: string
  driver: string
  status: BusStatus
  riders: number
  capacity: number
  income: number
  lastStop: string
  speed: number
}

const initialFleet: Bus[] = [
  {
    id: 'BUS-102',
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
  return bus.riders > 0 ? 'Lleno' : 'Vacio'
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

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
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

  const financials = useMemo(() => {
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
          <h1>Pagos de buses publicos</h1>
        </div>
        <div className="live-clock" aria-live="polite">
          <span className="live-dot"></span>
          Datos cargados {timeFormatter.format(currentTime)}
        </div>
      </header>

      <div className="nav-bar">
        <nav className="topbar-nav" aria-label="Navegacion principal">
          <button className="active" type="button" aria-current="page">Pagina Principal</button>
          <button type="button">Flota</button>
          <button type="button">Rutas</button>
          <button type="button">Finanzas</button>
          <button type="button">Usuarios</button>
          <button type="button">Configuracion</button>
        </nav>
        <button className="secondary-button" type="button" onClick={() => setIsAuthenticated(false)}>
          Cerrar sesion
        </button>
      </div>

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

          <div className="income-bars" aria-label="Ingresos por franja horaria">
            <div style={{ height: '42%' }}><span>6</span></div>
            <div style={{ height: '64%' }}><span>8</span></div>
            <div style={{ height: '78%' }}><span>10</span></div>
            <div style={{ height: '55%' }}><span>12</span></div>
            <div style={{ height: '88%' }}><span>14</span></div>
            <div style={{ height: '72%' }}><span>16</span></div>
          </div>
        </aside>
      </section>

      <section className="fleet-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Control de flota</p>
            <h2>Unidades registradas</h2>
          </div>
          <span className="pill neutral">{fleet.length} buses</span>
        </div>

        <div className="fleet-table-wrap">
          <table className="fleet-table">
            <thead>
              <tr>
                <th>Unidad</th>
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
      </section>
    </main>
  )
}

export default App
