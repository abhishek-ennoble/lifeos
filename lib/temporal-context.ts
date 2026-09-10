/**
 * The device's clock and IANA timezone, sent with every AI call that reasons
 * about dates (classify, briefing). Server functions treat both as optional
 * hints and validate them (`supabase/functions/_shared/temporal.ts`).
 */

export interface TemporalContext {
  client_now: string;
  timezone: string;
}

const FALLBACK_TIMEZONE = 'Asia/Kolkata';

export function deviceTimezone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return zone && zone.trim() ? zone : FALLBACK_TIMEZONE;
  } catch {
    return FALLBACK_TIMEZONE;
  }
}

export function temporalContext(now: Date = new Date()): TemporalContext {
  return { client_now: now.toISOString(), timezone: deviceTimezone() };
}

/** "YYYY-MM-DD" for `now` in the device's zone — the user's "today". */
export function localDateString(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: deviceTimezone(),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const pick = (type: string): string => parts.find((p) => p.type === type)?.value ?? '';
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}
