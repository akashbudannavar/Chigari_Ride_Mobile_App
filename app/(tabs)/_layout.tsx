import React, { useEffect } from 'react';
import { StyleSheet, View, Pressable, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs, router, Redirect } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Home, Navigation2, Ticket, Settings as SettingsIcon, QrCode } from 'lucide-react-native';
import { Colors, Typography, Spacing } from '@/constants/theme';
import { Text } from '@/components/ui/Text';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

const visibleTabs = [
  { name: 'index', titleKey: 'tabs.home', icon: Home },
  { name: 'live', titleKey: 'tabs.tracking', icon: Navigation2 },
  { name: 'tickets', titleKey: 'tabs.ticket', icon: Ticket },
  { name: 'profile', titleKey: 'tabs.settings', icon: SettingsIcon },
];

function CustomNotchedTabBar({ state, navigation }: BottomTabBarProps) {
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const floatAnim = useSharedValue(0);

  useEffect(() => {
    // Ultra-subtle 1mm (~1.8dp) vertical floating animation, slow & smooth ease-in-out cycle
    floatAnim.value = withRepeat(
      withTiming(-1.8, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, []);

  const animatedFloatingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatAnim.value }],
  }));

  const W = windowWidth;
  const cx = W / 2;
  const NOTCH_TOP = 20; // Height where the normal horizontal top edge runs
  const NOTCH_DEPTH = 20; // Depth of the curved notch dip
  const NOTCH_HALF_WIDTH = 42; // Symmetrical half-width of the notch (84dp total)
  const BAR_BASE_HEIGHT = 64;
  const TOTAL_HEIGHT = NOTCH_TOP + BAR_BASE_HEIGHT + insets.bottom;

  // Smooth, symmetrical shallow curved notch in the top edge of the navigation
  const notchPath = `
    M 0 ${NOTCH_TOP}
    L ${cx - NOTCH_HALF_WIDTH} ${NOTCH_TOP}
    C ${cx - 26} ${NOTCH_TOP}, ${cx - 24} ${NOTCH_TOP + NOTCH_DEPTH}, ${cx} ${NOTCH_TOP + NOTCH_DEPTH}
    C ${cx + 24} ${NOTCH_TOP + NOTCH_DEPTH}, ${cx + 26} ${NOTCH_TOP}, ${cx + NOTCH_HALF_WIDTH} ${NOTCH_TOP}
    L ${W} ${NOTCH_TOP}
    L ${W} ${TOTAL_HEIGHT}
    L 0 ${TOTAL_HEIGHT}
    Z
  `;

  // Top contour border line following the notch
  const borderPath = `
    M 0 ${NOTCH_TOP}
    L ${cx - NOTCH_HALF_WIDTH} ${NOTCH_TOP}
    C ${cx - 26} ${NOTCH_TOP}, ${cx - 24} ${NOTCH_TOP + NOTCH_DEPTH}, ${cx} ${NOTCH_TOP + NOTCH_DEPTH}
    C ${cx + 24} ${NOTCH_TOP + NOTCH_DEPTH}, ${cx + 26} ${NOTCH_TOP}, ${cx + NOTCH_HALF_WIDTH} ${NOTCH_TOP}
    L ${W} ${NOTCH_TOP}
  `;

  const leftTabs = visibleTabs.slice(0, 2); // Home, Tracking
  const rightTabs = visibleTabs.slice(2, 4); // History, Settings

  const handleScanPress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push('/scan-ticket' as any);
  };

  const renderTabItem = (tab: (typeof visibleTabs)[0]) => {
    const route = state.routes.find((r) => r.name === tab.name);
    const isFocused = state.routes[state.index]?.name === tab.name;
    const Icon = tab.icon;
    const tabTitle = t(tab.titleKey);

    const onPress = () => {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      if (route) {
        const event = navigation.emit({
          type: 'tabPress',
          target: route.key,
          canPreventDefault: true,
        });
        if (!isFocused && !event.defaultPrevented) {
          navigation.navigate(route.name);
        }
      }
    };

    return (
      <Pressable
        key={tab.name}
        style={styles.tabItem}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected: isFocused }}
        accessibilityLabel={tabTitle}
      >
        <View style={isFocused ? styles.iconActive : styles.iconInactive}>
          <Icon
            size={20}
            color={isFocused ? Colors.primary : '#9E9E9E'}
            strokeWidth={isFocused ? 2.5 : 2}
            absoluteStrokeWidth={false}
          />
        </View>
        <Text
          style={[
            styles.tabLabel,
            { color: isFocused ? Colors.primary : '#9E9E9E' },
          ]}
        >
          {tabTitle}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.tabBarContainer, { height: TOTAL_HEIGHT, marginTop: -NOTCH_TOP }]}>
      {/* Curved Notched Background & Border */}
      <Svg width={W} height={TOTAL_HEIGHT} style={StyleSheet.absoluteFill}>
        <Path d={notchPath} fill="#FFFFFF" />
        <Path d={borderPath} stroke="#EBECEF" strokeWidth={1} fill="none" />
      </Svg>

      {/* 4 Tabs Navigation Row */}
      <View
        style={[
          styles.tabsRow,
          {
            marginTop: NOTCH_TOP,
            height: BAR_BASE_HEIGHT,
            paddingBottom: insets.bottom ? 4 : 8,
          },
        ]}
      >
        {/* Left Tabs (Home, Tracking) */}
        <View style={styles.tabsHalf}>{leftTabs.map(renderTabItem)}</View>

        {/* Center Spacer for Notch */}
        <View style={styles.centerNotchSpacer} pointerEvents="none" />

        {/* Right Tabs (History, Settings) */}
        <View style={styles.tabsHalf}>{rightTabs.map(renderTabItem)}</View>
      </View>

      {/* Centered Floating Scan Ticket Button Embedded Directly in the Notch */}
      <View style={[styles.scanButtonAnchor, { left: cx - 32, top: 2 }]} pointerEvents="box-none">
        <Animated.View style={[styles.scanButtonWrapper, animatedFloatingStyle]}>
          <Pressable
            style={({ pressed }) => [
              styles.scanBtn,
              pressed && styles.scanBtnPressed,
            ]}
            onPress={handleScanPress}
            accessibilityRole="button"
            accessibilityLabel={t('tabs.scan')}
            accessibilityHint="Opens ticket scanner to scan your Chigari QR code"
          >
            <View style={styles.scanCircle}>
              <QrCode size={23} color="#FFFFFF" strokeWidth={2.4} />
            </View>
            <Text style={styles.scanLabel}>{t('tabs.scan')}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { t } = useLanguage();
  const { user, isGuest, loading } = useAuth();

  // Route protection: unauthenticated users are never rendered in (tabs)
  if (!loading && !user && !isGuest) {
    return <Redirect href="/welcome" />;
  }

  return (
    <Tabs
      tabBar={(props) => <CustomNotchedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.home') }} />
      <Tabs.Screen name="live" options={{ title: t('tabs.tracking') }} />
      <Tabs.Screen name="tickets" options={{ title: t('tabs.ticket') }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.settings') }} />
      <Tabs.Screen name="routes" options={{ href: null }} />
      <Tabs.Screen name="tracking" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'relative',
    backgroundColor: 'transparent',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
  },
  tabsHalf: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  centerNotchSpacer: {
    width: 76,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconActive: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  iconInactive: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  tabLabel: {
    ...Typography.labelSmall,
    fontFamily: 'Poppins-Medium',
    fontSize: 11,
    marginTop: 1,
  },
  scanButtonAnchor: {
    position: 'absolute',
    width: 64,
    alignItems: 'center',
    zIndex: 10,
  },
  scanButtonWrapper: {
    alignItems: 'center',
  },
  scanBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBtnPressed: {
    transform: [{ scale: 0.93 }],
    opacity: 0.9,
  },
  scanCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1B5E20',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 6,
  },
  scanLabel: {
    fontSize: 10,
    fontFamily: 'Poppins-Medium',
    fontWeight: '600',
    color: Colors.primary,
    marginTop: 2,
  },
});
