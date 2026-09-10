import { describe, expect, it } from 'vitest';

import {
  DEFAULT_TIMEZONE,
  describeNow,
  localDateString,
  resolveNow,
  resolveTimezone,
  zonedStartOfDay,
} from '../supabase/functions/_shared/temporal';

// 2026-06-30 18:38 UTC == 2026-07-01 00:08 IST. The date the "wake up
// tomorrow at 6" capture was made (it resolved to 2025-01-10 without grounding).
const LATE_EVENING_UTC = new Date('2026-06-30T18:38:00Z');

describe('resolveTimezone', () => {
  it('accepts a valid IANA zone', () => {
    expect(resolveTimezone('Europe/Dublin')).toBe('Europe/Dublin');
  });

  it('falls back for garbage, empty, or non-string input', () => {
    expect(resolveTimezone('Mars/Olympus')).toBe(DEFAULT_TIMEZONE);
    expect(resolveTimezone('')).toBe(DEFAULT_TIMEZONE);
    expect(resolveTimezone(undefined)).toBe(DEFAULT_TIMEZONE);
    expect(resolveTimezone(42)).toBe(DEFAULT_TIMEZONE);
  });
});

describe('resolveNow', () => {
  it('parses a valid ISO timestamp', () => {
    expect(resolveNow('2026-09-10T10:00:00Z').toISOString()).toBe('2026-09-10T10:00:00.000Z');
  });

  it('falls back to server time for invalid input', () => {
    const before = Date.now();
    const resolved = resolveNow('not-a-date').getTime();
    expect(resolved).toBeGreaterThanOrEqual(before);
  });
});

describe('localDateString', () => {
  it('rolls the calendar day forward in IST when UTC has not', () => {
    expect(localDateString(LATE_EVENING_UTC, 'UTC')).toBe('2026-06-30');
    expect(localDateString(LATE_EVENING_UTC, 'Asia/Kolkata')).toBe('2026-07-01');
  });
});

describe('zonedStartOfDay', () => {
  it('returns local midnight as a UTC instant for a +05:30 zone', () => {
    expect(zonedStartOfDay('2026-07-01', 'Asia/Kolkata').toISOString()).toBe(
      '2026-06-30T18:30:00.000Z',
    );
  });

  it('is identity for UTC', () => {
    expect(zonedStartOfDay('2026-07-01', 'UTC').toISOString()).toBe('2026-07-01T00:00:00.000Z');
  });

  it('handles a negative offset zone', () => {
    // New York in July is UTC-4.
    expect(zonedStartOfDay('2026-07-01', 'America/New_York').toISOString()).toBe(
      '2026-07-01T04:00:00.000Z',
    );
  });
});

describe('describeNow', () => {
  it('states the local date, weekday, zone, and forbids earlier years', () => {
    const block = describeNow(LATE_EVENING_UTC, 'Asia/Kolkata');
    expect(block).toContain('Wednesday, 2026-07-01 00:08');
    expect(block).toContain('Asia/Kolkata');
    expect(block).toContain('UTC+05:30');
    expect(block).toContain('Never output a date in a year earlier than 2026');
  });
});
