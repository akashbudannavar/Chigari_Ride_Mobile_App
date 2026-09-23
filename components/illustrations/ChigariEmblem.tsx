import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Rect, G } from 'react-native-svg';
import { Colors } from '@/constants/theme';

interface ChigariEmblemProps {
  size?: number;
  color?: string;
  backgroundColor?: string;
}

export function ChigariEmblem({
  size = 110,
  color = '#2E7D32',
  backgroundColor = 'transparent',
}: ChigariEmblemProps) {
  const strokeWidth = size * 0.055;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {/* Background circle if specified */}
        {backgroundColor !== 'transparent' && (
          <Circle cx={50} cy={50} r={46} fill={backgroundColor} />
        )}

        {/* Outer Green Ring */}
        <Circle
          cx={50}
          cy={50}
          r={45}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Frontal Transit Bus Vector */}
        <G fill={color}>
          {/* Bus Main Shell */}
          <Path
            d="M28 32 C28 26 34 22 50 22 C66 22 72 26 72 32 L72 65 C72 68 70 70 67 70 L65 70 L65 74 C65 76 63 77 61 77 L57 77 C55 77 54 76 54 74 L54 70 L46 70 L46 74 C46 76 45 77 43 77 L39 77 C37 77 35 76 35 74 L35 70 L33 70 C30 70 28 68 28 65 Z"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth * 0.9}
            strokeLinejoin="round"
          />

          {/* Roof indicator line */}
          <Path
            d="M40 25 L60 25"
            stroke={color}
            strokeWidth={strokeWidth * 0.7}
            strokeLinecap="round"
          />

          {/* Large Windshield */}
          <Path
            d="M33 33 C33 30 36 28 50 28 C64 28 67 30 67 33 L67 46 C67 47 66 48 65 48 L35 48 C34 48 33 47 33 46 Z"
            fill={color}
          />

          {/* Center Windshield Divider */}
          <Rect x={48.5} y={28} width={3} height={20} fill="#FFFFFF" />

          {/* Dual Headlights */}
          <Circle cx={36} cy={56} r={4} fill={color} />
          <Circle cx={64} cy={56} r={4} fill={color} />

          {/* Center Grille / Bumper */}
          <Rect x={44} y={54} width={12} height={4} rx={2} fill={color} />
          <Rect x={33} y={63} width={34} height={3} rx={1.5} fill={color} />

          {/* Left & Right Rearview Mirrors */}
          <Path
            d="M26 36 L24 37 L24 43 L26 43 Z"
            fill={color}
          />
          <Path
            d="M74 36 L76 37 L76 43 L74 43 Z"
            fill={color}
          />

          {/* Road dashes below */}
          <Path
            d="M20 83 L80 83"
            stroke={color}
            strokeWidth={strokeWidth * 0.7}
            strokeLinecap="round"
            strokeDasharray="8 6"
          />
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
