/**
 * Pure greeting helpers — no React Native imports so they stay unit-testable.
 */

/** First word of a display name, trimmed; null when nothing usable. */
export function firstNameOf(displayName: string | null | undefined): string | null {
  const trimmed = (displayName ?? '').trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.split(/\s+/)[0];
}

/**
 * Time-aware greeting, personalized when a name is known.
 * Falls back to the bare greeting so a new user never sees someone else's name.
 */
export function greetingForHour(hour: number, displayName: string | null): string {
  const base =
    hour < 5
      ? 'Still up'
      : hour < 12
        ? 'Good morning'
        : hour < 17
          ? 'Good afternoon'
          : 'Good evening';

  const name = firstNameOf(displayName);
  return name ? `${base}, ${name}` : base;
}
