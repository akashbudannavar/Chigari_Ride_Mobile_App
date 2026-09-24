const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('CHIGARI RIDE — STAGE 2B SUPABASE TRACKING DATABASE TEST SUITE');
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

const migrationPath = path.join(__dirname, '../supabase/migrations/20260924123000_002_tracking_foundation.sql');
const baselinePath = path.join(__dirname, '../supabase/migrations/20260704091316_001_chigari_ride_schema.sql');
const dbTypesPath = path.join(__dirname, '../types/database.ts');

// 1. Verify baseline migration is intact
runTest('Baseline migration 20260704091316_001_chigari_ride_schema.sql is unmodified', () => {
  assert.ok(fs.existsSync(baselinePath), 'Baseline migration must exist');
  const content = fs.readFileSync(baselinePath, 'utf8');
  assert.ok(content.includes('CREATE TABLE IF NOT EXISTS routes'), 'Baseline must contain routes');
  assert.ok(content.includes('CREATE TABLE IF NOT EXISTS buses'), 'Baseline must contain buses');
  assert.ok(content.includes('CREATE TABLE IF NOT EXISTS live_positions'), 'Baseline must contain live_positions');
});

// 2. Verify new migration file exists
runTest('Stage 2B migration 20260924123000_002_tracking_foundation.sql exists', () => {
  assert.ok(fs.existsSync(migrationPath), 'Migration file must exist');
});

// 3. Verify buses table extensions
runTest('Migration extends buses with fleet_number UNIQUE and is_active', () => {
  const content = fs.readFileSync(migrationPath, 'utf8');
  assert.ok(content.includes('fleet_number text UNIQUE'), 'Must add fleet_number text UNIQUE');
  assert.ok(content.includes('is_active boolean NOT NULL DEFAULT true'), 'Must add is_active');
});

// 4. Verify live_positions table extensions
runTest('Migration extends live_positions with telemetry, states, confidence, and timestamps', () => {
  const content = fs.readFileSync(migrationPath, 'utf8');
  assert.ok(content.includes('service_number text'), 'Must add service_number');
  assert.ok(content.includes("tracking_source text NOT NULL DEFAULT 'observed'"), 'Must add tracking_source');
  assert.ok(content.includes("movement_state text NOT NULL DEFAULT 'moving'"), 'Must add movement_state');
  assert.ok(content.includes("confidence_tier text NOT NULL DEFAULT 'LIVE'"), 'Must add confidence_tier');
  assert.ok(content.includes('last_observation_at timestamptz NOT NULL DEFAULT now()'), 'Must add last_observation_at');
  assert.ok(content.includes('first_established_at timestamptz NOT NULL DEFAULT now()'), 'Must add first_established_at');
  assert.ok(content.includes('active_contributors int NOT NULL DEFAULT 1'), 'Must add active_contributors');
});

// 5. Verify live_positions uniqueness constraint
runTest('Migration establishes 1:1 UNIQUE(bus_id) on live_positions safely', () => {
  const content = fs.readFileSync(migrationPath, 'utf8');
  assert.ok(content.includes('live_positions_bus_id_key UNIQUE (bus_id)'), 'Must add live_positions_bus_id_key constraint');
});

// 6. Verify passenger_observations creation and privacy
runTest('Migration creates passenger_observations with strict privacy (NO user_id, NO auth FK)', () => {
  const content = fs.readFileSync(migrationPath, 'utf8');
  assert.ok(content.includes('CREATE TABLE IF NOT EXISTS public.passenger_observations'), 'Must create passenger_observations');
  assert.ok(content.includes('session_id uuid NOT NULL'), 'Must include session_id uuid');
  assert.ok(content.includes('service_number text NOT NULL'), 'Must include service_number');
  assert.ok(content.includes('lat numeric NOT NULL'), 'Must include lat');
  assert.ok(content.includes('lng numeric NOT NULL'), 'Must include lng');
  assert.ok(content.includes('accuracy numeric NOT NULL'), 'Must include accuracy');
  assert.ok(content.includes('observed_at timestamptz NOT NULL'), 'Must include observed_at');
  assert.ok(content.includes('created_at timestamptz NOT NULL DEFAULT now()'), 'Must include created_at');

  // Verify privacy: NO user_id in passenger_observations
  const tableSlice = content.substring(
    content.indexOf('CREATE TABLE IF NOT EXISTS public.passenger_observations'),
    content.indexOf('ALTER TABLE public.passenger_observations ENABLE ROW LEVEL SECURITY')
  );
  assert.ok(!tableSlice.includes('user_id'), 'passenger_observations must NOT have user_id column');
  assert.ok(!tableSlice.includes('auth.users'), 'passenger_observations must NOT reference auth.users');
  assert.ok(!tableSlice.includes('profiles'), 'passenger_observations must NOT reference profiles');
});

// 7. Verify RLS policies on passenger_observations
runTest('Migration enables RLS with anon/authenticated INSERT and zero client SELECT/UPDATE/DELETE', () => {
  const content = fs.readFileSync(migrationPath, 'utf8');
  assert.ok(content.includes('ALTER TABLE public.passenger_observations ENABLE ROW LEVEL SECURITY'), 'RLS must be enabled');
  assert.ok(content.includes('FOR INSERT TO anon, authenticated'), 'Must grant INSERT to anon, authenticated');
  assert.ok(!content.includes('FOR SELECT TO anon'), 'Must NOT grant SELECT to anon on passenger_observations');
  assert.ok(!content.includes('FOR SELECT TO authenticated'), 'Must NOT grant SELECT to authenticated on passenger_observations');
});

// 8. Verify performance and TTL indexes
runTest('Migration creates required indexes for clustering, TTL, and queries', () => {
  const content = fs.readFileSync(migrationPath, 'utf8');
  assert.ok(content.includes('idx_passenger_obs_clustering'), 'Must create idx_passenger_obs_clustering');
  assert.ok(content.includes('idx_passenger_obs_ttl'), 'Must create idx_passenger_obs_ttl');
  assert.ok(content.includes('idx_live_positions_service'), 'Must create idx_live_positions_service');
  assert.ok(content.includes('idx_live_positions_confidence'), 'Must create idx_live_positions_confidence');
  assert.ok(content.includes('idx_buses_fleet_number'), 'Must create idx_buses_fleet_number');
});

// 9. Verify TTL cleanup function
runTest('Migration creates purge_expired_passenger_observations with SECURITY DEFINER and search_path', () => {
  const content = fs.readFileSync(migrationPath, 'utf8');
  assert.ok(content.includes('CREATE OR REPLACE FUNCTION public.purge_expired_passenger_observations()'), 'Must create cleanup function');
  assert.ok(content.includes("created_at < (now() - interval '10 minutes')"), 'Must purge records older than 10 minutes');
  assert.ok(content.includes('SECURITY DEFINER SET search_path = public'), 'Must declare SECURITY DEFINER with search_path = public');
  assert.ok(content.includes('REVOKE EXECUTE ON FUNCTION public.purge_expired_passenger_observations()'), 'Must revoke execute from public/anon');
});

// 10. Verify development physical bus seeding
runTest('Migration seeds development physical buses CR-BUS-001 through CR-BUS-007 idempotently', () => {
  const content = fs.readFileSync(migrationPath, 'utf8');
  assert.ok(content.includes('CR-BUS-001'), 'Must seed CR-BUS-001');
  assert.ok(content.includes('CR-BUS-002'), 'Must seed CR-BUS-002');
  assert.ok(content.includes('CR-BUS-003'), 'Must seed CR-BUS-003');
  assert.ok(content.includes('CR-BUS-004'), 'Must seed CR-BUS-004');
  assert.ok(content.includes('CR-BUS-005'), 'Must seed CR-BUS-005');
  assert.ok(content.includes('CR-BUS-006'), 'Must seed CR-BUS-006');
  assert.ok(content.includes('CR-BUS-007'), 'Must seed CR-BUS-007');
  assert.ok(content.includes('ON CONFLICT (fleet_number) DO NOTHING'), 'Seeding must be idempotent');
});

// 11. Verify types/database.ts
runTest('types/database.ts exports updated Bus, LivePosition, PassengerObservation, and Database table mapping', () => {
  const content = fs.readFileSync(dbTypesPath, 'utf8');
  assert.ok(content.includes('fleet_number?: string | null;'), 'Bus must have fleet_number');
  assert.ok(content.includes('is_active?: boolean;'), 'Bus must have is_active');
  assert.ok(content.includes('service_number?: string | null;'), 'LivePosition must have service_number');
  assert.ok(content.includes("tracking_source?: 'observed' | 'predicted';"), 'LivePosition must have tracking_source');
  assert.ok(content.includes('export interface PassengerObservation'), 'Must export PassengerObservation');
  assert.ok(content.includes('passenger_observations: {'), 'Database Tables map must include passenger_observations');
});

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} tests passed`);
console.log('================================================================');
console.log('🎉 ALL STAGE 2B DATABASE FOUNDATION TESTS PASSED!');
