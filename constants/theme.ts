/**
 * LifeOS theme tokens — the single source of truth for color, type, spacing.
 *
 * Every value here is grounded in docs/product/DESIGN_SYSTEM.md. Components must
 * consume these tokens via hooks/useTheme.ts and never hardcode hex values, so
 * Phase 2 customization (custom themes / life areas) stays trivial.
 */
import type { Domain, LifeArea } from '@/constants/domains';
import { DOMAINS, LIFE_AREAS } from '@/constants/domains';

export type ThemeName = 'light' | 'dark';

export interface ThemeColors {
  /** App background — soft, never pure white / pure black. */
  bg: string;
  /** Card surface. */
  surface: string;
  /** Raised surface: modals, brain-dump, elevation via lighter grey not shadow. */
  surfaceRaised: string;
  textPrimary: string;
  textSecondary: string;
  /** Deep calm blue — primary actions. */
  primary: string;
  /** Readable text/icon color on top of `primary`. */
  primaryContrast: string;
  /** Soft gold — highlights, streaks, warmth. */
  accentWarm: string;
  /** Hairline borders. */
  border: string;
  /** Semantic, desaturated for WCAG safety on dark. */
  danger: string;
  success: string;
  /** Per-domain accent (used sparingly — small dots/edges, not full fills). */
  domain: Record<Domain, string>;
  /** Per-life-area accent (filter chips / views only). */
  lifeArea: Record<LifeArea, string>;
}

export const lightTheme: ThemeColors = {
  bg: '#F7F8FA',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  primary: '#2F4A7C',
  primaryContrast: '#FFFFFF',
  accentWarm: '#E8B86D',
  border: '#E5E7EB',
  danger: '#C2554E',
  success: '#3E7D5A',
  domain: {
    [DOMAINS.HEALTH]: '#C2554E',
    [DOMAINS.TASK]: '#3B6FB0',
    [DOMAINS.LEARNING]: '#7C5CB0',
    [DOMAINS.IDEA]: '#C08A3E',
    [DOMAINS.NOTE]: '#6B7280',
    [DOMAINS.JOURNAL]: '#5B7C8D',
  },
  lifeArea: {
    [LIFE_AREAS.SPIRITUAL]: '#7C5CB0',
    [LIFE_AREAS.CREATIVE]: '#C08A3E',
    [LIFE_AREAS.TECHNICAL]: '#3B6FB0',
    [LIFE_AREAS.FAMILY]: '#C2554E',
    [LIFE_AREAS.FINANCE]: '#3E7D5A',
  },
};

export const darkTheme: ThemeColors = {
  // Per Material: dark grey, never #000.
  bg: '#121316',
  surface: '#1C1E22',
  surfaceRaised: '#24272C',
  textPrimary: '#ECEDEE',
  textSecondary: '#9BA1A8',
  primary: '#8FB0E8',
  primaryContrast: '#121316',
  accentWarm: '#E8C589',
  border: '#2A2D33',
  danger: '#E08A84',
  success: '#7FB89A',
  domain: {
    [DOMAINS.HEALTH]: '#E08A84',
    [DOMAINS.TASK]: '#86A9D8',
    [DOMAINS.LEARNING]: '#B49CE0',
    [DOMAINS.IDEA]: '#E0B879',
    [DOMAINS.NOTE]: '#9BA1A8',
    [DOMAINS.JOURNAL]: '#8FB2C2',
  },
  lifeArea: {
    [LIFE_AREAS.SPIRITUAL]: '#B49CE0',
    [LIFE_AREAS.CREATIVE]: '#E0B879',
    [LIFE_AREAS.TECHNICAL]: '#86A9D8',
    [LIFE_AREAS.FAMILY]: '#E08A84',
    [LIFE_AREAS.FINANCE]: '#7FB89A',
  },
};

export const themes: Record<ThemeName, ThemeColors> = {
  light: lightTheme,
  dark: darkTheme,
};

/**
 * Typography scale (DESIGN_SYSTEM section 3). Generous sizing + high line-height
 * for mid-range Android; no thin weights (they break on low-DPI screens).
 */
export const typography = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const },
  title: { fontSize: 19, lineHeight: 26, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  meta: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
} as const;

/** 4pt spacing scale. Whitespace is a feature, not wasted space. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;
