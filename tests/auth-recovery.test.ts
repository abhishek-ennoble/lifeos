import { describe, expect, it } from 'vitest';

import { isAuthCallbackUrl, parseAuthParamsFromUrl } from '@/lib/auth-recovery-core';

describe('parseAuthParamsFromUrl', () => {
  it('reads hash-fragment tokens from a Supabase recovery link', () => {
    const url =
      'lifeos://auth/callback#access_token=abc123&refresh_token=def456&type=recovery';
    expect(parseAuthParamsFromUrl(url)).toEqual({
      access_token: 'abc123',
      refresh_token: 'def456',
      type: 'recovery',
    });
  });

  it('reads query-string params when there is no hash', () => {
    const url = 'lifeos://auth/callback?code=pkce-code-1';
    expect(parseAuthParamsFromUrl(url)).toEqual({ code: 'pkce-code-1' });
  });
});

describe('isAuthCallbackUrl', () => {
  it('matches auth callback and recovery URLs', () => {
    expect(isAuthCallbackUrl('lifeos://auth/callback#type=recovery')).toBe(true);
    expect(isAuthCallbackUrl('https://example.com/home')).toBe(false);
  });
});
