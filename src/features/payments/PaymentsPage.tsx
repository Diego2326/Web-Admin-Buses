import { useState } from 'react'
import { ActionModal } from '../../components/ui/ActionModal'
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable'
import { Loader } from '../../components/ui/Loader'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { usePaymentsQuery } from '../../hooks/useAdminQueries'
import type { Payment } from '../../types/domain'
import { formatCurrency, formatDate } from '../../utils/formatters'

const columns: Array<DataTableColumn<Payment>> = [
  { key: 'user', header: 'Usuario', render: (payment) => payment.user },
  { key: 'bus', header: 'Bus', render: (payment) => payment.bus },
  { key: 'amount', header: 'Monto', align: 'right', render: (payment) => formatCurrency(payment.amount) },
  { key: 'date', header: 'Fecha', render: (payment) => formatDate(payment.date) },
  { key: 'method', header: 'Metodo', render: (payment) => payment.method },
  { key: 'status', header: 'Estado', render: (payment) => <StatusBadge status={payment.status} /> },
]

export function PaymentsPage() {
  const { data = [], isLoading } = usePaymentsQuery()
  const [isExportOpen, setIsExportOpen] = useState(false)

  if (isLoading) return <Loader />

  return (
    <div className="page-stack">
      <PageHeader
        title="Pagos"
        description="Transacciones registradas por usuario, bus, metodo y estado."
        action={<button className="button button-secondary" type="button" onClick={() => setIsExportOpen(true)}>Exportar</button>}
      />
      <section className="panel">
        <DataTable columns={columns} data={data} getRowKey={(payment) => payment.id} />
      </section>

      <ActionModal
        isOpen={isExportOpen}
        title="Exportar pagos"
        description="Configura una exportacion mock para futura descarga desde backend."
        onClose={() => setIsExportOpen(false)}
      >
        <div className="modal-action-list">
          <button className="modal-action" type="button">Exportar pagos del dia</button>
          <button className="modal-action" type="button">Exportar pendientes</button>
          <button className="modal-action" type="button">Exportar por metodo de pago</button>
        </div>
      </ActionModal>
    </div>
  )
}
