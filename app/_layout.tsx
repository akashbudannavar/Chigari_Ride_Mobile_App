import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useAppFonts } from '@/hooks/useAppFonts';
import { AuthProvider } from '@/contexts/AuthContext';
import { SplashScreen } from '@/components/SplashScreen';
import { Colors } from '@/constants/theme';

export default function RootLayout() {
  useFrameworkReady();
  const { fontState } = useAppFonts();
  const [showSplash, setShowSplash] = useState(true);

  if (fontState === 'loading') {
    return null;
  }

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="light" backgroundColor={Colors.primary} />
      {showSplash && (
        <SplashScreen onAnimationComplete={() => setShowSplash(false)} />
      )}
    </AuthProvider>
  );
}
