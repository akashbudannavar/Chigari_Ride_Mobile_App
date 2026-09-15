import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Pressable, ScrollView, RefreshControl, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  cancelAnimation,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import {
  Search,
  Navigation2,
  Ticket,
  Wallet,
  Bus,
  MapPin,
  Clock,
  ArrowRight,
  ArrowLeftRight,
  TrendingUp,
  Bell,
  ChevronRight,
  Users,
  Gauge,
  CircleDot,
  Calendar,
  Route as RouteIcon,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useRoutes, useLivePositions, useTickets } from '@/hooks/useTransitData';
import { supabase } from '@/lib/supabase';
import { Colors, FontFamily, Spacing, Radius, Shadows, Typography } from '@/constants/theme';
import type { LivePosition, Stop } from '@/types/database';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Quick action config ─────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { id: 'buy', label: 'Buy Ticket', icon: Ticket, color: '#1565C0', bg: '#E3F2FD' },
  { id: 'wallet', label: 'Wallet', icon: Wallet, color: '#2E7D32', bg: '#E8F5E9' },
  { id: 'routes', label: 'Routes', icon: RouteIcon, color: '#F9A825', bg: '#FFF8E1' },
  { id: 'history', label: 'History', icon: Calendar, color: '#6A1B9A', bg: '#F3E5F5' },
] as const;

// ─── Announcements ──────────────────────────────────────────────────────────
const ANNOUNCEMENTS = [
  { id: 1, title: 'New BRTS Route Added', message: 'BRTS-2 now connects Hubballi Airport to Dharwad Court', variant: 'primary' as const },
  { id: 2, title: 'AC Bus Service Live', message: 'AC-3 route now operational with AC buses', variant: 'success' as const },
  { id: 3, title: 'Frequency Updated', message: 'ORD-14 frequency improved to every 8 minutes', variant: 'warning' as const },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const { routes, loading: routesLoading } = useRoutes();
  const { positions, loading: positionsLoading } = useLivePositions();
  const { tickets, loading: ticketsLoading } = useTickets(user?.id ?? null);

  const [nearbyStops, setNearbyStops] = useState<(Stop & { route_count: number })[]>([]);
  const [stopsLoading, setStopsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Entrance animations
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(20);
  const scrollY = useSharedValue(0);

  // Live pulse
  const livePulse = useSharedValue(1);

  useEffect(() => {
    contentOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) });
    contentTranslateY.value = withSpring(0, { damping: 16, stiffness: 90 });

    livePulse.value = withRepeat(
      withSequence(
        withTiming(1.4, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    return () => {
      cancelAnimation(contentOpacity);
      cancelAnimation(contentTranslateY);
      cancelAnimation(livePulse);
    };
  }, []);

  // Fetch nearby stops
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('stops')
        .select('*, route_count:route_stops(count)')
        .order('name')
        .limit(6);
      if (data) {
        const stops = data.map((s: any) => ({ ...s, route_count: s.route_count?.[0]?.count ?? 0 }));
        stops.sort((a: any, b: any) => b.route_count - a.route_count);
        setNearbyStops(stops);
      }
      setStopsLoading(false);
    })();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 1000));
    setRefreshing(false);
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const liveDotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: livePulse.value }],
  }));

  // ─── Handlers ────────────────────────────────────────────────────────────
  const triggerHaptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(style);
  };

  const handleQuickAction = (id: string) => {
    triggerHaptic();
    switch (id) {
      case 'buy':
        router.push('/buy-ticket');
        break;
      case 'wallet':
        router.push('/wallet');
        break;
      case 'routes':
        router.push('/(tabs)/routes');
        break;
      case 'history':
        router.push('/(tabs)/tickets');
        break;
    }
  };

  const handleSearch = () => {
    triggerHaptic();
    router.push('/(tabs)/routes');
  };

  const handleLiveTrack = () => {
    triggerHaptic();
    router.push('/(tabs)/live');
  };

  const handleRoutePlanner = () => {
    triggerHaptic();
    router.push('/(tabs)/routes');
  };

  const handleNearbyStop = (stopName: string) => {
    triggerHaptic();
    router.push('/(tabs)/routes');
  };

  const handleViewAllTickets = () => {
    triggerHaptic();
    router.push('/(tabs)/tickets');
  };

  // ─── Derived data ──────────────────────────────────────────────────────────
  const greeting = getGreeting();
  const userName = profile?.full_name?.split(' ')[0] ?? 'Rider';
  const activeBuses = positions.filter((p) => p.bus?.route);
  const liveBuses = activeBuses.slice(0, 3);
  const recentTickets = tickets.slice(0, 2);

  // Arrival/departure from live positions (simulated from speed + heading)
  const arrivals = activeBuses
    .filter((p) => p.speed > 0)
    .slice(0, 3)
    .map((p) => ({
      id: p.id,
      routeNumber: p.bus?.route?.route_number ?? '—',
      routeName: p.bus?.route?.name ?? '—',
      destination: p.bus?.route?.destination ?? '—',
      eta: Math.max(2, Math.round(40 / (p.speed || 1))),
      occupancy: p.occupancy,
      color: p.bus?.route?.color ?? Colors.primary,
    }));

  const departures = activeBuses
    .filter((p) => p.speed === 0 || p.speed < 5)
    .slice(0, 3)
    .map((p) => ({
      id: p.id,
      routeNumber: p.bus?.route?.route_number ?? '—',
      routeName: p.bus?.route?.name ?? '—',
      origin: p.bus?.route?.origin ?? '—',
      platform: p.bus?.plate?.slice(-4) ?? '—',
      occupancy: p.occupancy,
      color: p.bus?.route?.color ?? Colors.primary,
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
        {/* Greeting row */}
        <View style={styles.greetingRow}>
          <View style={styles.greetingLeft}>
            <Text variant="bodySmall" style={styles.greetingText}>
              {greeting},
            </Text>
            <Text variant="headlineMedium" style={styles.userName}>
              {userName}
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.bellButton, pressed && { opacity: 0.8 }]}
            onPress={() => triggerHaptic()}
          >
            <Bell size={20} color={Colors.textOnPrimary} strokeWidth={2} />
            <View style={styles.bellDot} />
          </Pressable>
        </View>

        {/* Wallet balance mini-card */}
        <Pressable
          style={({ pressed }) => [styles.walletMiniCard, pressed && { opacity: 0.92 }]}
          onPress={() => router.push('/wallet')}
        >
          <View style={styles.walletMiniLeft}>
            <View style={styles.walletMiniIcon}>
              <Wallet size={18} color={Colors.textOnPrimary} strokeWidth={2} />
            </View>
            <View>
              <Text variant="caption" style={styles.walletMiniLabel}>
                Wallet Balance
              </Text>
              <Text variant="titleMedium" style={styles.walletMiniAmount}>
                {formatCurrency(profile?.wallet_balance ?? 0)}
              </Text>
            </View>
          </View>
          <View style={styles.walletMiniAdd}>
            <Text variant="labelMedium" style={styles.walletMiniAddText}>
              Top Up
            </Text>
            <ArrowRight size={14} color={Colors.textOnPrimary} strokeWidth={2.5} />
          </View>
        </Pressable>
      </LinearGradient>

      {/* ─── Scrollable Content ─── */}
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        <Animated.View style={contentStyle}>
          {/* ─── Search Bar ─── */}
          <View style={styles.searchContainer}>
            <Pressable
              style={({ pressed }) => [styles.searchBar, pressed && { opacity: 0.95 }]}
              onPress={handleSearch}
            >
              <Search size={20} color={Colors.textTertiary} strokeWidth={2} />
              <Text variant="bodyMedium" color={Colors.textTertiary} style={styles.searchPlaceholder}>
                Search routes, stops, buses...
              </Text>
            </Pressable>
          </View>

          {/* ─── Quick Actions ─── */}
          <View style={styles.quickActionsRow}>
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <Pressable
                  key={action.id}
                  style={({ pressed }) => [styles.quickAction, pressed && styles.quickActionPressed]}
                  onPress={() => handleQuickAction(action.id)}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: action.bg }]}>
                    <Icon size={22} color={action.color} strokeWidth={2.5} />
                  </View>
                  <Text variant="labelMedium" color={Colors.textSecondary} style={styles.quickActionLabel}>
                    {action.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* ─── Live Bus Tracking ─── */}
          <SectionHeader
            title="Live Bus Tracking"
            action={
              <Pressable onPress={handleLiveTrack} hitSlop={8} style={styles.sectionAction}>
                <Text variant="labelLarge" color={Colors.primary}>
                  View Map
                </Text>
              </Pressable>
            }
          />

          {positionsLoading ? (
            <LiveTrackingSkeleton />
          ) : liveBuses.length > 0 ? (
            <Card style={styles.liveCard} padding={0}>
              <LinearGradient
                colors={[Colors.primaryDark, Colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.liveCardHeader}
              >
                <View style={styles.liveHeaderLeft}>
                  <Animated.View style={[styles.liveDot, liveDotStyle]} />
                  <Text variant="titleSmall" style={styles.liveHeaderText}>
                    {activeBuses.length} buses live now
                  </Text>
                </View>
                <Badge label="REAL-TIME" variant="accent" />
              </LinearGradient>

              <View style={styles.liveCardBody}>
                {liveBuses.map((pos, idx) => (
                  <LiveBusRow key={pos.id} position={pos} isLast={idx === liveBuses.length - 1} />
                ))}
              </View>

              <Pressable
                style={({ pressed }) => [styles.liveCardFooter, pressed && { opacity: 0.8 }]}
                onPress={handleLiveTrack}
              >
                <Text variant="labelLarge" color={Colors.primary}>
                  Open Live Map
                </Text>
                <Navigation2 size={16} color={Colors.primary} strokeWidth={2.5} />
              </Pressable>
            </Card>
          ) : (
            <Card style={styles.emptyCard}>
              <Text variant="bodyMedium" color={Colors.textSecondary} align="center">
                No live buses tracking at the moment
              </Text>
            </Card>
          )}

          {/* ─── Arrivals & Departures ─── */}
          <View style={styles.arrDepContainer}>
            {/* Arrivals */}
            <View style={styles.arrDepColumn}>
              <SectionHeader title="Arrival" />
              {positionsLoading ? (
                <ArrDepSkeleton />
              ) : arrivals.length > 0 ? (
                <Card style={styles.arrDepCard} padding={0}>
                  {arrivals.map((item, idx) => (
                    <ArrivalRow key={item.id} item={item} isLast={idx === arrivals.length - 1} />
                  ))}
                </Card>
              ) : (
                <Card style={styles.arrDepEmpty}>
                  <Text variant="bodySmall" color={Colors.textTertiary} align="center">
                    No arrivals
                  </Text>
                </Card>
              )}
            </View>

            {/* Departures */}
            <View style={styles.arrDepColumn}>
              <SectionHeader title="Departure" />
              {positionsLoading ? (
                <ArrDepSkeleton />
              ) : departures.length > 0 ? (
                <Card style={styles.arrDepCard} padding={0}>
                  {departures.map((item, idx) => (
                    <DepartureRow key={item.id} item={item} isLast={idx === departures.length - 1} />
                  ))}
                </Card>
              ) : (
                <Card style={styles.arrDepEmpty}>
                  <Text variant="bodySmall" color={Colors.textTertiary} align="center">
                    No departures
                  </Text>
                </Card>
              )}
            </View>
          </View>

          {/* ─── Travel History ─── */}
          <SectionHeader
            title="Travel History"
            action={
              <Pressable onPress={handleViewAllTickets} hitSlop={8} style={styles.sectionAction}>
                <Text variant="labelLarge" color={Colors.primary}>
                  View All
                </Text>
              </Pressable>
            }
          />
          {ticketsLoading ? (
            <HistorySkeleton />
          ) : recentTickets.length > 0 ? (
            <View style={styles.historyList}>
              {recentTickets.map((ticket) => (
                <Card key={ticket.id} style={styles.historyCard} onPress={handleViewAllTickets}>
                  <View style={styles.historyLeft}>
                    <View style={[styles.historyRouteBadge, { backgroundColor: (ticket.route as any)?.color ?? Colors.primary }]}>
                      <Text variant="caption" style={styles.historyRouteText}>
                        {(ticket.route as any)?.route_number ?? '—'}
                      </Text>
                    </View>
                    <View style={styles.historyInfo}>
                      <Text variant="titleSmall" numberOfLines={1}>
                        {(ticket.from_stop as any)?.name ?? '—'} → {(ticket.to_stop as any)?.name ?? '—'}
                      </Text>
                      <Text variant="bodySmall" color={Colors.textSecondary}>
                        {formatDate(ticket.travel_date)} · {formatCurrency(ticket.amount)}
                      </Text>
                    </View>
                  </View>
                  <Badge
                    label={ticket.status.toUpperCase()}
                    variant={ticket.status === 'active' ? 'success' : 'neutral'}
                  />
                </Card>
              ))}
            </View>
          ) : (
            <Card style={styles.emptyCard} onPress={() => router.push('/buy-ticket')}>
              <View style={styles.emptyHistoryContent}>
                <Ticket size={28} color={Colors.textTertiary} strokeWidth={1.5} />
                <Text variant="bodyMedium" color={Colors.textSecondary} align="center" style={styles.emptyText}>
                  No trips yet. Buy your first ticket!
                </Text>
              </View>
            </Card>
          )}

          {/* ─── Route Planner ─── */}
          <SectionHeader title="Route Planner" />
          <Card style={styles.routePlannerCard} padding={0} onPress={handleRoutePlanner}>
            <LinearGradient
              colors={[Colors.primaryLight, Colors.surface]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.routePlannerGradient}
            >
              <View style={styles.routePlannerContent}>
                <View style={styles.routePlannerIcon}>
                  <ArrowLeftRight size={24} color={Colors.primary} strokeWidth={2.5} />
                </View>
                <View style={styles.routePlannerText}>
                  <Text variant="titleSmall">Plan Your Journey</Text>
                  <Text variant="bodySmall" color={Colors.textSecondary}>
                    Find the best route across {routes.length} routes
                  </Text>
                </View>
                <ChevronRight size={20} color={Colors.primary} strokeWidth={2.5} />
              </View>
            </LinearGradient>
          </Card>

          {/* ─── Nearby Stops ─── */}
          <SectionHeader
            title="Nearby Stops"
            action={
              <Pressable onPress={() => router.push('/(tabs)/routes')} hitSlop={8} style={styles.sectionAction}>
                <Text variant="labelLarge" color={Colors.primary}>
                  See All
                </Text>
              </Pressable>
            }
          />
          {stopsLoading ? (
            <NearbyStopsSkeleton />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.nearbyStopsScroll}
            >
              {nearbyStops.map((stop) => (
                <Pressable
                  key={stop.id}
                  style={({ pressed }) => [styles.nearbyStopCard, pressed && { opacity: 0.9 }]}
                  onPress={() => handleNearbyStop(stop.name)}
                >
                  <View style={styles.nearbyStopIcon}>
                    <MapPin size={18} color={Colors.primary} strokeWidth={2.5} />
                  </View>
                  <Text variant="titleSmall" numberOfLines={1} style={styles.nearbyStopName}>
                    {stop.name}
                  </Text>
                  <Text variant="caption" color={Colors.textTertiary}>
                    {stop.route_count} routes
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {/* ─── Announcements ─── */}
          <SectionHeader title="Announcements" />
          <View style={styles.announcementsList}>
            {ANNOUNCEMENTS.map((item) => (
              <Card key={item.id} style={styles.announcementCard} onPress={() => triggerHaptic()}>
                <View style={styles.announcementLeft}>
                  <View
                    style={[
                      styles.announcementIcon,
                      item.variant === 'primary' && { backgroundColor: Colors.primaryLight },
                      item.variant === 'success' && { backgroundColor: Colors.successLight },
                      item.variant === 'warning' && { backgroundColor: Colors.warningLight },
                    ]}
                  >
                    <Bell
                      size={16}
                      color={
                        item.variant === 'primary'
                          ? Colors.primary
                          : item.variant === 'success'
                            ? Colors.success
                            : Colors.warning
                      }
                      strokeWidth={2.5}
                    />
                  </View>
                  <View style={styles.announcementContent}>
                    <Text variant="titleSmall">{item.title}</Text>
                    <Text variant="bodySmall" color={Colors.textSecondary} numberOfLines={2}>
                      {item.message}
                    </Text>
                  </View>
                </View>
                <ChevronRight size={18} color={Colors.textTertiary} strokeWidth={2} />
              </Card>
            ))}
          </View>
        </Animated.View>
      </Animated.ScrollView>
    </Screen>
  );
}

// ─── Live Bus Row Component ──────────────────────────────────────────────────
function LiveBusRow({ position, isLast }: { position: LivePosition; isLast: boolean }) {
  const route = position.bus?.route;
  const occupancyConfig = getOccupancyConfig(position.occupancy);

  return (
    <View style={[styles.liveBusRow, isLast && styles.liveBusRowLast]}>
      <View style={styles.liveBusLeft}>
        <View style={[styles.liveBusRouteBadge, { backgroundColor: route?.color ?? Colors.primary }]}>
          <Text variant="caption" style={styles.liveBusRouteText}>
            {route?.route_number ?? '—'}
          </Text>
        </View>
        <View style={styles.liveBusInfo}>
          <Text variant="titleSmall" numberOfLines={1} style={styles.liveBusRouteName}>
            {route?.name ?? 'Unknown Route'}
          </Text>
          <View style={styles.liveBusMeta}>
            <View style={styles.liveBusMetaItem}>
              <Bus size={12} color={Colors.textTertiary} strokeWidth={2} />
              <Text variant="caption" color={Colors.textTertiary}>
                {position.bus?.plate ?? '—'}
              </Text>
            </View>
            <View style={styles.liveBusMetaItem}>
              <Gauge size={12} color={Colors.textTertiary} strokeWidth={2} />
              <Text variant="caption" color={Colors.textTertiary}>
                {Math.round(position.speed)} km/h
              </Text>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.liveBusRight}>
        <View style={[styles.occupancyDot, { backgroundColor: occupancyConfig.color }]} />
        <Text variant="caption" color={occupancyConfig.color} style={styles.occupancyLabel}>
          {occupancyConfig.label}
        </Text>
      </View>
    </View>
  );
}

// ─── Arrival Row ─────────────────────────────────────────────────────────────
function ArrivalRow({
  item,
  isLast,
}: {
  item: { id: string; routeNumber: string; routeName: string; destination: string; eta: number; occupancy: string; color: string };
  isLast: boolean;
}) {
  const occConfig = getOccupancyConfig(item.occupancy);
  return (
    <View style={[styles.arrDepRow, isLast && styles.arrDepRowLast]}>
      <View style={styles.arrDepLeft}>
        <View style={[styles.arrDepRouteBadge, { backgroundColor: item.color }]}>
          <Text variant="caption" style={styles.arrDepRouteText}>
            {item.routeNumber}
          </Text>
        </View>
        <View style={styles.arrDepInfo}>
          <Text variant="titleSmall" numberOfLines={1}>
            {item.destination}
          </Text>
          <Text variant="caption" color={Colors.textTertiary} numberOfLines={1}>
            {item.routeName}
          </Text>
        </View>
      </View>
      <View style={styles.arrDepRight}>
        <Text variant="titleSmall" color={Colors.primary} style={styles.arrDepEta}>
          {item.eta}m
        </Text>
        <View style={[styles.occupancyDot, { backgroundColor: occConfig.color }]} />
      </View>
    </View>
  );
}

// ─── Departure Row ───────────────────────────────────────────────────────────
function DepartureRow({
  item,
  isLast,
}: {
  item: { id: string; routeNumber: string; routeName: string; origin: string; platform: string; occupancy: string; color: string };
  isLast: boolean;
}) {
  const occConfig = getOccupancyConfig(item.occupancy);
  return (
    <View style={[styles.arrDepRow, isLast && styles.arrDepRowLast]}>
      <View style={styles.arrDepLeft}>
        <View style={[styles.arrDepRouteBadge, { backgroundColor: item.color }]}>
          <Text variant="caption" style={styles.arrDepRouteText}>
            {item.routeNumber}
          </Text>
        </View>
        <View style={styles.arrDepInfo}>
          <Text variant="titleSmall" numberOfLines={1}>
            {item.origin}
          </Text>
          <Text variant="caption" color={Colors.textTertiary} numberOfLines={1}>
            Platform {item.platform}
          </Text>
        </View>
      </View>
      <View style={styles.arrDepRight}>
        <View style={[styles.occupancyDot, { backgroundColor: occConfig.color }]} />
        <Text variant="caption" color={occConfig.color} style={styles.occupancyLabel}>
          {occConfig.label}
        </Text>
      </View>
    </View>
  );
}

// ─── Skeletons ───────────────────────────────────────────────────────────────
function LiveTrackingSkeleton() {
  return (
    <Card style={styles.liveCard} padding={0}>
      <View style={styles.liveCardBody}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.liveBusRow, i === 2 && styles.liveBusRowLast]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
              <Skeleton width={48} height={24} borderRadius={6} />
              <View>
                <Skeleton width={140} height={16} borderRadius={4} />
                <Skeleton width={100} height={12} borderRadius={4} style={{ marginTop: 4 }} />
              </View>
            </View>
            <Skeleton width={50} height={12} borderRadius={4} />
          </View>
        ))}
      </View>
    </Card>
  );
}

function ArrDepSkeleton() {
  return (
    <Card style={styles.arrDepCard} padding={0}>
      {[0, 1].map((i) => (
        <View key={i} style={[styles.arrDepRow, i === 1 && styles.arrDepRowLast]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <Skeleton width={36} height={20} borderRadius={4} />
            <View>
              <Skeleton width={80} height={14} borderRadius={4} />
              <Skeleton width={60} height={10} borderRadius={4} style={{ marginTop: 4 }} />
            </View>
          </View>
          <Skeleton width={30} height={14} borderRadius={4} />
        </View>
      ))}
    </Card>
  );
}

function HistorySkeleton() {
  return (
    <View style={styles.historyList}>
      {[0, 1].map((i) => (
        <Card key={i} style={styles.historyCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
            <Skeleton width={44} height={28} borderRadius={6} />
            <View>
              <Skeleton width={160} height={16} borderRadius={4} />
              <Skeleton width={100} height={12} borderRadius={4} style={{ marginTop: 4 }} />
            </View>
          </View>
        </Card>
      ))}
    </View>
  );
}

function NearbyStopsSkeleton() {
  return (
    <View style={[styles.nearbyStopsScroll, { gap: Spacing.md }]}>
      {[0, 1, 2].map((i) => (
        <Card key={i} style={styles.nearbyStopCard}>
          <Skeleton width={32} height={32} borderRadius={16} />
          <Skeleton width={80} height={14} borderRadius={4} style={{ marginTop: Spacing.sm }} />
          <Skeleton width={50} height={10} borderRadius={4} style={{ marginTop: 4 }} />
        </Card>
      ))}
    </View>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatCurrency(amount: number): string {
  return `₹${amount.toFixed(0)}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function getOccupancyConfig(occupancy: string): { label: string; color: string } {
  switch (occupancy) {
    case 'low':
      return { label: 'Low', color: Colors.success };
    case 'medium':
      return { label: 'Medium', color: Colors.warning };
    case 'high':
      return { label: 'High', color: '#F57C00' };
    case 'full':
      return { label: 'Full', color: Colors.error };
    default:
      return { label: '—', color: Colors.textTertiary };
  }
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderBottomLeftRadius: Radius.bottomSheet,
    borderBottomRightRadius: Radius.bottomSheet,
    overflow: 'hidden',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  greetingLeft: {
    flex: 1,
  },
  greetingText: {
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 2,
  },
  userName: {
    color: Colors.textOnPrimary,
    fontFamily: FontFamily.bold,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.warning,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  walletMiniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: Radius.card,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  walletMiniLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  walletMiniIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletMiniLabel: {
    color: 'rgba(255,255,255,0.7)',
  },
  walletMiniAmount: {
    color: Colors.textOnPrimary,
    fontFamily: FontFamily.bold,
  },
  walletMiniAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
  },
  walletMiniAddText: {
    color: Colors.textOnPrimary,
  },

  // ─── Scroll ───
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.base,
  },

  // ─── Search ───
  searchContainer: {
    marginTop: Spacing.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.input,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md + 2,
    ...Shadows.low,
  },
  searchPlaceholder: {
    flex: 1,
  },

  // ─── Quick Actions ───
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionPressed: {
    transform: [{ scale: 0.95 }],
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

  // ─── Section action ───
  sectionAction: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    marginRight: -Spacing.sm,
  },

  // ─── Live Tracking Card ───
  liveCard: {
    overflow: 'hidden',
    ...Shadows.medium,
  },
  liveCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  liveHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4FC3F7',
  },
  liveHeaderText: {
    color: Colors.textOnPrimary,
  },
  liveCardBody: {
    paddingVertical: 0,
  },
  liveBusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  liveBusRowLast: {
    borderBottomWidth: 0,
  },
  liveBusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  liveBusRouteBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    minWidth: 48,
    alignItems: 'center',
  },
  liveBusRouteText: {
    color: Colors.textOnPrimary,
    fontFamily: FontFamily.bold,
    fontSize: 11,
    fontWeight: '700',
  },
  liveBusInfo: {
    flex: 1,
  },
  liveBusRouteName: {
    marginBottom: 2,
  },
  liveBusMeta: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  liveBusMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveBusRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  occupancyLabel: {
    fontWeight: '600',
  },
  liveCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primaryLight,
  },

  // ─── Arrivals & Departures ───
  arrDepContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  arrDepColumn: {
    flex: 1,
  },
  arrDepCard: {
    overflow: 'hidden',
  },
  arrDepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  occupancyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  arrDepRowLast: {
    borderBottomWidth: 0,
  },
  arrDepLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  arrDepRouteBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    minWidth: 36,
    alignItems: 'center',
  },
  arrDepRouteText: {
    color: Colors.textOnPrimary,
    fontFamily: FontFamily.bold,
    fontSize: 10,
    fontWeight: '700',
  },
  arrDepInfo: {
    flex: 1,
  },
  arrDepRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  arrDepEta: {
    fontFamily: FontFamily.bold,
  },
  arrDepEmpty: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── Travel History ───
  historyList: {
    gap: Spacing.md,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  historyRouteBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    minWidth: 44,
    alignItems: 'center',
  },
  historyRouteText: {
    color: Colors.textOnPrimary,
    fontFamily: FontFamily.bold,
    fontSize: 11,
    fontWeight: '700',
  },
  historyInfo: {
    flex: 1,
  },
  emptyCard: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHistoryContent: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  emptyText: {
    marginTop: Spacing.xs,
  },

  // ─── Route Planner ───
  routePlannerCard: {
    overflow: 'hidden',
    ...Shadows.medium,
  },
  routePlannerGradient: {
    borderRadius: Radius.card,
  },
  routePlannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.base,
  },
  routePlannerIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.card,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.low,
  },
  routePlannerText: {
    flex: 1,
  },

  // ─── Nearby Stops ───
  nearbyStopsScroll: {
    paddingRight: Spacing.base,
    gap: Spacing.md,
  },
  nearbyStopCard: {
    width: 140,
    padding: Spacing.md,
    alignItems: 'flex-start',
  },
  nearbyStopIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  nearbyStopName: {
    marginBottom: 2,
  },

  // ─── Announcements ───
  announcementsList: {
    gap: Spacing.md,
  },
  announcementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  announcementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  announcementIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  announcementContent: {
    flex: 1,
  },
});
