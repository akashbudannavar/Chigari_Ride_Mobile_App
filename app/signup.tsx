import { useState, useEffect } from 'react';
import { StyleSheet, View, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
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
import { ArrowLeft, Mail, Lock, Phone, User, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, FontFamily, Spacing, Radius, Shadows } from '@/constants/theme';

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});

  // Entrance animation values
  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(-20);
  const formOpacity = useSharedValue(0);
  const formTranslateY = useSharedValue(20);
  const footerOpacity = useSharedValue(0);

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) });
    headerTranslateY.value = withSpring(0, { damping: 15, stiffness: 100 });

    formOpacity.value = withDelay(200, withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) }));
    formTranslateY.value = withDelay(200, withSpring(0, { damping: 15, stiffness: 100 }));

    footerOpacity.value = withDelay(500, withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }));

    return () => {
      cancelAnimation(headerOpacity);
      cancelAnimation(headerTranslateY);
      cancelAnimation(formOpacity);
      cancelAnimation(formTranslateY);
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

  const footerStyle = useAnimatedStyle(() => ({
    opacity: footerOpacity.value,
  }));

  // ─── Validation ──────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errors: Record<string, string | null> = {};

    if (!fullName.trim()) {
      errors.fullName = 'Please enter your full name';
    } else if (fullName.trim().length < 2) {
      errors.fullName = 'Name is too short';
    }

    if (!mobile.trim()) {
      errors.mobile = 'Please enter your mobile number';
    } else if (!/^[6-9]\d{9}$/.test(mobile.replace(/\s/g, ''))) {
      errors.mobile = 'Enter a valid 10-digit mobile number';
    }

    if (!email.trim()) {
      errors.email = 'Please enter your email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Enter a valid email address';
    }

    if (!password) {
      errors.password = 'Please enter a password';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!agreedToTerms) {
      errors.terms = 'Please accept the Terms and Conditions';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignUp = async () => {
    setError(null);

    if (!validate()) {
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }

    setLoading(true);

    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { error: signUpError } = await signUp(
      email.trim(),
      password,
      fullName.trim(),
      mobile.trim(),
    );

    if (signUpError) {
      setError(signUpError);
      setLoading(false);
    } else {
      router.replace('/(tabs)/index');
    }
  };

  const handleBack = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/welcome');
    }
  };

  const handleLogin = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/login');
    }
  };

  const toggleTerms = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAgreedToTerms((prev) => !prev);
    setFieldErrors((prev) => ({ ...prev, terms: null }));
  };

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => ({ ...prev, [field]: null }));
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
              <Text variant="headlineSmall" style={styles.logoText}>
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
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={formStyle}>
            {/* Title */}
            <Text variant="headlineSmall" style={styles.signUpTitle}>
              Create your account
            </Text>
            <Text variant="bodyMedium" color={Colors.textSecondary} style={styles.signUpSubtitle}>
              Join CHIGARI RIDE for smart city transit
            </Text>

            {/* Error banner */}
            {error && (
              <View style={styles.errorBanner}>
                <Text variant="bodySmall" color={Colors.error}>
                  {error}
                </Text>
              </View>
            )}

            {/* Full Name */}
            <Input
              label="Full Name"
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                clearFieldError('fullName');
              }}
              placeholder="Enter your full name"
              autoCapitalize="words"
              leftIcon={<User size={20} color={Colors.textTertiary} strokeWidth={2} />}
              error={fieldErrors.fullName}
            />

            {/* Mobile Number */}
            <Input
              label="Mobile Number"
              value={mobile}
              onChangeText={(text) => {
                setMobile(text);
                clearFieldError('mobile');
              }}
              placeholder="98765 43210"
              keyboardType="phone-pad"
              leftIcon={<Phone size={20} color={Colors.textTertiary} strokeWidth={2} />}
              error={fieldErrors.mobile}
            />

            {/* Email */}
            <Input
              label="Email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                clearFieldError('email');
              }}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<Mail size={20} color={Colors.textTertiary} strokeWidth={2} />}
              error={fieldErrors.email}
            />

            {/* Password */}
            <Input
              label="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                clearFieldError('password');
              }}
              placeholder="Create a password"
              secureTextEntry
              leftIcon={<Lock size={20} color={Colors.textTertiary} strokeWidth={2} />}
              error={fieldErrors.password}
            />

            {/* Confirm Password */}
            <Input
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                clearFieldError('confirmPassword');
              }}
              placeholder="Re-enter your password"
              secureTextEntry
              leftIcon={<Lock size={20} color={Colors.textTertiary} strokeWidth={2} />}
              error={fieldErrors.confirmPassword}
            />

            {/* Terms and Conditions */}
            <Pressable
              style={styles.termsContainer}
              onPress={toggleTerms}
              hitSlop={8}
            >
              <View
                style={[
                  styles.checkbox,
                  agreedToTerms && styles.checkboxChecked,
                  fieldErrors.terms && !agreedToTerms && styles.checkboxError,
                ]}
              >
                {agreedToTerms && (
                  <Check size={16} color={Colors.textOnPrimary} strokeWidth={3} />
                )}
              </View>
              <View style={styles.termsTextContainer}>
                <Text variant="bodyMedium" color={Colors.textSecondary}>
                  I agree to the{' '}
                </Text>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    // Placeholder for Terms page
                  }}
                >
                  <Text variant="bodyMedium" color={Colors.primary} style={styles.termsLink}>
                    Terms and Conditions
                  </Text>
                </Pressable>
                <Text variant="bodyMedium" color={Colors.textSecondary}>
                  {' '}and{' '}
                </Text>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    // Placeholder for Privacy Policy page
                  }}
                >
                  <Text variant="bodyMedium" color={Colors.primary} style={styles.termsLink}>
                    Privacy Policy
                  </Text>
                </Pressable>
              </View>
            </Pressable>

            {/* Terms error */}
            {fieldErrors.terms && (
              <Text variant="bodySmall" color={Colors.error} style={styles.termsError}>
                {fieldErrors.terms}
              </Text>
            )}

            {/* Sign Up button */}
            <Button
              label="Sign Up"
              onPress={handleSignUp}
              loading={loading}
              fullWidth
              size="large"
              style={styles.signUpButton}
            />
          </Animated.View>
        </ScrollView>

        {/* ─── Footer ─── */}
        <Animated.View
          style={[styles.footer, footerStyle, { paddingBottom: insets.bottom + Spacing.lg }]}
        >
          <Text variant="bodyMedium" color={Colors.textSecondary}>
            Already have an account?{' '}
          </Text>
          <Pressable onPress={handleLogin} hitSlop={8}>
            <Text variant="labelLarge" color={Colors.primary} style={styles.loginLink}>
              Login
            </Text>
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </Screen>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  signUpTitle: {
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  signUpSubtitle: {
    marginBottom: Spacing.lg,
  },
  errorBanner: {
    backgroundColor: Colors.errorLight,
    borderRadius: Radius.input,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: Radius.sm,
    borderWidth: 2,
    borderColor: Colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxError: {
    borderColor: Colors.error,
  },
  termsTextContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  termsLink: {
    fontWeight: '600',
  },
  termsError: {
    marginTop: -Spacing.md,
    marginBottom: Spacing.md,
    marginLeft: Spacing.sm + Spacing.md + 24,
  },
  signUpButton: {
    marginTop: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  loginLink: {
    fontWeight: '700',
  },
});
