import { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Pressable, ScrollView, Switch, Platform, Alert, Linking } from 'react-native';
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
import {
  Bell,
  Globe,
  Shield,
  HelpCircle,
  Info,
  LogOut,
  ChevronRight,
  Moon,
  MapPin,
  Smartphone,
  Mail,
  Phone,
  Edit3,
  Star,
  FileText,
  Lock,
  Share2,
  ChevronLeft,
  Check,
  Languages,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, FontFamily, Spacing, Radius, Shadows } from '@/constants/theme';

// ─── Types ──────────────────────────────────────────────────────────────────
type SettingKey =
  | 'pushNotifications'
  | 'emailNotifications'
  | 'smsAlerts'
  | 'locationServices'
  | 'darkMode'
  | 'dataCollection';

type SettingsState = Record<SettingKey, boolean>;

type Language = 'en' | 'hi' | 'kn';

// ─── Config ─────────────────────────────────────────────────────────────────
const LANGUAGES: { code: Language; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, profile, signOut } = useAuth();

  const [settings, setSettings] = useState<SettingsState>({
    pushNotifications: true,
    emailNotifications: true,
    smsAlerts: false,
    locationServices: true,
    darkMode: false,
    dataCollection: true,
  });

  const [selectedLang, setSelectedLang] = useState<Language>('en');
  const [showLanguageSheet, setShowLanguageSheet] = useState(false);
  const [showLogoutSheet, setShowLogoutSheet] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Entrance animations
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(20);

  // Sheet animations
  const sheetOpacity = useSharedValue(0);
  const sheetTranslateY = useSharedValue(300);
  const logoutSheetOpacity = useSharedValue(0);
  const logoutSheetTranslateY = useSharedValue(300);
  const overlayOpacity = useSharedValue(0);

  useEffect(() => {
    contentOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) });
    contentTranslateY.value = withSpring(0, { damping: 16, stiffness: 90 });

    return () => {
      cancelAnimation(contentOpacity);
      cancelAnimation(contentTranslateY);
    };
  }, []);

  // Language sheet
  useEffect(() => {
    if (showLanguageSheet) {
      overlayOpacity.value = withTiming(1, { duration: 200 });
      sheetOpacity.value = withTiming(1, { duration: 300 });
      sheetTranslateY.value = withSpring(0, { damping: 20, stiffness: 120 });
    } else {
      overlayOpacity.value = withTiming(0, { duration: 200 });
      sheetOpacity.value = withTiming(0, { duration: 200 });
      sheetTranslateY.value = withSpring(300, { damping: 20, stiffness: 120 });
    }
  }, [showLanguageSheet]);

  // Logout sheet
  useEffect(() => {
    if (showLogoutSheet) {
      overlayOpacity.value = withTiming(1, { duration: 200 });
      logoutSheetOpacity.value = withTiming(1, { duration: 300 });
      logoutSheetTranslateY.value = withSpring(0, { damping: 20, stiffness: 120 });
    } else {
      overlayOpacity.value = withTiming(0, { duration: 200 });
      logoutSheetOpacity.value = withTiming(0, { duration: 200 });
      logoutSheetTranslateY.value = withSpring(300, { damping: 20, stiffness: 120 });
    }
  }, [showLogoutSheet]);

  // ─── Animated styles ────────────────────────────────────────────────────────
  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: sheetOpacity.value,
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  const logoutSheetStyle = useAnimatedStyle(() => ({
    opacity: logoutSheetOpacity.value,
    transform: [{ translateY: logoutSheetTranslateY.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const triggerHaptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(style);
  };

  const toggleSetting = (key: SettingKey) => {
    triggerHaptic();
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectLanguage = (lang: Language) => {
    triggerHaptic();
    setSelectedLang(lang);
    setTimeout(() => setShowLanguageSheet(false), 200);
  };

  const handleLogout = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setLoggingOut(true);
    await signOut();
    setLoggingOut(false);
    setShowLogoutSheet(false);
    router.replace('/welcome');
  };

  const handleEditProfile = () => {
    triggerHaptic();
    router.push('/settings');
  };

  const handleBack = () => {
    triggerHaptic();
    if (router.canGoBack()) router.back();
    else router.push('/(tabs)/profile');
  };

  const handleRateApp = () => {
    triggerHaptic();
  };

  const handleShareApp = () => {
    triggerHaptic();
  };

  const handlePrivacyPolicy = () => {
    triggerHaptic();
  };

  const handleTerms = () => {
    triggerHaptic();
  };

  const userName = profile?.full_name ?? 'Rider';
  const userEmail = user?.email ?? 'No email';
  const userPhone = profile?.phone ?? 'No phone';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <Screen backgroundColor={Colors.background} safeAreaTop={false} safeAreaBottom={false}>
      {/* ─── Header ─── */}
      <LinearGradient
        colors={[Colors.primaryDark, Colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}
      >
        <View style={styles.headerTop}>
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.8 }]}
            onPress={handleBack}
            hitSlop={12}
          >
            <ChevronLeft size={22} color={Colors.textOnPrimary} strokeWidth={2.5} />
          </Pressable>
          <Text variant="headlineSmall" style={styles.headerTitle}>
            Settings
          </Text>
          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>

      {/* ─── Scrollable Content ─── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={contentStyle}>
          {/* ─── Profile Card ─── */}
          <Pressable
            style={({ pressed }) => [styles.profileCard, pressed && { opacity: 0.95 }]}
            onPress={handleEditProfile}
          >
            <LinearGradient
              colors={[Colors.primaryDark, Colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.profileGradient}
            >
              <View style={styles.profileTop}>
                <View style={styles.avatarContainer}>
                  <View style={styles.avatar}>
                    <Text variant="headlineMedium" style={styles.avatarText}>
                      {userInitial}
                    </Text>
                  </View>
                  <View style={styles.editBadge}>
                    <Edit3 size={12} color={Colors.primary} strokeWidth={2.5} />
                  </View>
                </View>
                <View style={styles.profileInfo}>
                  <Text variant="titleLarge" style={styles.profileName}>
                    {userName}
                  </Text>
                  <View style={styles.profileMeta}>
                    <View style={styles.profileMetaItem}>
                      <Mail size={12} color="rgba(255,255,255,0.7)" strokeWidth={2} />
                      <Text variant="bodySmall" style={styles.profileMetaText} numberOfLines={1}>
                        {userEmail}
                      </Text>
                    </View>
                    {profile?.phone && (
                      <View style={styles.profileMetaItem}>
                        <Phone size={12} color="rgba(255,255,255,0.7)" strokeWidth={2} />
                        <Text variant="bodySmall" style={styles.profileMetaText}>
                          {userPhone}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <ChevronRight size={22} color="rgba(255,255,255,0.6)" strokeWidth={2} />
              </View>

              <View style={styles.profileStatsRow}>
                <View style={styles.profileStat}>
                  <Text variant="titleMedium" style={styles.profileStatValue}>
                    {formatCurrency(profile?.wallet_balance ?? 0)}
                  </Text>
                  <Text variant="caption" style={styles.profileStatLabel}>
                    Wallet
                  </Text>
                </View>
                <View style={styles.profileStatDivider} />
                <View style={styles.profileStat}>
                  <Text variant="titleMedium" style={styles.profileStatValue}>
                    {profile ? 'Active' : 'Guest'}
                  </Text>
                  <Text variant="caption" style={styles.profileStatLabel}>
                    Account
                  </Text>
                </View>
                <View style={styles.profileStatDivider} />
                <View style={styles.profileStat}>
                  <Text variant="titleMedium" style={styles.profileStatValue}>
                    {profile?.phone ? 'Verified' : '—'}
                  </Text>
                  <Text variant="caption" style={styles.profileStatLabel}>
                    Status
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </Pressable>

          {/* ─── Notifications ─── */}
          <SectionTitle title="Notifications" />
          <Card style={styles.sectionCard} padding={0}>
            <SettingToggle
              icon={<Bell size={18} color={Colors.primary} strokeWidth={2.5} />}
              iconBg={Colors.primaryLight}
              title="Push Notifications"
              subtitle="Bus arrivals & service alerts"
              value={settings.pushNotifications}
              onToggle={() => toggleSetting('pushNotifications')}
            />
            <Divider />
            <SettingToggle
              icon={<Mail size={18} color={Colors.secondaryDark} strokeWidth={2.5} />}
              iconBg={Colors.secondaryLight}
              title="Email Notifications"
              subtitle="Trip receipts & offers"
              value={settings.emailNotifications}
              onToggle={() => toggleSetting('emailNotifications')}
            />
            <Divider />
            <SettingToggle
              icon={<Smartphone size={18} color={Colors.warning} strokeWidth={2.5} />}
              iconBg={Colors.warningLight}
              title="SMS Alerts"
              subtitle="Critical updates via SMS"
              value={settings.smsAlerts}
              onToggle={() => toggleSetting('smsAlerts')}
            />
          </Card>

          {/* ─── Language ─── */}
          <SectionTitle title="Language" />
          <Card style={styles.sectionCard} padding={0}>
            <SettingItem
              icon={<Globe size={18} color={Colors.primary} strokeWidth={2.5} />}
              iconBg={Colors.primaryLight}
              title="App Language"
              subtitle={LANGUAGES.find((l) => l.code === selectedLang)?.label ?? 'English'}
              onPress={() => {
                triggerHaptic();
                setShowLanguageSheet(true);
              }}
            />
            <Divider />
            <SettingItem
              icon={<Languages size={18} color={Colors.secondaryDark} strokeWidth={2.5} />}
              iconBg={Colors.secondaryLight}
              title="Region"
              subtitle="India"
              showChevron={false}
            />
          </Card>

          {/* ─── Privacy ─── */}
          <SectionTitle title="Privacy" />
          <Card style={styles.sectionCard} padding={0}>
            <SettingToggle
              icon={<MapPin size={18} color={Colors.success} strokeWidth={2.5} />}
              iconBg={Colors.successLight}
              title="Location Services"
              subtitle="For live tracking & nearby stops"
              value={settings.locationServices}
              onToggle={() => toggleSetting('locationServices')}
            />
            <Divider />
            <SettingToggle
              icon={<Moon size={18} color="#6A1B9A" strokeWidth={2.5} />}
              iconBg="#F3E5F5"
              title="Dark Mode"
              subtitle="Reduce eye strain at night"
              value={settings.darkMode}
              onToggle={() => toggleSetting('darkMode')}
            />
            <Divider />
            <SettingToggle
              icon={<Shield size={18} color={Colors.warning} strokeWidth={2.5} />}
              iconBg={Colors.warningLight}
              title="Data Collection"
              subtitle="Help improve the app"
              value={settings.dataCollection}
              onToggle={() => toggleSetting('dataCollection')}
            />
            <Divider />
            <SettingItem
              icon={<Lock size={18} color={Colors.error} strokeWidth={2.5} />}
              iconBg={Colors.errorLight}
              title="Privacy Policy"
              subtitle="How we handle your data"
              onPress={handlePrivacyPolicy}
            />
          </Card>

          {/* ─── Help ─── */}
          <SectionTitle title="Help" />
          <Card style={styles.sectionCard} padding={0}>
            <SettingItem
              icon={<HelpCircle size={18} color={Colors.primary} strokeWidth={2.5} />}
              iconBg={Colors.primaryLight}
              title="Help Center"
              subtitle="FAQs & support"
              onPress={() => triggerHaptic()}
            />
            <Divider />
            <SettingItem
              icon={<Star size={18} color={Colors.warning} strokeWidth={2.5} />}
              iconBg={Colors.warningLight}
              title="Rate the App"
              subtitle="Enjoying Chigari Ride?"
              onPress={handleRateApp}
            />
            <Divider />
            <SettingItem
              icon={<Share2 size={18} color={Colors.success} strokeWidth={2.5} />}
              iconBg={Colors.successLight}
              title="Share with Friends"
              subtitle="Spread the word"
              onPress={handleShareApp}
            />
          </Card>

          {/* ─── About ─── */}
          <SectionTitle title="About" />
          <Card style={styles.sectionCard} padding={0}>
            <SettingItem
              icon={<Info size={18} color={Colors.primary} strokeWidth={2.5} />}
              iconBg={Colors.primaryLight}
              title="About Chigari Ride"
              subtitle="Version 1.0.0"
              onPress={() => triggerHaptic()}
            />
            <Divider />
            <SettingItem
              icon={<FileText size={18} color={Colors.secondaryDark} strokeWidth={2.5} />}
              iconBg={Colors.secondaryLight}
              title="Terms of Service"
              subtitle="Legal agreement"
              onPress={handleTerms}
            />
          </Card>

          {/* ─── Logout ─── */}
          <View style={styles.logoutContainer}>
            <Pressable
              style={({ pressed }) => [styles.logoutButton, pressed && { opacity: 0.9 }]}
              onPress={() => {
                triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
                setShowLogoutSheet(true);
              }}
            >
              <LogOut size={20} color={Colors.error} strokeWidth={2.5} />
              <Text variant="titleMedium" color={Colors.error} style={styles.logoutText}>
                Log Out
              </Text>
            </Pressable>
          </View>

          {/* ─── Footer ─── */}
          <Text variant="caption" color={Colors.textTertiary} align="center" style={styles.footerText}>
            Chigari Ride v1.0.0 · NWKRTC Hubballi-Dharwad
          </Text>
        </Animated.View>
      </ScrollView>

      {/* ─── Overlay ─── */}
      {(showLanguageSheet || showLogoutSheet) && (
        <Animated.View
          style={[styles.overlay, overlayStyle]}
          pointerEvents={showLanguageSheet || showLogoutSheet ? 'auto' : 'none'}
        >
          <Pressable
            style={styles.overlayPressable}
            onPress={() => {
              triggerHaptic();
              setShowLanguageSheet(false);
              setShowLogoutSheet(false);
            }}
          />
        </Animated.View>
      )}

      {/* ─── Language Bottom Sheet ─── */}
      {showLanguageSheet && (
        <Animated.View
          style={[styles.bottomSheet, sheetStyle, { paddingBottom: insets.bottom + Spacing.md }]}
        >
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text variant="titleLarge">Select Language</Text>
            <Pressable
              style={styles.sheetClose}
              onPress={() => {
                triggerHaptic();
                setShowLanguageSheet(false);
              }}
              hitSlop={12}
            >
              <Text variant="labelLarge" color={Colors.primary}>
                Close
              </Text>
            </Pressable>
          </View>
          <Text variant="bodySmall" color={Colors.textSecondary} style={styles.sheetSubtitle}>
            Choose your preferred language for the app
          </Text>

          <View style={styles.langList}>
            {LANGUAGES.map((lang, idx) => (
              <Pressable
                key={lang.code}
                style={({ pressed }) => [
                  styles.langItem,
                  pressed && { opacity: 0.85 },
                  idx < LANGUAGES.length - 1 && styles.langItemDivider,
                ]}
                onPress={() => handleSelectLanguage(lang.code)}
              >
                <View style={styles.langItemLeft}>
                  <Globe size={20} color={Colors.textSecondary} strokeWidth={2} />
                  <View>
                    <Text variant="titleMedium">{lang.label}</Text>
                    <Text variant="bodySmall" color={Colors.textTertiary}>
                      {lang.native}
                    </Text>
                  </View>
                </View>
                {selectedLang === lang.code && (
                  <View style={styles.langCheck}>
                    <Check size={18} color={Colors.primary} strokeWidth={2.5} />
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </Animated.View>
      )}

      {/* ─── Logout Confirmation Sheet ─── */}
      {showLogoutSheet && (
        <Animated.View
          style={[styles.bottomSheet, styles.logoutSheet, logoutSheetStyle, { paddingBottom: insets.bottom + Spacing.lg }]}
        >
          <View style={styles.sheetHandle} />
          <View style={styles.logoutSheetIcon}>
            <LogOut size={32} color={Colors.error} strokeWidth={2} />
          </View>
          <Text variant="titleLarge" align="center" style={styles.logoutSheetTitle}>
            Log Out?
          </Text>
          <Text variant="bodyMedium" color={Colors.textSecondary} align="center" style={styles.logoutSheetMessage}>
            You'll need to sign in again to access your tickets, wallet, and travel history.
          </Text>
          <View style={styles.logoutSheetActions}>
            <Pressable
              style={({ pressed }) => [styles.logoutSheetCancel, pressed && { opacity: 0.85 }]}
              onPress={() => {
                triggerHaptic();
                setShowLogoutSheet(false);
              }}
            >
              <Text variant="titleMedium" color={Colors.textSecondary}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.logoutSheetConfirm, pressed && { opacity: 0.9 }]}
              onPress={handleLogout}
              disabled={loggingOut}
            >
              <LogOut size={18} color={Colors.textOnPrimary} strokeWidth={2.5} />
              <Text variant="titleMedium" style={styles.logoutSheetConfirmText}>
                {loggingOut ? 'Logging out...' : 'Log Out'}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      )}
    </Screen>
  );
}

// ─── Setting Toggle Row ──────────────────────────────────────────────────────
function SettingToggle({
  icon,
  iconBg,
  title,
  subtitle,
  value,
  onToggle,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.85 }]}
      onPress={onToggle}
    >
      <View style={[styles.settingIcon, { backgroundColor: iconBg }]}>
        {icon}
      </View>
      <View style={styles.settingText}>
        <Text variant="titleMedium">{title}</Text>
        <Text variant="bodySmall" color={Colors.textSecondary}>
          {subtitle}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: Colors.outline, true: Colors.primary }}
        thumbColor={value ? Colors.textOnPrimary : Colors.surface}
        ios_backgroundColor={Colors.outline}
      />
    </Pressable>
  );
}

// ─── Setting Item Row ────────────────────────────────────────────────────────
function SettingItem({
  icon,
  iconBg,
  title,
  subtitle,
  onPress,
  showChevron = true,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  onPress?: () => void;
  showChevron?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.85 }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.settingIcon, { backgroundColor: iconBg }]}>
        {icon}
      </View>
      <View style={styles.settingText}>
        <Text variant="titleMedium">{title}</Text>
        <Text variant="bodySmall" color={Colors.textSecondary}>
          {subtitle}
        </Text>
      </View>
      {showChevron && onPress && (
        <ChevronRight size={20} color={Colors.textTertiary} strokeWidth={2} />
      )}
    </Pressable>
  );
}

// ─── Section Title ───────────────────────────────────────────────────────────
function SectionTitle({ title }: { title: string }) {
  return (
    <View style={styles.sectionTitleContainer}>
      <Text variant="labelLarge" color={Colors.primary} style={styles.sectionTitle}>
        {title.toUpperCase()}
      </Text>
    </View>
  );
}

// ─── Divider ────────────────────────────────────────────────────────────────
function Divider() {
  return <View style={styles.divider} />;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatCurrency(amount: number): string {
  return `₹${amount.toFixed(0)}`;
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ─── Header ───
  header: {
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.base,
    borderBottomLeftRadius: Radius.bottomSheet,
    borderBottomRightRadius: Radius.bottomSheet,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: Colors.textOnPrimary,
    fontFamily: FontFamily.bold,
  },
  headerSpacer: {
    width: 40,
  },

  // ─── Scroll ───
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.lg,
  },

  // ─── Profile Card ───
  profileCard: {
    borderRadius: Radius.card,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
    ...Shadows.medium,
  },
  profileGradient: {
    borderRadius: Radius.card,
    padding: Spacing.base,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: {
    color: Colors.textOnPrimary,
    fontFamily: FontFamily.bold,
  },
  editBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: Colors.textOnPrimary,
    fontFamily: FontFamily.bold,
    marginBottom: Spacing.xs,
  },
  profileMeta: {
    gap: 4,
  },
  profileMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profileMetaText: {
    color: 'rgba(255,255,255,0.75)',
    flex: 1,
  },
  profileStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  profileStat: {
    flex: 1,
    alignItems: 'center',
  },
  profileStatValue: {
    color: Colors.textOnPrimary,
    fontFamily: FontFamily.bold,
    marginBottom: 2,
  },
  profileStatLabel: {
    color: 'rgba(255,255,255,0.6)',
  },
  profileStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  // ─── Section Title ───
  sectionTitleContainer: {
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  sectionTitle: {
    fontFamily: FontFamily.semiBold,
    letterSpacing: 1,
    fontSize: 12,
  },

  // ─── Section Card ───
  sectionCard: {
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },

  // ─── Setting Row ───
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    minHeight: 60,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  settingText: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: Spacing.base + 40 + Spacing.md,
  },

  // ─── Logout ───
  logoutContainer: {
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.errorLight,
    paddingVertical: Spacing.md + 2,
    borderRadius: Radius.button,
    borderWidth: 1.5,
    borderColor: Colors.errorLight,
  },
  logoutText: {
    fontFamily: FontFamily.semiBold,
  },

  // ─── Footer ───
  footerText: {
    marginTop: Spacing.md,
  },

  // ─── Overlay ───
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  overlayPressable: {
    flex: 1,
  },

  // ─── Bottom Sheet ───
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.bottomSheet,
    borderTopRightRadius: Radius.bottomSheet,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    ...Shadows.highest,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.outline,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  sheetClose: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  sheetSubtitle: {
    marginBottom: Spacing.lg,
  },

  // ─── Language List ───
  langList: {
    gap: 0,
  },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  langItemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  langItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  langCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── Logout Sheet ───
  logoutSheet: {
    alignItems: 'center',
  },
  logoutSheetIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  logoutSheetTitle: {
    marginBottom: Spacing.sm,
  },
  logoutSheetMessage: {
    textAlign: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  logoutSheetActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  logoutSheetCancel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md + 2,
    borderRadius: Radius.button,
    backgroundColor: Colors.surfaceVariant,
  },
  logoutSheetConfirm: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md + 2,
    borderRadius: Radius.button,
    backgroundColor: Colors.error,
  },
  logoutSheetConfirmText: {
    color: Colors.textOnPrimary,
    fontFamily: FontFamily.semiBold,
  },
});
