import { useState, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, View, Pressable, ScrollView, Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  cancelAnimation,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  RefreshCw,
  Crosshair,
  Bus,
  Users,
  Gauge,
  Clock,
  Navigation2,
  MapPin,
  X,
  ChevronUp,
  Route as RouteIcon,
  CircleDot,
} from 'lucide-react-native';
import Svg, { G, Path, Rect, Circle, Line, Text as SvgText, Defs, ClipPath } from 'react-native-svg';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useLivePositions } from '@/hooks/useTransitData';
import { Colors, FontFamily, Spacing, Radius, Shadows } from '@/constants/theme';
import type { LivePosition } from '@/types/database';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Hubballi-Dharwad coordinate bounds
const LAT_MIN = 15.28;
const LAT_MAX = 15.39;
const LNG_MIN = 75.10;
const LNG_MAX = 75.16;

// Map projection helpers
function projectLat(lat: number, mapHeight: number): number {
  return ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * mapHeight;
}

function projectLng(lng: number, mapWidth: number): number {
  return ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * mapWidth;
}

// ─── Occupancy config ────────────────────────────────────────────────────────
function getOccupancyConfig(occupancy: string) {
  switch (occupancy) {
    case 'low':
      return { label: 'Low', color: Colors.success, bg: Colors.successLight, pct: '25%' };
    case 'medium':
      return { label: 'Medium', color: Colors.warning, bg: Colors.warningLight, pct: '55%' };
    case 'high':
      return { label: 'High', color: '#F57C00', bg: '#FFF3E0', pct: '80%' };
    case 'full':
      return { label: 'Full', color: Colors.error, bg: Colors.errorLight, pct: '100%' };
    default:
      return { label: '—', color: Colors.textTertiary, bg: Colors.surfaceVariant, pct: '—' };
  }
}

// ─── ETA calculation ─────────────────────────────────────────────────────────
function calculateETA(speed: number): number {
  if (speed === 0) return 0;
  const avgDistanceKm = 3.5;
  return Math.max(1, Math.round((avgDistanceKm / speed) * 60));
}

export default function LiveScreen() {
  const insets = useSafeAreaInsets();
  const { positions, loading } = useLivePositions();

  const [selectedBus, setSelectedBus] = useState<LivePosition | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [mapWidth, setMapWidth] = useState(SCREEN_WIDTH);
  const [mapHeight, setMapHeight] = useState(SCREEN_HEIGHT * 0.55);

  // Animations
  const sheetTranslateY = useSharedValue(0);
  const sheetOpacity = useSharedValue(0);
  const refreshRotation = useSharedValue(0);
  const livePulse = useSharedValue(1);
  const mapOpacity = useSharedValue(0);

  useEffect(() => {
    mapOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) });

    livePulse.value = withRepeat(
      withSequence(
        withTiming(1.5, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    return () => {
      cancelAnimation(livePulse);
      cancelAnimation(refreshRotation);
      cancelAnimation(sheetTranslateY);
      cancelAnimation(sheetOpacity);
      cancelAnimation(mapOpacity);
    };
  }, []);

  // Show bottom sheet when bus selected
  useEffect(() => {
    if (selectedBus) {
      sheetOpacity.value = withTiming(1, { duration: 300 });
      sheetTranslateY.value = withSpring(0, { damping: 18, stiffness: 120 });
    } else {
      sheetOpacity.value = withTiming(0, { duration: 200 });
      sheetTranslateY.value = withSpring(100, { damping: 18, stiffness: 120 });
    }
  }, [selectedBus]);

  const mapAnimatedStyle = useAnimatedStyle(() => ({
    opacity: mapOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: sheetOpacity.value,
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  const liveDotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: livePulse.value }],
  }));

  const refreshStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${refreshRotation.value}deg` }],
  }));

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const triggerHaptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(style);
  };

  const handleRefresh = useCallback(() => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    refreshRotation.value = withRepeat(
      withTiming(360, { duration: 800, easing: Easing.linear }),
      1,
      false,
    );
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleBusPress = (pos: LivePosition) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedBus(pos);
  };

  const handleCloseSheet = () => {
    triggerHaptic();
    setSelectedBus(null);
  };

  const handleRecenter = () => {
    triggerHaptic();
  };

  // ─── Derived data ──────────────────────────────────────────────────────────
  const activeBuses = useMemo(() => positions.filter((p) => p.bus?.route), [positions]);

  // Current location (center of Hubballi-Dharwad)
  const currentLoc = {
    lat: 15.3647,
    lng: 75.1240,
  };

  // Selected bus route info
  const selectedRoute = selectedBus?.bus?.route;
  const selectedOcc = selectedBus ? getOccupancyConfig(selectedBus.occupancy) : null;
  const selectedETA = selectedBus ? calculateETA(selectedBus.speed) : 0;

  return (
    <Screen backgroundColor={Colors.background} safeAreaTop={false} safeAreaBottom={false}>
      {/* ─── Top Bar ─── */}
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.topBarContent}>
          <View style={styles.topBarLeft}>
            <View style={styles.liveIndicator}>
              <Animated.View style={[styles.liveDot, liveDotStyle]} />
              <Text variant="labelLarge" color={Colors.textOnPrimary}>
                LIVE
              </Text>
            </View>
            <Text variant="bodySmall" style={styles.topBarCount}>
              {activeBuses.length} buses tracking
            </Text>
          </View>

          <View style={styles.topBarRight}>
            <Pressable
              style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.85 }]}
              onPress={handleRefresh}
            >
              <Animated.View style={refreshStyle}>
                <RefreshCw size={20} color={Colors.textOnPrimary} strokeWidth={2.5} />
              </Animated.View>
            </Pressable>
          </View>
        </View>
      </View>

      {/* ─── Map Area ─── */}
      <View
        style={styles.mapContainer}
        onLayout={(e) => {
          setMapWidth(e.nativeEvent.layout.width);
          setMapHeight(e.nativeEvent.layout.height);
        }}
      >
        <Animated.View style={[styles.mapWrapper, mapAnimatedStyle]}>
          {loading ? (
            <View style={styles.mapLoading}>
              <Skeleton width="100%" height="100%" borderRadius={0} />
            </View>
          ) : (
            <TransitMap
              width={mapWidth}
              height={mapHeight}
              buses={activeBuses}
              currentLoc={currentLoc}
              selectedBusId={selectedBus?.id ?? null}
              onBusPress={handleBusPress}
            />
          )}
        </Animated.View>

        {/* Floating controls */}
        <View style={[styles.floatingControls, { bottom: selectedBus ? 280 : Spacing.lg }]}>
          <Pressable
            style={({ pressed }) => [styles.floatingButton, pressed && { opacity: 0.85 }]}
            onPress={handleRecenter}
          >
            <Crosshair size={22} color={Colors.primary} strokeWidth={2.5} />
          </Pressable>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
            <Text variant="caption" color={Colors.textSecondary}>Low</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.warning }]} />
            <Text variant="caption" color={Colors.textSecondary}>Med</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F57C00' }]} />
            <Text variant="caption" color={Colors.textSecondary}>High</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.error }]} />
            <Text variant="caption" color={Colors.textSecondary}>Full</Text>
          </View>
        </View>
      </View>

      {/* ─── Bus List (when no bus selected) ─── */}
      {!selectedBus && (
        <View style={styles.busListContainer}>
          <View style={styles.busListHeader}>
            <Text variant="titleMedium">Active Buses</Text>
            <Text variant="bodySmall" color={Colors.textTertiary}>
              Tap a bus for details
            </Text>
          </View>
          <ScrollView
            style={styles.busListScroll}
            contentContainerStyle={styles.busListContent}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <View style={styles.busListLoading}>
                {[0, 1, 2].map((i) => (
                  <Card key={i} style={styles.busCardSkeleton}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                      <Skeleton width={48} height={28} borderRadius={6} />
                      <View>
                        <Skeleton width={140} height={16} borderRadius={4} />
                        <Skeleton width={100} height={12} borderRadius={4} style={{ marginTop: 4 }} />
                      </View>
                    </View>
                  </Card>
                ))}
              </View>
            ) : (
              activeBuses.map((pos) => (
                <BusListItem
                  key={pos.id}
                  position={pos}
                  onPress={() => handleBusPress(pos)}
                />
              ))
            )}
          </ScrollView>
        </View>
      )}

      {/* ─── Bottom Sheet (selected bus) ─── */}
      {selectedBus && selectedRoute && selectedOcc && (
        <Animated.View
          style={[styles.bottomSheet, sheetStyle, { paddingBottom: insets.bottom + Spacing.md }]}
        >
          {/* Drag handle */}
          <View style={styles.dragHandle} />

          {/* Header row */}
          <View style={styles.sheetHeader}>
            <View style={styles.sheetHeaderLeft}>
              <View style={[styles.sheetRouteBadge, { backgroundColor: selectedRoute.color }]}>
                <Text variant="caption" style={styles.sheetRouteText}>
                  {selectedRoute.route_number}
                </Text>
              </View>
              <View>
                <Text variant="titleMedium">{selectedRoute.name}</Text>
                <Text variant="bodySmall" color={Colors.textSecondary}>
                  {selectedRoute.origin} → {selectedRoute.destination}
                </Text>
              </View>
            </View>
            <Pressable style={styles.closeButton} onPress={handleCloseSheet} hitSlop={12}>
              <X size={20} color={Colors.textSecondary} strokeWidth={2.5} />
            </Pressable>
          </View>

          {/* Stats row */}
          <View style={styles.sheetStatsRow}>
            {/* ETA */}
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: Colors.primaryLight }]}>
                <Clock size={16} color={Colors.primary} strokeWidth={2.5} />
              </View>
              <View>
                <Text variant="caption" color={Colors.textTertiary}>ETA</Text>
                <Text variant="titleSmall" color={Colors.primary} style={styles.statValue}>
                  {selectedETA === 0 ? 'Arrived' : `${selectedETA} min`}
                </Text>
              </View>
            </View>

            {/* Speed */}
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: Colors.secondaryLight }]}>
                <Gauge size={16} color={Colors.secondaryDark} strokeWidth={2.5} />
              </View>
              <View>
                <Text variant="caption" color={Colors.textTertiary}>Speed</Text>
                <Text variant="titleSmall" style={styles.statValue}>
                  {Math.round(selectedBus.speed)} km/h
                </Text>
              </View>
            </View>

            {/* Crowd */}
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: selectedOcc.bg }]}>
                <Users size={16} color={selectedOcc.color} strokeWidth={2.5} />
              </View>
              <View>
                <Text variant="caption" color={Colors.textTertiary}>Crowd</Text>
                <Text variant="titleSmall" color={selectedOcc.color} style={styles.statValue}>
                  {selectedOcc.label}
                </Text>
              </View>
            </View>
          </View>

          {/* Crowd bar */}
          <View style={styles.crowdBarContainer}>
            <View style={styles.crowdBarLabels}>
              <Text variant="caption" color={Colors.textTertiary}>Occupancy</Text>
              <Text variant="caption" color={selectedOcc.color} style={styles.crowdBarPct}>
                {selectedOcc.pct}
              </Text>
            </View>
            <View style={styles.crowdBarTrack}>
              <View
                style={[
                  styles.crowdBarFill,
                  {
                    width: selectedBus.occupancy === 'low' ? '25%' :
                           selectedBus.occupancy === 'medium' ? '55%' :
                           selectedBus.occupancy === 'high' ? '80%' : '100%',
                    backgroundColor: selectedOcc.color,
                  },
                ]}
              />
            </View>
          </View>

          {/* Bus info */}
          <View style={styles.busInfoRow}>
            <View style={styles.busInfoItem}>
              <Bus size={14} color={Colors.textTertiary} strokeWidth={2} />
              <Text variant="bodySmall" color={Colors.textSecondary}>
                {selectedBus.bus?.plate}
              </Text>
            </View>
            <View style={styles.busInfoItem}>
              <Navigation2 size={14} color={Colors.textTertiary} strokeWidth={2} />
              <Text variant="bodySmall" color={Colors.textSecondary}>
                Heading {Math.round(selectedBus.heading)}°
              </Text>
            </View>
            <View style={styles.busInfoItem}>
              <Users size={14} color={Colors.textTertiary} strokeWidth={2} />
              <Text variant="bodySmall" color={Colors.textSecondary}>
                Cap. {selectedBus.bus?.capacity}
              </Text>
            </View>
          </View>

          {/* Route info */}
          <View style={styles.routeInfoSection}>
            <View style={styles.routeInfoHeader}>
              <RouteIcon size={16} color={Colors.primary} strokeWidth={2.5} />
              <Text variant="titleSmall">Route Information</Text>
            </View>
            <View style={styles.routeInfoBody}>
              <View style={styles.routeInfoItem}>
                <Text variant="caption" color={Colors.textTertiary}>Type</Text>
                <Badge label={selectedRoute.type.toUpperCase()} variant="neutral" />
              </View>
              <View style={styles.routeInfoItem}>
                <Text variant="caption" color={Colors.textTertiary}>Duration</Text>
                <Text variant="bodyMedium" style={styles.routeInfoValue}>
                  {selectedRoute.duration_mins} min
                </Text>
              </View>
              <View style={styles.routeInfoItem}>
                <Text variant="caption" color={Colors.textTertiary}>Frequency</Text>
                <Text variant="bodyMedium" style={styles.routeInfoValue}>
                  Every {selectedRoute.frequency_mins} min
                </Text>
              </View>
            </View>
          </View>

          {/* Last updated */}
          <View style={styles.lastUpdated}>
            <CircleDot size={12} color={Colors.textTertiary} strokeWidth={2} />
            <Text variant="caption" color={Colors.textTertiary}>
              Last updated {formatTimeAgo(selectedBus.updated_at)}
            </Text>
          </View>
        </Animated.View>
      )}
    </Screen>
  );
}

// ─── Transit Map (SVG-based) ──────────────────────────────────────────────────
interface TransitMapProps {
  width: number;
  height: number;
  buses: LivePosition[];
  currentLoc: { lat: number; lng: number };
  selectedBusId: string | null;
  onBusPress: (pos: LivePosition) => void;
}

function TransitMap({
  width,
  height,
  buses,
  currentLoc,
  selectedBusId,
  onBusPress,
}: TransitMapProps) {
  const cx = projectLng(currentLoc.lng, width);
  const cy = projectLat(currentLoc.lat, height);

  // Street grid lines
  const hLines = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9];
  const vLines = [0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 0.95];

  // Major roads (diagonal corridors)
  const majorRoads = [
    `M 0 ${height * 0.35} L ${width} ${height * 0.55}`,
    `M ${width * 0.3} 0 L ${width * 0.5} ${height}`,
    `M 0 ${height * 0.7} L ${width} ${height * 0.3}`,
  ];

  return (
    <View style={styles.mapSvgContainer}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <ClipPath id="mapClip">
            <Rect x={0} y={0} width={width} height={height} />
          </ClipPath>
        </Defs>

        <G clipPath="url(#mapClip)">
          {/* Background */}
          <Rect x={0} y={0} width={width} height={height} fill="#E8EEF2" />

          {/* Water bodies / green areas */}
          <Path
            d={`M 0 0 L ${width * 0.15} 0 L ${width * 0.1} ${height * 0.2} L 0 ${height * 0.15} Z`}
            fill="#C8E6C9"
            opacity={0.5}
          />
          <Path
            d={`M ${width * 0.85} ${height * 0.7} L ${width} ${height * 0.65} L ${width} ${height * 0.95} L ${width * 0.8} ${height * 0.9} Z`}
            fill="#C8E6C9"
            opacity={0.5}
          />
          <Path
            d={`M ${width * 0.6} 0 L ${width * 0.75} 0 L ${width * 0.7} ${height * 0.12} L ${width * 0.55} ${height * 0.08} Z`}
            fill="#B3E5FC"
            opacity={0.4}
          />

          {/* Minor street grid */}
          {hLines.map((p, i) => (
            <Line
              key={`h${i}`}
              x1={0}
              y1={height * p}
              x2={width}
              y2={height * p}
              stroke="#D5DDE3"
              strokeWidth={1}
            />
          ))}
          {vLines.map((p, i) => (
            <Line
              key={`v${i}`}
              x1={width * p}
              y1={0}
              x2={width * p}
              y2={height}
              stroke="#D5DDE3"
              strokeWidth={1}
            />
          ))}

          {/* Major roads */}
          {majorRoads.map((d, i) => (
            <Path
              key={`r${i}`}
              d={d}
              stroke="#FFFFFF"
              strokeWidth={6}
              strokeLinecap="round"
              opacity={0.8}
            />
          ))}
          {majorRoads.map((d, i) => (
            <Path
              key={`r2${i}`}
              d={d}
              stroke="#FFD54F"
              strokeWidth={3}
              strokeLinecap="round"
              opacity={0.5}
            />
          ))}

          {/* Route lines between buses on same route */}
          {buses.map((bus, idx) => {
            const route = bus.bus?.route;
            if (!route) return null;
            const sameRouteBuses = buses.filter((b) => b.bus?.route?.id === route.id);
            if (idx !== buses.indexOf(sameRouteBuses[0])) return null;
            if (sameRouteBuses.length < 2) return null;

            return sameRouteBuses.map((b, i) => {
              if (i === sameRouteBuses.length - 1) return null;
              const next = sameRouteBuses[i + 1];
              const x1 = projectLng(Number(b.lng), width);
              const y1 = projectLat(Number(b.lat), height);
              const x2 = projectLng(Number(next.lng), width);
              const y2 = projectLat(Number(next.lat), height);
              return (
                <Line
                  key={`route-${route.id}-${i}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={route.color}
                  strokeWidth={2.5}
                  strokeDasharray="6 4"
                  opacity={0.6}
                />
              );
            });
          })}

          {/* Current location pulse */}
          <Circle cx={cx} cy={cy} r={24} fill={Colors.primary} opacity={0.15} />
          <Circle cx={cx} cy={cy} r={14} fill={Colors.primary} opacity={0.25} />
          <Circle cx={cx} cy={cy} r={8} fill={Colors.primary} stroke="#FFFFFF" strokeWidth={3} />
        </G>
      </Svg>

      {/* Bus markers (rendered as Views for press handling) */}
      {buses.map((pos) => {
        const route = pos.bus?.route;
        if (!route) return null;

        const x = projectLng(Number(pos.lng), width);
        const y = projectLat(Number(pos.lat), height);
        const occ = getOccupancyConfig(pos.occupancy);
        const isSelected = selectedBusId === pos.id;

        return (
          <Pressable
            key={pos.id}
            style={[
              styles.busMarker,
              { left: x - 20, top: y - 20 },
              isSelected && styles.busMarkerSelected,
            ]}
            onPress={() => onBusPress(pos)}
          >
            <View style={[styles.busMarkerPin, { backgroundColor: route.color }]}>
              <Bus size={14} color={Colors.textOnPrimary} strokeWidth={2.5} />
            </View>
            <View style={[styles.busMarkerDot, { backgroundColor: occ.color }]} />
            {isSelected && <View style={styles.busMarkerRing} />}
          </Pressable>
        );
      })}

      {/* Current location label */}
      <View style={[styles.currentLocLabel, { left: cx + 12, top: cy - 10 }]}>
        <MapPin size={10} color={Colors.primary} strokeWidth={2.5} />
        <Text variant="caption" color={Colors.primary} style={styles.currentLocText}>
          You
        </Text>
      </View>
    </View>
  );
}

// ─── Bus List Item ───────────────────────────────────────────────────────────
function BusListItem({ position, onPress }: { position: LivePosition; onPress: () => void }) {
  const route = position.bus?.route;
  if (!route) return null;
  const occ = getOccupancyConfig(position.occupancy);
  const eta = calculateETA(position.speed);

  return (
    <Card style={styles.busListItem} onPress={onPress}>
      <View style={styles.busListLeft}>
        <View style={[styles.busListRouteBadge, { backgroundColor: route.color }]}>
          <Text variant="caption" style={styles.busListRouteText}>
            {route.route_number}
          </Text>
        </View>
        <View style={styles.busListInfo}>
          <Text variant="titleSmall" numberOfLines={1}>
            {route.name}
          </Text>
          <Text variant="caption" color={Colors.textTertiary} numberOfLines={1}>
            {position.bus?.plate} · {Math.round(position.speed)} km/h
          </Text>
        </View>
      </View>
      <View style={styles.busListRight}>
        <View style={styles.busListEta}>
          <Clock size={12} color={Colors.primary} strokeWidth={2.5} />
          <Text variant="labelMedium" color={Colors.primary} style={styles.busListEtaText}>
            {eta === 0 ? 'Arrived' : `${eta}m`}
          </Text>
        </View>
        <View style={[styles.busListCrowd, { backgroundColor: occ.bg }]}>
          <View style={[styles.busListCrowdDot, { backgroundColor: occ.color }]} />
          <Text variant="caption" color={occ.color} style={styles.busListCrowdText}>
            {occ.label}
          </Text>
        </View>
      </View>
    </Card>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  return `${hours} hr ago`;
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ─── Top Bar ───
  topBar: {
    backgroundColor: Colors.primaryDark,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.base,
  },
  topBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4FC3F7',
  },
  topBarCount: {
    color: 'rgba(255,255,255,0.7)',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── Map ───
  mapContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  mapWrapper: {
    flex: 1,
  },
  mapSvgContainer: {
    flex: 1,
    position: 'relative',
  },
  mapLoading: {
    flex: 1,
  },

  // ─── Floating Controls ───
  floatingControls: {
    position: 'absolute',
    right: Spacing.base,
    gap: Spacing.sm,
  },
  floatingButton: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.medium,
  },

  // ─── Legend ───
  legend: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.base,
    flexDirection: 'row',
    gap: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    ...Shadows.low,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // ─── Bus Markers ───
  busMarker: {
    position: 'absolute',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  busMarkerSelected: {
    zIndex: 10,
  },
  busMarkerPin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    ...Shadows.medium,
  },
  busMarkerDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  busMarkerRing: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.primary,
    opacity: 0.5,
  },
  currentLocLabel: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    ...Shadows.low,
  },
  currentLocText: {
    fontWeight: '600',
  },

  // ─── Bus List ───
  busListContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.bottomSheet,
    borderTopRightRadius: Radius.bottomSheet,
    marginTop: -Spacing.lg,
    paddingTop: Spacing.md,
  },
  busListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.md,
  },
  busListScroll: {
    flex: 1,
  },
  busListContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: 100,
    gap: Spacing.md,
  },
  busListLoading: {
    gap: Spacing.md,
  },
  busCardSkeleton: {
    padding: Spacing.base,
  },

  // ─── Bus List Item ───
  busListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  busListLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  busListRouteBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    minWidth: 48,
    alignItems: 'center',
  },
  busListRouteText: {
    color: Colors.textOnPrimary,
    fontFamily: FontFamily.bold,
    fontSize: 11,
    fontWeight: '700',
  },
  busListInfo: {
    flex: 1,
  },
  busListRight: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  busListEta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  busListEtaText: {
    fontWeight: '600',
  },
  busListCrowd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  busListCrowdDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  busListCrowdText: {
    fontWeight: '600',
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
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.outline,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  sheetHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  sheetRouteBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    minWidth: 56,
    alignItems: 'center',
  },
  sheetRouteText: {
    color: Colors.textOnPrimary,
    fontFamily: FontFamily.bold,
    fontSize: 13,
    fontWeight: '700',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── Stats Row ───
  sheetStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontFamily: FontFamily.semiBold,
  },

  // ─── Crowd Bar ───
  crowdBarContainer: {
    marginBottom: Spacing.lg,
  },
  crowdBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  crowdBarPct: {
    fontWeight: '600',
  },
  crowdBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceVariant,
    overflow: 'hidden',
  },
  crowdBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  // ─── Bus Info ───
  busInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  busInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  // ─── Route Info ───
  routeInfoSection: {
    marginBottom: Spacing.md,
  },
  routeInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  routeInfoBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  routeInfoItem: {
    flex: 1,
  },
  routeInfoValue: {
    marginTop: 2,
  },

  // ─── Last Updated ───
  lastUpdated: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'center',
  },
});
