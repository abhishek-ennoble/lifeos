export const DOMAINS = {
  HEALTH: 'health',
  TASK: 'task',
  LEARNING: 'learning',
  IDEA: 'idea',
  NOTE: 'note',
  // Manual reflective entry type. NOT an AI routing target — created only via
  // the journal / evening-reflection flow. Lifecycle differs from notes:
  // no expiry, no action, never nags.
  JOURNAL: 'journal',
} as const;

export type Domain = (typeof DOMAINS)[keyof typeof DOMAINS];

export const DOMAIN_LABELS: Record<Domain, string> = {
  [DOMAINS.HEALTH]: 'Health',
  [DOMAINS.TASK]: 'Tasks',
  [DOMAINS.LEARNING]: 'Learning',
  [DOMAINS.IDEA]: 'Ideas',
  [DOMAINS.NOTE]: 'Notes',
  [DOMAINS.JOURNAL]: 'Journal',
};

/**
 * Routing targets the AI classifier is allowed to choose from.
 * Journal is intentionally excluded — it is manual-only.
 */
export const ALL_DOMAINS: Domain[] = [
  DOMAINS.HEALTH,
  DOMAINS.TASK,
  DOMAINS.LEARNING,
  DOMAINS.IDEA,
  DOMAINS.NOTE,
];

/**
 * Everything that can appear in the Inbox / be browsed, including the
 * manual journal type.
 */
export const BROWSABLE_DOMAINS: Domain[] = [...ALL_DOMAINS, DOMAINS.JOURNAL];

/** Domains that represent actionable work surfaced on Home's "Today" strip. */
export const ACTIONABLE_DOMAINS: Domain[] = [
  DOMAINS.HEALTH,
  DOMAINS.TASK,
  DOMAINS.LEARNING,
];

export function isDomain(value: string): value is Domain {
  return BROWSABLE_DOMAINS.includes(value as Domain);
}

export function isRoutingDomain(value: string): value is Domain {
  return ALL_DOMAINS.includes(value as Domain);
}

/**
 * Cross-cutting life-area tags (NOT new domains). Applied as metadata on any
 * entry so areas like "Creative" surface via filters/views without creating
 * extra domains. See docs/product/UX_AND_ROADMAP.md section 1.
 */
export const LIFE_AREAS = {
  SPIRITUAL: 'spiritual',
  CREATIVE: 'creative',
  TECHNICAL: 'technical',
  FAMILY: 'family',
  FINANCE: 'finance',
} as const;

export type LifeArea = (typeof LIFE_AREAS)[keyof typeof LIFE_AREAS];

export const LIFE_AREA_LABELS: Record<LifeArea, string> = {
  [LIFE_AREAS.SPIRITUAL]: 'Spiritual',
  [LIFE_AREAS.CREATIVE]: 'Creative',
  [LIFE_AREAS.TECHNICAL]: 'Technical',
  [LIFE_AREAS.FAMILY]: 'Family',
  [LIFE_AREAS.FINANCE]: 'Finance',
};

export const ALL_LIFE_AREAS: LifeArea[] = [
  LIFE_AREAS.SPIRITUAL,
  LIFE_AREAS.CREATIVE,
  LIFE_AREAS.TECHNICAL,
  LIFE_AREAS.FAMILY,
  LIFE_AREAS.FINANCE,
];

export function isLifeArea(value: string): value is LifeArea {
  return ALL_LIFE_AREAS.includes(value as LifeArea);
}
