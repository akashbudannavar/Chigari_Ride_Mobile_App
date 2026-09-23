import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  ArrowUpDown,
  Route as RouteIcon,
  AlertCircle,
} from 'lucide-react-native';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/ui/Text';
import { Colors, FontFamily, Spacing, Radius, Shadows } from '@/constants/theme';
import { useRoutePlanner } from '@/hooks/useRoutePlanner';
import { useLanguage } from '@/contexts/LanguageContext';
import { StopSearchInput } from '@/components/StopSearchInput';
import { StopSuggestionList } from '@/components/StopSuggestionList';
import { LastRouteCard } from '@/components/LastRouteCard';
import { SuggestedRouteCard, SuggestedRouteOption } from '@/components/SuggestedRouteCard';

const CORRIDOR_SUGGESTED_ROUTES: SuggestedRouteOption[] = [
  {
    id: 'suggested-200a',
    routeNumber: '200A',
    routeName: 'Hubballi CBT ➔ Dharwad BRTS Terminal',
    durationMinutes: 36,
    fare: 30,
    nextBusMinutes: 3,
    type: 'Direct',
    stops: ['Hubballi CBT', 'Court Circle', 'Hosur Cross', 'Vidyanagar', 'BVB / KLE Tech', 'Navanagar', 'Dharwad BRTS Terminal'],
    crowdLevel: 'Moderate',
  },
  {
    id: 'suggested-100d',
    routeNumber: '100D',
    routeName: 'Hubballi CBT ➔ Dharwad BRTS Terminal',
    durationMinutes: 38,
    fare: 30,
    nextBusMinutes: 7,
    type: 'Direct',
    stops: ['Hubballi CBT', 'Deshpande Nagar', 'Shirur Park', 'KIMS Hospital', 'Unkal Lake', 'Rayapur', 'Dharwad BRTS Terminal'],
    crowdLevel: 'Low',
  },
  {
    id: 'suggested-201b',
    routeNumber: '201B',
    routeName: 'Hubballi CBT ➔ Dharwad BRTS (Express)',
    durationMinutes: 31,
    fare: 35,
    nextBusMinutes: 12,
    type: 'Express',
    stops: ['Hubballi CBT', 'Hosur Cross', 'BVB / KLE Tech', 'Navanagar', 'Sattur', 'Vidyagiri', 'Dharwad BRTS Terminal'],
    crowdLevel: 'Moderate',
  },
];

export default function RoutePlannerScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [selectedSuggestedId, setSelectedSuggestedId] = useState<string>('suggested-200a');

  const {
    fromSearch,
    toSearch,
    lastRoute,
    errorMessage,
    clearError,
    swapStops,
    searchRoute,
  } = useRoutePlanner();

  const triggerHaptic = (style = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(style);
  };

  const handleSwap = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    swapStops();
  };

  const handleSearch = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    Keyboard.dismiss();
    await searchRoute();
  };

  const handleViewLastRoute = () => {
    if (!lastRoute) return;
    router.push({
      pathname: '/route-details',
      params: {
        fromId: lastRoute.fromStop.id,
        toId: lastRoute.toStop.id,
      },
    });
  };

  return (
    <Screen backgroundColor={Colors.background} safeAreaTop={false} safeAreaBottom={false}>
      {/* ─── Top Header Bar ─── */}
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          onPress={() => {
            triggerHaptic();
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)');
            }
          }}
          accessibilityLabel={t('common.back')}
        >
          <ArrowLeft size={22} color={Colors.textPrimary} strokeWidth={2.4} />
        </Pressable>

        <Text style={styles.screenTitle}>{t('home.routePlanner')}</Text>

        <View style={styles.placeholderBtn} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 60 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── Error Alert Banner (if validation fails) ─── */}
        {errorMessage && (
          <Pressable style={styles.errorBanner} onPress={clearError}>
            <AlertCircle size={17} color="#DC2626" strokeWidth={2.2} />
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </Pressable>
        )}

        {/* ─── Origin / Destination Card with Live Stop Suggestions ─── */}
        <View style={styles.locationCardContainer}>
          <View style={styles.locationCard}>
            <View style={styles.inputsColumn}>
              {/* From Input */}
              <StopSearchInput
                label="From"
                query={fromSearch.query}
                placeholder="Search starting BRTS stop (e.g. CBT, Vidyanagar)..."
                onQueryChange={(text) => {
                  clearError();
                  fromSearch.handleQueryChange(text);
                }}
                onClear={() => fromSearch.clear()}
                iconType="origin"
              />

              {/* Connecting Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.verticalDottedLine} />
              </View>

              {/* To Input */}
              <StopSearchInput
                label="To"
                query={toSearch.query}
                placeholder="Search destination BRTS stop (e.g. Dharwad, BVB)..."
                onQueryChange={(text) => {
                  clearError();
                  toSearch.handleQueryChange(text);
                }}
                onClear={() => toSearch.clear()}
                iconType="destination"
              />
            </View>

            {/* Functional Swap Button */}
            <Pressable
              style={({ pressed }) => [styles.swapBtn, pressed && styles.pressed]}
              onPress={handleSwap}
              accessibilityLabel="Swap origin and destination stops"
            >
              <ArrowUpDown size={18} color={Colors.primary} strokeWidth={2.4} />
            </Pressable>
          </View>

          {/* Floating Stop Suggestions for From Input */}
          <StopSuggestionList
            suggestions={fromSearch.suggestions}
            onSelectStop={(stop) => {
              fromSearch.selectStop(stop);
              clearError();
            }}
            visible={fromSearch.isOpen}
            topOffset={62}
          />

          {/* Floating Stop Suggestions for To Input */}
          <StopSuggestionList
            suggestions={toSearch.suggestions}
            onSelectStop={(stop) => {
              toSearch.selectStop(stop);
              clearError();
            }}
            visible={toSearch.isOpen}
            topOffset={136}
          />
        </View>

        {/* ─── Search Routes Action Button ─── */}
        <Pressable
          style={({ pressed }) => [styles.searchRoutesBtn, pressed && styles.searchBtnPressed]}
          onPress={handleSearch}
        >
          <RouteIcon size={19} color="#FFFFFF" strokeWidth={2.4} />
          <Text style={styles.searchRoutesText}>Search Route</Text>
        </Pressable>

        {/* ─── LAST ROUTE SECTION (Displayed Prominently ABOVE Suggested Routes) ─── */}
        {lastRoute && (
          <View style={styles.lastRouteSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Last Searched Route</Text>
              <Text style={styles.fastestIndicator}>Saved offline</Text>
            </View>

            <LastRouteCard route={lastRoute} onViewRoute={handleViewLastRoute} />
          </View>
        )}

        {/* ─── Suggested Corridor Routes ─── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Suggested Routes</Text>
          <Text style={styles.fastestIndicator}>Chigari Corridor</Text>
        </View>

        <View style={styles.routesList}>
          {CORRIDOR_SUGGESTED_ROUTES.map((route) => (
            <SuggestedRouteCard
              key={route.id}
              route={route}
              isSelected={selectedSuggestedId === route.id}
              onSelect={() => setSelectedSuggestedId(route.id)}
              onTrackBus={() => {
                triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/(tabs)/live');
              }}
            />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: Radius.circle,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.low,
  },
  screenTitle: {
    fontSize: 19,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  placeholderBtn: {
    width: 42,
    height: 42,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radius.button,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 8,
  },
  errorBannerText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: '#DC2626',
    flex: 1,
  },
  locationCardContainer: {
    position: 'relative',
    zIndex: 100,
    marginBottom: Spacing.base,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: '#EFF1F3',
    ...Shadows.low,
  },
  inputsColumn: {
    flex: 1,
  },
  dividerRow: {
    height: 18,
    justifyContent: 'center',
    marginLeft: 15,
  },
  verticalDottedLine: {
    width: 2,
    height: 14,
    backgroundColor: '#CBD5E1',
    borderRadius: 1,
  },
  swapBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
    borderWidth: 1.5,
    borderColor: '#C8E6C9',
  },
  searchRoutesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E7D32',
    height: 50,
    borderRadius: Radius.button,
    gap: 8,
    marginBottom: Spacing.lg,
    ...Shadows.medium,
  },
  searchBtnPressed: {
    backgroundColor: '#1B5E20',
    transform: [{ scale: 0.98 }],
  },
  searchRoutesText: {
    color: '#FFFFFF',
    fontFamily: FontFamily.bold,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  lastRouteSection: {
    marginBottom: Spacing.sm,
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
    color: Colors.textPrimary,
  },
  fastestIndicator: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: '#2E7D32',
  },
  routesList: {
    marginBottom: Spacing.xl,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
});
