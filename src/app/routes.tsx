import type { ComponentType } from 'react'
import { BusesPage } from '../features/buses/BusesPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { FaresPage } from '../features/fares/FaresPage'
import { PaymentsPage } from '../features/payments/PaymentsPage'
import { ReportsPage } from '../features/reports/ReportsPage'
import { RoutesPage } from '../features/routes/RoutesPage'
import { StopsPage } from '../features/stops/StopsPage'
import { UsersPage } from '../features/users/UsersPage'

export type AppRoute = {
  path: string
  label: string
  title: string
  iconLabel: string
  element: ComponentType
}

export const appRoutes: AppRoute[] = [
  {
    path: '/',
    label: 'Dashboard',
    title: 'Dashboard operativo',
    iconLabel: 'DB',
    element: DashboardPage,
  },
  {
    path: '/buses',
    label: 'Buses',
    title: 'Gestion de buses',
    iconLabel: 'BU',
    element: BusesPage,
  },
  {
    path: '/rutas',
    label: 'Rutas',
    title: 'Gestion de rutas',
    iconLabel: 'RT',
    element: RoutesPage,
  },
  {
    path: '/paradas',
    label: 'Paradas',
    title: 'Gestion de paradas',
    iconLabel: 'PA',
    element: StopsPage,
  },
  {
    path: '/tarifas',
    label: 'Tarifas',
    title: 'Tarifas',
    iconLabel: 'TF',
    element: FaresPage,
  },
  {
    path: '/pagos',
    label: 'Pagos',
    title: 'Pagos',
    iconLabel: 'PG',
    element: PaymentsPage,
  },
  {
    path: '/usuarios',
    label: 'Usuarios',
    title: 'Usuarios',
    iconLabel: 'US',
    element: UsersPage,
  },
  {
    path: '/reportes',
    label: 'Reportes',
    title: 'Reportes',
    iconLabel: 'RP',
    element: ReportsPage,
  },
]

export const fallbackRoute = appRoutes[0]
