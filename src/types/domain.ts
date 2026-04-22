export type OperationalStatus = 'Activo' | 'Inactivo' | 'Mantenimiento' | 'Suspendido'
export type PaymentStatus = 'Completado' | 'Pendiente' | 'Fallido' | 'Reversado'
export type UserRole = 'Administrador' | 'Operador' | 'Inspector' | 'Pasajero'
export type PaymentMethod = 'Tarjeta' | 'QR' | 'Efectivo' | 'Billetera'

export type RouteSummary = {
  id: string
  name: string
}

export type Bus = {
  id: string
  plate: string
  code: string
  capacity: number
  route: RouteSummary
  status: OperationalStatus
}

export type TransitRoute = {
  id: string
  name: string
  origin: string
  destination: string
  stops: RouteStopSummary[]
  status: OperationalStatus
}

export type RouteStopSummary = {
  id: string
  name: string
  order: number
  code: string
}

export type BusStop = {
  id: string
  name: string
  code: string
  address: string
  position: [number, number]
  status: OperationalStatus
}

export type Fare = {
  id: string
  name: string
  amount: number
  validFrom: string
  validTo: string
  status: OperationalStatus
}

export type Payment = {
  id: string
  user: string
  bus: string
  amount: number
  date: string
  status: PaymentStatus
  method: PaymentMethod
}

export type AdminUser = {
  id: string
  name: string
  email: string
  role: UserRole
  status: OperationalStatus
}

export type DashboardMetrics = {
  activeBuses: number
  registeredRoutes: number
  paymentsToday: number
  revenueToday: number
}

export type MapMarker = {
  id: string
  label: string
  position: [number, number]
  status: OperationalStatus
}

export type RoutePath = {
  id: string
  name: string
  color: string
  points: Array<[number, number]>
}
