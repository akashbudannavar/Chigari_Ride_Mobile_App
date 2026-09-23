import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  RefreshControl,
  Dimensions,
  Platform,
  Image,
  ImageBackground,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  Search,
  Bus,
  Clock,
  ArrowRight,
  Route as RouteIcon,
  Bell,
  Navigation2,
  SlidersHorizontal,
  ChevronRight,
  Map,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  RadialGradient,
  Stop,
  Path,
  Ellipse,
} from 'react-native-svg';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/contexts/AuthContext';
import { useRoutes, useLivePositions } from '@/hooks/useTransitData';
import { Colors, FontFamily, Spacing, Radius, Shadows } from '@/constants/theme';
import { useLanguage } from '@/contexts/LanguageContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_ITEM_WIDTH = (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md) / 2;

function getGreeting(t: (key: string) => string): string {
  const hour = new Date().getHours();
  if (hour < 12) return t('home.goodMorning');
  if (hour < 17) return t('home.goodAfternoon');
  return t('home.goodEvening');
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { routes } = useRoutes();
  const { positions } = useLivePositions();
  const { t } = useLanguage();
  const [refreshing, setRefreshing] = useState(false);

  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(16);

  useEffect(() => {
    contentOpacity.value = withTiming(1, { duration: 450, easing: Easing.out(Easing.ease) });
    contentTranslateY.value = withSpring(0, { damping: 18, stiffness: 100 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const triggerHaptic = (style = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(style);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    triggerHaptic();
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
  };

  const greeting = getGreeting(t);
  const displayName = profile?.full_name?.trim()
    ? profile.full_name.includes('Guest')
      ? 'Guest User'
      : profile.full_name.split(' ')[0]
    : 'Akash';

  return (
    <Screen backgroundColor={Colors.background} safeAreaTop={false} safeAreaBottom={false}>
      <Animated.ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.base, paddingBottom: 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        <Animated.View style={animatedStyle}>
          {/* ─── Top Header (Screen 5) ─── */}
          <View style={styles.headerRow}>
            <View style={styles.greetingContainer}>
              <Text style={styles.greetingPrefix}>{greeting}</Text>
              <Text style={styles.greetingName}>{displayName} 👋</Text>
            </View>

            <View style={styles.headerRightButtons}>
              <Pressable
                style={({ pressed }) => [styles.headerCircleBtn, pressed && styles.pressed]}
                onPress={() => triggerHaptic()}
                accessibilityLabel="Notifications"
              >
                <Bell size={19} color="#1F2937" strokeWidth={2.2} />
                <View style={styles.bellDot} />
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.headerCircleBtn, pressed && styles.pressed]}
                onPress={() => triggerHaptic()}
                accessibilityLabel="Filter"
              >
                <SlidersHorizontal size={18} color="#1F2937" strokeWidth={2.2} />
              </Pressable>
            </View>
          </View>

          {/* ─── Search Bar (Placeholder Left, Magnifier Right as in Poster) ─── */}
          <Pressable
            style={({ pressed }) => [styles.searchBar, pressed && styles.pressed]}
            onPress={() => {
              triggerHaptic();
              router.push('/route-planner' as any);
            }}
          >
            <Text style={styles.searchPlaceholder}>{t('home.whereToGo')}</Text>
            <Search size={20} color="#1F2937" strokeWidth={2.2} />
          </Pressable>

          {/* ─── Live Bus Tracking Card (Single Continuous Panoramic Illustration) ─── */}
          <View style={styles.bannerShadow}>
            <ImageBackground
              source={require('@/assets/images/live_tracking_banner_background.png')}
              style={styles.bannerCard}
              imageStyle={styles.bannerImage}
              resizeMode="cover"
            >
              {/* Soft text protection overlay on left for optimal legibility */}
              <LinearGradient
                colors={['rgba(20, 80, 30, 0.7)', 'rgba(20, 80, 30, 0.35)', 'transparent']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 0.65, y: 0.5 }}
                style={styles.textProtectionGradient}
                pointerEvents="none"
              />

              {/* Text Content and Track Now Button on the Left */}
              <View style={styles.bannerLeft}>
                <Text style={styles.bannerTitle}>{t('home.liveBusTracking')}</Text>
                <Text style={styles.bannerSubtitle}>{t('home.trackRealtime')}</Text>

                <Pressable
                  style={({ pressed }) => [styles.trackNowBtn, pressed && styles.trackNowBtnPressed]}
                  onPress={() => {
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
                    router.push('/(tabs)/live');
                  }}
                  accessibilityLabel={t('home.trackNow')}
                  accessibilityRole="button"
                >
                  <Text style={styles.trackNowText}>{t('home.trackNow')}</Text>
                  <ArrowRight size={14} color="#1E732B" strokeWidth={2.6} />
                </Pressable>
              </View>
            </ImageBackground>
          </View>

          {/* ─── Quick Actions (2x2 Grid) ─── */}
          <View style={styles.gridContainer}>
            {/* 1. Arrival */}
            <Pressable
              style={({ pressed }) => [styles.gridCard, pressed && styles.pressedCard]}
              onPress={() => {
                triggerHaptic();
                router.push({ pathname: '/arrivals' as any, params: { tab: 'arrival' } });
              }}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
                <Bus size={22} color="#2E7D32" strokeWidth={2.2} />
              </View>
              <Text style={styles.gridTitle}>{t('home.arrival')}</Text>
              <Text style={styles.gridSubtitle}>{t('home.seeArriving')}</Text>
            </Pressable>

            {/* 2. Departure */}
            <Pressable
              style={({ pressed }) => [styles.gridCard, pressed && styles.pressedCard]}
              onPress={() => {
                triggerHaptic();
                router.push({ pathname: '/arrivals' as any, params: { tab: 'departure' } });
              }}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#FFF3E0' }]}>
                <Bus size={22} color="#F57C00" strokeWidth={2.2} />
              </View>
              <Text style={styles.gridTitle}>{t('home.departure')}</Text>
              <Text style={styles.gridSubtitle}>{t('home.seeUpcoming')}</Text>
            </Pressable>

            {/* 3. Route Planner (Full-width card reflowing row 2) */}
            <Pressable
              style={({ pressed }) => [styles.gridCardFull, pressed && styles.pressedCard]}
              onPress={() => {
                triggerHaptic();
                router.push('/route-planner' as any);
              }}
            >
              <View style={[styles.iconCircleRow, { backgroundColor: '#E8F5E9' }]}>
                <RouteIcon size={22} color="#2E7D32" strokeWidth={2.2} />
              </View>
              <View style={styles.gridCardFullText}>
                <Text style={styles.gridTitle}>{t('home.routePlanner')}</Text>
                <Text style={styles.gridSubtitle}>{t('home.planJourney')}</Text>
              </View>
              <ChevronRight size={18} color="#9E9E9E" strokeWidth={2.2} />
            </Pressable>
          </View>

          {/* ─── Quick Info / Nearest Bus Stop (Screen 5) ─── */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t('home.quickInfo')}</Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.nearestCard, pressed && styles.pressedCard]}
            onPress={() => {
              triggerHaptic();
              router.push({ pathname: '/arrivals' as any, params: { tab: 'arrival' } });
            }}
          >
            <View style={styles.nearestInfo}>
              <Text style={styles.stopLabel}>{t('home.nearestStop')}</Text>
              <Text style={styles.stopName}>KLE College Stop</Text>
              <Text style={styles.stopMeta}>{t('home.minWalk')}</Text>
            </View>

            {/* Supplied Location Pin Graphic from poster */}
            <Image
              source={require('@/assets/images/illustrations/location_asset.png')}
              style={styles.locationPinImage}
              resizeMode="contain"
            />
          </Pressable>

          {/* ─── Bus Details Clickable Card inside Quick Info ─── */}
          <Pressable
            style={({ pressed }) => [styles.quickInfoCard, pressed && styles.quickInfoCardPressed]}
            onPress={() => {
              triggerHaptic();
              router.push('/bus-details' as any);
            }}
            accessibilityLabel={`${t('home.busDetails')} - ${t('home.viewBusRoutes')}`}
            accessibilityRole="button"
          >
            <View style={styles.quickInfoLeft}>
              <View style={styles.quickInfoIconBox}>
                <Bus size={22} color="#15803D" strokeWidth={2.2} />
              </View>
              <View style={styles.quickInfoTextBox}>
                <Text style={styles.quickInfoTitle}>{t('home.busDetails')}</Text>
                <Text style={styles.quickInfoSubtitle}>{t('home.viewBusRoutes')}</Text>
              </View>
            </View>
            <ChevronRight size={20} color="#94A3B8" strokeWidth={2.4} />
          </Pressable>

          {/* ─── Route Map Clickable Card inside Quick Info (Requirement) ─── */}
          <Pressable
            style={({ pressed }) => [styles.quickInfoCard, pressed && styles.quickInfoCardPressed]}
            onPress={() => {
              triggerHaptic();
              router.push('/route-map' as any);
            }}
            accessibilityLabel={`${t('home.routeMap')} - ${t('home.viewAllStops')}`}
            accessibilityRole="button"
          >
            <View style={styles.quickInfoLeft}>
              <View style={[styles.quickInfoIconBox, { backgroundColor: '#EFF6FF' }]}>
                <Map size={22} color="#1D4ED8" strokeWidth={2.2} />
              </View>
              <View style={styles.quickInfoTextBox}>
                <Text style={styles.quickInfoTitle}>{t('home.routeMap')}</Text>
                <Text style={styles.quickInfoSubtitle}>{t('home.viewAllStops')}</Text>
              </View>
            </View>
            <ChevronRight size={20} color="#94A3B8" strokeWidth={2.4} />
          </Pressable>
        </Animated.View>
      </Animated.ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.base,
  },
  greetingContainer: {
    flex: 1,
  },
  greetingPrefix: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: '#757575',
    marginBottom: 1,
  },
  greetingName: {
    fontSize: 22,
    fontFamily: FontFamily.bold,
    color: '#1F2937',
    fontWeight: '700',
  },
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.low,
    position: 'relative',
  },
  bellDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F57C00',
    position: 'absolute',
    top: 9,
    right: 10,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.base,
    paddingVertical: 13,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: '#EFF1F3',
    ...Shadows.low,
  },
  searchPlaceholder: {
    fontSize: 14,
    fontFamily: FontFamily.medium,
    color: '#9E9E9E',
  },
  bannerShadow: {
    borderRadius: 22,
    marginBottom: Spacing.lg,
    ...Shadows.medium,
  },
  bannerCard: {
    borderRadius: 22,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    minHeight: 148,
    position: 'relative',
    backgroundColor: '#1E732B',
  },
  bannerImage: {
    borderRadius: 22,
  },
  textProtectionGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
  },
  bannerLeft: {
    paddingLeft: 6,
    paddingRight: 6,
    zIndex: 10,
    maxWidth: '52%',
  },
  bannerTitle: {
    fontSize: 19,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  bannerSubtitle: {
    fontSize: 12.5,
    fontFamily: FontFamily.medium,
    color: 'rgba(255, 255, 255, 0.95)',
    marginBottom: Spacing.base,
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  trackNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    gap: 6,
    ...Shadows.low,
  },
  trackNowBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  trackNowText: {
    fontSize: 13.5,
    fontFamily: FontFamily.semiBold,
    fontWeight: '700',
    color: '#1E732B',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  gridCard: {
    width: GRID_ITEM_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: '#EFF1F3',
    ...Shadows.low,
  },
  gridCardFull: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: '#EFF1F3',
    ...Shadows.low,
    gap: Spacing.md,
  },
  gridCardFullText: {
    flex: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  iconCircleRow: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridTitle: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  gridSubtitle: {
    fontSize: 11,
    fontFamily: FontFamily.regular,
    color: '#757575',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#1F2937',
  },
  nearestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: '#EFF1F3',
    marginBottom: Spacing.base,
    ...Shadows.low,
  },
  nearestInfo: {
    flex: 1,
  },
  stopLabel: {
    fontSize: 11,
    fontFamily: FontFamily.regular,
    color: '#757575',
    marginBottom: 2,
  },
  stopName: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  stopMeta: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: '#9E9E9E',
  },
  pressed: {
    opacity: 0.85,
  },
  pressedCard: {
    transform: [{ scale: 0.985 }],
    opacity: 0.93,
  },
  liveBusImage: {
    width: 145,
    height: 80,
  },
  locationPinImage: {
    width: 38,
    height: 48,
  },
  busDetailsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: Spacing.base,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#EFF1F3',
    marginBottom: Spacing.base,
    ...Shadows.low,
  },
  quickInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: Spacing.base,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#EFF1F3',
    marginBottom: Spacing.sm,
    ...Shadows.low,
  },
  quickInfoCardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  quickInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  quickInfoIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickInfoTextBox: {
    flex: 1,
  },
  quickInfoTitle: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  quickInfoSubtitle: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: '#6B7280',
  },
});
