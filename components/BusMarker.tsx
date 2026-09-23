import React from 'react';
import { StyleSheet, View, Image, Text as RNText } from 'react-native';
import type { ChigariBus } from '@/types/transit';
import { FontFamily, Shadows } from '@/constants/theme';

interface BusMarkerProps {
  bus: ChigariBus;
  isSelected?: boolean;
}

export const BusMarker: React.FC<BusMarkerProps> = ({ bus, isSelected = false }) => {
  return (
    <View style={styles.container}>
      {/* ─── Route Number Pill Badge (ONLY official bus numbers: 200A, 201B, 100D, 202D) ─── */}
      <View
        style={[
          styles.pillBadge,
          isSelected && styles.pillBadgeSelected,
        ]}
      >
        <RNText
          style={[
            styles.pillBadgeText,
            isSelected && styles.pillBadgeTextSelected,
          ]}
        >
          {bus.busNumber}
        </RNText>
      </View>

      {/* ─── Circular Chigari Bus Badge with Real-Time Heading Rotation ─── */}
      <View
        style={[
          styles.busCircle,
          isSelected && styles.busCircleSelected,
        ]}
      >
        <View style={{ transform: [{ rotate: `${bus.heading}deg` }] }}>
          <Image
            source={require('@/assets/images/illustrations/bus_asset.png')}
            style={styles.busIcon}
            resizeMode="contain"
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 9,
    marginBottom: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    ...Shadows.low,
  },
  pillBadgeSelected: {
    backgroundColor: '#2E7D32',
    borderColor: '#FFD54F',
    transform: [{ scale: 1.08 }],
  },
  pillBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  pillBadgeTextSelected: {
    color: '#FFFFFF',
  },
  busCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2E7D32',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.medium,
  },
  busCircleSelected: {
    borderColor: '#FFD54F',
    backgroundColor: '#1B5E20',
    borderWidth: 3,
    transform: [{ scale: 1.15 }],
  },
  busIcon: {
    width: 26,
    height: 26,
  },
});

export default BusMarker;
