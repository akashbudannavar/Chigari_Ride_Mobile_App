import React from 'react';
import { StyleSheet, View, Pressable, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Bus, MapPin, Clock, ArrowRight } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { FontFamily, Spacing, Radius, Shadows } from '@/constants/theme';
import type { NearbyBusInfo } from '@/types/ticket';

interface NearbyBusCardProps {
  bus: NearbyBusInfo;
  onPressLocation: (busNumber: string) => void;
}

export function NearbyBusCard({ bus, onPressLocation }: NearbyBusCardProps) {
  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handlePress = () => {
    triggerHaptic();
    onPressLocation(bus.busNumber);
  };

  return (
    <View style={styles.card}>
      <View style={styles.contentRow}>
        {/* ─── Left Bus Badge ─── */}
        <View style={styles.busBadge}>
          <Bus size={18} color="#FFFFFF" strokeWidth={2.2} />
          <Text style={styles.busNumberText}>{bus.busNumber}</Text>
        </View>

        {/* ─── Center Details ─── */}
        <View style={styles.detailsContainer}>
          <Text style={styles.directionText} numberOfLines={1}>
            {bus.direction}
          </Text>

          <View style={styles.metaRow}>
            <Text style={styles.distanceText}>{bus.formattedDistance}</Text>
            <Text style={styles.metaDot}>•</Text>
            <View style={styles.etaContainer}>
              <Clock size={12} color="#16A34A" />
              <Text style={styles.etaText}>ETA {bus.etaMinutes} min</Text>
            </View>
          </View>

          <Text style={styles.nextStopText} numberOfLines={1}>
            Next: {bus.nextStopName}
          </Text>
        </View>

        {/* ─── Right Location / Live Map Action ─── */}
        <Pressable
          style={({ pressed }) => [styles.locationBtn, pressed && styles.locationBtnPressed]}
          onPress={handlePress}
          accessibilityLabel={`View Bus ${bus.busNumber} on live map`}
        >
          <MapPin size={18} color="#2E7D32" strokeWidth={2.4} />
          <Text style={styles.viewMapText}>Map</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.button,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: Spacing.sm + 2,
    marginBottom: Spacing.sm,
    ...Shadows.low,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  busBadge: {
    backgroundColor: '#1B5E20',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 58,
  },
  busNumberText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: FontFamily.bold,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  detailsContainer: {
    flex: 1,
  },
  directionText: {
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
    color: '#111827',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  distanceText: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    color: '#4B5563',
  },
  metaDot: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  etaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  etaText: {
    fontSize: 12,
    fontFamily: FontFamily.semiBold,
    color: '#16A34A',
  },
  nextStopText: {
    fontSize: 11,
    fontFamily: FontFamily.regular,
    color: '#6B7280',
    marginTop: 2,
  },
  locationBtn: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  locationBtnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  viewMapText: {
    fontSize: 10,
    fontFamily: FontFamily.semiBold,
    color: '#2E7D32',
    marginTop: 1,
  },
});
