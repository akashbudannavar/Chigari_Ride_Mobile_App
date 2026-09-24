const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('CHIGARI RIDE — GOOGLE OAUTH CONFIGURATION & VERIFICATION SUITE');
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

// 1. Check app.json
runTest('app.json has scheme "chigariride" and package "com.chigari.ride"', () => {
  const appJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../app.json'), 'utf8'));
  assert.strictEqual(appJson.expo.scheme, 'chigariride');
  assert.strictEqual(appJson.expo.android.package, 'com.chigari.ride');
  assert.ok(appJson.expo.plugins.includes('expo-web-browser'));
});

// 2. Check lib/supabase.ts
runTest('lib/supabase.ts explicitly enforces flowType: "pkce"', () => {
  const content = fs.readFileSync(path.join(__dirname, '../lib/supabase.ts'), 'utf8');
  assert.ok(content.includes("flowType: 'pkce'"), 'Must explicitly set flowType to pkce');
  assert.ok(content.includes('EXPO_PUBLIC_SUPABASE_URL'), 'Must read EXPO_PUBLIC_SUPABASE_URL');
  assert.ok(content.includes('EXPO_PUBLIC_SUPABASE_ANON_KEY'), 'Must read EXPO_PUBLIC_SUPABASE_ANON_KEY');
});

// 3. Check app/auth-callback.tsx
runTest('app/auth-callback.tsx exists and exchanges PKCE code for session', () => {
  const filePath = path.join(__dirname, '../app/auth-callback.tsx');
  assert.ok(fs.existsSync(filePath), 'app/auth-callback.tsx must exist');
  const content = fs.readFileSync(filePath, 'utf8');
  assert.ok(content.includes('exchangeCodeForSession'), 'Must call exchangeCodeForSession');
  assert.ok(content.includes("router.replace('/(tabs)')"), 'Must redirect to tabs on success');
  assert.ok(content.includes("router.replace('/login')"), 'Must redirect to login on failure');
});

// 4. Check app/_layout.tsx
runTest('app/_layout.tsx registers auth-callback Stack.Screen', () => {
  const content = fs.readFileSync(path.join(__dirname, '../app/_layout.tsx'), 'utf8');
  assert.ok(content.includes('<Stack.Screen name="auth-callback"'), 'Must register auth-callback screen');
});

// 5. Check contexts/AuthContext.tsx
runTest('contexts/AuthContext.tsx implements signInWithGoogle with chigariride scheme and PKCE exchange', () => {
  const content = fs.readFileSync(path.join(__dirname, '../contexts/AuthContext.tsx'), 'utf8');
  assert.ok(content.includes('signInWithGoogle'), 'Must export signInWithGoogle');
  assert.ok(
    content.includes('chigariride://auth-callback') ||
      (content.includes("scheme: 'chigariride'") && content.includes("path: 'auth-callback'")),
    'Must use redirect URI scheme chigariride and path auth-callback'
  );
  assert.ok(content.includes('openAuthSessionAsync'), 'Must invoke WebBrowser.openAuthSessionAsync');
  assert.ok(content.includes('exchangeCodeForSession'), 'Must support in-line PKCE code exchange');
});

// 6. Check app/login.tsx & app/signup.tsx
runTest('app/login.tsx and app/signup.tsx invoke signInWithGoogle', () => {
  const loginContent = fs.readFileSync(path.join(__dirname, '../app/login.tsx'), 'utf8');
  const signupContent = fs.readFileSync(path.join(__dirname, '../app/signup.tsx'), 'utf8');
  assert.ok(loginContent.includes('signInWithGoogle()'), 'login.tsx must call signInWithGoogle()');
  assert.ok(signupContent.includes('signInWithGoogle()'), 'signup.tsx must call signInWithGoogle()');
});

// 7. Security Scan Check
runTest('Source code contains zero service-role keys or OAuth client secrets', () => {
  const scanDirs = ['app', 'components', 'contexts', 'lib', 'services', 'data', 'hooks', 'constants', 'types'];
  const banned = ['service_role', 'SUPABASE_SERVICE_ROLE_KEY', 'client_secret'];
  for (const d of scanDirs) {
    const fullDir = path.join(__dirname, '..', d);
    if (!fs.existsSync(fullDir)) continue;
    const files = fs.readdirSync(fullDir, { recursive: true });
    for (const f of files) {
      const fullF = path.join(fullDir, f);
      if (fs.statSync(fullF).isFile() && (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js'))) {
        const text = fs.readFileSync(fullF, 'utf8');
        for (const b of banned) {
          assert.ok(!text.includes(b), `Found prohibited keyword ${b} in ${fullF}`);
        }
      }
    }
  }
});

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} tests passed`);
console.log('================================================================');
console.log('🎉 GOOGLE OAUTH CONFIGURATION VERIFICATION COMPLETE!');
