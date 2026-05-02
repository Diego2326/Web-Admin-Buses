import { type FormEvent, useState } from 'react'
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
  const { data: queryData = [], isLoading } = useFaresQuery()
  const [localFares, setLocalFares] = useState<Fare[] | null>(null)
  const data = localFares ?? queryData

  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editTarget, setEditTarget] = useState<Fare | null>(null)
  const [editName, setEditName] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editValidFrom, setEditValidFrom] = useState('')
  const [editValidTo, setEditValidTo] = useState('')

  function openEdit(fare: Fare) {
    setEditTarget(fare)
    setEditName(fare.name)
    setEditAmount(fare.amount.toFixed(2))
    setEditValidFrom(fare.validFrom)
    setEditValidTo(fare.validTo)
    setModal('edit')
  }

  function closeEdit() {
    setModal(null)
    setEditTarget(null)
  }

  function handleEditSubmit(event: FormEvent) {
    event.preventDefault()
    if (!editTarget) return

    const parsedAmount = parseFloat(editAmount)
    if (!editName.trim() || !Number.isFinite(parsedAmount) || parsedAmount < 0) return

    const updatedFare: Fare = {
      ...editTarget,
      name: editName.trim(),
      amount: parsedAmount,
      validFrom: editValidFrom,
      validTo: editValidTo,
    }

    const currentFares = localFares ?? queryData
    setLocalFares(currentFares.map((f) => (f.id === editTarget.id ? updatedFare : f)))
    closeEdit()
  }

  const columns: Array<DataTableColumn<Fare>> = [
    { key: 'name', header: 'Nombre', render: (fare) => fare.name },
    { key: 'amount', header: 'Monto', align: 'right', render: (fare) => formatCurrency(fare.amount) },
    { key: 'validity', header: 'Vigencia', render: (fare) => `${fare.validFrom} al ${fare.validTo}` },
    { key: 'status', header: 'Estado', render: (fare) => <StatusBadge status={fare.status} /> },
    {
      key: 'actions',
      header: 'Acciones',
      align: 'right',
      render: (fare) => <button className="text-button" type="button" onClick={() => openEdit(fare)}>Editar</button>,
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
        isOpen={modal === 'edit'}
        title="Editar tarifa"
        description="Modifica el nombre, monto y vigencia de la tarifa."
        onClose={closeEdit}
      >
        <form className="modal-form" onSubmit={handleEditSubmit}>
          <div className="modal-form-grid">
            <label>
              <span>Nombre</span>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Tarifa urbana"
                required
              />
            </label>
            <label>
              <span>Monto</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                placeholder="4.00"
                required
              />
            </label>
            <label>
              <span>Vigente desde</span>
              <input
                type="date"
                value={editValidFrom}
                onChange={(e) => setEditValidFrom(e.target.value)}
                required
              />
            </label>
            <label>
              <span>Vigente hasta</span>
              <input
                type="date"
                value={editValidTo}
                onChange={(e) => setEditValidTo(e.target.value)}
                required
              />
            </label>
          </div>
          <div className="modal-form-actions">
            <button className="button button-primary" type="submit">Guardar cambios</button>
          </div>
        </form>
      </ActionModal>
    </div>
  )
}
