import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Session } from '@supabase/supabase-js';

import { useTheme } from '@/hooks/useTheme';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

interface AuthGateProps {
  children: React.ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const { colors, radius } = useTheme();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleAuth = async () => {
    setAuthLoading(true);
    setAuthError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
          throw error;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          throw error;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setAuthError(message);
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Supabase not configured</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Copy .env.example to .env and add your Supabase URL and anon key.
        </Text>
        {children}
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.authContainer, { backgroundColor: colors.bg }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>LifeOS</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {isSignUp ? 'Create account' : 'Sign in to continue'}
        </Text>

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.textPrimary,
              borderRadius: radius.md,
            },
          ]}
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.textPrimary,
              borderRadius: radius.md,
            },
          ]}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={colors.textSecondary}
          secureTextEntry
        />

        {authError ? <Text style={[styles.error, { color: colors.danger }]}>{authError}</Text> : null}

        <Pressable
          style={[styles.button, { backgroundColor: colors.primary, borderRadius: radius.md }]}
          onPress={() => void handleAuth()}
          disabled={authLoading}>
          {authLoading ? (
            <ActivityIndicator color={colors.primaryContrast} />
          ) : (
            <Text style={[styles.buttonText, { color: colors.primaryContrast }]}>
              {isSignUp ? 'Sign up' : 'Sign in'}
            </Text>
          )}
        </Pressable>

        <Pressable onPress={() => setIsSignUp(!isSignUp)}>
          <Text style={[styles.toggle, { color: colors.primary }]}>
            {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
          </Text>
        </Pressable>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    minHeight: 44,
  },
  button: {
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
    minHeight: 44,
    justifyContent: 'center',
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 16,
  },
  toggle: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 14,
  },
  error: {
    marginBottom: 8,
  },
});
