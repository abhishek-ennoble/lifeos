/**
 * Follow-up questions parked on entries (pure helpers, unit-tested).
 *
 * The queue exists so the user never has to remember "I should come back and
 * sharpen that idea". The system asks; the user answers when they want.
 * Answers are appended to the entry so later agents (IdeaBox, Researcher)
 * start from a richer brief.
 */

import type { Entry, EntryMetadata, EntrySource, FollowUp } from '@/types/entry';

interface MetadataWithFollowUps {
  follow_ups?: unknown;
  source?: unknown;
  original_at?: unknown;
}

function isFollowUp(value: unknown): value is FollowUp {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.question === 'string' &&
    (candidate.asked_by === 'system' || candidate.asked_by === 'user') &&
    typeof candidate.asked_at === 'string'
  );
}

export function getFollowUps(entry: Pick<Entry, 'metadata'>): FollowUp[] {
  const raw = (entry.metadata as MetadataWithFollowUps | null)?.follow_ups;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(isFollowUp);
}

export function pendingFollowUps(entry: Pick<Entry, 'metadata'>): FollowUp[] {
  return getFollowUps(entry).filter((item) => !item.answer || !item.answer.trim());
}

/** Entries that still have at least one unanswered question, most recent first. */
export function entriesWithPendingFollowUps(entries: Entry[]): Entry[] {
  return entries
    .filter((entry) => entry.status !== 'archived' && pendingFollowUps(entry).length > 0)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function countPendingFollowUps(entries: Entry[]): number {
  return entries.reduce(
    (total, entry) => (entry.status === 'archived' ? total : total + pendingFollowUps(entry).length),
    0,
  );
}

/** Return new metadata with the given follow-up answered (immutable). */
export function answerFollowUp(
  metadata: EntryMetadata | null,
  followUpId: string,
  answer: string,
  answeredAt: Date = new Date(),
): EntryMetadata {
  const base = (metadata ?? {}) as EntryMetadata & MetadataWithFollowUps;
  const existing = Array.isArray(base.follow_ups) ? base.follow_ups.filter(isFollowUp) : [];
  const trimmed = answer.trim();
  const updated = existing.map((item) =>
    item.id === followUpId
      ? { ...item, answer: trimmed, answered_at: answeredAt.toISOString() }
      : item,
  );
  return { ...base, follow_ups: updated } as EntryMetadata;
}

const SOURCE_LABELS: Record<EntrySource, string> = {
  app_text: 'Typed',
  app_voice: 'Voice',
  brain_dump: 'Brain dump',
  whatsapp_import: 'WhatsApp',
  share_intent: 'Shared in',
  agent: 'Assistant',
};

export function getEntrySource(entry: Pick<Entry, 'metadata'>): EntrySource | null {
  const source = (entry.metadata as MetadataWithFollowUps | null)?.source;
  return typeof source === 'string' && source in SOURCE_LABELS ? (source as EntrySource) : null;
}

/** Human label for a non-default source; null for plain in-app captures. */
export function sourceBadge(entry: Pick<Entry, 'metadata'>): string | null {
  const source = getEntrySource(entry);
  if (!source || source === 'app_text') {
    return null;
  }
  return SOURCE_LABELS[source];
}

/** The instant the thought was written: original_at for imports, else created_at. */
export function thoughtTime(entry: Pick<Entry, 'metadata' | 'created_at'>): string {
  const original = (entry.metadata as MetadataWithFollowUps | null)?.original_at;
  return typeof original === 'string' && !Number.isNaN(new Date(original).getTime())
    ? original
    : entry.created_at;
}
