import { DOMAINS } from '@/constants/domains';
import type { Entry } from '@/types/entry';

export function getIdeaThread(entry: Entry): string | null {
  if (entry.domain !== DOMAINS.IDEA) {
    return null;
  }
  const thread = (entry.metadata as { thread?: string } | null)?.thread;
  if (typeof thread !== 'string') {
    return null;
  }
  const trimmed = thread.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function collectIdeaThreads(entries: Entry[]): string[] {
  const threads = new Set<string>();
  for (const entry of entries) {
    const thread = getIdeaThread(entry);
    if (thread) {
      threads.add(thread);
    }
  }
  return [...threads].sort((a, b) => a.localeCompare(b));
}
