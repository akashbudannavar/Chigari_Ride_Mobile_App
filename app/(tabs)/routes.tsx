import { useState, useEffect, useMemo } from 'react';
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
  Bus,
  Clock,
  MapPin,
  ArrowRight,
  Route as RouteIcon,
  Filter,
  Zap,
  Snowflake,
  Star,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Chip } from '@/components/ui/Chip';
import { Skeleton } from '@/components/ui/Skeleton';
import { useRoutes } from '@/hooks/useTransitData';
import { Colors, FontFamily, Spacing, Radius, Shadows } from '@/constants/theme';
import type { Route, RouteType } from '@/types/database';

type FilterType = 'all' | RouteType;

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'brts', label: 'BRTS' },
  { key: 'express', label: 'Express' },
  { key: 'ac', label: 'AC' },
  { key: 'ordinary', label: 'Ordinary' },
  { key: 'vajra', label: 'Vajra' },
];

function getRouteTypeIcon(type: RouteType) {
  switch (type) {
    case 'express': return <Zap size={12} color={Colors.textOnPrimary} strokeWidth={2.5} />;
    case 'ac': return <Snowflake size={12} color={Colors.textOnPrimary} strokeWidth={2.5} />;
    case 'vajra': return <Star size={12} color={Colors.textOnPrimary} strokeWidth={2.5} />;
    default: return <Bus size={12} color={Colors.textOnPrimary} strokeWidth={2.5} />;
  }
}

export default function RoutesScreen() {
  const insets = useSafeAreaInsets();
  const { routes, loading } = useRoutes();

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

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

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 1000));
    setRefreshing(false);
  };

  const handleRoutePress = (route: Route) => {
    triggerHaptic();
    router.push({ pathname: '/route-details', params: { id: route.id } });
  };

  const filteredRoutes = useMemo(() => {
    let result = routes;
    if (filter !== 'all') {
      result = result.filter((r) => r.type === filter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.route_number.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.origin.toLowerCase().includes(q) ||
          r.destination.toLowerCase().includes(q),
      );
    }
    return result;
  }, [routes, filter, searchQuery]);

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
          <View>
            <Text variant="headlineSmall" style={styles.headerTitle}>
              Routes Explorer
            </Text>
            <Text variant="bodySmall" style={styles.headerSubtitle}>
              {routes.length} routes available
            </Text>
          </View>
          <View style={styles.headerIcon}>
            <RouteIcon size={22} color={Colors.textOnPrimary} strokeWidth={2.5} />
          </View>
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
            <Pressable style={styles.searchClear} onPress={() => { triggerHaptic(); setSearchQuery(''); }} hitSlop={8}>
              <X size={18} color={Colors.textSecondary} strokeWidth={2} />
            </Pressable>
          )}
        </View>
      </LinearGradient>

      {/* ─── Filter Chips ─── */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTERS.map((f) => (
            <Chip
              key={f.key}
              label={f.label}
              selected={filter === f.key}
              onPress={() => { triggerHaptic(); setFilter(f.key); }}
            />
          ))}
        </ScrollView>
      </View>

      {/* ─── Route List ─── */}
      <Animated.ScrollView
        style={contentStyle}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {loading ? (
          <View style={styles.skeletonContainer}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Card key={i} style={styles.routeCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                  <Skeleton width={48} height={28} borderRadius={6} />
                  <View>
                    <Skeleton width={180} height={16} borderRadius={4} />
                    <Skeleton width={120} height={12} borderRadius={4} style={{ marginTop: 4 }} />
                  </View>
                </View>
              </Card>
            ))}
          </View>
        ) : filteredRoutes.length === 0 ? (
          <View style={styles.emptyState}>
            <Filter size={32} color={Colors.textTertiary} strokeWidth={1.5} />
            <Text variant="bodyMedium" color={Colors.textSecondary} align="center" style={styles.emptyText}>
              No routes found{searchQuery ? ' for your search' : ' in this category'}
            </Text>
          </View>
        ) : (
          filteredRoutes.map((route, idx) => (
            <RouteCard key={route.id} route={route} onPress={() => handleRoutePress(route)} index={idx} />
          ))
        )}
      </Animated.ScrollView>
    </Screen>
  );
}

// ─── Route Card ──────────────────────────────────────────────────────────────
function RouteCard({ route, onPress, index }: { route: Route; onPress: () => void; index: number }) {
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(16);

  useEffect(() => {
    cardOpacity.value = withDelay(
      index * 60,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }),
    );
    cardTranslateY.value = withDelay(
      index * 60,
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
      <Card style={styles.routeCard} onPress={onPress}>
        {/* Top row: badge + type */}
        <View style={styles.routeTopRow}>
          <View style={[styles.routeBadge, { backgroundColor: route.color }]}>
            {getRouteTypeIcon(route.type)}
            <Text variant="caption" style={styles.routeBadgeText}>
              {route.route_number}
            </Text>
          </View>
          <View style={styles.routeInfo}>
            <Text variant="titleSmall" numberOfLines={1}>
              {route.name}
            </Text>
            <Badge label={route.type.toUpperCase()} variant="neutral" />
          </View>
        </View>

        {/* Origin → Destination */}
        <View style={styles.routePath}>
          <View style={styles.routeEndpoint}>
            <View style={[styles.routeDot, { backgroundColor: route.color }]} />
            <Text variant="bodyMedium" numberOfLines={1} style={styles.routeStopName}>
              {route.origin}
            </Text>
          </View>
          <View style={styles.routeConnector}>
            <View style={styles.routeConnectorLine} />
            <ArrowRight size={14} color={Colors.textTertiary} strokeWidth={2} />
            <View style={styles.routeConnectorLine} />
          </View>
          <View style={styles.routeEndpoint}>
            <View style={[styles.routeDot, { backgroundColor: route.color, borderRadius: 0 }]} />
            <Text variant="bodyMedium" numberOfLines={1} style={styles.routeStopName}>
              {route.destination}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.routeStats}>
          <View style={styles.routeStat}>
            <Clock size={14} color={Colors.textTertiary} strokeWidth={2} />
            <Text variant="bodySmall" color={Colors.textSecondary}>
              {route.duration_mins} min
            </Text>
          </View>
          <View style={styles.routeStat}>
            <MapPin size={14} color={Colors.textTertiary} strokeWidth={2} />
            <Text variant="bodySmall" color={Colors.textSecondary}>
              Every {route.frequency_mins} min
            </Text>
          </View>
          <View style={styles.routeArrow}>
            <ArrowRight size={16} color={Colors.primary} strokeWidth={2.5} />
          </View>
        </View>
      </Card>
    </Animated.View>
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
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.input,
    paddingHorizontal: Spacing.base,
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

  filterRow: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  filterScroll: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
  },

  listContent: {
    paddingHorizontal: Spacing.base,
  },
  skeletonContainer: {
    gap: Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    gap: Spacing.md,
  },
  emptyText: {
    paddingHorizontal: Spacing.xl,
  },

  routeCard: {
    marginBottom: Spacing.md,
  },
  routeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  routeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    minWidth: 52,
  },
  routeBadgeText: {
    color: Colors.textOnPrimary,
    fontFamily: FontFamily.bold,
    fontSize: 11,
    fontWeight: '700',
  },
  routeInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  routePath: {
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  routeEndpoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: Colors.surface,
    ...Shadows.low,
  },
  routeStopName: {
    flex: 1,
  },
  routeConnector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 3,
    paddingVertical: 2,
  },
  routeConnectorLine: {
    width: 12,
    height: 1.5,
    backgroundColor: Colors.outline,
  },
  routeStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  routeStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  routeArrow: {
    marginLeft: 'auto',
  },
});
