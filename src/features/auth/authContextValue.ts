import { createContext } from 'react'
import type { AuthSession, LoginCredentials } from '../../types/auth'

export type AuthContextValue = {
  session: AuthSession | null
  isAuthenticated: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
