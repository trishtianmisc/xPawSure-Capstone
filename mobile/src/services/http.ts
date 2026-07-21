import axios from 'axios'

import { getItem, removeItem, setItem } from '../utils/storage'

const STORAGE_ACCESS = 'xpawsure_access_token'
const STORAGE_REFRESH = 'xpawsure_refresh_token'
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api'

async function loadToken(): Promise<string | null> {
  return getItem(STORAGE_ACCESS)
}

async function loadRefreshToken(): Promise<string | null> {
  return getItem(STORAGE_REFRESH)
}

async function saveTokens(access: string, refresh: string): Promise<void> {
  await setItem(STORAGE_ACCESS, access)
  await setItem(STORAGE_REFRESH, refresh)
}

async function clearTokens(): Promise<void> {
  await removeItem(STORAGE_ACCESS)
  await removeItem(STORAGE_REFRESH)
}

const http = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

http.interceptors.request.use(async (config) => {
  const token = await loadToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else if (token) {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && error.config && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return http(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const refreshToken = await loadRefreshToken()
        if (!refreshToken) {
          throw new Error('No refresh token')
        }

        const { data } = await axios.post(`${API_URL}/auth/refresh/`, {
          refresh: refreshToken,
        })

        await saveTokens(data.access, data.refresh || refreshToken)
        processQueue(null, data.access)
        originalRequest.headers.Authorization = `Bearer ${data.access}`
        return http(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        await clearTokens()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

export { http, saveTokens, clearTokens, loadRefreshToken }
