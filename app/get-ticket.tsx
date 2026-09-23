import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  MapPin,
  Search,
  X,
  ChevronDown,
  ArrowDownUp,
  AlertCircle,
  Ticket,
  Clock,
  Route as RouteIcon,
  Check,
  CheckCircle2,
  Wallet,
  Bus,
  GitMerge,
  Navigation,
} from 'lucide-react-native';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/ui/Text';
import { Colors, FontFamily, Spacing, Radius, Shadows } from '@/constants/theme';
import {
  CHIGARI_STOPS,
  searchChigariStops,
  calculateCorridorRoute,
} from '@/data/chigariStops';
import type { BRTSStop } from '@/types/transit';
import { saveDigitalTicket, type DigitalTicket } from '@/services/ticketHistory';
import { useWallet } from '@/services/walletService';
import { buildSharedTicketPayload } from '@/services/sharedTicketContract';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAvailableServicesForJourney,
  formatAvailableServiceNumbers,
  getTransferSuggestions,
  type ChigariServiceDefinition,
  type TransferOption,
} from '@/services/busAvailabilityService';

export default function GetTicketScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const { balance: walletBalance, hasSufficientBalance, deductBalance } = useWallet();

  const [fromStop, setFromStop] = useState<BRTSStop | null>(null);
  const [toStop, setToStop] = useState<BRTSStop | null>(null);
  const [activePicker, setActivePicker] = useState<'from' | 'to' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [ticketType] = useState<'Adult'>('Adult');

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

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

  // Same station check
  const isSameStation = fromStop && toStop && fromStop.id === toStop.id;

  // Swap stations
  const handleSwapStations = () => {
    triggerHaptic();
    const temp = fromStop;
    setFromStop(toStop);
    setToStop(temp);
  };

  // Route & Fare calculation
  const routeCalculation = useMemo(() => {
    if (!fromStop || !toStop || isSameStation) return null;
    return calculateCorridorRoute(fromStop, toStop);
  }, [fromStop, toStop, isSameStation]);

  // Route-aware available services for this specific journey
  const availableServices: ChigariServiceDefinition[] = useMemo(() => {
    if (!fromStop || !toStop || isSameStation) return [];
    return getAvailableServicesForJourney(fromStop.name, toStop.name);
  }, [fromStop, toStop, isSameStation]);

  const hasAvailableService = availableServices.length > 0;

  const transferSuggestions: TransferOption[] = useMemo(() => {
    if (!fromStop || !toStop || isSameStation || hasAvailableService) return [];
    return getTransferSuggestions(fromStop.name, toStop.name);
  }, [fromStop, toStop, isSameStation, hasAvailableService]);

  const isValidForTicket = Boolean(
    fromStop && toStop && !isSameStation && routeCalculation && hasAvailableService
  );

  // Search filtered stops
  const pickerStops = useMemo(() => {
    if (!searchQuery.trim()) {
      return CHIGARI_STOPS;
    }
    return searchChigariStops(searchQuery);
  }, [searchQuery]);

  const handleSelectStop = (stop: BRTSStop) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    if (activePicker === 'from') {
      setFromStop(stop);
    } else if (activePicker === 'to') {
      setToStop(stop);
    }
    setActivePicker(null);
    setSearchQuery('');
  };

  const handlePressGetTicket = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);

    if (!fromStop) {
      Alert.alert('Starting Station Required', 'Please select your starting station.');
      return;
    }
    if (!toStop) {
      Alert.alert('Destination Station Required', 'Please select your destination.');
      return;
    }
    if (fromStop.id === toStop.id) {
      Alert.alert('Invalid Selection', 'Please select different stations.');
      return;
    }
    if (!hasAvailableService) {
      Alert.alert(
        t('ticketResult.noDirectService'),
        t('getTicket.noDirectService')
      );
      return;
    }
    if (!routeCalculation) return;

    setPaymentError(null);
    setPaymentSuccess(false);
    setIsProcessingPayment(false);
    setShowPaymentModal(true);
  };

  const handleCancelPayment = () => {
    if (isProcessingPayment) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setShowPaymentModal(false);
    setPaymentError(null);
  };

  const handleConfirmPayment = async () => {
    if (isProcessingPayment || paymentSuccess) return;
    if (!routeCalculation || !fromStop || !toStop) return;

    const fare = routeCalculation.fare;
    if (!hasSufficientBalance(fare)) {
      setPaymentError(
        `Insufficient wallet balance\nWallet Balance: ₹${walletBalance.toFixed(2)}\nTicket Price: ₹${fare.toFixed(2)}`
      );
      triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
      return;
    }

    setIsProcessingPayment(true);
    setPaymentError(null);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);

    // Deduct from Prompt 1's in-memory session wallet
    const deductRes = deductBalance(fare);
    if (!deductRes.success) {
      setIsProcessingPayment(false);
      setPaymentError(deductRes.error || 'Payment failed.');
      return;
    }

    // Unique Ticket ID (CR-YYYYMMDD-XXXXXX, Requirement 13)
    const now = new Date();
    const validUntilDate = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours validity
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const dateCode =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0');
    const ticketId = `CR-${dateCode}-${randomSuffix}`;

    const primaryService = availableServices[0];
    const routeNumber = primaryService ? primaryService.serviceNumber : '200A';
    const routeName = primaryService ? primaryService.name : `Chigari ${routeNumber} Corridor`;

    // Canonical Shared E-Ticket Contract Version 1 JSON QR payload
    const passengerDisplayName = profile?.full_name || user?.user_metadata?.full_name || 'Passenger';
    const qrPayload = buildSharedTicketPayload({
      ticketId,
      fromStationName: fromStop.name,
      toStationName: toStop.name,
      fare,
      currency: 'INR',
      passengerDisplayName,
      status: 'active',
      issuedAt: now.toISOString(),
      validUntil: validUntilDate.toISOString(),
    });

    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log('[CHIGARI RIDE QR PAYLOAD (get-ticket)]', qrPayload);
    }

    const digitalTicket: DigitalTicket = {
      ticketId,
      fromStationId: fromStop.id,
      fromStationName: fromStop.name,
      toStationId: toStop.id,
      toStationName: toStop.name,
      fare,
      ticketType: 'Adult',
      issuedAt: now.toISOString(),
      validUntil: validUntilDate.toISOString(),
      status: 'VALID',
      routeNumber,
      routeName,
      durationMinutes: routeCalculation.durationMinutes,
      distanceKm: Math.round((routeCalculation.distanceMeters / 1000) * 10) / 10,
      qrPayload,
    };

    // Save ticket locally for travel history (Requirement 14 & 15)
    await saveDigitalTicket(digitalTicket);

    setPaymentSuccess(true);
    setIsProcessingPayment(false);

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    // Short success state before opening Digital Ticket (Requirement 6)
    setTimeout(() => {
      setShowPaymentModal(false);
      router.push({
        pathname: '/digital-ticket',
        params: { ticketJson: JSON.stringify(digitalTicket) },
      });
    }, 850);
  };

  return (
    <Screen backgroundColor={Colors.background} safeAreaTop={false} safeAreaBottom={false}>
      {/* ─── Top Header with Back Navigation ─── */}
      <View style={[styles.headerBar, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          onPress={handleBack}
          accessibilityLabel={t('common.back')}
        >
          <ArrowLeft size={22} color={Colors.textPrimary} strokeWidth={2.4} />
        </Pressable>

        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>{t('getTicket.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('getTicket.subtitle')}</Text>
        </View>

        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── Station Selection Card ─── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderIcon}>
              <Ticket size={18} color="#15803D" strokeWidth={2.2} />
            </View>
            <Text style={styles.cardTitle}>{t('getTicket.corridorStations')}</Text>
            <Text style={styles.cardBadge}>{t('getTicket.adultFare')}</Text>
          </View>

          {/* FROM Station Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('getTicket.fromLabel')}</Text>
            <Pressable
              style={({ pressed }) => [
                styles.stationSelector,
                pressed && styles.pressed,
                fromStop && styles.stationSelectorFilled,
              ]}
              onPress={() => {
                triggerHaptic();
                setSearchQuery('');
                setActivePicker('from');
              }}
              accessibilityLabel={t('getTicket.selectOrigin')}
            >
              <View style={styles.selectorLeft}>
                <View style={styles.originDot} />
                <Text
                  style={[
                    styles.selectorText,
                    !fromStop && styles.selectorPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {fromStop ? fromStop.name : t('getTicket.selectOrigin')}
                </Text>
              </View>
              <ChevronDown size={18} color={fromStop ? '#15803D' : '#94A3B8'} strokeWidth={2.2} />
            </Pressable>
          </View>

          {/* Swap Divider Button */}
          <View style={styles.swapDividerRow}>
            <View style={styles.swapLine} />
            <Pressable
              style={({ pressed }) => [styles.swapBtn, pressed && styles.pressed]}
              onPress={handleSwapStations}
              accessibilityLabel="Swap stations"
            >
              <ArrowDownUp size={16} color="#15803D" strokeWidth={2.4} />
            </Pressable>
            <View style={styles.swapLine} />
          </View>

          {/* TO Station Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('getTicket.toLabel')}</Text>
            <Pressable
              style={({ pressed }) => [
                styles.stationSelector,
                pressed && styles.pressed,
                toStop && styles.stationSelectorFilled,
              ]}
              onPress={() => {
                triggerHaptic();
                setSearchQuery('');
                setActivePicker('to');
              }}
              accessibilityLabel={t('getTicket.selectDestination')}
            >
              <View style={styles.selectorLeft}>
                <View style={styles.destDot} />
                <Text
                  style={[
                    styles.selectorText,
                    !toStop && styles.selectorPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {toStop ? toStop.name : t('getTicket.selectDestination')}
                </Text>
              </View>
              <ChevronDown size={18} color={toStop ? '#15803D' : '#94A3B8'} strokeWidth={2.2} />
            </Pressable>
          </View>
        </View>

        {/* ─── Same Station Warning ─── */}
        {isSameStation && (
          <View style={styles.warningCard}>
            <AlertCircle size={18} color="#D97706" strokeWidth={2.2} />
            <Text style={styles.warningText}>
              {t('getTicket.sameStationError')}
            </Text>
          </View>
        )}

        {/* ─── No Direct Service: Prominent Red Warning Card + Smart Transfer Suggestions ─── */}
        {routeCalculation && !isSameStation && !hasAvailableService && (
          <View style={styles.noDirectServiceWrapper}>
            {/* Prominent Red Warning Box */}
            <View style={styles.prominentRedErrorCard}>
              <View style={styles.redErrorHeaderRow}>
                <View style={styles.redErrorIconCircle}>
                  <AlertCircle size={24} color="#DC2626" strokeWidth={2.4} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.prominentRedErrorTitle}>
                    {t('getTicket.noDirectBusAvailable') || 'No direct bus is available for this journey.'}
                  </Text>
                  <Text style={styles.prominentRedErrorSubtitle}>
                    There is no direct Chigari bus service between {fromStop?.name} and {toStop?.name}.
                  </Text>
                </View>
              </View>
            </View>

            {/* Smart Transfer Suggestion Card */}
            {transferSuggestions.length > 0 && (
              <View style={styles.transferSectionCard}>
                <View style={styles.transferHeaderRow}>
                  <View style={styles.transferHeaderIconCircle}>
                    <Navigation size={18} color="#15803D" strokeWidth={2.4} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.transferSectionTitle}>
                      {t('getTicket.transferSuggestion') || 'Smart Transfer Suggestion'}
                    </Text>
                    <Text style={styles.transferSectionSubtitle}>
                      Recommended route using verified corridor interchange hubs
                    </Text>
                  </View>
                </View>

                {transferSuggestions.slice(0, 2).map((option) => (
                  <View key={option.optionNumber} style={styles.transferOptionCard}>
                    <View style={styles.transferOptionBadge}>
                      <Text style={styles.transferOptionBadgeText}>
                        {t('getTicket.option', { number: option.optionNumber }) || `Option ${option.optionNumber}`}
                      </Text>
                    </View>

                    {/* Leg 1 */}
                    <View style={styles.transferLegBox}>
                      <View style={styles.transferLegStepBadge}>
                        <Text style={styles.transferLegStepText}>STEP 1</Text>
                      </View>
                      <View style={styles.transferLegContent}>
                        <Text style={styles.transferLegAction}>
                          Take Bus: <Text style={styles.transferBusCode}>{option.leg1.serviceNumbers.join(' or ')}</Text>
                        </Text>
                        <Text style={styles.transferLegStation}>
                          From: <Text style={styles.stationNameBold}>{option.leg1.fromStationName}</Text>
                        </Text>
                        <Text style={styles.transferLegStation}>
                          To: <Text style={styles.stationNameBold}>{option.leg1.toStationName}</Text>
                        </Text>
                      </View>
                    </View>

                    {/* Transfer Junction Connector */}
                    <View style={styles.transferJunctionRow}>
                      <View style={styles.transferJunctionBadge}>
                        <GitMerge size={14} color="#B45309" strokeWidth={2.4} />
                        <Text style={styles.transferJunctionText}>
                          Transfer at: <Text style={styles.transferJunctionHighlight}>{option.transferStationName}</Text>
                        </Text>
                      </View>
                    </View>

                    {/* Leg 2 */}
                    <View style={styles.transferLegBox}>
                      <View style={[styles.transferLegStepBadge, { backgroundColor: '#EFF6FF' }]}>
                        <Text style={[styles.transferLegStepText, { color: '#2563EB' }]}>STEP 2</Text>
                      </View>
                      <View style={styles.transferLegContent}>
                        <Text style={styles.transferLegAction}>
                          Take Bus: <Text style={styles.transferBusCode}>{option.leg2.serviceNumbers.join(' or ')}</Text>
                        </Text>
                        <Text style={styles.transferLegStation}>
                          To: <Text style={styles.stationNameBold}>{option.leg2.toStationName}</Text>
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ─── Journey Summary & Fare Card ─── */}
        {routeCalculation && !isSameStation && hasAvailableService && (
          <View style={styles.fareCard}>
            <View style={styles.fareCardTop}>
              <View>
                <Text style={styles.fareLabel}>{t('getTicket.ticketFare')}</Text>
                <Text style={styles.fareValue}>₹{routeCalculation.fare.toFixed(2)}</Text>
              </View>
              <View style={styles.ticketTypeBadge}>
                <Text style={styles.ticketTypeBadgeText}>{ticketType}</Text>
              </View>
            </View>

            <View style={styles.dottedDivider} />

            <View style={styles.tripMetaRow}>
              <View style={styles.metaItem}>
                <Clock size={15} color="#64748B" strokeWidth={2.2} />
                <Text style={styles.metaText}>~{routeCalculation.durationMinutes} {t('common.mins')}</Text>
              </View>
              <View style={styles.metaItem}>
                <RouteIcon size={15} color="#64748B" strokeWidth={2.2} />
                <Text style={styles.metaText}>
                  {(routeCalculation.distanceMeters / 1000).toFixed(1)} {t('common.km')}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaBusBadge}>
                  {`${t('busDetails.serviceNumber')} ${formatAvailableServiceNumbers(availableServices)}`}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ─── Payment Source (Chigari Wallet) ─── */}
        {routeCalculation && !isSameStation && hasAvailableService && (
          <View style={styles.walletPaymentCard}>
            <View style={styles.walletPaymentLeft}>
              <View style={styles.walletIconBox}>
                <Wallet size={18} color="#15803D" strokeWidth={2.2} />
              </View>
              <View>
                <Text style={styles.walletPaymentTitle}>
                  {t('getTicket.payWithWallet', { fare: routeCalculation.fare.toFixed(2) })}
                </Text>
                <Text style={styles.walletPaymentSubtitle}>
                  {t('getTicket.availableWalletBalance', { balance: walletBalance.toFixed(2) })}
                </Text>
              </View>
            </View>
            <Pressable
              style={({ pressed }) => [styles.walletTopUpLink, pressed && styles.pressed]}
              onPress={() => router.push('/wallet' as any)}
            >
              <Text style={styles.walletTopUpLinkText}>{t('wallet.topUp')}</Text>
            </Pressable>
          </View>
        )}

        {/* ─── GET TICKET Action Button ─── */}
        <Pressable
          style={({ pressed }) => [
            styles.getTicketBtn,
            isValidForTicket ? styles.getTicketBtnActive : styles.getTicketBtnDisabled,
            pressed && isValidForTicket && styles.btnPressed,
          ]}
          onPress={handlePressGetTicket}
          disabled={!isValidForTicket}
          accessibilityLabel={t('tickets.getTicket')}
          accessibilityRole="button"
        >
          <Text
            style={[
              styles.getTicketBtnText,
              isValidForTicket ? styles.getTicketBtnTextActive : styles.getTicketBtnTextDisabled,
            ]}
          >
            {isValidForTicket
              ? `${t('tickets.getTicket')} • ₹${routeCalculation?.fare.toFixed(2)}`
              : t('tickets.getTicket')}
          </Text>
        </Pressable>

        <Text style={styles.footerNote}>
          Verified demo ticket issued by NWKRTC Chigari Transit System
        </Text>
      </ScrollView>

      {/* ─── Searchable Station Selection Modal ─── */}
      <Modal
        visible={activePicker !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setActivePicker(null);
          setSearchQuery('');
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContent}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activePicker === 'from' ? 'Select Starting Station' : 'Select Destination Station'}
              </Text>
              <Pressable
                style={({ pressed }) => [styles.modalCloseBtn, pressed && styles.pressed]}
                onPress={() => {
                  triggerHaptic();
                  setActivePicker(null);
                  setSearchQuery('');
                }}
                hitSlop={10}
              >
                <X size={20} color={Colors.textPrimary} strokeWidth={2.2} />
              </Pressable>
            </View>

            {/* Search Input Bar */}
            <View style={styles.searchBarWrapper}>
              <View style={styles.searchBar}>
                <Search size={18} color="#64748B" strokeWidth={2.2} />
                <TextInput
                  style={styles.modalSearchInput}
                  placeholder="Search station (e.g. CBT, KLE, HBRST)..."
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus={true}
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                />
                {searchQuery.length > 0 && (
                  <Pressable
                    onPress={() => setSearchQuery('')}
                    hitSlop={8}
                  >
                    <X size={16} color="#64748B" strokeWidth={2} />
                  </Pressable>
                )}
              </View>
            </View>

            {/* Station List */}
            <ScrollView
              style={styles.stationList}
              contentContainerStyle={styles.stationListContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
              {pickerStops.length === 0 ? (
                <View style={styles.emptyList}>
                  <MapPin size={32} color="#CBD5E1" strokeWidth={1.8} />
                  <Text style={styles.emptyListTitle}>No stations found</Text>
                  <Text style={styles.emptyListSubtitle}>
                    Try searching for CBT, Vidyanagar, BVB, or KIMS
                  </Text>
                </View>
              ) : (
                pickerStops.map((stop) => {
                  const isCurrentSelected =
                    (activePicker === 'from' && fromStop?.id === stop.id) ||
                    (activePicker === 'to' && toStop?.id === stop.id);

                  return (
                    <Pressable
                      key={stop.id}
                      style={({ pressed }) => [
                        styles.stationItem,
                        isCurrentSelected && styles.stationItemSelected,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => handleSelectStop(stop)}
                    >
                      <View style={styles.stationItemLeft}>
                        <View
                          style={[
                            styles.stationOrderBadge,
                            isCurrentSelected && styles.stationOrderBadgeSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.stationOrderText,
                              isCurrentSelected && styles.stationOrderTextSelected,
                            ]}
                          >
                            {stop.order}
                          </Text>
                        </View>
                        <View style={styles.stationItemTexts}>
                          <Text
                            style={[
                              styles.stationItemName,
                              isCurrentSelected && styles.stationItemNameSelected,
                            ]}
                          >
                            {stop.name}
                          </Text>
                          {stop.kannadaName && (
                            <Text style={styles.stationItemKannada}>{stop.kannadaName}</Text>
                          )}
                        </View>
                      </View>

                      {isCurrentSelected && (
                        <Check size={18} color="#15803D" strokeWidth={2.5} />
                      )}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* ─── Payment Confirmation Modal (Requirements 3, 4, 5, 6, 7) ─── */}
      <Modal
        visible={showPaymentModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelPayment}
      >
        <View style={styles.paymentModalOverlay}>
          <Pressable
            style={styles.paymentModalBackdrop}
            onPress={handleCancelPayment}
            disabled={isProcessingPayment || paymentSuccess}
          />
          <View style={styles.paymentModalCard}>
            {paymentSuccess ? (
              <View style={styles.successContainer}>
                <View style={styles.successIconCircle}>
                  <CheckCircle2 size={48} color="#15803D" strokeWidth={2.4} />
                </View>
                <Text style={styles.successTitle}>✓ Ticket Purchased</Text>
                <Text style={styles.successSubtitle}>
                  Your Chigari ticket has been generated
                </Text>
                <Text style={styles.successRedirectNote}>
                  Opening digital ticket...
                </Text>
              </View>
            ) : (
              <>
                {/* Modal Title Bar */}
                <View style={styles.confirmHeader}>
                  <Text style={styles.confirmHeaderTitle}>Confirm Ticket Purchase</Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.confirmCloseBtn,
                      pressed && styles.pressed,
                    ]}
                    onPress={handleCancelPayment}
                    disabled={isProcessingPayment}
                    hitSlop={8}
                  >
                    <X size={18} color="#64748B" strokeWidth={2.2} />
                  </Pressable>
                </View>

                {/* Journey & Fare Details Box */}
                <View style={styles.confirmSummaryBox}>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmRowLabel}>FROM</Text>
                    <Text style={styles.confirmRowValue} numberOfLines={1}>
                      {fromStop?.name || '—'}
                    </Text>
                  </View>

                  <View style={styles.confirmDivider} />

                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmRowLabel}>TO</Text>
                    <Text style={styles.confirmRowValue} numberOfLines={1}>
                      {toStop?.name || '—'}
                    </Text>
                  </View>

                  <View style={styles.confirmDivider} />

                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmRowLabel}>TICKET TYPE</Text>
                    <Text style={styles.confirmRowValue}>Adult Single Journey</Text>
                  </View>

                  <View style={styles.confirmDivider} />

                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmFareLabel}>TICKET FARE</Text>
                    <Text style={styles.confirmFareValue}>
                      ₹{routeCalculation?.fare.toFixed(2) || '0.00'}
                    </Text>
                  </View>
                </View>

                {/* Wallet Balance Status Card */}
                <View
                  style={[
                    styles.confirmWalletCard,
                    routeCalculation && !hasSufficientBalance(routeCalculation.fare) && styles.confirmWalletCardWarning,
                  ]}
                >
                  <View style={styles.confirmWalletLeft}>
                    <Wallet
                      size={20}
                      color={
                        routeCalculation && hasSufficientBalance(routeCalculation.fare)
                          ? '#15803D'
                          : '#DC2626'
                      }
                      strokeWidth={2.2}
                    />
                    <View>
                      <Text style={styles.confirmWalletLabel}>Chigari Demo Wallet</Text>
                      <Text style={styles.confirmWalletBalance}>
                        Available: ₹{walletBalance.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.confirmWalletStatus,
                      routeCalculation && hasSufficientBalance(routeCalculation.fare)
                        ? styles.confirmWalletStatusOk
                        : styles.confirmWalletStatusBad,
                    ]}
                  >
                    {routeCalculation && hasSufficientBalance(routeCalculation.fare)
                      ? 'Sufficient'
                      : 'Low Balance'}
                  </Text>
                </View>

                {/* Insufficient Balance / Error Warning */}
                {paymentError && (
                  <View style={styles.paymentErrorBox}>
                    <AlertCircle size={16} color="#DC2626" strokeWidth={2.2} />
                    <Text style={styles.paymentErrorText}>{paymentError}</Text>
                  </View>
                )}

                {/* Modal Buttons */}
                <View style={styles.modalActionButtons}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.payConfirmBtn,
                      (!routeCalculation ||
                        !hasSufficientBalance(routeCalculation.fare) ||
                        isProcessingPayment) &&
                        styles.payConfirmBtnDisabled,
                      pressed && styles.btnPressed,
                    ]}
                    onPress={handleConfirmPayment}
                    disabled={
                      !routeCalculation ||
                      !hasSufficientBalance(routeCalculation.fare) ||
                      isProcessingPayment
                    }
                    accessibilityLabel="Pay with Wallet and generate ticket"
                    accessibilityRole="button"
                  >
                    <Text style={styles.payConfirmBtnText}>
                      {isProcessingPayment
                        ? 'Processing...'
                        : `Pay with Wallet • ₹${routeCalculation?.fare.toFixed(2) || '0.00'}`}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.cancelPaymentBtn,
                      pressed && styles.pressed,
                    ]}
                    onPress={handleCancelPayment}
                    disabled={isProcessingPayment}
                    accessibilityLabel="Cancel purchase"
                    accessibilityRole="button"
                  >
                    <Text style={styles.cancelPaymentBtnText}>Cancel</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
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
    gap: Spacing.base,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadows.low,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.base,
    gap: Spacing.sm,
  },
  cardHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  cardBadge: {
    fontSize: 12,
    fontFamily: FontFamily.semiBold,
    color: '#15803D',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  stationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    paddingHorizontal: Spacing.base,
    paddingVertical: 14,
  },
  stationSelectorFilled: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
  },
  selectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  originDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#15803D',
  },
  destDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#DC2626',
  },
  selectorText: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  selectorPlaceholder: {
    color: '#94A3B8',
    fontFamily: FontFamily.regular,
    fontWeight: '400',
  },
  swapDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  swapLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  swapBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.sm,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: Spacing.base,
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FontFamily.medium,
    color: '#B45309',
    lineHeight: 18,
  },
  fareCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    ...Shadows.low,
  },
  fareCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fareLabel: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  fareValue: {
    fontSize: 28,
    fontFamily: FontFamily.bold,
    fontWeight: '800',
    color: '#15803D',
    marginTop: 2,
  },
  ticketTypeBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  ticketTypeBadgeText: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
    color: '#15803D',
  },
  dottedDivider: {
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: Spacing.md,
  },
  tripMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    fontFamily: FontFamily.medium,
    color: '#475569',
  },
  metaBusBadge: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
    color: '#1E40AF',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  walletPaymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: Spacing.base,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
  },
  walletPaymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  walletIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletPaymentTitle: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#1E293B',
  },
  walletPaymentSubtitle: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    color: '#15803D',
    marginTop: 1,
  },
  walletTopUpLink: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  walletTopUpLinkText: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
    color: '#15803D',
  },
  getTicketBtn: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  getTicketBtnActive: {
    backgroundColor: '#15803D',
    shadowColor: '#0E4018',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  getTicketBtnDisabled: {
    backgroundColor: '#E2E8F0',
  },
  getTicketBtnText: {
    fontSize: 16.5,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  getTicketBtnTextActive: {
    color: '#FFFFFF',
  },
  getTicketBtnTextDisabled: {
    color: '#94A3B8',
  },
  footerNote: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: Spacing.xs,
  },

  // ─── Modal Styles ───
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarWrapper: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    gap: 8,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: FontFamily.regular,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  stationList: {
    flex: 1,
  },
  stationListContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: 6,
  },
  stationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: Spacing.base,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stationItemSelected: {
    borderColor: '#15803D',
    backgroundColor: '#F0FDF4',
  },
  stationItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  stationOrderBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stationOrderBadgeSelected: {
    backgroundColor: '#15803D',
  },
  stationOrderText: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
    color: '#64748B',
  },
  stationOrderTextSelected: {
    color: '#FFFFFF',
  },
  stationItemTexts: {
    flex: 1,
  },
  stationItemName: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    color: '#1E293B',
  },
  stationItemNameSelected: {
    color: '#15803D',
    fontWeight: '700',
  },
  stationItemKannada: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: '#64748B',
    marginTop: 1,
  },
  emptyList: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyListTitle: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    color: '#475569',
  },
  emptyListSubtitle: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  pressed: {
    opacity: 0.75,
  },
  btnPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },

  // ─── Payment Confirmation Modal Styles ───
  paymentModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  paymentModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  paymentModalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: Spacing.xl,
    ...Shadows.high,
    elevation: 8,
  },
  confirmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  confirmHeaderTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    fontWeight: '800',
    color: '#0F172A',
  },
  confirmCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmSummaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: Spacing.md,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  confirmRowLabel: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  confirmRowValue: {
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: '#0F172A',
    maxWidth: '65%',
    textAlign: 'right',
  },
  confirmFareLabel: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    fontWeight: '800',
    color: '#0F172A',
  },
  confirmFareValue: {
    fontSize: 20,
    fontFamily: FontFamily.bold,
    fontWeight: '800',
    color: '#15803D',
  },
  confirmDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  confirmWalletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderWidth: 1.2,
    borderColor: '#BBF7D0',
    marginBottom: Spacing.md,
  },
  confirmWalletCardWarning: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  confirmWalletLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  confirmWalletLabel: {
    fontSize: 12,
    fontFamily: FontFamily.semiBold,
    color: '#64748B',
  },
  confirmWalletBalance: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  confirmWalletStatus: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
  },
  confirmWalletStatusOk: {
    color: '#15803D',
  },
  confirmWalletStatusBad: {
    color: '#DC2626',
  },
  paymentErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginBottom: Spacing.md,
  },
  paymentErrorText: {
    flex: 1,
    fontSize: 12,
    fontFamily: FontFamily.medium,
    color: '#DC2626',
    lineHeight: 16,
  },
  modalActionButtons: {
    gap: 10,
    marginTop: 4,
  },
  payConfirmBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: '#15803D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#15803D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  payConfirmBtnDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  payConfirmBtnText: {
    fontSize: 15.5,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  cancelPaymentBtn: {
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelPaymentBtnText: {
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: '#64748B',
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  successTitle: {
    fontSize: 20,
    fontFamily: FontFamily.bold,
    fontWeight: '800',
    color: '#15803D',
    marginBottom: 6,
  },
  successSubtitle: {
    fontSize: 14,
    fontFamily: FontFamily.medium,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 4,
  },
  successRedirectNote: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  noDirectServiceWrapper: {
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  prominentRedErrorCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: Radius.card,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  redErrorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  redErrorIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prominentRedErrorTitle: {
    fontSize: 15.5,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#B91C1C',
    lineHeight: 22,
    marginBottom: 4,
  },
  prominentRedErrorSubtitle: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: '#991B1B',
    lineHeight: 18,
  },
  transferSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.card,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  transferHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  transferHeaderIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  transferSectionTitle: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#15803D',
  },
  transferSectionSubtitle: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: '#64748B',
    marginTop: 2,
  },
  transferOptionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  transferOptionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: Spacing.sm,
  },
  transferOptionBadgeText: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  transferLegBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  transferLegStepBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  transferLegStepText: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#15803D',
  },
  transferLegContent: {
    flex: 1,
    gap: 3,
  },
  transferLegAction: {
    fontSize: 13,
    fontFamily: FontFamily.medium,
    color: '#334155',
  },
  transferBusCode: {
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#15803D',
  },
  transferLegStation: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: '#64748B',
  },
  stationNameBold: {
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: '#1E293B',
  },
  transferJunctionRow: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  transferJunctionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  transferJunctionText: {
    fontSize: 11.5,
    fontFamily: FontFamily.medium,
    color: '#92400E',
  },
  transferJunctionHighlight: {
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#B45309',
  },
});
