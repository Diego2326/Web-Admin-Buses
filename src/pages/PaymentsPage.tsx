import { useEffect, useState, type FormEvent } from 'react'
import { api, type PageResponse, type Payment, type PaymentMethod, type PaymentStatus } from '../api'
import { CrudActionButtons, EmptyState, ErrorBanner, PageLayout, PaginationBar, ReversePaymentAction } from './shared'
import {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  askEditablePaymentStatus,
  askNumber,
  askOptionalText,
  askPaymentMethod,
  askText,
  formatCurrency,
  formatDateTime,
  formatEnumLabel,
  getErrorMessage,
  getStatusTone,
} from './utils'

type PaymentsPageProps = {
  token: string
  canManage: boolean
}

export function PaymentsPage({ token, canManage }: PaymentsPageProps) {
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
              {
                label: 'Registrar pago',
                disabled: !canManage,
                variant: 'primary-button',
                onClick: () => {
                  const form = document.querySelector('.create-payment button[type=\"submit\"]') as HTMLButtonElement | null
                  form?.focus()
                },
              },
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
