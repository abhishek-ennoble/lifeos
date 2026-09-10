/**
 * Per-user profile (display name) stored in `user_preferences.preferences`
 * with a local cache for offline-first reads. Cloud is the source of truth
 * so the name survives reinstall and follows the account across devices.
 */

import { readAppStorage, writeAppStorage } from '@/lib/app-storage';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Json } from '@/lib/database.types';

const PROFILE_STORAGE_KEY = 'lifeos.profile.v1';

export interface Profile {
  displayName: string | null;
}

interface StoredProfile {
  display_name?: string | null;
}

function parseStored(raw: string | null): Profile {
  if (!raw) {
    return { displayName: null };
  }
  try {
    const parsed = JSON.parse(raw) as StoredProfile;
    const name = typeof parsed.display_name === 'string' ? parsed.display_name.trim() : '';
    return { displayName: name || null };
  } catch {
    return { displayName: null };
  }
}

export async function readLocalProfile(): Promise<Profile> {
  try {
    return parseStored(await readAppStorage(PROFILE_STORAGE_KEY));
  } catch {
    return { displayName: null };
  }
}

async function writeLocalProfile(profile: Profile): Promise<void> {
  try {
    await writeAppStorage(
      PROFILE_STORAGE_KEY,
      JSON.stringify({ display_name: profile.displayName }),
    );
  } catch {
    // Local cache write is best-effort; cloud remains authoritative.
  }
}

/** Fetch display name from user_preferences; null when unset or offline. */
export async function fetchCloudDisplayName(): Promise<string | null> {
  try {
    if (!isSupabaseConfigured) {
      return null;
    }
    const { data, error } = await supabase
      .from('user_preferences')
      .select('preferences')
      .maybeSingle();
    if (error || !data) {
      return null;
    }
    const prefs = data.preferences as { display_name?: unknown } | null;
    const name = typeof prefs?.display_name === 'string' ? prefs.display_name.trim() : '';
    return name || null;
  } catch {
    return null;
  }
}

/** Persist display name to cloud (merging preferences) + local cache. */
export async function saveDisplayName(displayName: string): Promise<boolean> {
  const trimmed = displayName.trim();
  if (!trimmed) {
    return false;
  }

  await writeLocalProfile({ displayName: trimmed });

  try {
    if (!isSupabaseConfigured) {
      return false;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return false;
    }

    const { data: existing } = await supabase
      .from('user_preferences')
      .select('preferences')
      .maybeSingle();

    const merged = {
      ...((existing?.preferences as Record<string, unknown> | null) ?? {}),
      display_name: trimmed,
    };

    const { error } = await supabase.from('user_preferences').upsert({
      user_id: user.id,
      preferences: merged as Json,
      updated_at: new Date().toISOString(),
    });

    return !error;
  } catch {
    return false;
  }
}

/**
 * Load profile: local cache first (fast, offline-safe), then cloud.
 * If local has a name the cloud lacks (e.g. saved offline), push it up.
 */
export async function loadProfile(): Promise<Profile> {
  const local = await readLocalProfile();
  const cloudName = await fetchCloudDisplayName();

  if (cloudName) {
    if (cloudName !== local.displayName) {
      await writeLocalProfile({ displayName: cloudName });
    }
    return { displayName: cloudName };
  }

  if (local.displayName) {
    // Cloud missing but local present — retry the sync in the background.
    void saveDisplayName(local.displayName);
    return local;
  }

  return { displayName: null };
}
