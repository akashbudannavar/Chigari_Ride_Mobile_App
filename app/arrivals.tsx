import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  TextInput,
  Platform,
  Dimensions,
  Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Bus,
  Clock,
  MapPin,
  Search,
  Navigation2,
  ChevronRight,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react-native';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/ui/Text';
import { Colors, FontFamily, Spacing, Radius, Shadows } from '@/constants/theme';
import { useLanguage } from '@/contexts/LanguageContext';

interface ArrivingBus {
  id: string;
  plate: string;
  routeNumber: string;
  destination: string;
  platform: string;
  etaMinutes: number;
  status: 'On Time' | 'Delayed' | 'Boarding';
  delay?: number;
}

interface DepartingBus {
  id: string;
  plate: string;
  routeNumber: string;
  destination: string;
  platform: string;
  departureTime: string;
  departsInMinutes: number;
  status: 'On Schedule' | 'Boarding Soon' | 'Delayed';
}

const ARRIVALS_DATA: ArrivingBus[] = [
  {
    id: 'arr-1',
    plate: 'Bus 200A',
    routeNumber: '200A',
    destination: 'Route 200A - Hubballi CBT to Dharwad BRTS',
    platform: 'Platform 2',
    etaMinutes: 2,
    status: 'On Time',
  },
  {
    id: 'arr-2',
    plate: 'Bus 201B',
    routeNumber: '201B',
    destination: 'Route 201B - Dharwad CBT to Hubballi Railway Station',
    platform: 'Platform 1',
    etaMinutes: 5,
    status: 'On Time',
  },
  {
    id: 'arr-3',
    plate: 'Bus 100D',
    routeNumber: '100D',
    destination: 'Route 100D - Hubballi CBT to Dharwad (Express)',
    platform: 'Platform 3',
    etaMinutes: 8,
    status: 'On Time',
  },
  {
    id: 'arr-4',
    plate: 'Bus 202C',
    routeNumber: '202C',
    destination: 'Route 202C - Hubballi CBT to Navanagar',
    platform: 'Platform 2',
    etaMinutes: 12,
    status: 'On Time',
  },
];

const DEPARTURES_DATA: DepartingBus[] = [
  {
    id: 'dep-1',
    plate: 'Bus 200A',
    routeNumber: '200A',
    destination: 'Route 200A - Hubballi CBT to Dharwad BRTS',
    platform: 'Platform 2',
    departureTime: '10:30 AM',
    departsInMinutes: 5,
    status: 'On Schedule',
  },
  {
    id: 'dep-2',
    plate: 'Bus 201B',
    routeNumber: '201B',
    destination: 'Route 201B - Dharwad CBT to Hubballi Railway Station',
    platform: 'Platform 1',
    departureTime: '10:45 AM',
    departsInMinutes: 20,
    status: 'On Schedule',
  },
  {
    id: 'dep-3',
    plate: 'Bus 100D',
    routeNumber: '100D',
    destination: 'Route 100D - Hubballi CBT to Dharwad (Express)',
    platform: 'Platform 3',
    departureTime: '11:00 AM',
    departsInMinutes: 35,
    status: 'On Schedule',
  },
  {
    id: 'dep-4',
    plate: 'Bus 202C',
    routeNumber: '202C',
    destination: 'Route 202C - Hubballi CBT to Navanagar',
    platform: 'Platform 2',
    departureTime: '11:15 AM',
    departsInMinutes: 50,
    status: 'On Schedule',
  },
];

export default function ArrivalsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<'arrival' | 'departure'>(
    params.tab === 'departure' ? 'departure' : 'arrival',
  );
  const [currentStop, setCurrentStop] = useState('KLE College Stop');
  const [searchQuery, setSearchQuery] = useState('');

  const triggerHaptic = (style = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(style);
  };

  const handleBack = () => {
    triggerHaptic();
    router.back();
  };

  const handleTabChange = (tab: 'arrival' | 'departure') => {
    triggerHaptic();
    setActiveTab(tab);
    setSearchQuery('');
  };

  const filteredArrivals = ARRIVALS_DATA.filter(
    (b) =>
      b.routeNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.plate.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredDepartures = DEPARTURES_DATA.filter(
    (b) =>
      b.routeNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.plate.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Screen backgroundColor={Colors.background} safeAreaTop={false} safeAreaBottom={false}>
      {/* ─── Top Header Bar ─── */}
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          onPress={handleBack}
          accessibilityLabel={t('common.back')}
        >
          <ArrowLeft size={22} color={Colors.textPrimary} strokeWidth={2.4} />
        </Pressable>

        <Text style={styles.screenTitle}>
          {activeTab === 'arrival' ? t('home.arrival') : t('home.departure')}
        </Text>

        <Pressable
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          onPress={() => triggerHaptic()}
          accessibilityLabel="Refresh"
        >
          <RefreshCw size={19} color={Colors.textPrimary} strokeWidth={2.2} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Selected Bus Stop Card ─── */}
        <View style={styles.stopSelectorCard}>
          <View style={styles.stopIconCircle}>
            <MapPin size={20} color="#E53935" strokeWidth={2.4} />
          </View>
          <View style={styles.stopInfo}>
            <Text style={styles.stopLabel}>{t('home.nearestStop')}</Text>
            <Text style={styles.stopTitle}>{currentStop}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.trackMapBtn, pressed && styles.pressed]}
            onPress={() => {
              triggerHaptic();
              router.push('/(tabs)/live');
            }}
          >
            <Navigation2 size={14} color={Colors.primary} strokeWidth={2.4} />
            <Text style={styles.trackMapText}>Map</Text>
          </Pressable>
        </View>

        {/* ─── Segmented Toggle: [ Arrivals | Departures ] ─── */}
        <View style={styles.toggleContainer}>
          <Pressable
            style={[
              styles.toggleTab,
              activeTab === 'arrival' && styles.toggleTabActiveArrival,
            ]}
            onPress={() => handleTabChange('arrival')}
          >
            <Bus
              size={18}
              color={activeTab === 'arrival' ? Colors.surface : Colors.textSecondary}
              strokeWidth={2.2}
            />
            <Text
              style={[
                styles.toggleText,
                activeTab === 'arrival' && styles.toggleTextActive,
              ]}
            >
              {t('home.arrival')}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.toggleTab,
              activeTab === 'departure' && styles.toggleTabActiveDeparture,
            ]}
            onPress={() => handleTabChange('departure')}
          >
            <Clock
              size={18}
              color={activeTab === 'departure' ? Colors.surface : Colors.textSecondary}
              strokeWidth={2.2}
            />
            <Text
              style={[
                styles.toggleText,
                activeTab === 'departure' && styles.toggleTextActive,
              ]}
            >
              {t('home.departure')}
            </Text>
          </Pressable>
        </View>

        {/* ─── Search input ─── */}
        <View style={styles.searchBox}>
          <Search size={18} color={Colors.textTertiary} strokeWidth={2.2} />
          <TextInput
            style={styles.searchInput}
            placeholder={
              activeTab === 'arrival'
                ? 'Search arriving bus or route...'
                : 'Search departing bus or route...'
            }
            placeholderTextColor={Colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* ─── Content List ─── */}
        {activeTab === 'arrival' ? (
          <View style={styles.listContainer}>
            <View style={styles.listHeaderRow}>
              <Text style={styles.listSectionTitle}>Arriving Buses</Text>
              <Text style={styles.liveIndicator}>● Live updates</Text>
            </View>

            {filteredArrivals.map((bus) => (
              <Pressable
                key={bus.id}
                style={({ pressed }) => [styles.busCard, pressed && styles.cardPressed]}
                onPress={() => {
                  triggerHaptic();
                  router.push('/(tabs)/live');
                }}
              >
                <View style={styles.arrivalCardTop}>
                  <View style={styles.busIconBgGreen}>
                    <Image
                      source={require('@/assets/images/illustrations/bus_asset.png')}
                      style={styles.busCardAsset}
                      resizeMode="contain"
                    />
                  </View>

                  <View style={styles.busMainDetails}>
                    <View style={styles.busBadgeRow}>
                      <View style={styles.routeBadgeGreen}>
                        <Text style={styles.routeBadgeText}>Route {bus.routeNumber}</Text>
                      </View>
                      <Text style={styles.plateText}>{bus.plate}</Text>
                    </View>
                    <Text style={styles.destinationText}>{bus.destination}</Text>
                    <Text style={styles.platformText}>{bus.platform}</Text>
                  </View>

                  <View style={styles.etaContainer}>
                    <Text style={styles.etaMinutes}>
                      {bus.etaMinutes} <Text style={styles.etaUnit}>min</Text>
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        bus.status === 'Delayed'
                          ? styles.statusBadgeDelayed
                          : styles.statusBadgeGreen,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          bus.status === 'Delayed'
                            ? styles.statusTextDelayed
                            : styles.statusTextGreen,
                        ]}
                      >
                        {bus.delay ? `Delayed ${bus.delay}m` : bus.status}
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.listContainer}>
            <View style={styles.listHeaderRow}>
              <Text style={styles.listSectionTitle}>Upcoming Departures</Text>
              <Text style={styles.scheduledIndicator}>Platform Schedules</Text>
            </View>

            {filteredDepartures.map((bus) => (
              <Pressable
                key={bus.id}
                style={({ pressed }) => [styles.busCard, pressed && styles.cardPressed]}
                onPress={() => {
                  triggerHaptic();
                  router.push('/(tabs)/live');
                }}
              >
                <View style={styles.departureCardTop}>
                  <View style={styles.departureTimeBox}>
                    <Text style={styles.departureTimeText}>{bus.departureTime}</Text>
                    <Text style={styles.departureSubTime}>
                      in {bus.departsInMinutes}m
                    </Text>
                  </View>

                  <View style={styles.busMainDetails}>
                    <View style={styles.busBadgeRow}>
                      <View style={styles.routeBadgeOrange}>
                        <Text style={styles.routeBadgeTextOrange}>Route {bus.routeNumber}</Text>
                      </View>
                      <Text style={styles.plateText}>{bus.plate}</Text>
                    </View>
                    <Text style={styles.destinationText}>{bus.destination}</Text>
                    <Text style={styles.platformTextOrange}>{bus.platform}</Text>
                  </View>

                  <View style={styles.departureRight}>
                    <View style={styles.chevronSmall}>
                      <ChevronRight size={18} color={Colors.textTertiary} strokeWidth={2.4} />
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}
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
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: Radius.circle,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.low,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  stopSelectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: '#EFF1F3',
    marginBottom: Spacing.base,
    ...Shadows.low,
    gap: Spacing.md,
  },
  stopIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopInfo: {
    flex: 1,
  },
  stopLabel: {
    fontSize: 11,
    fontFamily: FontFamily.medium,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  stopTitle: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  trackMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    gap: 4,
  },
  trackMapText: {
    fontSize: 12,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.primary,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#EEF2F6',
    borderRadius: Radius.pill,
    padding: 4,
    marginBottom: Spacing.base,
  },
  toggleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: Radius.pill,
    gap: 7,
  },
  toggleTabActiveArrival: {
    backgroundColor: '#2E7D32',
    ...Shadows.low,
  },
  toggleTabActiveDeparture: {
    backgroundColor: '#F57C00',
    ...Shadows.low,
  },
  toggleText: {
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  toggleTextActive: {
    color: Colors.surface,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.base,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#E8ECF0',
    marginBottom: Spacing.base,
    gap: Spacing.sm,
    ...Shadows.low,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  listContainer: {
    gap: Spacing.md,
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  listSectionTitle: {
    fontSize: 16,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  liveIndicator: {
    fontSize: 12,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: '#2E7D32',
  },
  scheduledIndicator: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    color: Colors.textTertiary,
  },
  busCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: '#EFF1F3',
    ...Shadows.low,
  },
  arrivalCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  busIconBgGreen: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  busCardAsset: {
    width: 30,
    height: 32,
  },
  busMainDetails: {
    flex: 1,
  },
  busBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  routeBadgeGreen: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  routeBadgeText: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#2E7D32',
  },
  plateText: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  destinationText: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  platformText: {
    fontSize: 11,
    fontFamily: FontFamily.medium,
    color: Colors.textTertiary,
  },
  etaContainer: {
    alignItems: 'flex-end',
  },
  etaMinutes: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 4,
  },
  etaUnit: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: '#2E7D32',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  statusBadgeGreen: {
    backgroundColor: '#E8F5E9',
  },
  statusBadgeDelayed: {
    backgroundColor: '#FFF3E0',
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
  },
  statusTextGreen: {
    color: '#2E7D32',
  },
  statusTextDelayed: {
    color: '#F57C00',
  },
  departureCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  departureTimeBox: {
    backgroundColor: '#FFF3E0',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  departureTimeText: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#F57C00',
  },
  departureSubTime: {
    fontSize: 10,
    fontFamily: FontFamily.medium,
    color: '#E65100',
    marginTop: 2,
  },
  routeBadgeOrange: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  routeBadgeTextOrange: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#F57C00',
  },
  platformTextOrange: {
    fontSize: 11,
    fontFamily: FontFamily.medium,
    color: '#F57C00',
  },
  departureRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronSmall: {
    width: 28,
    height: 28,
    borderRadius: Radius.circle,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  cardPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.92,
  },
});
