import { describe, expect, it } from 'vitest';

import { firstNameOf, greetingForHour } from '@/lib/greeting';

describe('firstNameOf', () => {
  it('returns the first word of a full name', () => {
    expect(firstNameOf('Manish Kumar')).toBe('Manish');
  });

  it('trims surrounding whitespace', () => {
    expect(firstNameOf('  Abhishek  ')).toBe('Abhishek');
  });

  it('returns null for empty, whitespace, null, and undefined', () => {
    expect(firstNameOf('')).toBeNull();
    expect(firstNameOf('   ')).toBeNull();
    expect(firstNameOf(null)).toBeNull();
    expect(firstNameOf(undefined)).toBeNull();
  });

  it('handles single-word names', () => {
    expect(firstNameOf('Sanu')).toBe('Sanu');
  });
});

describe('greetingForHour', () => {
  it('covers all four time bands with a name', () => {
    expect(greetingForHour(2, 'Manish')).toBe('Still up, Manish');
    expect(greetingForHour(8, 'Manish')).toBe('Good morning, Manish');
    expect(greetingForHour(14, 'Manish')).toBe('Good afternoon, Manish');
    expect(greetingForHour(20, 'Manish')).toBe('Good evening, Manish');
  });

  it('falls back to the bare greeting when no name is known', () => {
    expect(greetingForHour(8, null)).toBe('Good morning');
    expect(greetingForHour(20, '')).toBe('Good evening');
  });

  it('uses only the first name in the greeting', () => {
    expect(greetingForHour(8, 'Manish Kumar')).toBe('Good morning, Manish');
  });

  it('handles band edges', () => {
    expect(greetingForHour(4, 'A')).toBe('Still up, A');
    expect(greetingForHour(5, 'A')).toBe('Good morning, A');
    expect(greetingForHour(11, 'A')).toBe('Good morning, A');
    expect(greetingForHour(12, 'A')).toBe('Good afternoon, A');
    expect(greetingForHour(16, 'A')).toBe('Good afternoon, A');
    expect(greetingForHour(17, 'A')).toBe('Good evening, A');
    expect(greetingForHour(23, 'A')).toBe('Good evening, A');
  });
});
