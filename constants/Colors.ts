/**
 * Legacy color shape consumed by components/Themed.tsx and the scaffold helpers.
 * Values are mirrored from constants/theme.ts so the whole app reads from one
 * palette. Prefer hooks/useTheme.ts for new code.
 */
import { darkTheme, lightTheme } from '@/constants/theme';

export default {
  light: {
    text: lightTheme.textPrimary,
    background: lightTheme.bg,
    tint: lightTheme.primary,
    tabIconDefault: lightTheme.textSecondary,
    tabIconSelected: lightTheme.primary,
  },
  dark: {
    text: darkTheme.textPrimary,
    background: darkTheme.bg,
    tint: darkTheme.primary,
    tabIconDefault: darkTheme.textSecondary,
    tabIconSelected: darkTheme.primary,
  },
};
