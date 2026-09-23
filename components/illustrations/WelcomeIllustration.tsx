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

interface WelcomeIllustrationProps {
  width?: number;
  height?: number;
}

export function WelcomeIllustration({
  width = 330,
  height = 200,
}: WelcomeIllustrationProps) {
  return (
    <View style={[styles.cardContainer, { width, height }]}>
      <Svg width={width} height={height} viewBox="0 0 330 200">
        <Defs>
          {/* Card Sky Gradient */}
          <LinearGradient id="welcomeSky" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#E8F5E9" />
            <Stop offset="70%" stopColor="#C8E6C9" />
            <Stop offset="100%" stopColor="#A5D6A7" />
          </LinearGradient>

          {/* Road Gradient */}
          <LinearGradient id="roadSurface" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#455A64" />
            <Stop offset="100%" stopColor="#263238" />
          </LinearGradient>
        </Defs>

        {/* Card Background */}
        <Rect x="0" y="0" width="330" height="200" rx="24" fill="url(#welcomeSky)" />

        {/* Clouds */}
        <Circle cx="50" cy="40" r="14" fill="#FFFFFF" opacity={0.65} />
        <Circle cx="65" cy="36" r="18" fill="#FFFFFF" opacity={0.65} />
        <Circle cx="82" cy="40" r="14" fill="#FFFFFF" opacity={0.65} />

        <Circle cx="240" cy="35" r="12" fill="#FFFFFF" opacity={0.5} />
        <Circle cx="255" cy="30" r="16" fill="#FFFFFF" opacity={0.5} />
        <Circle cx="270" cy="35" r="12" fill="#FFFFFF" opacity={0.5} />

        {/* ─── Distant City Skyline Silhouettes (Light Teal/Green) ─── */}
        <G fill="#81C784" opacity={0.45}>
          {/* Radio antenna */}
          <Line x1="165" y1="40" x2="165" y2="70" stroke="#81C784" strokeWidth={2} />
          {/* Skyscrapers */}
          <Rect x="20" y="80" width="22" height="60" rx="3" />
          <Rect x="46" y="65" width="26" height="75" rx="3" />
          <Rect x="76" y="85" width="18" height="55" rx="2" />
          <Rect x="98" y="70" width="30" height="70" rx="3" />
          <Rect x="132" y="55" width="25" height="85" rx="3" />
          <Rect x="160" y="70" width="22" height="70" rx="3" />
          <Rect x="186" y="60" width="28" height="80" rx="3" />
          <Rect x="218" y="75" width="24" height="65" rx="3" />
          <Rect x="246" y="85" width="20" height="55" rx="2" />
          <Rect x="270" y="68" width="32" height="72" rx="3" />
        </G>

        {/* ─── Foreground Green Hills & Trees ─── */}
        <Path
          d="M0 145 Q80 125 160 140 T330 135 L330 150 L0 150 Z"
          fill="#4CAF50"
          opacity={0.6}
        />

        {/* Silhouetted Trees */}
        <Circle cx="40" cy="130" r="12" fill="#388E3C" opacity={0.7} />
        <Circle cx="90" cy="134" r="10" fill="#388E3C" opacity={0.7} />
        <Circle cx="230" cy="132" r="14" fill="#388E3C" opacity={0.7} />
        <Circle cx="290" cy="130" r="11" fill="#388E3C" opacity={0.7} />

        {/* ─── Distant Bus on the right with Orange Map Pin ─── */}
        <G transform="translate(185, 110)">
          {/* Mini Bus */}
          <Rect x="0" y="10" width="48" height="20" rx="4" fill="#2E7D32" />
          <Rect x="6" y="13" width="10" height="7" rx="1" fill="#FFFFFF" opacity={0.8} />
          <Rect x="18" y="13" width="8" height="7" rx="1" fill="#FFFFFF" opacity={0.8} />
          <Rect x="28" y="13" width="8" height="7" rx="1" fill="#FFFFFF" opacity={0.8} />
          <Circle cx="10" cy="30" r="4" fill="#212121" />
          <Circle cx="38" cy="30" r="4" fill="#212121" />

          {/* Hovering Orange Location Pin */}
          <Path
            d="M24 -12 C18 -12 14 -8 14 -2 C14 5 24 12 24 12 C24 12 34 5 34 -2 C34 -8 30 -12 24 -12 Z"
            fill="#F57C00"
          />
          <Circle cx="24" cy="-3" r="3.5" fill="#FFFFFF" />
        </G>

        {/* ─── Paved Road ─── */}
        <Path
          d="M0 148 L330 148 L330 200 L0 200 Z"
          fill="url(#roadSurface)"
        />

        {/* White Center Line Dashes on Road */}
        <Line
          x1="10"
          y1="190"
          x2="320"
          y2="190"
          stroke="#FFFFFF"
          strokeWidth="3.5"
          strokeDasharray="24 16"
          opacity={0.85}
        />
      </Svg>

      {/* ─── Main Chigari Green Bus in Foreground ─── */}
      <View style={styles.busOverlay}>
        <GreenBusIllustration width={195} height={105} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    alignSelf: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  busOverlay: {
    position: 'absolute',
    left: 14,
    bottom: 2,
  },
});
