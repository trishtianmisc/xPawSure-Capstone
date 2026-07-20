import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

const STORAGE_ACCESS = 'xpawsure_access_token'
const STORAGE_REFRESH = 'xpawsure_refresh_token'
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api'

async function loadToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(STORAGE_ACCESS)
  } catch {
    return null
  }
}

async function saveTokens(access: string, refresh: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_ACCESS, access)
    await SecureStore.setItemAsync(STORAGE_REFRESH, refresh)
  } catch { /* ignore */ }
}

async function clearTokens(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(STORAGE_ACCESS)
    await SecureStore.deleteItemAsync(STORAGE_REFRESH)
  } catch { /* ignore */ }
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

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await clearTokens()
    }
    return Promise.reject(error)
  },
)

export { http, saveTokens, clearTokens }
