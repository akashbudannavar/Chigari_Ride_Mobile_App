import React from 'react';
import { StyleSheet, View, Text as RNText } from 'react-native';
import type { BRTSStop } from '@/types/transit';
import { FontFamily, Shadows } from '@/constants/theme';

interface StopMarkerProps {
  stop: BRTSStop;
  isTerminal?: boolean;
}

export const StopMarker: React.FC<StopMarkerProps> = ({ stop, isTerminal = false }) => {
  return (
    <View style={styles.container}>
      {isTerminal ? (
        <View style={styles.terminalBadge}>
          <View style={styles.terminalDot} />
        </View>
      ) : (
        <View style={styles.stopBadge}>
          <View style={styles.stopDot} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: '#E65100',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.low,
  },
  stopDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F57C00',
  },
  terminalBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 3.5,
    borderColor: '#D84315',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.medium,
  },
  terminalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#BF360C',
  },
});

export default StopMarker;
