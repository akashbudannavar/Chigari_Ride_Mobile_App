/**
 * Aggregator Core Engine for CHIGARI RIDE (Stage 5B)
 *
 * Implements deterministic server-side filtering, corridor projection,
 * 1D spatial-temporal clustering, and kinematic physical-bus association.
 *
 * Strict Invariants:
 * 1. Anonymity: Operates strictly on anonymous coordinates and session_ids.
 *    Zero connection to auth.users, profiles, tickets, or wallets.
 * 2. Route Isolation: Different service numbers ('200A', '201B', etc.) NEVER cluster together.
 * 3. Corridor Grounding: Snaps all clusters to the authoritative HDBRTS corridor centerline.
 * 4. Safe Association: Three deterministic tiers (OBSERVED, INFERRED, UNKNOWN).
 *    Never arbitrarily assigns ambiguous clusters; never automatically creates physical buses.
 */

import {
  Coordinates,
  StationPoint,
  AUTHORITATIVE_SERVICES,
  AuthoritativeService,
  HDBRTS_STATIONS,
  HDBRTS_CORRIDOR_POINTS,
} from './corridorData';
import {
  haversineDistance,
  calculateBearing,
  getCumulativeDistances,
  projectPointOntoCorridor,
  interpolateCorridorPosition,
  CorridorProjection,
} from './geometry';

// Precomputed cumulative distance array along the corridor polyline
export const CORRIDOR_CUMULATIVE_DISTANCES = getCumulativeDistances(HDBRTS_CORRIDOR_POINTS);

// ─── Configuration Constants ──────────────────────────────────────────────────

export const AGGREGATION_WINDOW_SECONDS = 45;
export const MAX_OBSERVATION_AGE_SECONDS = 60;
export const MAX_FUTURE_DRIFT_SECONDS = 10;

export const LAT_MIN = 15.2500;
export const LAT_MAX = 15.5200;
export const LNG_MIN = 74.9500;
export const LNG_MAX = 75.2500;

export const MAX_ACCURACY_METERS = 50.0;
export const MAX_CORRIDOR_PERPENDICULAR_METERS = 65.0;
export const MAX_SPEED_KMH = 95.0;

export const CLUSTER_DISTANCE_THRESHOLD_METERS = 180.0;
export const STATION_PROXIMITY_METERS = 45.0;
export const STATION_STOPPED_SPEED_KMH = 5.0;
export const KINEMATIC_MAX_BUS_SPEED_KMH = 75.0;

export const ADVISORY_LOCK_ID = 7429184;

// ─── Core Interfaces ──────────────────────────────────────────────────────────

export interface RawObservation {
  id: string;
  session_id: string;
  service_number: string;
  lat: number;
  lng: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  reported_fleet_number: string | null;
  observed_at: string;
}

export interface ValidatedObservation extends RawObservation {
  projection: CorridorProjection;
  direction: 'Northbound' | 'Southbound' | 'Unknown';
  observedTimestampMs: number;
}

export interface BusCluster {
  serviceNumber: AuthoritativeService;
  direction: 'Northbound' | 'Southbound' | 'Unknown';
  observations: ValidatedObservation[];
  meanS: number;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number;
  activeContributors: number;
  movementState: 'moving' | 'stopped' | 'at_station' | 'offline';
  confidenceTier: 'LIVE' | 'RECENT' | 'ESTIMATED';
  earliestObservationAt: string;
  latestObservationAt: string;
  reportedFleetCounts: Record<string, number>;
}

export type AssociationClassification = 'OBSERVED IDENTITY' | 'INFERRED IDENTITY' | 'UNKNOWN IDENTITY';

export interface PhysicalBusRecord {
  id: string;
  fleet_number: string | null;
  is_active: boolean;
  service_number?: string | null;
}

export interface LivePositionRecord {
  bus_id: string;
  service_number?: string | null;
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  tracking_source: 'observed' | 'predicted';
  movement_state: 'moving' | 'stopped' | 'at_station' | 'offline';
  confidence_tier: 'LIVE' | 'RECENT' | 'ESTIMATED' | 'STALE' | 'OFFLINE';
  last_observation_at: string;
  first_established_at: string;
  active_contributors: number;
  updated_at: string;
}

export interface AssociationResult {
  cluster: BusCluster;
  classification: AssociationClassification;
  associatedBusId: string | null;
  associatedFleetNumber: string | null;
  score: number;
  reason: string;
}

export interface AggregationOutput {
  livePositionUpdates: Partial<LivePositionRecord>[];
  unmatchedClusters: {
    serviceNumber: string;
    corridorDistance: number;
    latitude: number;
    longitude: number;
    activeContributors: number;
    timestamp: string;
    reason: string;
  }[];
  processedCount: number;
  validCount: number;
  clusterCount: number;
}

// ─── 1. Observation Filtering ─────────────────────────────────────────────────

export function filterAndProjectObservation(
  obs: RawObservation,
  nowMs: number = Date.now(),
  corridor: Coordinates[] = HDBRTS_CORRIDOR_POINTS,
  cumDists: number[] = CORRIDOR_CUMULATIVE_DISTANCES
): ValidatedObservation | null {
  // 1. Service Number Check
  const service = (obs.service_number || '').trim().toUpperCase() as AuthoritativeService;
  if (!AUTHORITATIVE_SERVICES.includes(service)) {
    return null;
  }

  // 2. Timestamp Checks
  const obsTime = new Date(obs.observed_at).getTime();
  if (isNaN(obsTime)) return null;

  // Older than 60 seconds
  if (nowMs - obsTime > MAX_OBSERVATION_AGE_SECONDS * 1000) {
    return null;
  }
  // Future dated (> 10s)
  if (obsTime - nowMs > MAX_FUTURE_DRIFT_SECONDS * 1000) {
    return null;
  }

  // 3. Coordinate Bounds
  if (
    typeof obs.lat !== 'number' ||
    typeof obs.lng !== 'number' ||
    isNaN(obs.lat) ||
    isNaN(obs.lng) ||
    obs.lat < LAT_MIN ||
    obs.lat > LAT_MAX ||
    obs.lng < LNG_MIN ||
    obs.lng > LNG_MAX
  ) {
    return null;
  }

  // 4. Accuracy Check
  if (
    typeof obs.accuracy !== 'number' ||
    isNaN(obs.accuracy) ||
    obs.accuracy <= 0 ||
    obs.accuracy > MAX_ACCURACY_METERS
  ) {
    return null;
  }

  // 5. Speed Plausibility (<= 95 km/h)
  if (typeof obs.speed === 'number' && !isNaN(obs.speed)) {
    if (obs.speed > MAX_SPEED_KMH) {
      return null;
    }
  }

  // 6. Corridor Projection & Perpendicular Distance Gate (<= 65m)
  const projection = projectPointOntoCorridor(
    { latitude: obs.lat, longitude: obs.lng },
    corridor,
    cumDists
  );

  if (projection.perpendicularDistance > MAX_CORRIDOR_PERPENDICULAR_METERS) {
    return null;
  }

  // 7. Determine Direction
  let direction: 'Northbound' | 'Southbound' | 'Unknown' = 'Unknown';
  if (typeof obs.heading === 'number' && !isNaN(obs.heading) && obs.heading >= 0) {
    const diff = Math.cos((obs.heading - projection.segmentBearing) * (Math.PI / 180));
    direction = diff >= 0 ? 'Southbound' : 'Northbound';
  }

  return {
    ...obs,
    projection,
    direction,
    observedTimestampMs: obsTime,
  };
}

// ─── 2. Spatial-Temporal 1D Clustering ────────────────────────────────────────

export function clusterObservations(
  observations: ValidatedObservation[],
  nowMs: number = Date.now(),
  stations: StationPoint[] = HDBRTS_STATIONS,
  corridor: Coordinates[] = HDBRTS_CORRIDOR_POINTS,
  cumDists: number[] = CORRIDOR_CUMULATIVE_DISTANCES
): BusCluster[] {
  // Partition by Service Number
  const serviceGroups: Record<string, ValidatedObservation[]> = {};
  for (const obs of observations) {
    if (!serviceGroups[obs.service_number]) {
      serviceGroups[obs.service_number] = [];
    }
    serviceGroups[obs.service_number].push(obs);
  }

  const clusters: BusCluster[] = [];

  for (const service of Object.keys(serviceGroups) as AuthoritativeService[]) {
    const serviceObs = serviceGroups[service];

    // Partition by Direction
    const dirGroups: Record<string, ValidatedObservation[]> = {
      Southbound: [],
      Northbound: [],
      Unknown: [],
    };

    for (const obs of serviceObs) {
      dirGroups[obs.direction].push(obs);
    }

    // Process each directional bucket
    for (const dir of ['Southbound', 'Northbound', 'Unknown'] as const) {
      const items = dirGroups[dir];
      if (items.length === 0) continue;

      // Sort by 1D corridor distance s
      items.sort((a, b) => a.projection.s - b.projection.s);

      // Form 1D distance clusters (threshold <= 180m)
      let currentCluster: ValidatedObservation[] = [items[0]];

      for (let i = 1; i < items.length; i++) {
        const prev = items[i - 1];
        const curr = items[i];

        if (curr.projection.s - prev.projection.s <= CLUSTER_DISTANCE_THRESHOLD_METERS) {
          currentCluster.push(curr);
        } else {
          clusters.push(
            buildBusCluster(service, dir, currentCluster, nowMs, stations, corridor, cumDists)
          );
          currentCluster = [curr];
        }
      }

      if (currentCluster.length > 0) {
        clusters.push(
          buildBusCluster(service, dir, currentCluster, nowMs, stations, corridor, cumDists)
        );
      }
    }
  }

  return clusters;
}

// ─── 3. Centroid & State Calculation ──────────────────────────────────────────

export function buildBusCluster(
  serviceNumber: AuthoritativeService,
  direction: 'Northbound' | 'Southbound' | 'Unknown',
  observations: ValidatedObservation[],
  nowMs: number,
  stations: StationPoint[] = HDBRTS_STATIONS,
  corridor: Coordinates[] = HDBRTS_CORRIDOR_POINTS,
  cumDists: number[] = CORRIDOR_CUMULATIVE_DISTANCES
): BusCluster {
  // 1. Calculate weights: w_i = (1 / accuracy) * exp(-(now - t_i) / 20000)
  let totalWeight = 0;
  let weightedS = 0;
  let weightedSpeedSum = 0;
  let speedWeightTotal = 0;
  let sinHeadingSum = 0;
  let cosHeadingSum = 0;
  let headingWeightTotal = 0;

  const sessionSet = new Set<string>();
  const fleetCounts: Record<string, number> = {};
  let earliestTime = Infinity;
  let latestTime = -Infinity;

  for (const obs of observations) {
    sessionSet.add(obs.session_id);

    if (obs.reported_fleet_number) {
      const fleet = obs.reported_fleet_number.trim().toUpperCase();
      fleetCounts[fleet] = (fleetCounts[fleet] || 0) + 1;
    }

    const ageMs = Math.max(0, nowMs - obs.observedTimestampMs);
    const weight = (1.0 / Math.max(5.0, obs.accuracy)) * Math.exp(-ageMs / 20000.0);

    totalWeight += weight;
    weightedS += obs.projection.s * weight;

    if (obs.observedTimestampMs < earliestTime) earliestTime = obs.observedTimestampMs;
    if (obs.observedTimestampMs > latestTime) latestTime = obs.observedTimestampMs;

    if (typeof obs.speed === 'number' && !isNaN(obs.speed) && obs.speed >= 0) {
      weightedSpeedSum += obs.speed * weight;
      speedWeightTotal += weight;
    }

    if (typeof obs.heading === 'number' && !isNaN(obs.heading) && obs.heading >= 0) {
      const rad = obs.heading * (Math.PI / 180);
      sinHeadingSum += Math.sin(rad) * weight;
      cosHeadingSum += Math.cos(rad) * weight;
      headingWeightTotal += weight;
    }
  }

  const meanS = totalWeight > 0 ? weightedS / totalWeight : observations[0].projection.s;

  // Snap to corridor centerline
  const snapped = interpolateCorridorPosition(corridor, cumDists, meanS);

  const meanSpeed = speedWeightTotal > 0
    ? Math.round((weightedSpeedSum / speedWeightTotal) * 10) / 10
    : null;

  let meanHeading = snapped.heading;
  if (headingWeightTotal > 0) {
    const avgRad = Math.atan2(sinHeadingSum, cosHeadingSum);
    meanHeading = Math.round(((avgRad * (180 / Math.PI)) + 360) % 360);
  }

  // Station proximity detection
  let minStationDistance = Infinity;
  for (const st of stations) {
    const d = haversineDistance(snapped.position, { latitude: st.latitude, longitude: st.longitude });
    if (d < minStationDistance) {
      minStationDistance = d;
    }
  }

  // Movement State
  let movementState: 'moving' | 'stopped' | 'at_station' | 'offline' = 'stopped';
  const effectiveSpeed = meanSpeed ?? 0;

  if (effectiveSpeed >= STATION_STOPPED_SPEED_KMH) {
    movementState = 'moving';
  } else if (minStationDistance <= STATION_PROXIMITY_METERS) {
    movementState = 'at_station';
  } else {
    movementState = 'stopped';
  }

  // Confidence Tier
  const activeContributors = sessionSet.size;
  let confidenceTier: 'LIVE' | 'RECENT' | 'ESTIMATED' = 'ESTIMATED';

  if (activeContributors >= 2) {
    confidenceTier = 'LIVE';
  } else if (activeContributors === 1) {
    const singleObs = observations[0];
    if (singleObs.accuracy <= 15.0 && (singleObs.speed || 0) > 15.0) {
      confidenceTier = 'RECENT';
    } else {
      confidenceTier = 'ESTIMATED';
    }
  }

  return {
    serviceNumber,
    direction,
    observations,
    meanS,
    latitude: snapped.position.latitude,
    longitude: snapped.position.longitude,
    speed: meanSpeed,
    heading: meanHeading,
    activeContributors,
    movementState,
    confidenceTier,
    earliestObservationAt: new Date(earliestTime).toISOString(),
    latestObservationAt: new Date(latestTime).toISOString(),
    reportedFleetCounts: fleetCounts,
  };
}

// ─── 4. Deterministic Physical-Bus Association ────────────────────────────────

export function associateClusterWithPhysicalBus(
  cluster: BusCluster,
  candidateBuses: PhysicalBusRecord[],
  previousLivePositions: Record<string, LivePositionRecord>,
  nowMs: number = Date.now()
): AssociationResult {
  // 1. Filter buses active and matching service
  const activeBuses = candidateBuses.filter((b) => b.is_active);

  if (activeBuses.length === 0) {
    return {
      cluster,
      classification: 'UNKNOWN IDENTITY',
      associatedBusId: null,
      associatedFleetNumber: null,
      score: 0,
      reason: 'No active physical buses available in database',
    };
  }

  // 2. Check for Passenger-Reported Fleet Number (OBSERVED IDENTITY check)
  const reportedFleets = Object.keys(cluster.reportedFleetCounts);
  if (reportedFleets.length > 0) {
    // Pick the most frequently reported fleet
    let topFleet = reportedFleets[0];
    let topCount = cluster.reportedFleetCounts[topFleet];
    for (const f of reportedFleets) {
      if (cluster.reportedFleetCounts[f] > topCount) {
        topFleet = f;
        topCount = cluster.reportedFleetCounts[f];
      }
    }

    const matchingBus = activeBuses.find(
      (b) => b.fleet_number && b.fleet_number.toUpperCase() === topFleet
    );

    if (matchingBus) {
      const prevPos = previousLivePositions[matchingBus.id];
      if (!prevPos) {
        // First observation of this bus: accept as OBSERVED
        return {
          cluster,
          classification: 'OBSERVED IDENTITY',
          associatedBusId: matchingBus.id,
          associatedFleetNumber: matchingBus.fleet_number,
          score: 1.0,
          reason: `Explicit passenger reported fleet ${topFleet} verified (initial position)`,
        };
      }

      // Check kinematic reachability
      const prevTimeMs = new Date(prevPos.last_observation_at).getTime();
      const deltaHours = Math.max(0.001, (nowMs - prevTimeMs) / (1000 * 3600));
      const distanceMeters = haversineDistance(
        { latitude: prevPos.lat, longitude: prevPos.lng },
        { latitude: cluster.latitude, longitude: cluster.longitude }
      );
      const maxAllowedMeters = (KINEMATIC_MAX_BUS_SPEED_KMH * deltaHours * 1000) + 500; // 500m buffer

      if (distanceMeters <= maxAllowedMeters) {
        return {
          cluster,
          classification: 'OBSERVED IDENTITY',
          associatedBusId: matchingBus.id,
          associatedFleetNumber: matchingBus.fleet_number,
          score: 1.0,
          reason: `Explicit passenger reported fleet ${topFleet} kinematically verified (${Math.round(distanceMeters)}m in ${Math.round(deltaHours * 3600)}s)`,
        };
      }
      // If reported fleet is kinematically impossible (e.g. 15km in 10s), fall through to inferred association!
    }
  }

  // 3. Kinematic Association Scoring (INFERRED IDENTITY check)
  interface CandidateScore {
    bus: PhysicalBusRecord;
    score: number;
    distanceMeters: number;
    reason: string;
  }

  const scores: CandidateScore[] = [];

  for (const bus of activeBuses) {
    const prevPos = previousLivePositions[bus.id];

    if (!prevPos) {
      // Unpositioned active bus: potential fallback candidate
      scores.push({
        bus,
        score: 0.3,
        distanceMeters: 0,
        reason: 'Unpositioned active bus',
      });
      continue;
    }

    // Kinematic distance & time
    const prevTimeMs = new Date(prevPos.last_observation_at).getTime();
    const deltaHours = Math.max(0.001, (nowMs - prevTimeMs) / (1000 * 3600));
    const distanceMeters = haversineDistance(
      { latitude: prevPos.lat, longitude: prevPos.lng },
      { latitude: cluster.latitude, longitude: cluster.longitude }
    );
    const maxAllowedMeters = (KINEMATIC_MAX_BUS_SPEED_KMH * deltaHours * 1000) + 500;

    if (distanceMeters > maxAllowedMeters) {
      // Kinematically impossible jump -> absolute rejection
      continue;
    }

    // Direction alignment score
    let dirScore = 0.2;
    if (typeof prevPos.heading === 'number' && typeof cluster.heading === 'number') {
      const headingDiffCos = Math.cos((prevPos.heading - cluster.heading) * (Math.PI / 180));
      if (headingDiffCos >= 0.5) {
        dirScore = 0.4;
      } else {
        dirScore = 0.0; // Heading contradiction
      }
    }

    // Spatial proximity score
    const proximityScore = 0.5 * (1.0 - Math.min(1.0, distanceMeters / maxAllowedMeters));
    const totalScore = proximityScore + dirScore;

    scores.push({
      bus,
      score: totalScore,
      distanceMeters,
      reason: `Kinematic match (${Math.round(distanceMeters)}m, score: ${totalScore.toFixed(2)})`,
    });
  }

  // Sort candidates by descending score
  scores.sort((a, b) => b.score - a.score);

  if (scores.length === 0) {
    return {
      cluster,
      classification: 'UNKNOWN IDENTITY',
      associatedBusId: null,
      associatedFleetNumber: null,
      score: 0,
      reason: 'No physical bus within kinematic reach',
    };
  }

  const topMatch = scores[0];

  // Ambiguity check: if 2nd candidate has nearly identical high score (> 0.6 and within 10%)
  if (scores.length > 1) {
    const secondMatch = scores[1];
    if (topMatch.score > 0.5 && (topMatch.score - secondMatch.score) < 0.1) {
      return {
        cluster,
        classification: 'UNKNOWN IDENTITY',
        associatedBusId: null,
        associatedFleetNumber: null,
        score: topMatch.score,
        reason: `Ambiguous match between ${topMatch.bus.fleet_number} and ${secondMatch.bus.fleet_number}`,
      };
    }
  }

  return {
    cluster,
    classification: 'INFERRED IDENTITY',
    associatedBusId: topMatch.bus.id,
    associatedFleetNumber: topMatch.bus.fleet_number,
    score: topMatch.score,
    reason: topMatch.reason,
  };
}

// ─── 5. Full Pipeline Runner ──────────────────────────────────────────────────

export function runAggregationPipeline(
  rawObservations: RawObservation[],
  activeBuses: PhysicalBusRecord[],
  previousLivePositions: Record<string, LivePositionRecord>,
  nowMs: number = Date.now(),
  stations: StationPoint[] = HDBRTS_STATIONS,
  corridor: Coordinates[] = HDBRTS_CORRIDOR_POINTS,
  cumDists: number[] = CORRIDOR_CUMULATIVE_DISTANCES
): AggregationOutput {
  // 1. Filter and project observations
  const validObservations: ValidatedObservation[] = [];
  for (const raw of rawObservations) {
    const valid = filterAndProjectObservation(raw, nowMs, corridor, cumDists);
    if (valid) {
      validObservations.push(valid);
    }
  }

  // 2. Spatial-Temporal 1D Clustering
  const clusters = clusterObservations(validObservations, nowMs, stations, corridor, cumDists);

  // 3. Associate clusters with physical buses
  const livePositionUpdates: Partial<LivePositionRecord>[] = [];
  const unmatchedClusters: AggregationOutput['unmatchedClusters'] = [];
  const assignedBusIds = new Set<string>();

  for (const cluster of clusters) {
    const result = associateClusterWithPhysicalBus(
      cluster,
      activeBuses.filter((b) => !assignedBusIds.has(b.id)),
      previousLivePositions,
      nowMs
    );

    if (result.associatedBusId) {
      assignedBusIds.add(result.associatedBusId);
      const prev = previousLivePositions[result.associatedBusId];

      // Stale write protection: do not overwrite a newer position with an older observation
      if (prev && new Date(prev.last_observation_at).getTime() > new Date(cluster.latestObservationAt).getTime()) {
        continue;
      }

      const updateRecord: Partial<LivePositionRecord> = {
        bus_id: result.associatedBusId,
        service_number: cluster.serviceNumber,
        lat: cluster.latitude,
        lng: cluster.longitude,
        heading: cluster.heading,
        speed: cluster.speed ?? 0,
        tracking_source: 'observed',
        movement_state: cluster.movementState,
        confidence_tier: cluster.confidenceTier,
        active_contributors: cluster.activeContributors,
        last_observation_at: cluster.latestObservationAt,
        first_established_at: prev?.first_established_at || cluster.earliestObservationAt,
        updated_at: new Date(nowMs).toISOString(),
      };

      livePositionUpdates.push(updateRecord);
    } else {
      unmatchedClusters.push({
        serviceNumber: cluster.serviceNumber,
        corridorDistance: Math.round(cluster.meanS),
        latitude: cluster.latitude,
        longitude: cluster.longitude,
        activeContributors: cluster.activeContributors,
        timestamp: cluster.latestObservationAt,
        reason: result.reason,
      });
    }
  }

  return {
    livePositionUpdates,
    unmatchedClusters,
    processedCount: rawObservations.length,
    validCount: validObservations.length,
    clusterCount: clusters.length,
  };
}
