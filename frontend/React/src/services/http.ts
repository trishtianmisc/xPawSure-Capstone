import axios from 'axios'

const STORAGE_KEY_ACCESS = 'xpawsure_access_token'

function loadToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_ACCESS) ?? sessionStorage.getItem(STORAGE_KEY_ACCESS)
  } catch {
    return null
  }
}

function clearAuthStorage(): void {
  const keys = [
    'xpawsure_user',
    'xpawsure_access_token',
    'xpawsure_refresh_token',
  ]
  for (const key of keys) {
    try {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
    } catch {
      /* storage unavailable */
    }
  }
}

const http = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

http.interceptors.request.use(
  (config) => {
    const token = loadToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const hadSession = !!loadToken()
      if (hadSession) {
        clearAuthStorage()
        window.dispatchEvent(new CustomEvent('session-expired'))
      }
    }
    return Promise.reject(error)
  },
)

export default http
