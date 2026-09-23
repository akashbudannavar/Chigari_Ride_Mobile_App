import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Wallet, Plus, ArrowUpRight, ArrowDownLeft, ShieldCheck, CreditCard } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/ui/Text';
import { Colors, FontFamily, Spacing, Radius, Shadows } from '@/constants/theme';
import { useWallet } from '@/services/walletService';
import { useLanguage } from '@/contexts/LanguageContext';

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { balance, addBalance } = useWallet();

  const triggerHaptic = (style = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(style);
  };

  const handleBack = () => {
    triggerHaptic();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/profile');
    }
  };

  const handleTopUp = (amount: number) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    addBalance(amount);
    Alert.alert('Wallet Recharged', `Successfully added ₹${amount.toFixed(2)} to your Chigari Transit Wallet.`);
  };

  return (
    <Screen backgroundColor={Colors.background} safeAreaTop={false} safeAreaBottom={false}>
      {/* ─── Top Header ─── */}
      <View style={[styles.headerBar, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          onPress={handleBack}
          accessibilityLabel={t('common.back')}
        >
          <ArrowLeft size={20} color={Colors.textPrimary} strokeWidth={2.4} />
        </Pressable>

        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>{t('wallet.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('wallet.subtitle')}</Text>
        </View>

        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Transit Smart Card ─── */}
        <View style={styles.cardContainer}>
          <View style={styles.cardTopRow}>
            <View>
              <Text style={styles.cardBrand}>CHIGARI RIDE</Text>
              <Text style={styles.cardType}>Virtual Transit Pass</Text>
            </View>
            <Wallet size={26} color="#FFFFFF" strokeWidth={2} />
          </View>

          <View style={styles.cardBalanceSection}>
            <Text style={styles.cardBalanceLabel}>{t('wallet.availableBalance')}</Text>
            <Text style={styles.cardBalanceValue}>₹{balance.toFixed(2)}</Text>
          </View>

          <View style={styles.cardBottomRow}>
            <Text style={styles.cardNumber}>•••• •••• •••• 8820</Text>
            <View style={styles.cardVerifiedBadge}>
              <ShieldCheck size={14} color="#DCFCE7" />
              <Text style={styles.cardVerifiedText}>NWKRTC Linked</Text>
            </View>
          </View>
        </View>

        {/* ─── Quick Top-Up Section ─── */}
        <Text style={styles.sectionHeader}>{t('wallet.quickAdd')}</Text>
        <View style={styles.topUpRow}>
          {[50, 100, 200].map((amt) => (
            <Pressable
              key={amt}
              style={({ pressed }) => [styles.topUpBtn, pressed && styles.btnPressed]}
              onPress={() => handleTopUp(amt)}
            >
              <Plus size={14} color="#15803D" strokeWidth={2.6} />
              <Text style={styles.topUpBtnText}>+₹{amt}</Text>
            </Pressable>
          ))}
        </View>

        {/* ─── Transit Benefits ─── */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <CreditCard size={18} color="#15803D" strokeWidth={2.2} />
            </View>
            <View style={styles.infoTextBox}>
              <Text style={styles.infoTitle}>Contactless Turnstile Pay</Text>
              <Text style={styles.infoDesc}>
                {t('wallet.demoNotice')}
              </Text>
            </View>
          </View>
        </View>

        {/* ─── Recent Wallet Activity ─── */}
        <Text style={styles.sectionHeader}>{t('wallet.recentTransactions')}</Text>
        <View style={styles.activityList}>
          <View style={styles.activityItem}>
            <View style={[styles.activityIconBox, { backgroundColor: '#FEE2E2' }]}>
              <ArrowUpRight size={18} color="#DC2626" strokeWidth={2.2} />
            </View>
            <View style={styles.activityDetails}>
              <Text style={styles.activityTitle}>Ticket Fare Deduction</Text>
              <Text style={styles.activityDate}>Today, Automatic Transit</Text>
            </View>
            <Text style={styles.activityAmountNegative}>-₹35.00</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.activityItem}>
            <View style={[styles.activityIconBox, { backgroundColor: '#E8F5E9' }]}>
              <ArrowDownLeft size={18} color="#15803D" strokeWidth={2.2} />
            </View>
            <View style={styles.activityDetails}>
              <Text style={styles.activityTitle}>Demo Wallet Top-Up</Text>
              <Text style={styles.activityDate}>Initial Prototype Credit</Text>
            </View>
            <Text style={styles.activityAmountPositive}>+₹250.00</Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.low,
  },
  headerTitles: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.base,
  },
  cardContainer: {
    backgroundColor: '#15803D',
    borderRadius: 22,
    padding: Spacing.lg,
    ...Shadows.medium,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  cardBrand: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  cardType: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    color: '#DCFCE7',
    marginTop: 1,
  },
  cardBalanceSection: {
    marginBottom: Spacing.lg,
  },
  cardBalanceLabel: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#BBF7D0',
    letterSpacing: 0.8,
  },
  cardBalanceValue: {
    fontSize: 34,
    fontFamily: FontFamily.bold,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardNumber: {
    fontSize: 13,
    fontFamily: FontFamily.medium,
    color: '#DCFCE7',
    letterSpacing: 1.5,
  },
  cardVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  cardVerifiedText: {
    fontSize: 11,
    fontFamily: FontFamily.medium,
    color: '#FFFFFF',
  },
  sectionHeader: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.xs,
  },
  topUpRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  topUpBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#BBF7D0',
    gap: 6,
    ...Shadows.low,
  },
  topUpBtnText: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#15803D',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadows.low,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextBox: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#1E293B',
  },
  infoDesc: {
    fontSize: 12.5,
    fontFamily: FontFamily.regular,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 17,
  },
  activityList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: Spacing.base,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadows.low,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  activityIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityDetails: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
    color: '#1E293B',
  },
  activityDate: {
    fontSize: 11.5,
    fontFamily: FontFamily.regular,
    color: '#94A3B8',
    marginTop: 2,
  },
  activityAmountNegative: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#DC2626',
  },
  activityAmountPositive: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#15803D',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  pressed: {
    opacity: 0.75,
  },
  btnPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
});
