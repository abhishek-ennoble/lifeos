import { ACTIONABLE_DOMAINS, DOMAINS, type Domain } from '@/constants/domains';
import type { Entry, EntryPriority } from '@/types/entry';

const PRIORITY_WEIGHT: Record<EntryPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/** Reflective / ephemeral types never appear on the "Today" action strip. */
export function isActionable(entry: Entry): boolean {
  return (
    entry.status === 'pending' &&
    ACTIONABLE_DOMAINS.includes(entry.domain) &&
    entry.domain !== DOMAINS.NOTE &&
    entry.domain !== DOMAINS.JOURNAL
  );
}

function dueRank(entry: Entry): number {
  if (!entry.due_at) {
    return Number.POSITIVE_INFINITY;
  }
  return new Date(entry.due_at).getTime();
}

/**
 * Ruthlessly select the few things that matter today (DESIGN_SYSTEM §4: max 3).
 * Ordering: soonest due, then priority, then recurring habits, then newest.
 */
export function selectToday(entries: Entry[], limit = 3): Entry[] {
  return entries
    .filter(isActionable)
    .sort((a, b) => {
      const dueDiff = dueRank(a) - dueRank(b);
      if (dueDiff !== 0 && Number.isFinite(dueDiff)) {
        return dueDiff;
      }
      const prioDiff = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
      if (prioDiff !== 0) {
        return prioDiff;
      }
      if (a.is_recurring !== b.is_recurring) {
        return a.is_recurring ? -1 : 1;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, limit);
}

/** Short, human meta line for an entry on the Today strip. */
export function todayMeta(entry: Entry): string | null {
  if (entry.domain === DOMAINS.HEALTH) {
    const times = (entry.metadata as { times?: string[] } | null)?.times ?? [];
    if (times.length > 0) {
      return times.join(' · ');
    }
  }
  if (entry.due_at) {
    const due = new Date(entry.due_at);
    return due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  return null;
}

export function countByDomain(entries: Entry[]): Record<Domain, number> {
  const counts = {
    [DOMAINS.HEALTH]: 0,
    [DOMAINS.TASK]: 0,
    [DOMAINS.LEARNING]: 0,
    [DOMAINS.IDEA]: 0,
    [DOMAINS.NOTE]: 0,
    [DOMAINS.JOURNAL]: 0,
  } as Record<Domain, number>;
  for (const entry of entries) {
    counts[entry.domain] = (counts[entry.domain] ?? 0) + 1;
  }
  return counts;
}
