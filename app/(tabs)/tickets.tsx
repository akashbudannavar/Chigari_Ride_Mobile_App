import { useState, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, View, Pressable, ScrollView, RefreshControl, Platform, TextInput } from 'react-native';
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
  Search,
  X,
  Clock,
  Calendar,
  IndianRupee,
  Timer,
  MapPin,
  ArrowRight,
  Repeat2,
  Bus,
  Filter,
  TrendingUp,
  CircleDot,
} from 'lucide-react-native';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Colors, FontFamily, Spacing, Radius, Shadows } from '@/constants/theme';

// ─── Types ──────────────────────────────────────────────────────────────────
interface Trip {
  id: string;
  route_number: string;
  route_name: string;
  route_color: string;
  route_type: string;
  from_stop: string;
  to_stop: string;
  amount: number;
  duration_mins: number;
  travel_date: string;
  travel_time: string;
  status: 'completed' | 'active' | 'expired';
}

// ─── Sample trips (derived from real fare/route data) ────────────────────────
const SAMPLE_TRIPS: Trip[] = [
  {
    id: 's1',
    route_number: 'BRTS-1',
    route_name: 'Hubballi CBT - Dharwad CBT',
    route_color: '#F9A825',
    route_type: 'brts',
    from_stop: 'Hubballi CBT',
    to_stop: 'Dharwad CBT',
    amount: 25,
    duration_mins: 45,
    travel_date: '2026-07-07',
    travel_time: '09:15',
    status: 'completed',
  },
  {
    id: 's2',
    route_number: 'EXP-7',
    route_name: 'Gokul Road - Karnatak University',
    route_color: '#1565C0',
    route_type: 'express',
    from_stop: 'Gokul Road',
    to_stop: 'Karnatak University',
    amount: 20,
    duration_mins: 40,
    travel_date: '2026-07-06',
    travel_time: '17:30',
    status: 'completed',
  },
  {
    id: 's3',
    route_number: 'AC-3',
    route_name: 'Hubballi Railway - Dharwad',
    route_color: '#2E7D32',
    route_type: 'ac',
    from_stop: 'Hubballi Railway Station',
    to_stop: 'Dharwad City',
    amount: 30,
    duration_mins: 35,
    travel_date: '2026-07-05',
    travel_time: '14:00',
    status: 'completed',
  },
  {
    id: 's4',
    route_number: 'ORD-14',
    route_name: 'Old Hubballi - Dharwad Bus Stand',
    route_color: '#616161',
    route_type: 'ordinary',
    from_stop: 'Old Hubballi',
    to_stop: 'Dharwad Bus Stand',
    amount: 15,
    duration_mins: 50,
    travel_date: '2026-07-04',
    travel_time: '08:45',
    status: 'completed',
  },
  {
    id: 's5',
    route_number: 'VAJ-5',
    route_name: 'KIMS Hospital - Dharwad APMC',
    route_color: '#6A1B9A',
    route_type: 'vajra',
    from_stop: 'KIMS Hospital',
    to_stop: 'Dharwad APMC',
    amount: 22,
    duration_mins: 42,
    travel_date: '2026-07-03',
    travel_time: '11:20',
    status: 'completed',
  },
  {
    id: 's6',
    route_number: 'BRTS-2',
    route_name: 'Hubballi Airport - Dharwad Court',
    route_color: '#F9A825',
    route_type: 'brts',
    from_stop: 'Hubballi Airport',
    to_stop: 'Dharwad Court',
    amount: 28,
    duration_mins: 55,
    travel_date: '2026-07-02',
    travel_time: '06:30',
    status: 'completed',
  },
  {
    id: 's7',
    route_number: 'EXP-7',
    route_name: 'Gokul Road - Karnatak University',
    route_color: '#1565C0',
    route_type: 'express',
    from_stop: 'Gokul Road',
    to_stop: 'Karnatak University',
    amount: 20,
    duration_mins: 40,
    travel_date: '2026-07-01',
    travel_time: '18:15',
    status: 'completed',
  },
  {
    id: 's8',
    route_number: 'BRTS-1',
    route_name: 'Hubballi CBT - Dharwad CBT',
    route_color: '#F9A825',
    route_type: 'brts',
    from_stop: 'Hubballi CBT',
    to_stop: 'Sattur Cross',
    amount: 15,
    duration_mins: 20,
    travel_date: '2026-06-30',
    travel_time: '13:00',
    status: 'completed',
  },
];

type FilterType = 'all' | 'completed' | 'active';

export default function TravelHistoryScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  // Entrance animations
  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(-16);
  const statsOpacity = useSharedValue(0);
  const statsTranslateY = useSharedValue(16);
  const listOpacity = useSharedValue(0);

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
    headerTranslateY.value = withSpring(0, { damping: 16, stiffness: 100 });

    statsOpacity.value = withDelay(150, withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }));
    statsTranslateY.value = withDelay(150, withSpring(0, { damping: 16, stiffness: 100 }));

    listOpacity.value = withDelay(300, withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }));

    return () => {
      cancelAnimation(headerOpacity);
      cancelAnimation(headerTranslateY);
      cancelAnimation(statsOpacity);
      cancelAnimation(statsTranslateY);
      cancelAnimation(listOpacity);
    };
  }, []);

  // Fetch trips
  const fetchTrips = useCallback(async () => {
    if (user) {
      const { data } = await supabase
        .from('tickets')
        .select('*, route:routes(*), from_stop:stops!from_stop_id(*), to_stop:stops!to_stop_id(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        const mapped: Trip[] = data.map((t: any) => ({
          id: t.id,
          route_number: t.route?.route_number ?? '—',
          route_name: t.route?.name ?? '—',
          route_color: t.route?.color ?? Colors.primary,
          route_type: t.route?.type ?? 'ordinary',
          from_stop: t.from_stop?.name ?? '—',
          to_stop: t.to_stop?.name ?? '—',
          amount: t.amount,
          duration_mins: t.route?.duration_mins ?? 30,
          travel_date: t.travel_date,
          travel_time: new Date(t.created_at).toTimeString().slice(0, 5),
          status: t.status === 'active' ? 'active' : t.status === 'used' ? 'completed' : 'expired',
        }));
        setTrips(mapped);
        setLoading(false);
        return;
      }
    }

    // Fallback to sample data
    setTrips(SAMPLE_TRIPS);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTrips();
    setRefreshing(false);
  }, [fetchTrips]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const triggerHaptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(style);
  };

  const handleRepeatJourney = (trip: Trip) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/buy-ticket');
  };

  const handleClearSearch = () => {
    triggerHaptic();
    setSearchQuery('');
  };

  const handleFilterChange = (newFilter: FilterType) => {
    triggerHaptic();
    setFilter(newFilter);
  };

  // ─── Filtered trips ─────────────────────────────────────────────────────────
  const filteredTrips = useMemo(() => {
    let result = trips;

    if (filter !== 'all') {
      result = result.filter((t) => t.status === filter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.route_number.toLowerCase().includes(q) ||
          t.route_name.toLowerCase().includes(q) ||
          t.from_stop.toLowerCase().includes(q) ||
          t.to_stop.toLowerCase().includes(q),
      );
    }

    return result;
  }, [trips, filter, searchQuery]);

  // ─── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const completed = trips.filter((t) => t.status === 'completed');
    const totalSpent = completed.reduce((sum, t) => sum + t.amount, 0);
    const totalMins = completed.reduce((sum, t) => sum + t.duration_mins, 0);
    return {
      totalTrips: completed.length,
      totalSpent,
      totalHours: Math.floor(totalMins / 60),
      totalMins: totalMins % 60,
    };
  }, [trips]);

  // ─── Grouped trips by date ──────────────────────────────────────────────────
  const groupedTrips = useMemo(() => {
    const groups: Record<string, Trip[]> = {};
    filteredTrips.forEach((trip) => {
      const dateKey = trip.travel_date;
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(trip);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredTrips]);

  // ─── Animated styles ────────────────────────────────────────────────────────
  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const statsStyle = useAnimatedStyle(() => ({
    opacity: statsOpacity.value,
    transform: [{ translateY: statsTranslateY.value }],
  }));

  const listStyle = useAnimatedStyle(() => ({
    opacity: listOpacity.value,
  }));

  return (
    <Screen backgroundColor={Colors.background} safeAreaTop={false} safeAreaBottom={false}>
      {/* ─── Header ─── */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Animated.View style={headerStyle}>
          <View style={styles.headerTop}>
            <View>
              <Text variant="headlineSmall" style={styles.headerTitle}>
                Travel History
              </Text>
              <Text variant="bodySmall" style={styles.headerSubtitle}>
                Your journey records
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.filterButton, pressed && { opacity: 0.85 }]}
              onPress={() => triggerHaptic()}
            >
              <Filter size={18} color={Colors.textOnPrimary} strokeWidth={2.5} />
            </Pressable>
          </View>

          {/* Search bar */}
          <View style={styles.searchContainer}>
            <Search size={20} color={Colors.textTertiary} strokeWidth={2} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search routes, stops..."
              placeholderTextColor={Colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <Pressable style={styles.searchClear} onPress={handleClearSearch} hitSlop={8}>
                <X size={18} color={Colors.textSecondary} strokeWidth={2} />
              </Pressable>
            )}
          </View>
        </Animated.View>
      </View>

      {/* ─── Stats Summary ─── */}
      <Animated.View style={[styles.statsContainer, statsStyle]}>
        <Card style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: Colors.primaryLight }]}>
                <Bus size={18} color={Colors.primary} strokeWidth={2.5} />
              </View>
              <Text variant="titleLarge" style={styles.statValue}>
                {stats.totalTrips}
              </Text>
              <Text variant="caption" color={Colors.textTertiary}>
                Trips
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: Colors.successLight }]}>
                <IndianRupee size={18} color={Colors.success} strokeWidth={2.5} />
              </View>
              <Text variant="titleLarge" style={styles.statValue}>
                {stats.totalSpent}
              </Text>
              <Text variant="caption" color={Colors.textTertiary}>
                Spent
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: Colors.warningLight }]}>
                <Timer size={18} color={Colors.warning} strokeWidth={2.5} />
              </View>
              <Text variant="titleLarge" style={styles.statValue}>
                {stats.totalHours}h {stats.totalMins}m
              </Text>
              <Text variant="caption" color={Colors.textTertiary}>
                Travelled
              </Text>
            </View>
          </View>
        </Card>
      </Animated.View>

      {/* ─── Filter Chips ─── */}
      <View style={styles.filterRow}>
        <Chip
          label="All"
          selected={filter === 'all'}
          onPress={() => handleFilterChange('all')}
        />
        <Chip
          label="Completed"
          selected={filter === 'completed'}
          onPress={() => handleFilterChange('completed')}
        />
        <Chip
          label="Active"
          selected={filter === 'active'}
          onPress={() => handleFilterChange('active')}
        />
      </View>

      {/* ─── Trip List ─── */}
      <Animated.ScrollView
        style={listStyle}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {loading ? (
          <TripListSkeleton />
        ) : filteredTrips.length === 0 ? (
          <EmptyState
            icon={<Search size={32} color={Colors.textTertiary} strokeWidth={1.5} />}
            title="No trips found"
            message={searchQuery ? "Try a different search term" : "Your travel history will appear here"}
          />
        ) : (
          groupedTrips.map(([date, dateTrips]) => (
            <View key={date} style={styles.dateGroup}>
              {/* Date header */}
              <View style={styles.dateHeader}>
                <View style={styles.dateIcon}>
                  <Calendar size={14} color={Colors.primary} strokeWidth={2.5} />
                </View>
                <Text variant="titleSmall" color={Colors.primary}>
                  {formatDateHeader(date)}
                </Text>
                <Text variant="caption" color={Colors.textTertiary} style={styles.dateCount}>
                  {dateTrips.length} {dateTrips.length === 1 ? 'trip' : 'trips'}
                </Text>
              </View>

              {/* Trip cards */}
              {dateTrips.map((trip, idx) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  onRepeat={() => handleRepeatJourney(trip)}
                  index={idx}
                />
              ))}
            </View>
          ))
        )}
      </Animated.ScrollView>
    </Screen>
  );
}

// ─── Trip Card Component ─────────────────────────────────────────────────────
function TripCard({
  trip,
  onRepeat,
  index,
}: {
  trip: Trip;
  onRepeat: () => void;
  index: number;
}) {
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(16);

  useEffect(() => {
    cardOpacity.value = withDelay(
      index * 80,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }),
    );
    cardTranslateY.value = withDelay(
      index * 80,
      withSpring(0, { damping: 16, stiffness: 100 }),
    );

    return () => {
      cancelAnimation(cardOpacity);
      cancelAnimation(cardTranslateY);
    };
  }, [index]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  return (
    <Animated.View style={cardStyle}>
      <Card style={styles.tripCard} padding={0} onPress={onRepeat}>
        {/* Route color strip */}
        <View style={[styles.tripColorStrip, { backgroundColor: trip.route_color }]} />

        <View style={styles.tripCardBody}>
          {/* Top row: route badge + status */}
          <View style={styles.tripTopRow}>
            <View style={styles.tripRouteInfo}>
              <View style={[styles.tripRouteBadge, { backgroundColor: trip.route_color }]}>
                <Text variant="caption" style={styles.tripRouteText}>
                  {trip.route_number}
                </Text>
              </View>
              <View style={styles.tripRouteNameContainer}>
                <Text variant="titleSmall" numberOfLines={1}>
                  {trip.route_name}
                </Text>
                <Badge
                  label={trip.route_type.toUpperCase()}
                  variant="neutral"
                />
              </View>
            </View>
            {trip.status === 'completed' && (
              <View style={styles.statusBadge}>
                <CircleDot size={12} color={Colors.success} strokeWidth={2.5} />
                <Text variant="caption" color={Colors.success} style={styles.statusText}>
                  Done
                </Text>
              </View>
            )}
          </View>

          {/* From → To */}
          <View style={styles.tripRoute}>
            <View style={styles.tripEndpoint}>
              <View style={[styles.tripDot, { backgroundColor: trip.route_color }]} />
              <Text variant="bodyMedium" numberOfLines={1} style={styles.tripStopName}>
                {trip.from_stop}
              </Text>
            </View>
            <View style={styles.tripConnector}>
              <View style={styles.tripConnectorLine} />
              <ArrowRight size={14} color={Colors.textTertiary} strokeWidth={2} />
            </View>
            <View style={styles.tripEndpoint}>
              <View style={[styles.tripDot, { backgroundColor: trip.route_color, borderRadius: 0 }]} />
              <Text variant="bodyMedium" numberOfLines={1} style={styles.tripStopName}>
                {trip.to_stop}
              </Text>
            </View>
          </View>

          {/* Stats row */}
          <View style={styles.tripStatsRow}>
            {/* Time */}
            <View style={styles.tripStat}>
              <Clock size={14} color={Colors.textTertiary} strokeWidth={2} />
              <Text variant="bodySmall" color={Colors.textSecondary}>
                {trip.travel_time}
              </Text>
            </View>

            {/* Duration */}
            <View style={styles.tripStat}>
              <Timer size={14} color={Colors.textTertiary} strokeWidth={2} />
              <Text variant="bodySmall" color={Colors.textSecondary}>
                {trip.duration_mins} min
              </Text>
            </View>

            {/* Fare */}
            <View style={styles.tripStat}>
              <IndianRupee size={14} color={Colors.textTertiary} strokeWidth={2} />
              <Text variant="bodySmall" color={Colors.textSecondary} style={styles.tripFareText}>
                {trip.amount}
              </Text>
            </View>

            {/* Repeat journey button */}
            <Pressable
              style={({ pressed }) => [styles.repeatButton, pressed && styles.repeatButtonPressed]}
              onPress={onRepeat}
            >
              <Repeat2 size={15} color={Colors.primary} strokeWidth={2.5} />
              <Text variant="labelSmall" color={Colors.primary} style={styles.repeatText}>
                Repeat
              </Text>
            </Pressable>
          </View>
        </View>
      </Card>
    </Animated.View>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
function TripListSkeleton() {
  return (
    <View style={styles.skeletonContainer}>
      {[0, 1, 2, 3].map((i) => (
        <Card key={i} style={styles.tripCard} padding={0}>
          <View style={[styles.tripColorStrip, { backgroundColor: Colors.outline }]} />
          <View style={styles.tripCardBody}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md }}>
              <Skeleton width={48} height={24} borderRadius={6} />
              <Skeleton width={180} height={16} borderRadius={4} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md }}>
              <Skeleton width={8} height={8} borderRadius={4} />
              <Skeleton width={120} height={14} borderRadius={4} />
            </View>
            <View style={{ flexDirection: 'row', gap: Spacing.lg }}>
              <Skeleton width={50} height={12} borderRadius={4} />
              <Skeleton width={50} height={12} borderRadius={4} />
              <Skeleton width={40} height={12} borderRadius={4} />
            </View>
          </View>
        </Card>
      ))}
    </View>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ─── Header ───
  header: {
    backgroundColor: Colors.primaryDark,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.base,
    borderBottomLeftRadius: Radius.bottomSheet,
    borderBottomRightRadius: Radius.bottomSheet,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  headerTitle: {
    color: Colors.textOnPrimary,
    fontFamily: FontFamily.bold,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── Search ───
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.input,
    paddingHorizontal: Spacing.base,
    paddingVertical: 2,
    minHeight: 48,
    ...Shadows.low,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: Colors.textPrimary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  searchClear: {
    padding: Spacing.xs,
  },

  // ─── Stats ───
  statsContainer: {
    paddingHorizontal: Spacing.base,
    marginTop: -Spacing.sm,
  },
  statsCard: {
    ...Shadows.medium,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontFamily: FontFamily.bold,
    marginBottom: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.divider,
  },

  // ─── Filter Chips ───
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },

  // ─── List ───
  listContent: {
    paddingHorizontal: Spacing.base,
  },
  dateGroup: {
    marginBottom: Spacing.lg,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  dateIcon: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCount: {
    marginLeft: 'auto',
  },

  // ─── Trip Card ───
  tripCard: {
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Shadows.low,
  },
  tripColorStrip: {
    height: 4,
    width: '100%',
  },
  tripCardBody: {
    padding: Spacing.base,
  },
  tripTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  tripRouteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  tripRouteBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    minWidth: 52,
    alignItems: 'center',
  },
  tripRouteText: {
    color: Colors.textOnPrimary,
    fontFamily: FontFamily.bold,
    fontSize: 11,
    fontWeight: '700',
  },
  tripRouteNameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.successLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  statusText: {
    fontWeight: '600',
  },

  // ─── Route ───
  tripRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  tripEndpoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  tripDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: Colors.surface,
    ...Shadows.low,
  },
  tripStopName: {
    flex: 1,
  },
  tripConnector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },
  tripConnectorLine: {
    width: 16,
    height: 1.5,
    backgroundColor: Colors.outline,
    marginRight: 2,
  },

  // ─── Trip Stats ───
  tripStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  tripStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tripFareText: {
    fontWeight: '600',
  },
  repeatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    marginLeft: 'auto',
  },
  repeatButtonPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.85,
  },
  repeatText: {
    fontWeight: '600',
  },

  // ─── Skeleton ───
  skeletonContainer: {
    gap: Spacing.md,
  },
});
