export type AuthUser = {
  id: string
  name: string
  email: string
  role: 'Administrador'
}

export type LoginCredentials = {
  email: string
  password: string
}

export type AuthSession = {
  token: string
  user: AuthUser
}
