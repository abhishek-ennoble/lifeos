/** Pure URL parsing for Supabase auth callbacks (unit-testable, no RN imports). */

export function parseAuthParamsFromUrl(url: string): Record<string, string> {
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');
  let paramString = '';
  if (hashIndex >= 0) {
    paramString = url.slice(hashIndex + 1);
  } else if (queryIndex >= 0) {
    paramString = url.slice(queryIndex + 1);
  }

  const params: Record<string, string> = {};
  for (const part of paramString.split('&')) {
    if (!part) {
      continue;
    }
    const eq = part.indexOf('=');
    const key = eq === -1 ? part : part.slice(0, eq);
    const value = eq === -1 ? '' : part.slice(eq + 1);
    try {
      params[key] = decodeURIComponent(value.replace(/\+/g, ' '));
    } catch {
      params[key] = value;
    }
  }
  return params;
}

export function isAuthCallbackUrl(url: string): boolean {
  return url.includes('auth/callback') || url.includes('type=recovery');
}
