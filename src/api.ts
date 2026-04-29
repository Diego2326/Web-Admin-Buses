export type UserRole = 'ADMIN' | 'OPERATOR' | 'INSPECTOR' | 'PASSENGER'
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'SUSPENDED'
export type OperationalStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'SUSPENDED'
export type PaymentStatus = 'COMPLETED' | 'PENDING' | 'FAILED' | 'REVERSED'
export type PaymentMethod = 'CARD' | 'QR' | 'CASH' | 'WALLET'

export type PageResponse<T> = {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type StaffUser = {
  id: string
  name: string
  email: string
  role: UserRole
  status: UserStatus
}

export type LoginResponse = {
  token: string
  user: StaffUser
}

export type DashboardResponse = {
  metrics: {
    activeBuses: number
    registeredRoutes: number
    paymentsToday: number
    revenueToday: number
  }
  mapMarkers: MapMarker[]
}

export type MapMarker = {
  id: string
  label: string
  position: [number, number]
  status?: string
}

export type RoutePath = {
  id: string
  name: string
  color: string
  points: [number, number][]
}

export type OperationsMapResponse = {
  busMarkers: MapMarker[]
  stopMarkers: MapMarker[]
  routePaths: RoutePath[]
}

export type RouteSummary = {
  id: string
  name: string
  origin: string
  destination: string
  geometry: null
  stops?: Array<{
    id: string
    code: string
    name: string
    order: number
    position: [number, number] | null
  }>
  status: OperationalStatus
}

export type RouteDetail = {
  id: string
  name: string
  origin: string
  destination: string
  stops: Array<{
    id: string
    code: string
    name: string
    order: number
    position: [number, number] | null
  }>
  geometry: {
    type: 'LineString'
    coordinates: [number, number][]
  } | null
  status: OperationalStatus
}

export type Bus = {
  id: string
  plate: string
  code: string
  capacity: number
  route: {
    id: string
    name: string
    origin: string
    destination: string
  } | null
  status: OperationalStatus
}

export type Stop = {
  id: string
  code: string
  name: string
  address: string
  position?: [number, number]
  latitude?: number
  longitude?: number
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
  userId: string
  user: string
  busId: string
  bus: string
  busPlate: string
  routeName: string
  routeOrigin: string
  routeDestination: string
  amount: number
  date: string
  status: PaymentStatus
  method: PaymentMethod
  externalReference?: string | null
}

export type SummaryReport = {
  activeBuses: number
  registeredRoutes: number
  registeredStops: number
  payments: number
  revenue: number
}

export type RouteReport = {
  route: string
  stops: number
  assignedBuses: number
  payments: number
  revenue: number
}

export type BusReport = {
  bus: string
  payments: number
  revenue: number
}

export type BusFilters = {
  search?: string
  status?: OperationalStatus | ''
  routeId?: string
  page?: number
  size?: number
  sort?: string
}

export type StopsFilters = {
  search?: string
  status?: OperationalStatus | ''
  page?: number
  size?: number
  sort?: string
}

export type RoutesFilters = {
  search?: string
  status?: OperationalStatus | ''
  page?: number
  size?: number
  sort?: string
}

export type FaresFilters = {
  search?: string
  status?: OperationalStatus | ''
  page?: number
  size?: number
  sort?: string
}

export type UsersFilters = {
  search?: string
  role?: UserRole | ''
  status?: UserStatus | ''
  page?: number
  size?: number
  sort?: string
}

export type PaymentsFilters = {
  userId?: string
  busId?: string
  status?: PaymentStatus | ''
  method?: PaymentMethod | ''
  dateFrom?: string
  dateTo?: string
  page?: number
  size?: number
  sort?: string
}

export type ReportsFilters = {
  dateFrom?: string
  dateTo?: string
  method?: PaymentMethod | ''
  status?: PaymentStatus | ''
  page?: number
  size?: number
  sort?: string
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH'
  token?: string
  body?: unknown
  signal?: AbortSignal
}

type QueryValue = string | number | boolean | null | undefined

type QueryParams = Record<string, QueryValue>

export class ApiError extends Error {
  status: number
  details: unknown

  constructor(message: string, status: number, details: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:8080/api/v1'

function buildQuery(params: QueryParams) {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === '' || value === null || value === undefined) {
      continue
    }

    searchParams.set(key, String(value))
  }

  const query = searchParams.toString()
  return query ? `?${query}` : ''
}

async function request<T>(path: string, options: RequestOptions = {}) {
  const headers = new Headers({
    Accept: 'application/json',
  })

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`)
  }

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  })

  const rawText = await response.text()
  const payload = rawText ? (JSON.parse(rawText) as unknown) : null

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload !== null && 'message' in payload && typeof payload.message === 'string'
        ? payload.message
        : `HTTP ${response.status}`

    throw new ApiError(message, response.status, payload)
  }

  return payload as T
}

export const api = {
  login(email: string, password: string, signal?: AbortSignal) {
    return request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
      signal,
    })
  },

  me(token: string, signal?: AbortSignal) {
    return request<StaffUser>('/auth/me', { token, signal })
  },

  logout(token: string, signal?: AbortSignal) {
    return request<{ success: boolean }>('/auth/logout', {
      method: 'POST',
      token,
      signal,
    })
  },

  getDashboard(token: string, signal?: AbortSignal) {
    return request<DashboardResponse>('/dashboard', { token, signal })
  },

  getOperationsMap(token: string, signal?: AbortSignal) {
    return request<OperationsMapResponse>('/operations-map', { token, signal })
  },

  getBuses(token: string, filters: BusFilters, signal?: AbortSignal) {
    return request<PageResponse<Bus>>(`/buses${buildQuery(filters)}`, { token, signal })
  },

  patchBusStatus(token: string, busId: string, status: OperationalStatus, signal?: AbortSignal) {
    return request<Bus>(`/buses/${busId}/status`, {
      method: 'PATCH',
      token,
      body: { status },
      signal,
    })
  },

  getStops(token: string, filters: StopsFilters, signal?: AbortSignal) {
    return request<PageResponse<Stop>>(`/stops${buildQuery(filters)}`, { token, signal })
  },

  getRoutes(token: string, filters: RoutesFilters, signal?: AbortSignal) {
    return request<PageResponse<RouteSummary>>(`/routes${buildQuery(filters)}`, { token, signal })
  },

  getRoute(token: string, routeId: string, signal?: AbortSignal) {
    return request<RouteDetail>(`/routes/${routeId}`, { token, signal })
  },

  recalculateRouteGeometry(token: string, routeId: string, signal?: AbortSignal) {
    return request<RouteDetail>(`/routes/${routeId}/recalculate-geometry`, {
      method: 'POST',
      token,
      signal,
    })
  },

  getFares(token: string, filters: FaresFilters, signal?: AbortSignal) {
    return request<PageResponse<Fare>>(`/fares${buildQuery(filters)}`, { token, signal })
  },

  getUsers(token: string, filters: UsersFilters, signal?: AbortSignal) {
    return request<PageResponse<StaffUser>>(`/users${buildQuery(filters)}`, { token, signal })
  },

  patchUserStatus(token: string, userId: string, status: UserStatus, signal?: AbortSignal) {
    return request<StaffUser>(`/users/${userId}/status`, {
      method: 'PATCH',
      token,
      body: { status },
      signal,
    })
  },

  patchUserRole(token: string, userId: string, role: UserRole, signal?: AbortSignal) {
    return request<StaffUser>(`/users/${userId}/role`, {
      method: 'PATCH',
      token,
      body: { role },
      signal,
    })
  },

  resetUserPassword(token: string, userId: string, password: string, signal?: AbortSignal) {
    return request<void>(`/users/${userId}/reset-password`, {
      method: 'POST',
      token,
      body: { password },
      signal,
    })
  },

  getPayments(token: string, filters: PaymentsFilters, signal?: AbortSignal) {
    return request<PageResponse<Payment>>(`/payments${buildQuery(filters)}`, { token, signal })
  },

  createPayment(
    token: string,
    body: {
      userId: string
      busId: string
      amount: number
      method: PaymentMethod
      externalReference?: string
    },
    signal?: AbortSignal,
  ) {
    return request<Payment>('/payments', {
      method: 'POST',
      token,
      body,
      signal,
    })
  },

  reversePayment(token: string, paymentId: string, reason: string, signal?: AbortSignal) {
    return request<Payment>(`/payments/${paymentId}/reverse`, {
      method: 'POST',
      token,
      body: { reason },
      signal,
    })
  },

  getSummaryReport(token: string, filters: ReportsFilters, signal?: AbortSignal) {
    return request<SummaryReport>(`/reports/summary${buildQuery(filters)}`, { token, signal })
  },

  getPaymentReport(token: string, filters: ReportsFilters, signal?: AbortSignal) {
    return request<PageResponse<Payment>>(`/reports/payments${buildQuery(filters)}`, { token, signal })
  },

  getRouteReport(token: string, signal?: AbortSignal) {
    return request<RouteReport[]>('/reports/routes', { token, signal })
  },

  getBusReport(token: string, signal?: AbortSignal) {
    return request<BusReport[]>('/reports/buses', { token, signal })
  },
}
