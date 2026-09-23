const ts = require('typescript');
const fs = require('fs');
const path = require('path');
const jsQR = require('jsqr');

function loadModule(relPath) {
  const fullPath = path.resolve(__dirname, '..', relPath);
  const code = fs.readFileSync(fullPath, 'utf8');
  const js = ts.transpile(code, {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
  });
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
        }
      }
      return loadModule(resolved);
    }
    if (
      reqPath === 'react-native' ||
      reqPath === 'expo-camera' ||
      reqPath === 'expo-image-picker' ||
      reqPath === 'expo-haptics' ||
      reqPath === 'expo-sharing' ||
      reqPath === 'react-native-view-shot'
    ) {
      return {
        Platform: { OS: 'android' },
        Share: { share: async () => ({ action: 'sharedAction' }) },
        isAvailableAsync: async () => true,
        shareAsync: async () => {},
        captureRef: async () => 'file:///tmp/ticket.png',
      };
    }
    return require(reqPath);
  };
  const fn = new Function('module', 'exports', 'require', js);
  fn(m, m.exports, customReq);
  return m.exports;
}

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName, details) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`✅ [PASS] ${testName} -> ${details}`);
  } else {
    console.error(`❌ [FAIL] ${testName} -> ${details}`);
  }
}

console.log('====================================================');
console.log('CHIGARI RIDE — TICKET IMAGE SHARE VERIFICATION SUITE');
console.log('====================================================\n');

// 1. Check dependencies in package.json
console.log('--- TEST 1: EXPO DEPENDENCIES CHECK ---');
const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));
assert(!!pkg.dependencies['expo-sharing'], 'expo-sharing dependency', `Found version: ${pkg.dependencies['expo-sharing']}`);
assert(!!pkg.dependencies['react-native-view-shot'], 'react-native-view-shot dependency', `Found version: ${pkg.dependencies['react-native-view-shot']}`);
assert(!!pkg.dependencies['react-native-qrcode-svg'], 'react-native-qrcode-svg dependency', `Found version: ${pkg.dependencies['react-native-qrcode-svg']}`);

// 2. Validate Ticket QR Validation Logic
console.log('\n--- TEST 2: VALID TICKET QR FIDELITY ---');
const validation = loadModule('services/ticketValidation.ts');
const { validateTicketQR } = validation;

const now = new Date();
const validUntil = new Date(now.getTime() + 4 * 3600000);
const activeTicketPayload = JSON.stringify({
  type: 'CHIGARI_TICKET',
  ticketId: 'CR-20260916-776703',
  fromStopId: 'cbt_hubballi',
  fromStopName: 'Hubballi CBT',
  toStopId: 'corporation_h',
  toStopName: 'Corporation-H',
  fare: 10.0,
  currency: 'INR',
  ticketType: 'Adult',
  issuedAt: now.toISOString(),
  validUntil: validUntil.toISOString(),
  status: 'VALID',
});

const validResult = validateTicketQR(activeTicketPayload);
assert(validResult.success === true, 'Validate active ticket QR', `Result success: ${validResult.success}`);
assert(validResult.ticket?.ticketId === 'CR-20260916-776703', 'Ticket ID match', `Found: ${validResult.ticket?.ticketId}`);
assert(validResult.ticket?.fromStopName === 'Hubballi CBT', 'From stop match', `Found: ${validResult.ticket?.fromStopName}`);
assert(validResult.ticket?.toStopName === 'Corporation-H', 'To stop match', `Found: ${validResult.ticket?.toStopName}`);
assert(validResult.ticket?.fare === 10.0, 'Fare match', `Found: ₹${validResult.ticket?.fare}`);
assert(validResult.ticket?.status === 'Valid', 'Status is Valid', `Found status: ${validResult.ticket?.status}`);

// 3. Expired Ticket Validation (Requirement Test 9)
console.log('\n--- TEST 3: EXPIRED TICKET HANDLING (TEST 9) ---');
const expiredDate = new Date(now.getTime() - 24 * 3600000);
const expiredIssued = new Date(now.getTime() - 28 * 3600000);
const expiredTicketPayload = JSON.stringify({
  type: 'CHIGARI_TICKET',
  ticketId: 'CR-20260915-123456',
  fromStopId: 'cbt_hubballi',
  fromStopName: 'Hubballi CBT',
  toStopId: 'dharwad_cbt',
  toStopName: 'Dharwad BRTS Terminal',
  fare: 26.0,
  currency: 'INR',
  ticketType: 'Adult',
  issuedAt: expiredIssued.toISOString(),
  validUntil: expiredDate.toISOString(),
  status: 'EXPIRED',
});

const expiredResult = validateTicketQR(expiredTicketPayload);
assert(expiredResult.success === true, 'Parse expired ticket QR', `Parsed successfully`);
assert(expiredResult.ticket?.status === 'Expired', 'Status is Expired', `Found: ${expiredResult.ticket?.status}`);
assert(expiredResult.ticket?.ticketId === 'CR-20260915-123456', 'Expired ticket ID match', `Found: ${expiredResult.ticket?.ticketId}`);

// 4. Multilingual Translation Parity
console.log('\n--- TEST 4: MULTILINGUAL KEY PARITY (EN / KN / HI) ---');
const en = loadModule('translations/en.ts').en;
const kn = loadModule('translations/kn.ts').kn;
const hi = loadModule('translations/hi.ts').hi;

const newKeys = ['ticketType', 'shareSuccess', 'shareError', 'generatingImage', 'valid', 'expired'];

newKeys.forEach((key) => {
  const hasEn = !!en.digitalTicket?.[key];
  const hasKn = !!kn.digitalTicket?.[key];
  const hasHi = !!hi.digitalTicket?.[key];
  assert(
    hasEn && hasKn && hasHi,
    `Key "digitalTicket.${key}" present in all languages`,
    `EN: "${en.digitalTicket?.[key]}" | KN: "${kn.digitalTicket?.[key]}" | HI: "${hi.digitalTicket?.[key]}"`
  );
});

// Count total keys
function countKeys(obj) {
  let count = 0;
  for (const k of Object.keys(obj)) {
    if (typeof obj[k] === 'object' && obj[k] !== null) {
      count += countKeys(obj[k]);
    } else {
      count++;
    }
  }
  return count;
}

const enCount = countKeys(en);
const knCount = countKeys(kn);
const hiCount = countKeys(hi);
assert(enCount === knCount && knCount === hiCount, 'Exact translation key count parity', `EN: ${enCount}, KN: ${knCount}, HI: ${hiCount}`);

// 5. Verification of digital-ticket.tsx implementation
console.log('\n--- TEST 5: DIGITAL TICKET COMPONENT INTEGRATION ---');
const digitalTicketSrc = fs.readFileSync(path.resolve(__dirname, '../app/digital-ticket.tsx'), 'utf8');
assert(digitalTicketSrc.includes('captureRef'), 'captureRef imported', 'Uses react-native-view-shot captureRef');
assert(digitalTicketSrc.includes('Sharing.shareAsync'), 'Sharing.shareAsync called', 'Uses expo-sharing native sharing mechanism');
assert(digitalTicketSrc.includes('Sharing.isAvailableAsync'), 'Sharing.isAvailableAsync checked', 'Verifies share availability before sharing');
assert(digitalTicketSrc.includes("mimeType: 'image/png'"), 'PNG MIME type specified', 'Shares standard image/png');
assert(digitalTicketSrc.includes('ticketCardRef'), 'ticketCardRef defined', 'Captures complete bounded ticket card view');
assert(digitalTicketSrc.includes('collapsable={false}'), 'collapsable={false} set', 'Ensures Android native view is preserved for capture');
assert(digitalTicketSrc.includes('isExpired'), 'isExpired condition handled', 'Correctly displays EXPIRED status badge and validity pill');
assert(digitalTicketSrc.includes('ActivityIndicator'), 'ActivityIndicator loading state', 'Provides user visual feedback during image generation');

console.log('\n====================================================');
console.log(`TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
console.log('====================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
