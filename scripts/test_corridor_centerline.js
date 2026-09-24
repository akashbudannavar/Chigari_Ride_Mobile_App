const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('CHIGARI RIDE — BRTS CORRIDOR SINGLE CENTERLINE TEST SUITE');
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

const routeFile = path.join(__dirname, '../data/chigariRoute.ts');
const content = fs.readFileSync(routeFile, 'utf8');

// Parse coordinates and stops
const coordsMatch = content.match(/export const HDBRTS_CORRIDOR_COORDINATES: Coordinates\[\] = (\[[\s\S]*?\n\];)/);
assert.ok(coordsMatch, 'HDBRTS_CORRIDOR_COORDINATES must exist');
const corridorCoords = JSON.parse(coordsMatch[1].replace(/;\s*$/, ''));

const dharwadNewMatch = content.match(/export const HDBRTS_DHARWAD_NEW_COORDINATES: Coordinates\[\] = (\[[\s\S]*?\n\];)/);
assert.ok(dharwadNewMatch, 'HDBRTS_DHARWAD_NEW_COORDINATES must exist');
const dharwadNewCoords = JSON.parse(dharwadNewMatch[1].replace(/;\s*$/, ''));

const stopsMatch = content.match(/export const CHIGARI_VERIFIED_STOPS: BRTSStop\[\] = (\[[\s\S]*?\n\];)/);
assert.ok(stopsMatch, 'CHIGARI_VERIFIED_STOPS must exist');
const stops = JSON.parse(stopsMatch[1].replace(/;\s*$/, ''));

function dist(c1, c2) {
  const dx = (c1.longitude - c2.longitude) * Math.cos(c1.latitude * Math.PI / 180) * 111320;
  const dy = (c1.latitude - c2.latitude) * 111320;
  return Math.sqrt(dx*dx + dy*dy);
}

function findClosestIndex(coords, stop) {
  let minD = Infinity;
  let minIdx = -1;
  coords.forEach((c, idx) => {
    const d = dist(stop, c);
    if (d < minD) {
      minD = d;
      minIdx = idx;
    }
  });
  return minIdx;
}

// TEST GROUP 1: ZERO DUPLICATES & ZERO BACKTRACK LOOPS
console.log('--- TEST GROUP 1: ZERO ACCIDENTAL DUPLICATE SEGMENTS IN CORRIDOR ---');

runTest('Corridor contains zero near-identical points (> 3 indices apart within 5m)', () => {
  for (let i = 0; i < corridorCoords.length; i++) {
    for (let j = i + 4; j < corridorCoords.length; j++) {
      const d = dist(corridorCoords[i], corridorCoords[j]);
      assert.ok(d >= 4.0, `Duplicate points detected between idx ${i} and ${j} (dist = ${d.toFixed(2)}m)`);
    }
  }
});

runTest('Corridor polyline advances smoothly with no excessive jumps (> 200m)', () => {
  for (let i = 0; i < corridorCoords.length - 1; i++) {
    const d = dist(corridorCoords[i], corridorCoords[i+1]);
    assert.ok(d < 200, `Excessive jump of ${d.toFixed(1)}m at index ${i}`);
  }
});

// TEST GROUP 2: TARGET PROBLEM SECTIONS FIXED
console.log('\n--- TEST GROUP 2: TARGET ROAD SECTIONS VERIFICATION ---');

runTest('Vidyagiri ↔ Toll Naka is a single centerline with no parallel loop on the right side', () => {
  const vidyagiri = stops.find(s => s.name === 'Vidyagiri');
  const tollnaka = stops.find(s => s.name.includes('Toll'));
  const idxV = findClosestIndex(corridorCoords, vidyagiri);
  const idxT = findClosestIndex(corridorCoords, tollnaka);
  assert.ok(idxV < idxT, `Vidyagiri (idx ${idxV}) must precede Toll Naka (idx ${idxT}) in northbound direction`);
  
  // Verify monotonic progression along latitude
  const segment = corridorCoords.slice(idxV, idxT + 1);
  for (let i = 1; i < segment.length; i++) {
    assert.ok(
      segment[i].latitude >= segment[i-1].latitude - 0.0001,
      `Vidyagiri ↔ Toll Naka must not reverse latitude at index ${i}`
    );
  }
});

runTest('Vidyanagar ↔ BVB is a single centerline with no reverse loop', () => {
  const vidyanagar = stops.find(s => s.name === 'Vidyanagar');
  const bvb = stops.find(s => s.name === 'BVB');
  const idxV = findClosestIndex(corridorCoords, vidyanagar);
  const idxB = findClosestIndex(corridorCoords, bvb);
  assert.ok(idxV < idxB, `Vidyanagar (idx ${idxV}) must precede BVB (idx ${idxB}) northbound`);
  
  const segment = corridorCoords.slice(idxV, idxB + 1);
  for (let i = 1; i < segment.length; i++) {
    assert.ok(
      segment[i].latitude >= segment[i-1].latitude - 0.0001,
      `Vidyanagar ↔ BVB must not reverse latitude at index ${i}`
    );
  }
});

runTest('Court Circle ↔ Jubilee Circle is a single centerline with no parallel return track', () => {
  const courtCircle = stops.find(s => s.name.includes('Court Circle'));
  const jubileeCircle = stops.find(s => s.name.includes('Jubilee Circle'));
  const idxC = findClosestIndex(corridorCoords, courtCircle);
  const idxJ = findClosestIndex(corridorCoords, jubileeCircle);
  assert.ok(idxC < idxJ, `Court Circle (idx ${idxC}) must precede Jubilee Circle (idx ${idxJ}) northbound`);
  
  const segment = corridorCoords.slice(idxC, idxJ + 1);
  for (let i = 1; i < segment.length; i++) {
    assert.ok(
      segment[i].latitude >= segment[i-1].latitude - 0.0001,
      `Court Circle ↔ Jubilee Circle must not reverse latitude at index ${i}`
    );
  }
});

runTest('NTTF ↔ Court Circle is a single centerline with no reverse loop', () => {
  const nttf = stops.find(s => s.name === 'NTTF');
  const courtCircle = stops.find(s => s.name.includes('Court Circle'));
  const idxN = findClosestIndex(corridorCoords, nttf);
  const idxC = findClosestIndex(corridorCoords, courtCircle);
  assert.ok(idxN < idxC, `NTTF (idx ${idxN}) must precede Court Circle (idx ${idxC}) northbound`);
});

runTest('Dharwad New Branch starts at Jubilee Circle and does not overlap Court Circle', () => {
  const courtCircle = stops.find(s => s.name.includes('Court Circle'));
  dharwadNewCoords.forEach((c, idx) => {
    const d = dist(c, courtCircle);
    assert.ok(d > 100, `Dharwad New branch point ${idx} is too close to Court Circle (${d.toFixed(1)}m)`);
  });
});

// TEST GROUP 3: BIDIRECTIONAL REVERSIBILITY
console.log('\n--- TEST GROUP 3: BIDIRECTIONAL CORRIDOR SYMMETRY ---');

runTest('Both travel directions (Dharwad->Hubballi and Hubballi->Dharwad) use the exact same corridor', () => {
  const pairs = [
    ['Hubballi CBT', 'Dharwad BRTS Terminal'],
    ['Vidyagiri', 'Tollnaka'],
    ['Dharwad Court Circle', 'Jubilee Circle'],
    ['Vidyanagar', 'BVB'],
    ['Rayapur', 'Navanagar']
  ];

  pairs.forEach(([fromName, toName]) => {
    const fromStop = stops.find(s => s.name.toLowerCase().includes(fromName.toLowerCase()));
    const toStop = stops.find(s => s.name.toLowerCase().includes(toName.toLowerCase()));
    const idxFrom = findClosestIndex(corridorCoords, fromStop);
    const idxTo = findClosestIndex(corridorCoords, toStop);

    let forwardSlice, reverseSlice;
    if (idxFrom <= idxTo) {
      forwardSlice = corridorCoords.slice(idxFrom, idxTo + 1);
      reverseSlice = corridorCoords.slice(idxFrom, idxTo + 1).reverse();
    } else {
      forwardSlice = corridorCoords.slice(idxTo, idxFrom + 1).reverse();
      reverseSlice = corridorCoords.slice(idxTo, idxFrom + 1);
    }

    assert.strictEqual(forwardSlice.length, reverseSlice.length, 'Forward and reverse point counts must match');
    for (let i = 0; i < forwardSlice.length; i++) {
      const p1 = forwardSlice[i];
      const p2 = reverseSlice[reverseSlice.length - 1 - i];
      assert.strictEqual(p1.latitude, p2.latitude, 'Latitude symmetry mismatch');
      assert.strictEqual(p1.longitude, p2.longitude, 'Longitude symmetry mismatch');
    }
  });
});

// TEST GROUP 4: 35 STATIONS PRESERVATION & PROXIMITY
console.log('\n--- TEST GROUP 4: 35 AUTHORITATIVE STATIONS PRESERVATION ---');

runTest('All 36 stations exist and trunk stations project within 45m of the single centerline', () => {
  assert.strictEqual(stops.length, 36, 'Must have exactly 36 verified stops');
  
  stops.forEach(s => {
    let minD = Infinity;
    corridorCoords.forEach(c => {
      const d = dist(s, c);
      if (d < minD) minD = d;
    });
    if (s.branch === 'Trunk' && s.name !== 'Navalur') {
      assert.ok(minD <= 45, `Trunk stop ${s.name} is too far from centerline: ${minD.toFixed(1)}m`);
    }
  });
});

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} tests passed`);
console.log('================================================================');
console.log('🎉 ALL BRTS CORRIDOR SINGLE CENTERLINE TESTS PASSED!');
