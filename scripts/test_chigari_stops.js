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

const stopsModule = loadModule('data/chigariStops.ts');
console.log('CHIGARI_STOPS count:', stopsModule.CHIGARI_STOPS.length);

const cbt = stopsModule.CHIGARI_STOPS[0];
const bvb = stopsModule.CHIGARI_STOPS[11];
const route = stopsModule.calculateCorridorRoute(cbt, bvb);
console.log(`\nCorridor route from ${cbt.name} to ${bvb.name}:`);
console.log('- Distance (m):', route.distanceMeters);
console.log('- Duration (min):', route.durationMinutes);
console.log('- Fare (₹):', route.fare);
console.log('- Coordinates count:', route.coordinates.length);
console.log('- Intermediate stops count:', route.intermediateStops.length);
console.log('- Intermediate stops:', route.intermediateStops.map(s => s.name));

const reverseRoute = stopsModule.calculateCorridorRoute(bvb, cbt);
console.log(`\nReverse Corridor route from ${bvb.name} to ${cbt.name}:`);
console.log('- Distance (m):', reverseRoute.distanceMeters);
console.log('- Duration (min):', reverseRoute.durationMinutes);
console.log('- Fare (₹):', reverseRoute.fare);
console.log('- Coordinates count:', reverseRoute.coordinates.length);
console.log('- Intermediate stops count:', reverseRoute.intermediateStops.length);
console.log('- Intermediate stops:', reverseRoute.intermediateStops.map(s => s.name));
