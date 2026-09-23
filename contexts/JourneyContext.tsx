import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { Coordinates, BRTSStop, ChigariBusNumber } from '@/types/transit';
import type { ChigariScannedTicket } from '@/types/ticket';
import {
  CHIGARI_CORRIDOR_ROUTE,
  CHIGARI_VERIFIED_STOPS,
} from '@/data/chigariRoute';
import {
  findStopById,
  findStopByName,
  calculateCorridorRoute,
} from '@/data/chigariStops';
import {
  getAvailableServicesForJourney,
  getAvailableServicesAtStop,
  CHIGARI_SERVICES,
  resolveStopNumber,
} from '@/services/busAvailabilityService';
import {
  getCumulativeDistances,
  interpolatePosition,
  calculateBearing,
  getRemainingCoordinates,
  haversineDistance,
} from '@/utils/transitGeometry';
import {
  speakAnnouncement,
  stopAllAnnouncements,
  generateAnnouncementText,
  getCleanStopName,
} from '@/services/announcementService';
import { saveScannedTicket } from '@/services/ticketScanner';
import { updateDigitalTicketStatus } from '@/services/ticketHistory';
import { useLanguage } from '@/contexts/LanguageContext';

export type JourneyState =
  | 'idle'
  | 'waiting_for_bus'
  | 'bus_arrived'
  | 'on_bus'
  | 'journey_completed';

export interface VisualAnnouncement {
  text: string;
  type: 'departure' | 'next_stop' | 'destination_approaching' | 'destination_reached';
  timestamp: number;
}

export interface ActiveJourney {
  ticket: ChigariScannedTicket;
  busNumber: ChigariBusNumber;
  routeName: string;
  routeColor: string;
  boardingStop: BRTSStop;
  destinationStop: BRTSStop;
  intermediateStops: BRTSStop[];
  isReverse: boolean;
  busProgressMeters: number;
  busCoordinates: Coordinates;
  busHeading: number;
  busSpeed: number; // in km/h
  distanceToBoarding: number; // in meters
  distanceToDestination: number; // in meters
  currentStop: BRTSStop;
  nextStop: BRTSStop;
  distanceToNextStop: number;
  startedAt: string;
  journeyCoordinates: Coordinates[];
  remainingCoordinates: Coordinates[];
  totalJourneyDistanceMeters: number;
}

export interface JourneyContextType {
  journeyState: JourneyState;
  activeJourney: ActiveJourney | null;
  currentAnnouncement: VisualAnnouncement | null;
  isArrivalModalVisible: boolean;
  isApproachingDestination: boolean;
  isDestinationReached: boolean;
  isCompletedModalVisible: boolean;
  startJourney: (ticket: ChigariScannedTicket, preferredBusNumber?: string) => boolean;
  enterBus: () => void;
  leaveBus: () => Promise<void>;
  dismissArrivalModal: () => void;
  dismissCompletedModal: () => void;
  resetJourney: () => void;
  cancelJourney: () => void;
}

const JourneyContext = createContext<JourneyContextType | undefined>(undefined);

// Simulation tick interval: 200ms
const UPDATE_INTERVAL_MS = 200;

export function JourneyProvider({ children }: { children: React.ReactNode }) {
  const { language } = useLanguage();
  const [journeyState, setJourneyState] = useState<JourneyState>('idle');
  const [activeJourney, setActiveJourney] = useState<ActiveJourney | null>(null);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<VisualAnnouncement | null>(null);
  const [isArrivalModalVisible, setIsArrivalModalVisible] = useState<boolean>(false);
  const [isApproachingDestination, setIsApproachingDestination] = useState<boolean>(false);
  const [isDestinationReached, setIsDestinationReached] = useState<boolean>(false);
  const [isCompletedModalVisible, setIsCompletedModalVisible] = useState<boolean>(false);

  // Set of stop IDs that have already been announced to prevent duplicates
  const announcedStopIdsRef = useRef<Set<string>>(new Set());

  // Precomputed cumulative distance array along the corridor
  const cumDistancesRef = useRef<number[]>(
    getCumulativeDistances(CHIGARI_CORRIDOR_ROUTE.coordinates),
  );

  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' = 'light') => {
    if (Platform.OS === 'web') return;
    try {
      if (type === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (type === 'warning') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else if (type === 'heavy') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else if (type === 'medium') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {
      // safe fallback
    }
  };

  /**
   * Starts a new journey from a ticket and sets the demo bus 100 meters away.
   */
  const startJourney = useCallback(
    (ticket: ChigariScannedTicket, preferredBusNumber?: string): boolean => {
      if (ticket.status === 'Expired' || ticket.validityStatus === 'EXPIRED') {
        triggerHaptic('warning');
        return false;
      }

      // Reset announcement tracking
      announcedStopIdsRef.current = new Set();
      setCurrentAnnouncement(null);
      setIsApproachingDestination(false);
      setIsDestinationReached(false);
      setIsCompletedModalVisible(false);

      // 1. Resolve boarding and destination stations
      const boardingStop =
        findStopById(ticket.fromStopId) ||
        findStopByName(ticket.fromStopName) ||
        CHIGARI_VERIFIED_STOPS[0];

      const destinationStop =
        findStopById(ticket.toStopId) ||
        findStopByName(ticket.toStopName) ||
        CHIGARI_VERIFIED_STOPS[CHIGARI_VERIFIED_STOPS.length - 1];

      // 2. Determine ordered intermediate stops along the travel route
      const plannedRoute = calculateCorridorRoute(boardingStop, destinationStop);

      // 3. Determine eligible service and bus number
      const services = getAvailableServicesForJourney(
        boardingStop.name,
        destinationStop.name,
      );

      let eligibleBusNumber: ChigariBusNumber = '200A';
      if (
        preferredBusNumber &&
        ['200A', '201B', '100D', '202C'].includes(preferredBusNumber)
      ) {
        eligibleBusNumber = preferredBusNumber as ChigariBusNumber;
      } else if (services.length > 0) {
        eligibleBusNumber = services[0].serviceNumber as ChigariBusNumber;
      } else {
        const atStop = getAvailableServicesAtStop(boardingStop.name);
        if (atStop.length > 0) {
          eligibleBusNumber = atStop[0].serviceNumber as ChigariBusNumber;
        }
      }

      // Filter intermediate stops if limited-stop service (100D)
      let intermediateStops = plannedRoute.intermediateStops;
      if (eligibleBusNumber === '100D') {
        const serviceDef = CHIGARI_SERVICES.find((s) => s.serviceNumber === '100D');
        if (serviceDef) {
          intermediateStops = intermediateStops.filter((stop) => {
            const stopNum = resolveStopNumber(stop);
            return stopNum !== null && serviceDef.stopNumbers.includes(stopNum);
          });
        }
      }

      // 4. Direction & 100m Bus Approach Position
      const isReverse = boardingStop.distanceAlongRoute > destinationStop.distanceAlongRoute;
      const cumDistances = cumDistancesRef.current;
      const totalDistance = cumDistances[cumDistances.length - 1];

      let initialProgress: number;
      let initialCoords: Coordinates;
      let initialHeading: number;

      if (!isReverse) {
        if (boardingStop.distanceAlongRoute >= 100) {
          initialProgress = boardingStop.distanceAlongRoute - 100;
          const interp = interpolatePosition(CHIGARI_CORRIDOR_ROUTE.coordinates, cumDistances, initialProgress, false);
          initialCoords = interp.position;
          initialHeading = interp.heading;
        } else {
          initialProgress = 0;
          initialCoords = {
            latitude: boardingStop.latitude - 100 / 111320,
            longitude: boardingStop.longitude,
          };
          initialHeading = 330;
        }
      } else {
        if (boardingStop.distanceAlongRoute <= totalDistance - 100) {
          initialProgress = boardingStop.distanceAlongRoute + 100;
          const interp = interpolatePosition(CHIGARI_CORRIDOR_ROUTE.coordinates, cumDistances, initialProgress, true);
          initialCoords = interp.position;
          initialHeading = interp.heading;
        } else {
          initialProgress = totalDistance;
          initialCoords = {
            latitude: boardingStop.latitude + 100 / 111320,
            longitude: boardingStop.longitude,
          };
          initialHeading = 150;
        }
      }

      const distToDest = Math.abs(
        boardingStop.distanceAlongRoute - destinationStop.distanceAlongRoute,
      );

      const colorMap: Record<ChigariBusNumber, string> = {
        '200A': '#2E7D32',
        '201B': '#1B5E20',
        '100D': '#388E3C',
        '202C': '#43A047',
        '202D': '#43A047',
      };

      const firstNextStop = intermediateStops[1] || destinationStop;

      const newJourney: ActiveJourney = {
        ticket,
        busNumber: eligibleBusNumber,
        routeName: `Chigari ${eligibleBusNumber} • ${boardingStop.name.split('/')[0].trim()} ➔ ${destinationStop.name.split('/')[0].trim()}`,
        routeColor: colorMap[eligibleBusNumber] || '#2E7D32',
        boardingStop,
        destinationStop,
        intermediateStops,
        isReverse,
        busProgressMeters: initialProgress,
        busCoordinates: initialCoords,
        busHeading: initialHeading,
        busSpeed: 25,
        distanceToBoarding: 100,
        distanceToDestination: distToDest,
        currentStop: boardingStop,
        nextStop: firstNextStop,
        distanceToNextStop: Math.abs(boardingStop.distanceAlongRoute - firstNextStop.distanceAlongRoute),
        startedAt: new Date().toISOString(),
        journeyCoordinates: plannedRoute.coordinates,
        remainingCoordinates: plannedRoute.coordinates,
        totalJourneyDistanceMeters: distToDest,
      };

      setActiveJourney(newJourney);
      setJourneyState('waiting_for_bus');
      setIsArrivalModalVisible(false);
      triggerHaptic('medium');

      // Update digital ticket status to IN_JOURNEY
      if (ticket.ticketId) {
        updateDigitalTicketStatus(ticket.ticketId, 'IN_JOURNEY');
      }

      return true;
    },
    [],
  );

  /**
   * Called when user taps "Enter Bus" on arrival modal.
   * Plays Boarding/Departure Announcement and transitions state to "on_bus".
   */
  const enterBus = useCallback(() => {
    triggerHaptic('success');
    setIsArrivalModalVisible(false);
    setJourneyState('on_bus');

    if (activeJourney) {
      const lang = (language || 'en') as 'en' | 'kn' | 'hi';
      const cleanStation = getCleanStopName(activeJourney.boardingStop, lang);
      const spokenText = generateAnnouncementText({
        type: 'departure',
        stationName: cleanStation,
        busNumber: activeJourney.busNumber,
        language: lang,
      });

      speakAnnouncement(spokenText, lang);
      setCurrentAnnouncement({
        text: spokenText,
        type: 'departure',
        timestamp: Date.now(),
      });
    }
  }, [activeJourney, language]);

  /**
   * Called when user taps "Leave Here".
   * Stops simulation, silences announcements, records completion, and shows Thank You.
   */
  const leaveBus = useCallback(async () => {
    if (journeyState === 'journey_completed') return;

    triggerHaptic('success');
    await stopAllAnnouncements();

    setJourneyState('journey_completed');
    setIsDestinationReached(false);
    setIsApproachingDestination(false);
    setIsCompletedModalVisible(true);

    if (activeJourney?.ticket) {
      try {
        const updatedTicket: ChigariScannedTicket = {
          ...activeJourney.ticket,
          status: 'Expired',
          validityStatus: 'EXPIRED',
          statusReason: 'Journey completed successfully (Leave Here).',
        };
        await saveScannedTicket(updatedTicket);
        if (activeJourney.ticket.ticketId) {
          await updateDigitalTicketStatus(activeJourney.ticket.ticketId, 'EXPIRED');
        }
      } catch (err) {
        console.warn('[JourneyContext] Failed to record ticket completion:', err);
      }
    }
  }, [journeyState, activeJourney]);

  const dismissArrivalModal = useCallback(() => {
    setIsArrivalModalVisible(false);
  }, []);

  const dismissCompletedModal = useCallback(async () => {
    triggerHaptic('light');
    await stopAllAnnouncements();
    setIsCompletedModalVisible(false);
    setActiveJourney(null);
    setJourneyState('idle');
    setCurrentAnnouncement(null);
    announcedStopIdsRef.current = new Set();
  }, []);

  const resetJourney = useCallback(async () => {
    triggerHaptic('light');
    await stopAllAnnouncements();
    setActiveJourney(null);
    setJourneyState('idle');
    setIsArrivalModalVisible(false);
    setIsApproachingDestination(false);
    setIsDestinationReached(false);
    setIsCompletedModalVisible(false);
    setCurrentAnnouncement(null);
    announcedStopIdsRef.current = new Set();
  }, []);

  const cancelJourney = useCallback(async () => {
    triggerHaptic('medium');
    await stopAllAnnouncements();
    setActiveJourney(null);
    setJourneyState('idle');
    setIsArrivalModalVisible(false);
    setIsApproachingDestination(false);
    setIsDestinationReached(false);
    setIsCompletedModalVisible(false);
    setCurrentAnnouncement(null);
    announcedStopIdsRef.current = new Set();
  }, []);

  // ─── Realistic Demo Journey Simulation Loop ─────
  useEffect(() => {
    if (journeyState !== 'waiting_for_bus' && journeyState !== 'on_bus') {
      return;
    }

    const interval = setInterval(() => {
      setActiveJourney((prev) => {
        if (!prev) return null;

        const cumDistances = cumDistancesRef.current;
        const totalDist = cumDistances[cumDistances.length - 1];

        // ─── PHASE 1: Bus Approach to Boarding Station (100m ➔ 0m) ───
        if (journeyState === 'waiting_for_bus') {
          const stepMeters = 10; // 10m per 200ms tick (~50 km/h demo pace, reaches in ~2s)
          const newDistToBoarding = Math.max(0, prev.distanceToBoarding - stepMeters);

          let newProgress: number;
          let interp: { position: Coordinates; heading: number };

          if (!prev.isReverse) {
            newProgress = Math.max(0, prev.boardingStop.distanceAlongRoute - newDistToBoarding);
            interp = interpolatePosition(CHIGARI_CORRIDOR_ROUTE.coordinates, cumDistances, newProgress, false);
          } else {
            newProgress = Math.min(totalDist, prev.boardingStop.distanceAlongRoute + newDistToBoarding);
            interp = interpolatePosition(CHIGARI_CORRIDOR_ROUTE.coordinates, cumDistances, newProgress, true);
          }

          if (newDistToBoarding <= 0) {
            // Bus arrived at boarding station!
            setJourneyState('bus_arrived');
            setIsArrivalModalVisible(true);
            triggerHaptic('heavy');

            const lang = (language || 'en') as 'en' | 'kn' | 'hi';
            const cleanStation = getCleanStopName(prev.boardingStop, lang);
            const arrivalText = generateAnnouncementText({
              type: 'bus_arrived_boarding',
              stationName: cleanStation,
              busNumber: prev.busNumber,
              language: lang,
            });
            speakAnnouncement(arrivalText, lang);
            setCurrentAnnouncement({
              text: arrivalText,
              type: 'departure',
              timestamp: Date.now(),
            });

            return {
              ...prev,
              distanceToBoarding: 0,
              busProgressMeters: prev.boardingStop.distanceAlongRoute,
              busCoordinates: {
                latitude: prev.boardingStop.latitude,
                longitude: prev.boardingStop.longitude,
              },
              busSpeed: 0,
            };
          }

          return {
            ...prev,
            distanceToBoarding: newDistToBoarding,
            busProgressMeters: newProgress,
            busCoordinates: interp.position,
            busHeading: interp.heading,
            busSpeed: 25,
          };
        }

        // ─── PHASE 2: Bus In Transit with Passenger Onboard ('on_bus') ───
        if (journeyState === 'on_bus') {
          if (isDestinationReached) {
            return prev;
          }

          const speedKmh = 35;
          const stepMeters = 25; // 25m per 200ms tick (~45 km/h)
          const destDistAlongRoute = prev.destinationStop.distanceAlongRoute;

          let newProgress = prev.isReverse
            ? prev.busProgressMeters - stepMeters
            : prev.busProgressMeters + stepMeters;

          const hasReached = prev.isReverse
            ? newProgress <= destDistAlongRoute + 8
            : newProgress >= destDistAlongRoute - 8;

          if (hasReached) {
            setIsDestinationReached(true);
            triggerHaptic('success');

            const lang = (language || 'en') as 'en' | 'kn' | 'hi';
            const cleanDest = getCleanStopName(prev.destinationStop, lang);
            const destText = generateAnnouncementText({
              type: 'destination_reached',
              stationName: cleanDest,
              busNumber: prev.busNumber,
              language: lang,
            });
            speakAnnouncement(destText, lang);
            setCurrentAnnouncement({
              text: destText,
              type: 'destination_reached',
              timestamp: Date.now(),
            });

            return {
              ...prev,
              busProgressMeters: destDistAlongRoute,
              busCoordinates: {
                latitude: prev.destinationStop.latitude,
                longitude: prev.destinationStop.longitude,
              },
              busSpeed: 0,
              distanceToDestination: 0,
              remainingCoordinates: [],
            };
          }

          const interp = interpolatePosition(
            CHIGARI_CORRIDOR_ROUTE.coordinates,
            cumDistances,
            newProgress,
            prev.isReverse,
          );

          const remainingDistToDest = Math.abs(newProgress - destDistAlongRoute);
          const distanceTraveled = Math.max(0, prev.totalJourneyDistanceMeters - remainingDistToDest);
          const remainingCoords = getRemainingCoordinates(
            prev.journeyCoordinates,
            interp.position,
            distanceTraveled,
            prev.totalJourneyDistanceMeters,
          );

          let currentStop = prev.boardingStop;
          let nextStop = prev.destinationStop;

          for (let i = 0; i < prev.intermediateStops.length; i++) {
            const stop = prev.intermediateStops[i];
            const isAhead = prev.isReverse
              ? stop.distanceAlongRoute < newProgress
              : stop.distanceAlongRoute > newProgress;

            if (isAhead) {
              nextStop = stop;
              currentStop = prev.intermediateStops[Math.max(0, i - 1)];
              break;
            }
          }

          // Next Station Announcement (~450m before reaching station)
          const lang = (language || 'en') as 'en' | 'kn' | 'hi';
          for (const stop of prev.intermediateStops) {
            const distToStop = haversineDistance(interp.position, {
              latitude: stop.latitude,
              longitude: stop.longitude,
            });

            if (distToStop <= 450 && !announcedStopIdsRef.current.has(stop.id)) {
              announcedStopIdsRef.current.add(stop.id);

              const isFinalStop = stop.id === prev.destinationStop.id;
              const cleanStopName = getCleanStopName(stop, lang);

              if (isFinalStop) {
                setIsApproachingDestination(true);
                const announceText = generateAnnouncementText({
                  type: 'destination_approaching',
                  stationName: cleanStopName,
                  busNumber: prev.busNumber,
                  language: lang,
                });
                speakAnnouncement(announceText, lang);
                setCurrentAnnouncement({
                  text: announceText,
                  type: 'destination_approaching',
                  timestamp: Date.now(),
                });
              } else {
                const announceText = generateAnnouncementText({
                  type: 'next_stop',
                  stationName: cleanStopName,
                  busNumber: prev.busNumber,
                  language: lang,
                });
                speakAnnouncement(announceText, lang);
                setCurrentAnnouncement({
                  text: announceText,
                  type: 'next_stop',
                  timestamp: Date.now(),
                });
              }
              break;
            }
          }

          return {
            ...prev,
            busProgressMeters: newProgress,
            busCoordinates: interp.position,
            busHeading: interp.heading,
            busSpeed: speedKmh,
            distanceToDestination: remainingDistToDest,
            currentStop,
            nextStop,
            distanceToNextStop: Math.abs(newProgress - nextStop.distanceAlongRoute),
            remainingCoordinates: remainingCoords,
          };
        }

        return prev;
      });
    }, UPDATE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [journeyState, isDestinationReached, language]);

  const value: JourneyContextType = {
    journeyState,
    activeJourney,
    currentAnnouncement,
    isArrivalModalVisible,
    isApproachingDestination,
    isDestinationReached,
    isCompletedModalVisible,
    startJourney,
    enterBus,
    leaveBus,
    dismissArrivalModal,
    dismissCompletedModal,
    resetJourney,
    cancelJourney,
  };

  return (
    <JourneyContext.Provider value={value}>
      {children}
    </JourneyContext.Provider>
  );
}

export function useJourney(): JourneyContextType {
  const context = useContext(JourneyContext);
  if (!context) {
    throw new Error('useJourney must be used within a JourneyProvider');
  }
  return context;
}
