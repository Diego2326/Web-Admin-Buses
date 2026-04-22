import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from '../components/layout/AdminLayout'
import { LoginPage } from '../features/auth/LoginPage'
import { appRoutes, fallbackRoute } from './routes'
import { ProtectedRoute } from './ProtectedRoute'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          {appRoutes.map((route) => {
            const Page = route.element
            return <Route index={route.path === '/'} path={route.path === '/' ? undefined : route.path} element={<Page />} key={route.path} />
          })}
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={fallbackRoute.path} replace />} />
    </Routes>
  )
}
