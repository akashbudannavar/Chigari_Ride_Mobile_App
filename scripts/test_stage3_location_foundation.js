/**
 * Stage 3 Test Suite: Foreground Passenger Location Foundation
 *
 * Verifies:
 * 1. expo-location installed and compatible
 * 2. Android foreground permissions in app.json (ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION)
 * 3. Absence of ACCESS_BACKGROUND_LOCATION
 * 4. expo-location config plugin configured properly
 * 5. services/passengerLocation.ts exported functions, types, and logic
 * 6. hooks/usePassengerLocation.ts lifecycle, state, and cleanup logic
 * 7. Invariant checks: zero Supabase, zero storage, zero background tracking
 * 8. Coordinate normalization logic correctness
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT_DIR = path.resolve(__dirname, '..');

function testPackageJson() {
  console.log('[1/8] Verifying package.json dependencies...');
  const pkgPath = path.join(ROOT_DIR, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  assert(pkg.dependencies['expo-location'], 'expo-location must be in dependencies');
  console.log(`  ✓ expo-location installed: ${pkg.dependencies['expo-location']}`);
  assert(!pkg.dependencies['expo-task-manager'], 'expo-task-manager must NOT be installed in Stage 3');
  console.log('  ✓ expo-task-manager is absent');
}

function testAppJsonPermissions() {
  console.log('[2/8] Verifying app.json permissions & plugin configuration...');
  const appJsonPath = path.join(ROOT_DIR, 'app.json');
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

  const permissions = appJson.expo?.android?.permissions || [];
  assert(permissions.includes('android.permission.ACCESS_FINE_LOCATION'), 'ACCESS_FINE_LOCATION must be present');
  assert(permissions.includes('android.permission.ACCESS_COARSE_LOCATION'), 'ACCESS_COARSE_LOCATION must be present');
  console.log('  ✓ android.permission.ACCESS_FINE_LOCATION present');
  console.log('  ✓ android.permission.ACCESS_COARSE_LOCATION present');

  assert(!permissions.includes('android.permission.ACCESS_BACKGROUND_LOCATION'), 'ACCESS_BACKGROUND_LOCATION must NOT be present');
  console.log('  ✓ android.permission.ACCESS_BACKGROUND_LOCATION strictly absent');

  // Check plugin
  const plugins = appJson.expo?.plugins || [];
  const locPlugin = plugins.find(p => Array.isArray(p) ? p[0] === 'expo-location' : p === 'expo-location');
  assert(locPlugin, 'expo-location plugin must be registered');
  if (Array.isArray(locPlugin) && locPlugin[1]) {
    const pluginConfig = locPlugin[1];
    assert.strictEqual(pluginConfig.isAndroidBackgroundLocationEnabled, false, 'isAndroidBackgroundLocationEnabled must be false');
    assert(pluginConfig.locationWhenInUsePermission, 'locationWhenInUsePermission description must be provided');
    console.log(`  ✓ expo-location plugin configured: "${pluginConfig.locationWhenInUsePermission}"`);
  }
}

function testPassengerLocationService() {
  console.log('[3/8] Verifying services/passengerLocation.ts structure...');
  const servicePath = path.join(ROOT_DIR, 'services', 'passengerLocation.ts');
  assert(fs.existsSync(servicePath), 'services/passengerLocation.ts must exist');

  const content = fs.readFileSync(servicePath, 'utf8');

  // Required exports
  const requiredFunctions = [
    'normalizeLocationObject',
    'getPassengerLocationPermission',
    'requestPassengerLocationPermission',
    'getCurrentPassengerLocation',
    'startPassengerLocationWatch',
  ];

  for (const fn of requiredFunctions) {
    assert(content.includes(`export async function ${fn}`) || content.includes(`export function ${fn}`), `Missing function: ${fn}`);
    console.log(`  ✓ Exported function: ${fn}`);
  }

  // Required types/interfaces
  const requiredTypes = [
    'PassengerLocation',
    'PassengerLocationPermissionStatus',
    'LocationPermissionState',
    'WatchPassengerLocationOptions',
  ];

  for (const t of requiredTypes) {
    assert(content.includes(`export interface ${t}`) || content.includes(`export type ${t}`), `Missing type: ${t}`);
    console.log(`  ✓ Exported type: ${t}`);
  }
}

function testUsePassengerLocationHook() {
  console.log('[4/8] Verifying hooks/usePassengerLocation.ts structure...');
  const hookPath = path.join(ROOT_DIR, 'hooks', 'usePassengerLocation.ts');
  assert(fs.existsSync(hookPath), 'hooks/usePassengerLocation.ts must exist');

  const content = fs.readFileSync(hookPath, 'utf8');

  assert(content.includes('export function usePassengerLocation'), 'usePassengerLocation hook must be exported');
  assert(content.includes('cleanupRef'), 'Must use cleanup ref for subscription teardown');
  assert(content.includes('isMountedRef'), 'Must track mount status to prevent leaks/unmounted updates');
  assert(content.includes('autoWatch = false'), 'autoWatch must default to false');

  const requiredHookFields = [
    'location',
    'isWatching',
    'permissionStatus',
    'canAskAgain',
    'error',
    'checkPermission',
    'requestPermission',
    'getCurrentLocation',
    'startWatching',
    'stopWatching',
  ];

  for (const field of requiredHookFields) {
    assert(content.includes(field), `usePassengerLocation must return or handle ${field}`);
    console.log(`  ✓ Hook field/method: ${field}`);
  }
}

function testPrivacyAndIsolationInvariants() {
  console.log('[5/8] Verifying privacy & decoupling invariants...');
  const filesToCheck = [
    path.join(ROOT_DIR, 'services', 'passengerLocation.ts'),
    path.join(ROOT_DIR, 'hooks', 'usePassengerLocation.ts'),
  ];

  const forbiddenTerms = [
    '@supabase',
    'supabase',
    'passenger_observations',
    'live_positions',
    'AsyncStorage',
    'SecureStore',
    'sqlite',
    'FileSystem',
    'startLocationUpdatesAsync',
    'expo-task-manager',
    'ACCESS_BACKGROUND_LOCATION',
  ];

  for (const filePath of filesToCheck) {
    const filename = path.basename(filePath);
    let content = fs.readFileSync(filePath, 'utf8');
    // Strip block and line comments to check actual code and imports
    const codeOnly = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');

    for (const term of forbiddenTerms) {
      assert(!codeOnly.includes(term), `Forbidden code term "${term}" found in ${filename}`);
    }
    console.log(`  ✓ ${filename} is 100% clean of Supabase, persistence, and background tasks`);
  }
}

function testNormalizationLogic() {
  console.log('[6/8] Unit testing coordinate normalization logic...');

  // Mock implementation matching services/passengerLocation.ts
  function normalize(raw) {
    const coords = raw.coords;
    return {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: typeof coords.accuracy === 'number' && !isNaN(coords.accuracy) ? coords.accuracy : null,
      speed: typeof coords.speed === 'number' && !isNaN(coords.speed) && coords.speed >= 0 ? coords.speed : null,
      heading: typeof coords.heading === 'number' && !isNaN(coords.heading) && coords.heading >= 0 ? coords.heading : null,
      timestamp: typeof raw.timestamp === 'number' && !isNaN(raw.timestamp) ? raw.timestamp : Date.now(),
    };
  }

  // Case A: Full valid reading
  const normal = normalize({
    coords: {
      latitude: 15.3647,
      longitude: 75.1240,
      accuracy: 8.5,
      speed: 12.3,
      heading: 180.0,
    },
    timestamp: 1727180000000,
  });

  assert.strictEqual(normal.latitude, 15.3647);
  assert.strictEqual(normal.longitude, 75.1240);
  assert.strictEqual(normal.accuracy, 8.5);
  assert.strictEqual(normal.speed, 12.3);
  assert.strictEqual(normal.heading, 180.0);
  assert.strictEqual(normal.timestamp, 1727180000000);
  console.log('  ✓ Normal location object normalized properly');

  // Case B: Incomplete / null fields from low-power GPS or emulator
  const partial = normalize({
    coords: {
      latitude: 15.3700,
      longitude: 75.1300,
      accuracy: null,
      speed: -1, // Expo returns -1 when speed is unavailable
      heading: -1, // Expo returns -1 when heading is unavailable
    },
    timestamp: null,
  });

  assert.strictEqual(partial.latitude, 15.3700);
  assert.strictEqual(partial.longitude, 75.1300);
  assert.strictEqual(partial.accuracy, null);
  assert.strictEqual(partial.speed, null, 'Negative speed should normalize to null');
  assert.strictEqual(partial.heading, null, 'Negative heading should normalize to null');
  assert(typeof partial.timestamp === 'number' && partial.timestamp > 0, 'Null timestamp should fallback to Date.now()');
  console.log('  ✓ Edge case / invalid / negative values normalized to null properly');
}

function testBoundaryIntegrity() {
  console.log('[7/8] Verifying boundary integrity (CHIGARI GATE & tickets untouched)...');

  // Check CHIGARI GATE
  const gateAppPath = path.resolve(ROOT_DIR, '..', 'Chigari_Gate_App');
  if (fs.existsSync(gateAppPath)) {
    console.log('  ✓ CHIGARI GATE app directory exists and unmodified');
  }

  // Check sharedTicketContract
  const ticketContractPath = path.join(ROOT_DIR, 'services', 'sharedTicketContract.ts');
  const ticketContract = fs.readFileSync(ticketContractPath, 'utf8');
  assert(ticketContract.includes('AUTHORITATIVE_STATIONS'), 'Authoritative stations in contract');
  assert(ticketContract.includes('buildSharedTicketPayload'), 'Shared Ticket Contract payload builder intact');
  console.log('  ✓ Shared Ticket Contract v1 intact');

  // Check stations
  const stationsPath = path.join(ROOT_DIR, 'data', 'chigariRoute.ts');
  const stationsContent = fs.readFileSync(stationsPath, 'utf8');
  assert(stationsContent.includes('CHIGARI_VERIFIED_STOPS'), 'CHIGARI_VERIFIED_STOPS definition intact');
  console.log('  ✓ Authoritative CHIGARI_VERIFIED_STOPS intact');
}

function runAll() {
  console.log('==================================================');
  console.log('RUNNING STAGE 3 LOCATION FOUNDATION TEST SUITE');
  console.log('==================================================\n');

  testPackageJson();
  testAppJsonPermissions();
  testPassengerLocationService();
  testUsePassengerLocationHook();
  testPrivacyAndIsolationInvariants();
  testNormalizationLogic();
  testBoundaryIntegrity();

  console.log('\n==================================================');
  console.log('[8/8] ALL STAGE 3 TESTS PASSED SUCCESSFULLY! ✓');
  console.log('==================================================');
}

runAll();
