import React, { useState } from 'react';
import { StyleSheet, View, Image, Pressable, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  Navigation,
  Gauge,
  Users,
  Heart,
  Crosshair,
  ArrowRightLeft,
  CheckCircle2,
} from 'lucide-react-native';
import type { ChigariBus } from '@/types/transit';
import { Text } from '@/components/ui/Text';
import { Colors, FontFamily, Spacing, Radius, Shadows } from '@/constants/theme';
import { useLanguage } from '@/contexts/LanguageContext';

interface BusDetailsCardProps {
  bus: ChigariBus;
  onCenterOnBus: () => void;
}

export const BusDetailsCard: React.FC<BusDetailsCardProps> = ({ bus, onCenterOnBus }) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const { t } = useLanguage();

  const triggerHaptic = (style = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(style);
    }
  };

  const formattedDistance =
    bus.distanceToNextStop < 1000
      ? t('liveTracking.awayMeters', { distance: bus.distanceToNextStop })
      : t('liveTracking.awayKm', { distance: (bus.distanceToNextStop / 1000).toFixed(1) });

  return (
    <View style={styles.cardContainer}>
      {/* ─── Top Header: Bus Badge, Number & Direction ─── */}
      <View style={styles.headerRow}>
        {/* Green Bus Icon Badge */}
        <View style={styles.busIconBadge}>
          <Image
            source={require('@/assets/images/illustrations/bus_asset.png')}
            style={styles.busIconImage}
            resizeMode="contain"
          />
        </View>

        {/* Bus Info Column */}
        <View style={styles.busInfoCol}>
          <View style={styles.busNumberRow}>
            <View style={styles.busNumberPill}>
              <Text style={styles.busNumberPillText}>{`${t('common.bus')} ${bus.busNumber}`}</Text>
            </View>
            <View style={styles.statusLivePill}>
              <View style={styles.statusLiveDot} />
              <Text style={styles.statusLiveText}>{t('liveTracking.liveCorridorGps')}</Text>
            </View>
          </View>

          {/* Direction indicator */}
          <View style={styles.directionRow}>
            <ArrowRightLeft size={13} color="#2E7D32" strokeWidth={2.4} />
            <Text style={styles.directionText} numberOfLines={1}>
              {bus.direction}
            </Text>
          </View>
        </View>

        {/* Action icons: Center & Favorite */}
        <View style={styles.headerActions}>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
            onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
              onCenterOnBus();
            }}
            accessibilityLabel={t('liveTracking.centerOnBus')}
          >
            <Crosshair size={18} color={Colors.primary} strokeWidth={2.4} />
          </Pressable>

          <Pressable
            style={[styles.actionBtn, isFavorite && styles.actionBtnActive]}
            onPress={() => {
              triggerHaptic();
              setIsFavorite(!isFavorite);
            }}
            accessibilityLabel="Favorite"
          >
            <Heart
              size={18}
              color={isFavorite ? '#E53935' : '#64748B'}
              fill={isFavorite ? '#E53935' : 'transparent'}
              strokeWidth={2}
            />
          </Pressable>
        </View>
      </View>

      {/* ─── Middle Section: Next Station & ETA Countdown ─── */}
      <View style={styles.stationEtaBox}>
        <View style={styles.nextStationRow}>
          <Navigation size={15} color="#2E7D32" strokeWidth={2.4} />
          <Text style={styles.nextStationLabel} numberOfLines={2}>
            {t('liveTracking.nextStation')}{' '}
            <Text style={styles.nextStationName}>{bus.nextStop.name}</Text>
          </Text>
        </View>

        <View style={styles.etaDistanceRow}>
          <View style={styles.etaBadge}>
            <Text style={styles.etaBadgeLabel} numberOfLines={1}>{t('liveTracking.eta')}</Text>
            <Text style={styles.etaBadgeValue} numberOfLines={1}>{bus.etaMinutes} {t('common.min')}</Text>
          </View>
          <View style={styles.dividerDot} />
          <Text style={styles.distanceText} numberOfLines={1}>{formattedDistance}</Text>
        </View>
      </View>

      {/* ─── Bottom Metrics: Real Speed & Crowd Level ─── */}
      <View style={styles.metricsRow}>
        {/* Speed */}
        <View style={styles.metricCard}>
          <Gauge size={14} color="#2E7D32" strokeWidth={2.2} />
          <Text style={styles.metricTitle} numberOfLines={1}>{t('liveTracking.speed')}</Text>
          <Text style={styles.metricSpeedValue} numberOfLines={1}>{bus.speed} km/h</Text>
        </View>

        {/* Crowd */}
        <View style={styles.metricCard}>
          <Users size={14} color="#F57C00" strokeWidth={2.2} />
          <Text style={styles.metricTitle} numberOfLines={1}>{t('liveTracking.crowd')}</Text>
          <Text
            numberOfLines={1}
            style={[
              styles.metricCrowdValue,
              bus.crowd === 'Low' && { color: '#2E7D32' },
              bus.crowd === 'Moderate' && { color: '#F57C00' },
              bus.crowd === 'High' && { color: '#D32F2F' },
            ]}
          >
            {bus.crowd === 'Low'
              ? t('liveTracking.low')
              : bus.crowd === 'Moderate'
              ? t('liveTracking.moderate')
              : t('liveTracking.high')}
          </Text>
        </View>

        {/* Route status */}
        <View style={styles.metricCard}>
          <CheckCircle2 size={14} color="#1565C0" strokeWidth={2.2} />
          <Text style={styles.metricStatusValue} numberOfLines={1}>{t('liveTracking.brtsDedicated')}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.card,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadows.high,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  busIconBadge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#C8E6C9',
  },
  busIconImage: {
    width: 28,
    height: 28,
  },
  busInfoCol: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  busNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  busNumberPill: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  busNumberPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  statusLivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  statusLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
    marginRight: 4,
  },
  statusLiveText: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    color: '#475569',
  },
  directionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 4,
  },
  directionText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: '#1E293B',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionBtnPressed: {
    backgroundColor: '#EEF2F6',
    transform: [{ scale: 0.95 }],
  },
  actionBtnActive: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FFCDD2',
  },
  stationEtaBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.button,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  nextStationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  nextStationLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: '#64748B',
  },
  nextStationName: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: '#0F172A',
  },
  etaDistanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    gap: 4,
  },
  etaBadgeLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: '#1B5E20',
  },
  etaBadgeValue: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: '#2E7D32',
  },
  dividerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 8,
  },
  distanceText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: '#475569',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  metricCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: Radius.md,
    gap: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  metricTitle: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: '#64748B',
  },
  metricSpeedValue: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: '#2E7D32',
  },
  metricCrowdValue: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: '#F57C00',
  },
  metricStatusValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
    color: '#1565C0',
  },
});

export default BusDetailsCard;
