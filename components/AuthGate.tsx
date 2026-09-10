import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Linking from 'expo-linking';
import type { Session } from '@supabase/supabase-js';

import { useTheme } from '@/hooks/useTheme';
import {
  applyAuthSessionFromUrl,
  isAuthCallbackUrl,
  passwordResetRedirectUrl,
} from '@/lib/auth-recovery';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

interface AuthGateProps {
  children: React.ReactNode;
}

type AuthMode = 'signIn' | 'signUp' | 'forgot' | 'emailSent' | 'newPassword';

export function AuthGate({ children }: AuthGateProps) {
  const { colors, radius } = useTheme();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('signIn');
  const [needsNewPassword, setNeedsNewPassword] = useState(false);

  const resetAuthErrors = () => setAuthError(null);

  const switchMode = (mode: AuthMode) => {
    setAuthMode(mode);
    resetAuthErrors();
    if (mode === 'signIn' || mode === 'signUp') {
      setNeedsNewPassword(false);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const handleAuthUrl = async (url: string) => {
      if (!isAuthCallbackUrl(url)) {
        return;
      }
      try {
        const applied = await applyAuthSessionFromUrl(url);
        if (applied) {
          setNeedsNewPassword(true);
          setAuthMode('newPassword');
          resetAuthErrors();
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not open reset link';
        setAuthError(message);
        setAuthMode('signIn');
      }
    };

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    void Linking.getInitialURL().then((url) => {
      if (url) {
        void handleAuthUrl(url);
      }
    });

    const linkSub = Linking.addEventListener('url', ({ url }) => {
      void handleAuthUrl(url);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === 'PASSWORD_RECOVERY') {
        setNeedsNewPassword(true);
        setAuthMode('newPassword');
        resetAuthErrors();
      }
    });

    return () => {
      linkSub.remove();
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleAuth = async () => {
    setAuthLoading(true);
    resetAuthErrors();

    try {
      if (authMode === 'signUp') {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) {
          throw error;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
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

  const handleForgotPassword = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setAuthError('Enter the email for your account first.');
      return;
    }

    setAuthLoading(true);
    resetAuthErrors();

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: passwordResetRedirectUrl(),
      });
      if (error) {
        throw error;
      }
      setAuthMode('emailSent');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not send reset email';
      setAuthError(message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSetNewPassword = async () => {
    if (newPassword.length < 6) {
      setAuthError('Use at least 6 characters for your new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }

    setAuthLoading(true);
    resetAuthErrors();

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        throw error;
      }
      setNeedsNewPassword(false);
      setNewPassword('');
      setConfirmPassword('');
      setPassword('');
      setAuthMode('signIn');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not update password';
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

  if (session && needsNewPassword) {
    return (
      <View style={[styles.authContainer, { backgroundColor: colors.bg }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Choose a new password</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Your reset link worked. Set a new password to continue.
        </Text>

        <TextInput
          style={inputStyle(colors, radius.md)}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="New password"
          placeholderTextColor={colors.textSecondary}
          secureTextEntry
          autoCapitalize="none"
        />
        <TextInput
          style={inputStyle(colors, radius.md)}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm new password"
          placeholderTextColor={colors.textSecondary}
          secureTextEntry
          autoCapitalize="none"
        />

        {authError ? <Text style={[styles.error, { color: colors.danger }]}>{authError}</Text> : null}

        <Pressable
          style={[styles.button, { backgroundColor: colors.primary, borderRadius: radius.md }]}
          onPress={() => void handleSetNewPassword()}
          disabled={authLoading}>
          {authLoading ? (
            <ActivityIndicator color={colors.primaryContrast} />
          ) : (
            <Text style={[styles.buttonText, { color: colors.primaryContrast }]}>
              Save password
            </Text>
          )}
        </Pressable>
      </View>
    );
  }

  if (!session) {
    const subtitle =
      authMode === 'signUp'
        ? 'Create account'
        : authMode === 'forgot'
          ? 'Reset your password'
          : authMode === 'emailSent'
            ? 'Check your email'
            : 'Sign in to continue';

    return (
      <View style={[styles.authContainer, { backgroundColor: colors.bg }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>LifeOS</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>

        {authMode === 'emailSent' ? (
          <Text style={[styles.helper, { color: colors.textPrimary }]}>
            If an account exists for {email.trim() || 'that address'}, we sent a reset link. Open
            it on this phone, set a new password, then sign in.
          </Text>
        ) : (
          <>
            <TextInput
              style={inputStyle(colors, radius.md)}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
            />
            {authMode !== 'forgot' ? (
              <TextInput
                style={inputStyle(colors, radius.md)}
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                textContentType={authMode === 'signUp' ? 'newPassword' : 'password'}
              />
            ) : (
              <Text style={[styles.helper, { color: colors.textSecondary }]}>
                We will email a link to reset your password.
              </Text>
            )}
          </>
        )}

        {authError ? <Text style={[styles.error, { color: colors.danger }]}>{authError}</Text> : null}

        {authMode === 'emailSent' ? (
          <Pressable
            style={[styles.button, { backgroundColor: colors.primary, borderRadius: radius.md }]}
            onPress={() => switchMode('signIn')}>
            <Text style={[styles.buttonText, { color: colors.primaryContrast }]}>Back to sign in</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.button, { backgroundColor: colors.primary, borderRadius: radius.md }]}
            onPress={() =>
              void (authMode === 'forgot' ? handleForgotPassword() : handleAuth())
            }
            disabled={authLoading}>
            {authLoading ? (
              <ActivityIndicator color={colors.primaryContrast} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.primaryContrast }]}>
                {authMode === 'signUp' ? 'Sign up' : authMode === 'forgot' ? 'Send reset link' : 'Sign in'}
              </Text>
            )}
          </Pressable>
        )}

        {authMode === 'signIn' ? (
          <Pressable onPress={() => switchMode('forgot')} hitSlop={8}>
            <Text style={[styles.toggle, { color: colors.primary }]}>Forgot password?</Text>
          </Pressable>
        ) : null}

        {authMode === 'forgot' ? (
          <Pressable onPress={() => switchMode('signIn')} hitSlop={8}>
            <Text style={[styles.toggle, { color: colors.primary }]}>Back to sign in</Text>
          </Pressable>
        ) : null}

        {authMode === 'signIn' || authMode === 'signUp' ? (
          <Pressable onPress={() => switchMode(authMode === 'signUp' ? 'signIn' : 'signUp')}>
            <Text style={[styles.toggle, { color: colors.primary }]}>
              {authMode === 'signUp' ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return <>{children}</>;
}

function inputStyle(
  colors: ReturnType<typeof useTheme>['colors'],
  radius: number,
) {
  return [
    styles.input,
    {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      color: colors.textPrimary,
      borderRadius: radius,
    },
  ];
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
  helper: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
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
