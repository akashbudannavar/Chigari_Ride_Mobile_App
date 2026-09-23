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

const availabilityService = loadModule('data/chigariServices.ts');
const {
  CANONICAL_CORRIDOR_STOPS,
  CHIGARI_SERVICES,
  resolveStopNumber,
  getAvailableServicesForJourney,
  getAvailableServicesAtStop,
  getTransferSuggestions,
  formatAvailableServiceNumbers,
} = availabilityService;

console.log('====================================================');
console.log('CHIGARI RIDE — OFFICIAL ROUTE & SERVICE VALIDATION');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(description, condition, details = '') {
  totalTests++;
  if (condition) {
    console.log(`✅ [PASS] ${description}${details ? ` -> ${details}` : ''}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${description}${details ? ` -> ${details}` : ''}`);
  }
}

// -------------------------------------------------------------
// TEST 1: Hubballi Central Bus Terminal (CBT) ➔ Vidyanagar
// -------------------------------------------------------------
console.log('--- TEST 1: Hubballi CBT ➔ Vidyanagar ---');
const t1From = 'Hubballi Central Bus Terminal';
const t1To = 'Vidyanagar';
const t1Services = getAvailableServicesForJourney(t1From, t1To);
const t1Numbers = t1Services.map((s) => s.serviceNumber);

assert(
  'Stop resolution for Hubballi CBT and Vidyanagar',
  resolveStopNumber(t1From) === 35 && resolveStopNumber(t1To) === 27,
  `CBT=Stop ${resolveStopNumber(t1From)}, Vidyanagar=Stop ${resolveStopNumber(t1To)}`
);

assert(
  'Available bus for Hubballi CBT ➔ Vidyanagar is 200A only',
  t1Numbers.length === 1 && t1Numbers[0] === '200A',
  `Found: [${t1Numbers.join(', ')}]`
);

assert(
  'Excludes 201B, 100D, and 202C for Hubballi CBT ➔ Vidyanagar',
  !t1Numbers.includes('201B') && !t1Numbers.includes('100D') && !t1Numbers.includes('202C'),
  '201B and 100D start at Railway Station (36); 202C starts at Gokul (31)'
);

// -------------------------------------------------------------
// TEST 2: Ambedkar Circle ➔ Vidyanagar
// -------------------------------------------------------------
console.log('\n--- TEST 2: DR. B R Ambedkar Circle ➔ Vidyanagar ---');
const t2From = 'DR. B R Ambedkar Circle';
const t2To = 'Vidyanagar';
const t2Services = getAvailableServicesForJourney(t2From, t2To);
const t2Numbers = t2Services.map((s) => s.serviceNumber);

assert(
  'Stop resolution for Ambedkar Circle',
  resolveStopNumber(t2From) === 34,
  `Ambedkar Circle = Stop ${resolveStopNumber(t2From)}`
);

assert(
  'Available buses from Ambedkar Circle to Vidyanagar include 200A, 201B, 100D',
  t2Numbers.includes('200A') && t2Numbers.includes('201B') && t2Numbers.includes('100D'),
  `Found: [${t2Numbers.join(', ')}]`
);

assert(
  'Excludes 202C for Ambedkar Circle ➔ Vidyanagar',
  !t2Numbers.includes('202C'),
  '202C originates at Gokul and bypasses Ambedkar Circle via Hosur Cross'
);

// -------------------------------------------------------------
// TEST 3: Hubballi Railway Station ➔ Dharwad New Bus Stand
// -------------------------------------------------------------
console.log('\n--- TEST 3: Hubballi Railway Station ➔ Dharwad New Bus Stand ---');
const t3From = 'Hubballi Railway Station';
const t3To = 'Dharwad New Bus Stand';
const t3Services = getAvailableServicesForJourney(t3From, t3To);
const t3Numbers = t3Services.map((s) => s.serviceNumber);

assert(
  'Stop resolution for Railway Station and Dharwad New Bus Stand',
  resolveStopNumber(t3From) === 36 && resolveStopNumber(t3To) === 1,
  `Railway Station = Stop ${resolveStopNumber(t3From)}, Dharwad New = Stop ${resolveStopNumber(t3To)}`
);

assert(
  'Available buses for Railway Station ➔ Dharwad New Bus Stand are 201B and 100D',
  t3Numbers.includes('201B') && t3Numbers.includes('100D') && t3Numbers.length === 2,
  `Found: [${t3Numbers.join(', ')}]`
);

assert(
  'Excludes 200A and 202C for Railway Station ➔ Dharwad New Bus Stand',
  !t3Numbers.includes('200A') && !t3Numbers.includes('202C'),
  '200A and 202C terminate at Dharwad BRTS Terminal (Stop 2) and do not serve Railway Station (Stop 36)'
);

// -------------------------------------------------------------
// TEST 4: Hubballi New Bus Stand (Gokul Bus stop) ➔ Hosur Cross
// -------------------------------------------------------------
console.log('\n--- TEST 4: Gokul Bus Station ➔ Hosur Cross ---');
const t4From = 'Hubballi New Bus Stand (Gokul Bus stop)';
const t4To = 'Hosur Cross';
const t4Services = getAvailableServicesForJourney(t4From, t4To);
const t4Numbers = t4Services.map((s) => s.serviceNumber);

assert(
  'Stop resolution for Gokul Bus Stand and Hosur Cross',
  resolveStopNumber(t4From) === 31 && resolveStopNumber(t4To) === 30,
  `Gokul = Stop ${resolveStopNumber(t4From)}, Hosur Cross = Stop ${resolveStopNumber(t4To)}`
);

assert(
  'Available bus for Gokul ➔ Hosur Cross is 202C only',
  t4Numbers.length === 1 && t4Numbers[0] === '202C',
  `Found: [${t4Numbers.join(', ')}]`
);

// -------------------------------------------------------------
// TEST 5: Hubballi CBT ➔ Hubballi Railway Station (No Direct Bus + Transfer)
// -------------------------------------------------------------
console.log('\n--- TEST 5: Hubballi CBT ➔ Hubballi Railway Station (Transfer Check) ---');
const t5From = 'Hubballi Central Bus Terminal';
const t5To = 'Hubballi Railway Station';
const t5Services = getAvailableServicesForJourney(t5From, t5To);
const t5Transfers = getTransferSuggestions(t5From, t5To);

assert(
  'Hubballi CBT ➔ Hubballi Railway Station has NO direct service',
  t5Services.length === 0,
  `Direct services: ${t5Services.length}`
);

assert(
  'Smart transfer suggestions provided for CBT ➔ Railway Station',
  t5Transfers.length > 0,
  `Transfer options found: ${t5Transfers.length}`
);

const option1 = t5Transfers[0];
assert(
  'Option 1 transfers at Ambedkar Circle via 200A then 201B/100D',
  option1.transferStationNumber === 34 &&
    option1.leg1.serviceNumbers.includes('200A') &&
    (option1.leg2.serviceNumbers.includes('201B') || option1.leg2.serviceNumbers.includes('100D')),
  `Transfer Hub: ${option1.transferStationName} | Leg 1: [${option1.leg1.serviceNumbers.join(', ')}] | Leg 2: [${option1.leg2.serviceNumbers.join(', ')}]`
);

// -------------------------------------------------------------
// TEST 6: 100D Limited-Stop Service Verification
// -------------------------------------------------------------
console.log('\n--- TEST 6: 100D Limited-Stop Verification ---');
const service100D = CHIGARI_SERVICES.find((s) => s.serviceNumber === '100D' && s.direction === 'Hubballi_to_Dharwad');

assert(
  '100D is marked as limited stop service',
  service100D && service100D.isLimitedStop === true,
  `isLimitedStop: ${service100D ? service100D.isLimitedStop : false}`
);

assert(
  '100D stops only at express stations (skips minor stations like BVB, Rayapur, Sattur)',
  service100D &&
    !service100D.stopNumbers.includes(26) && // BVB
    !service100D.stopNumbers.includes(16) && // Rayapur
    !service100D.stopNumbers.includes(12) && // Sattur
    service100D.stopNumbers.includes(27) &&  // Vidyanagar (served)
    service100D.stopNumbers.includes(19) &&  // Navanagara (served)
    service100D.stopNumbers.includes(13),    // SDM (served)
  `100D stop count: ${service100D ? service100D.stopNumbers.length : 0} stations`
);

console.log('\n====================================================');
console.log(`TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
console.log('====================================================');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
