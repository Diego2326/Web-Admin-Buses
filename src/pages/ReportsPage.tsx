import { useEffect, useState, type FormEvent } from 'react'
import {
  api,
  type BusReport,
  type PageResponse,
  type Payment,
  type PaymentMethod,
  type PaymentStatus,
  type RouteReport,
  type SummaryReport,
} from '../api'
import { EmptyState, ErrorBanner, PageLayout, StatCard } from './shared'
import { formatCurrency, formatDateTime, formatEnumLabel, getErrorMessage } from './utils'

type ReportsPageProps = {
  token: string
}

export function ReportsPage({ token }: ReportsPageProps) {
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
