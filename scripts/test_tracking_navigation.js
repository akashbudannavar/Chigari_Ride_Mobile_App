/**
 * CHIGARI RIDE — TRACKING NAVIGATION & ROUTING VERIFICATION SUITE
 * Validates that all tracking entry points, route aliases, navigation calls,
 * and tab bar configurations resolve without "Page Not Found" errors.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT_DIR = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(`   Error: ${err.message}`);
  }
}

console.log('================================================================');
console.log('CHIGARI RIDE — TRACKING NAVIGATION & ROUTING TEST SUITE');
console.log('================================================================\n');

// --- TEST GROUP 1: ROUTE FILES & EXPORTS ---
console.log('--- TEST 1: ROUTE FILES & COMPONENT EXPORTS ---');

runTest('Canonical tracking screen file exists at app/(tabs)/live.tsx', () => {
  const filePath = path.join(ROOT_DIR, 'app', '(tabs)', 'live.tsx');
  assert.ok(fs.existsSync(filePath), 'app/(tabs)/live.tsx must exist');
  const content = fs.readFileSync(filePath, 'utf8');
  assert.ok(content.includes('export default function LiveScreen'), 'Must export default LiveScreen component');
  assert.ok(content.includes('LiveTrackingMap'), 'Must mount LiveTrackingMap');
});

runTest('Root /tracking route alias file exists at app/tracking.tsx', () => {
  const filePath = path.join(ROOT_DIR, 'app', 'tracking.tsx');
  assert.ok(fs.existsSync(filePath), 'app/tracking.tsx must exist');
  const content = fs.readFileSync(filePath, 'utf8');
  assert.ok(content.includes('export default function TrackingRoute'), 'Must export default TrackingRoute component');
  assert.ok(content.includes("Redirect href={{ pathname: '/(tabs)/live', params }}"), 'Must redirect to /(tabs)/live with params');
});

runTest('Nested (tabs)/tracking route alias file exists at app/(tabs)/tracking.tsx', () => {
  const filePath = path.join(ROOT_DIR, 'app', '(tabs)', 'tracking.tsx');
  assert.ok(fs.existsSync(filePath), 'app/(tabs)/tracking.tsx must exist');
  const content = fs.readFileSync(filePath, 'utf8');
  assert.ok(content.includes('export default function TabsTrackingRoute'), 'Must export default TabsTrackingRoute component');
  assert.ok(content.includes("Redirect href={{ pathname: '/(tabs)/live', params }}"), 'Must redirect to /(tabs)/live with params');
});

// --- TEST GROUP 2: NAVIGATOR CONFIGURATION ---
console.log('\n--- TEST 2: NAVIGATOR REGISTRATION & CONFIGURATION ---');

runTest('app/_layout.tsx registers tracking in root Stack.Screen', () => {
  const layoutPath = path.join(ROOT_DIR, 'app', '_layout.tsx');
  const content = fs.readFileSync(layoutPath, 'utf8');
  assert.ok(content.includes('<Stack.Screen name="tracking"'), 'Root layout must register tracking stack screen');
  assert.ok(content.includes('<Stack.Screen name="(tabs)"'), 'Root layout must register (tabs) stack screen');
  assert.ok(content.includes('<Stack.Screen name="+not-found"'), 'Root layout must register +not-found fallback');
});

runTest('app/(tabs)/_layout.tsx configures live tab and hides alias', () => {
  const tabLayoutPath = path.join(ROOT_DIR, 'app', '(tabs)', '_layout.tsx');
  const content = fs.readFileSync(tabLayoutPath, 'utf8');
  assert.ok(content.includes('<Tabs.Screen name="live" options={{ title: t(\'tabs.tracking\') }}'), 'Tabs layout must register live tab with tracking title');
  assert.ok(content.includes('<Tabs.Screen name="tracking" options={{ href: null }}'), 'Tabs layout must hide tracking alias from tab bar');
});

runTest('Visible tab bar buttons strictly limited to 4 items (no duplicate tracking tab)', () => {
  const tabLayoutPath = path.join(ROOT_DIR, 'app', '(tabs)', '_layout.tsx');
  const content = fs.readFileSync(tabLayoutPath, 'utf8');
  const visibleTabsMatch = content.match(/const visibleTabs = \[([\s\S]*?)\];/);
  assert.ok(visibleTabsMatch, 'visibleTabs array must exist');
  const names = [...visibleTabsMatch[1].matchAll(/name:\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
  assert.strictEqual(names.length, 4, 'Must have exactly 4 visible tabs');
  assert.deepStrictEqual(names, ['index', 'live', 'tickets', 'profile'], 'Visible tabs must be index, live, tickets, profile');
});

// --- TEST GROUP 3: NAVIGATION CALLERS VERIFICATION ---
console.log('\n--- TEST 3: CALLERS TARGETING TRACKING ---');

const callers = [
  { file: 'app/(tabs)/index.tsx', expected: '/(tabs)/live' },
  { file: 'app/ticket-result.tsx', expected: '/(tabs)/live' },
  { file: 'app/ticket-details.tsx', expected: '/(tabs)/live' },
  { file: 'app/digital-ticket.tsx', expected: '/(tabs)/live' },
  { file: 'app/arrivals.tsx', expected: '/(tabs)/live' },
  { file: 'app/route-details.tsx', expected: '/(tabs)/live' },
  { file: 'app/route-planner.tsx', expected: '/(tabs)/live' },
];

callers.forEach(({ file, expected }) => {
  runTest(`Caller ${file} targets valid route '${expected}'`, () => {
    const filePath = path.join(ROOT_DIR, file);
    assert.ok(fs.existsSync(filePath), `${file} must exist`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes(expected), `${file} must navigate to '${expected}'`);
  });
});

// --- TEST GROUP 4: PARAMETER PROPAGATION & TYPE SAFETY ---
console.log('\n--- TEST 4: PARAMETER PROPAGATION & COMPATIBILITY ---');

runTest('live.tsx supports both bus and ticketId parameters', () => {
  const livePath = path.join(ROOT_DIR, 'app', '(tabs)', 'live.tsx');
  const content = fs.readFileSync(livePath, 'utf8');
  assert.ok(content.includes('useLocalSearchParams<{ bus?: string; ticketId?: string }>'), 'Must type check bus and ticketId params');
  assert.ok(content.includes('params.bus'), 'Must read params.bus');
});

runTest('ticket-details and digital-ticket pass both bus and ticketId', () => {
  const tdPath = path.join(ROOT_DIR, 'app', 'ticket-details.tsx');
  const dtPath = path.join(ROOT_DIR, 'app', 'digital-ticket.tsx');
  const tdContent = fs.readFileSync(tdPath, 'utf8');
  const dtContent = fs.readFileSync(dtPath, 'utf8');

  assert.ok(tdContent.includes('bus: selectedBusNumber, ticketId: ticket.ticketId'), 'ticket-details must pass bus and ticketId');
  assert.ok(dtContent.includes('bus: selectedBusNumber, ticketId: ticket.ticketId'), 'digital-ticket must pass bus and ticketId');
});

// --- TEST GROUP 5: ZERO REGRESSIONS TO MAPLIBRE & CONTRACTS ---
console.log('\n--- TEST 5: OPENFREEMAP & SHARED CONTRACT INTEGRITY ---');

runTest('LiveTrackingMap integration remains unchanged in live.tsx', () => {
  const livePath = path.join(ROOT_DIR, 'app', '(tabs)', 'live.tsx');
  const content = fs.readFileSync(livePath, 'utf8');
  assert.ok(content.includes("from '@/components/map/LiveTrackingMap'"), 'live.tsx must import LiveTrackingMap');
  assert.ok(content.includes('<LiveTrackingMap'), 'live.tsx must render LiveTrackingMap');
});

runTest('No references to tile.openstreetmap.org in tracking route files', () => {
  const liveContent = fs.readFileSync(path.join(ROOT_DIR, 'app', '(tabs)', 'live.tsx'), 'utf8');
  const trackingContent = fs.readFileSync(path.join(ROOT_DIR, 'app', 'tracking.tsx'), 'utf8');
  const tabsTrackingContent = fs.readFileSync(path.join(ROOT_DIR, 'app', '(tabs)', 'tracking.tsx'), 'utf8');

  assert.ok(!liveContent.includes('tile.openstreetmap.org'), 'Must not reference tile.openstreetmap.org');
  assert.ok(!trackingContent.includes('tile.openstreetmap.org'), 'Must not reference tile.openstreetmap.org');
  assert.ok(!tabsTrackingContent.includes('tile.openstreetmap.org'), 'Must not reference tile.openstreetmap.org');
});

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} tests passed`);
console.log('================================================================');

if (passedTests === totalTests) {
  console.log('🎉 ALL TRACKING NAVIGATION AND ROUTING TESTS PASSED!');
  process.exit(0);
} else {
  console.error(`💥 ${totalTests - passedTests} tests failed.`);
  process.exit(1);
}
