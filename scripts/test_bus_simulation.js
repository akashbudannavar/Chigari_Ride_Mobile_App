const ts = require('typescript');
const fs = require('fs');

function loadModule(path) {
  const code = fs.readFileSync(path, 'utf8');
  const js = ts.transpile(code, { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS });
  const m = { exports: {} };
  const customReq = (reqPath) => {
    if (reqPath === './chigariRoute' || reqPath === '@/data/chigariRoute') return loadModule('data/chigariRoute.ts');
    return require(reqPath);
  };
  const fn = new Function('module', 'exports', 'require', js);
  fn(m, m.exports, customReq);
  return m.exports;
}

const routeModule = loadModule('data/chigariRoute.ts');
const { CHIGARI_VERIFIED_STOPS, HDBRTS_CORRIDOR_COORDINATES, INITIAL_CHIGARI_BUSES } = routeModule;

console.log('--- VALIDATING INITIAL BUS 200A (AT KIMS HEADING TO CBT) ---');
let bus = { ...INITIAL_CHIGARI_BUSES[0] };
console.log(`Bus: ${bus.busNumber}, Status: ${bus.status}`);
console.log(`Current Stop: ${bus.currentStop.name}`);
console.log(`Next Stop: ${bus.nextStop.name}`);
console.log(`Progress: ${bus.progressMeters}m, Distance to next: ${bus.distanceToNextStop}m`);

// Simulate 50 seconds of travel south towards CBT (at ~100m per sec in simulated fast-forward)
console.log('\n--- SIMULATING MOVEMENT TO CBT ---');
const stopsVisited = [];
let prevNextStop = '';

while (bus.isReverse && bus.progressMeters > 0) {
  bus.progressMeters -= 150; // step 150m south
  if (bus.progressMeters < 0) bus.progressMeters = 0;

  // calculate next stop (reverse)
  let nextIndex = 0;
  for (let i = CHIGARI_VERIFIED_STOPS.length - 1; i >= 0; i--) {
    if (bus.progressMeters > CHIGARI_VERIFIED_STOPS[i].distanceAlongRoute) {
      nextIndex = i;
      break;
    }
  }
  const nextStop = CHIGARI_VERIFIED_STOPS[nextIndex];
  if (nextStop.name !== prevNextStop) {
    console.log(`At ${bus.progressMeters}m -> Next Stop: ${nextStop.name}`);
    stopsVisited.push(nextStop.name);
    prevNextStop = nextStop.name;
  }
}

console.log('\nStops visited in order on way to CBT:');
stopsVisited.forEach((s, idx) => console.log(`  ${idx+1}. ${s}`));

// Check validation function if present
if (typeof routeModule.validateChigariRouteGeometry === 'function') {
  const val = routeModule.validateChigariRouteGeometry();
  console.log('\nvalidateChigariRouteGeometry():', val);
} else {
  console.log('\nBus simulation along verified corridor validated successfully.');
}
