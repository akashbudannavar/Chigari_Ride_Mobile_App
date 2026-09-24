import { useEffect, useState } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';
import { Text } from '@/components/ui/Text';
import { Colors, Spacing, FontFamily } from '@/constants/theme';

// Ensure WebBrowser can complete any active in-app browser sessions
WebBrowser.maybeCompleteAuthSession();

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_description?: string;
  }>();

  const [statusMessage, setStatusMessage] = useState('Completing sign in...');

  useEffect(() => {
    let isMounted = true;

    async function handleAuth() {
      const code = params.code;
      const authError = params.error;
      const errorDescription = params.error_description;

      if (authError) {
        console.warn('[AuthCallback] OAuth error received:', authError, errorDescription);
        if (isMounted) router.replace('/login');
        return;
      }

      if (code) {
        try {
          if (isMounted) setStatusMessage('Authenticating with Chigari Ride...');

          // Guard against duplicate code exchange if session was already established by WebBrowser
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            if (isMounted) {
              router.replace('/(tabs)');
            }
            return;
          }

          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.warn('[AuthCallback] Code exchange failed:', exchangeError.message);
            if (isMounted) router.replace('/login');
            return;
          }

          if (isMounted) {
            router.replace('/(tabs)');
          }
        } catch (err) {
          console.warn('[AuthCallback] Unexpected exchange error:', err);
          if (isMounted) router.replace('/login');
        }
      } else {
        // Fallback: Check if session already exists
        const { data: { session } } = await supabase.auth.getSession();
        if (session && isMounted) {
          router.replace('/(tabs)');
        } else if (isMounted) {
          router.replace('/login');
        }
      }
    }

    handleAuth();

    return () => {
      isMounted = false;
    };
  }, [params.code, params.error, params.error_description]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.text}>{statusMessage}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.xl,
  },
  text: {
    marginTop: Spacing.md,
    color: Colors.textSecondary,
    fontSize: 16,
    fontFamily: FontFamily.medium,
  },
});
