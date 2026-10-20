import axios from 'axios'

const STORAGE_KEY_ACCESS = 'xpawsure_access_token'
const STORAGE_KEY_REFRESH = 'xpawsure_refresh_token'

function loadFromStorage(key: string): string | null {
  try {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function saveToStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    try {
      sessionStorage.setItem(key, value)
    } catch {
      /* storage unavailable */
    }
  }
}

function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  } catch {
    /* storage unavailable */
  }
}

function clearAuthStorage(): void {
  removeFromStorage('xpawsure_user')
  removeFromStorage(STORAGE_KEY_ACCESS)
  removeFromStorage(STORAGE_KEY_REFRESH)
}

// Local development uses Vite's /api proxy. In production the frontend is on
// Cloudflare Pages and the backend is a separate Render service, so the full
// API base URL is supplied at build time (for example
// https://xpawsure-api.onrender.com/api). Strip trailing slashes so callers
// can append paths safely.
const configuredApiUrl = import.meta.env.VITE_API_URL?.trim()
const API_BASE_URL = (configuredApiUrl || '/api').replace(/\/+$/, '')

const http = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

http.interceptors.request.use(
  (config) => {
    const token = loadFromStorage(STORAGE_KEY_ACCESS)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

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

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
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
        const refreshToken = loadFromStorage(STORAGE_KEY_REFRESH)
        if (!refreshToken) {
          throw new Error('No refresh token')
        }

        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
          refresh: refreshToken,
        })

        saveToStorage(STORAGE_KEY_ACCESS, data.access)
        saveToStorage(STORAGE_KEY_REFRESH, data.refresh || refreshToken)
        processQueue(null, data.access)
        originalRequest.headers.Authorization = `Bearer ${data.access}`
        return http(originalRequest)
      } catch {
        processQueue(null, null)
        clearAuthStorage()
        window.dispatchEvent(new CustomEvent('session-expired'))
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

export default http
