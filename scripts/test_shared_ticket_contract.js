const fs = require('fs');
const assert = require('assert');
const ts = require('typescript');

// 1. Transpile services/sharedTicketContract.ts using TypeScript
const contractSrc = fs.readFileSync('services/sharedTicketContract.ts', 'utf8');
const jsCode = ts.transpileModule(contractSrc, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

// 2. Evaluate module in sandbox
const sandboxModule = { exports: {} };
const evalFn = new Function('module', 'exports', 'require', jsCode);
evalFn(sandboxModule, sandboxModule.exports, require);

const {
  AUTHORITATIVE_STATIONS,
  resolveAuthoritativeStation,
  buildSharedTicketPayload,
  isSharedTicketContract,
} = sandboxModule.exports;

console.log('================================================================');
console.log('CHIGARI RIDE — SHARED E-TICKET CONTRACT V1 TEST SUITE');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ [PASS] ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${description}`);
    console.error(`   Error: ${err.message}`);
    process.exitCode = 1;
  }
}

// Prepare standard test ticket: BVB -> Dharwad New Bus Stand
const now = new Date('2026-09-20T10:00:00.000Z');
const fourHoursLater = new Date('2026-09-20T14:00:00.000Z');
const sampleTicketId = 'CR-20260920-123456';

const rawPayload = buildSharedTicketPayload({
  ticketId: sampleTicketId,
  fromStationName: 'BVB',
  toStationName: 'Dharwad New Bus Stand',
  fare: 25.0,
  currency: 'INR',
  passengerDisplayName: 'Rahul Patil',
  status: 'active',
  issuedAt: now.toISOString(),
  validUntil: fourHoursLater.toISOString(),
});

const contract = JSON.parse(rawPayload);

// Test 1: Valid contract generation
runTest('1. Valid contract generation', () => {
  assert(contract && typeof contract === 'object', 'Contract must be a valid JSON object');
});

// Test 2: ticketVersion = 1
runTest('2. ticketVersion = 1', () => {
  assert.strictEqual(contract.ticketVersion, 1, 'ticketVersion must strictly equal 1');
});

// Test 3: Non-empty ticketId
runTest('3. Non-empty ticketId', () => {
  assert(typeof contract.ticketId === 'string' && contract.ticketId.trim().length > 0, 'ticketId must be a non-empty string');
  assert.strictEqual(contract.ticketId, sampleTicketId, 'ticketId must match provided id');
});

// Test 4: passenger object exists
runTest('4. passenger object exists with displayName', () => {
  assert(contract.passenger && typeof contract.passenger === 'object', 'passenger section must exist');
  assert.strictEqual(contract.passenger.displayName, 'Rahul Patil', 'passenger.displayName must match');
});

// Test 5: journey exists
runTest('5. journey exists', () => {
  assert(contract.journey && typeof contract.journey === 'object', 'journey section must exist');
});

// Test 6: from.name exists
runTest('6. from.name exists', () => {
  assert(typeof contract.journey.from?.name === 'string' && contract.journey.from.name.length > 0, 'journey.from.name must exist');
});

// Test 7: from.code exists
runTest('7. from.code exists', () => {
  assert(typeof contract.journey.from?.code === 'string' && contract.journey.from.code.length > 0, 'journey.from.code must exist');
});

// Test 8: to.name exists
runTest('8. to.name exists', () => {
  assert(typeof contract.journey.to?.name === 'string' && contract.journey.to.name.length > 0, 'journey.to.name must exist');
});

// Test 9: to.code exists
runTest('9. to.code exists', () => {
  assert(typeof contract.journey.to?.code === 'string' && contract.journey.to.code.length > 0, 'journey.to.code must exist');
});

// Test 10: from station code is authoritative
runTest('10. from station code is authoritative', () => {
  const matching = AUTHORITATIVE_STATIONS.find((s) => s.code === contract.journey.from.code);
  assert(matching, `from.code (${contract.journey.from.code}) must exist in AUTHORITATIVE_STATIONS`);
});

// Test 11: to station code is authoritative
runTest('11. to station code is authoritative', () => {
  const matching = AUTHORITATIVE_STATIONS.find((s) => s.code === contract.journey.to.code);
  assert(matching, `to.code (${contract.journey.to.code}) must exist in AUTHORITATIVE_STATIONS`);
});

// Test 12: from name matches code
runTest('12. from name matches code', () => {
  const matching = AUTHORITATIVE_STATIONS.find((s) => s.code === contract.journey.from.code);
  assert.strictEqual(matching.name.toLowerCase(), contract.journey.from.name.toLowerCase(), 'from name must match code record');
});

// Test 13: to name matches code
runTest('13. to name matches code', () => {
  const matching = AUTHORITATIVE_STATIONS.find((s) => s.code === contract.journey.to.code);
  assert.strictEqual(matching.name.toLowerCase(), contract.journey.to.name.toLowerCase(), 'to name must match code record');
});

// Test 14: from and to are different
runTest('14. from and to are different', () => {
  assert.notStrictEqual(contract.journey.from.code, contract.journey.to.code, 'from and to station codes must differ');
  assert.notStrictEqual(contract.journey.from.name.toLowerCase(), contract.journey.to.name.toLowerCase(), 'from and to names must differ');
});

// Test 15: fare is numeric
runTest('15. fare is numeric', () => {
  assert.strictEqual(typeof contract.ticket?.fare, 'number', 'ticket.fare must be numeric');
  assert(!isNaN(contract.ticket.fare), 'ticket.fare must not be NaN');
  assert(contract.ticket.fare >= 0, 'ticket.fare must be non-negative');
});

// Test 16: currency = INR
runTest('16. currency = INR', () => {
  assert.strictEqual(contract.ticket?.currency, 'INR', 'ticket.currency must strictly equal INR');
});

// Test 17: status = active for new ticket
runTest('17. status = active for new ticket', () => {
  assert.strictEqual(contract.ticket?.status, 'active', 'ticket.status must be active');
});

// Test 18: issuedAt is valid ISO-8601
runTest('18. issuedAt is valid ISO-8601', () => {
  const issued = new Date(contract.timing?.issuedAt);
  assert(!isNaN(issued.getTime()), 'timing.issuedAt must be valid date');
  assert.strictEqual(contract.timing.issuedAt, issued.toISOString(), 'timing.issuedAt must be ISO-8601 string');
});

// Test 19: expiresAt is valid ISO-8601
runTest('19. expiresAt is valid ISO-8601', () => {
  const expires = new Date(contract.timing?.expiresAt);
  assert(!isNaN(expires.getTime()), 'timing.expiresAt must be valid date');
  assert.strictEqual(contract.timing.expiresAt, expires.toISOString(), 'timing.expiresAt must be ISO-8601 string');
});

// Test 20: expiresAt > issuedAt
runTest('20. expiresAt > issuedAt', () => {
  const issued = new Date(contract.timing.issuedAt);
  const expires = new Date(contract.timing.expiresAt);
  assert(expires.getTime() > issued.getTime(), 'expiresAt must be strictly greater than issuedAt');
});

// Test 21: JSON.stringify(contract) produces the QR payload
runTest('21. JSON.stringify(contract) produces the QR payload', () => {
  assert.strictEqual(typeof rawPayload, 'string', 'QR payload must be a string');
  assert.strictEqual(rawPayload, JSON.stringify(contract), 'QR payload must be JSON.stringify(contract)');
});

// Test 22: The QR payload can be parsed back into the same contract
runTest('22. The QR payload can be parsed back into the same contract', () => {
  const parsed = JSON.parse(rawPayload);
  assert.deepStrictEqual(parsed, contract, 'Roundtrip JSON parse must preserve complete contract equality');
});

// Test 23: Ticket ID remains identical between UI and QR
runTest('23. Ticket ID remains identical between UI and QR', () => {
  assert.strictEqual(contract.ticketId, sampleTicketId, 'Ticket ID in QR payload must match source ticket ID');
});

// Test 24: BVB → Dharwad New Bus Stand produces exact expected station names and codes
runTest('24. BVB → Dharwad New Bus Stand produces exact expected station names and codes', () => {
  assert.strictEqual(contract.journey.from.name, 'BVB', 'Expected origin name BVB');
  assert.strictEqual(contract.journey.from.code, 'CR-BVB-031802022203', 'Expected origin code CR-BVB-031802022203');
  assert.strictEqual(contract.journey.to.name, 'Dharwad New Bus Stand', 'Expected destination name Dharwad New Bus Stand');
  assert.strictEqual(contract.journey.to.code, 'CR-DNBS-031804140219', 'Expected destination code CR-DNBS-031804140219');
});

// Test 25: All 35 official stations can be resolved without error
runTest('25. All 35 official stations resolve cleanly by name and code', () => {
  for (const st of AUTHORITATIVE_STATIONS) {
    const resByName = resolveAuthoritativeStation(st.name);
    assert.strictEqual(resByName.code, st.code, `Resolving by name '${st.name}' must return station code ${st.code}`);
    assert.strictEqual(resByName.name, st.name, `Resolving by name '${st.name}' must return exact name`);

    const resByCode = resolveAuthoritativeStation(st.code);
    assert.strictEqual(resByCode.code, st.code, `Resolving by code '${st.code}' must return station code ${st.code}`);
  }
});

// Test 26: isSharedTicketContract helper rejects incomplete/malformed payloads
runTest('26. isSharedTicketContract rejects invalid and incomplete payloads', () => {
  assert.strictEqual(isSharedTicketContract(null), false, 'null must be rejected');
  assert.strictEqual(isSharedTicketContract(''), false, 'empty must be rejected');
  assert.strictEqual(isSharedTicketContract(JSON.stringify({ ticketId: '123', status: 'active' })), false, 'partial {ticketId, status} must be rejected');
  assert.strictEqual(isSharedTicketContract(JSON.stringify({ ticketId: '123', from: 'BVB', to: 'DNBS' })), false, 'legacy payload must be rejected');
  assert.strictEqual(isSharedTicketContract(rawPayload), true, 'canonical v1 payload must be accepted');
});

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} tests passed`);
console.log('================================================================');

if (passedTests === totalTests) {
  console.log('🎉 ALL SHARED E-TICKET CONTRACT V1 TESTS PASSED!');
} else {
  console.error(`💥 ${totalTests - passedTests} TESTS FAILED!`);
  process.exit(1);
}
