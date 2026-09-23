import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import {
  CircleDot,
  MapPin,
  Clock,
  Navigation2,
  Sparkles,
  ArrowDown,
  Layers,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { PlannedRoute } from '@/data/chigariStops';
import { Text } from '@/components/ui/Text';
import { Colors, FontFamily, Spacing, Radius, Shadows } from '@/constants/theme';

interface LastRouteCardProps {
  route: PlannedRoute;
  onViewRoute: () => void;
}

export const LastRouteCard: React.FC<LastRouteCardProps> = ({ route, onViewRoute }) => {
  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const distanceKm = (route.distanceMeters / 1000).toFixed(1);

  return (
    <View style={styles.card}>
      {/* ─── Header: LAST ROUTE Badge & Type ─── */}
      <View style={styles.headerRow}>
        <View style={styles.lastRouteBadge}>
          <Clock size={12} color="#1B5E20" strokeWidth={2.4} />
          <Text style={styles.lastRouteBadgeText}>LAST SEARCHED ROUTE</Text>
        </View>

        <View style={styles.directPill}>
          <Sparkles size={11} color="#2E7D32" strokeWidth={2.2} />
          <Text style={styles.directPillText}>Chigari • Direct Corridor</Text>
        </View>
      </View>

      {/* ─── Origin & Destination Flow ─── */}
      <View style={styles.flowContainer}>
        {/* From Station */}
        <View style={styles.stopRow}>
          <View style={styles.originDotBox}>
            <CircleDot size={16} color="#2E7D32" strokeWidth={2.6} />
          </View>
          <View style={styles.stopTextCol}>
            <Text style={styles.stopLabel}>Origin Station</Text>
            <Text style={styles.stopName} numberOfLines={1}>
              {route.fromStop.name}
            </Text>
          </View>
        </View>

        {/* Connecting Arrow & Distance */}
        <View style={styles.arrowRow}>
          <View style={styles.verticalLine} />
          <View style={styles.arrowCircle}>
            <ArrowDown size={14} color="#2E7D32" strokeWidth={2.4} />
          </View>
          <View style={styles.verticalLine} />
        </View>

        {/* To Station */}
        <View style={styles.stopRow}>
          <View style={styles.destPinBox}>
            <MapPin size={16} color="#F57C00" strokeWidth={2.6} />
          </View>
          <View style={styles.stopTextCol}>
            <Text style={styles.stopLabel}>Destination Station</Text>
            <Text style={styles.stopName} numberOfLines={1}>
              {route.toStop.name}
            </Text>
          </View>
        </View>
      </View>

      {/* ─── Metrics Bar: Distance, Time, Fare, Stations ─── */}
      <View style={styles.metricsBar}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Distance</Text>
          <Text style={styles.metricValue}>Approx. {distanceKm} km</Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Travel Time</Text>
          <Text style={styles.metricValue}>Approx. {route.durationMinutes} min</Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Fare</Text>
          <Text style={styles.metricValueGreen}>₹{route.fare}</Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Stations</Text>
          <Text style={styles.metricValue}>{route.intermediateStops.length} stops</Text>
        </View>
      </View>

      {/* ─── View Route Button ─── */}
      <Pressable
        style={({ pressed }) => [styles.viewRouteBtn, pressed && styles.viewRouteBtnPressed]}
        onPress={() => {
          triggerHaptic();
          onViewRoute();
        }}
        accessibilityLabel="View Route on Interactive Map"
      >
        <Navigation2 size={16} color="#FFFFFF" strokeWidth={2.4} />
        <Text style={styles.viewRouteBtnText}>View Route on Map</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.card,
    padding: Spacing.base,
    borderWidth: 1.5,
    borderColor: '#C8E6C9',
    marginBottom: Spacing.base,
    ...Shadows.medium,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  lastRouteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: Radius.pill,
    gap: 5,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  lastRouteBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    fontWeight: '700',
    color: '#1B5E20',
    letterSpacing: 0.5,
  },
  directPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    gap: 4,
  },
  directPillText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: '#475569',
  },
  flowContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.button,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: Spacing.sm,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  originDotBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  destPinBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopTextCol: {
    flex: 1,
  },
  stopLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  stopName: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  arrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 14,
    marginVertical: 2,
    gap: 4,
  },
  verticalLine: {
    width: 2,
    height: 8,
    backgroundColor: '#CBD5E1',
  },
  arrowCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.button,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: Spacing.sm,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: '#64748B',
    marginBottom: 1,
  },
  metricValue: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  metricValueGreen: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    fontWeight: '700',
    color: '#2E7D32',
  },
  metricDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
  },
  viewRouteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E7D32',
    paddingVertical: 11,
    borderRadius: Radius.button,
    gap: 8,
    ...Shadows.low,
  },
  viewRouteBtnPressed: {
    backgroundColor: '#1B5E20',
    transform: [{ scale: 0.98 }],
  },
  viewRouteBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});

export default LastRouteCard;
