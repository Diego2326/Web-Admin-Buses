import { useState } from 'react'
import { ActionModal } from '../../components/ui/ActionModal'
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable'
import { Loader } from '../../components/ui/Loader'
import { MockForm } from '../../components/ui/MockForm'
import { OperationsMap } from '../../components/ui/OperationsMap'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useBusesQuery, useOperationsMapQuery } from '../../hooks/useAdminQueries'
import type { Bus } from '../../types/domain'

export function BusesPage() {
  const { data = [], isLoading } = useBusesQuery()
  const mapQuery = useOperationsMapQuery()
  const [modal, setModal] = useState<'create' | 'detail' | null>(null)

  const columns: Array<DataTableColumn<Bus>> = [
    { key: 'code', header: 'Codigo', render: (bus) => bus.code },
    { key: 'plate', header: 'Placa', render: (bus) => bus.plate },
    { key: 'route', header: 'Ruta asignada', render: (bus) => bus.route.name },
    { key: 'capacity', header: 'Capacidad', align: 'right', render: (bus) => bus.capacity },
    { key: 'status', header: 'Estado', render: (bus) => <StatusBadge status={bus.status} /> },
    {
      key: 'actions',
      header: 'Acciones',
      align: 'right',
      render: () => <button className="text-button" type="button" onClick={() => setModal('detail')}>Ver detalle</button>,
    },
  ]

  if (isLoading || mapQuery.isLoading) return <Loader />

  return (
    <div className="page-stack">
      <PageHeader
        title="Buses"
        description="Inventario base de unidades, placas, capacidad y ruta asignada."
        action={<button className="button button-primary" type="button" onClick={() => setModal('create')}>Nuevo bus</button>}
      />

      <section className="management-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Flota</span>
              <h2>Unidades registradas</h2>
            </div>
          </div>
          <DataTable columns={columns} data={data} getRowKey={(bus) => bus.id} />
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Ubicacion</span>
              <h2>Buses en mapa</h2>
            </div>
          </div>
          <OperationsMap
            markers={mapQuery.data?.mapMarkers}
            ariaLabel="Mapa de buses registrados"
          />
        </article>
      </section>

      <ActionModal
        isOpen={modal === 'create'}
        title="Nuevo bus"
        description="Formulario mock para registrar una unidad antes de conectar la API."
        onClose={() => setModal(null)}
      >
        <MockForm
          submitLabel="Guardar bus"
          fields={[
            { label: 'Codigo', placeholder: 'BUS-150' },
            { label: 'Placa', placeholder: 'C 150 BFA' },
            { label: 'Capacidad', placeholder: '55', type: 'number' },
            { label: 'Ruta asignada', placeholder: 'Ruta 12 Centro' },
          ]}
          onSubmit={() => setModal(null)}
        />
      </ActionModal>

      <ActionModal
        isOpen={modal === 'detail'}
        title="Detalle de bus"
        description="Acciones iniciales para inspeccionar o actualizar una unidad."
        onClose={() => setModal(null)}
      >
        <div className="modal-action-list">
          <button className="modal-action" type="button">Editar datos de unidad</button>
          <button className="modal-action" type="button">Cambiar ruta asignada</button>
          <button className="modal-action" type="button">Enviar a mantenimiento</button>
        </div>
      </ActionModal>
    </div>
  )
}
