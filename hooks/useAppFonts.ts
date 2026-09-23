import { useEffect, useState } from 'react';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync().catch(() => {});

export type FontState = 'loading' | 'loaded' | 'error';

export function useAppFonts(): { fontState: FontState } {
  const [fontState, setFontState] = useState<FontState>('loading');

  useEffect(() => {
    (async () => {
      try {
        await Font.loadAsync({
          'Poppins-Regular': Poppins_400Regular,
          'Poppins-Medium': Poppins_500Medium,
          'Poppins-SemiBold': Poppins_600SemiBold,
          'Poppins-Bold': Poppins_700Bold,
        });
        setFontState('loaded');
      } catch {
        setFontState('error');
      }
    })();
  }, []);

  return { fontState };
}
