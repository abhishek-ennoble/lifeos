import { DOMAINS } from '@/constants/domains';
import { entryHasScheduledReminder } from '@/lib/reminder-plan';
import type { Entry, EntryPriority } from '@/types/entry';

export type InboxSortMode = 'newest' | 'oldest' | 'due_soonest' | 'priority';

export interface InboxFilters {
  /** When true, hide done/snoozed/archived entries. */
  pendingOnly: boolean;
  /** When true, only entries with a scheduled reminder. */
  hasReminder: boolean;
  /** When true, only entries with due_at set. */
  hasDueDate: boolean;
}

export const DEFAULT_INBOX_FILTERS: InboxFilters = {
  pendingOnly: true,
  hasReminder: false,
  hasDueDate: false,
};

export const INBOX_SORT_LABELS: Record<InboxSortMode, string> = {
  newest: 'Newest',
  oldest: 'Oldest',
  due_soonest: 'Due soon',
  priority: 'Priority',
};

const PRIORITY_RANK: Record<EntryPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function entryMatchesInboxFilters(entry: Entry, filters: InboxFilters): boolean {
  if (filters.pendingOnly && entry.status !== 'pending') {
    // Journals are saved as done by design — still browsable in Inbox.
    if (entry.domain !== DOMAINS.JOURNAL) {
      return false;
    }
  }
  if (filters.hasReminder && !entryHasScheduledReminder(entry)) {
    return false;
  }
  if (filters.hasDueDate && !entry.due_at) {
    return false;
  }
  return true;
}

export function sortInboxEntries(entries: Entry[], sortMode: InboxSortMode): Entry[] {
  const sorted = [...entries];

  switch (sortMode) {
    case 'newest':
      sorted.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
      break;
    case 'oldest':
      sorted.sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
      break;
    case 'due_soonest':
      sorted.sort((a, b) => {
        const aDue = a.due_at ? Date.parse(a.due_at) : Number.POSITIVE_INFINITY;
        const bDue = b.due_at ? Date.parse(b.due_at) : Number.POSITIVE_INFINITY;
        if (aDue !== bDue) {
          return aDue - bDue;
        }
        return Date.parse(b.created_at) - Date.parse(a.created_at);
      });
      break;
    case 'priority':
      sorted.sort((a, b) => {
        const rankDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        if (rankDiff !== 0) {
          return rankDiff;
        }
        return Date.parse(b.created_at) - Date.parse(a.created_at);
      });
      break;
  }

  return sorted;
}

export function countActiveInboxFilters(filters: InboxFilters): number {
  let count = 0;
  if (!filters.pendingOnly) {
    count++;
  }
  if (filters.hasReminder) {
    count++;
  }
  if (filters.hasDueDate) {
    count++;
  }
  return count;
}
