import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Platform,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import QRCode from 'react-native-qrcode-svg';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  ArrowDown,
  ShieldCheck,
  Bus,
  QrCode,
  Sparkles,
  Navigation,
  Check,
  ChevronRight,
  RotateCcw,
} from 'lucide-react-native';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/ui/Text';
import { Colors, FontFamily, Spacing, Radius, Shadows } from '@/constants/theme';
import { useLanguage } from '@/contexts/LanguageContext';
import { useJourney } from '@/contexts/JourneyContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  getDigitalTickets,
  updateDigitalTicketStatus,
  digitalTicketToScannedTicket,
  type DigitalTicket,
} from '@/services/ticketHistory';
import {
  getAvailableServicesForJourney,
  type ChigariServiceDefinition,
} from '@/services/busAvailabilityService';
import { findStopByName, findStopById } from '@/data/chigariStops';
import { CHIGARI_VERIFIED_STOPS } from '@/data/chigariRoute';
import {
  buildSharedTicketPayload,
  isSharedTicketContract,
} from '@/services/sharedTicketContract';
import {
  getTicketJourneyRecord,
  type TicketJourneyRecord,
} from '@/services/ticketJourneyLifecycle';


export default function TicketDetailsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const { startJourney, enterBus: enterJourneyBus } = useJourney();
  const params = useLocalSearchParams<{ ticketJson?: string; id?: string }>();

  // Parse or retrieve ticket
  const initialTicket: DigitalTicket = useMemo(() => {
    if (params.ticketJson) {
      try {
        const parsed = JSON.parse(params.ticketJson);
        if (parsed && parsed.ticketId) {
          return parsed;
        }
      } catch (e) {
        console.warn('Failed to parse ticketJson in TicketDetails:', e);
      }
    }
    const now = new Date();
    const validUntilDate = new Date(now.getTime() + 4 * 3600000);
    const dateCode =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0');
    const ticketId = `CR-${dateCode}-776703`;
    const fromStationName = 'Hubballi Central Bus Terminal';
    const toStationName = 'Vidyanagar';
    const fare = 20.0;
    const issuedAt = now.toISOString();
    const validUntil = validUntilDate.toISOString();

    const qrPayload = buildSharedTicketPayload({
      ticketId,
      fromStationName,
      toStationName,
      fare,
      currency: 'INR',
      passengerDisplayName: profile?.full_name || user?.user_metadata?.full_name || 'Passenger',
      status: 'active',
      issuedAt,
      validUntil,
    });

    return {
      ticketId,
      fromStationId: 'hdbrts-stop-35',
      fromStationName,
      toStationId: 'hdbrts-stop-27',
      toStationName,
      fare,
      ticketType: 'Adult',
      issuedAt,
      validUntil,
      status: 'VALID',
      routeNumber: '200A',
      routeName: 'Chigari 200A Corridor',
      durationMinutes: 25,
      distanceKm: 9.8,
      qrPayload,
    };
  }, [params.ticketJson, profile?.full_name, user?.user_metadata?.full_name]);

  const [ticket, setTicket] = useState<DigitalTicket>(initialTicket);
  const [journeyRecord, setJourneyRecord] = useState<TicketJourneyRecord | null>(null);

  // If id was passed instead of ticketJson, fetch from storage
  useEffect(() => {
    if (!params.ticketJson && params.id) {
      getDigitalTickets().then((tickets) => {
        const found = tickets.find((t) => t.ticketId === params.id);
        if (found) setTicket(found);
      });
    }
  }, [params.id, params.ticketJson]);

  useEffect(() => {
    if (ticket.ticketId) {
      getTicketJourneyRecord(ticket.ticketId).then((rec) => {
        if (rec) setJourneyRecord(rec);
      });
    }
  }, [ticket.ticketId]);

  const effectiveJourneyState = journeyRecord?.state || ticket.journeyState || (ticket.status === 'EXPIRED' ? 'EXPIRED' : ticket.status === 'BOARDED' ? 'BOARDED' : ticket.status === 'EXITED' ? 'EXITED' : 'ACTIVE');
  const isBoarded = effectiveJourneyState === 'BOARDED';
  const isExited = effectiveJourneyState === 'EXITED';

  // Check validity
  const isExpired = useMemo(() => {
    if (effectiveJourneyState === 'EXPIRED' || ticket.status === 'EXPIRED') return true;
    const validD = new Date(ticket.validUntil);
    if (!isNaN(validD.getTime()) && validD.getTime() < Date.now() && ticket.status !== 'VALID' && ticket.status !== 'IN_JOURNEY') {
      return true;
    }
    return false;
  }, [effectiveJourneyState, ticket.status, ticket.validUntil]);

  const isInJourney = ticket.status === 'IN_JOURNEY';
  const isUsed = ticket.status === 'USED' || isExited;

  // Canonical Shared E-Ticket Contract v1 QR payload (always guaranteed complete & valid)
  const qrDataValue = useMemo(() => {
    if (isSharedTicketContract(ticket.qrPayload)) {
      return ticket.qrPayload!;
    }
    const passengerName = profile?.full_name || user?.user_metadata?.full_name || 'Passenger';
    const payload = buildSharedTicketPayload({
      ticketId: ticket.ticketId,
      fromStationName: ticket.fromStationName,
      toStationName: ticket.toStationName,
      fare: ticket.fare,
      currency: 'INR',
      passengerDisplayName: passengerName,
      status: isExpired
        ? 'expired'
        : isUsed
        ? 'used'
        : (ticket.status || 'active').toLowerCase() === 'valid'
        ? 'active'
        : (ticket.status || 'active').toLowerCase(),
      issuedAt: ticket.issuedAt,
      validUntil: ticket.validUntil,
    });
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log('[CHIGARI RIDE QR PAYLOAD (ticket-details)]', payload);
    }
    return payload;
  }, [ticket, isExpired, isUsed, profile?.full_name, user?.user_metadata?.full_name]);

  // Step 2: Route-Aware available buses
  const availableServices: ChigariServiceDefinition[] = useMemo(() => {
    return getAvailableServicesForJourney(ticket.fromStationName, ticket.toStationName);
  }, [ticket.fromStationName, ticket.toStationName]);

  const [selectedBusNumber, setSelectedBusNumber] = useState<string>(() => {
    if (availableServices.length > 0) {
      const match = availableServices.find((s) => s.serviceNumber === ticket.routeNumber);
      return match ? match.serviceNumber : availableServices[0].serviceNumber;
    }
    return ticket.routeNumber || '200A';
  });

  // Keep selectedBusNumber updated if availableServices changes
  useEffect(() => {
    if (availableServices.length > 0 && !availableServices.some((s) => s.serviceNumber === selectedBusNumber)) {
      setSelectedBusNumber(availableServices[0].serviceNumber);
    }
  }, [availableServices, selectedBusNumber]);

  // Step 3: Resolved stations
  const boardingStop = useMemo(() => {
    return (
      findStopById(ticket.fromStationId) ||
      findStopByName(ticket.fromStationName) ||
      CHIGARI_VERIFIED_STOPS[0]
    );
  }, [ticket.fromStationId, ticket.fromStationName]);

  const destinationStop = useMemo(() => {
    return (
      findStopById(ticket.toStationId) ||
      findStopByName(ticket.toStationName) ||
      CHIGARI_VERIFIED_STOPS[10]
    );
  }, [ticket.toStationId, ticket.toStationName]);

  const triggerHaptic = (style = Haptics.ImpactFeedbackStyle.Medium) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(style);
  };

  const handleBack = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/tickets');
    }
  };

  // Step 4: Track Bus action
  const handleTrackBus = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    const scanned = digitalTicketToScannedTicket(ticket);
    startJourney(scanned, selectedBusNumber);
    router.push({
      pathname: '/(tabs)/live',
      params: { bus: selectedBusNumber, ticketId: ticket.ticketId },
    });
  };

  // Format date & time
  const { formattedDate, formattedTime, formattedValidUntil } = useMemo(() => {
    const issueD = new Date(ticket.issuedAt);
    const validD = new Date(ticket.validUntil);

    const fDate = isNaN(issueD.getTime())
      ? '17 Sep 2026'
      : issueD.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });

    const fTime = isNaN(issueD.getTime())
      ? '02:15 PM'
      : issueD.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });

    const fValid = isNaN(validD.getTime())
      ? '4 hours from issue'
      : validD.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });

    return { formattedDate: fDate, formattedTime: fTime, formattedValidUntil: fValid };
  }, [ticket.issuedAt, ticket.validUntil]);

  // Clean stop names without suffix
  const cleanBoarding = boardingStop.name.split('/')[0].trim();
  const cleanDestination = destinationStop.name.split('/')[0].trim();

  return (
    <Screen backgroundColor={Colors.background} safeAreaTop={false} safeAreaBottom={false}>
      {/* ─── Top Header Bar ─── */}
      <View style={[styles.headerBar, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          style={({ pressed }) => [styles.headerCircleBtn, pressed && styles.pressed]}
          onPress={handleBack}
          accessibilityLabel={t('common.back')}
        >
          <ArrowLeft size={20} color={Colors.textPrimary} strokeWidth={2.4} />
        </Pressable>

        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>
            {t('ticketDetails.title') || 'Ticket Information'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {t('ticketDetails.subtitle') || 'Purchased Transit Ticket'}
          </Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── STEP 1: Dedicated Ticket Information Card ─── */}
        <View style={styles.ticketCard}>
          {/* Top Green Brand Banner */}
          <View style={styles.ticketBanner}>
            <View style={styles.bannerRow}>
              <View>
                <Text style={styles.brandTitle}>CHIGARI RIDE</Text>
                <Text style={styles.brandSubtitle}>NWKRTC • Hubballi-Dharwad BRTS</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  isExpired && styles.statusBadgeExpired,
                  isBoarded && { backgroundColor: '#0284C7' },
                  isExited && { backgroundColor: '#64748B' },
                  isInJourney && styles.statusBadgeJourney,
                  (isUsed && !isExited) && styles.statusBadgeUsed,
                ]}
              >
                {isExpired ? (
                  <AlertCircle size={13} color="#FFFFFF" strokeWidth={2.6} />
                ) : (
                  <CheckCircle2 size={13} color="#FFFFFF" strokeWidth={2.6} />
                )}
                <Text style={styles.statusBadgeText}>
                  {isInJourney
                    ? (t('ticketDetails.inJourney') || 'IN JOURNEY')
                    : isExpired
                    ? (t('digitalTicket.expired') || 'EXPIRED')
                    : isExited
                    ? 'COMPLETED'
                    : isBoarded
                    ? 'BOARDED'
                    : isUsed
                    ? 'USED'
                    : (t('digitalTicket.valid') || 'VALID')}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.ticketBody}>
            {/* Ticket ID Barcode / S.No Pill */}
            <View style={styles.ticketIdRow}>
              <Text style={styles.ticketIdLabel}>
                {t('ticketDetails.ticketId') || 'Ticket ID'}
              </Text>
              <Text style={styles.ticketIdValue}>{ticket.ticketId}</Text>
            </View>

            {/* From ➔ To Route Flow */}
            <View style={styles.routeFlowBox}>
              <View style={styles.routeStationRow}>
                <View style={[styles.stationDot, { backgroundColor: '#15803D' }]} />
                <View style={styles.stationInfo}>
                  <Text style={styles.stationLabel}>
                    {t('ticketDetails.from') || 'FROM'}
                  </Text>
                  <Text style={styles.stationName}>{ticket.fromStationName}</Text>
                </View>
              </View>

              <View style={styles.routeConnectorLine}>
                <View style={styles.connectorDashes} />
                <ArrowDown size={14} color="#94A3B8" strokeWidth={2.4} />
              </View>

              <View style={styles.routeStationRow}>
                <View style={[styles.stationDot, { backgroundColor: '#DC2626' }]} />
                <View style={styles.stationInfo}>
                  <Text style={styles.stationLabel}>
                    {t('ticketDetails.to') || 'TO'}
                  </Text>
                  <Text style={styles.stationName}>{ticket.toStationName}</Text>
                </View>
              </View>
            </View>

            {/* Dotted Perforation Line */}
            <View style={styles.perforationRow}>
              <View style={styles.perforationNotchLeft} />
              <View style={styles.perforationDashes} />
              <View style={styles.perforationNotchRight} />
            </View>

            {/* Ticket Metadata Grid */}
            <View style={styles.metaGrid}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>{t('ticketDetails.fare') || 'Fare'}</Text>
                <Text style={styles.metaValueFare}>₹{ticket.fare.toFixed(2)}</Text>
              </View>

              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>
                  {t('ticketDetails.passengers') || 'Passengers'}
                </Text>
                <Text style={styles.metaValue}>
                  {`1 • ${ticket.ticketType || 'Adult'}`}
                </Text>
              </View>

              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>{t('ticketDetails.date') || 'Date'}</Text>
                <Text style={styles.metaValue}>{formattedDate}</Text>
              </View>

              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>{t('ticketDetails.time') || 'Time'}</Text>
                <Text style={styles.metaValue}>{formattedTime}</Text>
              </View>

              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>{t('ticketDetails.selectedBus') || 'Selected Bus'}</Text>
                <Text style={[styles.metaValue, { color: '#15803D', fontFamily: FontFamily.bold, fontWeight: '700' }]}>
                  {`Bus ${selectedBusNumber}`}
                </Text>
              </View>

              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>{t('ticketDetails.boardingStation') || 'Boarding Station'}</Text>
                <Text style={styles.metaValue} numberOfLines={1}>{cleanBoarding}</Text>
              </View>
            </View>

            {/* Authentic QR Code Section */}
            <View style={styles.qrSection}>
              <View style={styles.qrBorder}>
                <QRCode
                  value={qrDataValue}
                  size={150}
                  color="#0F172A"
                  backgroundColor="#FFFFFF"
                />
              </View>
              <Text style={styles.qrCaption}>
                {t('ticketDetails.qrNotice') || 'Scan at BRTS turnstile gate'}
              </Text>
              <Text style={styles.validUntilText}>
                {`${t('ticketDetails.validUntil') || 'Valid until'}: ${formattedValidUntil}`}
              </Text>
            </View>
          </View>
        </View>

        {/* ─── STEP 2: Route-Aware Select Bus Section ─── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconBadge}>
              <Bus size={18} color="#15803D" strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>
                {t('ticketDetails.selectBus') || 'Select Bus'}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {t('ticketDetails.selectBusDesc') || 'Choose eligible Chigari service for your journey'}
              </Text>
            </View>
          </View>

          {/* Prominently Display Selected Bus */}
          <View style={styles.selectedBusBanner}>
            <View style={styles.selectedBusBadge}>
              <Bus size={15} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={styles.selectedBusBadgeText}>{selectedBusNumber}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.selectedBusLabel}>
                {t('ticketDetails.selectedBus') || 'Selected Bus'}
              </Text>
              <Text style={styles.selectedBusValue}>
                {`Chigari ${selectedBusNumber} Service`}
              </Text>
            </View>
            <View style={styles.selectedBusCheckIcon}>
              <Check size={16} color="#15803D" strokeWidth={3} />
            </View>
          </View>

          {isExpired ? (
            <View style={styles.expiredAlert}>
              <AlertCircle size={18} color="#DC2626" strokeWidth={2.4} />
              <Text style={styles.expiredAlertText}>
                {t('ticketDetails.ticketExpiredDesc') || 'This ticket has expired. Please purchase a new ticket.'}
              </Text>
            </View>
          ) : availableServices.length === 0 ? (
            <View style={styles.noServiceAlert}>
              <AlertCircle size={18} color="#D97706" strokeWidth={2.4} />
              <Text style={styles.noServiceAlertText}>
                {t('ticketDetails.noBusesAvailable') || 'No direct Chigari service available'}
              </Text>
            </View>
          ) : (
            <View style={styles.busOptionsList}>
              {availableServices.map((service) => {
                const isSelected = selectedBusNumber === service.serviceNumber;
                return (
                  <Pressable
                    key={service.serviceNumber}
                    style={[
                      styles.busOptionCard,
                      isSelected && styles.busOptionCardSelected,
                    ]}
                    onPress={() => {
                      triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedBusNumber(service.serviceNumber);
                    }}
                  >
                    <View style={styles.busOptionLeft}>
                      <View
                        style={[
                          styles.busNumberBadge,
                          { backgroundColor: service.color || '#15803D' },
                        ]}
                      >
                        <Bus size={14} color="#FFFFFF" strokeWidth={2.4} />
                        <Text style={styles.busNumberBadgeText}>{service.serviceNumber}</Text>
                      </View>

                      <View style={styles.busOptionInfo}>
                        <Text style={styles.busOptionName}>{service.name}</Text>
                        <Text style={styles.busOptionSub}>
                          {`Direct Service • ${cleanBoarding} ➔ ${cleanDestination}`}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.busSelectRadio,
                        isSelected && styles.busSelectRadioActive,
                      ]}
                    >
                      {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={2.8} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* ─── STEP 3: Station Details Card ─── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconBadge, { backgroundColor: '#EFF6FF' }]}>
              <MapPin size={18} color="#2563EB" strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>
                {t('ticketDetails.selectStation') || 'Boarding Station'}
              </Text>
              <Text style={styles.sectionSubtitle}>
                Confirmed station matching your ticket & selected bus
              </Text>
            </View>
          </View>

          <View style={styles.stationOverviewCard}>
            <View style={styles.stationOverviewRow}>
              <View style={styles.stationBadgeOrigin}>
                <Text style={styles.stationBadgeOriginText}>BOARDING</Text>
              </View>
              <Text style={styles.stationOverviewName}>{cleanBoarding}</Text>
            </View>

            <View style={styles.stationDividerLine} />

            <View style={styles.stationOverviewRow}>
              <View style={styles.stationBadgeDest}>
                <Text style={styles.stationBadgeDestText}>DESTINATION</Text>
              </View>
              <Text style={styles.stationOverviewName}>{cleanDestination}</Text>
            </View>

            <View style={styles.stationMetaFooter}>
              <Text style={styles.stationMetaText}>
                {`Verified HDBRTS Stop #${boardingStop.order} of 35 Corridor Stations`}
              </Text>
            </View>
          </View>
        </View>

        {/* ─── STEP 4: TRACK BUS Action Card ─── */}
        {!isExpired && (
          <View style={styles.trackBusCard}>
            <View style={styles.trackBusHeaderRow}>
              <View style={styles.trackBusBadge}>
                <Navigation size={13} color="#15803D" strokeWidth={2.4} />
                <Text style={styles.trackBusBadgeText}>LIVE TRACKING</Text>
              </View>
              <Text style={styles.trackBusRouteSummary} numberOfLines={1}>
                {`Bus ${selectedBusNumber} • ${cleanBoarding} ➔ ${cleanDestination}`}
              </Text>
            </View>

            <Text style={styles.trackBusCardTitle}>
              Track Your Bus in Real Time
            </Text>
            <Text style={styles.trackBusCardSubtitle}>
              Follow the approach of Bus {selectedBusNumber} along the HDBRTS corridor toward {cleanBoarding} and receive automated arrival announcements.
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.trackBusActionBtn,
                pressed && styles.pressed,
              ]}
              onPress={handleTrackBus}
              accessibilityLabel={t('journey.startJourney') || 'Start Journey'}
              accessibilityRole="button"
            >
              <Navigation size={20} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={styles.trackBusActionBtnText}>
                {t('journey.startJourney') || 'Start Journey'}
              </Text>
            </Pressable>
          </View>
        )}
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
  headerCircleBtn: {
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
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.lg,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  /* ─── Ticket Information Card Styles ─── */
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadows.medium,
  },
  ticketBanner: {
    backgroundColor: '#15803D',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 11,
    fontFamily: FontFamily.medium,
    color: '#DCFCE7',
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#166534',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
    gap: 4,
  },
  statusBadgeExpired: {
    backgroundColor: '#DC2626',
  },
  statusBadgeJourney: {
    backgroundColor: '#0284C7',
  },
  statusBadgeUsed: {
    backgroundColor: '#64748B',
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: FontFamily.bold,
    letterSpacing: 0.5,
  },
  ticketBody: {
    padding: Spacing.lg,
  },
  ticketIdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  ticketIdLabel: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    color: '#64748B',
    textTransform: 'uppercase',
  },
  ticketIdValue: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    color: '#0F172A',
  },
  routeFlowBox: {
    paddingVertical: Spacing.md,
  },
  routeStationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stationInfo: {
    flex: 1,
  },
  stationLabel: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  stationName: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
    color: '#1E293B',
    marginTop: 1,
  },
  routeConnectorLine: {
    height: 24,
    marginLeft: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  connectorDashes: {
    width: 2,
    height: 20,
    backgroundColor: '#CBD5E1',
  },
  perforationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: -Spacing.lg,
    marginVertical: Spacing.sm,
    overflow: 'hidden',
  },
  perforationNotchLeft: {
    width: 14,
    height: 24,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: Colors.background,
  },
  perforationDashes: {
    flex: 1,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginHorizontal: 8,
  },
  perforationNotchRight: {
    width: 14,
    height: 24,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    backgroundColor: Colors.background,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: Spacing.sm,
  },
  metaItem: {
    width: '50%',
    paddingVertical: 6,
  },
  metaLabel: {
    fontSize: 11,
    fontFamily: FontFamily.medium,
    color: '#64748B',
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
    color: '#1E293B',
    marginTop: 2,
  },
  metaValueFare: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    color: '#15803D',
    marginTop: 2,
  },
  qrSection: {
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  qrBorder: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadows.low,
  },
  qrCaption: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    color: '#64748B',
    marginTop: Spacing.sm,
  },
  validUntilText: {
    fontSize: 11,
    fontFamily: FontFamily.regular,
    color: '#94A3B8',
    marginTop: 2,
  },
  /* ─── Section Card (Select Bus & Station) ─── */
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.card,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadows.low,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: Spacing.md,
  },
  sectionIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: '#64748B',
    marginTop: 1,
  },
  busOptionsList: {
    gap: Spacing.sm,
  },
  busOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radius.card,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  busOptionCardSelected: {
    backgroundColor: '#F0FDF4',
    borderColor: '#15803D',
  },
  busOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  busNumberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  busNumberBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: FontFamily.bold,
  },
  busOptionInfo: {
    flex: 1,
  },
  busOptionName: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    color: '#0F172A',
  },
  busOptionSub: {
    fontSize: 11,
    fontFamily: FontFamily.regular,
    color: '#64748B',
    marginTop: 2,
  },
  busSelectRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  busSelectRadioActive: {
    backgroundColor: '#15803D',
    borderColor: '#15803D',
  },
  expiredAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: Radius.card,
    padding: Spacing.md,
  },
  expiredAlertText: {
    color: '#B91C1C',
    fontSize: 13,
    fontFamily: FontFamily.medium,
    flex: 1,
  },
  noServiceAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: Radius.card,
    padding: Spacing.md,
  },
  noServiceAlertText: {
    color: '#B45309',
    fontSize: 13,
    fontFamily: FontFamily.medium,
    flex: 1,
  },
  /* ─── Station Overview ─── */
  stationOverviewCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.card,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stationOverviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stationBadgeOrigin: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stationBadgeOriginText: {
    color: '#15803D',
    fontSize: 10,
    fontFamily: FontFamily.bold,
  },
  stationBadgeDest: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stationBadgeDestText: {
    color: '#B91C1C',
    fontSize: 10,
    fontFamily: FontFamily.bold,
  },
  stationOverviewName: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    color: '#0F172A',
    flex: 1,
  },
  stationDividerLine: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: Spacing.sm,
  },
  stationMetaFooter: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  stationMetaText: {
    fontSize: 11,
    fontFamily: FontFamily.medium,
    color: '#64748B',
  },
  /* ─── Step 4 & 5: Demo Bus Arrival Card ─── */
  demoArrivalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.card,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    ...Shadows.medium,
  },
  demoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  demoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  demoBadgeText: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    color: '#B45309',
    letterSpacing: 0.5,
  },
  arrivalStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  arrivalStatusPillText: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    textTransform: 'uppercase',
  },
  demoArrivalTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    color: '#0F172A',
    marginBottom: 6,
  },
  demoDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.md,
  },
  demoBusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#15803D',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  demoBusPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: FontFamily.bold,
  },
  demoRouteText: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
    color: '#334155',
  },
  countdownContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.card,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  countdownLabel: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countdownTime: {
    fontSize: 26,
    fontFamily: FontFamily.bold,
    color: '#B45309',
    marginVertical: 4,
  },
  countdownTimeArrived: {
    color: '#15803D',
  },
  progressBarTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#D97706',
    borderRadius: 3,
  },
  demoNoticeText: {
    fontSize: 10,
    fontFamily: FontFamily.regular,
    color: '#94A3B8',
    textAlign: 'center',
  },
  enterBusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#15803D',
    paddingVertical: 14,
    borderRadius: Radius.button,
    ...Shadows.medium,
  },
  enterBusBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  enterBusBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: FontFamily.bold,
  },
  /* ─── Boarding Success Modal ─── */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.bottomSheet,
    padding: Spacing.xxl,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    ...Shadows.high,
  },
  modalIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#15803D',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
    ...Shadows.medium,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: FontFamily.bold,
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  modalTripCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: Radius.card,
    padding: Spacing.md,
    width: '100%',
    marginBottom: Spacing.xl,
  },
  modalTripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  modalRouteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#15803D',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  modalRouteBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: FontFamily.bold,
  },
  modalStatusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  modalStatusBadgeText: {
    color: '#15803D',
    fontSize: 10,
    fontFamily: FontFamily.bold,
  },
  modalTripStops: {
    gap: 2,
  },
  modalStopText: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
    color: '#1E293B',
  },
  modalStopPrefix: {
    color: '#64748B',
    fontFamily: FontFamily.regular,
  },
  modalButtonsGroup: {
    width: '100%',
    gap: 10,
  },
  trackLiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#15803D',
    paddingVertical: 14,
    borderRadius: Radius.button,
    ...Shadows.medium,
  },
  trackLiveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: FontFamily.bold,
  },
  modalDoneBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDoneBtnText: {
    color: '#64748B',
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
  },
  selectedBusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    gap: Spacing.sm,
  },
  selectedBusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#15803D',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  selectedBusBadgeText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontFamily: FontFamily.bold,
    fontWeight: '800',
  },
  selectedBusLabel: {
    fontSize: 11,
    fontFamily: FontFamily.medium,
    color: '#15803D',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectedBusValue: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#166534',
  },
  selectedBusCheckIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackBusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.card,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: Spacing.lg,
    ...Shadows.medium,
  },
  trackBusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  trackBusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  trackBusBadgeText: {
    color: '#15803D',
    fontSize: 10.5,
    fontFamily: FontFamily.bold,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  trackBusRouteSummary: {
    fontSize: 12,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: '#64748B',
    maxWidth: '65%',
  },
  trackBusCardTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  trackBusCardSubtitle: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: Spacing.lg,
  },
  trackBusActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#15803D',
    paddingVertical: 15,
    borderRadius: Radius.button,
    shadowColor: '#15803D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  trackBusActionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: FontFamily.bold,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});
