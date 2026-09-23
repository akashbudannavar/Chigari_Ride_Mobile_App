import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  Switch,
  Image,
  Platform,
  Alert,
  Linking,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  User,
  Clock,
  Bell,
  Headphones,
  Globe,
  MapPin,
  Shield,
  Info,
  LogOut,
  ChevronRight,
  Edit3,
  Wallet,
  Check,
  X,
} from 'lucide-react-native';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, FontFamily, Spacing, Radius, Shadows } from '@/constants/theme';
import { useWallet } from '@/services/walletService';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, profile, signOut } = useAuth();
  const { formattedBalance } = useWallet();
  const { language, setLanguage, languages, currentLanguageOption, t } = useLanguage();

  const [pushNotifications, setPushNotifications] = useState(true);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const triggerHaptic = (style = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(style);
  };

  const handleLogout = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(t('settings.logoutConfirmTitle'), t('settings.logoutConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.logout'),
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/welcome');
        },
      },
    ]);
  };

  const userName = profile?.full_name?.trim() || 'Akash Budannavar';
  const userEmail = user?.email || (profile?.full_name?.includes('Guest') ? 'guest@chigariride.com' : 'akash@example.com');
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <Screen backgroundColor={Colors.background} safeAreaTop={false} safeAreaBottom={false}>
      {/* ─── Top Header (Screen 11) ─── */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          onPress={() => {
            triggerHaptic();
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)');
            }
          }}
          accessibilityLabel={t('common.back')}
        >
          <ArrowLeft size={22} color={Colors.textPrimary} strokeWidth={2.4} />
        </Pressable>

        <Text style={styles.screenTitle}>{t('settings.title')}</Text>

        <View style={styles.placeholderBtn} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 60 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Profile Card ─── */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>{userInitial}</Text>
          </View>
          <View style={styles.profileDetails}>
            <Text style={styles.profileName}>{userName}</Text>
            <Text style={styles.profileEmail}>{userEmail}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.editProfileBtn, pressed && styles.pressed]}
            onPress={() => triggerHaptic()}
          >
            <Edit3 size={14} color={Colors.primary} strokeWidth={2.4} />
            <Text style={styles.editProfileText}>{t('settings.edit')}</Text>
          </Pressable>
        </View>

        {/* ─── 3 Prominent Helper Cards (Screen 11) ─── */}
        <View style={styles.helperCardsContainer}>
          {/* 1. Orange Card: Bus Timings */}
          <Pressable
            style={({ pressed }) => [styles.helperCardOrange, pressed && styles.cardPressed]}
            onPress={() => {
              triggerHaptic();
              router.push({ pathname: '/arrivals' as any, params: { tab: 'arrival' } });
            }}
          >
            <View style={styles.helperCardContent}>
              <Text style={styles.helperTitleOrange}>{t('settings.busTimings')}</Text>
              <Text style={styles.helperSubtitleOrange}>
                {t('settings.busTimingsDesc')}
              </Text>
            </View>
            <Image
              source={require('@/assets/images/illustrations/timings_asset.png')}
              style={styles.helperAssetImage}
              resizeMode="contain"
            />
          </Pressable>

          {/* 2. Blue Card: Stay Updated */}
          <Pressable
            style={({ pressed }) => [styles.helperCardBlue, pressed && styles.cardPressed]}
            onPress={() => triggerHaptic()}
          >
            <View style={styles.helperCardContent}>
              <Text style={styles.helperTitleBlue}>{t('settings.stayUpdated')}</Text>
              <Text style={styles.helperSubtitleBlue}>
                {t('settings.stayUpdatedDesc')}
              </Text>
            </View>
            <Image
              source={require('@/assets/images/illustrations/announcement_asset.png')}
              style={styles.helperAssetImage}
              resizeMode="contain"
            />
          </Pressable>

          {/* 3. Green Card: Need Help? */}
          <Pressable
            style={({ pressed }) => [styles.helperCardGreen, pressed && styles.cardPressed]}
            onPress={() => {
              triggerHaptic();
              Linking.openURL('tel:18004250012').catch(() => {});
            }}
          >
            <View style={styles.helperCardContent}>
              <Text style={styles.helperTitleGreen}>{t('settings.needHelp')}</Text>
              <Text style={styles.helperSubtitleGreen}>
                {t('settings.needHelpDesc')}
              </Text>
            </View>
            <Image
              source={require('@/assets/images/illustrations/help_asset.png')}
              style={styles.helperAssetImage}
              resizeMode="contain"
            />
          </Pressable>
        </View>

        {/* ─── Travel Activity Section ─── */}
        <Text style={styles.sectionHeader}>{t('settings.travelActivity')}</Text>
        <View style={styles.settingsGroup}>
          <Pressable
            style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}
            onPress={() => {
              triggerHaptic();
              router.push('/(tabs)/tickets' as any);
            }}
          >
            <View style={[styles.settingIconBox, { backgroundColor: '#E8F5E9' }]}>
              <Clock size={18} color="#2E7D32" strokeWidth={2.2} />
            </View>
            <View style={styles.settingLabelBox}>
              <Text style={styles.settingLabel}>{t('settings.history')}</Text>
              <Text style={styles.settingSubLabel}>{t('settings.historyDesc')}</Text>
            </View>
            <ChevronRight size={18} color={Colors.textTertiary} strokeWidth={2.4} />
          </Pressable>

          <View style={styles.settingDivider} />

          <Pressable
            style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}
            onPress={() => {
              triggerHaptic();
              router.push('/wallet' as any);
            }}
            accessibilityRole="button"
            accessibilityLabel="Demo Wallet"
          >
            <View style={[styles.settingIconBox, { backgroundColor: '#FEF3C7' }]}>
              <Wallet size={18} color="#D97706" strokeWidth={2.2} />
            </View>
            <View style={styles.settingLabelBox}>
              <Text style={styles.settingLabel}>Chigari Demo Wallet</Text>
              <Text style={styles.settingSubLabel}>Balance: {formattedBalance}</Text>
            </View>
            <ChevronRight size={18} color={Colors.textTertiary} strokeWidth={2.4} />
          </Pressable>
        </View>

        {/* ─── Preferences Section ─── */}
        <Text style={styles.sectionHeader}>{t('settings.preferences')}</Text>
        <View style={styles.settingsGroup}>
          {/* Push Notifications */}
          <View style={styles.settingsRow}>
            <View style={[styles.settingIconBox, { backgroundColor: '#E8F5E9' }]}>
              <Bell size={18} color="#2E7D32" strokeWidth={2.2} />
            </View>
            <View style={styles.settingLabelBox}>
              <Text style={styles.settingLabel}>{t('settings.pushNotifications')}</Text>
              <Text style={styles.settingSubLabel}>{t('settings.pushNotificationsDesc')}</Text>
            </View>
            <Switch
              value={pushNotifications}
              onValueChange={(val) => {
                triggerHaptic();
                setPushNotifications(val);
              }}
              trackColor={{ false: '#CFD8DC', true: '#81C784' }}
              thumbColor={pushNotifications ? '#2E7D32' : '#F5F5F5'}
            />
          </View>

          <View style={styles.settingDivider} />

          {/* Preferred Language */}
          <Pressable
            style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}
            onPress={() => {
              triggerHaptic();
              setShowLanguageModal(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={t('settings.language')}
          >
            <View style={[styles.settingIconBox, { backgroundColor: '#FFF3E0' }]}>
              <Globe size={18} color="#F57C00" strokeWidth={2.2} />
            </View>
            <View style={styles.settingLabelBox}>
              <Text style={styles.settingLabel}>{t('settings.language')}</Text>
              <Text style={styles.settingSubLabel}>
                {currentLanguageOption.flag} {currentLanguageOption.nativeName}
              </Text>
            </View>
            <ChevronRight size={18} color={Colors.textTertiary} strokeWidth={2.4} />
          </Pressable>

          <View style={styles.settingDivider} />

          {/* Saved Places */}
          <Pressable
            style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}
            onPress={() => triggerHaptic()}
          >
            <View style={[styles.settingIconBox, { backgroundColor: '#E3F2FD' }]}>
              <MapPin size={18} color="#1976D2" strokeWidth={2.2} />
            </View>
            <View style={styles.settingLabelBox}>
              <Text style={styles.settingLabel}>Saved Places</Text>
              <Text style={styles.settingSubLabel}>Home, Work & frequent stops</Text>
            </View>
            <ChevronRight size={18} color={Colors.textTertiary} strokeWidth={2.4} />
          </Pressable>
        </View>

        {/* ─── Legal & Info Section ─── */}
        <Text style={styles.sectionHeader}>About</Text>
        <View style={styles.settingsGroup}>
          <Pressable
            style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}
            onPress={() => triggerHaptic()}
          >
            <View style={[styles.settingIconBox, { backgroundColor: '#EDE7F6' }]}>
              <Shield size={18} color="#5E35B1" strokeWidth={2.2} />
            </View>
            <View style={styles.settingLabelBox}>
              <Text style={styles.settingLabel}>Privacy Policy & Terms</Text>
            </View>
            <ChevronRight size={18} color={Colors.textTertiary} strokeWidth={2.4} />
          </Pressable>

          <View style={styles.settingDivider} />

          <Pressable
            style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}
            onPress={() => triggerHaptic()}
          >
            <View style={[styles.settingIconBox, { backgroundColor: '#E0F2F1' }]}>
              <Info size={18} color="#00897B" strokeWidth={2.2} />
            </View>
            <View style={styles.settingLabelBox}>
              <Text style={styles.settingLabel}>About Chigari Ride</Text>
              <Text style={styles.settingSubLabel}>Hubballi-Dharwad BRTS</Text>
            </View>
            <ChevronRight size={18} color={Colors.textTertiary} strokeWidth={2.4} />
          </Pressable>
        </View>

        {/* ─── Log Out Button ─── */}
        <Pressable
          style={({ pressed }) => [styles.logoutBtn, pressed && styles.pressed]}
          onPress={handleLogout}
        >
          <LogOut size={18} color="#D32F2F" strokeWidth={2.4} />
          <Text style={styles.logoutText}>{t('settings.logout')}</Text>
        </Pressable>

        {/* ─── App Logo & Version Footer ─── */}
        <View style={styles.footerContainer}>
          <Image
            source={require('@/assets/images/chigari_ride_logo.png')}
            style={styles.footerLogo}
            resizeMode="contain"
          />
          <Text style={styles.footerTitle}>CHIGARI RIDE</Text>
          <Text style={styles.footerVersion}>Version 1.0.0 • Smart, Green, Easy City Travel</Text>
        </View>
      </ScrollView>

      {/* ─── Language Selection Modal (Requirement 1 & 21) ─── */}
      <Modal
        visible={showLanguageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowLanguageModal(false)}
        >
          <Pressable style={styles.languageModalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{t('settings.selectLanguageTitle')}</Text>
                <Text style={styles.modalSubtitle}>{t('settings.selectLanguageDesc')}</Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.modalCloseBtn, pressed && styles.pressed]}
                onPress={() => setShowLanguageModal(false)}
                accessibilityLabel="Close"
              >
                <X size={20} color={Colors.textSecondary} strokeWidth={2.2} />
              </Pressable>
            </View>

            <View style={styles.languageOptionsList}>
              {languages.map((item) => {
                const isSelected = item.code === language;
                return (
                  <Pressable
                    key={item.code}
                    style={({ pressed }) => [
                      styles.languageOptionRow,
                      isSelected && styles.languageOptionSelected,
                      pressed && styles.pressed,
                    ]}
                    onPress={async () => {
                      triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
                      await setLanguage(item.code);
                      setShowLanguageModal(false);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                  >
                    <View style={styles.languageOptionLeft}>
                      <Text style={styles.languageFlag}>{item.flag}</Text>
                      <View>
                        <Text
                          style={[
                            styles.languageNativeName,
                            isSelected && styles.languageTextSelected,
                          ]}
                        >
                          {item.nativeName}
                        </Text>
                        <Text style={styles.languageEnglishName}>{item.label}</Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.radioCircle,
                        isSelected && styles.radioCircleSelected,
                      ]}
                    >
                      {isSelected && (
                        <Check size={14} color="#FFFFFF" strokeWidth={3} />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: Radius.circle,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.low,
  },
  placeholderBtn: {
    width: 42,
    height: 42,
  },
  screenTitle: {
    fontSize: 20,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: Spacing.base,
    borderWidth: 1.5,
    borderColor: '#E2F5E5',
    marginBottom: Spacing.md,
    ...Shadows.low,
  },
  walletLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  walletIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletInfo: {
    flex: 1,
  },
  walletTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  walletTitle: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  demoBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: Radius.pill,
    borderWidth: 0.5,
    borderColor: '#86EFAC',
  },
  demoBadgeText: {
    fontSize: 9,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#15803D',
    letterSpacing: 0.4,
  },
  walletSubtitle: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  walletRightCol: {
    alignItems: 'flex-end',
    paddingLeft: 8,
  },
  walletBalanceText: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#15803D',
  },
  walletBalanceLabel: {
    fontSize: 11,
    fontFamily: FontFamily.medium,
    fontWeight: '500',
    color: Colors.textTertiary,
    marginTop: 2,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: '#EFF1F3',
    marginBottom: Spacing.lg,
    ...Shadows.low,
    gap: Spacing.md,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 20,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Colors.surface,
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    gap: 4,
  },
  editProfileText: {
    fontSize: 12,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.primary,
  },
  helperCardsContainer: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  helperCardOrange: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: 18,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: '#FFE082',
    gap: Spacing.md,
  },
  helperIconCircleOrange: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFE082',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperTitleOrange: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#E65100',
    marginBottom: 2,
  },
  helperCardBlue: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 18,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: '#90CAF9',
    gap: Spacing.md,
  },
  helperIconCircleBlue: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#BBDEFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperTitleBlue: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#0D47A1',
    marginBottom: 2,
  },
  helperCardGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 18,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: '#A5D6A7',
    gap: Spacing.md,
  },
  helperIconCircleGreen: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#C8E6C9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperTitleGreen: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#1B5E20',
    marginBottom: 2,
  },
  helperCardContent: {
    flex: 1,
  },
  helperSubtitle: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
  },
  helperSubtitleOrange: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: '#D84315',
    lineHeight: 16,
  },
  helperSubtitleBlue: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: '#1565C0',
    lineHeight: 16,
  },
  helperSubtitleGreen: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: '#2E7D32',
    lineHeight: 16,
  },
  helperAssetImage: {
    width: 56,
    height: 56,
  },
  sectionHeader: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingsGroup: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EFF1F3',
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    ...Shadows.low,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    gap: Spacing.md,
  },
  settingIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabelBox: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  settingSubLabel: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  settingDivider: {
    height: 1,
    backgroundColor: '#EFF1F3',
    marginLeft: 54,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: Radius.pill,
    paddingVertical: 13,
    marginBottom: Spacing.xl,
    gap: 8,
  },
  logoutText: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#D32F2F',
  },
  footerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: Spacing.lg,
  },
  footerLogo: {
    width: 76,
    height: 76,
    marginBottom: Spacing.xs,
  },
  footerTitle: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#2E7D32',
    letterSpacing: 1,
    marginBottom: 2,
  },
  footerVersion: {
    fontSize: 11,
    fontFamily: FontFamily.regular,
    color: Colors.textTertiary,
  },
  pressed: {
    opacity: 0.85,
  },
  cardPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.92,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  languageModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    ...Shadows.high,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageOptionsList: {
    gap: Spacing.sm,
  },
  languageOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: Spacing.base,
    borderRadius: Radius.card,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  languageOptionSelected: {
    borderColor: '#2E7D32',
    backgroundColor: '#E8F5E9',
  },
  languageOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  languageFlag: {
    fontSize: 24,
  },
  languageNativeName: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  languageEnglishName: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  languageTextSelected: {
    color: '#15803D',
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  radioCircleSelected: {
    borderColor: '#2E7D32',
    backgroundColor: '#2E7D32',
  },
});
