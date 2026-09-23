import React from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Bus,
  ArrowDown,
} from 'lucide-react-native';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/ui/Text';
import { Colors, FontFamily, Spacing, Radius, Shadows } from '@/constants/theme';
import { useLanguage } from '@/contexts/LanguageContext';

export interface ChigariBusRoute {
  busNumber: string;
  fromStation: string;
  toStation: string;
}

export const CHIGARI_BUS_ROUTES: ChigariBusRoute[] = [
  {
    busNumber: '200A',
    fromStation: 'CBT BRTS Hubli',
    toStation: 'Dharwad BRTS Terminal',
  },
  {
    busNumber: '201B',
    fromStation: 'SSS Hubballi Junction Railway Station',
    toStation: 'Dharwad New Bus Station',
  },
  {
    busNumber: '100D',
    fromStation: 'SSS Hubballi Junction Railway Station',
    toStation: 'Dharwad New Bus Station',
  },
  {
    busNumber: '202C',
    fromStation: 'Hubballi Gokul Bus Station',
    toStation: 'Dharwad BRTS Terminal',
  },
];

export default function BusDetailsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const triggerHaptic = (style = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(style);
    }
  };

  const handleBack = () => {
    triggerHaptic();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <Screen backgroundColor={Colors.background} safeAreaTop={false} safeAreaBottom={false}>
      {/* ─── Top Header Bar ─── */}
      <View style={[styles.headerBar, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          onPress={handleBack}
          accessibilityLabel="Back"
          accessibilityRole="button"
        >
          <ArrowLeft size={22} color={Colors.textPrimary} strokeWidth={2.4} />
        </Pressable>

        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>{t('busDetails.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('busDetails.subtitle')}</Text>
        </View>

        <View style={styles.headerPlaceholder} />
      </View>

      {/* ─── Scrollable Bus Cards List ─── */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionHeaderNote}>
          {t('busDetails.corridorNote')}
        </Text>

        {CHIGARI_BUS_ROUTES.map((bus) => (
          <View key={bus.busNumber} style={styles.busCard}>
            {/* Top Bus Number Accent Badge */}
            <View style={styles.cardHeaderRow}>
              <View style={styles.busBadgeContainer}>
                <View style={styles.busIconCircle}>
                  <Bus size={18} color="#15803D" strokeWidth={2.2} />
                </View>
                <Text style={styles.busNumberText}>{bus.busNumber}</Text>
              </View>
            </View>

            {/* Subtle Divider */}
            <View style={styles.cardDivider} />

            {/* From ➔ To Visual Route Flow */}
            <View style={styles.routePathContainer}>
              {/* FROM Station */}
              <View style={styles.stationBlock}>
                <View style={styles.stationIndicatorCol}>
                  <View style={styles.originDot} />
                </View>
                <View style={styles.stationDetails}>
                  <Text style={styles.stationDirectionLabel}>{t('busDetails.from')}</Text>
                  <Text style={styles.stationNameText}>
                    {bus.fromStation}
                  </Text>
                </View>
              </View>

              {/* Vertical Directional Indicator (Down Arrow) */}
              <View style={styles.connectorRow}>
                <View style={styles.connectorLineCol}>
                  <View style={styles.connectorLine} />
                  <View style={styles.arrowIconCircle}>
                    <ArrowDown size={14} color="#15803D" strokeWidth={2.6} />
                  </View>
                  <View style={styles.connectorLine} />
                </View>
              </View>

              {/* TO Station */}
              <View style={styles.stationBlock}>
                <View style={styles.stationIndicatorCol}>
                  <View style={styles.destinationDot} />
                </View>
                <View style={styles.stationDetails}>
                  <Text style={styles.stationDirectionLabel}>{t('busDetails.to')}</Text>
                  <Text style={styles.stationNameText}>
                    {bus.toStation}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.low,
  },
  headerTitles: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: FontFamily.semiBold,
    color: '#15803D',
    marginTop: 1,
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  sectionHeaderNote: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 2,
    paddingHorizontal: 2,
  },
  busCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: Spacing.lg,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    ...Shadows.low,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  busBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  busIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  busNumberText: {
    fontSize: 24,
    fontFamily: FontFamily.bold,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: Spacing.md,
  },
  routePathContainer: {
    paddingLeft: 2,
  },
  stationBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stationIndicatorCol: {
    width: 24,
    alignItems: 'center',
    paddingTop: 4,
  },
  originDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#15803D',
    borderWidth: 2.5,
    borderColor: '#DCFCE7',
  },
  destinationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0F172A',
    borderWidth: 2.5,
    borderColor: '#CBD5E1',
  },
  stationDetails: {
    flex: 1,
  },
  stationDirectionLabel: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  stationNameText: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: '#0F172A',
    lineHeight: 22,
  },
  connectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  connectorLineCol: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectorLine: {
    width: 2,
    height: 8,
    backgroundColor: '#E2E8F0',
  },
  arrowIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    marginVertical: 2,
  },
  pressed: {
    opacity: 0.75,
  },
});
