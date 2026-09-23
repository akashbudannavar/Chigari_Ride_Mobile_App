import React, { forwardRef, useImperativeHandle, useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text as RNText,
  Pressable,
  PanResponder,
  Platform,
  Dimensions,
} from 'react-native';
import Svg, { G, Circle, Rect, Line, Polyline as SvgPolyline, Text as SvgText } from 'react-native-svg';
import { Navigation } from 'lucide-react-native';
import type { ChigariBus, ChigariRoute, Coordinates, BRTSStop } from '@/types/transit';
import { FontFamily, Shadows, Colors } from '@/constants/theme';
import {
  HDBRTS_TRUNK_COORDINATES,
  HDBRTS_CBT_BRANCH_COORDINATES,
  HDBRTS_RAILWAY_COORDINATES,
  HDBRTS_DHARWAD_BRTS_BRANCH_COORDINATES,
  HDBRTS_DHARWAD_NEW_BRANCH_COORDINATES,
  HDBRTS_GOKUL_BRANCH_COORDINATES,
  CHIGARI_VERIFIED_STOPS,
} from '@/data/chigariRoute';

export interface LiveTrackingMapRef {
  centerOnBus: (bus: ChigariBus) => void;
  centerOnRoute: () => void;
}

export interface LiveTrackingMapProps {
  buses: ChigariBus[];
  selectedBus: ChigariBus | null;
  activeRoute: ChigariRoute;
  userLocation: Coordinates & { title: string; subtitle: string };
  onSelectBus: (bus: ChigariBus) => void;
  onSelectStop?: (stop: BRTSStop) => void;
  selectedStop?: BRTSStop | null;
  isJourneyActive?: boolean;
  remainingCoordinates?: Coordinates[];
  journeyCoordinates?: Coordinates[];
  ticketOriginStop?: BRTSStop;
  ticketDestinationStop?: BRTSStop;
  intermediateStops?: BRTSStop[];
}

// Bounding box covering the complete Hubballi-Dharwad BRTS Corridor (~22.25 km)
const LAT_MIN = 15.3400;
const LAT_MAX = 15.4700;
const LNG_MIN = 75.0000;
const LNG_MAX = 75.1550;

function baseProjectX(lng: number, width: number): number {
  const padding = 36;
  const usableWidth = width - padding * 2;
  return padding + ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * usableWidth;
}

function baseProjectY(lat: number, height: number): number {
  const padding = 48;
  const usableHeight = height - padding * 2;
  return padding + ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * usableHeight;
}

export const LiveTrackingMapVector = forwardRef<LiveTrackingMapRef, LiveTrackingMapProps>(
  (
    {
      buses,
      selectedBus,
      activeRoute,
      userLocation,
      onSelectBus,
      onSelectStop,
      selectedStop,
      isJourneyActive,
      remainingCoordinates,
      journeyCoordinates,
      ticketOriginStop,
      ticketDestinationStop,
      intermediateStops,
    },
    ref,
  ) => {
    const windowDim = Dimensions.get('window');
    const [canvasWidth, setCanvasWidth] = useState(windowDim.width);
    const [canvasHeight, setCanvasHeight] = useState(windowDim.height);

    const [scale, setScale] = useState(1.0);
    const [panX, setPanX] = useState(0);
    const [panY, setPanY] = useState(0);
    const hasInitiallyFramed = useRef(false);

    // Initial camera positioning: frames route ONCE on initial load, then STOPS automatic movement
    useEffect(() => {
      if (hasInitiallyFramed.current) return;
      if (canvasWidth <= 0 || canvasHeight <= 0) return;

      if (isJourneyActive && ticketOriginStop && ticketDestinationStop) {
        hasInitiallyFramed.current = true;
        const minLat = Math.min(ticketOriginStop.latitude, ticketDestinationStop.latitude);
        const maxLat = Math.max(ticketOriginStop.latitude, ticketDestinationStop.latitude);
        const minLng = Math.min(ticketOriginStop.longitude, ticketDestinationStop.longitude);
        const maxLng = Math.max(ticketOriginStop.longitude, ticketDestinationStop.longitude);

        const midLat = (minLat + maxLat) / 2;
        const midLng = (minLng + maxLng) / 2;

        const latSpan = Math.max(0.015, maxLat - minLat);
        const lngSpan = Math.max(0.015, maxLng - minLng);
        const latRatio = (LAT_MAX - LAT_MIN) / latSpan;
        const lngRatio = (LNG_MAX - LNG_MIN) / lngSpan;
        const targetScale = Math.min(Math.max(Math.min(latRatio, lngRatio) * 0.45, 1.2), 2.8);

        const bx = baseProjectX(midLng, canvasWidth);
        const by = baseProjectY(midLat, canvasHeight);

        const targetPanX = (canvasWidth / 2 - bx) * targetScale;
        const targetPanY = (canvasHeight / 2 - by) * targetScale;

        setScale(targetScale);
        setPanX(targetPanX);
        setPanY(targetPanY);
      } else if (!isJourneyActive && selectedBus) {
        hasInitiallyFramed.current = true;
        const targetScale = 1.6;
        const bx = baseProjectX(selectedBus.longitude, canvasWidth);
        const by = baseProjectY(selectedBus.latitude, canvasHeight);

        const targetPanX = (canvasWidth / 2 - bx) * targetScale;
        const targetPanY = (canvasHeight / 2 - by) * targetScale;

        setScale(targetScale);
        setPanX(targetPanX);
        setPanY(targetPanY);
      }
    }, [isJourneyActive, ticketOriginStop?.id, ticketDestinationStop?.id, selectedBus?.busNumber, canvasWidth, canvasHeight]);

    const gestureStateRef = useRef({
      initialTouchDistance: 0,
      initialScale: 1.0,
      panStartX: 0,
      panStartY: 0,
      isPinching: false,
    });

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_evt, gestureState) => {
          return Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2;
        },
        onPanResponderGrant: (evt) => {
          const touches = evt.nativeEvent.touches;
          if (touches && touches.length >= 2) {
            const dx = touches[0].pageX - touches[1].pageX;
            const dy = touches[0].pageY - touches[1].pageY;
            gestureStateRef.current = {
              initialTouchDistance: Math.hypot(dx, dy),
              initialScale: scale,
              panStartX: panX,
              panStartY: panY,
              isPinching: true,
            };
          } else {
            gestureStateRef.current = {
              initialTouchDistance: 0,
              initialScale: scale,
              panStartX: panX,
              panStartY: panY,
              isPinching: false,
            };
          }
        },
        onPanResponderMove: (evt, gestureState) => {
          const touches = evt.nativeEvent.touches;
          if (touches && touches.length >= 2) {
            // Natural 2-finger pinch-to-zoom gesture
            const dx = touches[0].pageX - touches[1].pageX;
            const dy = touches[0].pageY - touches[1].pageY;
            const currentDist = Math.hypot(dx, dy);
            if (gestureStateRef.current.initialTouchDistance > 0) {
              const pinchRatio = currentDist / gestureStateRef.current.initialTouchDistance;
              const newScale = Math.min(Math.max(gestureStateRef.current.initialScale * pinchRatio, 0.8), 5.0);
              setScale(newScale);
            }
          } else if (!gestureStateRef.current.isPinching) {
            // Natural 1-finger drag/pan gesture
            setPanX(gestureStateRef.current.panStartX + gestureState.dx);
            setPanY(gestureStateRef.current.panStartY + gestureState.dy);
          }
        },
        onPanResponderRelease: () => {
          gestureStateRef.current.isPinching = false;
        },
      })
    ).current;

    // Center on specific bus with smooth focal scaling
    const centerOnBus = useCallback(
      (bus: ChigariBus) => {
        const targetScale = 2.0;
        const bx = baseProjectX(bus.longitude, canvasWidth);
        const by = baseProjectY(bus.latitude, canvasHeight);

        // Calculate pan required to place bus at viewport center
        const targetPanX = (canvasWidth / 2 - bx) * targetScale;
        const targetPanY = (canvasHeight / 2 - by) * targetScale;

        setScale(targetScale);
        setPanX(targetPanX);
        setPanY(targetPanY);
      },
      [canvasWidth, canvasHeight]
    );

    // Reset viewport to frame the whole HDBRTS corridor
    const centerOnRoute = useCallback(() => {
      setScale(1.0);
      setPanX(0);
      setPanY(0);
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        centerOnBus,
        centerOnRoute,
      }),
      [centerOnBus, centerOnRoute]
    );

    // Transform raw GPS to canvas screen pixels with pan & scale
    const toScreenX = (lng: number) => {
      const bx = baseProjectX(lng, canvasWidth);
      return (bx - canvasWidth / 2) * scale + canvasWidth / 2 + panX;
    };

    const toScreenY = (lat: number) => {
      const by = baseProjectY(lat, canvasHeight);
      return (by - canvasHeight / 2) * scale + canvasHeight / 2 + panY;
    };

    // In network overview mode: display ALL 36 official verified stations (all 35 numbered stations)
    // In ticket journey mode: highlight/filter to ticket route stops
    const displayedStops = useMemo(() => {
      if (!isJourneyActive) return CHIGARI_VERIFIED_STOPS;
      if (intermediateStops && intermediateStops.length > 0) return intermediateStops;
      if (ticketOriginStop && ticketDestinationStop) {
        const minOrder = Math.min(ticketOriginStop.order, ticketDestinationStop.order);
        const maxOrder = Math.max(ticketOriginStop.order, ticketDestinationStop.order);
        return CHIGARI_VERIFIED_STOPS.filter((s) => s.order >= minOrder && s.order <= maxOrder);
      }
      return CHIGARI_VERIFIED_STOPS;
    }, [isJourneyActive, intermediateStops, ticketOriginStop, ticketDestinationStop]);

    // In ticket tracking mode, only show the active journey bus
    const displayedBuses = useMemo(() => {
      if (isJourneyActive && selectedBus) {
        const found = buses.find((b) => b.busNumber === selectedBus.busNumber);
        return found ? [found] : [selectedBus];
      }
      return buses;
    }, [isJourneyActive, selectedBus, buses]);

    // Precalculate polyline screen point strings (geographically fixed route)
    const journeyPoints = useMemo(() => {
      const coords = journeyCoordinates && journeyCoordinates.length >= 2 ? journeyCoordinates : remainingCoordinates;
      if (isJourneyActive && coords && coords.length >= 2) {
        return coords
          .map((c) => `${toScreenX(c.longitude)},${toScreenY(c.latitude)}`)
          .join(' ');
      }
      return '';
    }, [isJourneyActive, journeyCoordinates, remainingCoordinates, canvasWidth, canvasHeight, scale, panX, panY]);

    // Network branches (clean road geometry without duplicate parallel lines)
    const trunkPoints = useMemo(() => {
      if (isJourneyActive) return '';
      return HDBRTS_TRUNK_COORDINATES
        .map((c) => `${toScreenX(c.longitude)},${toScreenY(c.latitude)}`)
        .join(' ');
    }, [isJourneyActive, canvasWidth, canvasHeight, scale, panX, panY]);

    const cbtBranchPoints = useMemo(() => {
      if (isJourneyActive) return '';
      return HDBRTS_CBT_BRANCH_COORDINATES
        .map((c) => `${toScreenX(c.longitude)},${toScreenY(c.latitude)}`)
        .join(' ');
    }, [isJourneyActive, canvasWidth, canvasHeight, scale, panX, panY]);

    const railwayBranchPoints = useMemo(() => {
      if (isJourneyActive) return '';
      return HDBRTS_RAILWAY_COORDINATES
        .map((c) => `${toScreenX(c.longitude)},${toScreenY(c.latitude)}`)
        .join(' ');
    }, [isJourneyActive, canvasWidth, canvasHeight, scale, panX, panY]);

    const dharwadBrtsBranchPoints = useMemo(() => {
      if (isJourneyActive) return '';
      return HDBRTS_DHARWAD_BRTS_BRANCH_COORDINATES
        .map((c) => `${toScreenX(c.longitude)},${toScreenY(c.latitude)}`)
        .join(' ');
    }, [isJourneyActive, canvasWidth, canvasHeight, scale, panX, panY]);

    const dharwadNewBranchPoints = useMemo(() => {
      if (isJourneyActive) return '';
      return HDBRTS_DHARWAD_NEW_BRANCH_COORDINATES
        .map((c) => `${toScreenX(c.longitude)},${toScreenY(c.latitude)}`)
        .join(' ');
    }, [isJourneyActive, canvasWidth, canvasHeight, scale, panX, panY]);

    const gokulBranchPoints = useMemo(() => {
      if (isJourneyActive) return '';
      return HDBRTS_GOKUL_BRANCH_COORDINATES
        .map((c) => `${toScreenX(c.longitude)},${toScreenY(c.latitude)}`)
        .join(' ');
    }, [isJourneyActive, canvasWidth, canvasHeight, scale, panX, panY]);

    return (
      <View
        style={styles.container}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          if (width > 0 && height > 0) {
            setCanvasWidth(width);
            setCanvasHeight(height);
          }
        }}
        {...panResponder.panHandlers}
      >
        <Svg width={canvasWidth} height={canvasHeight} style={StyleSheet.absoluteFillObject}>
          {/* Background Canvas */}
          <Rect x={0} y={0} width={canvasWidth} height={canvasHeight} fill="#F1F5F9" />

          {/* Grid lines for spatial orientation */}
          {Array.from({ length: 12 }).map((_, i) => (
            <Line
              key={`h-${i}`}
              x1={0}
              y1={(canvasHeight / 12) * i}
              x2={canvasWidth}
              y2={(canvasHeight / 12) * i}
              stroke="#E2E8F0"
              strokeWidth={1}
            />
          ))}
          {Array.from({ length: 8 }).map((_, i) => (
            <Line
              key={`v-${i}`}
              x1={(canvasWidth / 8) * i}
              y1={0}
              x2={(canvasWidth / 8) * i}
              y2={canvasHeight}
              stroke="#E2E8F0"
              strokeWidth={1}
            />
          ))}

          {/* ─── Route Polylines: Clean branched network without parallel overlapping lines ─── */}
          {isJourneyActive ? (
            journeyPoints ? (
              <>
                <SvgPolyline
                  points={journeyPoints}
                  fill="none"
                  stroke="#14532D"
                  strokeWidth={scale >= 2 ? 10 : 8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <SvgPolyline
                  points={journeyPoints}
                  fill="none"
                  stroke="#16A34A"
                  strokeWidth={scale >= 2 ? 6 : 4.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            ) : null
          ) : (
            <>
              {/* Main Trunk Corridor: Ambedkar Circle ↔ Jubilee Circle */}
              {trunkPoints ? (
                <>
                  <SvgPolyline
                    points={trunkPoints}
                    fill="none"
                    stroke="#14532D"
                    strokeWidth={scale >= 2 ? 10 : 8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <SvgPolyline
                    points={trunkPoints}
                    fill="none"
                    stroke="#16A34A"
                    strokeWidth={scale >= 2 ? 6 : 4.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              ) : null}

              {/* South Branch A: Ambedkar Circle ➔ Hubballi CBT */}
              {cbtBranchPoints ? (
                <>
                  <SvgPolyline
                    points={cbtBranchPoints}
                    fill="none"
                    stroke="#14532D"
                    strokeWidth={scale >= 2 ? 9 : 7.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <SvgPolyline
                    points={cbtBranchPoints}
                    fill="none"
                    stroke="#16A34A"
                    strokeWidth={scale >= 2 ? 5.5 : 4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              ) : null}

              {/* South Branch B: Ambedkar Circle ➔ Hubballi Railway Station */}
              {railwayBranchPoints ? (
                <>
                  <SvgPolyline
                    points={railwayBranchPoints}
                    fill="none"
                    stroke="#14532D"
                    strokeWidth={scale >= 2 ? 9 : 7.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <SvgPolyline
                    points={railwayBranchPoints}
                    fill="none"
                    stroke="#16A34A"
                    strokeWidth={scale >= 2 ? 5.5 : 4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              ) : null}

              {/* North Branch A: Jubilee Circle ➔ Dharwad BRTS Terminal */}
              {dharwadBrtsBranchPoints ? (
                <>
                  <SvgPolyline
                    points={dharwadBrtsBranchPoints}
                    fill="none"
                    stroke="#14532D"
                    strokeWidth={scale >= 2 ? 9 : 7.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <SvgPolyline
                    points={dharwadBrtsBranchPoints}
                    fill="none"
                    stroke="#16A34A"
                    strokeWidth={scale >= 2 ? 5.5 : 4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              ) : null}

              {/* North Branch B: Jubilee Circle ➔ Dharwad New Bus Stand */}
              {dharwadNewBranchPoints ? (
                <>
                  <SvgPolyline
                    points={dharwadNewBranchPoints}
                    fill="none"
                    stroke="#14532D"
                    strokeWidth={scale >= 2 ? 9 : 7.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <SvgPolyline
                    points={dharwadNewBranchPoints}
                    fill="none"
                    stroke="#16A34A"
                    strokeWidth={scale >= 2 ? 5.5 : 4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              ) : null}

              {/* Gokul Branch: Hosur Cross ➔ Gokul Bus Station */}
              {gokulBranchPoints ? (
                <>
                  <SvgPolyline
                    points={gokulBranchPoints}
                    fill="none"
                    stroke="#14532D"
                    strokeWidth={scale >= 2 ? 9 : 7.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <SvgPolyline
                    points={gokulBranchPoints}
                    fill="none"
                    stroke="#16A34A"
                    strokeWidth={scale >= 2 ? 5.5 : 4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              ) : null}
            </>
          )}

          {/* ─── Verified HDBRTS Stations (All 35+ Official Stations Tappable & Permanently Visible) ─── */}
          {displayedStops.map((stop, idx) => {
            const isOrigin = isJourneyActive && ticketOriginStop && stop.id === ticketOriginStop.id;
            const isDestination = isJourneyActive && ticketDestinationStop && stop.id === ticketDestinationStop.id;
            const isSelected = selectedStop?.id === stop.id;
            const isTerminal =
              isOrigin ||
              isDestination ||
              isSelected ||
              stop.isMajorTerminal ||
              stop.branch === 'Dharwad_North' ||
              stop.branch === 'CBT_Branch' ||
              stop.branch === 'Railway_Branch' ||
              stop.branch === 'Gokul_Branch' ||
              stop.branch === 'Central_Junction' ||
              idx === 0 ||
              idx === displayedStops.length - 1;
            const sx = toScreenX(stop.longitude);
            const sy = toScreenY(stop.latitude);

            const cleanName = stop.name.split('/')[0].trim();
            const stationColor = isSelected
              ? '#0284C7'
              : isOrigin
              ? '#15803D'
              : isDestination
              ? '#DC2626'
              : isTerminal
              ? '#DC2626'
              : '#EA580C';

            const labelText = isSelected
              ? `[#${stop.order}] ${cleanName}`
              : isOrigin
              ? `[BOARDING] ${cleanName}`
              : isDestination
              ? `[DEST] ${cleanName}`
              : cleanName;

            return (
              <G key={stop.id} onPress={() => onSelectStop?.(stop)}>
                {/* Station outer halo */}
                <Circle
                  cx={sx}
                  cy={sy}
                  r={isSelected ? 11 : isOrigin || isDestination ? 9 : isTerminal ? 8 : 6}
                  fill="#FFFFFF"
                  stroke={stationColor}
                  strokeWidth={isSelected ? 3 : isOrigin || isDestination ? 2.5 : 2}
                  onPress={() => onSelectStop?.(stop)}
                />
                {/* Station inner core */}
                <Circle
                  cx={sx}
                  cy={sy}
                  r={isSelected ? 6 : isOrigin || isDestination ? 5 : isTerminal ? 4 : 3}
                  fill={stationColor}
                  onPress={() => onSelectStop?.(stop)}
                />

                {/* Permanent Station Name Pill — Always visible immediately without tap */}
                <Rect
                  x={sx + 8}
                  y={sy - 9}
                  width={labelText.length * 6.2 + 10}
                  height={17}
                  rx={4}
                  fill="rgba(255, 255, 255, 0.94)"
                  stroke={isSelected ? '#0284C7' : isOrigin ? '#15803D' : isDestination ? '#DC2626' : '#CBD5E1'}
                  strokeWidth={1}
                />
                <SvgText
                  x={sx + 13}
                  y={sy + 3.5}
                  fontSize={isSelected || isOrigin || isDestination ? 10 : 9.5}
                  fontWeight="bold"
                  fill={isSelected ? '#0284C7' : isOrigin ? '#15803D' : isDestination ? '#DC2626' : '#1E293B'}
                  onPress={() => onSelectStop?.(stop)}
                >
                  {labelText}
                </SvgText>
              </G>
            );
          })}

          {/* ─── User Location Marker (Only when not in active ticket journey) ─── */}
          {!isJourneyActive && (
            <>
              <Circle
                cx={toScreenX(userLocation.longitude)}
                cy={toScreenY(userLocation.latitude)}
                r={14}
                fill="rgba(37, 99, 235, 0.2)"
              />
              <Circle
                cx={toScreenX(userLocation.longitude)}
                cy={toScreenY(userLocation.latitude)}
                r={6}
                fill="#2563EB"
                stroke="#FFFFFF"
                strokeWidth={2}
              />
            </>
          )}
        </Svg>

        {/* ─── Simulated Live Chigari Buses (Filtered when journey is active) ─── */}
        {displayedBuses.map((bus) => {
          const isSelected = bus.busNumber === selectedBus?.busNumber;
          const bx = toScreenX(bus.longitude);
          const by = toScreenY(bus.latitude);
          const heading = typeof bus.heading === 'number' ? bus.heading : 0;

          return (
            <Pressable
              key={bus.id}
              style={[
                styles.busMarkerContainer,
                { left: bx - 22, top: by - 36 },
                isSelected && { zIndex: 100 },
              ]}
              onPress={() => onSelectBus(bus)}
              accessibilityLabel={`Bus ${bus.busNumber}`}
            >
              {/* Route Number Badge */}
              <View
                style={[
                  styles.busNumberPill,
                  isSelected && styles.busNumberPillSelected,
                  { backgroundColor: isSelected ? '#15803D' : '#0F172A' },
                ]}
              >
                <RNText style={styles.busNumberText}>{bus.busNumber}</RNText>
              </View>

              {/* Bus Circle Badge with Real-Time Heading Rotation */}
              <View
                style={[
                  styles.busCircleBadge,
                  isSelected && styles.busCircleBadgeSelected,
                ]}
              >
                <View style={{ transform: [{ rotate: `${heading}deg` }] }}>
                  <Navigation size={18} color="#FFFFFF" strokeWidth={2.8} />
                </View>
              </View>
            </Pressable>
          );
        })}

        {/* ─── Simulated Location / Demo Tracking Notice Badge (Requirement 14) ─── */}
        <View style={styles.simulationNoticeBadge}>
          <View style={styles.simulationPulseDot} />
          <RNText style={styles.simulationNoticeText}>
            SIMULATED LOCATION • DEMO TRACKING
          </RNText>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  busMarkerContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 48,
  },
  busNumberPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 2,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    ...Shadows.low,
  },
  busNumberPillSelected: {
    borderColor: '#FACC15',
    transform: [{ scale: 1.08 }],
  },
  busNumberText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  busCircleBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#16A34A',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.medium,
  },
  busCircleBadgeSelected: {
    backgroundColor: '#15803D',
    borderColor: '#FACC15',
    borderWidth: 3,
    transform: [{ scale: 1.15 }],
  },
  simulationNoticeBadge: {
    position: 'absolute',
    top: 106,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    ...Shadows.low,
    zIndex: 10,
  },
  simulationPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#16A34A',
  },
  simulationNoticeText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
    letterSpacing: 0.4,
  },
});

export default LiveTrackingMapVector;
