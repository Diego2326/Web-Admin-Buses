import { useEffect, useState, type FormEvent } from 'react'
import { api, type Fare, type OperationalStatus, type PageResponse } from '../api'
import { CrudActionButtons, EmptyState, ErrorBanner, PageLayout, PaginationBar } from './shared'
import {
  OPERATIONAL_STATUSES,
  askNumber,
  askOperationalStatus,
  askText,
  formatCurrency,
  formatDate,
  formatEnumLabel,
  getErrorMessage,
  getStatusTone,
} from './utils'

type FaresPageProps = {
  token: string
  canManage: boolean
}

export function FaresPage({ token, canManage }: FaresPageProps) {
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
