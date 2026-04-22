import { EmptyState } from '../../components/ui/EmptyState'
import { Loader } from '../../components/ui/Loader'
import { OperationsMap } from '../../components/ui/OperationsMap'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatCard } from '../../components/ui/StatCard'
import { useDashboardQuery, usePaymentsQuery } from '../../hooks/useAdminQueries'
import { formatCurrency, formatDate } from '../../utils/formatters'

export function DashboardPage() {
  const dashboardQuery = useDashboardQuery()
  const paymentsQuery = usePaymentsQuery()

  if (dashboardQuery.isLoading || paymentsQuery.isLoading) {
    return <Loader />
  }

  if (!dashboardQuery.data) {
    return <EmptyState title="Dashboard no disponible" description="No se pudieron cargar las metricas operativas." />
  }

  const { metrics, mapMarkers } = dashboardQuery.data
  const recentPayments = paymentsQuery.data?.slice(0, 4) ?? []

  return (
    <div className="page-stack">
      <PageHeader
        title="Resumen del sistema"
        description="Monitoreo inicial para flota, rutas, pagos e ingresos del dia."
      />

      <section className="stat-grid" aria-label="Metricas principales">
        <StatCard label="Buses activos" value={metrics.activeBuses} helper="Unidades prestando servicio" />
        <StatCard label="Rutas registradas" value={metrics.registeredRoutes} helper="Corredores administrados" />
        <StatCard label="Pagos del dia" value={metrics.paymentsToday} helper="Transacciones mock" />
        <StatCard label="Ingresos del dia" value={formatCurrency(metrics.revenueToday)} helper="Pagos completados" />
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Monitoreo</span>
              <h2>Mapa operativo</h2>
            </div>
          </div>
          <OperationsMap markers={mapMarkers} ariaLabel="Mapa operativo de buses" />
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Pagos</span>
              <h2>Actividad reciente</h2>
            </div>
          </div>
          <div className="activity-list">
            {recentPayments.map((payment) => (
              <div className="activity-row" key={payment.id}>
                <div>
                  <strong>{payment.user}</strong>
                  <span>{payment.bus} - {payment.method}</span>
                </div>
                <div>
                  <strong>{formatCurrency(payment.amount)}</strong>
                  <span>{formatDate(payment.date)}</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}
