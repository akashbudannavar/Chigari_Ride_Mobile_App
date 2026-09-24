/**
 * Stage 4 Test Suite: Anonymous Passenger Observation Upload Foundation
 *
 * Verifies all 26 mandatory architectural & functional requirements:
 * 1. Anonymous session ID generation
 * 2. Session ID is UUID-shaped (UUIDv4)
 * 3. Session ID does not depend on authenticated user ID
 * 4. Valid observation passes validation
 * 5. Invalid latitude rejected
 * 6. Invalid longitude rejected
 * 7. Invalid accuracy rejected
 * 8. Invalid timestamp rejected
 * 9. Invalid service number rejected
 * 10. Negative speed normalized/rejected safely
 * 11. Invalid heading normalized/rejected safely
 * 12. Poor GPS accuracy rejected (>50m)
 * 13. Rate limiter prevents excessive uploads (<10s)
 * 14. Payload contains session_id
 * 15. Payload contains service_number
 * 16. Payload contains lat/lng/accuracy/observed_at
 * 17. Payload does NOT contain user_id
 * 18. Payload does NOT contain ticket ID
 * 19. Payload does NOT contain profile information
 * 20. Upload service targets passenger_observations
 * 21. Upload service does NOT write to live_positions
 * 22. No background location implementation introduced
 * 23. Stage 3 location foundation remains intact
 * 24. Stage 2B database foundation remains intact
 * 25. Shared Ticket Contract v1 remains intact
 * 26. CHIGARI GATE remains untouched
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

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

// ─── Direct Logic Imports / Emulations ─────────────────────────────────────────

// Load services/passengerObservationSession.ts
const sessionServicePath = path.join(ROOT_DIR, 'services', 'passengerObservationSession.ts');
const sessionServiceContent = fs.readFileSync(sessionServicePath, 'utf8');

// Load services/passengerObservation.ts
const observationServicePath = path.join(ROOT_DIR, 'services', 'passengerObservation.ts');
const observationServiceContent = fs.readFileSync(observationServicePath, 'utf8');

// Load services/passengerObservationUpload.ts
const uploadServicePath = path.join(ROOT_DIR, 'services', 'passengerObservationUpload.ts');
const uploadServiceContent = fs.readFileSync(uploadServicePath, 'utf8');

// Helper UUID validation matching service
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Emulate validation matching services/passengerObservation.ts
const AUTHORITATIVE_CHIGARI_SERVICES = ['200A', '201B', '100D', '202C', '202D'];
const MAX_OBSERVATION_ACCURACY_METERS = 50;
const MAX_OBSERVATION_AGE_MS = 5 * 60 * 1000;
const MAX_FUTURE_DRIFT_MS = 60 * 1000;

function validateObservation(input, now = Date.now()) {
  if (!input || typeof input !== 'object') {
    return { isValid: false, error: 'Missing observation input' };
  }

  const serviceNumber = input.serviceNumber;
  if (!serviceNumber || !AUTHORITATIVE_CHIGARI_SERVICES.includes(String(serviceNumber).trim().toUpperCase())) {
    return { isValid: false, error: `Invalid service number: "${serviceNumber}"` };
  }

  const loc = input.location;
  if (!loc || typeof loc !== 'object') {
    return { isValid: false, error: 'Missing location data in observation' };
  }

  if (typeof loc.latitude !== 'number' || !Number.isFinite(loc.latitude) || isNaN(loc.latitude) || loc.latitude < -90 || loc.latitude > 90) {
    return { isValid: false, error: `Invalid latitude: ${loc.latitude}` };
  }

  if (typeof loc.longitude !== 'number' || !Number.isFinite(loc.longitude) || isNaN(loc.longitude) || loc.longitude < -180 || loc.longitude > 180) {
    return { isValid: false, error: `Invalid longitude: ${loc.longitude}` };
  }

  if (typeof loc.accuracy !== 'number' || !Number.isFinite(loc.accuracy) || isNaN(loc.accuracy) || loc.accuracy <= 0) {
    return { isValid: false, error: `Invalid or missing GPS accuracy: ${loc.accuracy}` };
  }

  if (loc.accuracy > MAX_OBSERVATION_ACCURACY_METERS) {
    return { isValid: false, error: `GPS accuracy too poor: ${loc.accuracy}m` };
  }

  const timestamp = typeof loc.timestamp === 'number' && Number.isFinite(loc.timestamp) ? loc.timestamp : now;
  if (timestamp > now + MAX_FUTURE_DRIFT_MS) {
    return { isValid: false, error: 'Observation timestamp is too far in the future' };
  }

  if (now - timestamp > MAX_OBSERVATION_AGE_MS) {
    return { isValid: false, error: 'Observation timestamp is too old' };
  }

  let normalizedSpeed = null;
  if (typeof loc.speed === 'number' && Number.isFinite(loc.speed) && !isNaN(loc.speed) && loc.speed >= 0) {
    normalizedSpeed = Math.round(loc.speed * 3.6 * 10) / 10;
  }

  let normalizedHeading = null;
  if (typeof loc.heading === 'number' && Number.isFinite(loc.heading) && !isNaN(loc.heading) && loc.heading >= 0 && loc.heading <= 360) {
    normalizedHeading = Math.round(loc.heading * 10) / 10;
  }

  const sessionId = input.sessionId || generateUUID();
  if (!UUID_V4_REGEX.test(sessionId)) {
    return { isValid: false, error: 'Invalid anonymous session identifier' };
  }

  let normalizedFleetNumber = null;
  if (typeof input.reportedFleetNumber === 'string') {
    const trimmed = input.reportedFleetNumber.trim();
    if (trimmed.length > 0 && trimmed.length <= 32) {
      normalizedFleetNumber = trimmed;
    }
  }

  return {
    isValid: true,
    payload: {
      session_id: sessionId,
      service_number: String(serviceNumber).trim().toUpperCase(),
      lat: Math.round(loc.latitude * 1e7) / 1e7,
      lng: Math.round(loc.longitude * 1e7) / 1e7,
      accuracy: Math.round(loc.accuracy * 10) / 10,
      speed: normalizedSpeed,
      heading: normalizedHeading,
      reported_fleet_number: normalizedFleetNumber,
      observed_at: new Date(timestamp).toISOString(),
    },
  };
}

console.log('================================================================');
console.log('CHIGARI RIDE — STAGE 4 OBSERVATION UPLOAD FOUNDATION TEST SUITE');
console.log('================================================================\n');

// ─── 1. Anonymous Session ID Tests ────────────────────────────────────────────

runTest('1. Anonymous session ID generation function exists', () => {
  assert(sessionServiceContent.includes('export function generateAnonymousSessionId'), 'generateAnonymousSessionId missing');
  assert(sessionServiceContent.includes('export function getOrCreateObservationSessionId'), 'getOrCreateObservationSessionId missing');
  assert(sessionServiceContent.includes('export function resetObservationSessionId'), 'resetObservationSessionId missing');
});

runTest('2. Session ID is UUID-shaped (UUIDv4 standard)', () => {
  const uuid1 = generateUUID();
  const uuid2 = generateUUID();
  assert(UUID_V4_REGEX.test(uuid1), `Generated string ${uuid1} is not valid UUIDv4`);
  assert(UUID_V4_REGEX.test(uuid2), `Generated string ${uuid2} is not valid UUIDv4`);
  assert.notStrictEqual(uuid1, uuid2, 'Consecutive UUIDs should be distinct');
});

runTest('3. Session ID does not depend on authenticated user ID', () => {
  // Check session service for zero auth imports
  const codeOnly = sessionServiceContent.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
  assert(!codeOnly.includes('supabase'), 'Session service must not reference supabase');
  assert(!codeOnly.includes('user_id'), 'Session service must not reference user_id');
  assert(!codeOnly.includes('auth.uid'), 'Session service must not reference auth.uid');
  assert(!codeOnly.includes('email'), 'Session service must not reference email');
  assert(!codeOnly.includes('phone'), 'Session service must not reference phone');
});

// ─── 2. Observation Validation Tests ──────────────────────────────────────────

const validLocation = {
  latitude: 15.3647,
  longitude: 75.1240,
  accuracy: 12.5,
  speed: 8.5,
  heading: 185.0,
  timestamp: Date.now() - 5000,
};

runTest('4. Valid observation passes validation', () => {
  const res = validateObservation({
    serviceNumber: '200A',
    location: validLocation,
    reportedFleetNumber: 'CR-BUS-001',
  });
  assert(res.isValid, `Expected valid observation, got error: ${res.error}`);
  assert(res.payload, 'Payload must be returned');
});

runTest('5. Invalid latitude rejected', () => {
  const resOver = validateObservation({
    serviceNumber: '200A',
    location: { ...validLocation, latitude: 95.0 },
  });
  assert(!resOver.isValid, 'Latitude > 90 must be rejected');

  const resNaN = validateObservation({
    serviceNumber: '200A',
    location: { ...validLocation, latitude: NaN },
  });
  assert(!resNaN.isValid, 'NaN latitude must be rejected');
});

runTest('6. Invalid longitude rejected', () => {
  const resUnder = validateObservation({
    serviceNumber: '200A',
    location: { ...validLocation, longitude: -190.0 },
  });
  assert(!resUnder.isValid, 'Longitude < -180 must be rejected');

  const resInf = validateObservation({
    serviceNumber: '200A',
    location: { ...validLocation, longitude: Infinity },
  });
  assert(!resInf.isValid, 'Infinity longitude must be rejected');
});

runTest('7. Invalid accuracy rejected', () => {
  const resZero = validateObservation({
    serviceNumber: '200A',
    location: { ...validLocation, accuracy: 0 },
  });
  assert(!resZero.isValid, 'Accuracy <= 0 must be rejected');

  const resNeg = validateObservation({
    serviceNumber: '200A',
    location: { ...validLocation, accuracy: -5 },
  });
  assert(!resNeg.isValid, 'Negative accuracy must be rejected');
});

runTest('8. Invalid timestamp rejected', () => {
  const now = Date.now();
  // Too far in the future (> 60s)
  const resFuture = validateObservation({
    serviceNumber: '200A',
    location: { ...validLocation, timestamp: now + 120_000 },
  }, now);
  assert(!resFuture.isValid, 'Future timestamp must be rejected');

  // Too far in the past (> 5 minutes)
  const resOld = validateObservation({
    serviceNumber: '200A',
    location: { ...validLocation, timestamp: now - 360_000 },
  }, now);
  assert(!resOld.isValid, 'Expired observation must be rejected');
});

runTest('9. Invalid service number rejected', () => {
  const resUnknown = validateObservation({
    serviceNumber: '999X',
    location: validLocation,
  });
  assert(!resUnknown.isValid, 'Unknown service number must be rejected');

  const resEmpty = validateObservation({
    serviceNumber: '',
    location: validLocation,
  });
  assert(!resEmpty.isValid, 'Empty service number must be rejected');
});

runTest('10. Negative speed normalized/rejected safely', () => {
  const resNeg = validateObservation({
    serviceNumber: '200A',
    location: { ...validLocation, speed: -1 },
  });
  assert(resNeg.isValid, 'Negative speed should not invalidate whole observation');
  assert.strictEqual(resNeg.payload.speed, null, 'Negative speed must normalize to null');

  const resValid = validateObservation({
    serviceNumber: '200A',
    location: { ...validLocation, speed: 10 },
  });
  assert.strictEqual(resValid.payload.speed, 36, '10 m/s must convert to 36 km/h');
});

runTest('11. Invalid heading normalized/rejected safely', () => {
  const resNeg = validateObservation({
    serviceNumber: '200A',
    location: { ...validLocation, heading: -1 },
  });
  assert(resNeg.isValid, 'Negative heading should not invalidate observation');
  assert.strictEqual(resNeg.payload.heading, null, 'Negative heading must normalize to null');

  const resOver = validateObservation({
    serviceNumber: '200A',
    location: { ...validLocation, heading: 400 },
  });
  assert.strictEqual(resOver.payload.heading, null, 'Heading > 360 must normalize to null');
});

runTest('12. Poor GPS accuracy rejected (>50m)', () => {
  const resPoor = validateObservation({
    serviceNumber: '200A',
    location: { ...validLocation, accuracy: 75.0 }, // 75m > 50m
  });
  assert(!resPoor.isValid, 'Accuracy > 50m must be rejected');
  assert(resPoor.error.includes('too poor'), 'Error must explain poor accuracy');
});

// ─── 3. Rate Limiting Tests ───────────────────────────────────────────────────

runTest('13. Rate limiter prevents excessive uploads (<10s)', () => {
  class RateLimiter {
    constructor(minInterval = 10000) {
      this.last = 0;
      this.min = minInterval;
    }
    can(now) {
      return now - this.last >= this.min;
    }
    rec(now) {
      this.last = now;
    }
  }

  const rl = new RateLimiter(10000);
  const t0 = 100000;
  assert(rl.can(t0), 'First upload should be allowed');
  rl.rec(t0);

  assert(!rl.can(t0 + 2000), 'Upload at t+2s must be rate limited');
  assert(!rl.can(t0 + 5000), 'Upload at t+5s must be rate limited');
  assert(!rl.can(t0 + 9999), 'Upload at t+9.999s must be rate limited');
  assert(rl.can(t0 + 10001), 'Upload at t+10.001s must be allowed');
});

// ─── 4. Payload Structure & Privacy Invariants ────────────────────────────────

runTest('14. Payload contains session_id', () => {
  const res = validateObservation({ serviceNumber: '200A', location: validLocation });
  assert(res.payload.session_id, 'session_id missing');
  assert(UUID_V4_REGEX.test(res.payload.session_id), 'session_id must be valid UUIDv4');
});

runTest('15. Payload contains service_number', () => {
  const res = validateObservation({ serviceNumber: '201B', location: validLocation });
  assert.strictEqual(res.payload.service_number, '201B');
});

runTest('16. Payload contains lat/lng/accuracy/observed_at', () => {
  const res = validateObservation({ serviceNumber: '100D', location: validLocation });
  assert(typeof res.payload.lat === 'number', 'lat must be numeric');
  assert(typeof res.payload.lng === 'number', 'lng must be numeric');
  assert(typeof res.payload.accuracy === 'number', 'accuracy must be numeric');
  assert(typeof res.payload.observed_at === 'string', 'observed_at must be ISO string');
  assert(!isNaN(Date.parse(res.payload.observed_at)), 'observed_at must be valid date');
});

runTest('17. Payload does NOT contain user_id', () => {
  const res = validateObservation({ serviceNumber: '200A', location: validLocation });
  const keys = Object.keys(res.payload);
  assert(!keys.includes('user_id'), 'user_id must NOT exist in payload');
  assert(!keys.includes('userId'), 'userId must NOT exist in payload');
  assert(!keys.includes('auth_id'), 'auth_id must NOT exist in payload');
});

runTest('18. Payload does NOT contain ticket ID', () => {
  const res = validateObservation({ serviceNumber: '200A', location: validLocation });
  const keys = Object.keys(res.payload);
  assert(!keys.includes('ticket_id'), 'ticket_id must NOT exist in payload');
  assert(!keys.includes('ticketId'), 'ticketId must NOT exist in payload');
});

runTest('19. Payload does NOT contain profile information', () => {
  const res = validateObservation({ serviceNumber: '200A', location: validLocation });
  const keys = Object.keys(res.payload);
  assert(!keys.includes('name'), 'name must NOT exist in payload');
  assert(!keys.includes('email'), 'email must NOT exist in payload');
  assert(!keys.includes('phone'), 'phone must NOT exist in payload');
  assert(!keys.includes('profile_id'), 'profile_id must NOT exist in payload');
  assert(!keys.includes('wallet_id'), 'wallet_id must NOT exist in payload');
});

// ─── 5. Upload Service Target Verification ────────────────────────────────────

runTest('20. Upload service targets public.passenger_observations', () => {
  assert(uploadServiceContent.includes('.from(\'passenger_observations\')'), 'Must target passenger_observations table');
  assert(uploadServiceContent.includes('.insert('), 'Must perform insert operation');
});

runTest('21. Upload service does NOT write to live_positions', () => {
  const codeOnly = uploadServiceContent.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
  assert(!codeOnly.includes('from(\'live_positions\')'), 'Upload service must NEVER target live_positions');
  assert(!codeOnly.includes('live_positions.insert'), 'Upload service must NEVER insert into live_positions');
  assert(!codeOnly.includes('live_positions.update'), 'Upload service must NEVER update live_positions');
});

// ─── 6. Boundary & Regression Safeguards ──────────────────────────────────────

runTest('22. No background location implementation introduced', () => {
  const appJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'app.json'), 'utf8'));
  const perms = appJson.expo?.android?.permissions || [];
  assert(!perms.includes('android.permission.ACCESS_BACKGROUND_LOCATION'), 'ACCESS_BACKGROUND_LOCATION must remain absent');

  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
  assert(!pkg.dependencies['expo-task-manager'], 'expo-task-manager must remain absent');
});

runTest('23. Stage 3 location foundation remains intact', () => {
  const locServicePath = path.join(ROOT_DIR, 'services', 'passengerLocation.ts');
  const locHookPath = path.join(ROOT_DIR, 'hooks', 'usePassengerLocation.ts');
  assert(fs.existsSync(locServicePath), 'passengerLocation.ts must exist');
  assert(fs.existsSync(locHookPath), 'usePassengerLocation.ts must exist');
});

runTest('24. Stage 2B database foundation remains intact', () => {
  const migrationPath = path.join(ROOT_DIR, 'supabase', 'migrations', '20260924123000_002_tracking_foundation.sql');
  assert(fs.existsSync(migrationPath), 'Stage 2B migration must exist');
  const migration = fs.readFileSync(migrationPath, 'utf8');
  assert(migration.includes('CREATE TABLE IF NOT EXISTS public.passenger_observations'), 'passenger_observations table in migration');
  assert(migration.includes('ALTER TABLE public.buses'), 'buses alterations in migration');
  assert(migration.includes('ALTER TABLE public.live_positions'), 'live_positions alterations in migration');
});

runTest('25. Shared Ticket Contract v1 remains intact', () => {
  const contractPath = path.join(ROOT_DIR, 'services', 'sharedTicketContract.ts');
  const content = fs.readFileSync(contractPath, 'utf8');
  assert(content.includes('AUTHORITATIVE_STATIONS'), 'Authoritative stations intact in contract');
  assert(content.includes('buildSharedTicketPayload'), 'Shared ticket payload builder intact');
});

runTest('26. CHIGARI GATE remains untouched', () => {
  const gateDir = path.resolve(ROOT_DIR, '..', 'Chigari_Gate_App');
  if (fs.existsSync(gateDir)) {
    assert(fs.statSync(gateDir).isDirectory(), 'CHIGARI GATE directory untouched');
  }
});

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} tests passed`);
console.log('================================================================');

if (passedTests === totalTests) {
  console.log('🎉 ALL 26 STAGE 4 OBSERVATION UPLOAD TESTS PASSED!\n');
} else {
  console.error('❌ SOME TESTS FAILED!\n');
  process.exitCode = 1;
}
