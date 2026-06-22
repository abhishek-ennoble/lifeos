/**
 * Cross-platform key/value storage safe for Expo Router web SSR.
 * Avoids top-level AsyncStorage imports (their web build touches `window` at load time).
 */

import { Platform } from 'react-native';

const memory = new Map<string, string>();

function hasBrowserStorage(): boolean {
  return typeof localStorage !== 'undefined';
}

async function getAsyncStorage() {
  return (await import('@react-native-async-storage/async-storage')).default;
}

export async function readAppStorage(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return hasBrowserStorage() ? localStorage.getItem(key) : memory.get(key) ?? null;
  }

  const AsyncStorage = await getAsyncStorage();
  return AsyncStorage.getItem(key);
}

export async function writeAppStorage(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (hasBrowserStorage()) {
      localStorage.setItem(key, value);
    } else {
      memory.set(key, value);
    }
    return;
  }

  const AsyncStorage = await getAsyncStorage();
  await AsyncStorage.setItem(key, value);
}

export async function removeAppStorage(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (hasBrowserStorage()) {
      localStorage.removeItem(key);
    } else {
      memory.delete(key);
    }
    return;
  }

  const AsyncStorage = await getAsyncStorage();
  await AsyncStorage.removeItem(key);
}

/** Supabase auth session storage (SupportedStorage). */
export function createSupabaseAuthStorage() {
  if (Platform.OS === 'web') {
    return {
      getItem: async (key: string) =>
        hasBrowserStorage() ? localStorage.getItem(key) : memory.get(key) ?? null,
      setItem: async (key: string, value: string) => {
        if (hasBrowserStorage()) {
          localStorage.setItem(key, value);
        } else {
          memory.set(key, value);
        }
      },
      removeItem: async (key: string) => {
        if (hasBrowserStorage()) {
          localStorage.removeItem(key);
        } else {
          memory.delete(key);
        }
      },
    };
  }

  let asyncStorage: Awaited<ReturnType<typeof getAsyncStorage>> | null = null;

  const storage = async () => {
    if (!asyncStorage) {
      asyncStorage = await getAsyncStorage();
    }
    return asyncStorage;
  };

  return {
    getItem: async (key: string) => (await storage()).getItem(key),
    setItem: async (key: string, value: string) => (await storage()).setItem(key, value),
    removeItem: async (key: string) => (await storage()).removeItem(key),
  };
}
