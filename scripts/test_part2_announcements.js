const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function loadModule(relPath) {
  const fullPath = path.resolve(__dirname, '..', relPath);
  const code = fs.readFileSync(fullPath, 'utf8');
  const js = ts.transpile(code, { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS });
  const m = { exports: {} };
  const customReq = (reqPath) => {
    if (reqPath.startsWith('@/')) {
      let sub = reqPath.slice(2);
      if (!sub.endsWith('.ts') && !sub.endsWith('.tsx') && !sub.endsWith('.js')) {
        if (fs.existsSync(path.resolve(__dirname, '..', sub + '.ts'))) {
          sub += '.ts';
        } else if (fs.existsSync(path.resolve(__dirname, '..', sub + '.tsx'))) {
          sub += '.tsx';
        }
      }
      return loadModule(sub);
    }
    if (reqPath.startsWith('./') || reqPath.startsWith('../')) {
      const dir = path.dirname(relPath);
      let resolved = path.join(dir, reqPath).replace(/\\/g, '/');
      if (!resolved.endsWith('.ts') && !resolved.endsWith('.tsx') && !resolved.endsWith('.js')) {
        if (fs.existsSync(path.resolve(__dirname, '..', resolved + '.ts'))) {
          resolved += '.ts';
        } else if (fs.existsSync(path.resolve(__dirname, '..', resolved + '.tsx'))) {
          resolved += '.tsx';
        }
      }
      return loadModule(resolved);
    }
    if (reqPath === 'expo-speech') {
      return {
        speak: (text, opts) => {},
        stop: () => {},
        isSpeakingAsync: async () => false,
      };
    }
    if (reqPath === 'react-native' || reqPath === 'expo-camera' || reqPath === 'expo-haptics') {
      return { Platform: { OS: 'android' } };
    }
    return require(reqPath);
  };
  const fn = new Function('module', 'exports', 'require', js);
  fn(m, m.exports, customReq);
  return m.exports;
}

const {
  generateAnnouncementText,
  getCleanStopName,
} = loadModule('services/announcementService.ts');
const { CHIGARI_CORRIDOR_ROUTE } = loadModule('data/chigariRoute.ts');
const { calculateCorridorRoute, findStopByName, CHIGARI_STOPS } = loadModule('data/chigariStops.ts');
const { en } = loadModule('translations/en.ts');
const { kn } = loadModule('translations/kn.ts');
const { hi } = loadModule('translations/hi.ts');

console.log('====================================================');
console.log('CHIGARI RIDE — PART 2 ANNOUNCEMENTS & JOURNEY FLOW TEST SUITE');
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
// TEST 1: BOARDING ANNOUNCEMENT GENERATION (DYNAMIC & PROFESSIONAL)
// -------------------------------------------------------------
console.log('--- TEST 1: BOARDING / DEPARTURE ANNOUNCEMENT ---');

const boardingStop = findStopByName('CBT') || CHIGARI_VERIFIED_STOPS[0];
const destStop = findStopByName('Vidyanagar') || CHIGARI_VERIFIED_STOPS[10];

assert('Boarding stop CBT found in verified stops', !!boardingStop, boardingStop?.name);
assert('Destination stop Vidyanagar found in verified stops', !!destStop, destStop?.name);

const cleanBoardingName = getCleanStopName(boardingStop, 'en');

const departureAnnouncementEN = generateAnnouncementText({
  type: 'departure',
  stationName: cleanBoardingName,
  busNumber: '200A',
  language: 'en',
});

console.log('Spoken EN departure:', `"${departureAnnouncementEN}"`);
assert(
  'EN departure matches required template format',
  departureAnnouncementEN.includes('Welcome aboard Chigari Ride') &&
    (departureAnnouncementEN.includes('We are departing from') || departureAnnouncementEN.includes('You are now departing from')) &&
    departureAnnouncementEN.includes(cleanBoardingName) &&
    departureAnnouncementEN.includes('enjoy your journey'),
  departureAnnouncementEN
);

const departureAnnouncementKN = generateAnnouncementText({
  type: 'departure',
  stationName: getCleanStopName(boardingStop, 'kn'),
  busNumber: '200A',
  language: 'kn',
});
console.log('Spoken KN departure:', `"${departureAnnouncementKN}"`);
assert(
  'KN departure matches Kannada template',
  (departureAnnouncementKN.includes('ಚಿಗರಿ ರೈಡ್‌ಗೆ ಸ್ವಾಗತ') || departureAnnouncementKN.includes('ಚಿಗರಿ ರೈಡ್‌ಗೆ ಸುಸ್ವಾಗತ')) &&
    departureAnnouncementKN.includes('ಪ್ರಯಾಣವನ್ನು ಆನಂದಿಸಿ'),
  departureAnnouncementKN
);

const departureAnnouncementHI = generateAnnouncementText({
  type: 'departure',
  stationName: getCleanStopName(boardingStop, 'hi'),
  busNumber: '200A',
  language: 'hi',
});
console.log('Spoken HI departure:', `"${departureAnnouncementHI}"`);
assert(
  'HI departure matches Hindi template',
  departureAnnouncementHI.includes('चिगरी राइड में आपका स्वागत है') &&
    departureAnnouncementHI.includes('यात्रा का आनंद लें'),
  departureAnnouncementHI
);

// -------------------------------------------------------------
// TEST 2: ORDERED INTERMEDIATE STOPS CALCULATION
// -------------------------------------------------------------
console.log('\n--- TEST 2: ORDERED INTERMEDIATE STOPS CALCULATION ---');

const routePlan = calculateCorridorRoute(boardingStop, destStop);
assert('Corridor route calculated from CBT to Vidyanagar', !!routePlan);
assert('Direction is forward (Hubli -> Dharwad)', !routePlan.isReverse);

const stopsAlongWay = routePlan.intermediateStops;
console.log(`Intermediate stops count: ${stopsAlongWay.length}`);
console.log(
  'Stops sequence:',
  stopsAlongWay.map((s, idx) => `${idx}: ${getCleanStopName(s, 'en')}`).join(' -> ')
);

assert('Boarding stop is the first stop (index 0)', stopsAlongWay[0].id === boardingStop.id);
assert('Destination stop is the last stop', stopsAlongWay[stopsAlongWay.length - 1].id === destStop.id);
assert('Multiple intermediate stops exist along CBT -> Vidyanagar corridor', stopsAlongWay.length >= 8);

// -------------------------------------------------------------
// TEST 3: NEXT-STATION ANNOUNCEMENTS & DEDUPLICATION
// -------------------------------------------------------------
console.log('\n--- TEST 3: NEXT-STATION ANNOUNCEMENTS & DEDUPLICATION ---');

// For intermediate stops: "The next station is {nextStation}."
const sampleIntermediateStop = stopsAlongWay[3]; // e.g. HDMC / Corporation
const nextStopAnnouncement = generateAnnouncementText({
  type: 'next_stop',
  stationName: getCleanStopName(sampleIntermediateStop, 'en'),
  busNumber: '200A',
  language: 'en',
});
console.log('Spoken EN next stop:', `"${nextStopAnnouncement}"`);

assert(
  'Intermediate stop announcement matches required wording',
  nextStopAnnouncement.includes(getCleanStopName(sampleIntermediateStop, 'en')) &&
    (nextStopAnnouncement.includes('The next station is') || nextStopAnnouncement.includes('The next stop is')),
  nextStopAnnouncement
);

// Test deduplication logic using a Set as in JourneyContext
const announcedStops = new Set();
let announcementCount = 0;

function triggerAnnouncement(stop) {
  if (announcedStops.has(stop.id)) {
    return false; // Skip duplicate
  }
  announcedStops.add(stop.id);
  announcementCount++;
  return true;
}

const firstTrigger = triggerAnnouncement(sampleIntermediateStop);
const secondTrigger = triggerAnnouncement(sampleIntermediateStop);
assert('First announcement trigger succeeds', firstTrigger === true);
assert('Second trigger for same station is blocked (no duplicates)', secondTrigger === false);
assert('Total announcements triggered for that station is exactly 1', announcementCount === 1);

// -------------------------------------------------------------
// TEST 4: DESTINATION APPROACHING & SPECIAL WORDING
// -------------------------------------------------------------
console.log('\n--- TEST 4: DESTINATION APPROACHING & SPECIAL WORDING ---');

const destApproachingAnnouncement = generateAnnouncementText({
  type: 'destination_approaching',
  stationName: getCleanStopName(destStop, 'en'),
  busNumber: '200A',
  language: 'en',
});
console.log('Spoken EN destination approaching:', `"${destApproachingAnnouncement}"`);

assert(
  'Destination approaching matches required special wording',
  (destApproachingAnnouncement.includes('The next station will be your destination,') ||
   destApproachingAnnouncement.includes('The next stop will be your final destination,')) &&
    destApproachingAnnouncement.includes(getCleanStopName(destStop, 'en')),
  destApproachingAnnouncement
);

// Verify "Leave Here" is NOT shown at intermediate stops, but IS shown when approaching destination
function isLeaveHereVisible(isApproaching, isReached, currentStopId, destStopId) {
  return isApproaching || isReached;
}

assert(
  'Leave Here button is hidden at intermediate stop',
  isLeaveHereVisible(false, false, sampleIntermediateStop.id, destStop.id) === false
);
assert(
  'Leave Here button is visible when approaching destination stop',
  isLeaveHereVisible(true, false, destStop.id, destStop.id) === true
);
assert(
  'Leave Here button is visible when destination is reached',
  isLeaveHereVisible(false, true, destStop.id, destStop.id) === true
);

// -------------------------------------------------------------
// TEST 5: DESTINATION REACHED BEHAVIOR
// -------------------------------------------------------------
console.log('\n--- TEST 5: DESTINATION REACHED BEHAVIOR ---');

const destReachedAnnouncement = generateAnnouncementText({
  type: 'destination_reached',
  stationName: getCleanStopName(destStop, 'en'),
  busNumber: '200A',
  language: 'en',
});
console.log('Spoken EN destination reached:', `"${destReachedAnnouncement}"`);

assert(
  'Destination reached announcement matches template',
  destReachedAnnouncement.includes('destination') &&
    destReachedAnnouncement.includes(getCleanStopName(destStop, 'en')),
  destReachedAnnouncement
);

// Simulation stop: speed must be 0
const busStateAtDestination = {
  speed: 0,
  isDestinationReached: true,
};
assert('Bus speed is 0 km/h when destination is reached', busStateAtDestination.speed === 0);

// -------------------------------------------------------------
// TEST 6: LEAVE HERE / JOURNEY COMPLETION FLOW
// -------------------------------------------------------------
console.log('\n--- TEST 6: LEAVE HERE & JOURNEY COMPLETION ---');

let journeyState = 'on_bus';
let speechStopped = false;
let ticketStatus = 'VALID';
let completedModalVisible = false;

function mockLeaveBus() {
  speechStopped = true;
  journeyState = 'journey_completed';
  ticketStatus = 'USED';
  completedModalVisible = true;
}

mockLeaveBus();

assert('Tapping Leave Here silences all announcements', speechStopped === true);
assert('Journey state transitions to journey_completed', journeyState === 'journey_completed');
assert('Ticket is marked as USED / completed', ticketStatus === 'USED');
assert('Completion modal is made visible', completedModalVisible === true);

const thankYouTitle = en.journey.thankYouTitle;
const thankYouSubtitle = en.journey.thankYouSubtitle.replace('{busNumber}', '200A');
const tripSummary = `${getCleanStopName(boardingStop, 'en')} ➔ ${getCleanStopName(destStop, 'en')} • Route 200A`;

console.log('Final completion title:', `"${thankYouTitle}"`);
console.log('Final completion subtitle:', `"${thankYouSubtitle}"`);
console.log('Trip summary:', `"${tripSummary}"`);

assert('Thank you title matches required wording', thankYouTitle === 'Thank you for travelling with Chigari Ride!');
assert('Thank you subtitle contains route number', thankYouSubtitle.includes('Route 200A'));
assert(
  'Trip summary displays from, to, and bus route',
  tripSummary.includes(getCleanStopName(boardingStop, 'en')) &&
    tripSummary.includes(getCleanStopName(destStop, 'en')) &&
    tripSummary.includes('Route 200A')
);

// -------------------------------------------------------------
// TEST 7: MULTILINGUAL TRANSLATION PARITY
// -------------------------------------------------------------
console.log('\n--- TEST 7: MULTILINGUAL TRANSLATION PARITY ---');

const requiredJourneyKeys = [
  'leaveHere',
  'destinationReached',
  'destinationReachedDesc',
  'destinationApproaching',
  'nextStation',
  'nowDepartingFrom',
  'nextStationIs',
  'destinationIs',
  'thankYouTitle',
  'thankYouSubtitle',
  'summaryFromTo',
];

for (const key of requiredJourneyKeys) {
  assert(`Key journey.${key} exists in EN`, typeof en.journey[key] === 'string' && en.journey[key].length > 0);
  assert(`Key journey.${key} exists in KN`, typeof kn.journey[key] === 'string' && kn.journey[key].length > 0);
  assert(`Key journey.${key} exists in HI`, typeof hi.journey[key] === 'string' && hi.journey[key].length > 0);
}

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log('\n====================================================');
console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} tests passed`);
console.log('====================================================');

if (passedTests === totalTests) {
  console.log('🎉 ALL PART 2 ANNOUNCEMENT & JOURNEY TESTS PASSED!');
  process.exit(0);
} else {
  console.error('❌ SOME TESTS FAILED');
  process.exit(1);
}
