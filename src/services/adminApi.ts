import { buses, dashboardMetrics, fares, mapMarkers, payments, routePaths, routes, stopMarkers, stops, users } from './mockData'

const MOCK_DELAY_MS = 180

function resolveMock<TData>(data: TData): Promise<TData> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(data), MOCK_DELAY_MS)
  })
}

export const adminApi = {
  getDashboard: () => resolveMock({ metrics: dashboardMetrics, mapMarkers }),
  getBuses: () => resolveMock(buses),
  getRoutes: () => resolveMock(routes),
  getStops: () => resolveMock(stops),
  getOperationsMap: () => resolveMock({ mapMarkers, routePaths, stopMarkers }),
  getFares: () => resolveMock(fares),
  getPayments: () => resolveMock(payments),
  getUsers: () => resolveMock(users),
}
