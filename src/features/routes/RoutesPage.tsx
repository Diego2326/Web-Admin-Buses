import { useState } from 'react'
import { ActionModal } from '../../components/ui/ActionModal'
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable'
import { Loader } from '../../components/ui/Loader'
import { MockForm } from '../../components/ui/MockForm'
import { OperationsMap } from '../../components/ui/OperationsMap'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useOperationsMapQuery, useRoutesQuery, useStopsQuery } from '../../hooks/useAdminQueries'
import type { TransitRoute } from '../../types/domain'

export function RoutesPage() {
  const { data = [], isLoading } = useRoutesQuery()
  const mapQuery = useOperationsMapQuery()
  const stopsQuery = useStopsQuery()
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)

  const columns: Array<DataTableColumn<TransitRoute>> = [
    { key: 'name', header: 'Nombre', render: (route) => route.name },
    { key: 'origin', header: 'Origen', render: (route) => route.origin },
    { key: 'destination', header: 'Destino', render: (route) => route.destination },
    { key: 'stops', header: 'Paradas', align: 'right', render: (route) => route.stops.length },
    { key: 'status', header: 'Estado', render: (route) => <StatusBadge status={route.status} /> },
    {
      key: 'actions',
      header: 'Acciones',
      align: 'right',
      render: () => <button className="text-button" type="button" onClick={() => setModal('edit')}>Editar</button>,
    },
  ]

  if (isLoading || mapQuery.isLoading || stopsQuery.isLoading) return <Loader />

  return (
    <div className="page-stack">
      <PageHeader
        title="Rutas"
        description="Catalogo de rutas formadas por paradas ordenadas, con origen, destino y estado."
        action={<button className="button button-primary" type="button" onClick={() => setModal('create')}>Nueva ruta</button>}
      />
      <section className="management-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Cobertura</span>
              <h2>Rutas registradas</h2>
            </div>
          </div>
          <DataTable columns={columns} data={data} getRowKey={(route) => route.id} />
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Trazado</span>
              <h2>Mapa de rutas</h2>
            </div>
          </div>
          <OperationsMap
            routes={mapQuery.data?.routePaths}
            markers={mapQuery.data?.stopMarkers}
            ariaLabel="Mapa de rutas por paradas"
          />
        </article>
      </section>

      <ActionModal
        isOpen={modal === 'create'}
        title="Nueva ruta"
        description="Selecciona paradas existentes en orden. La ruta se calculara siguiendo la via de calle disponible."
        onClose={() => setModal(null)}
      >
        <div className="route-builder">
          <MockForm
            submitLabel="Crear ruta"
            fields={[
              { label: 'Nombre de ruta', placeholder: 'Ruta 30 Aeropuerto' },
              { label: 'Estado', placeholder: 'Activo' },
            ]}
            onSubmit={() => setModal(null)}
          />

          <div className="route-stop-picker">
            <span className="eyebrow">Paradas disponibles</span>
            <div className="route-stop-list">
              {(stopsQuery.data ?? []).map((stop, index) => (
                <label className="route-stop-option" key={stop.id}>
                  <input type="checkbox" defaultChecked={index < 4} />
                  <span>
                    <strong>{stop.code} - {stop.name}</strong>
                    <small>{stop.address}</small>
                  </span>
                </label>
              ))}
            </div>
            <p className="modal-help">El orden seleccionado define origen, paradas intermedias y destino. El trazado debe calcularse por calles desde el backend o un motor de ruteo.</p>
          </div>
        </div>
      </ActionModal>

      <ActionModal
        isOpen={modal === 'edit'}
        title="Editar ruta"
        description="Acciones mock para ajustar cobertura, estado o trazado."
        onClose={() => setModal(null)}
      >
        <div className="modal-action-list">
          <button className="modal-action" type="button">Reordenar paradas</button>
          <button className="modal-action" type="button">Agregar o quitar paradas</button>
          <button className="modal-action" type="button">Recalcular via de calle</button>
          <button className="modal-action" type="button">Suspender ruta</button>
        </div>
      </ActionModal>
    </div>
  )
}
