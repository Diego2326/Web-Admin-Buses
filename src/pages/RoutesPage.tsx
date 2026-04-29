import { useEffect, useState, type FormEvent } from 'react'
import { api, type OperationalStatus, type PageResponse, type RouteDetail, type RouteSummary } from '../api'
import { CrudActionButtons, EmptyState, ErrorBanner, OperationsMapView, PageLayout, PaginationBar } from './shared'
import {
  OPERATIONAL_STATUSES,
  ROUTE_SORT,
  askOperationalStatus,
  askText,
  createStopMarker,
  formatEnumLabel,
  getErrorMessage,
  getStatusTone,
  isCoordinatePair,
  isMapMarker,
} from './utils'

type RoutesPageProps = {
  token: string
  canManage: boolean
}

export function RoutesPage({ token, canManage }: RoutesPageProps) {
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
