const fs = require('fs');
const path = require('path');

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
console.log('CHIGARI RIDE — SPLASH SCREEN REFINEMENT TEST SUITE');
console.log('====================================================\n');

// 1. Inspect SplashScreen.tsx component
console.log('--- TEST 1: SPLASH SCREEN COMPONENT INSPECTION ---');
const splashPath = path.resolve(__dirname, '../components/SplashScreen.tsx');
const splashSrc = fs.readFileSync(splashPath, 'utf8');

// Check that ONLY the green logo image is rendered
assert(splashSrc.includes('chigari_ride_logo.png'), 'Uses approved green CHIGARI RIDE image', 'Found chigari_ride_logo.png');
assert(splashSrc.includes('<Animated.Image'), 'Uses Animated.Image', 'Image is directly animated');

// Check that NO separate Text or Title is rendered
const hasTextComponent = /<Text[\s>]|<Animated\.Text/i.test(splashSrc);
assert(!hasTextComponent, 'NO separate Text or Title rendered', 'Verified zero <Text> or <Animated.Text> elements');

// Check that NO box or card container exists around the logo
assert(!splashSrc.includes('logoWrapper'), 'NO logoWrapper box', 'Wrapper box removed');
assert(!splashSrc.includes('logoCircle'), 'NO logoCircle box', 'Circle container removed');
assert(!splashSrc.includes('borderWidth'), 'NO borders on splash', 'Zero borderWidth in styles');
assert(!splashSrc.includes('borderRadius'), 'NO rounded card corners', 'Zero borderRadius in styles');
assert(!splashSrc.includes('shadow'), 'NO shadows', 'Zero shadow properties in styles');

// Check that NO loading dots or spinners exist
assert(!splashSrc.includes('dotsContainer'), 'NO loading dots container', 'dotsContainer removed');
assert(!splashSrc.includes('dotActive'), 'NO active dot indicators', 'dotActive removed');
assert(!splashSrc.includes('ActivityIndicator'), 'NO loading spinner', 'Zero ActivityIndicator in splash');

// Check Fade-In Animation properties
console.log('\n--- TEST 2: FADE-IN ANIMATION INSPECTION ---');
assert(splashSrc.includes('imageOpacity = useSharedValue(0)'), 'Initial opacity is 0', 'imageOpacity starts at 0');
assert(splashSrc.includes('duration: 750'), 'Fade-in duration in 600-1000ms range', 'Duration is exactly 750ms');
assert(splashSrc.includes('Easing.out(Easing.ease)'), 'Smooth easing applied', 'Uses Easing.out(Easing.ease)');
assert(!splashSrc.includes('withSpring'), 'NO bounce / spring effect', 'Spring bounce completely eliminated');
assert(!splashSrc.includes('rotate'), 'NO rotation effect', 'Rotation completely eliminated');
assert(!splashSrc.includes('AUTO_NAV_DELAY'), 'NO long artificial timeout delay', 'AUTO_NAV_DELAY removed');

// Check background color
assert(splashSrc.includes("backgroundColor: '#FFFFFF'"), 'Clean #FFFFFF background', 'Matches official branding');

// 2. Inspect app/_layout.tsx integration
console.log('\n--- TEST 3: ROOT NAVIGATION SPLASH INTEGRATION ---');
const layoutPath = path.resolve(__dirname, '../app/_layout.tsx');
const layoutSrc = fs.readFileSync(layoutPath, 'utf8');

assert(layoutSrc.includes('<SplashScreen onAnimationComplete={handleSplashComplete}'), 'Mounts SplashScreen in RootNavigator', 'Smooth custom splash transition mounted');
assert(layoutSrc.includes("router.replace('/welcome')"), 'Transitions to Get Started / Login screen', 'Initial navigation cleanly transitions to /welcome');
assert(layoutSrc.includes("router.replace('/(tabs)')"), 'Transitions to (tabs) if authenticated', 'Direct route to main tabs when session active');

// 3. Inspect app.json configuration
console.log('\n--- TEST 4: EXPO & ANDROID APK CONFIGURATION ---');
const appJsonPath = path.resolve(__dirname, '../app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

assert(appJson.expo.splash.image === './assets/images/chigari_ride_logo.png', 'Root splash image is green logo', appJson.expo.splash.image);
assert(appJson.expo.splash.backgroundColor === '#FFFFFF', 'Root splash background is #FFFFFF', appJson.expo.splash.backgroundColor);
assert(appJson.expo.android.splash.image === './assets/images/chigari_ride_logo.png', 'Android splash image is green logo', appJson.expo.android.splash.image);
assert(appJson.expo.android.splash.backgroundColor === '#FFFFFF', 'Android splash background is #FFFFFF', appJson.expo.android.splash.backgroundColor);

console.log('\n====================================================');
console.log(`TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
console.log('====================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
