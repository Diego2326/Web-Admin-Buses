import { useMemo, useState, type PropsWithChildren } from 'react'
import type { AuthSession, LoginCredentials } from '../../types/auth'
import { clearStoredSession, getStoredSession, storeSession } from './sessionStorage'
import { loginWithMock } from './authService'
import { AuthContext, type AuthContextValue } from './authContextValue'

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(() => getStoredSession())

  async function login(credentials: LoginCredentials) {
    const nextSession = await loginWithMock(credentials)
    storeSession(nextSession)
    setSession(nextSession)
  }

  function logout() {
    clearStoredSession()
    setSession(null)
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isAuthenticated: Boolean(session),
      login,
      logout,
    }),
    [session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
