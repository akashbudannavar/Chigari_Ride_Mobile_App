import { useState, useEffect } from 'react';
import { StyleSheet, View, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Phone } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, FontFamily, Spacing, Radius, Shadows, Typography } from '@/constants/theme';

type InputMode = 'email' | 'phone';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();

  const [mode, setMode] = useState<InputMode>('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Entrance animation values
  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(-20);
  const formOpacity = useSharedValue(0);
  const formTranslateY = useSharedValue(20);
  const socialOpacity = useSharedValue(0);
  const socialTranslateY = useSharedValue(16);
  const footerOpacity = useSharedValue(0);

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) });
    headerTranslateY.value = withSpring(0, { damping: 15, stiffness: 100 });

    formOpacity.value = withDelay(200, withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) }));
    formTranslateY.value = withDelay(200, withSpring(0, { damping: 15, stiffness: 100 }));

    socialOpacity.value = withDelay(400, withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) }));
    socialTranslateY.value = withDelay(400, withSpring(0, { damping: 15, stiffness: 100 }));

    footerOpacity.value = withDelay(600, withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }));

    return () => {
      cancelAnimation(headerOpacity);
      cancelAnimation(headerTranslateY);
      cancelAnimation(formOpacity);
      cancelAnimation(formTranslateY);
      cancelAnimation(socialOpacity);
      cancelAnimation(socialTranslateY);
      cancelAnimation(footerOpacity);
    };
  }, []);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const formStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateY: formTranslateY.value }],
  }));

  const socialStyle = useAnimatedStyle(() => ({
    opacity: socialOpacity.value,
    transform: [{ translateY: socialTranslateY.value }],
  }));

  const footerStyle = useAnimatedStyle(() => ({
    opacity: footerOpacity.value,
  }));

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      setError('Please enter your credentials');
      return;
    }

    setLoading(true);
    setError(null);

    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Use email for Supabase auth; phone mode is a UI placeholder
    const email = mode === 'email' ? identifier.trim() : `${identifier.trim()}@chigari.placeholder`;
    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      setError(signInError);
      setLoading(false);
    } else {
      router.replace('/(tabs)/index');
    }
  };

  const handleGoogleLogin = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Placeholder for OAuth flow
  };

  const handleForgotPassword = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Placeholder for password reset
  };

  const handleCreateAccount = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/signup');
  };

  const handleBack = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/welcome');
    }
  };

  const switchMode = (newMode: InputMode) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode(newMode);
    setIdentifier('');
    setError(null);
  };

  return (
    <Screen backgroundColor={Colors.background} safeAreaTop={false} safeAreaBottom={false}>
      {/* ─── Header ─── */}
      <LinearGradient
        colors={[Colors.primaryDark, Colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}
      >
        <Animated.View style={headerStyle}>
          {/* Back button */}
          <Pressable style={styles.backButton} onPress={handleBack} hitSlop={12}>
            <ArrowLeft size={22} color={Colors.textOnPrimary} strokeWidth={2.5} />
          </Pressable>

          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text
                variant="headlineSmall"
                style={styles.logoText}
              >
                CR
              </Text>
            </View>
          </View>

          <Text variant="headlineMedium" align="center" style={styles.appName}>
            CHIGARI RIDE
          </Text>
          <Text variant="bodySmall" align="center" style={styles.tagline}>
            Smart Transit for Hubballi-Dharwad
          </Text>
        </Animated.View>
      </LinearGradient>

      {/* ─── Form ─── */}
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[styles.formContainer, formStyle]}>
          {/* Welcome text */}
          <Text variant="headlineSmall" style={styles.loginTitle}>
            Login to your account
          </Text>
          <Text variant="bodyMedium" color={Colors.textSecondary} style={styles.loginSubtitle}>
            Enter your credentials to continue
          </Text>

          {/* Error banner */}
          {error && (
            <View style={styles.errorBanner}>
              <Text variant="bodySmall" color={Colors.error}>
                {error}
              </Text>
            </View>
          )}

          {/* Mode toggle */}
          <View style={styles.modeToggle}>
            <Pressable
              style={({ pressed }) => [
                styles.modeButton,
                mode === 'email' && styles.modeButtonActive,
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => switchMode('email')}
            >
              <Mail
                size={16}
                color={mode === 'email' ? Colors.primary : Colors.textTertiary}
                strokeWidth={2}
              />
              <Text
                variant="labelLarge"
                color={mode === 'email' ? Colors.primary : Colors.textTertiary}
                style={styles.modeLabel}
              >
                Email
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.modeButton,
                mode === 'phone' && styles.modeButtonActive,
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => switchMode('phone')}
            >
              <Phone
                size={16}
                color={mode === 'phone' ? Colors.primary : Colors.textTertiary}
                strokeWidth={2}
              />
              <Text
                variant="labelLarge"
                color={mode === 'phone' ? Colors.primary : Colors.textTertiary}
                style={styles.modeLabel}
              >
                Mobile
              </Text>
            </Pressable>
          </View>

          {/* Identifier input */}
          <Input
            label={mode === 'email' ? 'Email or Mobile Number' : 'Mobile Number'}
            value={identifier}
            onChangeText={(text) => {
              setIdentifier(text);
              setError(null);
            }}
            placeholder={mode === 'email' ? 'you@example.com' : '98765 43210'}
            keyboardType={mode === 'email' ? 'email-address' : 'phone-pad'}
            autoCapitalize="none"
            leftIcon={
              mode === 'email' ? (
                <Mail size={20} color={Colors.textTertiary} strokeWidth={2} />
              ) : (
                <Phone size={20} color={Colors.textTertiary} strokeWidth={2} />
              )
            }
            error={error && !identifier ? 'This field is required' : null}
          />

          {/* Password input */}
          <Input
            label="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setError(null);
            }}
            placeholder="Enter your password"
            secureTextEntry
            leftIcon={<Lock size={20} color={Colors.textTertiary} strokeWidth={2} />}
            error={error && !password ? 'This field is required' : null}
          />

          {/* Forgot password */}
          <Pressable style={styles.forgotButton} onPress={handleForgotPassword} hitSlop={8}>
            <Text variant="labelLarge" color={Colors.primary} style={styles.forgotText}>
              Forgot Password?
            </Text>
          </Pressable>

          {/* Login button */}
          <Button
            label="Login"
            onPress={handleLogin}
            loading={loading}
            fullWidth
            size="large"
            style={styles.loginButton}
          />
        </Animated.View>

        {/* ─── Social Login ─── */}
        <Animated.View style={[styles.socialContainer, socialStyle]}>
          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text variant="bodySmall" color={Colors.textTertiary} style={styles.dividerText}>
              or continue with
            </Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google login */}
          <Pressable
            style={({ pressed }) => [styles.googleButton, pressed && styles.googlePressed]}
            onPress={handleGoogleLogin}
          >
            <GoogleIcon />
            <Text variant="labelLarge" color={Colors.textPrimary} style={styles.googleLabel}>
              Continue with Google
            </Text>
          </Pressable>
        </Animated.View>

        {/* ─── Footer ─── */}
        <Animated.View style={[styles.footer, footerStyle, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <Text variant="bodyMedium" color={Colors.textSecondary}>
            Don't have an account?{' '}
          </Text>
          <Pressable onPress={handleCreateAccount} hitSlop={8}>
            <Text variant="labelLarge" color={Colors.primary} style={styles.createAccountText}>
              Create Account
            </Text>
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

// ─── Google Icon (inline SVG) ────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <View style={styles.googleIconWrapper}>
      <Svg width={20} height={20} viewBox="0 0 24 24">
        <Path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          fill="#4285F4"
        />
        <Path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <Path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          fill="#FBBC05"
        />
        <Path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </Svg>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    paddingBottom: Spacing.xxl,
    paddingHorizontal: Spacing.base,
    borderBottomLeftRadius: Radius.bottomSheet,
    borderBottomRightRadius: Radius.bottomSheet,
    overflow: 'hidden',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  logoText: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
    color: Colors.textOnPrimary,
    fontWeight: '700',
  },
  appName: {
    color: Colors.textOnPrimary,
    fontFamily: FontFamily.bold,
    letterSpacing: 1.5,
  },
  tagline: {
    color: 'rgba(255,255,255,0.75)',
    marginTop: Spacing.xs,
  },
  keyboardView: {
    flex: 1,
  },
  formContainer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  loginTitle: {
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  loginSubtitle: {
    marginBottom: Spacing.xl,
  },
  errorBanner: {
    backgroundColor: Colors.errorLight,
    borderRadius: Radius.input,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: Radius.input,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.input - 4,
  },
  modeButtonActive: {
    backgroundColor: Colors.surface,
    ...Shadows.low,
  },
  modeLabel: {
    fontSize: 14,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: -Spacing.xs,
    marginBottom: Spacing.xl,
  },
  forgotText: {
    fontWeight: '600',
  },
  loginButton: {
    marginTop: Spacing.sm,
  },
  socialContainer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.outline,
  },
  dividerText: {
    marginHorizontal: Spacing.md,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    width: '100%',
    paddingVertical: Spacing.base,
    borderRadius: Radius.button,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.outline,
    ...Shadows.low,
  },
  googlePressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  googleIconWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleLabel: {
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.xxl,
  },
  createAccountText: {
    fontWeight: '700',
  },
});
