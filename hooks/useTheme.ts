import { useColorScheme } from '@/components/useColorScheme';
import { radius, spacing, themes, typography, type ThemeColors, type ThemeName } from '@/constants/theme';
import { useSettings } from '@/hooks/useSettings';

export interface ActiveTheme {
  scheme: ThemeName;
  colors: ThemeColors;
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
}

/**
 * Resolves the active theme from the user's preference (light/dark/system),
 * falling back to the OS color scheme. Built first-class for dark mode — the
 * 2am brain dump and night use are core to LifeOS (DESIGN_SYSTEM §8).
 */
export function useTheme(): ActiveTheme {
  const { settings } = useSettings();
  const systemScheme = useColorScheme();

  const scheme: ThemeName =
    settings.themePref === 'system'
      ? systemScheme === 'dark'
        ? 'dark'
        : 'light'
      : settings.themePref;

  return {
    scheme,
    colors: themes[scheme],
    typography,
    spacing,
    radius,
  };
}
