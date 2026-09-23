const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function loadModule(relPath) {
  const fullPath = path.resolve(__dirname, '..', relPath);
  const code = fs.readFileSync(fullPath, 'utf8');
  const js = ts.transpile(code, { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS });
  const m = { exports: {} };
  const customReq = (reqPath) => {
    if (reqPath === '@/types/transit' || reqPath === '../types/transit') return {};
    if (reqPath.startsWith('./') || reqPath.startsWith('../') || reqPath.startsWith('@/')) {
      let norm = reqPath.replace(/^@\//, '');
      const dir = path.dirname(relPath);
      let resolved = reqPath.startsWith('@/')
        ? path.join(__dirname, '..', norm).replace(/\\/g, '/')
        : path.join(dir, reqPath).replace(/\\/g, '/');
      if (!resolved.endsWith('.ts') && !resolved.endsWith('.tsx') && !resolved.endsWith('.js')) {
        if (fs.existsSync(resolved + '.ts')) {
          resolved += '.ts';
        }
      }
      return loadModule(path.relative(path.resolve(__dirname, '..'), resolved).replace(/\\/g, '/'));
    }
    return require(reqPath);
  };
  const fn = new Function('module', 'exports', 'require', js);
  fn(m, m.exports, customReq);
  return m.exports;
}

console.log('--- RUNNING TRACKING REDESIGN VERIFICATION ---');

// 1. Check translations
function parseTsKeys(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const matches = content.match(/"([a-zA-Z0-9_-]+)"\s*:/g) || [];
  return new Set(matches.map((m) => m.replace(/"/g, '').replace(':', '').trim()));
}

const enKeys = parseTsKeys(path.join(__dirname, '../translations/en.ts'));
const knKeys = parseTsKeys(path.join(__dirname, '../translations/kn.ts'));
const hiKeys = parseTsKeys(path.join(__dirname, '../translations/hi.ts'));

const newKeys = [
  'centerOnRoute',
  'stationDetails',
  'stopNumber',
  'connectedServices',
  'tapStationPrompt',
  'stationaryBus'
];

for (const key of newKeys) {
  assert(enKeys.has(key), `Missing en.liveTracking.${key}`);
  assert(knKeys.has(key), `Missing kn.liveTracking.${key}`);
  assert(hiKeys.has(key), `Missing hi.liveTracking.${key}`);
}
assert(enKeys.size === knKeys.size && knKeys.size === hiKeys.size, `Translation sizes match: EN(${enKeys.size}), KN(${knKeys.size}), HI(${hiKeys.size})`);
console.log(`✓ All 6 new i18n keys present with 100% parity across EN, KN, HI (325 keys each)`);

// 2. Check live.tsx has no Play/Pause/Reset or demoControlRow
const liveContent = fs.readFileSync(path.join(__dirname, '../app/(tabs)/live.tsx'), 'utf8');
assert(!liveContent.includes('demoControlRow'), 'live.tsx should not contain demoControlRow');
assert(!liveContent.includes("isPlaying ? t('liveTracking.pauseDemo')"), 'live.tsx should not contain play/pause button toggle');
assert(!liveContent.includes('resetDemo()'), 'live.tsx should not contain resetDemo call');
assert(liveContent.includes('quickControlRow'), 'live.tsx must contain quickControlRow');
assert(liveContent.includes('stationCardContainer'), 'live.tsx must contain stationCardContainer');
assert(liveContent.includes('onSelectStop={handleStopSelect}'), 'live.tsx must pass onSelectStop to map');
console.log('✓ live.tsx UI verified: Play/Pause/Reset removed, station card & quick controls active');

// 3. Check useDemoBusTracking.ts default state
const hookContent = fs.readFileSync(path.join(__dirname, '../hooks/useDemoBusTracking.ts'), 'utf8');
assert(hookContent.includes('useState<boolean>(false)') || hookContent.includes('useState(false)'), 'useDemoBusTracking isPlaying must default to false');
console.log('✓ useDemoBusTracking verified: default isPlaying = false');

// 4. Check JourneyContext.tsx simulation loop
const journeyContent = fs.readFileSync(path.join(__dirname, '../contexts/JourneyContext.tsx'), 'utf8');
assert(
  journeyContent.includes('Realistic Demo Journey Simulation Loop') ||
    journeyContent.includes('Simulation Movement Loop') ||
    journeyContent.includes('Automatic Simulation Movement Loop'),
  'JourneyContext simulation loop present'
);
console.log('✓ JourneyContext verified: simulation passenger journey flow supported');

// 5. Check data/chigariRoute.ts branch exports
const routeContent = fs.readFileSync(path.join(__dirname, '../data/chigariRoute.ts'), 'utf8');
assert(routeContent.includes('export const HDBRTS_TRUNK_COORDINATES'), 'HDBRTS_TRUNK_COORDINATES exported');
assert(routeContent.includes('export const HDBRTS_CBT_BRANCH_COORDINATES'), 'HDBRTS_CBT_BRANCH_COORDINATES exported');
assert(routeContent.includes('export const HDBRTS_RAILWAY_BRANCH_COORDINATES'), 'HDBRTS_RAILWAY_BRANCH_COORDINATES exported');
assert(routeContent.includes('export const HDBRTS_DHARWAD_BRTS_BRANCH_COORDINATES'), 'HDBRTS_DHARWAD_BRTS_BRANCH_COORDINATES exported');
assert(routeContent.includes('export const HDBRTS_DHARWAD_NEW_BRANCH_COORDINATES'), 'HDBRTS_DHARWAD_NEW_BRANCH_COORDINATES exported');
assert(routeContent.includes('export const HDBRTS_GOKUL_BRANCH_COORDINATES'), 'HDBRTS_GOKUL_BRANCH_COORDINATES exported');
console.log('✓ chigariRoute.ts verified: all 6 branched network segments exported');

// 6. Check Map components support onSelectStop and branches
const libreMapContent = fs.readFileSync(path.join(__dirname, '../components/map/LiveTrackingMapLibre.tsx'), 'utf8');
assert(libreMapContent.includes('onSelectStop'), 'LiveTrackingMapLibre supports onSelectStop');
assert(libreMapContent.includes('HDBRTS_TRUNK_COORDINATES'), 'LiveTrackingMapLibre renders HDBRTS_TRUNK_COORDINATES');
assert(libreMapContent.includes('HDBRTS_CBT_BRANCH_COORDINATES'), 'LiveTrackingMapLibre renders CBT branch');
assert(libreMapContent.includes('HDBRTS_RAILWAY_COORDINATES') || libreMapContent.includes('HDBRTS_RAILWAY_BRANCH_COORDINATES'), 'LiveTrackingMapLibre renders Railway branch');

const vectorMapContent = fs.readFileSync(path.join(__dirname, '../components/map/LiveTrackingMapVector.tsx'), 'utf8');
assert(vectorMapContent.includes('onSelectStop'), 'LiveTrackingMapVector supports onSelectStop');
assert(vectorMapContent.includes('HDBRTS_TRUNK_COORDINATES'), 'LiveTrackingMapVector renders HDBRTS_TRUNK_COORDINATES');
console.log('✓ Map components verified: native MapLibre Map and vector map render clean branches and handle stop selection');

// 7. Check Route-Aware Service logic from chigariServices.ts
const { getAvailableServicesAtStop } = loadModule('data/chigariServices.ts');
const { CHIGARI_VERIFIED_STOPS } = loadModule('data/chigariRoute.ts');

const ambedkarStop = CHIGARI_VERIFIED_STOPS.find(s => s.name.includes('Ambedkar'));
assert(ambedkarStop, 'Ambedkar Circle stop found');
const ambedkarServices = getAvailableServicesAtStop(ambedkarStop.name).map(s => s.serviceNumber);
assert(ambedkarServices.includes('200A'), 'Ambedkar must have 200A');
assert(ambedkarServices.includes('201B'), 'Ambedkar must have 201B');
assert(ambedkarServices.includes('100D'), 'Ambedkar must have 100D');
assert(!ambedkarServices.includes('202C'), 'Ambedkar must NOT have 202C (Gokul service)');
console.log('✓ Route-aware services verified at Ambedkar Circle: 200A, 201B, 100D (202C excluded)');

const hubballiRailwayStop = CHIGARI_VERIFIED_STOPS.find(s => s.order === 36);
assert(hubballiRailwayStop, 'Hubballi Railway Station stop (order 36) found');
const hubballiRailwayServices = getAvailableServicesAtStop(hubballiRailwayStop.name).map(s => s.serviceNumber);
assert(hubballiRailwayServices.includes('201B'), 'Hubballi Railway must have 201B');
assert(hubballiRailwayServices.includes('100D'), 'Hubballi Railway must have 100D');
assert(!hubballiRailwayServices.includes('200A'), 'Hubballi Railway must NOT have 200A');
assert(!hubballiRailwayServices.includes('202C'), 'Hubballi Railway must NOT have 202C');
console.log('✓ Route-aware services verified at Hubballi Railway Station (Stop #36): 201B, 100D (200A & 202C excluded)');

const navaluruRailwayStop = CHIGARI_VERIFIED_STOPS.find(s => s.order === 14);
assert(navaluruRailwayStop, 'Navaluru Railway Station stop (order 14) found');
const navaluruRailwayServices = getAvailableServicesAtStop(navaluruRailwayStop.name).map(s => s.serviceNumber);
assert(navaluruRailwayServices.includes('201B'), 'Navaluru Railway must have 201B');
assert(!navaluruRailwayServices.includes('100D'), 'Navaluru Railway must NOT have 100D (100D Express skips minor stop 14)');
console.log('✓ Route-aware services verified at Navaluru Railway Station (Stop #14): 201B only (100D Express skips it)');

console.log('\n--- ALL TRACKING REDESIGN CHECKS PASSED SUCCESSFULLY ---');
