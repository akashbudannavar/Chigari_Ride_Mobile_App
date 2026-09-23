import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { Clock, Navigation2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui/Text';
import { Colors, FontFamily, Spacing, Radius, Shadows } from '@/constants/theme';

export interface SuggestedRouteOption {
  id: string;
  routeNumber: string;
  routeName: string;
  durationMinutes: number;
  fare: number;
  nextBusMinutes: number;
  type: 'Direct' | 'Express' | '1 Transfer';
  stops: string[];
  crowdLevel: 'Low' | 'Moderate' | 'Crowded';
}

interface SuggestedRouteCardProps {
  route: SuggestedRouteOption;
  isSelected?: boolean;
  onSelect: () => void;
  onTrackBus: () => void;
}

export const SuggestedRouteCard: React.FC<SuggestedRouteCardProps> = ({
  route,
  isSelected = false,
  onSelect,
  onTrackBus,
}) => {
  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.routeCard,
        isSelected && styles.routeCardSelected,
        pressed && styles.pressedCard,
      ]}
      onPress={() => {
        triggerHaptic();
        onSelect();
      }}
    >
      {/* Route Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.routePill}>
          <Text style={styles.routePillText}>Route {route.routeNumber}</Text>
        </View>

        <View
          style={[
            styles.typeBadge,
            route.type === 'Direct' ? styles.typeDirect : styles.typeExpress,
          ]}
        >
          <Text
            style={[
              styles.typeBadgeText,
              route.type === 'Direct' ? styles.typeDirectText : styles.typeExpressText,
            ]}
          >
            {route.type}
          </Text>
        </View>

        <View style={styles.etaHeaderBox}>
          <Text style={styles.etaHeaderTime}>{route.durationMinutes} min</Text>
          <Text style={styles.etaHeaderFare}>₹{route.fare}</Text>
        </View>
      </View>

      {/* Route Subtitle & Next Bus */}
      <View style={styles.nextBusRow}>
        <Text style={styles.routeNameText} numberOfLines={1}>
          {route.routeName}
        </Text>
        <View style={styles.nextBusBadge}>
          <Clock size={12} color="#2E7D32" strokeWidth={2.4} />
          <Text style={styles.nextBusText}>Next in {route.nextBusMinutes}m</Text>
        </View>
      </View>

      {/* Stops Timeline */}
      <View style={styles.timelineBox}>
        {route.stops.slice(0, 4).map((stop, index) => {
          const isTerminal = index === 0 || index === Math.min(route.stops.length, 4) - 1;
          return (
            <View key={index} style={styles.timelineItem}>
              <View
                style={[
                  styles.timelineDot,
                  isTerminal && { backgroundColor: '#2E7D32', borderColor: '#C8E6C9' },
                ]}
              />
              <Text
                style={[
                  styles.timelineStopText,
                  isTerminal ? styles.timelineStopBold : undefined,
                ]}
                numberOfLines={1}
              >
                {stop}
              </Text>
              {index < Math.min(route.stops.length, 4) - 1 && (
                <View style={styles.timelineLine} />
              )}
            </View>
          );
        })}
      </View>

      {/* Action button: Track Bus */}
      <Pressable
        style={({ pressed }) => [
          styles.selectRouteBtn,
          pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onTrackBus();
        }}
      >
        <Text style={styles.selectRouteText}>Live Track Bus {route.routeNumber}</Text>
        <Navigation2 size={14} color="#FFFFFF" strokeWidth={2.4} />
      </Pressable>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  routeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.card,
    padding: Spacing.base,
    borderWidth: 1.5,
    borderColor: '#EFF1F3',
    marginBottom: Spacing.md,
    ...Shadows.low,
  },
  routeCardSelected: {
    borderColor: '#2E7D32',
    backgroundColor: '#F8FAF9',
  },
  pressedCard: {
    opacity: 0.95,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  routePill: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    marginRight: Spacing.sm,
  },
  routePillText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    marginRight: 'auto',
  },
  typeDirect: {
    backgroundColor: '#E8F5E9',
  },
  typeExpress: {
    backgroundColor: '#E0F2FE',
  },
  typeBadgeText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
  },
  typeDirectText: {
    color: '#2E7D32',
  },
  typeExpressText: {
    color: '#0284C7',
  },
  etaHeaderBox: {
    alignItems: 'flex-end',
  },
  etaHeaderTime: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  etaHeaderFare: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: '#64748B',
  },
  nextBusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  routeNameText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: '#334155',
    flex: 1,
    marginRight: Spacing.sm,
  },
  nextBusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    gap: 4,
  },
  nextBusText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: '#16A34A',
  },
  timelineBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.button,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: 6,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#94A3B8',
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  timelineLine: {
    position: 'absolute',
    left: 3,
    top: 9,
    width: 2,
    height: 9,
    backgroundColor: '#CBD5E1',
  },
  timelineStopText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: '#475569',
  },
  timelineStopBold: {
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#0F172A',
  },
  selectRouteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 9,
    borderRadius: Radius.button,
    gap: 6,
  },
  selectRouteText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default SuggestedRouteCard;
