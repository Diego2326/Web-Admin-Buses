import type {
  AdminUser,
  BusStop,
  Bus,
  DashboardMetrics,
  Fare,
  MapMarker,
  Payment,
  RoutePath,
  TransitRoute,
} from '../types/domain'

export const stops: BusStop[] = [
  { id: 'stop-01', name: 'Terminal Oriente', code: 'P-001', address: 'Ingreso Terminal Oriente', position: [14.982, -89.543], status: 'Activo' },
  { id: 'stop-02', name: 'Avenida Reforma', code: 'P-002', address: 'Avenida Reforma 4a calle', position: [14.977, -89.536], status: 'Activo' },
  { id: 'stop-03', name: 'Parque Central', code: 'P-003', address: 'Parque Central', position: [14.9722, -89.5306], status: 'Activo' },
  { id: 'stop-04', name: 'Terminal Norte', code: 'P-004', address: 'Bahia Norte', position: [14.988, -89.528], status: 'Activo' },
  { id: 'stop-05', name: 'Hospital Regional', code: 'P-005', address: 'Entrada Hospital Regional', position: [14.967, -89.538], status: 'Activo' },
  { id: 'stop-06', name: 'Mercado Municipal', code: 'P-006', address: 'Mercado Municipal zona comercial', position: [14.962, -89.520], status: 'Activo' },
  { id: 'stop-07', name: 'Zona Industrial', code: 'P-007', address: 'Ingreso Zona Industrial', position: [14.975, -89.535], status: 'Activo' },
  { id: 'stop-08', name: 'Patio 2', code: 'P-008', address: 'Patio operativo 2', position: [14.961, -89.539], status: 'Suspendido' },
]

function routeStops(stopIds: string[]) {
  return stopIds
    .map((stopId, index) => {
      const stop = stops.find((candidate) => candidate.id === stopId)

      if (!stop) {
        return null
      }

      return {
        id: stop.id,
        name: stop.name,
        code: stop.code,
        order: index + 1,
      }
    })
    .filter((stop): stop is NonNullable<typeof stop> => Boolean(stop))
}

export const routes: TransitRoute[] = [
  { id: 'route-01', name: 'Ruta 12 Centro', origin: 'Terminal Oriente', destination: 'Parque Central', stops: routeStops(['stop-01', 'stop-02', 'stop-03']), status: 'Activo' },
  { id: 'route-02', name: 'Ruta 06 Norte', origin: 'Terminal Norte', destination: 'Hospital Regional', stops: routeStops(['stop-04', 'stop-02', 'stop-03', 'stop-05']), status: 'Activo' },
  { id: 'route-03', name: 'Ruta 18 Express', origin: 'Mercado Municipal', destination: 'Zona Industrial', stops: routeStops(['stop-06', 'stop-03', 'stop-02', 'stop-07']), status: 'Activo' },
  { id: 'route-04', name: 'Ruta 03 Sur', origin: 'Calzada Sur', destination: 'Terminal Centro', stops: [], status: 'Activo' },
  { id: 'route-05', name: 'Ruta 22 Oeste', origin: 'Patio 2', destination: 'Colonia La Reforma', stops: routeStops(['stop-08', 'stop-02', 'stop-03']), status: 'Suspendido' },
]

export const buses: Bus[] = [
  { id: 'bus-102', plate: 'C 102 BAA', code: 'BUS-102', capacity: 55, route: { id: 'route-01', name: 'Ruta 12 Centro' }, status: 'Activo' },
  { id: 'bus-118', plate: 'C 118 BBA', code: 'BUS-118', capacity: 50, route: { id: 'route-02', name: 'Ruta 06 Norte' }, status: 'Activo' },
  { id: 'bus-124', plate: 'C 124 BCA', code: 'BUS-124', capacity: 60, route: { id: 'route-03', name: 'Ruta 18 Express' }, status: 'Activo' },
  { id: 'bus-131', plate: 'C 131 BDA', code: 'BUS-131', capacity: 48, route: { id: 'route-04', name: 'Ruta 03 Sur' }, status: 'Activo' },
  { id: 'bus-140', plate: 'C 140 BEA', code: 'BUS-140', capacity: 52, route: { id: 'route-05', name: 'Ruta 22 Oeste' }, status: 'Mantenimiento' },
]

export const fares: Fare[] = [
  { id: 'fare-urban', name: 'Tarifa urbana', amount: 4, validFrom: '2026-01-01', validTo: '2026-12-31', status: 'Activo' },
  { id: 'fare-express', name: 'Tarifa express', amount: 6, validFrom: '2026-01-01', validTo: '2026-12-31', status: 'Activo' },
  { id: 'fare-student', name: 'Tarifa estudiante', amount: 2, validFrom: '2026-01-15', validTo: '2026-10-31', status: 'Activo' },
  { id: 'fare-night', name: 'Tarifa nocturna', amount: 5, validFrom: '2026-02-01', validTo: '2026-12-31', status: 'Inactivo' },
]

export const payments: Payment[] = [
  { id: 'pay-1001', user: 'Ana Morales', bus: 'BUS-102', amount: 4, date: '2026-04-22T07:15:00-06:00', status: 'Completado', method: 'QR' },
  { id: 'pay-1002', user: 'Luis Perez', bus: 'BUS-118', amount: 4, date: '2026-04-22T07:19:00-06:00', status: 'Completado', method: 'Tarjeta' },
  { id: 'pay-1003', user: 'Karla Gomez', bus: 'BUS-124', amount: 6, date: '2026-04-22T07:27:00-06:00', status: 'Pendiente', method: 'Billetera' },
  { id: 'pay-1004', user: 'Mario Lopez', bus: 'BUS-131', amount: 4, date: '2026-04-22T07:36:00-06:00', status: 'Completado', method: 'Efectivo' },
  { id: 'pay-1005', user: 'Sofia Castillo', bus: 'BUS-102', amount: 2, date: '2026-04-22T07:43:00-06:00', status: 'Reversado', method: 'QR' },
]

export const users: AdminUser[] = [
  { id: 'user-01', name: 'Diego Ramirez', email: 'diego@transurb.gt', role: 'Administrador', status: 'Activo' },
  { id: 'user-02', name: 'Mariana Estrada', email: 'mariana@transurb.gt', role: 'Operador', status: 'Activo' },
  { id: 'user-03', name: 'Carlos Mejia', email: 'carlos@transurb.gt', role: 'Inspector', status: 'Activo' },
  { id: 'user-04', name: 'Ana Morales', email: 'ana@email.com', role: 'Pasajero', status: 'Activo' },
  { id: 'user-05', name: 'Luis Perez', email: 'luis@email.com', role: 'Pasajero', status: 'Inactivo' },
]

export const mapMarkers: MapMarker[] = [
  { id: 'marker-102', label: 'BUS-102', position: [14.9722, -89.5306], status: 'Activo' },
  { id: 'marker-118', label: 'BUS-118', position: [14.977, -89.536], status: 'Activo' },
  { id: 'marker-124', label: 'BUS-124', position: [14.966, -89.524], status: 'Activo' },
  { id: 'marker-140', label: 'BUS-140', position: [14.961, -89.539], status: 'Mantenimiento' },
]

export const stopMarkers: MapMarker[] = stops.map((stop) => ({
  id: `marker-${stop.id}`,
  label: `${stop.code} - ${stop.name}`,
  position: stop.position,
  status: stop.status,
}))

export const routePaths: RoutePath[] = [
  {
    id: 'route-path-01',
    name: 'Ruta 12 Centro',
    color: '#0b7285',
    points: [
      [14.982, -89.543],
      [14.977, -89.536],
      [14.9722, -89.5306],
      [14.968, -89.526],
    ],
  },
  {
    id: 'route-path-02',
    name: 'Ruta 06 Norte',
    color: '#15803d',
    points: [
      [14.988, -89.528],
      [14.981, -89.531],
      [14.974, -89.535],
      [14.967, -89.538],
    ],
  },
  {
    id: 'route-path-03',
    name: 'Ruta 18 Express',
    color: '#eab308',
    points: [
      [14.962, -89.520],
      [14.966, -89.524],
      [14.970, -89.529],
      [14.975, -89.535],
    ],
  },
]

export const dashboardMetrics: DashboardMetrics = {
  activeBuses: buses.filter((bus) => bus.status === 'Activo').length,
  registeredRoutes: routes.length,
  paymentsToday: payments.filter((payment) => payment.date.startsWith('2026-04-22')).length,
  revenueToday: payments
    .filter((payment) => payment.status === 'Completado')
    .reduce((total, payment) => total + payment.amount, 0),
}
