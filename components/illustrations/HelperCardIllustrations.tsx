import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Circle,
  Path,
  Rect,
  Ellipse,
  Line,
  G,
} from 'react-native-svg';

// ─── 1. Analogue Clock (Orange Bus Timings Card) ──────────────────────────────
export function AnalogueClockIllustration({ size = 70 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id="clockShadow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="rgba(0,0,0,0.25)" />
            <Stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </RadialGradient>
          <LinearGradient id="clockBezel" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFFFFF" />
            <Stop offset="100%" stopColor="#E0E0E0" />
          </LinearGradient>
        </Defs>

        {/* Shadow */}
        <Circle cx="52" cy="52" r="44" fill="url(#clockShadow)" />

        {/* Bezel */}
        <Circle cx="50" cy="50" r="44" fill="url(#clockBezel)" stroke="#FFE0B2" strokeWidth={2} />

        {/* White Dial */}
        <Circle cx="50" cy="50" r="38" fill="#FFFFFF" />

        {/* Hour Ticks */}
        <Line x1="50" y1="17" x2="50" y2="23" stroke="#FFA726" strokeWidth={3} strokeLinecap="round" />
        <Line x1="83" y1="50" x2="77" y2="50" stroke="#FFA726" strokeWidth={3} strokeLinecap="round" />
        <Line x1="50" y1="83" x2="50" y2="77" stroke="#FFA726" strokeWidth={3} strokeLinecap="round" />
        <Line x1="17" y1="50" x2="23" y2="50" stroke="#FFA726" strokeWidth={3} strokeLinecap="round" />

        {/* Minor Ticks */}
        <Circle cx="68" cy="22" r="1.5" fill="#FFCC80" />
        <Circle cx="78" cy="32" r="1.5" fill="#FFCC80" />
        <Circle cx="78" cy="68" r="1.5" fill="#FFCC80" />
        <Circle cx="68" cy="78" r="1.5" fill="#FFCC80" />
        <Circle cx="32" cy="78" r="1.5" fill="#FFCC80" />
        <Circle cx="22" cy="68" r="1.5" fill="#FFCC80" />
        <Circle cx="22" cy="32" r="1.5" fill="#FFCC80" />
        <Circle cx="32" cy="22" r="1.5" fill="#FFCC80" />

        {/* Hands: 10:10 */}
        {/* Hour Hand (Points to ~10) */}
        <Line
          x1="50"
          y1="50"
          x2="33"
          y2="33"
          stroke="#F57C00"
          strokeWidth={4}
          strokeLinecap="round"
        />

        {/* Minute Hand (Points to ~2) */}
        <Line
          x1="50"
          y1="50"
          x2="72"
          y2="28"
          stroke="#E65100"
          strokeWidth={3}
          strokeLinecap="round"
        />

        {/* Second Hand (Thin orange line) */}
        <Line
          x1="46"
          y1="56"
          x2="50"
          y2="18"
          stroke="#FF9800"
          strokeWidth={1.5}
          strokeLinecap="round"
        />

        {/* Center Nut */}
        <Circle cx="50" cy="50" r="4.5" fill="#E65100" />
        <Circle cx="50" cy="50" r="2" fill="#FFFFFF" />
      </Svg>
    </View>
  );
}

// ─── 2. Megaphone / Loudspeaker (Blue Stay Updated Card) ─────────────────────
export function MegaphoneIllustration({ size = 70 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="coneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFFFFF" />
            <Stop offset="60%" stopColor="#ECEFF1" />
            <Stop offset="100%" stopColor="#CFD8DC" />
          </LinearGradient>
          <LinearGradient id="blueBase" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#1E88E5" />
            <Stop offset="100%" stopColor="#0D47A1" />
          </LinearGradient>
        </Defs>

        {/* Sound Waves */}
        <Path
          d="M82 32 C88 42 88 58 82 68"
          stroke="#90CAF9"
          strokeWidth={3.5}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M90 24 C100 38 100 62 90 76"
          stroke="#BBDEFB"
          strokeWidth={3.5}
          strokeLinecap="round"
          fill="none"
        />

        {/* Megaphone Body */}
        {/* Main Cone */}
        <Path
          d="M38 42 L72 26 C75 25 78 27 78 30 L78 70 C78 73 75 75 72 74 L38 58 Z"
          fill="url(#coneGrad)"
          stroke="#90A4AE"
          strokeWidth={1.5}
        />

        {/* Rim of the Cone */}
        <Ellipse cx="76" cy="50" rx="4" ry="22" fill="#E3F2FD" stroke="#1976D2" strokeWidth={2} />

        {/* Blue Cylindrical Base */}
        <Rect x="20" y="42" width="18" height="16" rx="3" fill="url(#blueBase)" />
        <Circle cx="20" cy="50" r="7" fill="#1565C0" />

        {/* Handle */}
        <Path
          d="M28 58 L28 76 C28 80 32 82 35 81 L38 80 C40 79 40 76 40 74 L40 58 Z"
          fill="#0D47A1"
        />

        {/* Grip Detail */}
        <Line x1="30" y1="66" x2="38" y2="64" stroke="#42A5F5" strokeWidth={1.5} />
        <Line x1="30" y1="72" x2="38" y2="70" stroke="#42A5F5" strokeWidth={1.5} />
      </Svg>
    </View>
  );
}

// ─── 3. Headset / Headphones (Green Need Help Card) ───────────────────────────
export function HeadsetIllustration({ size = 65 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="headbandGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#43A047" />
            <Stop offset="100%" stopColor="#1B5E20" />
          </LinearGradient>
        </Defs>

        {/* Headband Arc */}
        <Path
          d="M24 55 C24 28 35 18 50 18 C65 18 76 28 76 55"
          stroke="url(#headbandGrad)"
          strokeWidth={7}
          strokeLinecap="round"
          fill="none"
        />

        {/* Padding Cushion at top */}
        <Path
          d="M36 24 C40 21 60 21 64 24"
          stroke="#81C784"
          strokeWidth={4}
          strokeLinecap="round"
          fill="none"
        />

        {/* Left Earcup */}
        <Rect x="15" y="48" width="16" height="26" rx="8" fill="#2E7D32" />
        <Rect x="25" y="52" width="6" height="18" rx="3" fill="#81C784" />

        {/* Right Earcup */}
        <Rect x="69" y="48" width="16" height="26" rx="8" fill="#2E7D32" />
        <Rect x="69" y="52" width="6" height="18" rx="3" fill="#81C784" />

        {/* Microphone Boom */}
        <Path
          d="M23 66 C23 80 40 86 52 82"
          stroke="#1B5E20"
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
        />
        {/* Mic Tip */}
        <Rect x="48" y="78" width="10" height="7" rx="3.5" fill="#43A047" />
      </Svg>
    </View>
  );
}

// ─── 4. 3D Map Pin Graphic (Nearest Bus Stop Card) ────────────────────────────
export function MapPin3DGraphic({ size = 48 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 60 60">
        <Defs>
          <RadialGradient id="pinGroundShadow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="rgba(0,0,0,0.3)" />
            <Stop offset="80%" stopColor="rgba(0,0,0,0.05)" />
            <Stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </RadialGradient>
          <LinearGradient id="pinBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#EF5350" />
            <Stop offset="40%" stopColor="#E53935" />
            <Stop offset="100%" stopColor="#B71C1C" />
          </LinearGradient>
        </Defs>

        {/* Ground Shadow */}
        <Ellipse cx="30" cy="52" rx="14" ry="4" fill="url(#pinGroundShadow)" />

        {/* Pin Body */}
        <Path
          d="M30 6 C20 6 12 14 12 24 C12 36 28 50 30 50 C32 50 48 36 48 24 C48 14 40 6 30 6 Z"
          fill="url(#pinBodyGrad)"
        />

        {/* Highlight Curve */}
        <Path
          d="M20 12 C24 9 32 9 36 12"
          stroke="#FFCDD2"
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
          opacity={0.6}
        />

        {/* Inner White Dot */}
        <Circle cx="30" cy="24" r="7" fill="#FFFFFF" />
        <Circle cx="30" cy="24" r="4" fill="#C62828" />
      </Svg>
    </View>
  );
}
