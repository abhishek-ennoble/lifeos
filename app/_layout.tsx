import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { ThemeProvider } from 'expo-router/react-navigation';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import Toast from 'react-native-toast-message';
import 'react-native-reanimated';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthGate } from '@/components/AuthGate';
import { useTheme } from '@/hooks/useTheme';
import { SettingsProvider } from '@/hooks/useSettings';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error && __DEV__) {
      console.warn('Font load failed, using system fonts:', error.message);
    }
  }, [error]);

  useEffect(() => {
    if (loaded || error) {
      void SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <SettingsProvider>
          <AuthGate>
            <RootLayoutNav />
            <Toast />
          </AuthGate>
        </SettingsProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}

function RootLayoutNav() {
  const { scheme, colors } = useTheme();

  const theme = {
    dark: scheme === 'dark',
    colors: {
      primary: colors.primary,
      background: colors.bg,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      notification: colors.accentWarm,
    },
    fonts: {
      regular: { fontFamily: 'System', fontWeight: '400' as const },
      medium: { fontFamily: 'System', fontWeight: '500' as const },
      bold: { fontFamily: 'System', fontWeight: '700' as const },
      heavy: { fontFamily: 'System', fontWeight: '800' as const },
    },
  };

  return (
    <ThemeProvider value={theme}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { color: colors.textPrimary },
          headerTintColor: colors.primary,
          contentStyle: { backgroundColor: colors.bg },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="chat" options={{ title: 'AI Chat', presentation: 'modal' }} />
        <Stack.Screen name="anti-entropy" options={{ title: 'Anti-Entropy Review' }} />
        <Stack.Screen name="journal" options={{ title: 'Journal' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="feedback" options={{ title: 'App Feedback' }} />
        <Stack.Screen
          name="reflect"
          options={{ title: 'Evening reflection', presentation: 'modal' }}
        />
      </Stack>
    </ThemeProvider>
  );
}
