import { useState, useEffect } from 'react';
import { StyleSheet, View, Pressable, ScrollView, Platform } from 'react-native';
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
  Settings as SettingsIcon,
  Wallet,
  Ticket,
  MapPin,
  ChevronRight,
  Bell,
  CircleUser,
  Phone,
  Mail,
  Star,
  Share2,
  LogOut,
  Shield,
  Edit3,
  Clock,
  Bus,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, FontFamily, Spacing, Radius, Shadows } from '@/constants/theme';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, profile, signOut } = useAuth();

  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(20);

  useEffect(() => {
    contentOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) });
    contentTranslateY.value = withSpring(0, { damping: 16, stiffness: 90 });

    return () => {
      cancelAnimation(contentOpacity);
      cancelAnimation(contentTranslateY);
    };
  }, []);

  const triggerHaptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(style);
  };

  const handleSettings = () => {
    triggerHaptic();
    router.push('/settings');
  };

  const handleWallet = () => {
    triggerHaptic();
    router.push('/wallet');
  };

  const handleHistory = () => {
    triggerHaptic();
    router.push('/(tabs)/tickets');
  };

  const handleLogout = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    await signOut();
    router.replace('/welcome');
  };

  const userName = profile?.full_name ?? 'Rider';
  const userEmail = user?.email ?? 'No email';
  const userPhone = profile?.phone ?? 'No phone';
  const userInitial = userName.charAt(0).toUpperCase();
  const walletBalance = profile?.wallet_balance ?? 0;

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  return (
    <Screen backgroundColor={Colors.background} safeAreaTop={false} safeAreaBottom={false}>
      {/* ─── Header ─── */}
      <LinearGradient
        colors={[Colors.primaryDark, Colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + Spacing.md }]}
      >
        <View style={styles.headerTop}>
          <Text variant="headlineSmall" style={styles.headerTitle}>
            Profile
          </Text>
          <Pressable
            style={({ pressed }) => [styles.settingsButton, pressed && { opacity: 0.8 }]}
            onPress={handleSettings}
          >
            <SettingsIcon size={20} color={Colors.textOnPrimary} strokeWidth={2.5} />
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={contentStyle}>
          {/* ─── Profile Card ─── */}
          <Pressable
            style={({ pressed }) => [styles.profileCard, pressed && { opacity: 0.95 }]}
            onPress={handleSettings}
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
                    ₹{walletBalance.toFixed(0)}
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

          {/* ─── Quick Actions ─── */}
          <View style={styles.quickActionsRow}>
            <Pressable
              style={({ pressed }) => [styles.quickAction, pressed && { opacity: 0.9 }]}
              onPress={handleWallet}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: Colors.successLight }]}>
                <Wallet size={22} color={Colors.success} strokeWidth={2.5} />
              </View>
              <Text variant="labelMedium" color={Colors.textSecondary} style={styles.quickActionLabel}>
                Wallet
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.quickAction, pressed && { opacity: 0.9 }]}
              onPress={handleHistory}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: Colors.primaryLight }]}>
                <Ticket size={22} color={Colors.primary} strokeWidth={2.5} />
              </View>
              <Text variant="labelMedium" color={Colors.textSecondary} style={styles.quickActionLabel}>
                History
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.quickAction, pressed && { opacity: 0.9 }]}
              onPress={() => router.push('/(tabs)/routes')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: Colors.warningLight }]}>
                <Bus size={22} color={Colors.warning} strokeWidth={2.5} />
              </View>
              <Text variant="labelMedium" color={Colors.textSecondary} style={styles.quickActionLabel}>
                Routes
              </Text>
            </Pressable>
          </View>

          {/* ─── Account Section ─── */}
          <Text variant="labelLarge" color={Colors.primary} style={styles.sectionTitle}>
            ACCOUNT
          </Text>
          <Card style={styles.sectionCard} padding={0}>
            <ProfileItem
              icon={<SettingsIcon size={18} color={Colors.primary} strokeWidth={2.5} />}
              iconBg={Colors.primaryLight}
              title="Settings"
              subtitle="Notifications, language, privacy"
              onPress={handleSettings}
            />
            <View style={styles.divider} />
            <ProfileItem
              icon={<Wallet size={18} color={Colors.success} strokeWidth={2.5} />}
              iconBg={Colors.successLight}
              title="Wallet"
              subtitle={`Balance: ₹${walletBalance.toFixed(0)}`}
              onPress={handleWallet}
            />
            <View style={styles.divider} />
            <ProfileItem
              icon={<Ticket size={18} color={Colors.warning} strokeWidth={2.5} />}
              iconBg={Colors.warningLight}
              title="Travel History"
              subtitle="View past trips"
              onPress={handleHistory}
            />
          </Card>

          {/* ─── More Section ─── */}
          <Text variant="labelLarge" color={Colors.primary} style={styles.sectionTitle}>
            MORE
          </Text>
          <Card style={styles.sectionCard} padding={0}>
            <ProfileItem
              icon={<Bell size={18} color={Colors.secondaryDark} strokeWidth={2.5} />}
              iconBg={Colors.secondaryLight}
              title="Notifications"
              subtitle="Manage your alerts"
              onPress={handleSettings}
            />
            <View style={styles.divider} />
            <ProfileItem
              icon={<Shield size={18} color={Colors.error} strokeWidth={2.5} />}
              iconBg={Colors.errorLight}
              title="Privacy & Security"
              subtitle="Data and permissions"
              onPress={handleSettings}
            />
            <View style={styles.divider} />
            <ProfileItem
              icon={<Star size={18} color={Colors.warning} strokeWidth={2.5} />}
              iconBg={Colors.warningLight}
              title="Rate the App"
              subtitle="Enjoying Chigari Ride?"
              onPress={() => triggerHaptic()}
            />
            <View style={styles.divider} />
            <ProfileItem
              icon={<Share2 size={18} color={Colors.success} strokeWidth={2.5} />}
              iconBg={Colors.successLight}
              title="Share with Friends"
              subtitle="Spread the word"
              onPress={() => triggerHaptic()}
            />
          </Card>

          {/* ─── Logout ─── */}
          <View style={styles.logoutContainer}>
            <Pressable
              style={({ pressed }) => [styles.logoutButton, pressed && { opacity: 0.9 }]}
              onPress={handleLogout}
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
    </Screen>
  );
}

// ─── Profile Item ────────────────────────────────────────────────────────────
function ProfileItem({
  icon,
  iconBg,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.profileItem, pressed && { opacity: 0.85 }]}
      onPress={onPress}
    >
      <View style={[styles.profileItemIcon, { backgroundColor: iconBg }]}>
        {icon}
      </View>
      <View style={styles.profileItemText}>
        <Text variant="titleMedium">{title}</Text>
        <Text variant="bodySmall" color={Colors.textSecondary}>
          {subtitle}
        </Text>
      </View>
      <ChevronRight size={20} color={Colors.textTertiary} strokeWidth={2} />
    </Pressable>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
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
  headerTitle: {
    color: Colors.textOnPrimary,
    fontFamily: FontFamily.bold,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

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
    marginBottom: Spacing.lg,
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

  // ─── Quick Actions ───
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: Radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  quickActionLabel: {
    fontSize: 12,
  },

  // ─── Section Title ───
  sectionTitle: {
    fontFamily: FontFamily.semiBold,
    letterSpacing: 1,
    fontSize: 12,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },

  // ─── Section Card ───
  sectionCard: {
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },

  // ─── Profile Item ───
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    minHeight: 60,
  },
  profileItemIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  profileItemText: {
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
});
