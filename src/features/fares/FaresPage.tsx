import { useState } from 'react'
import { ActionModal } from '../../components/ui/ActionModal'
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable'
import { Loader } from '../../components/ui/Loader'
import { MockForm } from '../../components/ui/MockForm'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useFaresQuery } from '../../hooks/useAdminQueries'
import type { Fare } from '../../types/domain'
import { formatCurrency } from '../../utils/formatters'

export function FaresPage() {
  const { data = [], isLoading } = useFaresQuery()
  const [modal, setModal] = useState<'create' | 'configure' | null>(null)

  const columns: Array<DataTableColumn<Fare>> = [
    { key: 'name', header: 'Nombre', render: (fare) => fare.name },
    { key: 'amount', header: 'Monto', align: 'right', render: (fare) => formatCurrency(fare.amount) },
    { key: 'validity', header: 'Vigencia', render: (fare) => `${fare.validFrom} al ${fare.validTo}` },
    { key: 'status', header: 'Estado', render: (fare) => <StatusBadge status={fare.status} /> },
    {
      key: 'actions',
      header: 'Acciones',
      align: 'right',
      render: () => <button className="text-button" type="button" onClick={() => setModal('configure')}>Configurar</button>,
    },
  ]

  if (isLoading) return <Loader />

  return (
    <div className="page-stack">
      <PageHeader
        title="Tarifas"
        description="Base inicial para administrar montos, vigencias y estados de cobro."
        action={<button className="button button-primary" type="button" onClick={() => setModal('create')}>Nueva tarifa</button>}
      />
      <section className="panel">
        <DataTable columns={columns} data={data} getRowKey={(fare) => fare.id} />
      </section>

      <ActionModal
        isOpen={modal === 'create'}
        title="Nueva tarifa"
        description="Registra una tarifa mock con monto, vigencia y estado."
        onClose={() => setModal(null)}
      >
        <MockForm
          submitLabel="Guardar tarifa"
          fields={[
            { label: 'Nombre', placeholder: 'Tarifa urbana' },
            { label: 'Monto', placeholder: '4.00', type: 'number' },
            { label: 'Vigente desde', type: 'date' },
            { label: 'Vigente hasta', type: 'date' },
          ]}
          onSubmit={() => setModal(null)}
        />
      </ActionModal>

      <ActionModal
        isOpen={modal === 'configure'}
        title="Configurar tarifa"
        description="Opciones iniciales para reglas de cobro y vigencia."
        onClose={() => setModal(null)}
      >
        <div className="modal-action-list">
          <button className="modal-action" type="button">Editar monto</button>
          <button className="modal-action" type="button">Cambiar vigencia</button>
          <button className="modal-action" type="button">Desactivar tarifa</button>
        </div>
      </ActionModal>
    </div>
  )
}
