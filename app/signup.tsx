import { useState, useEffect } from 'react';
import { StyleSheet, View, Pressable, KeyboardAvoidingView, Platform, ScrollView, Alert, Modal } from 'react-native';
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
import { ArrowLeft, Mail, Lock, Phone, User, Check, CheckCircle2, RefreshCw } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Colors, FontFamily, Spacing, Radius, Shadows } from '@/constants/theme';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { signUp, resendVerificationEmail, continueAsGuest } = useAuth();

  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

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

    const { error: signUpError, needsEmailVerification, userAlreadyExists } = await signUp(
      email.trim(),
      password,
      fullName.trim(),
      mobile.trim(),
    );

    setLoading(false);

    if (signUpError) {
      setError(signUpError);
      if (userAlreadyExists) {
        Alert.alert(
          'Account Exists',
          'This email is already registered. Would you like to sign in instead?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign In', onPress: () => router.replace('/login') },
          ]
        );
      }
      return;
    }

    if (needsEmailVerification) {
      setShowVerificationModal(true);
      return;
    }

    router.replace('/(tabs)');
  };

  const handleResendEmail = async () => {
    if (resendLoading) return;
    setResendLoading(true);
    setResendSuccess(false);
    const res = await resendVerificationEmail(email.trim());
    setResendLoading(false);
    if (res.error) {
      Alert.alert('Resend Notice', res.error);
    } else {
      setResendSuccess(true);
      Alert.alert('Verification Resent', `A new verification email has been sent to ${email.trim()}. Please check your inbox.`);
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

  const handleGoogleLogin = async () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
      if (error) {
        setError('Google sign-in is not configured yet. Please continue with Email or as Guest.');
        if (Platform.OS !== 'web') {
          Alert.alert('Google Sign-In', 'Google sign-in is not configured yet. Please continue with Email or as Guest.');
        }
      }
    } catch {
      setError('Google sign-in is not configured yet. Please continue with Email or as Guest.');
      if (Platform.OS !== 'web') {
        Alert.alert('Google Sign-In', 'Google sign-in is not configured yet. Please continue with Email or as Guest.');
      }
    }
  };

  const handleGuestLogin = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    continueAsGuest();
    router.replace('/(tabs)');
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
      {/* ─── Top Bar ─── */}
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable style={styles.backButton} onPress={handleBack} hitSlop={12}>
          <ArrowLeft size={22} color={Colors.textPrimary} strokeWidth={2.5} />
        </Pressable>
      </View>

      {/* ─── Form ─── */}
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xl }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={formStyle}>
            {/* Title matching Reference Screen 4 */}
            <Text variant="displaySmall" style={styles.signUpTitle}>
              {t('auth.createAccount')}
            </Text>
            <Text variant="bodyMedium" color={Colors.textSecondary} style={styles.signUpSubtitle}>
              {t('auth.signUpSubtitle')}
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
              label={t('auth.fullNamePlaceholder')}
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                clearFieldError('fullName');
              }}
              placeholder={t('auth.fullNamePlaceholder')}
              autoCapitalize="words"
              leftIcon={<User size={20} color={Colors.textTertiary} strokeWidth={2} />}
              error={fieldErrors.fullName}
            />

            {/* Mobile Number */}
            <Input
              label={t('auth.phonePlaceholder')}
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
              label={t('auth.emailPlaceholder')}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                clearFieldError('email');
              }}
              placeholder={t('auth.emailPlaceholder')}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<Mail size={20} color={Colors.textTertiary} strokeWidth={2} />}
              error={fieldErrors.email}
            />

            {/* Password */}
            <Input
              label={t('auth.passwordPlaceholder')}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                clearFieldError('password');
              }}
              placeholder={t('auth.passwordPlaceholder')}
              secureTextEntry
              leftIcon={<Lock size={20} color={Colors.textTertiary} strokeWidth={2} />}
              error={fieldErrors.password}
            />

            {/* Confirm Password */}
            <Input
              label={t('auth.confirmPassword')}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                clearFieldError('confirmPassword');
              }}
              placeholder={t('auth.confirmPassword')}
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
              label={loading ? t('common.loading') : t('auth.createAccount')}
              onPress={handleSignUp}
              loading={loading}
              fullWidth
              size="large"
              style={styles.signUpButton}
            />

            {/* ─── Social & Guest Options ─── */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text variant="bodySmall" color={Colors.textTertiary} style={styles.dividerText}>
                or
              </Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Continue with Google */}
            <Pressable
              style={({ pressed }) => [styles.googleButton, pressed && styles.googlePressed]}
              onPress={handleGoogleLogin}
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
            >
              <GoogleIcon />
              <Text variant="labelLarge" color={Colors.textPrimary} style={styles.googleLabel}>
                Continue with Google
              </Text>
            </Pressable>

            {/* Continue as Guest */}
            <Pressable
              style={({ pressed }) => [styles.guestButton, pressed && styles.guestButtonPressed]}
              onPress={handleGuestLogin}
              accessibilityRole="button"
              accessibilityLabel={t('auth.continueAsGuest')}
            >
              <User size={18} color={Colors.primary} strokeWidth={2.5} />
              <Text variant="labelLarge" color={Colors.primary} style={styles.guestButtonText}>
                {t('auth.continueAsGuest')}
              </Text>
            </Pressable>

            {/* ─── Footer ─── */}
            <Animated.View style={[styles.footer, footerStyle]}>
              <Pressable onPress={handleLogin} hitSlop={8}>
                <Text variant="labelLarge" color={Colors.primary} style={styles.loginLink}>
                  {t('auth.alreadyHaveAccount')}
                </Text>
              </Pressable>
            </Animated.View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ─── Email Verification Required Modal ─── */}
      <Modal
        visible={showVerificationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowVerificationModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconBox}>
              <Mail size={32} color={Colors.primary} strokeWidth={2.4} />
            </View>

            <Text variant="headlineSmall" style={styles.modalTitle}>
              Verify Your Email
            </Text>

            <Text variant="bodyMedium" color={Colors.textSecondary} style={styles.modalDescription}>
              We sent a verification link to:{'\n'}
              <Text variant="bodyLarge" style={styles.modalEmailHighlight}>
                {email.trim()}
              </Text>
              {'\n\n'}Please check your inbox (and spam folder) and click the confirmation link to activate your account.
            </Text>

            <View style={styles.modalActions}>
              <Button
                label="I've Verified My Email / Sign In"
                onPress={() => {
                  setShowVerificationModal(false);
                  router.replace('/login');
                }}
                fullWidth
                size="large"
                style={styles.modalPrimaryBtn}
              />

              <Pressable
                style={({ pressed }) => [styles.resendBtn, pressed && styles.resendBtnPressed]}
                onPress={handleResendEmail}
                disabled={resendLoading}
              >
                <RefreshCw size={16} color={Colors.primary} strokeWidth={2.2} />
                <Text variant="labelLarge" color={Colors.primary} style={styles.resendBtnText}>
                  {resendLoading ? 'Resending...' : 'Resend Verification Email'}
                </Text>
              </Pressable>

              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setShowVerificationModal(false)}
              >
                <Text variant="bodySmall" color={Colors.textTertiary}>
                  Change Email / Close
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  topBar: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: Radius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.xl,
  },
  signUpTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 28,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  signUpSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    paddingHorizontal: Spacing.base,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 12,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    width: '100%',
    minHeight: 48,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.button,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadows.low,
  },
  googlePressed: {
    backgroundColor: '#F8FAFC',
    transform: [{ scale: 0.98 }],
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
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    width: '100%',
    minHeight: 48,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.button,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    marginTop: Spacing.md,
    ...Shadows.low,
  },
  guestButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  guestButtonText: {
    fontFamily: FontFamily.semiBold,
    fontWeight: '700',
    fontSize: 15,
    color: Colors.primary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  loginLink: {
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.card,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.high,
  },
  modalIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
  },
  modalTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  modalDescription: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  modalEmailHighlight: {
    fontWeight: '700',
    color: Colors.primary,
  },
  modalActions: {
    width: '100%',
    gap: Spacing.md,
    alignItems: 'center',
  },
  modalPrimaryBtn: {
    width: '100%',
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
  },
  resendBtnPressed: {
    opacity: 0.7,
  },
  resendBtnText: {
    fontWeight: '600',
    fontSize: 14,
  },
  modalCancelBtn: {
    paddingVertical: Spacing.xs,
    marginTop: Spacing.xs,
  },
});

