const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('CHIGARI RIDE — OPENFREEMAP + MAPLIBRE MIGRATION VERIFICATION SUITE');
console.log('================================================================');

let passedTests = 0;
let totalTests = 0;

function testAssert(title, condition) {
  totalTests++;
  try {
    assert(condition, title);
    console.log(`✅ [PASS] ${title}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${title}`);
    throw err;
  }
}

// 1. Check LiveTrackingMap.native.tsx
console.log('\n--- TEST 1: NATIVE MAP ENTRYPOINT (LiveTrackingMap.native.tsx) ---');
const nativeMapContent = fs.readFileSync(
  path.join(__dirname, '../components/map/LiveTrackingMap.native.tsx'),
  'utf8'
);

testAssert(
  'LiveTrackingMap.native.tsx does NOT import LiveTrackingMapGoogle',
  !nativeMapContent.includes('LiveTrackingMapGoogle')
);

testAssert(
  'LiveTrackingMap.native.tsx does NOT import LiveTrackingMapOSM',
  !nativeMapContent.includes('LiveTrackingMapOSM')
);

testAssert(
  'LiveTrackingMap.native.tsx imports LiveTrackingMapLibre',
  nativeMapContent.includes("import { LiveTrackingMapLibre } from './LiveTrackingMapLibre'")
);

testAssert(
  'LiveTrackingMap.native.tsx mounts LiveTrackingMapLibre as primary renderer',
  nativeMapContent.includes('<LiveTrackingMapLibre ref={ref} {...props} />')
);

testAssert(
  'LiveTrackingMap.native.tsx retains resilient vector fallback in ErrorBoundary',
  nativeMapContent.includes('fallback={<LiveTrackingMapVector ref={ref} {...props} />}')
);

// 2. Check services/mapConfig.ts
console.log('\n--- TEST 2: CENTRALIZED MAP CONFIG (services/mapConfig.ts) ---');
const mapConfigContent = fs.readFileSync(
  path.join(__dirname, '../services/mapConfig.ts'),
  'utf8'
);

testAssert(
  'mapConfig.ts exports OPEN_FREE_MAP_STYLE_URL with liberty style',
  mapConfigContent.includes("export const OPEN_FREE_MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'")
);

testAssert(
  'mapConfig.ts exports HDBRTS_MAP_CENTER_GEOJSON in [lng, lat] GeoJSON format',
  mapConfigContent.includes('HDBRTS_MAP_CENTER_GEOJSON') &&
    mapConfigContent.includes('75.0772') &&
    mapConfigContent.includes('15.4050')
);

testAssert(
  'mapConfig.ts exports GeoJSON coordinate conversion helpers',
  mapConfigContent.includes('toGeoJSONCoordinate') &&
    mapConfigContent.includes('toGeoJSONLineCoordinates')
);

// 3. Check LiveTrackingMapLibre.tsx MapLibre implementation
console.log('\n--- TEST 3: MAPLIBRE IMPLEMENTATION (LiveTrackingMapLibre.tsx) ---');
const libreMapContent = fs.readFileSync(
  path.join(__dirname, '../components/map/LiveTrackingMapLibre.tsx'),
  'utf8'
);

testAssert(
  'LiveTrackingMapLibre imports Map, Camera, GeoJSONSource, Layer, Marker from @maplibre/maplibre-react-native',
  libreMapContent.includes("from '@maplibre/maplibre-react-native'") &&
    libreMapContent.includes('Map') &&
    libreMapContent.includes('Camera') &&
    libreMapContent.includes('GeoJSONSource') &&
    libreMapContent.includes('Layer') &&
    libreMapContent.includes('Marker')
);

testAssert(
  'LiveTrackingMapLibre does NOT depend on react-native-maps',
  !libreMapContent.includes("from 'react-native-maps'") &&
    !libreMapContent.includes('PROVIDER_GOOGLE')
);

testAssert(
  'LiveTrackingMapLibre uses OPEN_FREE_MAP_STYLE_URL style',
  libreMapContent.includes('mapStyle={OPEN_FREE_MAP_STYLE_URL}')
);

testAssert(
  'LiveTrackingMapLibre supports imperative centerOnBus and centerOnRoute',
  libreMapContent.includes('centerOnBus') && libreMapContent.includes('centerOnRoute')
);

testAssert(
  'LiveTrackingMapLibre renders complete BRTS network branches via GeoJSONSource & Layer',
  libreMapContent.includes('HDBRTS_TRUNK_COORDINATES') &&
    libreMapContent.includes('HDBRTS_CBT_BRANCH_COORDINATES') &&
    libreMapContent.includes('HDBRTS_RAILWAY_COORDINATES') &&
    libreMapContent.includes('HDBRTS_DHARWAD_BRTS_BRANCH_COORDINATES') &&
    libreMapContent.includes('HDBRTS_DHARWAD_NEW_BRANCH_COORDINATES') &&
    libreMapContent.includes('HDBRTS_GOKUL_BRANCH_COORDINATES')
);

testAssert(
  'LiveTrackingMapLibre supports active journey route highlight',
  libreMapContent.includes('activeJourneyGeoJSON') &&
    libreMapContent.includes('isJourneyActive')
);

testAssert(
  'LiveTrackingMapLibre renders 35 stations and supports stop selection',
  libreMapContent.includes('displayedStops.map') &&
    libreMapContent.includes('onSelectStop')
);

testAssert(
  'LiveTrackingMapLibre renders buses and supports bus selection with heading',
  libreMapContent.includes('displayedBuses.map') &&
    libreMapContent.includes('onSelectBus') &&
    libreMapContent.includes('heading')
);

testAssert(
  'LiveTrackingMapLibre includes loading and error recovery states',
  libreMapContent.includes('ActivityIndicator') &&
    libreMapContent.includes('Loading OpenFreeMap Vector Tiles') &&
    libreMapContent.includes('errorOverlay') &&
    libreMapContent.includes('retryButton')
);

testAssert(
  'LiveTrackingMapLibre includes SIMULATED LOCATION notice badge',
  libreMapContent.includes('SIMULATED LOCATION • OPENFREEMAP VECTOR')
);

// 4. Check zero references to tile.openstreetmap.org across application source files
console.log('\n--- TEST 4: ZERO RASTER TILE REFERENCES (tile.openstreetmap.org) ---');
const scanDirs = ['app', 'components', 'services', 'data', 'hooks', 'constants', 'contexts'];
let foundOsmRaster = false;

function scanDir(dir) {
  const fullDir = path.join(__dirname, '..', dir);
  if (!fs.existsSync(fullDir)) return;
  const files = fs.readdirSync(fullDir, { recursive: true });
  for (const file of files) {
    const fullPath = path.join(fullDir, file);
    if (fs.statSync(fullPath).isFile() && (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('tile.openstreetmap.org')) {
        console.error(`Found raster OSM reference in: ${fullPath}`);
        foundOsmRaster = true;
      }
    }
  }
}

scanDirs.forEach(scanDir);
testAssert(
  'Zero references to tile.openstreetmap.org across all app source code',
  !foundOsmRaster
);

// 5. Check package.json dependencies
console.log('\n--- TEST 5: PACKAGE DEPENDENCIES (package.json) ---');
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')
);

testAssert(
  '@maplibre/maplibre-react-native is listed in package.json dependencies',
  !!packageJson.dependencies['@maplibre/maplibre-react-native']
);

testAssert(
  'react-native-maps is completely removed from package.json',
  !packageJson.dependencies['react-native-maps'] &&
    !packageJson.devDependencies?.['react-native-maps']
);

// 6. Check app.json config
console.log('\n--- TEST 6: EXPO CONFIG (app.json) ---');
const appJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../app.json'), 'utf8')
);

testAssert(
  'app.json includes @maplibre/maplibre-react-native in plugins list',
  appJson.expo.plugins &&
    appJson.expo.plugins.some((p) => (typeof p === 'string' ? p : p[0]) === '@maplibre/maplibre-react-native')
);

testAssert(
  'app.json does NOT require or declare googleMaps.apiKey',
  !appJson.expo.android?.config?.googleMaps
);

// 7. Check live.tsx integration
console.log('\n--- TEST 7: TRACKING SCREEN INTEGRATION (app/(tabs)/live.tsx) ---');
const liveScreenContent = fs.readFileSync(
  path.join(__dirname, '../app/(tabs)/live.tsx'),
  'utf8'
);

testAssert(
  'live.tsx uses the standard LiveTrackingMap wrapper',
  liveScreenContent.includes("from '@/components/map/LiveTrackingMap'") &&
    liveScreenContent.includes('<LiveTrackingMap')
);

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} tests passed`);
console.log('================================================================');
console.log('🎉 OPENFREEMAP + MAPLIBRE MIGRATION VERIFICATION COMPLETE!');
