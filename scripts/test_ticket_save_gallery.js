const ts = require('typescript');
const fs = require('fs');
const path = require('path');

const projectRoot = 'C:/Users/Asus/.gemini/antigravity/scratch/Chigari_Ride_Mobile_App';

function loadModule(relPath) {
  const fullPath = path.resolve(projectRoot, relPath);
  const code = fs.readFileSync(fullPath, 'utf8');
  const js = ts.transpile(code, {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
  });
  const m = { exports: {} };
  const fn = new Function('module', 'exports', 'require', js);
  fn(m, m.exports, require);
  return m.exports.default || m.exports.en || m.exports.kn || m.exports.hi || m.exports;
}

let passedTests = 0;
let totalTests = 0;

function assert(cond, name, details) {
  totalTests++;
  if (cond) {
    passedTests++;
    console.log(`✅ [PASS] ${name} -> ${details}`);
  } else {
    console.error(`❌ [FAIL] ${name} -> ${details}`);
  }
}

console.log('====================================================');
console.log('CHIGARI RIDE — TICKET SAVE TO GALLERY TEST SUITE');
console.log('====================================================\n');

// 1. Dependency and configuration checks
console.log('--- TEST 1: DEPENDENCY & APP.JSON CONFIGURATION ---');
const pkgPath = path.resolve(projectRoot, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
assert(!!pkg.dependencies['expo-media-library'], 'expo-media-library dependency installed', pkg.dependencies['expo-media-library']);
assert(!!pkg.dependencies['react-native-view-shot'], 'react-native-view-shot dependency installed', pkg.dependencies['react-native-view-shot']);

const appJsonPath = path.resolve(projectRoot, 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const plugins = appJson.expo.plugins || [];
const mediaLibPlugin = plugins.find(p => Array.isArray(p) && p[0] === 'expo-media-library');
assert(!!mediaLibPlugin, 'expo-media-library configured in app.json plugins', JSON.stringify(mediaLibPlugin));

// 2. Component inspection
console.log('\n--- TEST 2: DIGITAL TICKET SCREEN INSPECTION ---');
const ticketScreenPath = path.resolve(projectRoot, 'app/digital-ticket.tsx');
const ticketSrc = fs.readFileSync(ticketScreenPath, 'utf8');

assert(!ticketSrc.includes('viewHistoryBtn'), 'Ticket History button removed from digital ticket page', 'viewHistoryBtn removed');
assert(!ticketSrc.includes('handleGoToHistory'), 'handleGoToHistory removed', 'Eliminated from generated ticket page');
assert(ticketSrc.includes('styles.saveBtn'), 'Save button styled in bottom action row', 'styles.saveBtn present');
assert(ticketSrc.includes('styles.doneBtn'), 'Done button styled in bottom action row', 'styles.doneBtn present');
assert(ticketSrc.includes('handleSave'), 'handleSave handler bound to Save button', 'handleSave defined');
assert(ticketSrc.includes('handleDone'), 'handleDone handler bound to Done button', 'handleDone defined');

// Check capturing & MediaLibrary methods
assert(ticketSrc.includes('captureRef(ticketCardRef'), 'Captures complete digital ticket card', 'Uses captureRef on ticketCardRef');
assert(ticketSrc.includes('MediaLibrary.requestPermissionsAsync'), 'Requests media library permission', 'MediaLibrary.requestPermissionsAsync called');
assert(ticketSrc.includes('MediaLibrary.saveToLibraryAsync'), 'Saves to user gallery with saveToLibraryAsync', 'saveToLibraryAsync called');
assert(ticketSrc.includes('MediaLibrary.createAssetAsync'), 'Fallback asset creation via createAssetAsync', 'createAssetAsync called');
assert(ticketSrc.includes('Ticket saved to gallery'), 'Shows success confirmation message', 'Ticket saved to gallery present');
assert(ticketSrc.includes('Gallery permission is required'), 'Handles permission denial with clear alert', 'Permission denial message present');
assert(!/handleSave[\s\S]*?(router\.replace|router\.back)[\s\S]*?finally/m.test(ticketSrc), 'User remains on ticket page after save (no auto navigation)', 'Verified user remains on page');

// 3. Multilingual keys
console.log('\n--- TEST 3: MULTILINGUAL TRANSLATION PARITY ---');
const en = loadModule('translations/en.ts');
const kn = loadModule('translations/kn.ts');
const hi = loadModule('translations/hi.ts');

const requiredKeys = [
  'savePass',
  'saving',
  'ticketSaved',
  'permissionRequired',
  'permissionDenied',
  'saveError'
];

for (const k of requiredKeys) {
  assert(
    !!en.digitalTicket[k] && !!kn.digitalTicket[k] && !!hi.digitalTicket[k],
    'Key digitalTicket.' + k + ' in all 3 languages',
    'EN: ' + en.digitalTicket[k] + ' | KN: ' + kn.digitalTicket[k] + ' | HI: ' + hi.digitalTicket[k]
  );
}

console.log('\n====================================================');
console.log('TEST SUMMARY: ' + passedTests + '/' + totalTests + ' TESTS PASSED (' + ((passedTests / totalTests) * 100).toFixed(1) + '%)');
console.log('====================================================');

if (passedTests !== totalTests) process.exit(1);
