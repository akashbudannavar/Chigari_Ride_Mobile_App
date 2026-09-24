const fs = require('fs');
const path = require('path');

const routeFilePath = path.join(__dirname, '../data/chigariRoute.ts');
const content = fs.readFileSync(routeFilePath, 'utf8');

// Parse components
const stopsMatch = content.match(/export const CHIGARI_VERIFIED_STOPS: BRTSStop\[\] = (\[[\s\S]*?\n\];)/);
if (!stopsMatch) throw new Error('Could not find CHIGARI_VERIFIED_STOPS');
const origStops = JSON.parse(stopsMatch[1].replace(/;\s*$/, ''));

const coordsMatch = content.match(/export const HDBRTS_CORRIDOR_COORDINATES: Coordinates\[\] = (\[[\s\S]*?\n\];)/);
if (!coordsMatch) throw new Error('Could not find HDBRTS_CORRIDOR_COORDINATES');
const origCorridor = JSON.parse(coordsMatch[1].replace(/;\s*$/, ''));

const dharwadNewMatch = content.match(/export const HDBRTS_DHARWAD_NEW_COORDINATES: Coordinates\[\] = (\[[\s\S]*?\n\];)/);
if (!dharwadNewMatch) throw new Error('Could not find HDBRTS_DHARWAD_NEW_COORDINATES');
const origDharwadNew = JSON.parse(dharwadNewMatch[1].replace(/;\s*$/, ''));

// Build clean corridor by removing the 5 accidental backtrack loops:
// 1. Vidyanagar <-> BVB: 148..189
// 2. Vidyagiri: 584..603
// 3. Toll Naka: 613..637
// 4. NTTF <-> Court Circle: 674..691
// 5. Court Circle <-> Jubilee Circle: 701..724
const cleanCorridor = [];
for (let i = 0; i < origCorridor.length; i++) {
  if (i >= 148 && i <= 189) continue;
  if (i >= 584 && i <= 603) continue;
  if (i >= 613 && i <= 637) continue;
  if (i >= 674 && i <= 691) continue;
  if (i >= 701 && i <= 724) continue;
  cleanCorridor.push(origCorridor[i]);
}

// Clean Dharwad New branch: start at Jubilee Circle (index 0) and directly continue north (indices 16..52)
const cleanDharwadNew = [origDharwadNew[0], ...origDharwadNew.slice(16)];

// Helper for distances
function haversine(c1, c2) {
  const R = 6371000;
  const dLat = (c2.latitude - c1.latitude) * Math.PI / 180;
  const dLng = (c2.longitude - c1.longitude) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(c1.latitude * Math.PI / 180) * Math.cos(c2.latitude * Math.PI / 180) * Math.sin(dLng/2)**2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Cumulative distances along clean corridor
const cumDist = [0];
for (let i = 1; i < cleanCorridor.length; i++) {
  cumDist.push(cumDist[i-1] + haversine(cleanCorridor[i-1], cleanCorridor[i]));
}

const totalDistance = Math.round(cumDist[cumDist.length - 1]);
console.log('Clean corridor length:', cleanCorridor.length);
console.log('Clean Dharwad New length:', cleanDharwadNew.length);
console.log('Total corridor distance:', totalDistance, 'm');

// Update CHIGARI_VERIFIED_STOPS
const updatedStops = origStops.map(s => {
  let minD = Infinity;
  let minIdx = -1;
  cleanCorridor.forEach((c, idx) => {
    const d = haversine(s, c);
    if (d < minD) {
      minD = d;
      minIdx = idx;
    }
  });
  let distAlong = Math.round(cumDist[minIdx]);
  if (s.id === 'hdbrts-stop-01') {
    // Dharwad New Bus Stand: junction at Jubilee Circle + branch distance
    const jubileeDist = Math.round(cumDist[591]);
    let branchDist = 0;
    for (let k = 1; k < cleanDharwadNew.length; k++) {
      branchDist += haversine(cleanDharwadNew[k-1], cleanDharwadNew[k]);
    }
    distAlong = Math.round(jubileeDist + branchDist);
  } else if (s.id === 'hdbrts-stop-31') {
    distAlong = 2991;
  } else if (s.id === 'hdbrts-stop-36') {
    distAlong = 704;
  }
  return {
    ...s,
    distanceAlongRoute: distAlong,
    perpendicularDistance: Math.round(minD * 10) / 10,
  };
});

// Format TypeScript arrays
function formatJsonLines(obj, indent = 2) {
  return JSON.stringify(obj, null, indent);
}

// Reconstruct file
const stopsReplacement = `export const CHIGARI_VERIFIED_STOPS: BRTSStop[] = ${formatJsonLines(updatedStops)};`;
const corridorReplacement = `export const HDBRTS_CORRIDOR_COORDINATES: Coordinates[] = ${formatJsonLines(cleanCorridor)};`;
const dharwadNewReplacement = `export const HDBRTS_DHARWAD_NEW_COORDINATES: Coordinates[] = ${formatJsonLines(cleanDharwadNew)};`;

let newContent = content;

// Replace CHIGARI_VERIFIED_STOPS
newContent = newContent.replace(
  /export const CHIGARI_VERIFIED_STOPS: BRTSStop\[\] = \[[\s\S]*?\n\];/,
  stopsReplacement
);

// Replace HDBRTS_CORRIDOR_COORDINATES
newContent = newContent.replace(
  /export const HDBRTS_CORRIDOR_COORDINATES: Coordinates\[\] = \[[\s\S]*?\n\];/,
  corridorReplacement
);

// Replace HDBRTS_DHARWAD_NEW_COORDINATES
newContent = newContent.replace(
  /export const HDBRTS_DHARWAD_NEW_COORDINATES: Coordinates\[\] = \[[\s\S]*?\n\];/,
  dharwadNewReplacement
);

// Update CHIGARI_CORRIDOR_ROUTE totalDistanceMeters
newContent = newContent.replace(
  /totalDistanceMeters: 26093,/,
  `totalDistanceMeters: ${totalDistance},`
);

// Update branch coordinate slice indices
newContent = newContent.replace(
  /export const HDBRTS_TRUNK_COORDINATES: Coordinates\[\] = HDBRTS_CORRIDOR_COORDINATES\.slice\(76, 877\);/,
  `// Trunk Corridor: Dr. B R Ambedkar Circle / Hosur Cross (idx 76) ↔ Jubilee Circle (idx 591)\nexport const HDBRTS_TRUNK_COORDINATES: Coordinates[] = HDBRTS_CORRIDOR_COORDINATES.slice(76, 592);`
);

newContent = newContent.replace(
  /export const HDBRTS_DHARWAD_BRTS_BRANCH_COORDINATES: Coordinates\[\] = HDBRTS_CORRIDOR_COORDINATES\.slice\(876, 909\);/,
  `// Northern Branch A: Jubilee Circle (idx 591) ➔ Dharwad BRTS Terminal (idx 608)\nexport const HDBRTS_DHARWAD_BRTS_BRANCH_COORDINATES: Coordinates[] = HDBRTS_CORRIDOR_COORDINATES.slice(591, 609);`
);

// Update INITIAL_CHIGARI_BUSES progressMeters for Navanagar (bus-201b) and Lakamanahalli (bus-100d)
newContent = newContent.replace(
  /progressMeters: 11451, \/\/ Past Navanagar heading toward RTO/,
  `progressMeters: 10327, // Past Navanagar heading toward RTO`
);

newContent = newContent.replace(
  /progressMeters: 19063, \/\/ Past Lakamanahalli heading toward Gandhinagar/,
  `progressMeters: 17938, // Past Lakamanahalli heading toward Gandhinagar`
);

fs.writeFileSync(routeFilePath, newContent, 'utf8');
console.log('✅ Successfully wrote updated data/chigariRoute.ts with single canonical centerline!');
