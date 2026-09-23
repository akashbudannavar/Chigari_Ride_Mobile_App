import { useEffect, useState } from 'react';
import { StyleSheet, View, Text as RNText, Pressable, ScrollView, Platform } from 'react-native';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useAppFonts } from '@/hooks/useAppFonts';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { JourneyProvider } from '@/contexts/JourneyContext';
import { SplashScreen } from '@/components/SplashScreen';
import { Colors } from '@/constants/theme';

ExpoSplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const { user, isGuest, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  useEffect(() => {
    if (!loading) {
      ExpoSplashScreen.hideAsync().catch(() => {});
    }
  }, [loading]);

  return (
    <>
      <Stack initialRouteName="index" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="buy-ticket" options={{ headerShown: false }} />
        <Stack.Screen name="wallet" options={{ headerShown: false }} />
        <Stack.Screen name="route-details" options={{ headerShown: false }} />
        <Stack.Screen name="ticket-details" options={{ headerShown: false }} />
        <Stack.Screen name="arrivals" options={{ headerShown: false }} />
        <Stack.Screen name="route-planner" options={{ headerShown: false }} />
        <Stack.Screen name="scan-ticket" options={{ headerShown: false }} />
        <Stack.Screen name="ticket-result" options={{ headerShown: false }} />
        <Stack.Screen name="get-ticket" options={{ headerShown: false }} />
        <Stack.Screen name="digital-ticket" options={{ headerShown: false }} />
        <Stack.Screen name="tracking" options={{ headerShown: false }} />
        <Stack.Screen name="bus-details" options={{ headerShown: false }} />
        <Stack.Screen name="route-map" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ headerShown: false }} />
      </Stack>
      <StatusBar
        style={showSplash ? 'dark' : 'light'}
        backgroundColor={showSplash ? '#FFFFFF' : Colors.primary}
      />
      {showSplash && (
        <SplashScreen onAnimationComplete={handleSplashComplete} />
      )}
    </>
  );
}

export default function RootLayout() {
  useFrameworkReady();
  const { fontState } = useAppFonts();

  if (fontState === 'loading') {
    return null;
  }

  return (
    <LanguageProvider>
      <AuthProvider>
        <JourneyProvider>
          <RootNavigator />
        </JourneyProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  useEffect(() => {
    console.error('[CHIGARI_STARTUP_ERROR]', error?.message, error?.stack);
  }, [error]);

  return (
    <View style={errorStyles.container}>
      <View style={errorStyles.card}>
        <RNText style={errorStyles.title}>Application Startup Error</RNText>
        <RNText style={errorStyles.subtitle}>
          The application encountered an unexpected issue during initialization.
        </RNText>
        <ScrollView style={errorStyles.errorBox}>
          <RNText style={errorStyles.errorText}>{error?.message || String(error)}</RNText>
          {error?.stack && (
            <RNText style={errorStyles.stackText}>{error.stack}</RNText>
          )}
        </ScrollView>
        <Pressable style={errorStyles.retryBtn} onPress={retry}>
          <RNText style={errorStyles.retryBtnText}>Retry</RNText>
        </Pressable>
      </View>
    </View>
  );
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorBox: {
    maxHeight: 200,
    width: '100%',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginBottom: 20,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  stackText: {
    fontSize: 10,
    color: '#7F1D1D',
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  retryBtn: {
    backgroundColor: '#15803D',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

