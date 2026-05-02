import { useEffect, useState, type FormEvent } from 'react'
import {
  api,
  type Bus,
  type BusQrCodeResponse,
  type OperationalStatus,
  type PageResponse,
  type RouteSummary,
} from '../api'
import { CrudActionButtons, EmptyState, EnumAction, ErrorBanner, PageLayout, PaginationBar } from './shared'
import {
  OPERATIONAL_STATUSES,
  ROUTE_SORT,
  askNumber,
  askOperationalStatus,
  askOptionalText,
  askText,
  createLocalBusQr,
  formatEnumLabel,
  getErrorMessage,
  getStatusTone,
} from './utils'

type BusesPageProps = {
  token: string
  canManage: boolean
}

export function BusesPage({ token, canManage }: BusesPageProps) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<OperationalStatus | ''>('')
  const [routeId, setRouteId] = useState('')
  const [selectedBusId, setSelectedBusId] = useState('')
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
  const [qrPreview, setQrPreview] = useState<BusQrCodeResponse | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [qrNotice, setQrNotice] = useState('')
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

  useEffect(() => {
    const buses = data?.content ?? []

    if (!buses.length) {
      setSelectedBusId('')
      setQrPreview(null)
      return
    }

    if (!selectedBusId || !buses.some((bus) => bus.id === selectedBusId)) {
      setSelectedBusId(buses[0].id)
    }
  }, [data, selectedBusId])

  useEffect(() => {
    const bus = data?.content.find((item) => item.id === selectedBusId)

    if (!bus) {
      setQrPreview(null)
      setQrNotice('')
      return
    }

    const controller = new AbortController()

    void (async () => {
      setQrLoading(true)
      setQrNotice('')

      try {
        const response = await api.getBusQr(token, bus.id, controller.signal)
        setQrPreview(response)
      } catch (_error) {
        if (controller.signal.aborted) {
          return
        }

        setQrPreview(createLocalBusQr(bus))
      } finally {
        if (!controller.signal.aborted) {
          setQrLoading(false)
        }
      }
    })()

    return () => controller.abort()
  }, [data, selectedBusId, token])

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

  function handlePrintQr() {
    if (!qrPreview || !selectedBus) return

    const printWindow = window.open('', '_blank', 'width=480,height=700')
    if (!printWindow) {
      alert('El navegador bloqueó la ventana emergente. Por favor, permite las ventanas emergentes para imprimir.')
      return
    }

    function esc(value: string) {
      return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
    }

    const busCode = esc(selectedBus.code)
    const busPlate = esc(selectedBus.plate)
    const label = esc(qrPreview.routeName ?? selectedBus.route?.name ?? 'Sin ruta asignada')
    const pathLabel = esc(
      qrPreview.routeOrigin && qrPreview.routeDestination
        ? `${qrPreview.routeOrigin} → ${qrPreview.routeDestination}`
        : selectedBus.route
          ? `${selectedBus.route.origin} → ${selectedBus.route.destination}`
          : 'Unidad sin ruta asignada',
    )
    const qrSrc = esc(qrPreview.qrImageUrl)
    const busId = esc(qrPreview.busId)
    const provider = esc(qrPreview.provider)

    printWindow.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>QR Bus ${busCode}</title>
  <style>
    body { font-family: sans-serif; display: flex; justify-content: center; padding: 32px; margin: 0; background: #fff; }
    .card { width: 320px; border: 1px solid #ddd; border-radius: 12px; padding: 24px; }
    .route { font-weight: bold; font-size: 14px; margin: 0 0 2px; }
    .route-path { font-size: 12px; color: #888; margin: 0 0 12px; }
    .bus-code { font-size: 28px; font-weight: bold; margin: 8px 0 4px; }
    .plate { color: #666; font-size: 14px; margin: 0 0 12px; }
    .qr-wrap { display: flex; justify-content: center; margin: 16px 0; }
    .qr-wrap img { width: 240px; height: 240px; }
    .meta { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
    .meta div { flex: 1 1 100px; border: 1px solid #eee; border-radius: 8px; padding: 8px; }
    .meta span { display: block; font-size: 11px; color: #888; }
    .meta strong { font-size: 13px; }
    .muted { font-size: 12px; color: #888; margin-top: 12px; }
    .provider { font-size: 11px; color: #aaa; text-align: right; margin-top: 8px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="card">
    <p class="route">${label}</p>
    <p class="route-path">${pathLabel}</p>
    <p class="bus-code">${busCode}</p>
    <p class="plate">${busPlate}</p>
    <div class="qr-wrap">
      <img src="${qrSrc}" alt="QR Bus ${busCode}" />
    </div>
    <div class="meta">
      <div><span>Bus</span><strong>${busCode}</strong></div>
      <div><span>Ruta</span><strong>${label}</strong></div>
      <div><span>Código interno</span><strong>${busId}</strong></div>
    </div>
    <p class="muted">Escanea este QR desde la app móvil para reconocer la unidad, validar el código del bus y su ruta actual.</p>
    <p class="provider">Generado con ${provider}.</p>
  </div>
</body>
</html>`)
    printWindow.document.close()

    const pw = printWindow
    function doPrint() {
      pw.focus()
      pw.print()
    }

    const img = printWindow.document.querySelector('img')
    if (img) {
      if (img.complete) {
        doPrint()
      } else {
        img.onload = doPrint
        img.onerror = doPrint
      }
    } else {
      doPrint()
    }
  }

  const selectedBus = data?.content.find((bus) => bus.id === selectedBusId) ?? null
  const routeLabel = qrPreview?.routeName ?? selectedBus?.route?.name ?? 'Sin ruta asignada'
  const routePathLabel =
    qrPreview?.routeOrigin && qrPreview?.routeDestination
      ? `${qrPreview.routeOrigin} -> ${qrPreview.routeDestination}`
      : selectedBus?.route
        ? `${selectedBus.route.origin} -> ${selectedBus.route.destination}`
        : 'Unidad sin ruta asignada'

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
            actions={[{ label: 'Crear bus', disabled: !canManage, variant: 'primary-button', onClick: handleCreateBus }]}
          />
        </div>
      }
    >
      {error ? <ErrorBanner message={error} /> : null}

      <section className="content-grid two-column bus-qr-layout">
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
                  <th>QR</th>
                  {canManage ? <th>Acción</th> : null}
                </tr>
              </thead>
              <tbody>
                {data?.content.map((bus) => (
                  <tr className={selectedBusId === bus.id ? 'stop-row is-selected' : undefined} key={bus.id}>
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
                    <td>
                      <button
                        className={selectedBusId === bus.id ? 'primary-button' : 'ghost-button'}
                        type="button"
                        onClick={() => setSelectedBusId(bus.id)}
                      >
                        {selectedBusId === bus.id ? 'Mostrando' : 'Ver QR'}
                      </button>
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

        <article className="panel bus-qr-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Escaneo móvil</p>
              <h3>QR del bus</h3>
            </div>
            <span className="soft-pill">{selectedBus?.code ?? 'Sin selección'}</span>
          </div>

          {qrNotice ? <div className="success-copy bus-qr-notice">{qrNotice}</div> : null}

          {!selectedBus ? (
            <EmptyState title="Selecciona un bus" copy="Elige una unidad del listado para generar su QR." />
          ) : null}

          {selectedBus && qrLoading ? <EmptyState title="Generando QR" copy="Preparando la tarjeta para escaneo móvil." /> : null}

          {selectedBus && qrPreview && !qrLoading ? (
            <div className="bus-qr-card">
              <div className="bus-qr-banner">
                <span className="bus-qr-route-pill">{routeLabel}</span>
                <span className={`badge ${getStatusTone(selectedBus.status)}`}>{formatEnumLabel(selectedBus.status)}</span>
              </div>

              <div className="bus-qr-hero">
                <div>
                  <p className="eyebrow">Unidad identificada</p>
                  <h3>{selectedBus.code}</h3>
                  <p>{selectedBus.plate}</p>
                </div>
                <div className="bus-qr-code-chip">{selectedBus.code}</div>
              </div>

              <div className="bus-qr-route">
                <strong>{routeLabel}</strong>
                <span>{routePathLabel}</span>
              </div>

              <div className="bus-qr-frame">
                <div className="bus-qr-image-wrap">
                  <img src={qrPreview.qrImageUrl} alt={`Código QR del bus ${selectedBus.code}`} />
                </div>
              </div>

              <div className="bus-qr-meta">
                <div>
                  <span>Bus</span>
                  <strong>{selectedBus.code}</strong>
                </div>
                <div>
                  <span>Ruta</span>
                  <strong>{routeLabel}</strong>
                </div>
                <div>
                  <span>Código interno</span>
                  <strong>{qrPreview.busId}</strong>
                </div>
              </div>

              <p className="muted-copy">
                Escanea este QR desde la app móvil para reconocer la unidad, validar el código del bus y su ruta actual.
              </p>
              <p className="bus-qr-provider">Generado con {qrPreview.provider}.</p>
              <button className="primary-button bus-qr-print-btn" type="button" onClick={handlePrintQr}>
                Guardar / Imprimir
              </button>
            </div>
          ) : null}
        </article>
      </section>
    </PageLayout>
  )
}
