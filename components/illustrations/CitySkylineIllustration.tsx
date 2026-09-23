import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Path,
  Rect,
  Circle,
  Line,
  G,
} from 'react-native-svg';
import { GreenBusIllustration } from './GreenBusIllustration';

interface CitySkylineIllustrationProps {
  width?: number;
  height?: number;
}

export function CitySkylineIllustration({
  width = 360,
  height = 240,
}: CitySkylineIllustrationProps) {
  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height} viewBox="0 0 360 240">
        <Defs>
          {/* Lawn / Grass Gradient */}
          <LinearGradient id="lawnGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#81C784" />
            <Stop offset="40%" stopColor="#4CAF50" />
            <Stop offset="100%" stopColor="#2E7D32" />
          </LinearGradient>

          {/* Highway Asphalt */}
          <LinearGradient id="asphaltGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#546E7A" />
            <Stop offset="100%" stopColor="#263238" />
          </LinearGradient>
        </Defs>

        {/* ─── Distant Modern Skyline ─── */}
        <G fill="#A5D6A7" opacity={0.6}>
          <Rect x="15" y="60" width="28" height="90" rx="3" />
          <Rect x="48" y="40" width="34" height="110" rx="4" />
          <Rect x="88" y="70" width="22" height="80" rx="2" />
          <Rect x="115" y="45" width="40" height="105" rx="4" />
          <Rect x="160" y="25" width="32" height="125" rx="4" />
          {/* Radio Mast */}
          <Line x1="176" y1="5" x2="176" y2="25" stroke="#A5D6A7" strokeWidth={2.5} />
          <Rect x="198" y="55" width="36" height="95" rx="4" />
          <Rect x="240" y="70" width="26" height="80" rx="3" />
          <Rect x="272" y="50" width="38" height="100" rx="4" />
          <Rect x="315" y="65" width="30" height="85" rx="3" />
        </G>

        {/* Midground Trees & Foliage */}
        <G fill="#66BB6A" opacity={0.8}>
          <Circle cx="35" cy="140" r="18" />
          <Circle cx="75" cy="145" r="14" />
          <Circle cx="140" cy="142" r="16" />
          <Circle cx="225" cy="144" r="15" />
          <Circle cx="295" cy="140" r="18" />
          <Circle cx="335" cy="145" r="14" />
        </G>

        {/* ─── Rolling Green Lawn / Hillside ─── */}
        <Path
          d="M-10 160 Q90 135 180 155 T370 145 L370 240 L-10 240 Z"
          fill="url(#lawnGrad)"
        />

        {/* ─── Curving Transit Highway ─── */}
        <Path
          d="M-10 185 Q120 165 240 180 T370 190 L370 240 L-10 240 Z"
          fill="url(#asphaltGrad)"
        />

        {/* Highway Lane Marker Dashes */}
        <Path
          d="M0 215 Q120 200 240 210 T370 218"
          stroke="#FFFFFF"
          strokeWidth="4"
          strokeDasharray="22 18"
          fill="none"
          opacity={0.9}
        />
      </Svg>

      {/* ─── Large Green Chigari Bus Driving on the Highway ─── */}
      <View style={styles.busWrapper}>
        <GreenBusIllustration width={220} height={120} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  busWrapper: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
  },
});
