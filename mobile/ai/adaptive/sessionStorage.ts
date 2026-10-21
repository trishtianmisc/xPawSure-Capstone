import AsyncStorage from '@react-native-async-storage/async-storage'

import type { AdaptiveSession } from './types.ts'
import { deserializeSession, serializeSession } from './session.ts'

const STORAGE_KEY = 'xpawsure_adaptive_questionnaire_session_v1'

/**
 * Load a persisted questionnaire session for the same image/pet screening.
 * Corrupt or stale state is discarded rather than resumed.
 */
export async function loadAdaptiveSession(
  sessionKey: string,
): Promise<AdaptiveSession | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const session = deserializeSession(raw)
    if (!session || session.sessionKey !== sessionKey) {
      await AsyncStorage.removeItem(STORAGE_KEY)
      return null
    }

    return session
  } catch {
    return null
  }
}

export async function saveAdaptiveSession(session: AdaptiveSession): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, serializeSession(session))
  } catch {
    // Persistence is best-effort. A storage failure must not interrupt the
    // questionnaire or lose the in-memory session.
  }
}

export async function clearAdaptiveSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore storage cleanup failures.
  }
}
