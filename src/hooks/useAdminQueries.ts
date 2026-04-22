import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../services/adminApi'

export function useDashboardQuery() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: adminApi.getDashboard,
  })
}

export function useBusesQuery() {
  return useQuery({
    queryKey: ['buses'],
    queryFn: adminApi.getBuses,
  })
}

export function useRoutesQuery() {
  return useQuery({
    queryKey: ['routes'],
    queryFn: adminApi.getRoutes,
  })
}

export function useStopsQuery() {
  return useQuery({
    queryKey: ['stops'],
    queryFn: adminApi.getStops,
  })
}

export function useOperationsMapQuery() {
  return useQuery({
    queryKey: ['operations-map'],
    queryFn: adminApi.getOperationsMap,
  })
}

export function useFaresQuery() {
  return useQuery({
    queryKey: ['fares'],
    queryFn: adminApi.getFares,
  })
}

export function usePaymentsQuery() {
  return useQuery({
    queryKey: ['payments'],
    queryFn: adminApi.getPayments,
  })
}

export function useUsersQuery() {
  return useQuery({
    queryKey: ['users'],
    queryFn: adminApi.getUsers,
  })
}
