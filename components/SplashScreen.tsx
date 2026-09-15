import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Bus, Navigation } from 'lucide-react-native';
import { Colors, FontFamily, Spacing } from '@/constants/theme';

interface SplashScreenProps {
  onAnimationComplete: () => void;
}

const AUTO_NAV_DELAY = 3000;

export function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
  // Shared values for each animated element
  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const logoRotate = useSharedValue(0);
  const ringScale = useSharedValue(0);
  const ringOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const taglineOpacity = useSharedValue(0);
  const taglineTranslateY = useSharedValue(12);
  const loaderOpacity = useSharedValue(0);
  const loaderWidth = useSharedValue(0);
  const poweredOpacity = useSharedValue(0);
  const busTranslateX = useSharedValue(-120);
  const busOpacity = useSharedValue(0);
  const [isExiting, setIsExiting] = useState(false);
  const exitOpacity = useSharedValue(1);

  // Exit animation
  const exitStyle = useAnimatedStyle(() => ({
    opacity: exitOpacity.value,
  }));

  const triggerExit = () => {
    setIsExiting(true);
    exitOpacity.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) }, () => {
      runOnJS(onAnimationComplete)();
    });
  };

  useEffect(() => {
    // Logo: scale up with spring + rotate
    logoScale.value = withSpring(1, {
      damping: 12,
      stiffness: 90,
      mass: 0.8,
    });
    logoOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) });
    logoRotate.value = withSequence(
      withTiming(-15, { duration: 300, easing: Easing.inOut(Easing.ease) }),
      withTiming(10, { duration: 200, easing: Easing.inOut(Easing.ease) }),
      withTiming(0, { duration: 200, easing: Easing.inOut(Easing.ease) })
    );

    // Expanding ring around logo
    ringScale.value = withDelay(200, withSpring(1, { damping: 14, stiffness: 80 }));
    ringOpacity.value = withSequence(
      withDelay(200, withTiming(0.6, { duration: 400 })),
      withTiming(0, { duration: 600 })
    );

    // Bus driving across
    busOpacity.value = withDelay(400, withTiming(1, { duration: 300 }));
    busTranslateX.value = withDelay(
      400,
      withTiming(120, { duration: 1400, easing: Easing.inOut(Easing.cubic) })
    );

    // Title
    titleOpacity.value = withDelay(600, withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) }));
    titleTranslateY.value = withDelay(600, withSpring(0, { damping: 15, stiffness: 100 }));

    // Tagline
    taglineOpacity.value = withDelay(900, withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) }));
    taglineTranslateY.value = withDelay(900, withSpring(0, { damping: 15, stiffness: 100 }));

    // Loader bar
    loaderOpacity.value = withDelay(1100, withTiming(1, { duration: 300 }));
    loaderWidth.value = withDelay(1100, withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }));

    // Powered by
    poweredOpacity.value = withDelay(1400, withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) }));

    // Auto-navigate
    const timeout = setTimeout(() => {
      triggerExit();
    }, AUTO_NAV_DELAY);

    return () => {
      clearTimeout(timeout);
      cancelAnimation(logoScale);
      cancelAnimation(logoOpacity);
      cancelAnimation(logoRotate);
      cancelAnimation(ringScale);
      cancelAnimation(ringOpacity);
      cancelAnimation(titleOpacity);
      cancelAnimation(titleTranslateY);
      cancelAnimation(taglineOpacity);
      cancelAnimation(taglineTranslateY);
      cancelAnimation(loaderOpacity);
      cancelAnimation(loaderWidth);
      cancelAnimation(poweredOpacity);
      cancelAnimation(busTranslateX);
      cancelAnimation(busOpacity);
    };
  }, []);

  // Animated styles
  const logoStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: logoScale.value },
      { rotate: `${logoRotate.value}deg` },
    ],
    opacity: logoOpacity.value,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineTranslateY.value }],
  }));

  const loaderBarStyle = useAnimatedStyle(() => ({
    width: `${loaderWidth.value * 100}%`,
    opacity: loaderOpacity.value,
  }));

  const poweredStyle = useAnimatedStyle(() => ({
    opacity: poweredOpacity.value,
  }));

  const busStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: busTranslateX.value }],
    opacity: busOpacity.value,
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, exitStyle]} pointerEvents="none">
      <LinearGradient
        colors={[Colors.primaryDark, Colors.primary, Colors.secondaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Decorative bus driving across the top */}
        <View style={styles.busTrack} pointerEvents="none">
          <Animated.View style={busStyle}>
            <Bus size={28} color="rgba(255,255,255,0.15)" strokeWidth={2} />
          </Animated.View>
        </View>

        {/* Logo + expanding ring */}
        <View style={styles.logoContainer}>
          <Animated.View style={[styles.ring, ringStyle]} />
          <Animated.View style={logoStyle}>
            <View style={styles.logoCircle}>
              <Navigation size={44} color={Colors.textOnPrimary} strokeWidth={2.5} absoluteStrokeWidth={false} />
            </View>
          </Animated.View>
        </View>

        {/* Title */}
        <Animated.View style={titleStyle}>
          <Animated.Text style={styles.title}>CHIGARI RIDE</Animated.Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.View style={taglineStyle}>
          <Animated.Text style={styles.tagline}>
            Smart Transit for Hubballi-Dharwad
          </Animated.Text>
        </Animated.View>

        {/* Loader bar */}
        <View style={styles.loaderContainer}>
          <View style={styles.loaderTrack}>
            <Animated.View style={[styles.loaderBar, loaderBarStyle]} />
          </View>
        </View>

        {/* Powered by */}
        <Animated.View style={[styles.poweredContainer, poweredStyle]}>
          <Animated.Text style={styles.poweredLabel}>Powered by</Animated.Text>
          <Animated.Text style={styles.poweredName}>NWKRTC</Animated.Text>
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
}

const LOGO_SIZE = 120;

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  busTrack: {
    position: 'absolute',
    top: '18%',
    left: 0,
    right: 0,
    height: 28,
    overflow: 'hidden',
  },
  logoContainer: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  ring: {
    position: 'absolute',
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    borderWidth: 2.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  logoCircle: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 34,
    color: Colors.textOnPrimary,
    letterSpacing: 2,
    textAlign: 'center',
  },
  tagline: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.5,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  loaderContainer: {
    marginTop: Spacing.xxxl,
    width: 180,
    alignItems: 'center',
  },
  loaderTrack: {
    width: '100%',
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  loaderBar: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: Colors.textOnPrimary,
  },
  poweredContainer: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
  },
  poweredLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  poweredName: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    color: Colors.textOnPrimary,
    letterSpacing: 2,
    marginTop: 2,
  },
});
