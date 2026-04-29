import { useEffect, useState } from 'react'
import { api, type DashboardResponse, type OperationsMapResponse } from '../api'
import { ErrorBanner, EmptyState, OperationsMapView, PageLayout, StatCard } from './shared'
import { formatCurrency, getErrorMessage } from './utils'

type DashboardPageProps = {
  token: string
}

export function DashboardPage({ token }: DashboardPageProps) {
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
    <PageLayout title="Dashboard operativo" copy="Monitoreo general de flota, cobertura y actividad diaria.">
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
