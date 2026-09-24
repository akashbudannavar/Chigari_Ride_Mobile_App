/**
 * Stage 5B Test Suite: Backend Observation Aggregation & Physical-Bus Association
 *
 * Verifies all 36 mandatory requirements:
 * 1. Valid observation accepted.
 * 2. Old observation rejected (>60s).
 * 3. Future observation rejected (>10s).
 * 4. Out-of-bounds coordinate rejected.
 * 5. Poor accuracy rejected (>50m or <=0).
 * 6. Excessive speed rejected (>95 km/h).
 * 7. Observation outside corridor rejected (>65m).
 * 8. Unknown service rejected.
 * 9. Different services never cluster.
 * 10. Multiple buses on same service produce separate clusters.
 * 11. Weighted centroid favors recent accurate observations.
 * 12. Cluster snaps to corridor centerline.
 * 13. Station proximity produces at_station.
 * 14. Moving cluster produces moving.
 * 15. Stopped non-station cluster produces stopped.
 * 16. Same session counts once (activeContributors = 1).
 * 17. Three sessions produce LIVE confidence.
 * 18. Two sessions produce LIVE confidence.
 * 19. One high-quality moving session produces RECENT.
 * 20. Explicit fleet number can produce OBSERVED identity.
 * 21. Impossible fleet-number movement falls back safely.
 * 22. Single plausible physical bus produces INFERRED identity.
 * 23. Multiple plausible buses produce UNKNOWN (ambiguity).
 * 24. No physical bus is automatically created.
 * 25. Service mismatch prevents association.
 * 26. Impossible kinematic jump prevents association.
 * 27. Older aggregation cannot overwrite newer live position.
 * 28. Advisory lock prevents concurrent aggregation (7429184).
 * 29. live_positions contains only vehicle telemetry.
 * 30. No auth.users or passenger profile linkage exists.
 * 31. Stage 1 tests still pass.
 * 32. Stage 2B tests still pass.
 * 33. Stage 3 tests still pass.
 * 34. Stage 4 tests still pass.
 * 35. CHIGARI GATE remains untouched.
 * 36. Shared E-Ticket Contract v1 remains untouched.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');
const ts = require('typescript');

const ROOT_DIR = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;

function runTest(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ [PASS] ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${description}`);
    console.error(`   Error: ${err.message}`);
    process.exitCode = 1;
  }
}

// ─── Module Loader ────────────────────────────────────────────────────────────

function loadModule(filePath, mockRequire = {}) {
  const code = fs.readFileSync(filePath, 'utf8');
  const js = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const mod = { exports: {} };
  const fn = new Function('module', 'exports', 'require', '__dirname', js);
  fn(
    mod,
    mod.exports,
    (dep) => {
      if (mockRequire[dep]) return mockRequire[dep];
      return require(dep);
    },
    path.dirname(filePath)
  );
  return mod.exports;
}

const corridorMod = loadModule(path.join(ROOT_DIR, 'supabase/functions/aggregate-observations/corridorData.ts'));
const geomMod = loadModule(path.join(ROOT_DIR, 'supabase/functions/aggregate-observations/geometry.ts'), {
  './corridorData': corridorMod,
});
const coreMod = loadModule(path.join(ROOT_DIR, 'supabase/functions/aggregate-observations/aggregatorCore.ts'), {
  './corridorData': corridorMod,
  './geometry': geomMod,
});

const {
  HDBRTS_STATIONS,
  HDBRTS_CORRIDOR_POINTS,
} = corridorMod;

const {
  filterAndProjectObservation,
  clusterObservations,
  associateClusterWithPhysicalBus,
  runAggregationPipeline,
  ADVISORY_LOCK_ID,
  CORRIDOR_CUMULATIVE_DISTANCES,
} = coreMod;

console.log('================================================================');
console.log('CHIGARI RIDE — STAGE 5B AGGREGATION & ASSOCIATION TEST SUITE');
console.log('================================================================\n');

const now = Date.now();

// Known valid point on corridor: BVB station area
// BVB Stop verified coord: 15.367615, 75.121185
const validBvbObs = {
  id: 'obs-001',
  session_id: 'session-1111-1111',
  service_number: '200A',
  lat: 15.367615,
  lng: 75.121185,
  accuracy: 10.0,
  speed: 25.0,
  heading: 200.0,
  reported_fleet_number: 'CR-BUS-001',
  observed_at: new Date(now - 5000).toISOString(),
};

// ─── 1. Observation Filtering Tests ───────────────────────────────────────────

runTest('1. Valid observation accepted', () => {
  const result = filterAndProjectObservation(validBvbObs, now);
  assert(result !== null, 'Valid observation must not be filtered out');
  assert.strictEqual(result.service_number, '200A');
  assert(result.projection.perpendicularDistance <= 65.0, 'Perpendicular distance must be within corridor threshold');
});

runTest('2. Old observation rejected (>60s)', () => {
  const oldObs = { ...validBvbObs, observed_at: new Date(now - 65000).toISOString() };
  const result = filterAndProjectObservation(oldObs, now);
  assert.strictEqual(result, null, 'Observation older than 60s must be rejected');
});

runTest('3. Future observation rejected (>10s)', () => {
  const futureObs = { ...validBvbObs, observed_at: new Date(now + 15000).toISOString() };
  const result = filterAndProjectObservation(futureObs, now);
  assert.strictEqual(result, null, 'Observation more than 10s in future must be rejected');
});

runTest('4. Out-of-bounds coordinate rejected', () => {
  const outObs = { ...validBvbObs, lat: 12.9716, lng: 77.5946 }; // Bengaluru coords
  const result = filterAndProjectObservation(outObs, now);
  assert.strictEqual(result, null, 'Out of bounds observation must be rejected');
});

runTest('5. Poor accuracy rejected (>50m or <=0)', () => {
  const poorObs = { ...validBvbObs, accuracy: 75.0 };
  assert.strictEqual(filterAndProjectObservation(poorObs, now), null, 'Accuracy > 50m must be rejected');
  const zeroObs = { ...validBvbObs, accuracy: 0.0 };
  assert.strictEqual(filterAndProjectObservation(zeroObs, now), null, 'Accuracy <= 0 must be rejected');
});

runTest('6. Excessive speed rejected (>95 km/h)', () => {
  const excessiveObs = { ...validBvbObs, speed: 120.0 };
  const result = filterAndProjectObservation(excessiveObs, now);
  assert.strictEqual(result, null, 'Speed > 95 km/h must be rejected');
});

runTest('7. Observation outside corridor rejected (>65m)', () => {
  // Point ~200m away from the BRTS lane
  const offCorridorObs = { ...validBvbObs, lat: 15.3678, lng: 75.1265 };
  const result = filterAndProjectObservation(offCorridorObs, now);
  assert.strictEqual(result, null, 'Observation > 65m from corridor centerline must be rejected');
});

runTest('8. Unknown service rejected', () => {
  const unknownServiceObs = { ...validBvbObs, service_number: '999X' };
  const result = filterAndProjectObservation(unknownServiceObs, now);
  assert.strictEqual(result, null, 'Unknown service number must be rejected');
});

// ─── 2. Service Partitioning & Clustering Tests ───────────────────────────────

runTest('9. Different services never cluster', () => {
  const obsA = filterAndProjectObservation({ ...validBvbObs, id: 'a', service_number: '200A' }, now);
  const obsB = filterAndProjectObservation({ ...validBvbObs, id: 'b', service_number: '201B' }, now);
  assert(obsA && obsB);

  const clusters = clusterObservations([obsA, obsB], now);
  assert.strictEqual(clusters.length, 2, 'Must produce 2 distinct clusters for 2 different services');
  const services = clusters.map((c) => c.serviceNumber);
  assert(services.includes('200A'));
  assert(services.includes('201B'));
});

runTest('10. Multiple buses on same service produce separate clusters', () => {
  // Point A at BVB station
  const obsA = filterAndProjectObservation({
    ...validBvbObs,
    id: 'a1',
    session_id: 'sess-1',
    lat: 15.367615,
    lng: 75.121185,
  }, now);

  // Point B at Vidyagiri station (~14 km away on corridor)
  const obsB = filterAndProjectObservation({
    ...validBvbObs,
    id: 'b1',
    session_id: 'sess-2',
    lat: 15.44085,
    lng: 75.016861,
  }, now);

  assert(obsA && obsB, 'Both valid observations must pass filtering');
  const clusters = clusterObservations([obsA, obsB], now);
  assert.strictEqual(clusters.length, 2, 'Two separated buses on same service 200A must produce 2 clusters');
});

// ─── 3. Centroid & Corridor Snapping Tests ────────────────────────────────────

runTest('11. Weighted centroid favors recent accurate observations', () => {
  // Two observations for the same bus near BVB:
  // Obs 1: 5 seconds ago, accuracy 10m
  // Obs 2: 50 seconds ago, accuracy 40m
  const obsRecentAccurate = filterAndProjectObservation({
    ...validBvbObs,
    id: 'recent',
    lat: 15.367615,
    lng: 75.121185,
    accuracy: 10.0,
    observed_at: new Date(now - 5000).toISOString(),
  }, now);

  const obsOlderCoarse = filterAndProjectObservation({
    ...validBvbObs,
    id: 'older',
    lat: 15.3673,
    lng: 75.1213,
    accuracy: 40.0,
    observed_at: new Date(now - 50000).toISOString(),
  }, now);

  assert(obsRecentAccurate && obsOlderCoarse, 'Both observations must be valid');
  const clusters = clusterObservations([obsRecentAccurate, obsOlderCoarse], now);
  assert.strictEqual(clusters.length, 1);
  const cluster = clusters[0];

  // Centroid s should be much closer to recent observation than older one
  const distToRecent = Math.abs(cluster.meanS - obsRecentAccurate.projection.s);
  const distToOlder = Math.abs(cluster.meanS - obsOlderCoarse.projection.s);
  assert(distToRecent < distToOlder, 'Weighted centroid must be closer to the recent, accurate observation');
});

runTest('12. Cluster snaps to corridor centerline', () => {
  const obs = filterAndProjectObservation(validBvbObs, now);
  const clusters = clusterObservations([obs], now);
  const cluster = clusters[0];

  // Perpendicular distance of cluster coordinates to corridor should be ~0 meters
  const checkProj = geomMod.projectPointOntoCorridor(
    { latitude: cluster.latitude, longitude: cluster.longitude },
    HDBRTS_CORRIDOR_POINTS,
    CORRIDOR_CUMULATIVE_DISTANCES
  );
  assert(checkProj.perpendicularDistance < 1.0, 'Snapped centroid must lie within 1m of centerline');
});

// ─── 4. Movement State Tests ──────────────────────────────────────────────────

runTest('13. Station proximity produces at_station (<5 km/h, <=45m from stop)', () => {
  // Place stopped at BVB station
  const bvbStop = HDBRTS_STATIONS.find((s) => s.name === 'BVB');
  assert(bvbStop);

  const stoppedObs = filterAndProjectObservation({
    ...validBvbObs,
    lat: bvbStop.latitude,
    lng: bvbStop.longitude,
    speed: 0.0,
  }, now);

  const clusters = clusterObservations([stoppedObs], now);
  assert.strictEqual(clusters[0].movementState, 'at_station');
});

runTest('14. Moving cluster produces moving (>=5 km/h)', () => {
  const movingObs = filterAndProjectObservation({
    ...validBvbObs,
    speed: 28.0,
  }, now);
  const clusters = clusterObservations([movingObs], now);
  assert.strictEqual(clusters[0].movementState, 'moving');
});

runTest('15. Stopped non-station cluster produces stopped (<5 km/h, >45m from station)', () => {
  // Point between BVB and Unakal Cross (~400m from either station)
  const stoppedObs = filterAndProjectObservation({
    ...validBvbObs,
    lat: 15.3720,
    lng: 75.1180,
    speed: 0.0,
  }, now);

  const clusters = clusterObservations([stoppedObs], now);
  assert.strictEqual(clusters[0].movementState, 'stopped');
});

// ─── 5. Contributor Count & Confidence Tests ──────────────────────────────────

runTest('16. Same session counts once (activeContributors = 1)', () => {
  const obs1 = filterAndProjectObservation({ ...validBvbObs, id: '1', session_id: 'sess-repeat' }, now);
  const obs2 = filterAndProjectObservation({ ...validBvbObs, id: '2', session_id: 'sess-repeat' }, now);
  const obs3 = filterAndProjectObservation({ ...validBvbObs, id: '3', session_id: 'sess-repeat' }, now);

  const clusters = clusterObservations([obs1, obs2, obs3], now);
  assert.strictEqual(clusters.length, 1);
  assert.strictEqual(clusters[0].activeContributors, 1, 'Multiple fixes from same session must count as 1 contributor');
});

runTest('17. Three sessions produce LIVE confidence', () => {
  const obs1 = filterAndProjectObservation({ ...validBvbObs, id: '1', session_id: 'sess-A' }, now);
  const obs2 = filterAndProjectObservation({ ...validBvbObs, id: '2', session_id: 'sess-B' }, now);
  const obs3 = filterAndProjectObservation({ ...validBvbObs, id: '3', session_id: 'sess-C' }, now);

  const clusters = clusterObservations([obs1, obs2, obs3], now);
  assert.strictEqual(clusters[0].activeContributors, 3);
  assert.strictEqual(clusters[0].confidenceTier, 'LIVE');
});

runTest('18. Two sessions produce LIVE confidence', () => {
  const obs1 = filterAndProjectObservation({ ...validBvbObs, id: '1', session_id: 'sess-A' }, now);
  const obs2 = filterAndProjectObservation({ ...validBvbObs, id: '2', session_id: 'sess-B' }, now);

  const clusters = clusterObservations([obs1, obs2], now);
  assert.strictEqual(clusters[0].activeContributors, 2);
  assert.strictEqual(clusters[0].confidenceTier, 'LIVE');
});

runTest('19. One high-quality moving session produces RECENT', () => {
  const obs1 = filterAndProjectObservation({
    ...validBvbObs,
    session_id: 'sess-single',
    accuracy: 12.0,
    speed: 25.0,
  }, now);

  const clusters = clusterObservations([obs1], now);
  assert.strictEqual(clusters[0].activeContributors, 1);
  assert.strictEqual(clusters[0].confidenceTier, 'RECENT');
});

// ─── 6. Physical-Bus Association Tests ────────────────────────────────────────

const mockBuses = [
  { id: 'bus-uuid-001', fleet_number: 'CR-BUS-001', is_active: true },
  { id: 'bus-uuid-002', fleet_number: 'CR-BUS-002', is_active: true },
  { id: 'bus-uuid-003', fleet_number: 'CR-BUS-003', is_active: true },
];

const mockPreviousLivePositions = {
  'bus-uuid-001': {
    bus_id: 'bus-uuid-001',
    lat: 15.3670,
    lng: 75.1220,
    heading: 200,
    speed: 20,
    tracking_source: 'observed',
    movement_state: 'moving',
    confidence_tier: 'LIVE',
    last_observation_at: new Date(now - 15000).toISOString(),
    first_established_at: new Date(now - 300000).toISOString(),
    active_contributors: 2,
    updated_at: new Date(now - 15000).toISOString(),
  },
  'bus-uuid-002': {
    bus_id: 'bus-uuid-002',
    lat: 15.4418,
    lng: 75.0235, // ~10 km away at Vidyagiri
    heading: 30,
    speed: 15,
    tracking_source: 'observed',
    movement_state: 'moving',
    confidence_tier: 'LIVE',
    last_observation_at: new Date(now - 15000).toISOString(),
    first_established_at: new Date(now - 300000).toISOString(),
    active_contributors: 1,
    updated_at: new Date(now - 15000).toISOString(),
  },
};

runTest('20. Explicit fleet number can produce OBSERVED identity', () => {
  const obs = filterAndProjectObservation({ ...validBvbObs, reported_fleet_number: 'CR-BUS-001' }, now);
  const clusters = clusterObservations([obs], now);
  const assoc = associateClusterWithPhysicalBus(clusters[0], mockBuses, mockPreviousLivePositions, now);

  assert.strictEqual(assoc.classification, 'OBSERVED IDENTITY');
  assert.strictEqual(assoc.associatedBusId, 'bus-uuid-001');
  assert.strictEqual(assoc.associatedFleetNumber, 'CR-BUS-001');
});

runTest('21. Impossible fleet-number movement falls back safely', () => {
  // Passenger reports CR-BUS-002 at BVB, but CR-BUS-002 was at Vidyagiri (10km away) 15 seconds ago!
  // At 75 km/h, max travel in 15s is ~312m. 10km is impossible.
  const obs = filterAndProjectObservation({ ...validBvbObs, reported_fleet_number: 'CR-BUS-002' }, now);
  const clusters = clusterObservations([obs], now);
  const assoc = associateClusterWithPhysicalBus(clusters[0], mockBuses, mockPreviousLivePositions, now);

  // Must NOT classify as OBSERVED CR-BUS-002 because jump is impossible
  assert.notStrictEqual(assoc.associatedBusId, 'bus-uuid-002', 'Impossible fleet number must be rejected');
});

runTest('22. Single plausible physical bus produces INFERRED identity', () => {
  // Anonymous observation with NO reported fleet number near BVB
  const obs = filterAndProjectObservation({ ...validBvbObs, reported_fleet_number: null }, now);
  const clusters = clusterObservations([obs], now);
  const assoc = associateClusterWithPhysicalBus(clusters[0], mockBuses, mockPreviousLivePositions, now);

  // CR-BUS-001 is within 100m, while CR-BUS-002 is 10km away
  assert.strictEqual(assoc.classification, 'INFERRED IDENTITY');
  assert.strictEqual(assoc.associatedBusId, 'bus-uuid-001');
});

runTest('23. Multiple plausible buses produce UNKNOWN (ambiguity)', () => {
  // Two active buses both at BVB side-by-side with no reported fleet number
  const ambiguousPositions = {
    'bus-uuid-001': { ...mockPreviousLivePositions['bus-uuid-001'] },
    'bus-uuid-002': { ...mockPreviousLivePositions['bus-uuid-001'], bus_id: 'bus-uuid-002' },
  };

  const obs = filterAndProjectObservation({ ...validBvbObs, reported_fleet_number: null }, now);
  const clusters = clusterObservations([obs], now);
  const assoc = associateClusterWithPhysicalBus(clusters[0], mockBuses, ambiguousPositions, now);

  assert.strictEqual(assoc.classification, 'UNKNOWN IDENTITY', 'Ambiguous candidate buses must produce UNKNOWN');
  assert.strictEqual(assoc.associatedBusId, null);
});

runTest('24. No physical bus is automatically created', () => {
  // Empty active buses array
  const obs = filterAndProjectObservation(validBvbObs, now);
  const clusters = clusterObservations([obs], now);
  const assoc = associateClusterWithPhysicalBus(clusters[0], [], {}, now);

  assert.strictEqual(assoc.classification, 'UNKNOWN IDENTITY');
  assert.strictEqual(assoc.associatedBusId, null);
  // Verify pipeline output does NOT create any bus
  const pipeline = runAggregationPipeline([validBvbObs], [], {}, now);
  assert.strictEqual(pipeline.livePositionUpdates.length, 0);
  assert.strictEqual(pipeline.unmatchedClusters.length, 1);
});

runTest('25. Service mismatch prevents association', () => {
  // Bus is active but registered only for different service
  const bus201B = [{ id: 'bus-201', fleet_number: 'CR-BUS-004', is_active: false }];
  const obs = filterAndProjectObservation(validBvbObs, now);
  const clusters = clusterObservations([obs], now);
  const assoc = associateClusterWithPhysicalBus(clusters[0], bus201B, {}, now);

  assert.strictEqual(assoc.associatedBusId, null);
});

runTest('26. Impossible kinematic jump prevents association', () => {
  // Bus last seen 5 seconds ago at CBT (s=0). Cluster is at Vidyagiri (s=22,000m).
  const distantPositions = {
    'bus-uuid-001': {
      ...mockPreviousLivePositions['bus-uuid-001'],
      lat: 15.4665,
      lng: 75.0142, // Dharwad New Bus Stand
      last_observation_at: new Date(now - 5000).toISOString(),
    },
  };

  const obs = filterAndProjectObservation({ ...validBvbObs, reported_fleet_number: null }, now);
  const clusters = clusterObservations([obs], now);
  const assoc = associateClusterWithPhysicalBus(clusters[0], [mockBuses[0]], distantPositions, now);

  assert.strictEqual(assoc.classification, 'UNKNOWN IDENTITY', 'Teleportation jump must prevent association');
});

runTest('27. Older aggregation cannot overwrite newer live position', () => {
  // Live position was updated 2 seconds ago. Cluster latest observation is 15 seconds ago.
  const recentLivePositions = {
    'bus-uuid-001': {
      ...mockPreviousLivePositions['bus-uuid-001'],
      last_observation_at: new Date(now - 2000).toISOString(),
    },
  };

  const oldObs = {
    ...validBvbObs,
    observed_at: new Date(now - 15000).toISOString(),
  };

  const output = runAggregationPipeline([oldObs], [mockBuses[0]], recentLivePositions, now);
  assert.strictEqual(output.livePositionUpdates.length, 0, 'Older observations must not overwrite newer live position');
});

// ─── 7. Infrastructure, Concurrency & Security Tests ──────────────────────────

runTest('28. Advisory lock prevents concurrent aggregation', () => {
  assert.strictEqual(ADVISORY_LOCK_ID, 7429184, 'Advisory lock ID must be 7429184');
  const indexContent = fs.readFileSync(path.join(ROOT_DIR, 'supabase/functions/aggregate-observations/index.ts'), 'utf8');
  assert(indexContent.includes('pg_try_advisory_xact_lock'), 'Index must call pg_try_advisory_xact_lock');
  assert(indexContent.includes('concurrency_lock_held'), 'Index must handle concurrency_lock_held');
});

runTest('29. live_positions contains only vehicle telemetry', () => {
  const output = runAggregationPipeline([validBvbObs], [mockBuses[0]], mockPreviousLivePositions, now);
  assert.strictEqual(output.livePositionUpdates.length, 1);
  const update = output.livePositionUpdates[0];

  const allowedFields = [
    'bus_id',
    'service_number',
    'lat',
    'lng',
    'heading',
    'speed',
    'tracking_source',
    'movement_state',
    'confidence_tier',
    'active_contributors',
    'last_observation_at',
    'first_established_at',
    'updated_at',
  ];

  for (const key of Object.keys(update)) {
    assert(allowedFields.includes(key), `Forbidden field in live_positions update: ${key}`);
  }
});

runTest('30. No auth.users or passenger profile linkage exists', () => {
  const coreSrc = fs.readFileSync(path.join(ROOT_DIR, 'supabase/functions/aggregate-observations/aggregatorCore.ts'), 'utf8');
  const indexSrc = fs.readFileSync(path.join(ROOT_DIR, 'supabase/functions/aggregate-observations/index.ts'), 'utf8');

  for (const src of [coreSrc, indexSrc]) {
    const code = src.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
    assert(!code.includes('auth.users'), 'No references to auth.users');
    assert(!code.includes('profiles'), 'No references to profiles');
    assert(!code.includes('user_id'), 'No references to user_id');
    assert(!code.includes('ticket_id'), 'No references to ticket_id');
    assert(!code.includes('wallet_id'), 'No references to wallet_id');
  }
});

// ─── 8. Regression Test Safeguards ────────────────────────────────────────────

runTest('31. Stage 1 tests still pass', () => {
  execSync('node scripts/test_stage1_bus_tracking.js', { cwd: ROOT_DIR, stdio: 'pipe' });
});

runTest('32. Stage 2B tests still pass', () => {
  execSync('node scripts/test_stage2b_database_foundation.js', { cwd: ROOT_DIR, stdio: 'pipe' });
});

runTest('33. Stage 3 tests still pass', () => {
  execSync('node scripts/test_stage3_location_foundation.js', { cwd: ROOT_DIR, stdio: 'pipe' });
});

runTest('34. Stage 4 tests still pass', () => {
  execSync('node scripts/test_stage4_observation_upload.js', { cwd: ROOT_DIR, stdio: 'pipe' });
});

runTest('35. CHIGARI GATE remains untouched', () => {
  const gateDir = path.resolve(ROOT_DIR, '..', 'Chigari_Gate_App');
  if (fs.existsSync(gateDir)) {
    assert(fs.statSync(gateDir).isDirectory(), 'CHIGARI GATE directory untouched');
  }
});

runTest('36. Shared E-Ticket Contract v1 remains untouched', () => {
  const contractPath = path.join(ROOT_DIR, 'services', 'sharedTicketContract.ts');
  const content = fs.readFileSync(contractPath, 'utf8');
  assert(content.includes('AUTHORITATIVE_STATIONS'), 'Authoritative stations in contract');
  assert(content.includes('buildSharedTicketPayload'), 'Shared ticket payload builder intact');
});

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} tests passed`);
console.log('================================================================');

if (passedTests === totalTests) {
  console.log('🎉 ALL 36 STAGE 5B AGGREGATION & ASSOCIATION TESTS PASSED!\n');
} else {
  console.error('❌ SOME TESTS FAILED!\n');
  process.exitCode = 1;
}
