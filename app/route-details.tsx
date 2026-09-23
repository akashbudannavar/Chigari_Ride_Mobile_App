import React, { useRef, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  CircleDot,
  MapPin,
  Clock,
  Banknote,
  Layers,
  Navigation2,
  Bus,
} from 'lucide-react-native';
import Svg, { Rect, Line, Circle, Polyline as SvgPolyline, Text as SvgText } from 'react-native-svg';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/ui/Text';
import { Colors, FontFamily, Spacing, Radius, Shadows } from '@/constants/theme';
import {
  CHIGARI_STOPS,
  findStopById,
  calculateCorridorRoute,
} from '@/data/chigariStops';
import { StopMarker } from '@/components/StopMarker';

export default function RouteDetailsScreen() {
  const insets = useSafeAreaInsets();
  const [mapWidth, setMapWidth] = useState(400);
  const [mapHeight, setMapHeight] = useState(300);

  const { fromId, toId, id } = useLocalSearchParams<{
    fromId?: string;
    toId?: string;
    id?: string;
  }>();

  // Resolve From and To stops from params or sensible defaults
  const fromStop = useMemo(() => {
    if (fromId) return findStopById(fromId) || CHIGARI_STOPS[0];
    return CHIGARI_STOPS[0]; // Hubballi CBT
  }, [fromId]);

  const toStop = useMemo(() => {
    if (toId) return findStopById(toId) || CHIGARI_STOPS[20];
    return CHIGARI_STOPS[20]; // Dharwad BRTS Terminal
  }, [toId]);

  // Calculate real road-following route segment
  const plannedRoute = useMemo(() => {
    return calculateCorridorRoute(fromStop, toStop);
  }, [fromStop, toStop]);

  // Compute geographical bounds of the planned route segment
  const { minLat, maxLat, minLng, maxLng } = useMemo(() => {
    let minLt = 90, maxLt = -90, minLg = 180, maxLg = -180;
    const coords = plannedRoute.coordinates.length > 0 ? plannedRoute.coordinates : [fromStop, toStop];
    coords.forEach((c) => {
      if (c.latitude < minLt) minLt = c.latitude;
      if (c.latitude > maxLt) maxLt = c.latitude;
      if (c.longitude < minLg) minLg = c.longitude;
      if (c.longitude > maxLg) maxLg = c.longitude;
    });
    const latPadding = Math.max(0.005, (maxLt - minLt) * 0.15);
    const lngPadding = Math.max(0.005, (maxLg - minLg) * 0.15);
    return {
      minLat: minLt - latPadding,
      maxLat: maxLt + latPadding,
      minLng: minLg - lngPadding,
      maxLng: maxLg + lngPadding,
    };
  }, [plannedRoute, fromStop, toStop]);

  const projX = (lng: number) => {
    const usableW = Math.max(100, mapWidth - 48);
    return 24 + ((lng - minLng) / (maxLng - minLng || 0.01)) * usableW;
  };

  const projY = (lat: number) => {
    const usableH = Math.max(100, mapHeight - 64);
    return 32 + ((maxLat - lat) / (maxLat - minLat || 0.01)) * usableH;
  };

  const routePoints = plannedRoute.coordinates
    .map((c) => `${projX(c.longitude)},${projY(c.latitude)}`)
    .join(' ');

  const triggerHaptic = (style = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(style);
  };

  const handleBack = () => {
    triggerHaptic();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/route-planner');
    }
  };

  const distanceKm = (plannedRoute.distanceMeters / 1000).toFixed(1);

  return (
    <Screen backgroundColor={Colors.background} safeAreaTop={false} safeAreaBottom={false}>
      {/* ─── Real Interactive Map (Crash-proof vector map for native and web) ─── */}
      <View
        style={styles.mapContainer}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          if (width > 0 && height > 0) {
            setMapWidth(width);
            setMapHeight(height);
          }
        }}
      >
        <Svg width={mapWidth} height={mapHeight} style={StyleSheet.absoluteFillObject}>
          {/* Map canvas background */}
          <Rect x={0} y={0} width={mapWidth} height={mapHeight} fill="#F1F5F9" />

          {/* Grid lines */}
          {Array.from({ length: 6 }).map((_, i) => (
            <Line
              key={`h-${i}`}
              x1={0}
              y1={(mapHeight / 6) * i}
              x2={mapWidth}
              y2={(mapHeight / 6) * i}
              stroke="#E2E8F0"
              strokeWidth={1}
            />
          ))}

          {/* Real Corridor Polyline Underglow & Core */}
          <SvgPolyline
            points={routePoints}
            fill="none"
            stroke="#14532D"
            strokeWidth={8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <SvgPolyline
            points={routePoints}
            fill="none"
            stroke="#16A34A"
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Intermediate Station Dots */}
          {plannedRoute.intermediateStops.slice(1, -1).map((stop) => {
            const sx = projX(stop.longitude);
            const sy = projY(stop.latitude);
            return (
              <Circle
                key={stop.id}
                cx={sx}
                cy={sy}
                r={4}
                fill="#FFFFFF"
                stroke="#EA580C"
                strokeWidth={2}
              />
            );
          })}

          {/* Origin Marker (Green) */}
          <Circle
            cx={projX(fromStop.longitude)}
            cy={projY(fromStop.latitude)}
            r={9}
            fill="#15803D"
            stroke="#FFFFFF"
            strokeWidth={2.5}
          />

          {/* Destination Marker (Orange/Red) */}
          <Circle
            cx={projX(toStop.longitude)}
            cy={projY(toStop.latitude)}
            r={9}
            fill="#DC2626"
            stroke="#FFFFFF"
            strokeWidth={2.5}
          />
        </Svg>

        {/* Floating Top Header */}
        <View style={[styles.floatingHeader, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            onPress={handleBack}
            accessibilityLabel="Back to Route Planner"
          >
            <ArrowLeft size={20} color="#0F172A" strokeWidth={2.4} />
          </Pressable>

          <View style={styles.headerTitlePill}>
            <Bus size={15} color="#2E7D32" strokeWidth={2.4} />
            <Text style={styles.headerTitleText}>Chigari Route Segment</Text>
          </View>

          <View style={styles.headerSpacer} />
        </View>
      </View>

      {/* ─── Bottom Information & Timeline Sheet ─── */}
      <View style={[styles.sheetContainer, { paddingBottom: insets.bottom + Spacing.md }]}>
        {/* Route Title & Direct Badge */}
        <View style={styles.sheetHeader}>
          <View style={styles.sheetTitleCol}>
            <Text style={styles.routeFromToText} numberOfLines={1}>
              {fromStop.name} ➔ {toStop.name}
            </Text>
            <Text style={styles.routeCorridorSub}>Hubballi–Dharwad Chigari BRTS Corridor</Text>
          </View>
          <View style={styles.directPill}>
            <Text style={styles.directPillText}>Direct</Text>
          </View>
        </View>

        {/* Stats Row: Distance, Travel Time, Fare */}
        <View style={styles.statsBar}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>DISTANCE</Text>
            <Text style={styles.statVal}>{distanceKm} km</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>TRAVEL TIME</Text>
            <Text style={styles.statVal}>{plannedRoute.durationMinutes} min</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>FARE</Text>
            <Text style={styles.statValGreen}>₹{plannedRoute.fare}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>STOPS</Text>
            <Text style={styles.statVal}>{plannedRoute.intermediateStops.length}</Text>
          </View>
        </View>

        {/* Intermediate Stations Timeline (Scrollable) */}
        <ScrollView style={styles.timelineScroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.timelineSectionTitle}>Stations on this Route:</Text>
          {plannedRoute.intermediateStops.map((stop, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === plannedRoute.intermediateStops.length - 1;

            return (
              <View key={stop.id} style={styles.timelineRow}>
                <View style={styles.timelineIconCol}>
                  <View
                    style={[
                      styles.timelineDot,
                      isFirst && styles.timelineDotOrigin,
                      isLast && styles.timelineDotDest,
                    ]}
                  />
                  {!isLast && <View style={styles.timelineLine} />}
                </View>
                <View style={styles.timelineTextCol}>
                  <Text
                    style={[
                      styles.timelineStationName,
                      (isFirst || isLast) && styles.timelineStationBold,
                    ]}
                  >
                    {stop.name}
                  </Text>
                  {stop.kannadaName && (
                    <Text style={styles.timelineKannada}>{stop.kannadaName}</Text>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Live Track Action Button */}
        <Pressable
          style={({ pressed }) => [styles.trackBtn, pressed && styles.trackBtnPressed]}
          onPress={() => {
            triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/(tabs)/live');
          }}
        >
          <Navigation2 size={16} color="#FFFFFF" strokeWidth={2.4} />
          <Text style={styles.trackBtnText}>Live Track Buses on this Corridor</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    zIndex: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadows.low,
  },
  headerTitlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadows.low,
  },
  headerTitleText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSpacer: {
    width: 40,
  },
  originMarkerBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2E7D32',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.medium,
  },
  destMarkerBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E65100',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.medium,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    maxHeight: '48%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadows.high,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sheetTitleCol: {
    flex: 1,
    marginRight: 8,
  },
  routeFromToText: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  routeCorridorSub: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  directPill: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  directPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: '700',
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.button,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: Spacing.sm,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 9,
    color: '#64748B',
    marginBottom: 2,
  },
  statVal: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  statValGreen: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    fontWeight: '700',
    color: '#2E7D32',
  },
  statDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#E2E8F0',
  },
  timelineScroll: {
    maxHeight: 120,
    marginBottom: Spacing.sm,
  },
  timelineSectionTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  timelineIconCol: {
    alignItems: 'center',
    width: 16,
    marginRight: 10,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#94A3B8',
    marginTop: 4,
  },
  timelineDotOrigin: {
    backgroundColor: '#2E7D32',
    transform: [{ scale: 1.2 }],
  },
  timelineDotDest: {
    backgroundColor: '#E65100',
    transform: [{ scale: 1.2 }],
  },
  timelineLine: {
    width: 2,
    height: 14,
    backgroundColor: '#E2E8F0',
    marginTop: 2,
  },
  timelineTextCol: {
    flex: 1,
  },
  timelineStationName: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: '#334155',
  },
  timelineStationBold: {
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#0F172A',
  },
  timelineKannada: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: '#94A3B8',
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    borderRadius: Radius.button,
    gap: 8,
    ...Shadows.low,
  },
  trackBtnPressed: {
    backgroundColor: '#1B5E20',
    transform: [{ scale: 0.98 }],
  },
  trackBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
});
