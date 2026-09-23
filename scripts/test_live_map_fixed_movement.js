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

console.log('================================================================');
console.log('CHIGARI RIDE — LIVE TRACKING MAP FIXED MOVEMENT & STATIONS TEST');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function testAssert(description, condition, details = '') {
  totalTests++;
  if (condition) {
    console.log(`✅ [PASS] ${description}${details ? ` -> ${details}` : ''}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${description}${details ? ` -> ${details}` : ''}`);
  }
}

// -------------------------------------------------------------
// TEST 1: DISABLE AUTOMATIC CAMERA FOLLOWING (live.tsx)
// -------------------------------------------------------------
console.log('--- TEST 1: NO CONTINUOUS CAMERA FOLLOWING IN live.tsx ---');

const liveContent = fs.readFileSync(path.join(__dirname, '../app/(tabs)/live.tsx'), 'utf8');

testAssert(
  'effectiveBuses is NOT used to continuously center camera on tick',
  !liveContent.includes('mapRef.current?.centerOnBus(targetBus);\n        }, 400);\n        return () => clearTimeout(timer);\n      }\n    }\n  }, [params.bus, effectiveBuses')
);

testAssert(
  'hasHandledInitialBusRef guards param bus centering to run ONCE only',
  liveContent.includes('hasHandledInitialBusRef = useRef(false)') &&
    liveContent.includes('hasHandledInitialBusRef.current = true')
);

// Manual Center on Bus button still present
testAssert(
  'Manual handleCenterOnBus function exists for user press',
  liveContent.includes('const handleCenterOnBus = useCallback(') &&
    liveContent.includes('mapRef.current.centerOnBus(effectiveSelectedBus)')
);

testAssert(
  'Manual Center on Bus UI button present in journey mode and overview mode',
  liveContent.includes('accessibilityLabel="Center on Bus"') &&
    liveContent.includes('accessibilityLabel={t(\'liveTracking.centerOnBus\')}')
);

// -------------------------------------------------------------
// TEST 2: FIXED ROAD / POLYLINE GEOMETRY
// -------------------------------------------------------------
console.log('\n--- TEST 2: GEOGRAPHICALLY FIXED ROUTE / POLYLINE ---');

const libreMapContent = fs.readFileSync(path.join(__dirname, '../components/map/LiveTrackingMapLibre.tsx'), 'utf8');
const vectorMapContent = fs.readFileSync(path.join(__dirname, '../components/map/LiveTrackingMapVector.tsx'), 'utf8');

testAssert(
  'LiveTrackingMapLibre renders fixed journeyCoordinates for ticket journey polyline',
  libreMapContent.includes('journeyCoordinates && journeyCoordinates.length >= 2') &&
    libreMapContent.includes('toGeoJSONLineCoordinates(coords)')
);

testAssert(
  'LiveTrackingMapVector renders fixed journeyCoordinates for ticket journey polyline',
  vectorMapContent.includes('const coords = journeyCoordinates && journeyCoordinates.length >= 2 ? journeyCoordinates : remainingCoordinates;')
);

// -------------------------------------------------------------
// TEST 3: INITIAL ONE-TIME CAMERA POSITIONING (NO CONTINUOUS FOLLOW)
// -------------------------------------------------------------
console.log('\n--- TEST 3: INITIAL ONE-TIME CAMERA POSITIONING ---');

testAssert(
  'LiveTrackingMapLibre uses hasPositionedCameraRef to frame route ONCE then stops',
  libreMapContent.includes('hasPositionedCameraRef = useRef(false)') &&
    libreMapContent.includes('hasPositionedCameraRef.current = true;')
);

testAssert(
  'LiveTrackingMapVector uses hasInitiallyFramed to frame route ONCE then stops',
  vectorMapContent.includes('hasInitiallyFramed = useRef(false)') &&
    vectorMapContent.includes('hasInitiallyFramed.current = true;')
);

// -------------------------------------------------------------
// TEST 4: PERMANENT STATION MARKERS (NO TAP REQUIRED)
// -------------------------------------------------------------
console.log('\n--- TEST 4: PERMANENT STATION MARKERS VISIBILITY ---');

testAssert(
  'LiveTrackingMapLibre renders markers for displayedStops',
  libreMapContent.includes('displayedStops.map((stop, idx) =>') &&
    libreMapContent.includes('Marker')
);

testAssert(
  'LiveTrackingMapLibre renders station label inside Marker',
  libreMapContent.includes('styles.stopLabelContainer') &&
    libreMapContent.includes('styles.stopLabelText')
);

testAssert(
  'LiveTrackingMapVector renders permanent station name Rect and SvgText for all displayedStops',
  vectorMapContent.includes('Permanent Station Name Pill') &&
    vectorMapContent.includes('fill="rgba(255, 255, 255, 0.94)"')
);

testAssert(
  'LiveTrackingMapVector station labels are visible immediately without tap or high zoom threshold',
  !vectorMapContent.includes('showLabel = isOrigin || isDestination || isSelected || isTerminal || scale >= 1.6')
);

// -------------------------------------------------------------
// TEST 5: STATION DATA INTEGRITY & CORRESPONDENCE
// -------------------------------------------------------------
console.log('\n--- TEST 5: STATION DATA INTEGRITY & CORRESPONDENCE ---');

const { CHIGARI_VERIFIED_STOPS } = loadModule('data/chigariRoute.ts');

testAssert(
  'CHIGARI_VERIFIED_STOPS contains all official stations (35+ verified stops)',
  CHIGARI_VERIFIED_STOPS && CHIGARI_VERIFIED_STOPS.length >= 35,
  `Stop count: ${CHIGARI_VERIFIED_STOPS.length}`
);

const stop1 = CHIGARI_VERIFIED_STOPS.find(s => s.order === 1);
const stop35 = CHIGARI_VERIFIED_STOPS.find(s => s.order === 35);
testAssert('Stop 1 is Dharwad New Bus Stand', stop1 && stop1.name.includes('Dharwad New'));
testAssert('Stop 35 is Hubballi CBT / Terminal', stop35 && (stop35.name.includes('CBT') || stop35.name.includes('Central Bus Terminal')));

// Verify stations stay fixed at their geographic coordinates
for (const stop of CHIGARI_VERIFIED_STOPS.slice(0, 5)) {
  testAssert(
    `Stop #${stop.order} (${stop.name.split('/')[0].trim()}) has valid fixed coordinates`,
    typeof stop.latitude === 'number' && typeof stop.longitude === 'number' &&
    stop.latitude > 15.3 && stop.latitude < 15.5 &&
    stop.longitude > 74.9 && stop.longitude < 75.2
  );
}

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} tests passed`);
console.log('================================================================');

if (passedTests === totalTests) {
  console.log('🎉 ALL LIVE TRACKING MAP FIXED MOVEMENT & STATIONS TESTS PASSED!');
  process.exit(0);
} else {
  console.error('❌ SOME TESTS FAILED');
  process.exit(1);
}
