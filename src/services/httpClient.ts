import axios from 'axios'

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api',
  timeout: 12000,
  headers: {
    'Content-Type': 'application/json',
  },
})

httpClient.interceptors.request.use((config) => {
  const token = window.localStorage.getItem('bus-admin-token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})
