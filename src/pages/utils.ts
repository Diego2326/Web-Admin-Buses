import type {
  Bus,
  BusQrCodeResponse,
  MapMarker,
  OperationalStatus,
  PaymentMethod,
  PaymentStatus,
  Stop,
  UserRole,
  UserStatus,
} from '../api'
import { ApiError } from '../api'

export const OPERATIONAL_STATUSES: OperationalStatus[] = ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'SUSPENDED']
export const USER_ROLES: UserRole[] = ['ADMIN', 'OPERATOR', 'INSPECTOR', 'PASSENGER']
export const USER_STATUSES: UserStatus[] = ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'SUSPENDED']
export const PAYMENT_METHODS: PaymentMethod[] = ['CARD', 'QR', 'CASH', 'WALLET']
export const PAYMENT_STATUSES: PaymentStatus[] = ['COMPLETED', 'PENDING', 'FAILED', 'REVERSED']
export const ROUTE_SORT = 'name,asc'

const currencyFormatter = new Intl.NumberFormat('es-GT', {
  style: 'currency',
  currency: 'GTQ',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const dateTimeFormatter = new Intl.DateTimeFormat('es-GT', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const dateFormatter = new Intl.DateTimeFormat('es-GT', {
  dateStyle: 'medium',
})

type StopMarkerCandidate = {
  id: string
  code: string
  name: string
  status?: string
  position?: [number, number] | null
  latitude?: number
  longitude?: number
}

export function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message
  }

  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return ''
    }

    if (error.message === 'Failed to fetch') {
      return 'No se pudo establecer la conexión en este momento.'
    }

    return error.message
  }

  return 'Ocurrió un error inesperado.'
}

export function formatCurrency(value: number) {
  return currencyFormatter.format(value)
}

export function formatDateTime(value?: string | null) {
  if (!value) {
    return 'Sin fecha'
  }

  return dateTimeFormatter.format(new Date(value))
}

export function formatDate(value?: string | null) {
  if (!value) {
    return 'Sin fecha'
  }

  return dateFormatter.format(new Date(value))
}

export function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function getStatusTone(status?: string) {
  if (!status) {
    return 'neutral'
  }

  if (status === 'ACTIVE' || status === 'COMPLETED') {
    return 'success'
  }

  if (status === 'PENDING' || status === 'MAINTENANCE') {
    return 'warning'
  }

  if (status === 'FAILED' || status === 'INACTIVE' || status === 'SUSPENDED' || status === 'REVERSED') {
    return 'danger'
  }

  return 'neutral'
}

export function getPositionLabel(stop: Stop) {
  if (stop.position && stop.position.length === 2) {
    return `${stop.position[0].toFixed(5)}, ${stop.position[1].toFixed(5)}`
  }

  if (typeof stop.latitude === 'number' && typeof stop.longitude === 'number') {
    return `${stop.latitude.toFixed(5)}, ${stop.longitude.toFixed(5)}`
  }

  return 'Sin coordenadas'
}

export function isCoordinatePair(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    Number.isFinite(value[0]) &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[1])
  )
}

export function getCoordinatePosition(stop: Pick<StopMarkerCandidate, 'position' | 'latitude' | 'longitude'>) {
  if (isCoordinatePair(stop.position)) {
    return stop.position
  }

  if (typeof stop.latitude === 'number' && typeof stop.longitude === 'number') {
    return [stop.latitude, stop.longitude] as [number, number]
  }

  return null
}

export function createStopMarker(stop: StopMarkerCandidate) {
  const position = getCoordinatePosition(stop)

  if (!position) {
    return null
  }

  return {
    id: stop.id,
    label: `${stop.code} · ${stop.name}`,
    position,
    ...(stop.status ? { status: stop.status } : {}),
  } as MapMarker
}

export function isMapMarker(value: MapMarker | null): value is MapMarker {
  return value !== null
}

export function buildBusQrValue(bus: Bus) {
  return JSON.stringify({
    type: 'BUS_BOARDING',
    busId: bus.id,
    busCode: bus.code,
    busPlate: bus.plate,
    routeId: bus.route?.id ?? null,
    routeName: bus.route?.name ?? null,
    routeOrigin: bus.route?.origin ?? null,
    routeDestination: bus.route?.destination ?? null,
  })
}

export function buildFreeQrImageUrl(value: string, size = 320) {
  const params = new URLSearchParams({
    size: `${size}x${size}`,
    data: value,
    format: 'png',
    qzone: '1',
  })

  return `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`
}

export function createLocalBusQr(bus: Bus): BusQrCodeResponse {
  const qrValue = buildBusQrValue(bus)

  return {
    busId: bus.id,
    busCode: bus.code,
    busPlate: bus.plate,
    routeId: bus.route?.id ?? null,
    routeName: bus.route?.name ?? 'Sin ruta asignada',
    routeOrigin: bus.route?.origin ?? null,
    routeDestination: bus.route?.destination ?? null,
    qrValue,
    qrImageUrl: buildFreeQrImageUrl(qrValue),
    provider: 'goQR.me',
  }
}

export function askText(label: string, initialValue = '') {
  const value = window.prompt(label, initialValue)
  if (value === null) {
    return null
  }

  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function askOptionalText(label: string, initialValue = '') {
  const value = window.prompt(label, initialValue)
  if (value === null) {
    return null
  }

  return value.trim()
}

export function askNumber(label: string, initialValue: number) {
  const value = window.prompt(label, String(initialValue))
  if (value === null) {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function askOperationalStatus(initialValue: OperationalStatus) {
  const value = window.prompt('Estado: ACTIVE, INACTIVE, MAINTENANCE o SUSPENDED', initialValue)
  if (value === null) {
    return null
  }

  const normalized = value.trim().toUpperCase()
  return OPERATIONAL_STATUSES.includes(normalized as OperationalStatus) ? (normalized as OperationalStatus) : null
}

export function askUserStatus(initialValue: UserStatus) {
  const value = window.prompt('Estado: ACTIVE, INACTIVE, MAINTENANCE o SUSPENDED', initialValue)
  if (value === null) {
    return null
  }

  const normalized = value.trim().toUpperCase()
  return USER_STATUSES.includes(normalized as UserStatus) ? (normalized as UserStatus) : null
}

export function askUserRole(initialValue: UserRole) {
  const value = window.prompt('Rol: ADMIN, OPERATOR, INSPECTOR o PASSENGER', initialValue)
  if (value === null) {
    return null
  }

  const normalized = value.trim().toUpperCase()
  return USER_ROLES.includes(normalized as UserRole) ? (normalized as UserRole) : null
}

export function askPaymentMethod(initialValue: PaymentMethod) {
  const value = window.prompt('Método: CARD, QR, CASH o WALLET', initialValue)
  if (value === null) {
    return null
  }

  const normalized = value.trim().toUpperCase()
  return PAYMENT_METHODS.includes(normalized as PaymentMethod) ? (normalized as PaymentMethod) : null
}

export function askEditablePaymentStatus(initialValue: Exclude<PaymentStatus, 'REVERSED'> | PaymentStatus) {
  const fallbackValue = initialValue === 'REVERSED' ? 'FAILED' : initialValue
  const value = window.prompt('Estado: COMPLETED, PENDING o FAILED', fallbackValue)
  if (value === null) {
    return null
  }

  const normalized = value.trim().toUpperCase()
  return normalized === 'COMPLETED' || normalized === 'PENDING' || normalized === 'FAILED'
    ? (normalized as Exclude<PaymentStatus, 'REVERSED'>)
    : null
}
