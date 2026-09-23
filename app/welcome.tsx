import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  ImageBackground,
  Platform,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  cancelAnimation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { Colors, FontFamily, Spacing, Radius, Shadows } from '@/constants/theme';
import { useLanguage } from '@/contexts/LanguageContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  // Entrance animations
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(-16);
  const buttonsOpacity = useSharedValue(0);
  const buttonsTranslateY = useSharedValue(24);

  useEffect(() => {
    textOpacity.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.ease) });
    textTranslateY.value = withSpring(0, { damping: 16, stiffness: 90 });

    buttonsOpacity.value = withDelay(
      350,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) })
    );
    buttonsTranslateY.value = withDelay(
      350,
      withSpring(0, { damping: 14, stiffness: 95 })
    );

    return () => {
      cancelAnimation(textOpacity);
      cancelAnimation(textTranslateY);
      cancelAnimation(buttonsOpacity);
      cancelAnimation(buttonsTranslateY);
    };
  }, []);

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const buttonsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
    transform: [{ translateY: buttonsTranslateY.value }],
  }));

  const triggerHaptic = (style = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(style);
  };

  const handleGetStarted = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/signup');
  };

  const handleLogin = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    router.push('/login');
  };

  // Responsive vertical offset: positions title gracefully in the open sky area (matching Image 2)
  const titleTopMargin = insets.top + Math.round(SCREEN_HEIGHT * (SCREEN_HEIGHT < 700 ? 0.08 : 0.11));
  const bottomPadding = insets.bottom + (SCREEN_HEIGHT < 700 ? 12 : 24);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      <ImageBackground
        source={require('@/assets/images/welcome_background.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Subtle top sky vignette for readability */}
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.4)', 'rgba(255, 255, 255, 0.1)', 'transparent']}
          style={styles.topVignette}
          pointerEvents="none"
        />

        {/* Content Container spanning top to bottom */}
        <View style={styles.contentContainer}>
          {/* ─── ZONE 1: TITLE (Centered in the upper-middle open sky area, below tree canopy) ─── */}
          <Animated.View
            style={[
              styles.textOverlay,
              { marginTop: titleTopMargin },
              textAnimatedStyle,
            ]}
          >
            <Text style={styles.welcomeTo}>{t('welcome.welcomeTo')}</Text>
            <Text
              style={styles.chigariRide}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              CHIGARI RIDE
            </Text>
            <View style={styles.taglineContainer}>
              <Text style={styles.tagline}>{t('welcome.tagline1')}</Text>
              <Text style={styles.tagline}>{t('welcome.tagline2')}</Text>
            </View>
          </Animated.View>

          {/* ─── ZONE 2: SCENE SPACER (Preserves 100% unobstructed view of skyline, bus, shelter & road) ─── */}
          <View style={styles.sceneSpacer} pointerEvents="none" />

          {/* ─── ZONE 3: ACTIONS (Simple, clean & attractive buttons from reference) ─── */}
          <Animated.View
            style={[
              styles.buttonArea,
              { paddingBottom: bottomPadding },
              buttonsAnimatedStyle,
            ]}
          >
            {/* Primary Button: Get Started */}
            <Pressable
              style={({ pressed }) => [styles.primaryButton, pressed && styles.btnPressed]}
              onPress={handleGetStarted}
              accessibilityLabel={t('welcome.getStarted')}
              accessibilityRole="button"
            >
              <Text style={styles.primaryButtonText}>{t('welcome.getStarted')}</Text>
            </Pressable>

            {/* Secondary Button: Login */}
            <Pressable
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.btnPressed]}
              onPress={handleLogin}
              accessibilityLabel={t('welcome.login')}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryButtonText}>{t('welcome.login')}</Text>
            </Pressable>
          </Animated.View>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F5E9',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  topVignette: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  textOverlay: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: Spacing.md,
  },
  welcomeTo: {
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    fontSize: 20,
    lineHeight: 26,
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  chigariRide: {
    fontFamily: FontFamily.bold,
    fontWeight: '800',
    fontSize: 31,
    lineHeight: 38,
    color: '#15803D',
    textAlign: 'center',
    letterSpacing: 0.6,
    marginTop: 8,
    marginBottom: 10,
    textShadowColor: 'rgba(255, 255, 255, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  taglineContainer: {
    alignItems: 'center',
    gap: 3,
  },
  tagline: {
    fontFamily: FontFamily.medium,
    fontWeight: '500',
    fontSize: 15,
    lineHeight: 21,
    color: '#1E293B',
    textAlign: 'center',
  },
  sceneSpacer: {
    flex: 1,
  },
  buttonArea: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },

  // ─── Primary Button: Get Started ───
  primaryButton: {
    width: '84%',
    minWidth: 260,
    maxWidth: 340,
    height: 52,
    backgroundColor: '#15803D',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0E4018',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    fontSize: 17,
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },

  // ─── Secondary Button: Login ───
  secondaryButton: {
    width: '84%',
    minWidth: 260,
    maxWidth: 340,
    height: 52,
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1.4,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  secondaryButtonText: {
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    fontSize: 17,
    color: '#1E293B',
    letterSpacing: -0.1,
  },

  // ─── Shared Press Feedback ───
  btnPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
});
