import { useEffect, useRef } from 'react';
import { StyleSheet, View, Pressable, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  cancelAnimation,
  runOnJS,
  useDerivedValue,
  useAnimatedProps,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import Svg, {
  G,
  Path,
  Rect,
  Circle,
  Ellipse,
  Line,
  Text as SvgText,
  Defs,
  ClipPath,
  LinearGradient as SvgLinearGradient,
  Stop,
  RadialGradient,
  Use,
} from 'react-native-svg';
import { ArrowRight } from 'lucide-react-native';
import { Colors, FontFamily, Spacing, Radius, Shadows } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Animated SVG wrapper ────────────────────────────────────────────────────
const AnimatedSvg = Animated.createAnimatedComponent(Svg);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedLine = Animated.createAnimatedComponent(Line);

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();

  // Entrance animation shared values
  const bgOpacity = useSharedValue(0);
  const skylineOpacity = useSharedValue(0);
  const skylineTranslateY = useSharedValue(40);
  const busScale = useSharedValue(0);
  const busOpacity = useSharedValue(0);
  const busTranslateY = useSharedValue(30);
  const busFloat = useSharedValue(0);
  const headlineOpacity = useSharedValue(0);
  const headlineTranslateY = useSharedValue(24);
  const subtitleOpacity = useSharedValue(0);
  const subtitleTranslateY = useSharedValue(16);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(20);
  const indicatorOpacity = useSharedValue(0);
  const wheelRotation = useSharedValue(0);
  const roadDashOffset = useSharedValue(0);
  const cloud1X = useSharedValue(0);
  const cloud2X = useSharedValue(0);
  const sunGlow = useSharedValue(0);

  // Page indicator
  const activeDotScale = useSharedValue(1);

  useEffect(() => {
    // Background gradient
    bgOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) });

    // Sun glow pulse
    sunGlow.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.7, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );

    // Skyline slides up
    skylineOpacity.value = withDelay(200, withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) }));
    skylineTranslateY.value = withDelay(200, withSpring(0, { damping: 16, stiffness: 90 }));

    // Clouds drift
    cloud1X.value = withRepeat(
      withTiming(30, { duration: 8000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    cloud2X.value = withRepeat(
      withTiming(-25, { duration: 10000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    // Bus scales in with bounce
    busOpacity.value = withDelay(500, withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }));
    busScale.value = withDelay(
      500,
      withSpring(1, { damping: 10, stiffness: 80, mass: 0.8 })
    );
    busTranslateY.value = withDelay(500, withSpring(0, { damping: 14, stiffness: 100 }));

    // Bus gentle floating
    busFloat.value = withDelay(
      1200,
      withRepeat(
        withSequence(
          withTiming(-6, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );

    // Wheels spin
    wheelRotation.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );

    // Road dashes scroll
    roadDashOffset.value = withRepeat(
      withTiming(-40, { duration: 1000, easing: Easing.linear }),
      -1,
      false
    );

    // Headline
    headlineOpacity.value = withDelay(800, withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) }));
    headlineTranslateY.value = withDelay(800, withSpring(0, { damping: 15, stiffness: 100 }));

    // Subtitle
    subtitleOpacity.value = withDelay(1000, withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) }));
    subtitleTranslateY.value = withDelay(1000, withSpring(0, { damping: 15, stiffness: 100 }));

    // Buttons
    buttonOpacity.value = withDelay(1200, withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) }));
    buttonTranslateY.value = withDelay(1200, withSpring(0, { damping: 14, stiffness: 95 }));

    // Page indicator
    indicatorOpacity.value = withDelay(1400, withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }));

    // Indicator pulse
    activeDotScale.value = withDelay(
      1600,
      withRepeat(
        withSequence(
          withTiming(1.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );

    return () => {
      cancelAnimation(busFloat);
      cancelAnimation(wheelRotation);
      cancelAnimation(roadDashOffset);
      cancelAnimation(cloud1X);
      cancelAnimation(cloud2X);
      cancelAnimation(sunGlow);
      cancelAnimation(activeDotScale);
    };
  }, []);

  // ─── Animated styles ──────────────────────────────────────────────────────
  const skylineStyle = useAnimatedStyle(() => ({
    opacity: skylineOpacity.value,
    transform: [{ translateY: skylineTranslateY.value }],
  }));

  const busContainerStyle = useAnimatedStyle(() => ({
    opacity: busOpacity.value,
    transform: [
      { scale: busScale.value },
      { translateY: busTranslateY.value + busFloat.value },
    ],
  }));

  const headlineStyle = useAnimatedStyle(() => ({
    opacity: headlineOpacity.value,
    transform: [{ translateY: headlineTranslateY.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleTranslateY.value }],
  }));

  const buttonContainerStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: indicatorOpacity.value,
  }));

  const activeDotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: activeDotScale.value }],
  }));

  // Wheel rotation
  const wheelStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${wheelRotation.value}deg` }],
  }));

  // Cloud positions
  const cloud1Style = useAnimatedStyle(() => ({
    transform: [{ translateX: cloud1X.value }],
  }));

  const cloud2Style = useAnimatedStyle(() => ({
    transform: [{ translateX: cloud2X.value }],
  }));

  // Sun glow
  const sunGlowStyle = useAnimatedStyle(() => ({
    opacity: sunGlow.value,
  }));

  // Road dash animation
  const roadDashStyle = useAnimatedProps(() => ({
    strokeDashoffset: roadDashOffset.value,
  }));

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleGetStarted = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(tabs)/index');
  };

  const handleLogin = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/login');
  };

  return (
    <View style={styles.container}>
      {/* ─── Background Gradient ─── */}
      <LinearGradient
        colors={[Colors.primaryDark, Colors.primary, '#1976D2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ─── Sky / Sun / Clouds ─── */}
      <View style={styles.skyContainer}>
        {/* Sun glow */}
        <Animated.View style={[styles.sunGlow, sunGlowStyle]} pointerEvents="none" />

        {/* Cloud 1 */}
        <Animated.View style={[styles.cloud1, cloud1Style]} pointerEvents="none">
          <Svg width={120} height={50} viewBox="0 0 120 50">
            <G>
              <Ellipse cx={30} cy={30} rx={25} ry={16} fill="rgba(255,255,255,0.12)" />
              <Ellipse cx={60} cy={22} rx={30} ry={20} fill="rgba(255,255,255,0.10)" />
              <Ellipse cx={90} cy={30} rx={22} ry={14} fill="rgba(255,255,255,0.12)" />
            </G>
          </Svg>
        </Animated.View>

        {/* Cloud 2 */}
        <Animated.View style={[styles.cloud2, cloud2Style]} pointerEvents="none">
          <Svg width={90} height={40} viewBox="0 0 90 40">
            <G>
              <Ellipse cx={22} cy={24} rx={18} ry={12} fill="rgba(255,255,255,0.08)" />
              <Ellipse cx={48} cy={18} rx={22} ry={15} fill="rgba(255,255,255,0.06)" />
              <Ellipse cx={70} cy={24} rx={16} ry={10} fill="rgba(255,255,255,0.08)" />
            </G>
          </Svg>
        </Animated.View>
      </View>

      {/* ─── Hubballi Skyline ─── */}
      <Animated.View style={[styles.skylineContainer, skylineStyle]} pointerEvents="none">
        <Svg width={SCREEN_WIDTH} height={160} viewBox={`0 0 ${SCREEN_WIDTH} 160`}>
          <Defs>
            <SvgLinearGradient id="skylineGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="rgba(255,255,255,0.06)" />
              <Stop offset="1" stopColor="rgba(255,255,255,0.14)" />
            </SvgLinearGradient>
          </Defs>

          {/* Far buildings (lighter, background layer) */}
          <G>
            {/* Chandrama Memorial / temple spire */}
            <Path
              d={`M ${SCREEN_WIDTH * 0.15} 160 L ${SCREEN_WIDTH * 0.15} 80 L ${SCREEN_WIDTH * 0.16} 75 L ${SCREEN_WIDTH * 0.17} 80 L ${SCREEN_WIDTH * 0.17} 50 L ${SCREEN_WIDTH * 0.18} 45 L ${SCREEN_WIDTH * 0.19} 50 L ${SCREEN_WIDTH * 0.19} 80 L ${SCREEN_WIDTH * 0.21} 80 L ${SCREEN_WIDTH * 0.21} 160 Z`}
              fill="rgba(255,255,255,0.05)"
            />
            {/* Dome on top */}
            <Ellipse cx={SCREEN_WIDTH * 0.18} cy={45} rx={8} ry={10} fill="rgba(255,255,255,0.06)" />
            <Rect x={SCREEN_WIDTH * 0.175} y={35} width={2} height={12} fill="rgba(255,255,255,0.06)" />
          </G>

          {/* Mid-range buildings */}
          <G fill="url(#skylineGrad)">
            {/* Building cluster left */}
            <Rect x={SCREEN_WIDTH * 0.02} y={100} width={30} height={60} rx={2} />
            <Rect x={SCREEN_WIDTH * 0.06} y={85} width={25} height={75} rx={2} />
            <Rect x={SCREEN_WIDTH * 0.10} y={95} width={28} height={65} rx={2} />

            {/* Building cluster center-left */}
            <Rect x={SCREEN_WIDTH * 0.24} y={90} width={32} height={70} rx={2} />
            <Rect x={SCREEN_WIDTH * 0.29} y={75} width={28} height={85} rx={2} />

            {/* Central tower (tall building) */}
            <Rect x={SCREEN_WIDTH * 0.38} y={55} width={35} height={105} rx={3} />
            <Rect x={SCREEN_WIDTH * 0.43} y={40} width={25} height={120} rx={2} />
            {/* Antenna on tall tower */}
            <Line x1={SCREEN_WIDTH * 0.445} y1={40} x2={SCREEN_WIDTH * 0.445} y2={20} stroke="rgba(255,255,255,0.12)" strokeWidth={2} />
            <Circle cx={SCREEN_WIDTH * 0.445} cy={18} r={3} fill="rgba(255,255,255,0.15)" />

            {/* Building cluster center-right */}
            <Rect x={SCREEN_WIDTH * 0.50} y={80} width={30} height={80} rx={2} />
            <Rect x={SCREEN_WIDTH * 0.55} y={95} width={25} height={65} rx={2} />

            {/* Clock tower (Vidhan Soudana inspired) */}
            <Rect x={SCREEN_WIDTH * 0.62} y={70} width={30} height={90} rx={2} />
            <Rect x={SCREEN_WIDTH * 0.65} y={55} width={24} height={20} rx={2} />
            <Ellipse cx={SCREEN_WIDTH * 0.662} cy={50} rx={12} ry={8} fill="rgba(255,255,255,0.10)" />
            <Rect x={SCREEN_WIDTH * 0.658} y={38} width={4} height={14} rx={1} fill="rgba(255,255,255,0.10)" />

            {/* Building cluster right */}
            <Rect x={SCREEN_WIDTH * 0.72} y={88} width={28} height={72} rx={2} />
            <Rect x={SCREEN_WIDTH * 0.77} y={78} width={32} height={82} rx={2} />
            <Rect x={SCREEN_WIDTH * 0.83} y={92} width={26} height={68} rx={2} />

            {/* Far right buildings */}
            <Rect x={SCREEN_WIDTH * 0.88} y={100} width={30} height={60} rx={2} />
            <Rect x={SCREEN_WIDTH * 0.93} y={85} width={28} height={75} rx={2} />
          </G>

          {/* Windows (tiny dots on buildings) */}
          <G fill="rgba(255,255,255,0.15)">
            {Array.from({ length: 40 }).map((_, i) => {
              const x = (i * 23 + 15) % (SCREEN_WIDTH - 20);
              const y = 60 + ((i * 17) % 80);
              return <Rect key={`win-${i}`} x={x} y={y} width={3} height={3} rx={0.5} />;
            })}
          </G>

          {/* Ground line */}
          <Line
            x1={0}
            y1={160}
            x2={SCREEN_WIDTH}
            y2={160}
            stroke="rgba(255,255,255,0.10)"
            strokeWidth={1}
          />
        </Svg>
      </Animated.View>

      {/* ─── Bus Illustration ─── */}
      <Animated.View style={[styles.busContainer, busContainerStyle]} pointerEvents="none">
        <BusIllustration wheelStyle={wheelStyle} roadDashStyle={roadDashStyle} />
      </Animated.View>

      {/* ─── Text Content ─── */}
      <View style={[styles.textContainer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        {/* Headline */}
        <Animated.View style={headlineStyle}>
          <Animated.Text style={styles.headline}>Welcome to</Animated.Text>
          <Animated.Text style={styles.headlineBrand}>CHIGARI RIDE</Animated.Text>
        </Animated.View>

        {/* Subtitle */}
        <Animated.View style={subtitleStyle}>
          <Animated.Text style={styles.subtitle}>
            Your smart partner for city bus travel.
          </Animated.Text>
        </Animated.View>

        {/* Buttons */}
        <Animated.View style={buttonContainerStyle}>
          {/* Get Started */}
          <Pressable
            style={({ pressed }) => [styles.getStartedButton, pressed && styles.buttonPressed]}
            onPress={handleGetStarted}
          >
            <Animated.Text style={styles.getStartedLabel}>Get Started</Animated.Text>
            <ArrowRight size={20} color={Colors.textOnPrimary} strokeWidth={2.5} />
          </Pressable>

          {/* Login */}
          <Pressable
            style={({ pressed }) => [styles.loginButton, pressed && styles.loginPressed]}
            onPress={handleLogin}
          >
            <Animated.Text style={styles.loginLabel}>Login</Animated.Text>
          </Pressable>
        </Animated.View>

        {/* Page Indicator */}
        <Animated.View style={[styles.indicatorContainer, indicatorStyle]}>
          <View style={styles.indicatorDot} />
          <Animated.View style={[styles.indicatorDotActive, activeDotStyle]} />
          <View style={styles.indicatorDot} />
        </Animated.View>
      </View>
    </View>
  );
}

// ─── Bus Illustration Component ──────────────────────────────────────────────
function BusIllustration({
  wheelStyle,
  roadDashStyle,
}: {
  wheelStyle: any;
  roadDashStyle: any;
}) {
  const BUS_WIDTH = 260;
  const BUS_HEIGHT = 140;

  return (
    <View style={styles.busIllustrationWrapper}>
      <Svg width={BUS_WIDTH} height={BUS_HEIGHT + 30} viewBox={`0 0 ${BUS_WIDTH} ${BUS_HEIGHT + 30}`}>
        <Defs>
          {/* Bus body gradient */}
          <SvgLinearGradient id="busBody" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" />
            <Stop offset="0.5" stopColor="#F5F7FA" />
            <Stop offset="1" stopColor="#E8EAF0" />
          </SvgLinearGradient>

          {/* Window gradient */}
          <SvgLinearGradient id="windowGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#1565C0" />
            <Stop offset="0.5" stopColor="#42A5F5" />
            <Stop offset="1" stopColor="#64B5F6" />
          </SvgLinearGradient>

          {/* Stripe gradient */}
          <SvgLinearGradient id="stripeGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#1565C0" />
            <Stop offset="1" stopColor="#42A5F5" />
          </SvgLinearGradient>

          {/* Shadow under bus */}
          <RadialGradient id="busShadow" cx="0.5" cy="0.5" rx="0.5" ry="0.5">
            <Stop offset="0" stopColor="rgba(0,0,0,0.25)" />
            <Stop offset="1" stopColor="rgba(0,0,0,0)" />
          </RadialGradient>

          {/* Headlight glow */}
          <RadialGradient id="headlightGlow" cx="0.5" cy="0.5" rx="0.5" ry="0.5">
            <Stop offset="0" stopColor="rgba(255,235,59,0.6)" />
            <Stop offset="1" stopColor="rgba(255,235,59,0)" />
          </RadialGradient>
        </Defs>

        {/* Shadow under bus */}
        <Ellipse cx={BUS_WIDTH / 2} cy={BUS_HEIGHT + 22} rx={BUS_WIDTH / 2 - 10} ry={8} fill="url(#busShadow)" />

        {/* ─── Bus Body ─── */}
        {/* Main body */}
        <Path
          d={`M 20 ${BUS_HEIGHT - 20}
              L 20 30
              Q 20 15 35 15
              L ${BUS_WIDTH - 35} 15
              Q ${BUS_WIDTH - 20} 15 ${BUS_WIDTH - 20} 30
              L ${BUS_WIDTH - 20} ${BUS_HEIGHT - 20}
              Z`}
          fill="url(#busBody)"
          stroke="rgba(21,101,192,0.15)"
          strokeWidth={1}
        />

        {/* Roof curve highlight */}
        <Path
          d={`M 35 15 Q 20 15 20 30 L 20 35 L ${BUS_WIDTH - 20} 35 L ${BUS_WIDTH - 20} 30 Q ${BUS_WIDTH - 20} 15 ${BUS_WIDTH - 35} 15 Z`}
          fill="rgba(21,101,192,0.06)"
        />

        {/* ─── Blue stripe across body ─── */}
        <Rect x={20} y={BUS_HEIGHT * 0.45} width={BUS_WIDTH - 40} height={14} fill="url(#stripeGrad)" />
        <Rect x={20} y={BUS_HEIGHT * 0.45 + 14} width={BUS_WIDTH - 40} height={2} fill="rgba(21,101,192,0.3)" />

        {/* ─── Front windshield ─── */}
        <Path
          d={`M ${BUS_WIDTH - 55} 28 L ${BUS_WIDTH - 28} 28 Q ${BUS_WIDTH - 22} 28 ${BUS_WIDTH - 22} 34 L ${BUS_WIDTH - 22} ${BUS_HEIGHT * 0.42} L ${BUS_WIDTH - 55} ${BUS_HEIGHT * 0.42} Z`}
          fill="url(#windowGrad)"
          opacity={0.85}
        />
        {/* Windshield reflection */}
        <Path
          d={`M ${BUS_WIDTH - 50} 30 L ${BUS_WIDTH - 40} 30 L ${BUS_WIDTH - 45} ${BUS_HEIGHT * 0.35} L ${BUS_WIDTH - 52} ${BUS_HEIGHT * 0.35} Z`}
          fill="rgba(255,255,255,0.25)"
        />

        {/* ─── Side windows ─── */}
        {/* Window 1 */}
        <Rect x={32} y={28} width={38} height={28} rx={3} fill="url(#windowGrad)" opacity={0.85} />
        <Rect x={35} y={30} width={14} height={20} rx={1} fill="rgba(255,255,255,0.2)" />

        {/* Window 2 */}
        <Rect x={76} y={28} width={38} height={28} rx={3} fill="url(#windowGrad)" opacity={0.85} />
        <Rect x={79} y={30} width={14} height={20} rx={1} fill="rgba(255,255,255,0.2)" />

        {/* Window 3 */}
        <Rect x={120} y={28} width={38} height={28} rx={3} fill="url(#windowGrad)" opacity={0.85} />
        <Rect x={123} y={30} width={14} height={20} rx={1} fill="rgba(255,255,255,0.2)" />

        {/* Window 4 */}
        <Rect x={164} y={28} width={38} height={28} rx={3} fill="url(#windowGrad)" opacity={0.85} />
        <Rect x={167} y={30} width={14} height={20} rx={1} fill="rgba(255,255,255,0.2)" />

        {/* ─── Door ─── */}
        <Rect x={210} y={BUS_HEIGHT * 0.42} width={28} height={BUS_HEIGHT * 0.45} rx={3} fill="rgba(21,101,192,0.08)" stroke="rgba(21,101,192,0.2)" strokeWidth={1} />
        <Line x1={224} y1={BUS_HEIGHT * 0.42 + 5} x2={224} y2={BUS_HEIGHT * 0.87 - 5} stroke="rgba(21,101,192,0.15)" strokeWidth={1} strokeDasharray="3 2" />

        {/* ─── CHIGARI logo text on bus ─── */}
        <Rect x={90} y={BUS_HEIGHT * 0.52} width={80} height={18} rx={4} fill="rgba(21,101,192,0.08)" />
        <SvgText
          x={130}
          y={BUS_HEIGHT * 0.52 + 13}
          fontSize={10}
          fontWeight="700"
          fill={Colors.primary}
          fontFamily={FontFamily.bold}
          textAnchor="middle"
          letterSpacing={1.5}
        >
          CHIGARI
        </SvgText>

        {/* ─── Headlight ─── */}
        <Circle cx={BUS_WIDTH - 14} cy={BUS_HEIGHT * 0.55} r={5} fill="#FFEB3B" />
        <Circle cx={BUS_WIDTH - 14} cy={BUS_HEIGHT * 0.55} r={12} fill="url(#headlightGlow)" />

        {/* ─── Tail light ─── */}
        <Rect x={20} y={BUS_HEIGHT * 0.52} width={6} height={10} rx={2} fill="#C62828" />

        {/* ─── Bumper ─── */}
        <Rect x={15} y={BUS_HEIGHT - 22} width={BUS_WIDTH - 30} height={8} rx={4} fill="rgba(33,33,33,0.12)" />

        {/* ─── Wheels (animated rotation) ─── */}
        {/* Wheel back */}
        <Animated.View style={[wheelStyle, { position: 'absolute', left: 50 - 16, top: BUS_HEIGHT - 5 - 16, width: 32, height: 32 }]} pointerEvents="none">
          <Svg width={32} height={32} viewBox="0 0 32 32">
            <Circle cx={16} cy={16} r={16} fill="#212121" />
            <Circle cx={16} cy={16} r={10} fill="#424242" />
            <Circle cx={16} cy={16} r={4} fill="#9E9E9E" />
            <Line x1={16} y1={2} x2={16} y2={30} stroke="#616161" strokeWidth={2} />
            <Line x1={2} y1={16} x2={30} y2={16} stroke="#616161" strokeWidth={2} />
            <Line x1={6} y1={6} x2={26} y2={26} stroke="#616161" strokeWidth={1.5} />
            <Line x1={26} y1={6} x2={6} y2={26} stroke="#616161" strokeWidth={1.5} />
          </Svg>
        </Animated.View>

        {/* Wheel front */}
        <Animated.View style={[wheelStyle, { position: 'absolute', left: BUS_WIDTH - 50 - 16, top: BUS_HEIGHT - 5 - 16, width: 32, height: 32 }]} pointerEvents="none">
          <Svg width={32} height={32} viewBox="0 0 32 32">
            <Circle cx={16} cy={16} r={16} fill="#212121" />
            <Circle cx={16} cy={16} r={10} fill="#424242" />
            <Circle cx={16} cy={16} r={4} fill="#9E9E9E" />
            <Line x1={16} y1={2} x2={16} y2={30} stroke="#616161" strokeWidth={2} />
            <Line x1={2} y1={16} x2={30} y2={16} stroke="#616161" strokeWidth={2} />
            <Line x1={6} y1={6} x2={26} y2={26} stroke="#616161" strokeWidth={1.5} />
            <Line x1={26} y1={6} x2={6} y2={26} stroke="#616161" strokeWidth={1.5} />
          </Svg>
        </Animated.View>

        {/* ─── Road ─── */}
        <Line
          x1={0}
          y1={BUS_HEIGHT + 18}
          x2={BUS_WIDTH}
          y2={BUS_HEIGHT + 18}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={3}
          strokeDasharray="20 20"
          {...roadDashStyle}
        />
      </Svg>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  skyContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.45,
    overflow: 'hidden',
  },
  sunGlow: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.06,
    right: SCREEN_WIDTH * 0.15,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,235,59,0.15)',
    shadowColor: 'rgba(255,235,59,0.3)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
  },
  cloud1: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.08,
    left: SCREEN_WIDTH * 0.05,
  },
  cloud2: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.14,
    right: SCREEN_WIDTH * 0.08,
  },
  skylineContainer: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.42,
    left: 0,
    right: 0,
    height: 160,
  },
  busContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.18,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  busIllustrationWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    alignItems: 'center',
  },
  headline: {
    fontFamily: FontFamily.semiBold,
    fontSize: 24,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 32,
  },
  headlineBrand: {
    fontFamily: FontFamily.bold,
    fontSize: 38,
    fontWeight: '700',
    color: Colors.textOnPrimary,
    textAlign: 'center',
    lineHeight: 46,
    letterSpacing: 1,
    marginTop: 2,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  getStartedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    width: '100%',
    paddingVertical: Spacing.base + 2,
    borderRadius: Radius.button,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.md,
    ...Shadows.medium,
  },
  buttonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.92,
  },
  getStartedLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  loginButton: {
    width: '100%',
    paddingVertical: Spacing.base + 2,
    borderRadius: Radius.button,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.85,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  loginLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textOnPrimary,
  },
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  indicatorDotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textOnPrimary,
  },
});
