import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useCallback,
  useState,
  useEffect,
  useMemo,
} from 'react';
import {
  StyleSheet,
  View,
  Text as RNText,
  ActivityIndicator,
  Pressable,
  Platform,
} from 'react-native';
import {
  Map,
  Camera,
  GeoJSONSource,
  Layer,
  Marker,
  type CameraRef,
  type MapRef,
} from '@maplibre/maplibre-react-native';
import {
  Navigation,
  Compass,
  Bus as BusIcon,
  MapPin,
  RefreshCw,
  AlertTriangle,
  Radio,
} from 'lucide-react-native';
import type { ChigariBus, ChigariRoute, Coordinates, BRTSStop } from '@/types/transit';
import { FontFamily, Shadows } from '@/constants/theme';
import {
  OPEN_FREE_MAP_STYLE_URL,
  HDBRTS_MAP_CENTER_GEOJSON,
  MAP_CONFIG,
  toGeoJSONLineCoordinates,
} from '@/services/mapConfig';
import {
  HDBRTS_MAP_REGION,
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

export interface LiveTrackingMapLibreProps {
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

export const LiveTrackingMapLibre = forwardRef<LiveTrackingMapRef, LiveTrackingMapLibreProps>(
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
    ref
  ) => {
    const mapRef = useRef<MapRef>(null);
    const cameraRef = useRef<CameraRef>(null);

    const [isMapLoaded, setIsMapLoaded] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const hasPositionedCameraRef = useRef(false);

    // Filter displayed stops based on journey mode
    const displayedStops = useMemo(() => {
      if (!isJourneyActive) {
        return CHIGARI_VERIFIED_STOPS;
      }
      if (intermediateStops && intermediateStops.length > 0) {
        return intermediateStops;
      }
      if (ticketOriginStop && ticketDestinationStop) {
        const minOrder = Math.min(ticketOriginStop.order, ticketDestinationStop.order);
        const maxOrder = Math.max(ticketOriginStop.order, ticketDestinationStop.order);
        return CHIGARI_VERIFIED_STOPS.filter((s) => s.order >= minOrder && s.order <= maxOrder);
      }
      return CHIGARI_VERIFIED_STOPS;
    }, [isJourneyActive, intermediateStops, ticketOriginStop, ticketDestinationStop]);

    // Filter displayed buses
    const displayedBuses = useMemo(() => {
      if (isJourneyActive && selectedBus) {
        const found = buses.find((b) => b.busNumber === selectedBus.busNumber);
        return found ? [found] : [selectedBus];
      }
      return buses;
    }, [isJourneyActive, selectedBus, buses]);

    // GeoJSON FeatureCollections for BRTS Corridor Polylines
    const trunkGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => ({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: 'HDBRTS Trunk Line' },
          geometry: {
            type: 'LineString',
            coordinates: toGeoJSONLineCoordinates(HDBRTS_TRUNK_COORDINATES),
          },
        },
      ],
    }), []);

    const cbtBranchGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => ({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: 'CBT Branch' },
          geometry: {
            type: 'LineString',
            coordinates: toGeoJSONLineCoordinates(HDBRTS_CBT_BRANCH_COORDINATES),
          },
        },
      ],
    }), []);

    const railwayBranchGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => ({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: 'Railway Branch' },
          geometry: {
            type: 'LineString',
            coordinates: toGeoJSONLineCoordinates(HDBRTS_RAILWAY_COORDINATES),
          },
        },
      ],
    }), []);

    const dharwadBRTSBranchGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => ({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: 'Dharwad BRTS Branch' },
          geometry: {
            type: 'LineString',
            coordinates: toGeoJSONLineCoordinates(HDBRTS_DHARWAD_BRTS_BRANCH_COORDINATES),
          },
        },
      ],
    }), []);

    const dharwadNewBranchGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => ({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: 'Dharwad New Branch' },
          geometry: {
            type: 'LineString',
            coordinates: toGeoJSONLineCoordinates(HDBRTS_DHARWAD_NEW_BRANCH_COORDINATES),
          },
        },
      ],
    }), []);

    const gokulBranchGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => ({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: 'Gokul Branch' },
          geometry: {
            type: 'LineString',
            coordinates: toGeoJSONLineCoordinates(HDBRTS_GOKUL_BRANCH_COORDINATES),
          },
        },
      ],
    }), []);

    // Active Journey Polyline GeoJSON
    const activeJourneyGeoJSON = useMemo<GeoJSON.FeatureCollection | null>(() => {
      const coords =
        journeyCoordinates && journeyCoordinates.length >= 2
          ? journeyCoordinates
          : remainingCoordinates && remainingCoordinates.length >= 2
          ? remainingCoordinates
          : null;

      if (!coords || !isJourneyActive) return null;

      return {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { name: 'Active Journey Route' },
            geometry: {
              type: 'LineString',
              coordinates: toGeoJSONLineCoordinates(coords),
            },
          },
        ],
      };
    }, [journeyCoordinates, remainingCoordinates, isJourneyActive]);

    // Imperative centerOnBus
    const centerOnBus = useCallback((bus: ChigariBus) => {
      if (!cameraRef.current) return;
      cameraRef.current.flyTo({
        center: [bus.longitude, bus.latitude],
        zoom: MAP_CONFIG.busDetailZoom,
        duration: 1000,
      });
    }, []);

    // Imperative centerOnRoute
    const centerOnRoute = useCallback(() => {
      if (!cameraRef.current) return;
      cameraRef.current.flyTo({
        center: HDBRTS_MAP_CENTER_GEOJSON,
        zoom: MAP_CONFIG.defaultZoom,
        duration: 1000,
      });
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        centerOnBus,
        centerOnRoute,
      }),
      [centerOnBus, centerOnRoute]
    );

    // Initial camera positioning: run ONCE when map style is loaded
    useEffect(() => {
      if (hasPositionedCameraRef.current || !isMapLoaded || !cameraRef.current) return;

      if (isJourneyActive && ticketOriginStop && ticketDestinationStop) {
        hasPositionedCameraRef.current = true;
        const minLng = Math.min(ticketOriginStop.longitude, ticketDestinationStop.longitude);
        const maxLng = Math.max(ticketOriginStop.longitude, ticketDestinationStop.longitude);
        const minLat = Math.min(ticketOriginStop.latitude, ticketDestinationStop.latitude);
        const maxLat = Math.max(ticketOriginStop.latitude, ticketDestinationStop.latitude);

        cameraRef.current.fitBounds(
          [minLng, minLat, maxLng, maxLat],
          {
            padding: { top: 80, bottom: 80, left: 50, right: 50 },
            duration: 1200,
          }
        );
      } else if (!isJourneyActive && selectedBus) {
        hasPositionedCameraRef.current = true;
        centerOnBus(selectedBus);
      }
    }, [isJourneyActive, isMapLoaded, ticketOriginStop, ticketDestinationStop, selectedBus, centerOnBus]);

    const handleStyleLoaded = useCallback(() => {
      setIsMapLoaded(true);
      setLoadError(null);
    }, []);

    const handleMapError = useCallback(() => {
      setLoadError('Failed to load OpenFreeMap vector style.');
    }, []);

    return (
      <View style={styles.container}>
        {/* OpenFreeMap Vector Map via MapLibre */}
        <Map
          ref={mapRef}
          style={styles.map}
          mapStyle={OPEN_FREE_MAP_STYLE_URL}
          logo={false}
          attribution={false}
          onDidFinishLoadingStyle={handleStyleLoaded}
          onDidFailLoadingMap={handleMapError}
        >
          {/* Camera configuration */}
          <Camera
            ref={cameraRef}
            initialViewState={{
              center: HDBRTS_MAP_CENTER_GEOJSON,
              zoom: MAP_CONFIG.defaultZoom,
            }}
            minZoom={MAP_CONFIG.minZoom}
            maxZoom={MAP_CONFIG.maxZoom}
          />

          {/* BRTS Corridor Route Layers */}
          {/* Trunk Corridor */}
          <GeoJSONSource id="trunk-source" data={trunkGeoJSON}>
            <Layer
              id="trunk-casing"
              type="line"
              paint={{
                'line-color': '#064E3B',
                'line-width': 7,
                'line-opacity': 0.85,
              }}
            />
            <Layer
              id="trunk-line"
              type="line"
              paint={{
                'line-color': '#10B981',
                'line-width': 4.5,
                'line-opacity': 0.95,
              }}
            />
          </GeoJSONSource>

          {/* CBT Branch */}
          <GeoJSONSource id="cbt-branch-source" data={cbtBranchGeoJSON}>
            <Layer
              id="cbt-branch-line"
              type="line"
              paint={{
                'line-color': '#2563EB',
                'line-width': 3.5,
                'line-opacity': 0.85,
              }}
            />
          </GeoJSONSource>

          {/* Railway Branch */}
          <GeoJSONSource id="railway-branch-source" data={railwayBranchGeoJSON}>
            <Layer
              id="railway-branch-line"
              type="line"
              paint={{
                'line-color': '#D97706',
                'line-width': 3.5,
                'line-opacity': 0.85,
              }}
            />
          </GeoJSONSource>

          {/* Dharwad BRTS Branch */}
          <GeoJSONSource id="dharwad-brts-branch-source" data={dharwadBRTSBranchGeoJSON}>
            <Layer
              id="dharwad-brts-branch-line"
              type="line"
              paint={{
                'line-color': '#059669',
                'line-width': 3.5,
                'line-opacity': 0.85,
              }}
            />
          </GeoJSONSource>

          {/* Dharwad New Branch */}
          <GeoJSONSource id="dharwad-new-branch-source" data={dharwadNewBranchGeoJSON}>
            <Layer
              id="dharwad-new-branch-line"
              type="line"
              paint={{
                'line-color': '#0D9488',
                'line-width': 3.5,
                'line-opacity': 0.85,
              }}
            />
          </GeoJSONSource>

          {/* Gokul Branch */}
          <GeoJSONSource id="gokul-branch-source" data={gokulBranchGeoJSON}>
            <Layer
              id="gokul-branch-line"
              type="line"
              paint={{
                'line-color': '#7C3AED',
                'line-width': 3.5,
                'line-opacity': 0.85,
              }}
            />
          </GeoJSONSource>

          {/* Active Journey Highlight Polyline */}
          {activeJourneyGeoJSON && (
            <GeoJSONSource id="active-journey-source" data={activeJourneyGeoJSON}>
              <Layer
                id="active-journey-glow"
                type="line"
                paint={{
                  'line-color': '#34D399',
                  'line-width': 9,
                  'line-opacity': 0.5,
                }}
              />
              <Layer
                id="active-journey-line"
                type="line"
                paint={{
                  'line-color': '#059669',
                  'line-width': 5,
                  'line-opacity': 1.0,
                }}
              />
            </GeoJSONSource>
          )}

          {/* 35 Authoritative Station Markers */}
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

            const stopCleanName = stop.name.split('/')[0].trim();

            return (
              <Marker
                key={`stop-${stop.id}`}
                id={`stop-${stop.id}`}
                lngLat={[stop.longitude, stop.latitude]}
                onPress={() => onSelectStop?.(stop)}
              >
                <Pressable
                  onPress={() => onSelectStop?.(stop)}
                  style={[
                    styles.stopMarkerWrap,
                    isOrigin && styles.stopOriginWrap,
                    isDestination && styles.stopDestinationWrap,
                    isSelected && styles.stopSelectedWrap,
                  ]}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <View
                    style={[
                      styles.stopDot,
                      isTerminal ? styles.stopDotTerminal : styles.stopDotRegular,
                      isOrigin && styles.stopDotOrigin,
                      isDestination && styles.stopDotDestination,
                      isSelected && styles.stopDotSelected,
                    ]}
                  >
                    {isTerminal && (
                      <RNText style={styles.stopDotTerminalText}>
                        {isOrigin ? 'A' : isDestination ? 'B' : stop.order}
                      </RNText>
                    )}
                  </View>

                  {(isTerminal || isSelected) && (
                    <View style={styles.stopLabelContainer}>
                      <RNText
                        style={[
                          styles.stopLabelText,
                          isOrigin && styles.stopLabelTextOrigin,
                          isDestination && styles.stopLabelTextDestination,
                        ]}
                        numberOfLines={1}
                      >
                        {stopCleanName}
                      </RNText>
                    </View>
                  )}
                </Pressable>
              </Marker>
            );
          })}

          {/* User Location Marker (when journey is not active) */}
          {!isJourneyActive && userLocation && (
            <Marker
              key="user-location-marker"
              id="user-location-marker"
              lngLat={[userLocation.longitude, userLocation.latitude]}
            >
              <View style={styles.userLocationWrap}>
                <View style={styles.userLocationHalo} />
                <View style={styles.userLocationDot} />
              </View>
            </Marker>
          )}

          {/* Real-time Bus Markers (Keyed and selected by unique physical bus identity) */}
          {displayedBuses.map((bus) => {
            const isSelected = selectedBus
              ? (bus.physicalBusId && selectedBus.physicalBusId
                  ? bus.physicalBusId === selectedBus.physicalBusId
                  : bus.id === selectedBus.id)
              : false;
            const heading = typeof bus.heading === 'number' ? bus.heading : 0;
            const busUniqueKey = `bus-${bus.physicalBusId || bus.id || bus.busNumber}`;

            return (
              <Marker
                key={busUniqueKey}
                id={busUniqueKey}
                lngLat={[bus.longitude, bus.latitude]}
                onPress={() => onSelectBus(bus)}
              >
                <Pressable
                  onPress={() => onSelectBus(bus)}
                  style={[styles.busMarkerWrap, isSelected && styles.busMarkerSelectedWrap]}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  {/* Direction Heading Indicator Arrow */}
                  <View
                    style={[
                      styles.busHeadingArrow,
                      { transform: [{ rotate: `${heading}deg` }] },
                    ]}
                  >
                    <Navigation size={12} color={isSelected ? '#059669' : '#0F172A'} />
                  </View>

                  {/* Bus Capsule Badge */}
                  <View style={[styles.busBadge, isSelected && styles.busBadgeSelected]}>
                    <BusIcon size={12} color="#FFFFFF" style={styles.busIcon} />
                    <RNText style={styles.busNumberText}>{bus.busNumber}</RNText>
                  </View>

                  {/* Bus ETA / Speed Pill */}
                  <View style={styles.busMetaPill}>
                    <RNText style={styles.busMetaText}>
                      {bus.etaMinutes ? `${bus.etaMinutes}m` : `${Math.round(bus.speed)} km/h`}
                    </RNText>
                  </View>
                </Pressable>
              </Marker>
            );
          })}
        </Map>

        {/* Top Header Badge — Simulated Location / OpenFreeMap */}
        <View style={styles.headerNotice}>
          <View style={styles.headerStatusDot} />
          <RNText style={styles.headerNoticeText}>
            SIMULATED LOCATION • OPENFREEMAP VECTOR
          </RNText>
        </View>

        {/* Floating Quick Camera Controls */}
        <View style={styles.floatingControls}>
          <Pressable
            style={styles.floatingButton}
            onPress={centerOnRoute}
            accessibilityLabel="Center corridor route"
          >
            <Compass size={20} color="#0F172A" />
          </Pressable>

          {selectedBus && (
            <Pressable
              style={[styles.floatingButton, styles.floatingButtonActive]}
              onPress={() => centerOnBus(selectedBus)}
              accessibilityLabel="Center selected bus"
            >
              <BusIcon size={20} color="#FFFFFF" />
            </Pressable>
          )}
        </View>

        {/* Loading Overlay */}
        {!isMapLoaded && !loadError && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="#059669" />
            <RNText style={styles.loadingText}>Loading OpenFreeMap Vector Tiles…</RNText>
          </View>
        )}

        {/* Error Recovery Overlay */}
        {loadError && (
          <View style={styles.errorOverlay}>
            <AlertTriangle size={32} color="#EF4444" />
            <RNText style={styles.errorTitle}>Map Loading Issue</RNText>
            <RNText style={styles.errorSubtitle}>{loadError}</RNText>
            <Pressable
              style={styles.retryButton}
              onPress={() => {
                setLoadError(null);
                setIsMapLoaded(false);
              }}
            >
              <RefreshCw size={16} color="#FFFFFF" />
              <RNText style={styles.retryButtonText}>Retry</RNText>
            </Pressable>
          </View>
        )}
      </View>
    );
  }
);

LiveTrackingMapLibre.displayName = 'LiveTrackingMapLibre';

export default LiveTrackingMapLibre;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  headerNotice: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 20,
    ...Shadows.low,
  },
  headerStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  headerNoticeText: {
    color: '#F8FAFC',
    fontSize: 10,
    fontFamily: FontFamily.semiBold,
    letterSpacing: 0.5,
  },
  floatingControls: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    flexDirection: 'column',
    gap: 10,
    zIndex: 25,
  },
  floatingButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadows.medium,
  },
  floatingButtonActive: {
    backgroundColor: '#059669',
    borderColor: '#047857',
  },
  /* Stop Marker Styles */
  stopMarkerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopOriginWrap: {
    zIndex: 15,
  },
  stopDestinationWrap: {
    zIndex: 15,
  },
  stopSelectedWrap: {
    zIndex: 20,
  },
  stopDot: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.low,
  },
  stopDotRegular: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
  },
  stopDotTerminal: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#065F46',
    borderWidth: 2,
    borderColor: '#A7F3D0',
  },
  stopDotOrigin: {
    backgroundColor: '#10B981',
    borderColor: '#FFFFFF',
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  stopDotDestination: {
    backgroundColor: '#EF4444',
    borderColor: '#FFFFFF',
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  stopDotSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#FFFFFF',
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  stopDotTerminalText: {
    fontSize: 9,
    fontFamily: FontFamily.bold,
    color: '#FFFFFF',
  },
  stopLabelContainer: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
    maxWidth: 120,
  },
  stopLabelText: {
    fontSize: 9,
    fontFamily: FontFamily.medium,
    color: '#FFFFFF',
  },
  stopLabelTextOrigin: {
    color: '#6EE7B7',
    fontFamily: FontFamily.bold,
  },
  stopLabelTextDestination: {
    color: '#FCA5A5',
    fontFamily: FontFamily.bold,
  },
  /* Bus Marker Styles */
  busMarkerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
  busMarkerSelectedWrap: {
    zIndex: 40,
  },
  busHeadingArrow: {
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: -4,
  },
  busBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#10B981',
    ...Shadows.medium,
  },
  busBadgeSelected: {
    backgroundColor: '#059669',
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.1 }],
  },
  busIcon: {
    marginRight: 4,
  },
  busNumberText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: FontFamily.bold,
  },
  busMetaPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  busMetaText: {
    fontSize: 8,
    fontFamily: FontFamily.semiBold,
    color: '#0F172A',
  },
  /* User Location Styles */
  userLocationWrap: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userLocationHalo: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
  },
  userLocationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2563EB',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  /* Overlays */
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(248, 250, 252, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    fontFamily: FontFamily.medium,
    color: '#334155',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(248, 250, 252, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 50,
  },
  errorTitle: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    color: '#0F172A',
    marginTop: 12,
  },
  errorSubtitle: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    ...Shadows.low,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
  },
});
