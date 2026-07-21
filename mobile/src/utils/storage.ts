import { Platform } from 'react-native'

const isWeb = Platform.OS === 'web'

function getLocalStorage() {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    return getLocalStorage()?.getItem(key) ?? null
  }
  try {
    const SecureStore = await import('expo-secure-store')
    return await SecureStore.getItemAsync(key)
  } catch {
    return null
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    getLocalStorage()?.setItem(key, value)
    return
  }
  try {
    const SecureStore = await import('expo-secure-store')
    await SecureStore.setItemAsync(key, value)
  } catch { /* ignore */ }
}

export async function removeItem(key: string): Promise<void> {
  if (isWeb) {
    getLocalStorage()?.removeItem(key)
    return
  }
  try {
    const SecureStore = await import('expo-secure-store')
    await SecureStore.deleteItemAsync(key)
  } catch { /* ignore */ }
}
