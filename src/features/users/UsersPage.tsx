import { useState } from 'react'
import { ActionModal } from '../../components/ui/ActionModal'
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable'
import { Loader } from '../../components/ui/Loader'
import { MockForm } from '../../components/ui/MockForm'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useUsersQuery } from '../../hooks/useAdminQueries'
import type { AdminUser } from '../../types/domain'

export function UsersPage() {
  const { data = [], isLoading } = useUsersQuery()
  const [modal, setModal] = useState<'create' | 'manage' | null>(null)

  const columns: Array<DataTableColumn<AdminUser>> = [
    { key: 'name', header: 'Nombre', render: (user) => user.name },
    { key: 'email', header: 'Correo', render: (user) => user.email },
    { key: 'role', header: 'Rol', render: (user) => user.role },
    { key: 'status', header: 'Estado', render: (user) => <StatusBadge status={user.status} /> },
    {
      key: 'actions',
      header: 'Acciones',
      align: 'right',
      render: () => <button className="text-button" type="button" onClick={() => setModal('manage')}>Gestionar</button>,
    },
  ]

  if (isLoading) return <Loader />

  return (
    <div className="page-stack">
      <PageHeader
        title="Usuarios"
        description="Usuarios administrativos y pasajeros registrados en la plataforma."
        action={<button className="button button-primary" type="button" onClick={() => setModal('create')}>Nuevo usuario</button>}
      />
      <section className="panel">
        <DataTable columns={columns} data={data} getRowKey={(user) => user.id} />
      </section>

      <ActionModal
        isOpen={modal === 'create'}
        title="Nuevo usuario"
        description="Alta mock de usuario administrativo o pasajero."
        onClose={() => setModal(null)}
      >
        <MockForm
          submitLabel="Guardar usuario"
          fields={[
            { label: 'Nombre', placeholder: 'Nombre completo' },
            { label: 'Correo', placeholder: 'usuario@email.com', type: 'email' },
            { label: 'Rol', placeholder: 'Operador' },
            { label: 'Estado', placeholder: 'Activo' },
          ]}
          onSubmit={() => setModal(null)}
        />
      </ActionModal>

      <ActionModal
        isOpen={modal === 'manage'}
        title="Gestionar usuario"
        description="Acciones mock para administrar cuenta, rol y estado."
        onClose={() => setModal(null)}
      >
        <div className="modal-action-list">
          <button className="modal-action" type="button">Cambiar rol</button>
          <button className="modal-action" type="button">Restablecer acceso</button>
          <button className="modal-action" type="button">Desactivar usuario</button>
        </div>
      </ActionModal>
    </div>
  )
}
