import { useState } from 'react'
import { ActionModal } from '../../components/ui/ActionModal'
import { EmptyState } from '../../components/ui/EmptyState'
import { MockForm } from '../../components/ui/MockForm'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatCard } from '../../components/ui/StatCard'

export function ReportsPage() {
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)

  return (
    <div className="page-stack">
      <PageHeader
        title="Reportes"
        description="Estructura inicial para reportes operativos, financieros y de adopcion."
        action={<button className="button button-secondary" type="button" onClick={() => setIsScheduleOpen(true)}>Programar reporte</button>}
      />

      <section className="stat-grid">
        <StatCard label="Reportes operativos" value="3" helper="Flota, rutas y ocupacion" />
        <StatCard label="Reportes financieros" value="2" helper="Ingresos y liquidaciones" />
        <StatCard label="Reportes de usuarios" value="1" helper="Actividad y adopcion" />
      </section>

      <section className="panel">
        <EmptyState
          title="Constructor de reportes pendiente"
          description="Esta seccion queda preparada para filtros, exportaciones y graficas cuando la API final este disponible."
        />
      </section>

      <ActionModal
        isOpen={isScheduleOpen}
        title="Programar reporte"
        description="Configura una programacion mock para reportes recurrentes."
        onClose={() => setIsScheduleOpen(false)}
      >
        <MockForm
          submitLabel="Guardar programacion"
          fields={[
            { label: 'Nombre del reporte', placeholder: 'Ingresos diarios' },
            { label: 'Tipo', placeholder: 'Financiero' },
            { label: 'Frecuencia', placeholder: 'Diaria' },
            { label: 'Correo destino', placeholder: 'admin@buses.gt', type: 'email' },
          ]}
          onSubmit={() => setIsScheduleOpen(false)}
        />
      </ActionModal>
    </div>
  )
}
