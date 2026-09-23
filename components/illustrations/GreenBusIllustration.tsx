import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Path,
  Rect,
  Circle,
  Ellipse,
  G,
  Text as SvgText,
} from 'react-native-svg';

interface GreenBusIllustrationProps {
  width?: number;
  height?: number;
  flipHorizontal?: boolean;
}

export function GreenBusIllustration({
  width = 160,
  height = 90,
  flipHorizontal = false,
}: GreenBusIllustrationProps) {
  return (
    <View
      style={[
        styles.container,
        { width, height },
        flipHorizontal && { transform: [{ scaleX: -1 }] },
      ]}
    >
      <Svg width={width} height={height} viewBox="0 0 200 110">
        <Defs>
          {/* Main Bus Body Gradient (Rich Green) */}
          <LinearGradient id="busBodyGreen" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#43A047" />
            <Stop offset="30%" stopColor="#2E7D32" />
            <Stop offset="85%" stopColor="#1B5E20" />
            <Stop offset="100%" stopColor="#144617" />
          </LinearGradient>

          {/* Roof AC Unit Gradient */}
          <LinearGradient id="roofAcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#E0E0E0" />
            <Stop offset="50%" stopColor="#FFFFFF" />
            <Stop offset="100%" stopColor="#BDBDBD" />
          </LinearGradient>

          {/* Windows Tint Gradient */}
          <LinearGradient id="windowTint" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#263238" />
            <Stop offset="60%" stopColor="#37474F" />
            <Stop offset="100%" stopColor="#212121" />
          </LinearGradient>

          {/* Glass Reflection Gradient */}
          <LinearGradient id="glassReflect" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
            <Stop offset="40%" stopColor="rgba(255,255,255,0.1)" />
            <Stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </LinearGradient>

          {/* Wheel Shadow */}
          <RadialGradient id="groundShadow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="rgba(0,0,0,0.35)" />
            <Stop offset="80%" stopColor="rgba(0,0,0,0.08)" />
            <Stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </RadialGradient>

          {/* Headlight Flare */}
          <RadialGradient id="headlightFlare" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FFF9C4" />
            <Stop offset="60%" stopColor="rgba(255,235,59,0.5)" />
            <Stop offset="100%" stopColor="rgba(255,235,59,0)" />
          </RadialGradient>
        </Defs>

        {/* ─── Ground Shadow ─── */}
        <Ellipse cx="100" cy="98" rx="88" ry="7" fill="url(#groundShadow)" />

        {/* ─── Roof AC Unit ─── */}
        <Path
          d="M60 22 C60 17 68 15 80 15 L145 15 C155 15 160 17 160 22 Z"
          fill="url(#roofAcGrad)"
        />
        <Rect x="85" y="17" width="45" height="3" rx="1.5" fill="#9E9E9E" />

        {/* ─── Main Bus Body (Perspective side view) ─── */}
        <Path
          d="M18 78 L20 40 C21 30 28 22 42 22 L172 22 C182 22 188 28 190 35 L190 78 C190 82 186 85 180 85 L26 85 C21 85 18 82 18 78 Z"
          fill="url(#busBodyGreen)"
        />

        {/* Aerodynamic Front Cap (Left side is front) */}
        <Path
          d="M18 76 C16 66 17 48 24 34 C28 27 34 23 44 22 L55 22 L52 85 L26 85 C20 85 18 81 18 76 Z"
          fill="#388E3C"
          opacity={0.35}
        />

        {/* Sleek Light Green Accent Stripe */}
        <Path
          d="M18 64 L190 64 L190 68 L18 68 Z"
          fill="#81C784"
          opacity={0.8}
        />
        <Path
          d="M25 71 L185 71 L185 73 L25 73 Z"
          fill="#C8E6C9"
          opacity={0.5}
        />

        {/* ─── Front Windshield ─── */}
        <Path
          d="M25 35 C28 28 34 25 42 25 L56 25 L54 58 L23 58 C22 52 23 42 25 35 Z"
          fill="url(#windowTint)"
        />
        <Path
          d="M25 35 C28 28 34 25 42 25 L56 25 L54 44 L24 44 Z"
          fill="url(#glassReflect)"
        />

        {/* ─── Passenger Side Windows ─── */}
        {/* Window 1 */}
        <Rect x="60" y="25" width="26" height="33" rx="2" fill="url(#windowTint)" />
        <Path d="M60 25 L86 25 L75 58 L60 58 Z" fill="url(#glassReflect)" opacity={0.5} />

        {/* Window 2 */}
        <Rect x="90" y="25" width="26" height="33" rx="2" fill="url(#windowTint)" />
        <Path d="M90 25 L116 25 L105 58 L90 58 Z" fill="url(#glassReflect)" opacity={0.5} />

        {/* Window 3 */}
        <Rect x="120" y="25" width="26" height="33" rx="2" fill="url(#windowTint)" />
        <Path d="M120 25 L146 25 L135 58 L120 58 Z" fill="url(#glassReflect)" opacity={0.5} />

        {/* Window 4 (Rear) */}
        <Rect x="150" y="25" width="34" height="33" rx="2" fill="url(#windowTint)" />
        <Path d="M150 25 L184 25 L170 58 L150 58 Z" fill="url(#glassReflect)" opacity={0.5} />

        {/* ─── CHIGARI White Branding Text on Body ─── */}
        <SvgText
          x="105"
          y="78"
          fill="#FFFFFF"
          fontSize="8"
          fontWeight="bold"
          letterSpacing={1.2}
          textAnchor="middle"
        >
          CHIGARI BRTS
        </SvgText>

        {/* ─── Front Headlight & Fog Lamp ─── */}
        <Circle cx="18" cy="67" r="9" fill="url(#headlightFlare)" />
        <Path
          d="M17 64 C17 61 20 60 22 60 L24 60 L23 72 L19 72 C17 72 17 68 17 64 Z"
          fill="#FFF59D"
        />
        <Circle cx="20" cy="66" r="2.5" fill="#FFFFFF" />

        {/* Lower Amber Fog light */}
        <Circle cx="21" cy="78" r="2" fill="#FFA726" />

        {/* ─── Rear Taillight ─── */}
        <Rect x="188" y="60" width="3" height="12" rx="1.5" fill="#D32F2F" />

        {/* ─── Wheel Arches & Wheels ─── */}
        {/* Front Wheel Arch */}
        <Path
          d="M36 85 C36 71 58 71 58 85 Z"
          fill="#1B5E20"
        />
        {/* Front Wheel */}
        <Circle cx="47" cy="85" r="14" fill="#212121" />
        <Circle cx="47" cy="85" r="11" fill="#424242" />
        <Circle cx="47" cy="85" r="7" fill="#BDBDBD" />
        <Circle cx="47" cy="85" r="3" fill="#2E7D32" />

        {/* Rear Wheel Arch */}
        <Path
          d="M148 85 C148 71 170 71 170 85 Z"
          fill="#1B5E20"
        />
        {/* Rear Wheel */}
        <Circle cx="159" cy="85" r="14" fill="#212121" />
        <Circle cx="159" cy="85" r="11" fill="#424242" />
        <Circle cx="159" cy="85" r="7" fill="#BDBDBD" />
        <Circle cx="159" cy="85" r="3" fill="#2E7D32" />
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
