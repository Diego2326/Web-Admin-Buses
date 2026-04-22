import { useState } from 'react'
import { ActionModal } from '../../components/ui/ActionModal'
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable'
import { Loader } from '../../components/ui/Loader'
import { MockForm } from '../../components/ui/MockForm'
import { OperationsMap } from '../../components/ui/OperationsMap'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useOperationsMapQuery, useStopsQuery } from '../../hooks/useAdminQueries'
import type { BusStop } from '../../types/domain'

export function StopsPage() {
  const { data = [], isLoading } = useStopsQuery()
  const mapQuery = useOperationsMapQuery()
  const [modal, setModal] = useState<'create' | 'manage' | null>(null)

  const columns: Array<DataTableColumn<BusStop>> = [
    { key: 'code', header: 'Codigo', render: (stop) => stop.code },
    { key: 'name', header: 'Parada', render: (stop) => stop.name },
    { key: 'address', header: 'Ubicacion', render: (stop) => stop.address },
    { key: 'status', header: 'Estado', render: (stop) => <StatusBadge status={stop.status} /> },
    {
      key: 'actions',
      header: 'Acciones',
      align: 'right',
      render: () => <button className="text-button" type="button" onClick={() => setModal('manage')}>Gestionar</button>,
    },
  ]

  if (isLoading || mapQuery.isLoading) return <Loader />

  return (
    <div className="page-stack">
      <PageHeader
        title="Paradas"
        description="Registro maestro de paradas. Luego se seleccionan y ordenan al crear una ruta."
        action={<button className="button button-primary" type="button" onClick={() => setModal('create')}>Nueva parada</button>}
      />

      <section className="management-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Catalogo</span>
              <h2>Paradas registradas</h2>
            </div>
          </div>
          <DataTable columns={columns} data={data} getRowKey={(stop) => stop.id} />
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Mapa</span>
              <h2>Ubicacion de paradas</h2>
            </div>
          </div>
          <OperationsMap
            markers={mapQuery.data?.stopMarkers}
            ariaLabel="Mapa de paradas registradas"
          />
        </article>
      </section>

      <ActionModal
        isOpen={modal === 'create'}
        title="Nueva parada"
        description="Registra una parada independiente con codigo, nombre y ubicacion."
        onClose={() => setModal(null)}
      >
        <MockForm
          submitLabel="Guardar parada"
          fields={[
            { label: 'Codigo', placeholder: 'P-009' },
            { label: 'Nombre', placeholder: 'Plaza Comercial' },
            { label: 'Direccion', placeholder: 'Avenida principal' },
            { label: 'Latitud', placeholder: '14.9700', type: 'number' },
            { label: 'Longitud', placeholder: '-89.5300', type: 'number' },
            { label: 'Estado', placeholder: 'Activo' },
          ]}
          onSubmit={() => setModal(null)}
        />
      </ActionModal>

      <ActionModal
        isOpen={modal === 'manage'}
        title="Gestionar parada"
        description="Acciones mock para ajustar ubicacion o estado de una parada."
        onClose={() => setModal(null)}
      >
        <div className="modal-action-list">
          <button className="modal-action" type="button">Editar ubicacion</button>
          <button className="modal-action" type="button">Actualizar codigo o nombre</button>
          <button className="modal-action" type="button">Suspender parada</button>
        </div>
      </ActionModal>
    </div>
  )
}
