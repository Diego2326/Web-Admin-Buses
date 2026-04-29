import * as L from 'leaflet'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { MapMarker, RoutePath } from '../api'
import { formatEnumLabel, getErrorMessage, isCoordinatePair } from './utils'

const DEFAULT_CENTER: L.LatLngExpression = [14.6349, -90.5069]

type LayoutProps = {
  title: string
  copy: string
  toolbar?: ReactNode
  children: ReactNode
}

type PaginationProps = {
  page: number
  totalPages: number
  totalElements: number
  size: number
  onPageChange: (page: number) => void
}

type EnumActionProps<T extends string> = {
  value: T
  options: readonly T[]
  actionLabel: string
  disabled?: boolean
  onSubmit: (nextValue: T) => Promise<void>
}

export function PageLayout({ title, copy, toolbar, children }: LayoutProps) {
  return (
    <div className="page-stack">
      <section className="section-hero">
        <div className="section-heading">
          <p className="eyebrow">Vista</p>
          <h2>{title}</h2>
          <p>{copy}</p>
        </div>
        {toolbar ? <div className="section-toolbar">{toolbar}</div> : null}
      </section>
      {children}
    </div>
  )
}

export function CrudActionButtons({
  actions,
  note,
}: {
  actions: Array<{
    label: string
    disabled?: boolean
    variant?: 'primary-button' | 'secondary-button' | 'ghost-button'
    onClick?: () => void
  }>
  note?: string
}) {
  return (
    <div className="crud-actions">
      <div className="crud-actions-list">
        {actions.map((action) => (
          <button
            key={action.label}
            className={action.variant ?? 'ghost-button'}
            type="button"
            onClick={action.onClick}
            disabled={action.disabled ?? false}
          >
            {action.label}
          </button>
        ))}
      </div>
      {note ? <small className="crud-actions-note">{note}</small> : null}
    </div>
  )
}

export function OperationsMapView({
  ariaLabel,
  focusMarkers = [],
  stopMarkers = [],
  busMarkers = [],
  routePaths = [],
}: {
  ariaLabel: string
  focusMarkers?: MapMarker[]
  stopMarkers?: MapMarker[]
  busMarkers?: MapMarker[]
  routePaths?: RoutePath[]
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const overlayRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return
    }

    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: 12,
      zoomControl: true,
      scrollWheelZoom: true,
    })

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)

    const overlay = L.layerGroup().addTo(map)

    mapRef.current = map
    overlayRef.current = overlay

    return () => {
      map.remove()
      mapRef.current = null
      overlayRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const overlay = overlayRef.current

    if (!map || !overlay) {
      return
    }

    overlay.clearLayers()

    const bounds = L.latLngBounds([])

    for (const route of routePaths) {
      const points = route.points.filter(isCoordinatePair)
      if (!points.length) {
        continue
      }

      L.polyline(points, {
        color: route.color || '#0f766e',
        weight: 4,
        opacity: 0.82,
      })
        .bindPopup(route.name)
        .addTo(overlay)

      points.forEach((point) => bounds.extend(point))
    }

    for (const marker of focusMarkers) {
      if (!isCoordinatePair(marker.position)) {
        continue
      }

      L.circleMarker(marker.position, {
        radius: 8,
        weight: 2,
        color: '#ffffff',
        fillColor: '#d97706',
        fillOpacity: 0.95,
      })
        .bindPopup(`<strong>${marker.label}</strong><br/>${marker.status ?? 'Sin estado'}`)
        .addTo(overlay)

      bounds.extend(marker.position)
    }

    for (const marker of stopMarkers) {
      if (!isCoordinatePair(marker.position)) {
        continue
      }

      L.circleMarker(marker.position, {
        radius: 5,
        weight: 1,
        color: '#0f172a',
        fillColor: '#f8fafc',
        fillOpacity: 1,
      })
        .bindPopup(marker.label)
        .addTo(overlay)

      bounds.extend(marker.position)
    }

    for (const marker of busMarkers) {
      if (!isCoordinatePair(marker.position)) {
        continue
      }

      L.circleMarker(marker.position, {
        radius: 7,
        weight: 2,
        color: '#0f172a',
        fillColor: '#0f766e',
        fillOpacity: 0.9,
      })
        .bindPopup(`<strong>${marker.label}</strong><br/>${marker.status ?? 'Sin estado'}`)
        .addTo(overlay)

      bounds.extend(marker.position)
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.15))
    } else {
      map.setView(DEFAULT_CENTER, 12)
    }
  }, [busMarkers, focusMarkers, routePaths, stopMarkers])

  return <div className="leaflet-host" ref={containerRef} aria-label={ariaLabel} />
}

export function StatCard({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{caption}</small>
    </article>
  )
}

export function ErrorBanner({ message }: { message: string }) {
  return <div className="error-banner">{message}</div>
}

export function EmptyState({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{copy}</p>
    </div>
  )
}

export function PaginationBar({ page, totalPages, totalElements, size, onPageChange }: PaginationProps) {
  if (totalPages <= 1) {
    return (
      <div className="pagination-bar">
        <span>{totalElements} resultados</span>
      </div>
    )
  }

  return (
    <div className="pagination-bar">
      <span>
        Página {page + 1} de {totalPages} · {totalElements} resultados · {size} por página
      </span>

      <div className="pagination-actions">
        <button className="ghost-button" type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 0}>
          Anterior
        </button>
        <button
          className="ghost-button"
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page + 1 >= totalPages}
        >
          Siguiente
        </button>
      </div>
    </div>
  )
}

export function EnumAction<T extends string>({ value, options, actionLabel, disabled, onSubmit }: EnumActionProps<T>) {
  const [draft, setDraft] = useState(value)
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState('')

  async function handleApply() {
    setPending(true)
    setFeedback('')

    try {
      await onSubmit(draft)
      setFeedback('Actualizado')
    } catch (error) {
      setFeedback(getErrorMessage(error) || 'Error')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="inline-action">
      <select value={draft} onChange={(event) => setDraft(event.target.value as T)} disabled={disabled || pending}>
        {options.map((item) => (
          <option key={item} value={item}>
            {formatEnumLabel(item)}
          </option>
        ))}
      </select>
      <button className="ghost-button" type="button" onClick={handleApply} disabled={disabled || pending}>
        {pending ? '...' : actionLabel}
      </button>
      {feedback ? <small>{feedback}</small> : null}
    </div>
  )
}

export function PasswordResetAction({
  disabled,
  onSubmit,
}: {
  disabled?: boolean
  onSubmit: (password: string) => Promise<void>
}) {
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState('')

  async function handleApply() {
    if (!password.trim()) {
      setFeedback('Escribe una clave')
      return
    }

    setPending(true)
    setFeedback('')

    try {
      await onSubmit(password.trim())
      setPassword('')
      setFeedback('Clave actualizada')
    } catch (error) {
      setFeedback(getErrorMessage(error) || 'Error')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="inline-action">
      <input
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Nueva clave"
        disabled={disabled || pending}
      />
      <button className="ghost-button" type="button" onClick={handleApply} disabled={disabled || pending}>
        {pending ? '...' : 'Reset'}
      </button>
      {feedback ? <small>{feedback}</small> : null}
    </div>
  )
}

export function ReversePaymentAction({ onSubmit }: { onSubmit: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState('Cobro duplicado')
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState('')

  async function handleReverse() {
    setPending(true)
    setFeedback('')

    try {
      await onSubmit(reason)
      setFeedback('Pago revertido')
    } catch (error) {
      setFeedback(getErrorMessage(error) || 'Error')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="inline-action">
      <input value={reason} onChange={(event) => setReason(event.target.value)} disabled={pending} />
      <button className="ghost-button" type="button" onClick={handleReverse} disabled={pending}>
        {pending ? '...' : 'Revertir'}
      </button>
      {feedback ? <small>{feedback}</small> : null}
    </div>
  )
}
