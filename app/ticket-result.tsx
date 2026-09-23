import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  MapPin,
  QrCode,
  Bus,
  RotateCcw,
  AlertCircle,
  Route as RouteIcon,
  ShieldAlert,
} from 'lucide-react-native';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/ui/Text';
import { Colors, FontFamily, Spacing, Radius, Shadows } from '@/constants/theme';
import { ScannedTicketCard } from '@/components/ScannedTicketCard';
import { NearbyBusCard } from '@/components/NearbyBusCard';
import { useNearbyBuses } from '@/hooks/useNearbyBuses';
import { DEMO_TICKETS } from '@/services/ticketValidation';
import type { ChigariScannedTicket } from '@/types/ticket';
import { useLanguage } from '@/contexts/LanguageContext';
import { useJourney } from '@/contexts/JourneyContext';
import { getAvailableServicesForJourney } from '@/services/busAvailabilityService';

export default function TicketResultScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { startJourney } = useJourney();
  const params = useLocalSearchParams<{ ticketJson?: string }>();

  const ticket: ChigariScannedTicket = useMemo(() => {
    if (params.ticketJson) {
      try {
        return JSON.parse(params.ticketJson);
      } catch (e) {
        console.warn('Failed to parse ticketJson param:', e);
      }
    }
    // Default to the active valid demo ticket if no param is passed
    return DEMO_TICKETS.find((t) => t.validityStatus === 'VALID') || DEMO_TICKETS[1] || DEMO_TICKETS[0];
  }, [params.ticketJson]);

  const isValidTicket = useMemo(() => {
    return ticket.validityStatus === 'VALID' && ticket.status !== 'Expired';
  }, [ticket.validityStatus, ticket.status]);

  const { nearbyBuses, fromStop, toStop } = useNearbyBuses(ticket);

  // Determine primary eligible service for the journey
  const eligibleServices = useMemo(() => {
    return getAvailableServicesForJourney(ticket.fromStopName || fromStop.name, ticket.toStopName || toStop.name);
  }, [ticket.fromStopName, ticket.toStopName, fromStop.name, toStop.name]);

  const primaryService = useMemo(() => {
    return eligibleServices[0] || {
      serviceNumber: '200A',
      name: 'Route 200A • Express Service',
      color: '#2E7D32',
    };
  }, [eligibleServices]);

  const triggerHaptic = (style = Haptics.ImpactFeedbackStyle.Medium) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(style);
    }
  };

  const handleBack = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/(tabs)');
  };

  const handleScanAgain = () => {
    triggerHaptic();
    router.push('/scan-ticket' as any);
  };

  const handleSelectBusAndStart = (busNumber?: string) => {
    if (!isValidTicket) {
      triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
      return;
    }
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    const targetBus = busNumber || primaryService.serviceNumber;
    startJourney(ticket, targetBus);
    router.push({
      pathname: '/(tabs)/live' as any,
      params: { bus: targetBus },
    });
  };

  const handleNavigateToLiveBus = (busNumber: string) => {
    handleSelectBusAndStart(busNumber);
  };

  const handleViewAllLiveBuses = () => {
    handleSelectBusAndStart(primaryService.serviceNumber);
  };

  return (
    <Screen backgroundColor={Colors.background} safeAreaTop={false} safeAreaBottom={false}>
      <View style={styles.container}>
        {/* ─── Top Header ─── */}
        <View style={[styles.headerBar, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable
            style={({ pressed }) => [styles.headerCircleBtn, pressed && styles.pressed]}
            onPress={handleBack}
            accessibilityLabel={t('common.close')}
          >
            <ArrowLeft size={20} color="#1F2937" strokeWidth={2.2} />
          </Pressable>

          <View style={styles.headerTitles}>
            <Text style={styles.headerTitle}>{t('ticketResult.title')}</Text>
            <Text style={styles.headerSubtitle}>{t('ticketResult.validSubtitle')}</Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.headerCircleBtn, pressed && styles.pressed]}
            onPress={handleScanAgain}
            accessibilityLabel={t('scanner.scanAgain')}
          >
            <QrCode size={19} color="#2E7D32" strokeWidth={2.2} />
          </Pressable>
        </View>

        {/* ─── Scrollable Content ─── */}
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Scanned Ticket Card */}
          <ScannedTicketCard ticket={ticket} />

          {/* ─── Part 1: Select Bus Journey-Start Card ─── */}
          {isValidTicket ? (
            <View style={styles.selectBusCard}>
              <View style={styles.selectBusHeaderRow}>
                <View style={styles.selectBusBadge}>
                  <Bus size={15} color="#FFFFFF" strokeWidth={2.4} />
                  <Text style={styles.selectBusBadgeText}>
                    {`Chigari Bus ${primaryService.serviceNumber}`}
                  </Text>
                </View>
                <View style={styles.eligiblePill}>
                  <Text style={styles.eligiblePillText}>DIRECT ROUTE</Text>
                </View>
              </View>

              <Text style={styles.selectBusCardTitle}>
                {t('journey.selectBus')}
              </Text>
              <Text style={styles.selectBusCardDesc}>
                {`Start live journey tracking at ${fromStop.name.split('/')[0].trim()} toward ${toStop.name.split('/')[0].trim()}.`}
              </Text>

              <View style={styles.routePreviewBox}>
                <View style={styles.routePreviewStop}>
                  <View style={[styles.stopDot, { backgroundColor: '#2E7D32' }]} />
                  <Text style={styles.stopPreviewText} numberOfLines={1}>
                    {fromStop.name.split('/')[0].trim()}
                  </Text>
                </View>
                <View style={styles.routePreviewDivider} />
                <View style={styles.routePreviewStop}>
                  <View style={[styles.stopDot, { backgroundColor: '#D97706' }]} />
                  <Text style={styles.stopPreviewText} numberOfLines={1}>
                    {toStop.name.split('/')[0].trim()}
                  </Text>
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.selectBusMainBtn,
                  pressed && styles.pressed,
                ]}
                onPress={() => handleSelectBusAndStart(primaryService.serviceNumber)}
                accessibilityLabel={t('journey.startJourney')}
              >
                <Bus size={19} color="#FFFFFF" strokeWidth={2.4} />
                <Text style={styles.selectBusMainBtnText}>
                  {t('journey.startJourney')}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.expiredNoticeCard}>
              <View style={styles.expiredNoticeHeader}>
                <AlertCircle size={20} color="#DC2626" strokeWidth={2.4} />
                <Text style={styles.expiredNoticeTitle}>
                  {t('ticketResult.ticketExpiredNotice')}
                </Text>
              </View>
              <Text style={styles.expiredNoticeDesc}>
                {t('ticketResult.ticketExpiredDesc')}
              </Text>
              <View style={styles.disabledSelectBusBtn}>
                <Bus size={18} color="#9CA3AF" strokeWidth={2.2} />
                <Text style={styles.disabledSelectBusBtnText}>
                  {`${t('journey.selectBus')} (Disabled)`}
                </Text>
              </View>
            </View>
          )}

          {/* 2. Route-Aware Available Buses Section Header */}
          <View style={styles.sectionHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>{t('ticketResult.availableBuses')}</Text>
              <Text style={styles.sectionSubtitle} numberOfLines={1}>
                {`Buses for ${fromStop.name.split('/')[0].trim()}${ticket.toStopName ? ` ➔ ${ticket.toStopName.split('/')[0].trim()}` : ''}`}
              </Text>
            </View>

            {nearbyBuses.length > 0 && (
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.livePillText}>LIVE GPS</Text>
              </View>
            )}
          </View>

          {/* 3. Nearby Buses List or Empty State */}
          {nearbyBuses.length > 0 ? (
            <View style={styles.busesList}>
              {nearbyBuses.map((bus) => (
                <NearbyBusCard
                  key={bus.id}
                  bus={bus}
                  onPressLocation={handleNavigateToLiveBus}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <AlertCircle size={28} color="#D97706" strokeWidth={2.2} />
              </View>
              <Text style={styles.emptyTitle}>{t('ticketResult.noDirectService')}</Text>
              <Text style={styles.emptyDesc}>
                {t('ticketResult.noDirectServiceDesc')}
              </Text>
              <Pressable
                style={({ pressed }) => [styles.routePlannerBtn, pressed && styles.pressed]}
                onPress={() => {
                  triggerHaptic();
                  router.push('/route-planner' as any);
                }}
              >
                <RouteIcon size={16} color="#FFFFFF" strokeWidth={2.2} />
                <Text style={styles.routePlannerBtnText}>{t('home.routePlanner')}</Text>
              </Pressable>
            </View>
          )}

          {/* 4. Action Buttons */}
          <View style={styles.actionsContainer}>
            {nearbyBuses.length > 0 && (
              <Pressable
                style={({ pressed }) => [styles.viewLiveBusesBtn, pressed && styles.pressed]}
                onPress={handleViewAllLiveBuses}
              >
                <MapPin size={20} color="#FFFFFF" strokeWidth={2.4} />
                <Text style={styles.viewLiveBusesText}>{t('ticketResult.viewBusLocation')}</Text>
              </Pressable>
            )}

            <Pressable
              style={({ pressed }) => [styles.scanAgainBtn, pressed && styles.pressed]}
              onPress={handleScanAgain}
            >
              <RotateCcw size={18} color="#2E7D32" strokeWidth={2.2} />
              <Text style={styles.scanAgainBtnText}>{t('scanner.scanAgain')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    ...Shadows.low,
    zIndex: 10,
  },
  headerCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitles: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: FontFamily.bold,
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 11,
    fontFamily: FontFamily.regular,
    color: '#6B7280',
    marginTop: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm + 2,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    color: '#111827',
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: '#6B7280',
    marginTop: 2,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  livePillText: {
    color: '#15803D',
    fontSize: 10,
    fontFamily: FontFamily.bold,
    letterSpacing: 0.5,
  },
  busesList: {
    gap: Spacing.sm,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.card,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginTop: Spacing.xs,
    ...Shadows.low,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  emptyDesc: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: Spacing.lg,
  },
  routePlannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#15803D',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Radius.button,
  },
  routePlannerBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
  },
  actionsContainer: {
    marginTop: Spacing.xxl,
    gap: Spacing.sm,
  },
  viewLiveBusesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2E7D32',
    paddingVertical: 14,
    borderRadius: Radius.button,
    ...Shadows.low,
  },
  viewLiveBusesText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
  },
  scanAgainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: Radius.button,
    borderWidth: 1.5,
    borderColor: '#C8E6C9',
  },
  scanAgainBtnText: {
    color: '#2E7D32',
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  /* ─── Part 1: Select Bus Journey Start Styles ─── */
  selectBusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.card,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    borderWidth: 1.5,
    borderColor: '#C8E6C9',
    ...Shadows.low,
  },
  selectBusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  selectBusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2E7D32',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  selectBusBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: FontFamily.bold,
  },
  eligiblePill: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  eligiblePillText: {
    color: '#1B5E20',
    fontSize: 10,
    fontFamily: FontFamily.bold,
    letterSpacing: 0.5,
  },
  selectBusCardTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    color: '#1F2937',
    marginBottom: 4,
  },
  selectBusCardDesc: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  routePreviewBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  routePreviewStop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stopDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stopPreviewText: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
    color: '#1F2937',
    flex: 1,
  },
  routePreviewDivider: {
    height: 14,
    width: 2,
    backgroundColor: '#D1D5DB',
    marginLeft: 4,
    marginVertical: 2,
  },
  selectBusMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2E7D32',
    paddingVertical: 14,
    borderRadius: Radius.button,
    ...Shadows.medium,
  },
  selectBusMainBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: FontFamily.bold,
  },
  expiredNoticeCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: Radius.card,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    borderWidth: 1.5,
    borderColor: '#FECACA',
  },
  expiredNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  expiredNoticeTitle: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    color: '#DC2626',
  },
  expiredNoticeDesc: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: '#7F1D1D',
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  disabledSelectBusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E5E7EB',
    paddingVertical: 12,
    borderRadius: Radius.button,
  },
  disabledSelectBusBtnText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
  },
});

