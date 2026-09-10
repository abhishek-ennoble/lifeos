/**
 * Temporal grounding for prompts and date math.
 *
 * Without this the classifier had no idea what "today" was and resolved
 * "wake me tomorrow at 6am" (asked 2026-06-30) to 2025-01-10. Every prompt
 * that touches dates must include `describeNow()`; every "today" computation
 * must use `localDateString()` in the user's timezone, not UTC.
 */

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

/** Accept only IANA zones the runtime knows; fall back to the default. */
export function resolveTimezone(candidate: unknown): string {
  if (typeof candidate !== 'string' || !candidate.trim()) {
    return DEFAULT_TIMEZONE;
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

/** Accept an ISO timestamp from the client; fall back to server time. */
export function resolveNow(candidate: unknown): Date {
  if (typeof candidate === 'string') {
    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date();
}

interface LocalParts {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  weekday: string;
  offset: string;
}

function localParts(now: Date, timeZone: string): LocalParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    weekday: 'long',
    timeZoneName: 'longOffset',
  });
  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(now)) {
    parts[part.type] = part.value;
  }
  return {
    year: parts.year ?? '',
    month: parts.month ?? '',
    day: parts.day ?? '',
    hour: parts.hour ?? '',
    minute: parts.minute ?? '',
    weekday: parts.weekday ?? '',
    offset: (parts.timeZoneName ?? 'GMT').replace('GMT', 'UTC'),
  };
}

/** "YYYY-MM-DD" for `now` in the given zone (the user's "today"). */
export function localDateString(now: Date, timeZone: string): string {
  const p = localParts(now, timeZone);
  return `${p.year}-${p.month}-${p.day}`;
}

/**
 * The UTC instant of local midnight for `dateStr` ("YYYY-MM-DD") in `timeZone`.
 * Lets "today's reminders" mean the user's day, not the server's.
 */
export function zonedStartOfDay(dateStr: string, timeZone: string): Date {
  const guess = new Date(`${dateStr}T00:00:00Z`);
  const p = localParts(guess, timeZone);
  const shownAsUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
  );
  const offsetMs = shownAsUtc - guess.getTime();
  return new Date(guess.getTime() - offsetMs);
}

/**
 * Prompt block that anchors all relative-date reasoning. Kept terse and
 * stable in wording so prompt caching still applies to the prefix above it.
 */
export function describeNow(now: Date, timeZone: string): string {
  const p = localParts(now, timeZone);
  return [
    `Current date and time: ${p.weekday}, ${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute} (${timeZone}, ${p.offset}).`,
    `Resolve every relative expression ("tomorrow", "next Monday", "at 6pm", "in 10 mins") against this moment, in this timezone.`,
    `Never output a date in a year earlier than ${p.year}. Output timestamps as ISO 8601 with offset.`,
  ].join('\n');
}
