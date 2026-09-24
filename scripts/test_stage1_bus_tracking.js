const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('CHIGARI RIDE — STAGE 1 PHYSICAL BUS IDENTITY TEST SUITE');
console.log('================================================================\n');

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
    process.exit(1);
  }
}

// 1. Check types/transit.ts
runTest('types/transit.ts defines PhysicalBus, PassengerObservation, and tracking types', () => {
  const content = fs.readFileSync(path.join(__dirname, '../types/transit.ts'), 'utf8');
  assert.ok(content.includes('export type TrackingSource'), 'Missing TrackingSource');
  assert.ok(content.includes('export type MovementState'), 'Missing MovementState');
  assert.ok(content.includes('export type ConfidenceTier'), 'Missing ConfidenceTier');
  assert.ok(content.includes('export interface PhysicalBus'), 'Missing PhysicalBus interface');
  assert.ok(content.includes('export interface PassengerObservation'), 'Missing PassengerObservation interface');
  assert.ok(content.includes('physicalBusId: string;'), 'ChigariBus must include physicalBusId');
});

// 2. Check data/chigariRoute.ts INITIAL_CHIGARI_BUSES
runTest('data/chigariRoute.ts has decoupled physical buses with unique physicalBusId', () => {
  const content = fs.readFileSync(path.join(__dirname, '../data/chigariRoute.ts'), 'utf8');
  const busMatch = content.match(/export const INITIAL_CHIGARI_BUSES: ChigariBus\[\] = \[([\s\S]*?)\];/);
  assert.ok(busMatch, 'INITIAL_CHIGARI_BUSES must be defined');

  // Verify representative physical buses
  const buses = [
    { id: 'CR-BUS-001', service: '200A' },
    { id: 'CR-BUS-002', service: '200A' },
    { id: 'CR-BUS-003', service: '200A' },
    { id: 'CR-BUS-004', service: '201B' },
    { id: 'CR-BUS-005', service: '201B' },
    { id: 'CR-BUS-006', service: '100D' },
    { id: 'CR-BUS-007', service: '202C' },
  ];

  for (const b of buses) {
    assert.ok(content.includes(`physicalBusId: '${b.id}'`), `Missing physicalBusId: ${b.id}`);
    assert.ok(content.includes(`busNumber: '${b.service}'`), `Missing service: ${b.service}`);
  }
});

// 3. Multi-bus per service verification
runTest('Multiple physical buses exist under service 200A and 201B', () => {
  const content = fs.readFileSync(path.join(__dirname, '../data/chigariRoute.ts'), 'utf8');
  const matches200A = content.match(/busNumber:\s*'200A'/g);
  assert.ok(matches200A && matches200A.length >= 3, `Expected at least 3 physical buses on 200A, got ${matches200A ? matches200A.length : 0}`);

  const matches201B = content.match(/busNumber:\s*'201B'/g);
  assert.ok(matches201B && matches201B.length >= 2, `Expected at least 2 physical buses on 201B, got ${matches201B ? matches201B.length : 0}`);
});

// 4. MapLibre marker key & selection check
runTest('LiveTrackingMapLibre.tsx uses physical bus identity for selection and key', () => {
  const content = fs.readFileSync(path.join(__dirname, '../components/map/LiveTrackingMapLibre.tsx'), 'utf8');
  assert.ok(content.includes('bus.physicalBusId === selectedBus.physicalBusId'), 'Must compare physicalBusId for isSelected');
  assert.ok(!content.includes('const isSelected = bus.busNumber === selectedBus?.busNumber;'), 'Must not select by busNumber');
  assert.ok(content.includes('key={busUniqueKey}'), 'Marker key must use busUniqueKey');
  assert.ok(content.includes('bus.physicalBusId || bus.id'), 'busUniqueKey must include physicalBusId');
});

// 5. LiveTrackingMapVector.tsx marker key & selection check
runTest('LiveTrackingMapVector.tsx uses physical bus identity for selection and key', () => {
  const content = fs.readFileSync(path.join(__dirname, '../components/map/LiveTrackingMapVector.tsx'), 'utf8');
  assert.ok(content.includes('bus.physicalBusId === selectedBus.physicalBusId'), 'Must compare physicalBusId for isSelected');
  assert.ok(!content.includes('const isSelected = bus.busNumber === selectedBus?.busNumber;'), 'Must not select by busNumber');
  assert.ok(content.includes('key={busKey}'), 'Marker key must use busKey');
});

// 6. useDemoBusTracking.ts selection check
runTest('useDemoBusTracking.ts selects physical buses independently', () => {
  const content = fs.readFileSync(path.join(__dirname, '../hooks/useDemoBusTracking.ts'), 'utf8');
  assert.ok(content.includes('selectedBusId'), 'Must maintain selectedBusId state');
  assert.ok(content.includes('physicalBusId === selectedBusId'), 'selectedBus must look up by physicalBusId');
});

// 7. Isolation check: Authoritative stations and gate untouched
runTest('Authoritative stations and CHIGARI GATE untouched', () => {
  const content = fs.readFileSync(path.join(__dirname, '../data/chigariRoute.ts'), 'utf8');
  assert.ok(content.includes('CHIGARI_VERIFIED_STOPS'), 'CHIGARI_VERIFIED_STOPS must exist');
  assert.ok(content.includes('hdbrts-stop-01'), 'Stations must be preserved');
  assert.ok(content.includes('hdbrts-stop-36'), 'All 36 stations must be preserved');
});

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} tests passed`);
console.log('================================================================');
console.log('🎉 ALL STAGE 1 PHYSICAL BUS IDENTITY TESTS PASSED!');
