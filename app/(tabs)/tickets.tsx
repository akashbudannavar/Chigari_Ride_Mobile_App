import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  RefreshControl,
  TextInput,
  Platform,
  Image,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  Search,
  X,
  Bus,
  Clock,
  MapPin,
  ChevronRight,
  Receipt,
  RotateCcw,
  Plus,
  ArrowLeft,
  Ticket,
  Wallet,
  ArrowRight,
  QrCode,
} from 'lucide-react-native';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/ui/Text';
import { Colors, FontFamily, Spacing, Radius, Shadows } from '@/constants/theme';
import { getDigitalTickets, type DigitalTicket } from '@/services/ticketHistory';
import { getWalletBalance } from '@/services/walletService';
import { useLanguage } from '@/contexts/LanguageContext';
import { buildSharedTicketPayload } from '@/services/sharedTicketContract';

interface TripItem {
  id: string;
  routeNumber: string;
  routeName: string;
  fromStop: string;
  toStop: string;
  busPlate: string;
  fare: number;
  durationMinutes: number;
  distanceKm: number;
  dateTime: string;
  status: 'Completed' | 'Active' | 'Cancelled' | 'In Journey';
  digitalTicket?: DigitalTicket;
}

const SAMPLE_TRIP_HISTORY: TripItem[] = [
  {
    id: 'trip-1',
    routeNumber: '200A',
    routeName: 'Route 200A - Hubballi CBT to Dharwad BRTS',
    fromStop: 'Hubballi CBT',
    toStop: 'Dharwad BRTS',
    busPlate: 'Bus 200A',
    fare: 26.0,
    durationMinutes: 35,
    distanceKm: 21.0,
    dateTime: '12 Jun 2025, 09:15 AM',
    status: 'Completed',
  },
  {
    id: 'trip-2',
    routeNumber: '201B',
    routeName: 'Route 201B - Dharwad CBT to Hubballi Railway Station',
    fromStop: 'Dharwad CBT',
    toStop: 'Hubballi Railway Station',
    busPlate: 'Bus 201B',
    fare: 26.0,
    durationMinutes: 38,
    distanceKm: 22.0,
    dateTime: '10 Jun 2025, 07:45 AM',
    status: 'Completed',
  },
  {
    id: 'trip-3',
    routeNumber: '100D',
    routeName: 'Route 100D - Hubballi CBT to Dharwad (Express)',
    fromStop: 'Hubballi CBT',
    toStop: 'Dharwad Old Bus Stand',
    busPlate: 'Bus 100D',
    fare: 30.0,
    durationMinutes: 28,
    distanceKm: 21.0,
    dateTime: '08 Jun 2025, 05:30 PM',
    status: 'Completed',
  },
  {
    id: 'trip-4',
    routeNumber: '202C',
    routeName: 'Route 202C - Hubballi CBT to Navanagar',
    fromStop: 'Hubballi CBT',
    toStop: 'Navanagar',
    busPlate: 'Bus 202C',
    fare: 15.0,
    durationMinutes: 20,
    distanceKm: 11.5,
    dateTime: '05 Jun 2025, 11:20 AM',
    status: 'Completed',
  },
];

type FilterType = 'All' | 'Completed' | 'Active';

export default function TravelHistoryScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('All');
  const [refreshing, setRefreshing] = useState(false);
  const [digitalTrips, setDigitalTrips] = useState<TripItem[]>([]);

  const [walletBalance, setWalletBalance] = useState<number>(100);

  const triggerHaptic = (style = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(style);
  };

  const loadData = useCallback(async () => {
    const [dts, bal] = await Promise.all([getDigitalTickets(), getWalletBalance()]);
    setWalletBalance(bal);
    const mapped: TripItem[] = dts.map((dt) => {
      const issueDate = new Date(dt.issuedAt);
      const dateTimeStr = isNaN(issueDate.getTime())
        ? 'Today'
        : issueDate.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }) +
          ', ' +
          issueDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          });

      return {
        id: dt.ticketId,
        routeNumber: dt.routeNumber || '200A',
        routeName: dt.routeName || `Route ${dt.routeNumber || '200A'} - ${dt.fromStationName} to ${dt.toStationName}`,
        fromStop: dt.fromStationName,
        toStop: dt.toStationName,
        busPlate: `Bus ${dt.routeNumber || '200A'}`,
        fare: dt.fare,
        durationMinutes: dt.durationMinutes || 35,
        distanceKm: dt.distanceKm || 14.2,
        dateTime: dateTimeStr,
        status: dt.status === 'IN_JOURNEY' ? 'In Journey' : dt.status === 'VALID' ? 'Active' : 'Completed',
        digitalTicket: dt,
      };
    });
    setDigitalTrips(mapped);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    triggerHaptic();
    await Promise.all([loadData(), new Promise((r) => setTimeout(r, 600))]);
    setRefreshing(false);
  };

  const allTrips = useMemo(() => {
    return [...digitalTrips, ...SAMPLE_TRIP_HISTORY];
  }, [digitalTrips]);

  const filteredTrips = useMemo(() => {
    return allTrips.filter((trip) => {
      const matchesFilter =
        filter === 'All' ? true : trip.status.toLowerCase() === filter.toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        trip.routeNumber.toLowerCase().includes(q) ||
        trip.routeName.toLowerCase().includes(q) ||
        trip.busPlate.toLowerCase().includes(q) ||
        trip.fromStop.toLowerCase().includes(q) ||
        trip.toStop.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [allTrips, filter, searchQuery]);

  return (
    <Screen backgroundColor={Colors.background} safeAreaTop={false} safeAreaBottom={false}>
      {/* ─── Top Header (Screen 10 - Ticket Hub) ─── */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + Spacing.base }]}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTitleLeft}>
            <View>
              <Text style={styles.screenTitle}>{t('tickets.title')}</Text>
              <Text style={styles.screenSubtitle}>{t('tickets.subtitle')}</Text>
            </View>
          </View>

          {/* Quick Wallet Link */}
          <Pressable
            style={({ pressed }) => [styles.walletHeaderPill, pressed && styles.btnPressed]}
            onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              router.push('/wallet');
            }}
            accessibilityLabel={t('tickets.walletBalance')}
            accessibilityRole="button"
          >
            <Wallet size={15} color="#15803D" strokeWidth={2.4} />
            <Text style={styles.walletHeaderAmount}>₹{walletBalance.toFixed(2)}</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 95 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* ─── Hero Action: Get / Buy Digital Ticket ─── */}
        <View style={styles.heroBannerCard}>
          <View style={styles.heroBannerLeft}>
            <View style={styles.heroBadgeRow}>
              <View style={styles.instantBadge}>
                <Ticket size={12} color="#166534" strokeWidth={2.4} />
                <Text style={styles.instantBadgeText}>E-TICKET</Text>
              </View>
              <Text style={styles.heroCashlessTag}>Cashless & Instant</Text>
            </View>

            <Text style={styles.heroTitle}>{t('tickets.bookPassNow')}</Text>
            <Text style={styles.heroSubtitle}>
              {t('tickets.subtitle')}
            </Text>

            <Pressable
              style={({ pressed }) => [styles.getTicketActionBtn, pressed && styles.btnPressed]}
              onPress={() => {
                triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/get-ticket');
              }}
              accessibilityLabel={t('tickets.getTicket')}
              accessibilityRole="button"
            >
              <Plus size={16} color="#FFFFFF" strokeWidth={2.8} />
              <Text style={styles.getTicketActionBtnText}>{t('tickets.getTicket')}</Text>
              <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.4} />
            </Pressable>
          </View>

          <View style={styles.heroBannerRight}>
            <View style={styles.heroIconCircle}>
              <QrCode size={36} color="#1B5E20" strokeWidth={2} />
            </View>
          </View>
        </View>

        {/* ─── Section Header: My Tickets & History ─── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{t('tickets.myTickets')}</Text>
          <Text style={styles.sectionCountBadge}>{allTrips.length}</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Search size={18} color={Colors.textTertiary} strokeWidth={2.2} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('tickets.searchTickets')}
            placeholderTextColor={Colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <X size={16} color={Colors.textTertiary} strokeWidth={2} />
            </Pressable>
          )}
        </View>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          {(['All', 'Active', 'Completed'] as FilterType[]).map((f) => {
            const isSelected = filter === f;
            const filterLabel =
              f === 'All'
                ? t('tickets.all')
                : f === 'Active'
                ? t('tickets.active')
                : t('tickets.completed');
            return (
              <Pressable
                key={f}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => {
                  triggerHaptic();
                  setFilter(f);
                }}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected && styles.filterChipTextActive,
                  ]}
                >
                  {filterLabel}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {filteredTrips.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Bus size={32} color={Colors.textTertiary} strokeWidth={1.8} />
            </View>
            <Text style={styles.emptyTitle}>{t('tickets.noTickets')}</Text>
            <Text style={styles.emptySubtitle}>{t('tickets.noTicketsDesc')}</Text>
          </View>
        ) : (
          filteredTrips.map((trip) => (
            <Pressable
              key={trip.id}
              style={({ pressed }) => [styles.tripCard, pressed && styles.cardPressed]}
              onPress={() => {
                triggerHaptic();
                let targetTicket = trip.digitalTicket;
                if (!targetTicket) {
                  const isCompleted = trip.status === 'Completed';
                  const pastTime = Date.now() - 86400000 * 5;
                  const ticketId = `CR-20250612-${trip.id.replace('trip-', '7767')}`;
                  const issuedAt = new Date(pastTime).toISOString();
                  const validUntil = new Date(pastTime + 4 * 3600000).toISOString();
                  const qrPayload = buildSharedTicketPayload({
                    ticketId,
                    fromStationName: trip.fromStop,
                    toStationName: trip.toStop,
                    fare: trip.fare,
                    currency: 'INR',
                    passengerDisplayName: 'Passenger',
                    status: isCompleted ? 'expired' : 'active',
                    issuedAt,
                    validUntil,
                  });
                  targetTicket = {
                    ticketId,
                    fromStationId: trip.fromStop.toLowerCase().replace(/\s+/g, '-'),
                    fromStationName: trip.fromStop,
                    toStationId: trip.toStop.toLowerCase().replace(/\s+/g, '-'),
                    toStationName: trip.toStop,
                    fare: trip.fare,
                    ticketType: 'Adult',
                    issuedAt,
                    validUntil,
                    status: isCompleted ? 'EXPIRED' : 'VALID',
                    routeNumber: trip.routeNumber,
                    routeName: trip.routeName,
                    durationMinutes: trip.durationMinutes,
                    distanceKm: trip.distanceKm,
                    qrPayload,
                  };
                }
                router.push({
                  pathname: '/ticket-details',
                  params: { ticketJson: JSON.stringify(targetTicket) },
                });
              }}
            >
              {/* Top Row: Route & Fare */}
              <View style={styles.cardTopRow}>
                <View style={styles.busIconBadge}>
                  <Image
                    source={require('@/assets/images/illustrations/bus_asset.png')}
                    style={styles.busAssetImg}
                    resizeMode="contain"
                  />
                </View>

                <View style={styles.routeDetails}>
                  <View style={styles.routeBadgeRow}>
                    <View style={styles.routeBadge}>
                      <Text style={styles.routeBadgeText}>{`${t('common.route')} ${trip.routeNumber}`}</Text>
                    </View>
                    <Text style={styles.routeName}>{trip.routeName}</Text>
                  </View>
                  <Text style={styles.tripDateTime}>{trip.dateTime}</Text>
                </View>

                <Text style={styles.fareAmount}>₹{trip.fare.toFixed(2)}</Text>
              </View>

              {/* Dotted Divider */}
              <View style={styles.dottedDivider} />

              {/* Bottom Row: Plate, Duration, Distance & Status */}
              <View style={styles.cardBottomRow}>
                <View style={styles.tripMetrics}>
                  <Text style={styles.busPlate}>{trip.busPlate}</Text>
                  <Text style={styles.metricDot}>•</Text>
                  <Text style={styles.tripDuration}>
                    {`${trip.durationMinutes} ${t('common.mins')}`}
                  </Text>
                  <Text style={styles.metricDot}>•</Text>
                  <Text style={styles.tripDistance}>{`${trip.distanceKm} ${t('common.km')}`}</Text>
                </View>

                <View style={styles.statusAndAction}>
                  <View
                    style={[
                      styles.statusBadge,
                      trip.status === 'In Journey' && { backgroundColor: '#E0F2FE' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        trip.status === 'In Journey' && { color: '#0369A1' },
                      ]}
                    >
                      {trip.status === 'In Journey'
                        ? (t('ticketDetails.inJourney') || 'In Journey')
                        : trip.status === 'Completed'
                        ? t('tickets.completed')
                        : trip.status === 'Active'
                        ? t('tickets.active')
                        : trip.status}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={Colors.textTertiary} strokeWidth={2.4} />
                </View>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.base,
  },
  headerTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.low,
  },
  walletHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    gap: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    ...Shadows.low,
  },
  walletHeaderAmount: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#15803D',
  },
  heroBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: Radius.card,
    padding: Spacing.base,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    marginBottom: Spacing.lg,
    ...Shadows.low,
  },
  heroBannerLeft: {
    flex: 1,
    paddingRight: 10,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  instantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#BBF7D0',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: Radius.pill,
    gap: 4,
  },
  instantBadgeText: {
    fontSize: 9.5,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#166534',
    letterSpacing: 0.5,
  },
  heroCashlessTag: {
    fontSize: 11,
    fontFamily: FontFamily.medium,
    fontWeight: '500',
    color: '#15803D',
  },
  heroTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#14532D',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: '#374151',
    lineHeight: 17,
    marginBottom: 12,
  },
  getTicketActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#15803D',
    paddingHorizontal: 15,
    paddingVertical: 8.5,
    borderRadius: Radius.pill,
    gap: 6,
    ...Shadows.low,
  },
  getTicketActionBtnText: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  heroBannerRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sectionCountBadge: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    color: Colors.textSecondary,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  screenTitle: {
    fontSize: 22,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  screenSubtitle: {
    fontSize: 12.5,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.base,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#E8ECF0',
    marginBottom: Spacing.base,
    gap: Spacing.sm,
    ...Shadows.low,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    backgroundColor: '#EEF2F6',
  },
  filterChipActive: {
    backgroundColor: '#2E7D32',
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.surface,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  tripCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: '#EFF1F3',
    ...Shadows.low,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  busIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  busAssetImg: {
    width: 28,
    height: 28,
  },
  routeDetails: {
    flex: 1,
  },
  routeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  routeBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  routeBadgeText: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#2E7D32',
  },
  routeName: {
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  tripDateTime: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.textTertiary,
  },
  fareAmount: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  dottedDivider: {
    height: 1,
    backgroundColor: '#EFF1F3',
    marginVertical: Spacing.sm + 2,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tripMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  busPlate: {
    fontSize: 12,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  metricDot: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  tripDuration: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.textTertiary,
  },
  tripDistance: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.textTertiary,
  },
  statusAndAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: '#2E7D32',
  },
  cardPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.92,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F5F7FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: FontFamily.semiBold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.textTertiary,
  },
  pressed: {
    opacity: 0.75,
  },
  btnPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.92,
  },
});
