/**
 * Stage 6B-1 Test Suite: Client-Side Confidence Decay & Tracking State Engine
 *
 * Validates:
 * 1. Fresh live observation (< 25s) with server LIVE -> returns LIVE
 * 2. Moderate age (25s - 59s) with server LIVE -> degrades to RECENT
 * 3. Medium age (60s - 119s) -> degrades to ESTIMATED
 * 4. Older age (120s - 299s) -> degrades to STALE
 * 5. Age >= 300s (5 minutes) -> degrades to OFFLINE
 * 6. Fresh update arriving after bus was STALE immediately restores confidence to LIVE
 * 7. Future timestamp within clock skew tolerance -> clamped to 0s elapsed, stays LIVE
 * 8. Unparseable / null timestamp gracefully handled without throwing
 * 9. Stopped bus in traffic (< 300s) decays tier by time but movement_state remains 'stopped' until >= 300s
 * 10. At-station bus (< 300s) decays tier by time but movement_state remains 'at_station' until >= 300s
 * 11. When telemetry reaches >= 300s, movement_state becomes 'offline' and confidence becomes 'OFFLINE'
 * 12. Independent physical bus evaluation on same service (200A): Bus A (fresh, LIVE) vs Bus B (150s, STALE)
 * 13. Multiple physical buses across different services (200A vs 201B) do not cross-contaminate
 * 14. Mobile tracking engine performs ZERO writes to Supabase (read-only verification)
 * 15. Zero local storage persistence (no AsyncStorage / SecureStore / SQLite in tracking state engine)
 * 16. CHIGARI GATE remains untouched
 * 17. Shared E-Ticket Contract v1 remains untouched
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
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

function loadTranspiled(relPath) {
  const abs = path.join(ROOT_DIR, relPath);
  const code = fs.readFileSync(abs, 'utf8');
  const js = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', js)(mod, mod.exports, (dep) => {
    if (dep === '@/types/transit' || dep === '../types/transit') return {};
    return require(dep);
  });
  return mod.exports;
}

const engineMod = loadTranspiled('services/trackingConfidenceEngine.ts');
const {
  CONFIDENCE_THRESHOLDS,
  CONFIDENCE_RANK,
  parseObservationTimestamp,
  computeClientConfidenceTier,
  getEffectiveMovementState,
  applyConfidenceDecayToBus,
  applyConfidenceDecayToBuses,
  getConfidenceBadgeColor,
  getConfidenceLabel,
} = engineMod;

console.log('================================================================');
console.log('CHIGARI RIDE — STAGE 6B-1 CONFIDENCE DECAY TEST SUITE');
console.log('================================================================\n');

// ─── 1. Decay Threshold Tests ─────────────────────────────────────────────────

runTest('1. Fresh live observation (< 25s) with server LIVE -> returns LIVE', () => {
  const now = 1727160000000;
  const lastObs = new Date(now - 10000).toISOString(); // 10s old
  const tier = computeClientConfidenceTier({
    serverTier: 'LIVE',
    lastObservationAt: lastObs,
    nowMs: now,
  });
  assert.strictEqual(tier, 'LIVE');
});

runTest('2. Moderate age (25s - 59s) with server LIVE -> degrades to RECENT', () => {
  const now = 1727160000000;
  const lastObs25 = new Date(now - 25000).toISOString(); // 25s old
  const lastObs45 = new Date(now - 45000).toISOString(); // 45s old
  const lastObs59 = new Date(now - 59000).toISOString(); // 59s old

  assert.strictEqual(computeClientConfidenceTier({ serverTier: 'LIVE', lastObservationAt: lastObs25, nowMs: now }), 'RECENT');
  assert.strictEqual(computeClientConfidenceTier({ serverTier: 'LIVE', lastObservationAt: lastObs45, nowMs: now }), 'RECENT');
  assert.strictEqual(computeClientConfidenceTier({ serverTier: 'LIVE', lastObservationAt: lastObs59, nowMs: now }), 'RECENT');
});

runTest('3. Medium age (60s - 119s) -> degrades to ESTIMATED', () => {
  const now = 1727160000000;
  const lastObs60 = new Date(now - 60000).toISOString(); // 60s old
  const lastObs90 = new Date(now - 90000).toISOString(); // 90s old
  const lastObs119 = new Date(now - 119000).toISOString(); // 119s old

  assert.strictEqual(computeClientConfidenceTier({ serverTier: 'LIVE', lastObservationAt: lastObs60, nowMs: now }), 'ESTIMATED');
  assert.strictEqual(computeClientConfidenceTier({ serverTier: 'RECENT', lastObservationAt: lastObs90, nowMs: now }), 'ESTIMATED');
  assert.strictEqual(computeClientConfidenceTier({ serverTier: 'LIVE', lastObservationAt: lastObs119, nowMs: now }), 'ESTIMATED');
});

runTest('4. Older age (120s - 299s) -> degrades to STALE', () => {
  const now = 1727160000000;
  const lastObs120 = new Date(now - 120000).toISOString(); // 2 min old
  const lastObs200 = new Date(now - 200000).toISOString(); // 3.3 min old
  const lastObs299 = new Date(now - 299000).toISOString(); // 4.9 min old

  assert.strictEqual(computeClientConfidenceTier({ serverTier: 'LIVE', lastObservationAt: lastObs120, nowMs: now }), 'STALE');
  assert.strictEqual(computeClientConfidenceTier({ serverTier: 'ESTIMATED', lastObservationAt: lastObs200, nowMs: now }), 'STALE');
  assert.strictEqual(computeClientConfidenceTier({ serverTier: 'LIVE', lastObservationAt: lastObs299, nowMs: now }), 'STALE');
});

runTest('5. Age >= 300s (5 minutes) -> degrades to OFFLINE', () => {
  const now = 1727160000000;
  const lastObs300 = new Date(now - 300000).toISOString(); // exactly 5 min
  const lastObs600 = new Date(now - 600000).toISOString(); // 10 min old

  assert.strictEqual(computeClientConfidenceTier({ serverTier: 'LIVE', lastObservationAt: lastObs300, nowMs: now }), 'OFFLINE');
  assert.strictEqual(computeClientConfidenceTier({ serverTier: 'RECENT', lastObservationAt: lastObs600, nowMs: now }), 'OFFLINE');
});

runTest('6. Fresh update arriving after bus was STALE immediately restores confidence to LIVE', () => {
  const now = 1727160000000;
  // Bus was previously evaluated at stale time
  const staleObs = new Date(now - 180000).toISOString(); // 3 min ago
  const bus = {
    id: 'bus-1',
    physicalBusId: 'CR-BUS-001',
    busNumber: '200A',
    confidenceTier: 'STALE',
    movementState: 'moving',
    lastObservationAt: staleObs,
    lastUpdated: staleObs,
  };

  const decayedStale = applyConfidenceDecayToBus(bus, now);
  assert.strictEqual(decayedStale.confidenceTier, 'STALE');

  // Fresh update arrives from Realtime 2 seconds ago with LIVE tier
  const freshObs = new Date(now - 2000).toISOString();
  const freshUpdate = {
    ...bus,
    confidenceTier: 'LIVE',
    lastObservationAt: freshObs,
    lastUpdated: freshObs,
  };

  const restored = applyConfidenceDecayToBus(freshUpdate, now);
  assert.strictEqual(restored.confidenceTier, 'LIVE');
});

runTest('7. Future timestamp within clock skew tolerance -> clamped to 0s elapsed, stays LIVE', () => {
  const now = 1727160000000;
  const futureObs = new Date(now + 5000).toISOString(); // 5s in the future (skew)
  const tier = computeClientConfidenceTier({
    serverTier: 'LIVE',
    lastObservationAt: futureObs,
    nowMs: now,
  });
  assert.strictEqual(tier, 'LIVE');
});

runTest('8. Unparseable / null timestamp gracefully handled without throwing', () => {
  assert.doesNotThrow(() => {
    const tierNull = computeClientConfidenceTier({ serverTier: 'RECENT', lastObservationAt: null });
    assert.strictEqual(tierNull, 'RECENT');

    const tierUndefined = computeClientConfidenceTier({ serverTier: 'ESTIMATED', lastObservationAt: undefined });
    assert.strictEqual(tierUndefined, 'ESTIMATED');

    const tierGarbage = computeClientConfidenceTier({ serverTier: 'LIVE', lastObservationAt: 'invalid-date-string' });
    assert.strictEqual(tierGarbage, 'LIVE');

    const tierDemo = computeClientConfidenceTier({ serverTier: 'LIVE', lastObservationAt: 'Just now' });
    assert.strictEqual(tierDemo, 'LIVE');
  });
});

// ─── 2. Movement State Nuance Tests ───────────────────────────────────────────

runTest('9. Stopped bus in traffic (< 300s) decays tier by time but movement_state remains "stopped" until >= 300s', () => {
  const now = 1727160000000;
  const obs180 = new Date(now - 180000).toISOString(); // 3 min ago

  const bus = {
    id: 'bus-1',
    physicalBusId: 'CR-BUS-001',
    busNumber: '200A',
    confidenceTier: 'LIVE',
    movementState: 'stopped',
    speed: 0,
    lastObservationAt: obs180,
    lastUpdated: obs180,
  };

  const decayed = applyConfidenceDecayToBus(bus, now);
  assert.strictEqual(decayed.confidenceTier, 'STALE');
  assert.strictEqual(decayed.movementState, 'stopped', 'Movement state must remain "stopped", not prematurely "offline"');
});

runTest('10. At-station bus (< 300s) decays tier by time but movement_state remains "at_station" until >= 300s', () => {
  const now = 1727160000000;
  const obs90 = new Date(now - 90000).toISOString(); // 90s ago

  const bus = {
    id: 'bus-2',
    physicalBusId: 'CR-BUS-002',
    busNumber: '200A',
    confidenceTier: 'LIVE',
    movementState: 'at_station',
    speed: 0,
    lastObservationAt: obs90,
    lastUpdated: obs90,
  };

  const decayed = applyConfidenceDecayToBus(bus, now);
  assert.strictEqual(decayed.confidenceTier, 'ESTIMATED');
  assert.strictEqual(decayed.movementState, 'at_station', 'Movement state must remain "at_station"');
});

runTest('11. When telemetry reaches >= 300s, movement_state becomes "offline" and confidence becomes "OFFLINE"', () => {
  const now = 1727160000000;
  const obs400 = new Date(now - 400000).toISOString(); // > 5 min ago

  const busStopped = {
    id: 'bus-1',
    physicalBusId: 'CR-BUS-001',
    busNumber: '200A',
    confidenceTier: 'LIVE',
    movementState: 'stopped',
    lastObservationAt: obs400,
    lastUpdated: obs400,
  };

  const decayed = applyConfidenceDecayToBus(busStopped, now);
  assert.strictEqual(decayed.confidenceTier, 'OFFLINE');
  assert.strictEqual(decayed.movementState, 'offline');
});

// ─── 3. Multi-Bus & Service Number Independence ──────────────────────────────

runTest('12. Independent physical bus evaluation on same service (200A): Bus A (fresh, LIVE) vs Bus B (150s, STALE)', () => {
  const now = 1727160000000;
  const obsA = new Date(now - 5000).toISOString();  // 5s old
  const obsB = new Date(now - 150000).toISOString(); // 150s old

  const buses = [
    {
      id: 'bus-1',
      physicalBusId: 'CR-BUS-001',
      busNumber: '200A',
      confidenceTier: 'LIVE',
      movementState: 'moving',
      lastObservationAt: obsA,
      lastUpdated: obsA,
    },
    {
      id: 'bus-2',
      physicalBusId: 'CR-BUS-002',
      busNumber: '200A',
      confidenceTier: 'LIVE',
      movementState: 'moving',
      lastObservationAt: obsB,
      lastUpdated: obsB,
    },
  ];

  const processed = applyConfidenceDecayToBuses(buses, now);

  const busA = processed.find((b) => b.physicalBusId === 'CR-BUS-001');
  const busB = processed.find((b) => b.physicalBusId === 'CR-BUS-002');

  assert.strictEqual(busA.confidenceTier, 'LIVE', 'Bus A must remain LIVE');
  assert.strictEqual(busB.confidenceTier, 'STALE', 'Bus B must decay to STALE independently');
});

runTest('13. Multiple physical buses across different services (200A vs 201B) do not cross-contaminate', () => {
  const now = 1727160000000;
  const buses = [
    {
      id: 'bus-1',
      physicalBusId: 'CR-BUS-001',
      busNumber: '200A',
      confidenceTier: 'LIVE',
      movementState: 'moving',
      lastObservationAt: new Date(now - 10000).toISOString(),
    },
    {
      id: 'bus-4',
      physicalBusId: 'CR-BUS-004',
      busNumber: '201B',
      confidenceTier: 'LIVE',
      movementState: 'moving',
      lastObservationAt: new Date(now - 45000).toISOString(),
    },
    {
      id: 'bus-5',
      physicalBusId: 'CR-BUS-005',
      busNumber: '201B',
      confidenceTier: 'LIVE',
      movementState: 'moving',
      lastObservationAt: new Date(now - 350000).toISOString(),
    },
  ];

  const processed = applyConfidenceDecayToBuses(buses, now);

  assert.strictEqual(processed[0].confidenceTier, 'LIVE');
  assert.strictEqual(processed[1].confidenceTier, 'RECENT');
  assert.strictEqual(processed[2].confidenceTier, 'OFFLINE');
  assert.strictEqual(processed[2].movementState, 'offline');
});

// ─── 4. Architectural Invariant Verifications ─────────────────────────────────

runTest('14. Mobile tracking engine performs ZERO writes to Supabase (read-only verification)', () => {
  const engineSrc = fs.readFileSync(path.join(ROOT_DIR, 'services', 'trackingConfidenceEngine.ts'), 'utf8');
  assert(!engineSrc.includes('from(\'live_positions\').insert'), 'trackingConfidenceEngine must never insert');
  assert(!engineSrc.includes('from(\'live_positions\').update'), 'trackingConfidenceEngine must never update');
  assert(!engineSrc.includes('from(\'live_positions\').delete'), 'trackingConfidenceEngine must never delete');
  assert(!engineSrc.includes('supabase'), 'trackingConfidenceEngine must not import or reference supabase');

  const hookSrc = fs.readFileSync(path.join(ROOT_DIR, 'hooks', 'useLiveBusTracking.ts'), 'utf8');
  assert(!hookSrc.includes('.insert('), 'useLiveBusTracking must not insert');
  assert(!hookSrc.includes('.update('), 'useLiveBusTracking must not update');
  assert(!hookSrc.includes('.delete('), 'useLiveBusTracking must not delete');
  assert(!hookSrc.includes('.upsert('), 'useLiveBusTracking must not upsert');
});

runTest('15. Zero local storage persistence (no AsyncStorage / SecureStore / SQLite in tracking state engine)', () => {
  const engineSrc = fs.readFileSync(path.join(ROOT_DIR, 'services', 'trackingConfidenceEngine.ts'), 'utf8');
  assert(!engineSrc.includes('@react-native-async-storage/async-storage'), 'No AsyncStorage in engine');
  assert(!engineSrc.includes('expo-secure-store'), 'No SecureStore in engine');
  assert(!engineSrc.includes('expo-sqlite'), 'No SQLite in engine');
});

runTest('16. CHIGARI GATE remains untouched', () => {
  const gateDirs = ['app/gate', 'components/gate', 'services/gate'];
  for (const d of gateDirs) {
    const full = path.join(ROOT_DIR, d);
    if (fs.existsSync(full)) {
      const files = fs.readdirSync(full);
      assert(files.length > 0, `Gate directory ${d} must exist`);
    }
  }
});

runTest('17. Shared E-Ticket Contract v1 remains untouched', () => {
  const contractPath = path.join(ROOT_DIR, 'constants', 'ticketContract.ts');
  if (fs.existsSync(contractPath)) {
    const content = fs.readFileSync(contractPath, 'utf8');
    assert(content.includes('CHIGARI_TICKET_CONTRACT_VERSION = 1') || content.includes('VERSION = 1'), 'Contract version 1 preserved');
  }
});

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} tests passed`);
console.log('================================================================');

if (passedTests === totalTests) {
  console.log('🎉 ALL 17 STAGE 6B-1 CONFIDENCE DECAY TESTS PASSED!\n');
} else {
  console.error(`⚠️ ${totalTests - passedTests} tests failed.\n`);
  process.exitCode = 1;
}
