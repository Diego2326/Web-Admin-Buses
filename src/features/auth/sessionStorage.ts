import type { AuthSession } from '../../types/auth'

const SESSION_KEY = 'bus-admin-session'
const TOKEN_KEY = 'bus-admin-token'

export function getStoredSession(): AuthSession | null {
  const rawSession = window.localStorage.getItem(SESSION_KEY)

  if (!rawSession) {
    return null
  }

  try {
    return JSON.parse(rawSession) as AuthSession
  } catch {
    clearStoredSession()
    return null
  }
}

export function storeSession(session: AuthSession) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  window.localStorage.setItem(TOKEN_KEY, session.token)
}

export function clearStoredSession() {
  window.localStorage.removeItem(SESSION_KEY)
  window.localStorage.removeItem(TOKEN_KEY)
}
