export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5;

export function nextIntervalDays(
  currentIntervalDays: number,
  quality: ReviewQuality,
): number {
  if (quality >= 3) {
    return Math.max(1, Math.round(currentIntervalDays * 2.5));
  }
  return 1;
}

export function nextReviewDate(
  lastReviewedAt: Date,
  intervalDays: number,
  quality: ReviewQuality,
): Date {
  const newInterval = nextIntervalDays(intervalDays, quality);
  const next = new Date(lastReviewedAt);
  next.setDate(next.getDate() + newInterval);
  return next;
}

export function isLearningDue(
  lastReviewedAt: string | null,
  intervalDays: number,
): boolean {
  if (!lastReviewedAt) {
    return true;
  }

  const due = new Date(lastReviewedAt);
  due.setDate(due.getDate() + intervalDays);
  return due <= new Date();
}
