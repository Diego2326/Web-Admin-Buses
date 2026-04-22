import type { AuthSession, LoginCredentials } from '../../types/auth'

export async function loginWithMock(credentials: LoginCredentials): Promise<AuthSession> {
  await new Promise((resolve) => window.setTimeout(resolve, 250))

  const isValidEmail = credentials.email.trim().toLowerCase() === 'admin@buses.gt'
  const isValidPassword = credentials.password === 'admin123'

  if (!isValidEmail || !isValidPassword) {
    throw new Error('Credenciales administrativas invalidas.')
  }

  return {
    token: 'mock-admin-token',
    user: {
      id: 'admin-01',
      name: 'Administrador',
      email: 'admin@buses.gt',
      role: 'Administrador',
    },
  }
}
