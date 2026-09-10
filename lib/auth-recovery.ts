/**
 * Password recovery deep links for Supabase Auth on mobile.
 * Redirect URL must be allowlisted in Supabase Dashboard → Auth → URL Configuration.
 */

import * as Linking from 'expo-linking';

import { isAuthCallbackUrl, parseAuthParamsFromUrl } from '@/lib/auth-recovery-core';
import { supabase } from '@/lib/supabase';

export { isAuthCallbackUrl, parseAuthParamsFromUrl } from '@/lib/auth-recovery-core';

/** Where Supabase sends the user after tapping the reset link in email. */
export function passwordResetRedirectUrl(): string {
  return Linking.createURL('auth/callback');
}

/**
 * Exchange tokens from a reset-password deep link for a session.
 * Returns true when a session was established (user can set a new password).
 */
export async function applyAuthSessionFromUrl(url: string): Promise<boolean> {
  const params = parseAuthParamsFromUrl(url);
  const accessToken = params.access_token;
  const refreshToken = params.refresh_token;

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      throw error;
    }
    return true;
  }

  const code = params.code;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      throw error;
    }
    return true;
  }

  return false;
}
