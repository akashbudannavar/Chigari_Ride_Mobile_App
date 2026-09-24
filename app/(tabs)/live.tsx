import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  Platform,
  TextInput,
  Modal,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  cancelAnimation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  Crosshair,
  Search,
  SlidersHorizontal,
  Bus,
  X,
  CheckCircle2,
  Volume2,
  LogOut,
  MapPin,
  ChevronDown,
  Maximize2,
} from 'lucide-react-native';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/ui/Text';
import { Colors, FontFamily, Spacing, Radius, Shadows } from '@/constants/theme';
import { useLiveBusTracking } from '@/hooks/useLiveBusTracking';
import { LiveTrackingMap, LiveTrackingMapRef } from '@/components/map/LiveTrackingMap';
import { BusDetailsCard } from '@/components/BusDetailsCard';
import { useLanguage } from '@/contexts/LanguageContext';
import { useJourney } from '@/contexts/JourneyContext';
import type { ChigariBus, ChigariBusNumber, BusDirection, BRTSStop } from '@/types/transit';
import {
  CHIGARI_SERVICES,
  getAvailableServicesAtStop,
  type ChigariServiceDefinition,
} from '@/data/chigariServices';
import { searchChigariStops } from '@/data/chigariStops';

export default function LiveScreen() {
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();
  const mapRef = useRef<LiveTrackingMapRef>(null);

  const {
    journeyState,
    activeJourney,
    currentAnnouncement,
    isArrivalModalVisible,
    isApproachingDestination,
    isDestinationReached,
    isCompletedModalVisible,
    enterBus,
    leaveBus,
    dismissArrivalModal,
    dismissCompletedModal,
    cancelJourney,
  } = useJourney();

  // Supabase Realtime live bus tracking hook with seamless demo fallback
  const {
    buses,
    selectedBus,
    activeRoute,
    userLocation,
    selectBus,
  } = useLiveBusTracking();

  const params = useLocalSearchParams<{ bus?: string; ticketId?: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [showBusSelectorModal, setShowBusSelectorModal] = useState(false);
  const [selectedStop, setSelectedStop] = useState<BRTSStop | null>(null);

  const isJourneyActive = journeyState !== 'idle' && activeJourney !== null;

  // Route-aware stop matching based on search query, selected stop, or active boarding station
  const matchedStop = useMemo(() => {
    if (selectedStop) return selectedStop;
    if (searchQuery.trim().length > 1) {
      const matches = searchChigariStops(searchQuery.trim());
      if (matches.length > 0) return matches[0];
    }
    if (isJourneyActive && activeJourney) {
      return activeJourney.boardingStop;
    }
    return null;
  }, [selectedStop, searchQuery, isJourneyActive, activeJourney]);

  // Connected services at selected stop
  const selectedStopServices = useMemo(() => {
    if (!selectedStop) return [];
    return getAvailableServicesAtStop(selectedStop.name);
  }, [selectedStop]);

  // Route-aware service filtering using centralized data
  const availableServiceDefinitions = useMemo(() => {
    if (matchedStop) {
      const services = getAvailableServicesAtStop(matchedStop.name);
      if (services.length > 0) return services;
    }
    // Default to all 4 passenger services
    const distinctServices: ChigariServiceDefinition[] = [];
    const seen = new Set<string>();
    for (const s of CHIGARI_SERVICES) {
      if (!seen.has(s.serviceNumber)) {
        seen.add(s.serviceNumber);
        distinctServices.push(s);
      }
    }
    return distinctServices;
  }, [matchedStop]);

  // When a journey is active, passenger starts at boarding station and follows bus once onboard
  const effectiveUserLocation = useMemo(() => {
    if (isJourneyActive && activeJourney) {
      if (journeyState === 'on_bus') {
        return {
          latitude: activeJourney.busCoordinates.latitude,
          longitude: activeJourney.busCoordinates.longitude,
          title: `Onboard Bus ${activeJourney.busNumber}`,
          subtitle: `${activeJourney.boardingStop.name.split('/')[0].trim()} ➔ ${activeJourney.destinationStop.name.split('/')[0].trim()}`,
        };
      }
      return {
        latitude: activeJourney.boardingStop.latitude,
        longitude: activeJourney.boardingStop.longitude,
        title: activeJourney.boardingStop.name,
        subtitle: t('journey.boardingStation'),
      };
    }
    return userLocation;
  }, [isJourneyActive, activeJourney, userLocation, journeyState, t]);

  // Ensure active journey bus coordinates are accurately placed along the route
  const effectiveBuses: ChigariBus[] = useMemo(() => {
    if (!isJourneyActive || !activeJourney) return buses;

    const journeyDirection: BusDirection = activeJourney.isReverse
      ? 'To Hubballi CBT'
      : 'To Dharwad BRTS Terminal';

    return buses.map((b: ChigariBus): ChigariBus => {
      if (b.busNumber === activeJourney.busNumber) {
        return {
          ...b,
          latitude: activeJourney.busCoordinates.latitude,
          longitude: activeJourney.busCoordinates.longitude,
          heading: activeJourney.busHeading,
          speed: activeJourney.busSpeed,
          progressMeters: activeJourney.busProgressMeters,
          currentStop: activeJourney.boardingStop,
          nextStop: activeJourney.destinationStop,
          distanceToNextStop: Math.round(
            journeyState === 'waiting_for_bus'
              ? activeJourney.distanceToBoarding
              : activeJourney.distanceToDestination,
          ),
          direction: journeyDirection,
          isReverse: activeJourney.isReverse,
          isSelected: true,
        };
      }
      return { ...b, isSelected: false };
    });
  }, [buses, isJourneyActive, activeJourney, journeyState]);

  const effectiveSelectedBus: ChigariBus | null = useMemo(() => {
    if (isJourneyActive && activeJourney) {
      return effectiveBuses.find((b: ChigariBus) => b.busNumber === activeJourney.busNumber) || selectedBus;
    }
    return selectedBus;
  }, [isJourneyActive, activeJourney, effectiveBuses, selectedBus]);

  const hasHandledInitialBusRef = useRef(false);

  // Handle deep-link focus on specific bus on initial mount (runs ONCE, never continuously during movement)
  useEffect(() => {
    if (params.bus && !hasHandledInitialBusRef.current) {
      hasHandledInitialBusRef.current = true;
      const targetNumber = params.bus as ChigariBusNumber;
      selectBus(targetNumber);
      // In non-journey overview mode, center on the selected bus once initially
      if (!isJourneyActive) {
        const targetBus = buses.find((b: ChigariBus) => b.busNumber === targetNumber);
        if (targetBus) {
          const timer = setTimeout(() => {
            mapRef.current?.centerOnBus(targetBus);
          }, 400);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [params.bus, isJourneyActive, selectBus, buses]);

  // Live pulsing animation for status pill
  const livePulse = useSharedValue(1);

  useEffect(() => {
    livePulse.value = withRepeat(
      withSequence(
        withTiming(1.35, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    return () => {
      cancelAnimation(livePulse);
    };
  }, []);

  const triggerHaptic = (style = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(style);
    }
  };

  const handleCenterOnBus = useCallback(() => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    if (mapRef.current && effectiveSelectedBus) {
      mapRef.current.centerOnBus(effectiveSelectedBus);
    }
  }, [effectiveSelectedBus]);

  const handleCenterOnRoute = useCallback(() => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    if (mapRef.current) {
      mapRef.current.centerOnRoute();
    }
  }, []);

  const handleStopSelect = useCallback((stop: BRTSStop) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedStop(stop);
  }, []);

  const handleSelectServiceFromStation = useCallback((serviceNumber: ChigariBusNumber) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    selectBus(serviceNumber);
  }, [selectBus]);

  const handleBusSelect = useCallback((bus: ChigariBus) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    selectBus(bus);
    if (mapRef.current) {
      mapRef.current.centerOnBus(bus);
    }
  }, [selectBus]);

  const liveDotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: livePulse.value }],
  }));

  return (
    <Screen backgroundColor={Colors.background} safeAreaTop={false} safeAreaBottom={false}>
      {/* ─── Real Interactive Map (Fills screen, follows PB Road BRTS Corridor) ─── */}
      <View style={StyleSheet.absoluteFillObject}>
        <LiveTrackingMap
          ref={mapRef}
          buses={effectiveBuses}
          selectedBus={effectiveSelectedBus}
          activeRoute={activeRoute}
          userLocation={effectiveUserLocation}
          onSelectBus={handleBusSelect}
          onSelectStop={handleStopSelect}
          selectedStop={selectedStop}
          isJourneyActive={isJourneyActive}
          remainingCoordinates={activeJourney?.remainingCoordinates}
          journeyCoordinates={activeJourney?.journeyCoordinates}
          ticketOriginStop={activeJourney?.boardingStop}
          ticketDestinationStop={activeJourney?.destinationStop}
          intermediateStops={activeJourney?.intermediateStops}
        />
      </View>

      {/* ─── Top Floating Header & Controls Overlay (Compact in Journey Mode) ─── */}
      {isJourneyActive && activeJourney ? (
        <View style={[styles.compactTopBar, { paddingTop: insets.top + Spacing.xs }]}>
          <Pressable
            style={({ pressed }) => [styles.compactBackBtn, pressed && styles.pressed]}
            onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              cancelJourney();
            }}
            accessibilityLabel="Cancel Journey"
          >
            <X size={18} color="#1F2937" strokeWidth={2.4} />
          </Pressable>

          <View style={styles.compactTopContent}>
            <View style={styles.compactBusPill}>
              <Text style={styles.compactBusPillText}>{activeJourney.busNumber}</Text>
            </View>
            <View style={styles.compactTitleColumn}>
              <Text style={styles.compactTitleText} numberOfLines={1}>
                {`${activeJourney.boardingStop.name.split('/')[0].trim()} ➔ ${activeJourney.destinationStop.name.split('/')[0].trim()}`}
              </Text>
              <Text style={styles.compactSubtitleText} numberOfLines={1}>
                {`${t('liveTracking.stationaryBus')} • Board at ${activeJourney.boardingStop.name.split('/')[0].trim()}`}
              </Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.compactCenterBtn, pressed && styles.pressed]}
            onPress={handleCenterOnBus}
            accessibilityLabel="Center on Bus"
          >
            <Crosshair size={18} color="#15803D" strokeWidth={2.4} />
          </Pressable>
        </View>
      ) : (
        <View style={[styles.topOverlay, { paddingTop: insets.top + Spacing.sm }]}>
          {/* Search Bar */}
          <View style={styles.searchBarWrapper}>
            <Search size={18} color="#9E9E9E" strokeWidth={2.2} />
            <TextInput
              style={styles.searchTextInput}
              placeholder={t('liveTracking.searchPlaceholder')}
              placeholderTextColor="#9E9E9E"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <Pressable onPress={() => triggerHaptic()}>
              <SlidersHorizontal size={18} color="#1F2937" strokeWidth={2.2} />
            </Pressable>
          </View>

          {/* Route-Aware Interactive Bus Selector Bar (Requirement 11, 12, 13) */}
          <Pressable
            style={[
              styles.busSelectorBar,
              effectiveSelectedBus !== null && styles.busSelectorBarActive,
            ]}
            onPress={() => {
              triggerHaptic();
              setShowBusSelectorModal(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Select Bus Service"
          >
            <View style={styles.busSelectorBarLeft}>
              {effectiveSelectedBus ? (
                <View style={styles.busSelectorActivePill}>
                  <CheckCircle2 size={13} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={styles.busSelectorActivePillText}>
                    {effectiveSelectedBus.busNumber}
                  </Text>
                </View>
              ) : (
                <View style={styles.busSelectorIconCircle}>
                  <Bus size={15} color="#15803D" strokeWidth={2.4} />
                </View>
              )}

              <View style={styles.busSelectorTextWrapper}>
                <Text style={styles.busSelectorMainText} numberOfLines={1}>
                  {effectiveSelectedBus
                    ? `Bus ${effectiveSelectedBus.busNumber} Active`
                    : 'Select Bus'}
                </Text>
                <Text style={styles.busSelectorSubText} numberOfLines={1}>
                  {effectiveSelectedBus
                    ? effectiveSelectedBus.direction
                    : matchedStop
                    ? `Available services at ${matchedStop.name.split('/')[0].trim()}`
                    : 'Tap to choose 200A, 201B, 100D, or 202C'}
                </Text>
              </View>
            </View>

            <View style={styles.busSelectorRightControls}>
              {effectiveSelectedBus && (
                <Pressable
                  style={styles.busSelectorClearBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    triggerHaptic();
                    selectBus(null);
                  }}
                  hitSlop={8}
                  accessibilityLabel="Clear bus selection"
                >
                  <X size={15} color="#64748B" strokeWidth={2.2} />
                </Pressable>
              )}
              <ChevronDown size={17} color="#475569" strokeWidth={2.2} />
            </View>
          </Pressable>

          {/* Transit Quick Control Row (Stationary Bus Mode, No Simulation Controls) */}
          <View style={styles.quickControlRow}>
            {/* Active Network / Station Status Badge */}
            <View style={styles.networkStatusBadge}>
              <MapPin size={13} color="#15803D" strokeWidth={2.5} />
              <Text style={styles.networkStatusText} numberOfLines={1}>
                {selectedStop
                  ? `Stop #${selectedStop.order} • ${selectedStop.name.split('/')[0].trim()}`
                  : effectiveSelectedBus
                  ? `Bus ${effectiveSelectedBus.busNumber} • Stationary`
                  : 'HDBRTS Corridor • 35 Stations'}
              </Text>
            </View>

            {/* Action Buttons: Center Route, Center Bus */}
            <View style={styles.quickButtonsGroup}>
              <Pressable
                style={({ pressed }) => [styles.quickActionBtn, pressed && styles.pressed]}
                onPress={handleCenterOnRoute}
                accessibilityLabel={t('liveTracking.centerOnRoute')}
              >
                <Maximize2 size={13} color="#15803D" strokeWidth={2.4} />
                <Text style={styles.quickActionBtnText}>{t('liveTracking.centerOnRoute')}</Text>
              </Pressable>

              {effectiveSelectedBus && (
                <Pressable
                  style={({ pressed }) => [styles.quickIconBtn, pressed && styles.pressed]}
                  onPress={handleCenterOnBus}
                  accessibilityLabel={t('liveTracking.centerOnBus')}
                >
                  <Crosshair size={16} color="#15803D" strokeWidth={2.4} />
                </Pressable>
              )}
            </View>
          </View>
        </View>
      )}

      {/* ─── Part 2: Visual Accessibility Announcement Banner ─── */}
      {isJourneyActive && currentAnnouncement && (
        <View style={[styles.announcementBanner, { top: insets.top + 70 }]}>
          <View style={styles.announcementIconBox}>
            <Volume2 size={16} color="#FFFFFF" strokeWidth={2.4} />
          </View>
          <View style={styles.announcementTextWrapper}>
            <Text style={styles.announcementBadgeText}>
              {currentAnnouncement.type === 'destination_approaching' || currentAnnouncement.type === 'destination_reached'
                ? t('journey.destinationApproaching')
                : currentAnnouncement.type === 'departure'
                ? t('journey.nowDepartingFrom').replace('{stopName}', '')
                : t('journey.nextStation')}
            </Text>
            <Text style={styles.announcementText} numberOfLines={2}>
              {currentAnnouncement.text}
            </Text>
          </View>
        </View>
      )}

      {/* ─── Bottom Tracking Card: Compact in Journey Mode, Full in Overview Mode ─── */}
      {isJourneyActive && activeJourney ? (
        <View style={[styles.compactBottomContainer, { paddingBottom: insets.bottom + 65 }]}>
          <View style={styles.compactBottomCard}>
            <View style={styles.compactBottomLeft}>
              <View style={styles.compactStatusRow}>
                <View
                  style={[
                    styles.compactStatusDot,
                    isDestinationReached
                      ? { backgroundColor: '#15803D' }
                      : journeyState === 'bus_arrived'
                      ? { backgroundColor: '#2E7D32' }
                      : { backgroundColor: '#EA580C' },
                  ]}
                />
                <Text style={styles.compactStatusTag}>
                  {journeyState === 'waiting_for_bus'
                    ? `BUS APPROACHING (${Math.round(activeJourney.distanceToBoarding)}m)`
                    : journeyState === 'bus_arrived'
                    ? 'BUS AT STATION • BOARD NOW'
                    : isDestinationReached
                    ? 'ARRIVED AT DESTINATION'
                    : isApproachingDestination
                    ? 'APPROACHING DESTINATION'
                    : `${activeJourney.busNumber} • ON THE WAY`}
                </Text>
              </View>

              <Text style={styles.compactRouteHeading} numberOfLines={1}>
                {`${activeJourney.boardingStop.name.split('/')[0].trim()} ➔ ${activeJourney.destinationStop.name.split('/')[0].trim()}`}
              </Text>

              <Text style={styles.compactDetailSubText} numberOfLines={1}>
                {journeyState === 'waiting_for_bus'
                  ? `Board at ${activeJourney.boardingStop.name.split('/')[0].trim()}`
                  : journeyState === 'bus_arrived'
                  ? 'Enter the bus and find a seat'
                  : isDestinationReached
                  ? 'Destination reached • Please alight here'
                  : `${(activeJourney.distanceToDestination / 1000).toFixed(1)} km remaining • Next: ${activeJourney.nextStop?.name?.split('/')[0]?.trim()}`}
              </Text>
            </View>

            <View style={styles.compactBottomRight}>
              {journeyState === 'on_bus' && (isApproachingDestination || isDestinationReached) ? (
                <Pressable
                  style={({ pressed }) => [styles.compactActionBtnLeave, pressed && styles.pressed]}
                  onPress={() => {
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
                    leaveBus();
                  }}
                  accessibilityLabel={t('journey.leaveHere')}
                >
                  <LogOut size={16} color="#FFFFFF" strokeWidth={2.4} />
                  <Text style={styles.compactActionBtnText}>{t('journey.leaveHere')}</Text>
                </Pressable>
              ) : journeyState === 'bus_arrived' ? (
                <Pressable
                  style={({ pressed }) => [styles.compactActionBtnEnter, pressed && styles.pressed]}
                  onPress={() => {
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
                    enterBus();
                  }}
                  accessibilityLabel="Enter Bus"
                >
                  <Bus size={16} color="#FFFFFF" strokeWidth={2.4} />
                  <Text style={styles.compactActionBtnText}>{t('ticketDetails.enterBus')}</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={({ pressed }) => [styles.compactActionFab, pressed && styles.pressed]}
                  onPress={handleCenterOnBus}
                  accessibilityLabel="Center on Bus"
                >
                  <Crosshair size={20} color="#15803D" strokeWidth={2.4} />
                </Pressable>
              )}
            </View>
          </View>
        </View>
      ) : (
        <View
          style={[
            styles.floatingCardContainer,
            { paddingBottom: insets.bottom + 62 },
          ]}
        >
          {/* Station Details Card (When a station marker is tapped) */}
          {selectedStop && (
            <View style={styles.stationCardContainer}>
              <View style={styles.stationCardHeader}>
                <View style={styles.stationIconCircle}>
                  <MapPin size={18} color="#0284C7" strokeWidth={2.4} />
                </View>

                <View style={styles.stationCardInfoCol}>
                  <View style={styles.stationCardTitleRow}>
                    <Text style={styles.stationCardTitle} numberOfLines={1}>
                      {language === 'kn' && selectedStop.kannadaName
                        ? selectedStop.kannadaName
                        : selectedStop.name.split('/')[0].trim()}
                    </Text>
                    <View style={styles.stopNumberPill}>
                      <Text style={styles.stopNumberPillText}>Stop #{selectedStop.order}</Text>
                    </View>
                  </View>

                  {language === 'kn' && selectedStop.kannadaName && (
                    <Text style={styles.stationCardSubname} numberOfLines={1}>
                      {selectedStop.name.split('/')[0].trim()}
                    </Text>
                  )}

                  {selectedStop.tagline && (
                    <Text style={styles.stationCardTagline} numberOfLines={1}>
                      {selectedStop.tagline}
                    </Text>
                  )}
                </View>

                <Pressable
                  style={styles.stationCardCloseBtn}
                  onPress={() => {
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedStop(null);
                  }}
                  hitSlop={8}
                  accessibilityLabel="Close"
                >
                  <X size={17} color="#64748B" strokeWidth={2.2} />
                </Pressable>
              </View>

              {/* Connected Services Row */}
              <View style={styles.stationCardServicesSection}>
                <Text style={styles.stationServicesLabel}>{t('liveTracking.connectedServices')}:</Text>
                <View style={styles.stationServicesRow}>
                  {selectedStopServices.map((srv) => (
                    <Pressable
                      key={srv.serviceNumber}
                      style={[
                        styles.stationServiceChip,
                        effectiveSelectedBus?.busNumber === srv.serviceNumber && styles.stationServiceChipActive,
                      ]}
                      onPress={() => handleSelectServiceFromStation(srv.serviceNumber as ChigariBusNumber)}
                    >
                      <View style={[styles.stationServiceDot, { backgroundColor: srv.color }]} />
                      <Text
                        style={[
                          styles.stationServiceChipText,
                          effectiveSelectedBus?.busNumber === srv.serviceNumber && styles.stationServiceChipTextActive,
                        ]}
                      >
                        {srv.serviceNumber}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Bus Details Card (When a bus is selected and no station card is active) */}
          {!selectedStop && effectiveSelectedBus && (
            <BusDetailsCard bus={effectiveSelectedBus} onCenterOnBus={handleCenterOnBus} />
          )}
        </View>
      )}

      {/* ─── Part 1: "Your bus has arrived" Popup Modal ─── */}
      <Modal
        visible={isArrivalModalVisible}
        transparent
        animationType="fade"
        onRequestClose={dismissArrivalModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.arrivalCard}>
            <View style={styles.arrivalIconCircle}>
              <Bus size={36} color="#FFFFFF" strokeWidth={2.4} />
            </View>

            <Text style={styles.arrivalTitle}>
              {t('ticketDetails.busArrivedModalTitle')}
            </Text>

            <Text style={styles.arrivalSubtitle}>
              {activeJourney
                ? `${activeJourney.busNumber} has arrived at ${activeJourney.boardingStop.name.split('/')[0].trim()}. Please board the bus.`
                : 'Your bus has arrived at the station. Please board the bus.'}
            </Text>

            <Pressable
              style={({ pressed }) => [styles.enterBusBtn, pressed && styles.pressed]}
              onPress={() => {
                triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
                enterBus();
              }}
              accessibilityLabel={t('ticketDetails.boardBus')}
            >
              <Bus size={20} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={styles.enterBusBtnText}>
                {t('ticketDetails.boardBus')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ─── Part 2: "You have reached your destination" Popup Modal ─── */}
      <Modal
        visible={isDestinationReached && !isCompletedModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.arrivalCard}>
            <View style={[styles.arrivalIconCircle, { backgroundColor: '#2E7D32' }]}>
              <MapPin size={34} color="#FFFFFF" strokeWidth={2.4} />
            </View>

            <Text style={styles.arrivalTitle}>
              {t('journey.destinationReached')}
            </Text>

            <Text style={styles.arrivalStationName}>
              {activeJourney ? activeJourney.destinationStop.name.split('/')[0].trim() : ''}
            </Text>

            <Text style={styles.arrivalSubtitle}>
              {t('journey.destinationReachedDesc')}
            </Text>

            <Pressable
              style={({ pressed }) => [styles.enterBusBtn, pressed && styles.pressed]}
              onPress={() => {
                triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
                leaveBus();
              }}
              accessibilityLabel={t('journey.leaveHere')}
            >
              <LogOut size={20} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={styles.enterBusBtnText}>
                {t('journey.leaveHere')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ─── Part 2: Final Journey Completed / Thank You Modal ─── */}
      <Modal
        visible={isCompletedModalVisible}
        transparent
        animationType="fade"
        onRequestClose={dismissCompletedModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.arrivalCard}>
            <View style={[styles.arrivalIconCircle, { backgroundColor: '#15803D' }]}>
              <CheckCircle2 size={36} color="#FFFFFF" strokeWidth={2.4} />
            </View>

            <Text style={styles.arrivalTitle}>
              {t('journey.thankYouTitle')}
            </Text>

            {activeJourney && (
              <View style={styles.completedTripSummaryBox}>
                <View style={styles.completedRouteBadge}>
                  <Bus size={13} color="#FFFFFF" strokeWidth={2.2} />
                  <Text style={styles.completedRouteBadgeText}>
                    {`Route ${activeJourney.busNumber}`}
                  </Text>
                </View>
                <Text style={styles.completedRouteText}>
                  {`${activeJourney.boardingStop.name.split('/')[0].trim()} ➔ ${activeJourney.destinationStop.name.split('/')[0].trim()}`}
                </Text>
              </View>
            )}

            <Text style={styles.arrivalSubtitle}>
              {activeJourney
                ? t('journey.thankYouSubtitle').replace('{busNumber}', activeJourney.busNumber)
                : t('journey.journeyCompleted')}
            </Text>

            <Pressable
              style={({ pressed }) => [styles.enterBusBtn, pressed && styles.pressed]}
              onPress={() => {
                triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
                dismissCompletedModal();
              }}
              accessibilityLabel={t('common.done')}
            >
              <CheckCircle2 size={18} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={styles.enterBusBtnText}>
                {t('common.done')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ─── Route-Aware Interactive Bus Selector Modal (Requirement 11, 12, 13) ─── */}
      <Modal
        visible={showBusSelectorModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBusSelectorModal(false)}
      >
        <View style={styles.busSelectorModalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setShowBusSelectorModal(false)}
          />
          <View
            style={[
              styles.busSelectorSheet,
              { paddingBottom: Math.max(insets.bottom, 16) + Spacing.base },
            ]}
          >
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View style={{ flex: 1, paddingRight: Spacing.sm }}>
                <Text style={styles.sheetTitle}>Select Bus Service</Text>
                <Text style={styles.sheetSubtitle}>
                  {matchedStop
                    ? `Available services at ${matchedStop.name.split('/')[0].trim()}`
                    : 'Choose an official Chigari passenger route'}
                </Text>
              </View>
              <Pressable
                style={styles.sheetCloseBtn}
                onPress={() => setShowBusSelectorModal(false)}
                hitSlop={8}
                accessibilityLabel="Close bus selector"
              >
                <X size={20} color="#64748B" strokeWidth={2.2} />
              </Pressable>
            </View>

            {matchedStop && (
              <View style={styles.routeAwareNotice}>
                <MapPin size={13} color="#15803D" strokeWidth={2.4} />
                <Text style={styles.routeAwareNoticeText} numberOfLines={1}>
                  Route-aware filter active for {matchedStop.name.split('/')[0].trim()}
                </Text>
              </View>
            )}

            <ScrollView style={styles.servicesList} showsVerticalScrollIndicator={false}>
              {availableServiceDefinitions.map((service) => {
                const isSelected = effectiveSelectedBus?.busNumber === service.serviceNumber;
                const matchingLiveBus = buses.find((b) => b.busNumber === service.serviceNumber);

                return (
                  <Pressable
                    key={service.serviceNumber}
                    style={({ pressed }) => [
                      styles.serviceOptionCard,
                      isSelected && styles.serviceOptionCardSelected,
                      pressed && styles.serviceOptionCardPressed,
                    ]}
                    onPress={() => {
                      triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
                      if (matchingLiveBus) {
                        handleBusSelect(matchingLiveBus);
                      } else {
                        selectBus(service.serviceNumber as ChigariBusNumber);
                      }
                      setShowBusSelectorModal(false);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Select bus service ${service.serviceNumber}`}
                  >
                    <View style={styles.serviceCardTop}>
                      <View
                        style={[
                          styles.serviceBadge,
                          { backgroundColor: service.color || '#2E7D32' },
                        ]}
                      >
                        <Text style={styles.serviceBadgeText}>
                          {service.serviceNumber}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.serviceTypeTag,
                          service.isLimitedStop && styles.serviceTypeTagExpress,
                        ]}
                      >
                        <Text
                          style={[
                            styles.serviceTypeTagText,
                            service.isLimitedStop && styles.serviceTypeTagExpressText,
                          ]}
                        >
                          {service.isLimitedStop ? 'LIMITED-STOP EXPRESS' : 'ALL STOPS'}
                        </Text>
                      </View>

                      {isSelected && (
                        <View style={styles.selectedStatusBadge}>
                          <CheckCircle2 size={14} color="#15803D" strokeWidth={2.5} />
                          <Text style={styles.selectedStatusBadgeText}>Active</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.serviceOriginDestText} numberOfLines={2}>
                      {`${service.originStopName} ➔ ${service.destinationStopName}`}
                    </Text>
                  </Pressable>
                );
              })}

              {effectiveSelectedBus !== null && (
                <Pressable
                  style={({ pressed }) => [
                    styles.clearSelectionBtn,
                    pressed && styles.clearSelectionBtnPressed,
                  ]}
                  onPress={() => {
                    triggerHaptic();
                    selectBus(null);
                    setShowBusSelectorModal(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="View full corridor overview"
                >
                  <Text style={styles.clearSelectionBtnText}>
                    Clear Selection & View Full Corridor
                  </Text>
                </Pressable>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );

}

const styles = StyleSheet.create({
  topOverlay: {
    paddingHorizontal: Spacing.base,
    zIndex: 20,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.base,
    height: 48,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: '#EFF1F3',
    ...Shadows.medium,
  },
  searchTextInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: '#1F2937',
    paddingVertical: 0,
  },
  busSelectorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.button,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
    marginBottom: 6,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    ...Shadows.low,
  },
  busSelectorBarActive: {
    borderColor: '#15803D',
    backgroundColor: '#F0FDF4',
  },
  busSelectorBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  busSelectorActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#15803D',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    gap: 4,
  },
  busSelectorActivePillText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  busSelectorIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  busSelectorTextWrapper: {
    flex: 1,
  },
  busSelectorMainText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  busSelectorSubText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  busSelectorRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  busSelectorClearBtn: {
    padding: 4,
    borderRadius: Radius.pill,
    backgroundColor: '#F1F5F9',
  },
  busSelectorModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  busSelectorSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    maxHeight: '75%',
    ...Shadows.high,
  },
  sheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#CBD5E1',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sheetTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  sheetSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  sheetCloseBtn: {
    padding: 6,
    borderRadius: Radius.pill,
    backgroundColor: '#F1F5F9',
  },
  routeAwareNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  routeAwareNoticeText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: '#065F46',
    flex: 1,
  },
  servicesList: {
    marginTop: Spacing.sm,
  },
  serviceOptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    ...Shadows.low,
  },
  serviceOptionCardSelected: {
    borderColor: '#15803D',
    backgroundColor: '#F0FDF4',
  },
  serviceOptionCardPressed: {
    opacity: 0.85,
  },
  serviceCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  serviceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  serviceBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  serviceTypeTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  serviceTypeTagExpress: {
    backgroundColor: '#FEF3C7',
  },
  serviceTypeTagText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  serviceTypeTagExpressText: {
    color: '#B45309',
  },
  selectedStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  selectedStatusBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: '#15803D',
  },
  serviceOriginDestText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  clearSelectionBtn: {
    paddingVertical: 12,
    marginTop: 4,
    marginBottom: 12,
    borderRadius: Radius.md,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  clearSelectionBtnPressed: {
    opacity: 0.8,
  },
  clearSelectionBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: '#64748B',
  },
  quickControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    gap: 8,
  },
  networkStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    gap: 6,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    flex: 1,
    ...Shadows.low,
  },
  networkStatusText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: '#166534',
    flexShrink: 1,
  },
  quickButtonsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    gap: 5,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    ...Shadows.low,
  },
  quickActionBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: '#166534',
  },
  quickIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    ...Shadows.low,
  },
  /* ─── Station Details Card ─── */
  stationCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.card,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    ...Shadows.medium,
  },
  stationCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stationIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stationCardInfoCol: {
    flex: 1,
    gap: 2,
  },
  stationCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stationCardTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: '#0F172A',
    flexShrink: 1,
  },
  stopNumberPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  stopNumberPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: '#475569',
  },
  stationCardSubname: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: '#64748B',
  },
  stationCardTagline: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: '#0284C7',
  },
  stationCardCloseBtn: {
    padding: 6,
    borderRadius: Radius.pill,
    backgroundColor: '#F8FAFC',
  },
  stationCardServicesSection: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 6,
  },
  stationServicesLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: '#64748B',
  },
  stationServicesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  stationServiceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stationServiceChipActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  stationServiceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stationServiceChipText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: '#334155',
  },
  stationServiceChipTextActive: {
    color: '#15803D',
    fontFamily: FontFamily.bold,
  },
  floatingCardContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.base,
    zIndex: 20,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  /* ─── Part 1: Active Journey Banner & Modal Styles ─── */
  activeJourneyBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.card,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1.5,
    borderColor: '#C8E6C9',
    ...Shadows.medium,
  },
  activeJourneyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  activeJourneyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    gap: 6,
  },
  pulseDotAmber: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D97706',
  },
  activeJourneyPillTextAmber: {
    color: '#B45309',
    fontSize: 10,
    fontFamily: FontFamily.bold,
    letterSpacing: 0.5,
  },
  activeJourneyPillTextGreen: {
    color: '#1B5E20',
    fontSize: 10,
    fontFamily: FontFamily.bold,
    letterSpacing: 0.5,
  },
  activeJourneyPillTextBlue: {
    color: '#0369A1',
    fontSize: 10,
    fontFamily: FontFamily.bold,
    letterSpacing: 0.5,
  },
  cancelJourneyBtn: {
    padding: 4,
    borderRadius: Radius.full,
    backgroundColor: '#F3F4F6',
  },
  activeJourneyTitle: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
    color: '#1F2937',
    marginBottom: 2,
  },
  activeJourneySubtitle: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: '#4B5563',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  arrivalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.bottomSheet,
    padding: Spacing.xxl,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    ...Shadows.high,
  },
  arrivalIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.medium,
  },
  arrivalTitle: {
    fontSize: 22,
    fontFamily: FontFamily.bold,
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  arrivalSubtitle: {
    fontSize: 15,
    fontFamily: FontFamily.regular,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  enterBusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#2E7D32',
    width: '100%',
    paddingVertical: 16,
    borderRadius: Radius.button,
    ...Shadows.medium,
  },
  enterBusBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: FontFamily.bold,
  },
  /* ─── Part 2: Visual Announcement & Leave Here Styles ─── */
  announcementBanner: {
    position: 'absolute',
    left: Spacing.base,
    right: Spacing.base,
    zIndex: 25,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: Radius.card,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: '#334155',
    ...Shadows.high,
  },
  announcementIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  announcementTextWrapper: {
    flex: 1,
  },
  announcementBadgeText: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    color: '#4ADE80',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  announcementText: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    color: '#F8FAFC',
    lineHeight: 16,
  },
  leaveHereBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: Radius.button,
    marginTop: 10,
    ...Shadows.low,
  },
  leaveHereBannerBtnPulse: {
    backgroundColor: '#16A34A',
  },
  leaveHereBannerBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: FontFamily.bold,
  },
  arrivalStationName: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    color: '#16A34A',
    textAlign: 'center',
    marginBottom: 6,
  },
  completedTripSummaryBox: {
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: Radius.card,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
    marginBottom: Spacing.md,
    gap: 6,
  },
  completedRouteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#15803D',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    gap: 6,
  },
  completedRouteBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: FontFamily.bold,
  },
  completedRouteText: {
    color: '#1F2937',
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
    textAlign: 'center',
  },
  // ─── Compact Live Tracking UI Styles ───
  compactTopBar: {
    position: 'absolute',
    top: 0,
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.card,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadows.medium,
    gap: Spacing.xs,
  },
  compactBackBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactTopContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  compactBusPill: {
    backgroundColor: '#15803D',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  compactBusPillText: {
    color: '#FFFFFF',
    fontFamily: FontFamily.bold,
    fontSize: 12,
  },
  compactTitleColumn: {
    flex: 1,
  },
  compactTitleText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: '#0F172A',
  },
  compactSubtitleText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: '#64748B',
  },
  compactCenterBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactBottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    paddingHorizontal: Spacing.md,
  },
  compactBottomCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.high,
  },
  compactBottomLeft: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  compactStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  compactStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  compactStatusTag: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: '#475569',
    letterSpacing: 0.5,
  },
  compactRouteHeading: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: '#0F172A',
    marginBottom: 2,
  },
  compactDetailSubText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: '#64748B',
  },
  compactBottomRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactActionBtnLeave: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DC2626',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.button,
    ...Shadows.low,
  },
  compactActionBtnEnter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#15803D',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.button,
    ...Shadows.low,
  },
  compactActionBtnText: {
    color: '#FFFFFF',
    fontFamily: FontFamily.bold,
    fontSize: 13,
  },
  compactActionFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.low,
  },
});

