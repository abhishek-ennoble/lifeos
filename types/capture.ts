import type { Entry } from '@/types/entry';

export type CaptureResult = { kind: 'entry'; entry: Entry } | { kind: 'feedback' };
