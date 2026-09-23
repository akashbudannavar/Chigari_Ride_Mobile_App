import React, { useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Platform,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  ArrowDown,
  ShieldCheck,
  Share2,
  Download,
  QrCode,
  Bus,
  Check,
  Navigation,
} from 'lucide-react-native';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/ui/Text';
import { Colors, FontFamily, Spacing, Radius, Shadows } from '@/constants/theme';
import {
  type DigitalTicket,
  digitalTicketToScannedTicket,
} from '@/services/ticketHistory';
import {
  getAvailableServicesForJourney,
  type ChigariServiceDefinition,
} from '@/services/busAvailabilityService';
import QRCode from 'react-native-qrcode-svg';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  buildSharedTicketPayload,
  isSharedTicketContract,
} from '@/services/sharedTicketContract';
import { useJourney } from '@/contexts/JourneyContext';
import {
  getTicketJourneyRecord,
  type TicketJourneyRecord,
} from '@/services/ticketJourneyLifecycle';

export default function DigitalTicketScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const { startJourney } = useJourney();
  const params = useLocalSearchParams<{ ticketJson?: string }>();
  const ticketCardRef = useRef<View>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const ticket: DigitalTicket = useMemo(() => {
    if (params.ticketJson) {
      try {
        const parsed = JSON.parse(params.ticketJson);
        if (parsed && parsed.ticketId) {
          return parsed;
        }
      } catch (e) {
        console.warn('Failed to parse ticketJson in digital ticket screen:', e);
      }
    }
    // Authoritative fallback demo ticket
    const now = new Date();
    const validUntilDate = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    const dateCode =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0');
    const ticketId = `CR-${dateCode}-784201`;
    const fromStationName = 'BVB';
    const toStationName = 'Dharwad New Bus Stand';
    const fare = 25.0;
    const issuedAt = now.toISOString();
    const validUntil = validUntilDate.toISOString();

    const qrPayload = buildSharedTicketPayload({
      ticketId,
      fromStationName,
      toStationName,
      fare,
      currency: 'INR',
      passengerDisplayName: profile?.full_name || user?.user_metadata?.full_name || 'Rahul Patil',
      status: 'active',
      issuedAt,
      validUntil,
    });

    return {
      ticketId,
      fromStationId: 'hdbrts-stop-26',
      fromStationName,
      toStationId: 'hdbrts-stop-01',
      toStationName,
      fare,
      ticketType: 'Adult',
      issuedAt,
      validUntil,
      status: 'VALID',
      routeNumber: '200A',
      routeName: 'Chigari 200A Corridor',
      durationMinutes: 45,
      distanceKm: 22.4,
      qrPayload,
    };
  }, [params.ticketJson, profile?.full_name, user?.user_metadata?.full_name]);

  const [journeyRecord, setJourneyRecord] = useState<TicketJourneyRecord | null>(null);

  React.useEffect(() => {
    if (ticket.ticketId) {
      getTicketJourneyRecord(ticket.ticketId).then((rec) => {
        if (rec) setJourneyRecord(rec);
      });
    }
  }, [ticket.ticketId]);

  const effectiveJourneyState = journeyRecord?.state || ticket.journeyState || (ticket.status === 'EXPIRED' ? 'EXPIRED' : ticket.status === 'BOARDED' ? 'BOARDED' : ticket.status === 'EXITED' ? 'EXITED' : 'ACTIVE');
  const isBoarded = effectiveJourneyState === 'BOARDED';
  const isExited = effectiveJourneyState === 'EXITED';

  const triggerHaptic = (style = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(style);
  };

  const handleBack = () => {
    triggerHaptic();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/tickets');
    }
  };

  const handleDone = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    router.replace('/(tabs)/tickets');
  };

  const isExpired = useMemo(() => {
    if (effectiveJourneyState === 'EXPIRED' || ticket.status === 'EXPIRED' || ticket.status === 'USED') return true;
    const validD = new Date(ticket.validUntil);
    if (!isNaN(validD.getTime()) && validD.getTime() < Date.now() && ticket.status !== 'VALID' && ticket.status !== 'IN_JOURNEY') {
      return true;
    }
    return false;
  }, [effectiveJourneyState, ticket.status, ticket.validUntil]);

  // Route-aware available services for this ticket's journey
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

  // Keep selectedBusNumber valid if availableServices updates
  React.useEffect(() => {
    if (availableServices.length > 0 && !availableServices.some((s) => s.serviceNumber === selectedBusNumber)) {
      setSelectedBusNumber(availableServices[0].serviceNumber);
    }
  }, [availableServices, selectedBusNumber]);

  const handleStartJourney = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    const scanned = digitalTicketToScannedTicket(ticket);
    startJourney(scanned, selectedBusNumber);
    router.push({
      pathname: '/(tabs)/live',
      params: { bus: selectedBusNumber, ticketId: ticket.ticketId },
    });
  };

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
        : ((ticket.status || 'active').toLowerCase() === 'valid' ? 'active' : (ticket.status || 'active').toLowerCase()),
      issuedAt: ticket.issuedAt,
      validUntil: ticket.validUntil,
    });
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log('[CHIGARI RIDE QR PAYLOAD (digital-ticket)]', payload);
    }
    return payload;
  }, [ticket, isExpired, profile?.full_name, user?.user_metadata?.full_name]);

  const handleShare = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    if (isSharing) return;
    setIsSharing(true);

    try {
      if (!ticketCardRef.current) {
        throw new Error('Ticket card view reference is not ready.');
      }

      // Ensure scroll view is at top so full card bounds are in active layout
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });

      // Small delay for view stability
      await new Promise((resolve) => setTimeout(resolve, 120));

      // Capture the complete ticket view as a high-resolution PNG image
      const uri = await captureRef(ticketCardRef, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });

      if (!uri) {
        throw new Error('Image capture returned empty URI.');
      }

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: `CHIGARI RIDE Digital Ticket (${ticket.ticketId})`,
          UTI: 'public.png',
        });
      } else {
        if (Platform.OS === 'web') {
          // Web fallback: download the captured ticket PNG directly
          if (typeof document !== 'undefined') {
            const link = document.createElement('a');
            link.href = uri;
            link.download = `CHIGARI_RIDE_Ticket_${ticket.ticketId}.png`;
            link.click();
          }
        } else {
          // Native fallback via standard Share API
          await Share.share({
            url: uri,
            title: `CHIGARI RIDE Ticket - ${ticket.ticketId}`,
            message: `CHIGARI RIDE Digital Ticket: ${ticket.ticketId}`,
          });
        }
      }
    } catch (err: any) {
      console.error('[DigitalTicket] Share ticket image failed:', err);
      Alert.alert(
        t('common.error') || 'Error',
        t('digitalTicket.shareError') || 'Failed to share digital ticket image. Please try again.',
        [{ text: t('common.ok') || 'OK' }]
      );
    } finally {
      setIsSharing(false);
    }
  };

  const handleSave = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    if (isSaving) return;
    setIsSaving(true);

    try {
      if (!ticketCardRef.current) {
        throw new Error('Ticket card view reference is not ready.');
      }

      // Ensure scroll view is at top so full card bounds are in active layout
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });

      // Small delay for view stability
      await new Promise((resolve) => setTimeout(resolve, 120));

      // Capture the complete ticket view as a high-resolution PNG image
      const uri = await captureRef(ticketCardRef, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });

      if (!uri) {
        throw new Error('Image capture returned empty URI.');
      }

      if (Platform.OS === 'web') {
        if (typeof document !== 'undefined') {
          const link = document.createElement('a');
          link.href = uri;
          link.download = `CHIGARI_RIDE_Ticket_${ticket.ticketId}.png`;
          link.click();
          Alert.alert(
            t('common.success') || 'Success',
            t('digitalTicket.ticketSaved') || 'Ticket saved to gallery',
            [{ text: t('common.ok') || 'OK' }]
          );
        }
        return;
      }

      // Request media library permission (writeOnly = true for saving photos)
      const permission = await MediaLibrary.requestPermissionsAsync(true);
      if (permission.status !== 'granted') {
        Alert.alert(
          t('digitalTicket.permissionRequired') || 'Gallery Permission Required',
          t('digitalTicket.permissionDenied') || 'Gallery permission is required to save the ticket.',
          [{ text: t('common.ok') || 'OK' }]
        );
        return;
      }

      // Save directly to the device gallery / photos
      try {
        await MediaLibrary.saveToLibraryAsync(uri);
      } catch {
        await MediaLibrary.createAssetAsync(uri);
      }

      Alert.alert(
        t('common.success') || 'Success',
        t('digitalTicket.ticketSaved') || 'Ticket saved to gallery',
        [{ text: t('common.ok') || 'OK' }]
      );
    } catch (err: any) {
      console.error('[DigitalTicket] Save ticket image failed:', err);
      Alert.alert(
        t('common.error') || 'Error',
        t('digitalTicket.saveError') || 'Failed to save ticket image. Please try again.',
        [{ text: t('common.ok') || 'OK' }]
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Formatted date and time
  const { formattedDate, formattedTime, formattedValidUntil } = useMemo(() => {
    const issueD = new Date(ticket.issuedAt);
    const validD = new Date(ticket.validUntil);

    const fDate = isNaN(issueD.getTime())
      ? '16 Sep 2026'
      : issueD.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });

    const fTime = isNaN(issueD.getTime())
      ? '04:30 PM'
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

  return (
    <Screen backgroundColor={Colors.background} safeAreaTop={false} safeAreaBottom={false}>
      {/* ─── Top Header ─── */}
      <View style={[styles.headerBar, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          style={({ pressed }) => [styles.headerCircleBtn, pressed && styles.pressed]}
          onPress={handleBack}
          accessibilityLabel={t('common.back')}
        >
          <ArrowLeft size={20} color={Colors.textPrimary} strokeWidth={2.4} />
        </Pressable>

        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>{t('digitalTicket.title')}</Text>
          <Text style={styles.headerSubtitle}>Verified Transit Boarding Pass</Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.headerCircleBtn,
            pressed && styles.pressed,
            isSharing && styles.headerBtnDisabled,
          ]}
          onPress={handleShare}
          disabled={isSharing}
          accessibilityLabel={t('digitalTicket.sharePass')}
        >
          {isSharing ? (
            <ActivityIndicator size="small" color="#15803D" />
          ) : (
            <Share2 size={18} color={Colors.textPrimary} strokeWidth={2.2} />
          )}
        </Pressable>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollContainer}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Official Digital Ticket Card (Complete Capture Target) ─── */}
        <View ref={ticketCardRef} collapsable={false} style={styles.ticketCard}>
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
                ]}
              >
                {isExpired ? (
                  <AlertCircle size={13} color="#FFFFFF" strokeWidth={2.6} />
                ) : (
                  <CheckCircle2 size={13} color="#FFFFFF" strokeWidth={2.6} />
                )}
                <Text style={styles.statusBadgeText}>
                  {isExpired
                    ? (t('digitalTicket.expired') || 'EXPIRED')
                    : isExited
                    ? 'COMPLETED'
                    : isBoarded
                    ? 'BOARDED'
                    : (t('digitalTicket.valid') || 'VALID')}
                </Text>
              </View>
            </View>
          </View>

          {/* Ticket Body Content */}
          <View style={styles.ticketBody}>
            {/* Journey Status Sub-Banner if Boarded or Exited */}
            {(isBoarded || isExited) && (
              <View
                style={{
                  backgroundColor: isExited ? '#F1F5F9' : '#F0F9FF',
                  borderColor: isExited ? '#CBD5E1' : '#BAE6FD',
                  borderWidth: 1,
                  borderRadius: Radius.sm,
                  paddingHorizontal: Spacing.sm,
                  paddingVertical: 6,
                  marginBottom: Spacing.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <CheckCircle2 size={14} color={isExited ? '#475569' : '#0369A1'} strokeWidth={2.4} />
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: FontFamily.medium,
                    color: isExited ? '#334155' : '#0369A1',
                  }}
                >
                  {isExited
                    ? `Exited at: ${journeyRecord?.exitStationName || ticket.exitStationName || ticket.toStationName}`
                    : `Entered at: ${journeyRecord?.entryStationName || ticket.entryStationName || ticket.fromStationName}`}
                </Text>
              </View>
            )}

            {/* Origin & Destination Timeline */}
            <View style={styles.routeTimeline}>
              {/* FROM Stop */}
              <View style={styles.stopRow}>
                <View style={styles.originDot} />
                <View style={styles.stopTextGroup}>
                  <Text style={styles.stopDirectionLabel}>{t('busDetails.from')}</Text>
                  <Text style={styles.stopNameText}>{ticket.fromStationName}</Text>
                </View>
              </View>

              {/* Vertical Corridor Line */}
              <View style={styles.corridorConnector}>
                <View style={styles.verticalLine} />
                <View style={styles.busRouteTag}>
                  <Bus size={11} color="#15803D" strokeWidth={2.2} />
                  <Text style={styles.busRouteTagText}>{ticket.routeNumber || '200A'}</Text>
                </View>
                <View style={styles.verticalLine} />
              </View>

              {/* TO Stop */}
              <View style={styles.stopRow}>
                <View style={styles.destDot} />
                <View style={styles.stopTextGroup}>
                  <Text style={styles.stopDirectionLabel}>{t('busDetails.to')}</Text>
                  <Text style={styles.stopNameText}>{ticket.toStationName}</Text>
                </View>
              </View>
            </View>

            {/* Perforation Cutout with Dashed Divider */}
            <View style={styles.perforationWrapper}>
              <View style={styles.cutoutLeft} />
              <View style={styles.dashedDivider} />
              <View style={styles.cutoutRight} />
            </View>

            {/* Fare & Journey Grid */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricCell}>
                <Text style={styles.metricLabel}>{t('common.fare')}</Text>
                <Text style={styles.metricFare}>₹{ticket.fare.toFixed(2)}</Text>
              </View>
              <View style={styles.metricCell}>
                <Text style={styles.metricLabel}>{t('digitalTicket.ticketType') || 'TYPE'}</Text>
                <Text style={styles.metricValue}>{ticket.ticketType || 'Adult'}</Text>
              </View>
              <View style={styles.metricCell}>
                <Text style={styles.metricLabel}>{t('common.date')}</Text>
                <Text style={styles.metricValue}>{formattedDate}</Text>
              </View>
              <View style={styles.metricCell}>
                <Text style={styles.metricLabel}>{t('common.time')}</Text>
                <Text style={styles.metricValue}>{formattedTime}</Text>
              </View>
            </View>

            {/* Digital Transit QR Holder */}
            <View style={styles.qrContainer}>
              <View style={styles.qrCard}>
                <View style={styles.qrIconWrapper}>
                  <QRCode
                    value={qrDataValue}
                    size={150}
                    color="#14532D"
                    backgroundColor="#FFFFFF"
                  />
                </View>
                <Text style={styles.qrTicketId}>{ticket.ticketId}</Text>
                <Text style={styles.qrHint}>{t('digitalTicket.scanTurnstile')}</Text>
                <View style={[styles.validityPill, isExpired && styles.validityPillExpired]}>
                  <Clock size={12} color={isExpired ? '#DC2626' : '#15803D'} strokeWidth={2.2} />
                  <Text style={[styles.validityPillText, isExpired && styles.validityPillTextExpired]}>
                    {isExpired
                      ? (t('digitalTicket.expired') || 'EXPIRED')
                      : `${t('digitalTicket.validUntil')} ${formattedValidUntil}`}
                  </Text>
                </View>
              </View>
            </View>

            {/* Security Verification Barcode Strip */}
            <View style={styles.securityRow}>
              <ShieldCheck size={14} color="#15803D" strokeWidth={2.4} />
              <Text style={styles.securityText}>Official Cryptographic Transit Token</Text>
            </View>
          </View>
        </View>

        {/* ─── Route-Aware Select Bus Section (Available only when ticket is valid and journey not finished) ─── */}
        {!isExpired && ticket.status !== 'EXPIRED' && ticket.status !== 'USED' && (
          <View style={styles.selectBusSection}>
            {/* Section Header */}
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

            {/* Route-Aware Bus Service Selection Cards */}
            {availableServices.length === 0 ? (
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
                            {`Direct Service • ${ticket.fromStationName.split('/')[0].trim()} ➔ ${ticket.toStationName.split('/')[0].trim()}`}
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

            {/* Selected Bus Confirmation Card */}
            <View style={styles.confirmationCard}>
              <View style={styles.confirmationHeaderRow}>
                <View style={styles.confirmationBadge}>
                  <Bus size={14} color="#FFFFFF" strokeWidth={2.4} />
                  <Text style={styles.confirmationBadgeText}>{selectedBusNumber}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.confirmationLabel}>
                    {t('ticketDetails.selectedBus') || 'Selected Bus'}
                  </Text>
                  <Text style={styles.confirmationValue}>
                    {`Chigari ${selectedBusNumber}`}
                  </Text>
                </View>
                <View style={styles.confirmationCheckIcon}>
                  <Check size={16} color="#15803D" strokeWidth={3} />
                </View>
              </View>

              <View style={styles.confirmationDivider} />

              <View style={styles.confirmationRouteRow}>
                <View style={styles.confirmationRouteCol}>
                  <Text style={styles.confirmationRouteLabel}>{t('ticketDetails.from') || 'FROM'}</Text>
                  <Text style={styles.confirmationRouteStation} numberOfLines={1}>
                    {ticket.fromStationName.split('/')[0].trim()}
                  </Text>
                </View>
                <ArrowDown size={14} color="#64748B" strokeWidth={2.2} style={{ transform: [{ rotate: '-90deg' }], marginHorizontal: 8 }} />
                <View style={styles.confirmationRouteCol}>
                  <Text style={styles.confirmationRouteLabel}>{t('ticketDetails.to') || 'TO'}</Text>
                  <Text style={styles.confirmationRouteStation} numberOfLines={1}>
                    {ticket.toStationName.split('/')[0].trim()}
                  </Text>
                </View>
              </View>
            </View>

            {/* Prominent Start Journey Button */}
            <Pressable
              style={({ pressed }) => [
                styles.startJourneyBtn,
                pressed && styles.btnPressed,
              ]}
              onPress={handleStartJourney}
              accessibilityLabel={t('journey.startJourney') || 'Start Journey'}
              accessibilityRole="button"
            >
              <Navigation size={20} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={styles.startJourneyBtnText}>
                {t('journey.startJourney') || 'Start Journey'}
              </Text>
            </Pressable>
          </View>
        )}

        {/* ─── Bottom Actions: Save | Done ─── */}
        <View style={styles.actionsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.saveBtn,
              pressed && styles.btnPressed,
              isSaving && styles.btnDisabled,
            ]}
            onPress={handleSave}
            disabled={isSaving}
            accessibilityLabel={t('digitalTicket.savePass') || 'Save'}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#15803D" />
            ) : (
              <Download size={18} color="#15803D" strokeWidth={2.4} />
            )}
            <Text style={styles.saveBtnText}>
              {isSaving ? (t('digitalTicket.saving') || 'Saving...') : (t('digitalTicket.savePass') || 'Save')}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.doneBtn, pressed && styles.btnPressed]}
            onPress={handleDone}
            accessibilityLabel={t('common.done') || 'Done'}
          >
            <Text style={styles.doneBtnText}>{t('common.done') || 'Done'}</Text>
          </Pressable>
        </View>
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
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadows.medium,
  },
  ticketBanner: {
    backgroundColor: '#15803D',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 18,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandTitle: {
    fontSize: 20,
    fontFamily: FontFamily.bold,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  brandSubtitle: {
    fontSize: 11,
    fontFamily: FontFamily.medium,
    color: '#DCFCE7',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  statusBadgeExpired: {
    backgroundColor: '#DC2626',
    borderColor: '#FEE2E2',
  },
  statusBadgeText: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  ticketBody: {
    padding: Spacing.lg,
  },
  routeTimeline: {
    gap: 4,
    marginBottom: Spacing.md,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  originDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#15803D',
    borderWidth: 2,
    borderColor: '#DCFCE7',
  },
  destDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#DC2626',
    borderWidth: 2,
    borderColor: '#FEE2E2',
  },
  stopTextGroup: {
    flex: 1,
  },
  stopDirectionLabel: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  stopNameText: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  corridorConnector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 5,
    marginVertical: 2,
    height: 28,
  },
  verticalLine: {
    width: 2,
    height: '100%',
    backgroundColor: '#CBD5E1',
  },
  busRouteTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 18,
    gap: 5,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  busRouteTagText: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    color: '#15803D',
  },
  perforationWrapper: {
    position: 'relative',
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: -Spacing.lg,
    marginVertical: Spacing.sm,
  },
  cutoutLeft: {
    position: 'absolute',
    left: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.background,
  },
  cutoutRight: {
    position: 'absolute',
    right: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.background,
  },
  dashedDivider: {
    width: '84%',
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: Spacing.lg,
  },
  metricCell: {
    width: '50%',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  metricLabel: {
    fontSize: 10.5,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  metricFare: {
    fontSize: 22,
    fontFamily: FontFamily.bold,
    fontWeight: '800',
    color: '#15803D',
    marginTop: 2,
  },
  metricValue: {
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 2,
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
  },
  qrCard: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: Spacing.lg,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    width: '100%',
  },
  qrIconWrapper: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    ...Shadows.low,
  },
  qrTicketId: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 0.6,
  },
  qrHint: {
    fontSize: 11,
    fontFamily: FontFamily.regular,
    color: '#64748B',
    marginTop: 3,
    marginBottom: 8,
  },
  validityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    gap: 5,
  },
  validityPillExpired: {
    backgroundColor: '#FEE2E2',
  },
  validityPillText: {
    fontSize: 11.5,
    fontFamily: FontFamily.semiBold,
    color: '#15803D',
  },
  validityPillTextExpired: {
    color: '#DC2626',
  },
  headerBtnDisabled: {
    opacity: 0.6,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  securityText: {
    fontSize: 11,
    fontFamily: FontFamily.medium,
    color: '#64748B',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.4,
    borderColor: '#15803D',
    gap: 8,
    ...Shadows.low,
  },
  saveBtnText: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#15803D',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  doneBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 16,
    backgroundColor: '#15803D',
    ...Shadows.low,
  },
  doneBtnText: {
    fontSize: 15.5,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.75,
  },
  btnPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  /* ─── Select Bus & Confirmation Styles ─── */
  selectBusSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: Spacing.md,
    ...Shadows.medium,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: '#64748B',
    marginTop: 1,
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
    fontWeight: '800',
  },
  busOptionInfo: {
    flex: 1,
  },
  busOptionName: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
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
  confirmationCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: Radius.card,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    gap: Spacing.sm,
  },
  confirmationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  confirmationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#15803D',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  confirmationBadgeText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontFamily: FontFamily.bold,
    fontWeight: '800',
  },
  confirmationLabel: {
    fontSize: 11,
    fontFamily: FontFamily.medium,
    color: '#15803D',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  confirmationValue: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#166534',
  },
  confirmationCheckIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmationDivider: {
    height: 1,
    backgroundColor: '#BBF7D0',
    marginVertical: 2,
  },
  confirmationRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  confirmationRouteCol: {
    flex: 1,
  },
  confirmationRouteLabel: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    color: '#15803D',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  confirmationRouteStation: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#0F172A',
  },
  startJourneyBtn: {
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
  startJourneyBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: FontFamily.bold,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});
