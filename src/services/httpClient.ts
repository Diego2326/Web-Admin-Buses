import axios from 'axios'

export const httpClient = axios.create({
  baseURL: 'https://buses-api-322217156017.northamerica-south1.run.app/api/v1',
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
