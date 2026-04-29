import { useEffect, useState, type FormEvent } from 'react'
import { api, type OperationalStatus, type PageResponse, type Stop } from '../api'
import { CrudActionButtons, EmptyState, ErrorBanner, OperationsMapView, PageLayout, PaginationBar } from './shared'
import {
  OPERATIONAL_STATUSES,
  askNumber,
  askOperationalStatus,
  askText,
  createStopMarker,
  formatEnumLabel,
  getCoordinatePosition,
  getErrorMessage,
  getPositionLabel,
  getStatusTone,
  isMapMarker,
} from './utils'

type StopsPageProps = {
  token: string
  canManage: boolean
}

export function StopsPage({ token, canManage }: StopsPageProps) {
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
