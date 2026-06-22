import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { readAppStorage, writeAppStorage } from '@/lib/app-storage';

export type ThemePref = 'light' | 'dark' | 'system';

export interface Settings {
  themePref: ThemePref;
  /** Morning briefing notification time, "HH:MM" 24h. */
  morningTime: string;
  eveningEnabled: boolean;
  /** Evening reflection notification time, "HH:MM" 24h. */
  eveningTime: string;
  notificationsEnabled: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  themePref: 'system',
  morningTime: '07:00',
  // Evening reflection is off by default the first week (UX_AND_ROADMAP §1).
  eveningEnabled: false,
  eveningTime: '21:00',
  notificationsEnabled: false,
};

const STORAGE_KEY = 'lifeos.settings.v1';

interface SettingsContextValue {
  settings: Settings;
  loading: boolean;
  updateSettings: (partial: Partial<Settings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function parseSettings(raw: string | null): Settings {
  if (!raw) {
    return DEFAULT_SETTINGS;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const raw = await readAppStorage(STORAGE_KEY);
        if (active) {
          setSettings(parseSettings(raw));
        }
      } catch {
        // Fall back to defaults; settings are non-critical.
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const updateSettings = useCallback(async (partial: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      void writeAppStorage(STORAGE_KEY, JSON.stringify(next)).catch(() => {
        // Persist failures are non-fatal; in-memory state still updates.
      });
      return next;
    });
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, loading, updateSettings }),
    [settings, loading, updateSettings],
  );

  return createElement(SettingsContext.Provider, { value }, children);
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return ctx;
}
