import { useCallback, useEffect, useState } from 'react';

import { loadProfile, saveDisplayName, type Profile } from '@/lib/profile';

interface UseProfileResult {
  profile: Profile;
  loading: boolean;
  /** True after the initial load resolved (cloud + local checked). */
  ready: boolean;
  updateDisplayName: (name: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useProfile(): UseProfileResult {
  const [profile, setProfile] = useState<Profile>({ displayName: null });
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setProfile(await loadProfile());
    } catch {
      // Keep prior profile; greeting degrades gracefully without a name.
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const updateDisplayName = useCallback(async (name: string): Promise<boolean> => {
    const trimmed = name.trim();
    if (!trimmed) {
      return false;
    }
    setProfile({ displayName: trimmed });
    return saveDisplayName(trimmed);
  }, []);

  return { profile, loading, ready, updateDisplayName, refresh };
}
