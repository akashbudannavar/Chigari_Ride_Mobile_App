import React, { useEffect } from 'react';
import { StyleSheet, Dimensions, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { FontFamily } from '@/constants/theme';

interface SplashScreenProps {
  onAnimationComplete: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// Significantly larger SQUARE / RECTANGULAR presentation (78% of screen width, max 380px)
const LOGO_WIDTH = Math.min(Math.round(SCREEN_WIDTH * 0.78), Math.round(SCREEN_HEIGHT * 0.45), 380);

export function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
  const insets = useSafeAreaInsets();
  const exitOpacity = useSharedValue(1);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: exitOpacity.value,
  }));

  useEffect(() => {
    // Hold green CHIGARI RIDE splash for approximately 5 seconds (4750ms display + 250ms fade exit)
    const holdTimer = setTimeout(() => {
      exitOpacity.value = withTiming(
        0,
        { duration: 250, easing: Easing.out(Easing.ease) },
        (exitFinished) => {
          if (exitFinished) {
            runOnJS(onAnimationComplete)();
          }
        }
      );
    }, 4750);

    return () => {
      clearTimeout(holdTimer);
      cancelAnimation(exitOpacity);
    };
  }, [onAnimationComplete]);

  return (
    <Animated.View
      style={[StyleSheet.absoluteFillObject, styles.container, containerAnimatedStyle]}
      pointerEvents="none"
    >
      {/* ─── ONLY THE CHIGARI RIDE GREEN LOGO/IMAGE (NO CIRCULAR MASK, SQUARE PRESENTATION) ─── */}
      <Animated.Image
        source={require('@/assets/images/chigari_ride_logo.png')}
        style={styles.logoImage}
        resizeMode="contain"
      />

      {/* ─── COPYRIGHT FOOTER ─── */}
      <View
        style={[
          styles.footerContainer,
          { paddingBottom: Math.max(insets.bottom + 12, 28) },
        ]}
      >
        <Text style={styles.copyrightText}>© 2026 Akash Budannavar</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
  },
  logoImage: {
    width: LOGO_WIDTH,
    height: LOGO_WIDTH,
    maxWidth: 380,
    maxHeight: 380,
    aspectRatio: 1,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    right: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyrightText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});


