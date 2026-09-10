import { describe, expect, it } from 'vitest';

import {
  answerFollowUp,
  countPendingFollowUps,
  entriesWithPendingFollowUps,
  getFollowUps,
  pendingFollowUps,
  sourceBadge,
  thoughtTime,
} from '@/lib/follow-ups';
import type { Entry, IdeaMetadata } from '@/types/entry';

function makeEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 'e1',
    user_id: 'u1',
    raw_input: null,
    domain: 'idea',
    title: 'Idea',
    description: null,
    metadata: null,
    priority: 'medium',
    status: 'pending',
    is_recurring: false,
    recurrence_rule: null,
    due_at: null,
    expires_at: null,
    last_reviewed_at: null,
    created_at: '2026-09-10T10:00:00Z',
    updated_at: '2026-09-10T10:00:00Z',
    ...overrides,
  };
}

const META: IdeaMetadata = {
  tag: 'product',
  research_ready: false,
  source: 'whatsapp_import',
  original_at: '2026-08-15T09:00:00Z',
  follow_ups: [
    { id: 'q1', question: 'Who is it for?', asked_by: 'system', asked_at: '2026-09-10T10:00:00Z' },
    {
      id: 'q2',
      question: 'Why now?',
      asked_by: 'system',
      asked_at: '2026-09-10T10:00:00Z',
      answer: 'Because.',
      answered_at: '2026-09-10T11:00:00Z',
    },
  ],
};

describe('follow-ups helpers', () => {
  it('reads and filters malformed follow-ups', () => {
    const entry = makeEntry({
      metadata: { ...META, follow_ups: [...(META.follow_ups ?? []), { bad: true } as never] },
    });
    expect(getFollowUps(entry)).toHaveLength(2);
  });

  it('separates pending from answered', () => {
    const entry = makeEntry({ metadata: META });
    expect(pendingFollowUps(entry).map((q) => q.id)).toEqual(['q1']);
  });

  it('answers immutably and stamps answered_at', () => {
    const at = new Date('2026-09-11T00:00:00Z');
    const next = answerFollowUp(META, 'q1', '  Villagers  ', at) as IdeaMetadata;
    expect(next.follow_ups?.[0]).toMatchObject({
      id: 'q1',
      answer: 'Villagers',
      answered_at: at.toISOString(),
    });
    expect(META.follow_ups?.[0].answer).toBeUndefined();
    expect(next.tag).toBe('product');
  });

  it('counts and lists entries with pending questions, skipping archived', () => {
    const entries = [
      makeEntry({ id: 'a', metadata: META, created_at: '2026-09-01T00:00:00Z' }),
      makeEntry({ id: 'b', metadata: META, created_at: '2026-09-05T00:00:00Z' }),
      makeEntry({ id: 'c', metadata: META, status: 'archived' }),
      makeEntry({ id: 'd', metadata: null }),
    ];
    expect(countPendingFollowUps(entries)).toBe(2);
    expect(entriesWithPendingFollowUps(entries).map((e) => e.id)).toEqual(['b', 'a']);
  });

  it('labels non-default sources and hides plain typed captures', () => {
    expect(sourceBadge(makeEntry({ metadata: META }))).toBe('WhatsApp');
    expect(sourceBadge(makeEntry({ metadata: { ...META, source: 'app_text' } }))).toBeNull();
    expect(sourceBadge(makeEntry())).toBeNull();
  });

  it('prefers original_at over created_at for the thought time', () => {
    expect(thoughtTime(makeEntry({ metadata: META }))).toBe('2026-08-15T09:00:00Z');
    expect(thoughtTime(makeEntry())).toBe('2026-09-10T10:00:00Z');
  });
});
