import type { OperationalStatus, PaymentStatus } from '../../types/domain'

type StatusBadgeProps = {
  status: OperationalStatus | PaymentStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const variant = getStatusVariant(status)

  return <span className={`status-badge status-badge-${variant}`}>{status}</span>
}

function getStatusVariant(status: OperationalStatus | PaymentStatus) {
  if (status === 'Activo' || status === 'Completado') return 'success'
  if (status === 'Pendiente' || status === 'Mantenimiento') return 'warning'
  if (status === 'Fallido' || status === 'Reversado' || status === 'Suspendido') return 'danger'
  return 'neutral'
}
