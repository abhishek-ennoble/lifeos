import { describe, expect, it } from 'vitest';

import { selectFiredUnsent } from '@/lib/reminder-sync-core';

const NOW = new Date('2026-09-10T10:00:00Z');

describe('selectFiredUnsent (D2 reconcile predicate)', () => {
  it('selects rows whose fire_at has passed', () => {
    const rows = [
      { id: 'past', fire_at: '2026-09-10T09:00:00Z' },
      { id: 'future', fire_at: '2026-09-10T11:00:00Z' },
    ];
    expect(selectFiredUnsent(rows, NOW).map((r) => r.id)).toEqual(['past']);
  });

  it('tolerates small clock skew ahead of now', () => {
    const rows = [{ id: 'skew', fire_at: '2026-09-10T10:04:00Z' }];
    expect(selectFiredUnsent(rows, NOW, 5 * 60 * 1000)).toHaveLength(1);
    expect(selectFiredUnsent(rows, NOW, 0)).toHaveLength(0);
  });

  it('returns nothing for an empty set', () => {
    expect(selectFiredUnsent([], NOW)).toEqual([]);
  });
});
