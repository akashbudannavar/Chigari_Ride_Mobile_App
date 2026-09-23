const fs = require('fs');
const path = require('path');

const route = require('./osrm_route.json');
const rawCoords = route.geometry.coordinates.map(c => ({ latitude: Number(c[1].toFixed(6)), longitude: Number(c[0].toFixed(6)) }));

function haversine(c1, c2) {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (c2.latitude - c1.latitude) * rad;
  const dLon = (c2.longitude - c1.longitude) * rad;
  const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(c1.latitude*rad)*Math.cos(c2.latitude*rad)*Math.sin(dLon/2)*Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Compute cumulative distance along the polyline
const cumDist = [0];
let totalDist = 0;
for (let i = 0; i < rawCoords.length - 1; i++) {
  totalDist += haversine(rawCoords[i], rawCoords[i+1]);
  cumDist.push(totalDist);
}

function findClosestAlong(p) {
  let minD = Infinity;
  let bestDist = 0;
  for (let i = 0; i < rawCoords.length - 1; i++) {
    const v = rawCoords[i];
    const w = rawCoords[i+1];
    const segLenSq = ((w.latitude - v.latitude)**2 + (w.longitude - v.longitude)**2);
    const t = segLenSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.latitude - v.latitude)*(w.latitude - v.latitude) + (p.longitude - v.longitude)*(w.longitude - v.longitude)) / segLenSq));
    const proj = { latitude: v.latitude + t*(w.latitude - v.latitude), longitude: v.longitude + t*(w.longitude - v.longitude) };
    const d = haversine(p, proj);
    if (d < minD) {
      minD = d;
      bestDist = cumDist[i] + t * haversine(v, w);
    }
  }
  return { distMeters: Math.round(bestDist), perpDist: minD };
}

// 29 Official Verified BRTS Stations along the corridor strictly matching NWKRTC route map
const stations = [
  { id: 'hdbrts-stop-01', name: 'Hubballi CBT', kannadaName: 'ಹುಬ್ಬಳ್ಳಿ ಸಿಬಿಟಿ', aliases: ['CBT Hubballi', 'Central Bus Terminal', 'CBT Bus Stand', 'Hubli CBT', 'CBT', 'OCBS Hubli', 'Old Central Bus Stand'], latitude: 15.351148, longitude: 75.136260 },
  { id: 'hdbrts-stop-02', name: 'Hosur Circle', kannadaName: 'ಹೊಸೂರು ಸರ್ಕಲ್', aliases: ['Hosur Cross', 'Hosur Circle BRTS', 'Hosur Cross BRTS'], latitude: 15.354759, longitude: 75.130456 },
  { id: 'hdbrts-stop-03', name: 'Hosur Interchange', kannadaName: 'ಹೊಸೂರು ಇಂಟರ್‌ಚೇಂಜ್', aliases: ['Hosur Regional Terminal', 'Hosur Terminal', 'Hosur Regional Interchange'], latitude: 15.357265, longitude: 75.128937 },
  { id: 'hdbrts-stop-04', name: 'KIMS', kannadaName: 'ಕಿಮ್ಸ್', aliases: ['KIMS Hospital', 'KIMS BRTS', 'KIMS Gate'], latitude: 15.360210, longitude: 75.127150 },
  { id: 'hdbrts-stop-05', name: 'Vidyanagar', kannadaName: 'ವಿದ್ಯಾನಗರ', aliases: ['Vidyanagar BRTS', 'Vidyanagar Hubballi'], latitude: 15.364002, longitude: 75.124867 },
  { id: 'hdbrts-stop-06', name: 'BVB College / KLE Tech', kannadaName: 'ಬಿವಿಬಿ ಕಾಲೇಜು / ಕೆಎಲ್ಇ ಟೆಕ್', aliases: ['BVB College', 'KLE Tech', 'BVBCET', 'BVB', 'BVB Campus', 'KLE Technological University'], latitude: 15.367615, longitude: 75.121185 },
  { id: 'hdbrts-stop-07', name: 'Unakal Cross', kannadaName: 'ಉಣಕಲ್ ಕ್ರಾಸ್', aliases: ['Unkal Cross', 'Unakal Cross BRTS'], latitude: 15.370132, longitude: 75.118875 },
  { id: 'hdbrts-stop-08', name: 'Unkal Village', kannadaName: 'ಉಣಕಲ್ ಗ್ರಾಮ', aliases: ['Unakal Village', 'Unkal', 'Unkal Village BRTS'], latitude: 15.375645, longitude: 75.114143 },
  { id: 'hdbrts-stop-09', name: 'Unkal Lake', kannadaName: 'ಉಣಕಲ್ ಕೆರೆ', aliases: ['Unkal Lake BRTS', 'Unakal Lake', 'Unkal Kere'], latitude: 15.382329, longitude: 75.111880 },
  { id: 'hdbrts-stop-10', name: 'Bairidevarkoppa', kannadaName: 'ಬೈರಿದೇವರಕೊಪ್ಪ', aliases: ['Bhairidevarakoppa', 'Bairidevarakoppa BRTS', 'Bhairidevarakoppa BRTS'], latitude: 15.387034, longitude: 75.105381 },
  { id: 'hdbrts-stop-11', name: 'Shantiniketan', kannadaName: 'ಶಾಂತಿನಿಕೇತನ', aliases: ['Shantinikethan', 'Shantinikethan BRTS', 'Shantiniketan BRTS'], latitude: 15.391352, longitude: 75.098158 },
  { id: 'hdbrts-stop-12', name: 'APMC 3rd Gate', kannadaName: 'ಎಪಿಎಂಸಿ ೩ನೇ ಗೇಟ್', aliases: ['APMC Gate 3', 'APMC BRTS', 'APMC', 'APMC 3rd Gate BRTS'], latitude: 15.393670, longitude: 75.092154 },
  { id: 'hdbrts-stop-13', name: 'Navanagar', kannadaName: 'ನವನಗರ', aliases: ['Navanagar BRTS', 'Navanagar Hubballi'], latitude: 15.397150, longitude: 75.082543 },
  { id: 'hdbrts-stop-14', name: 'RTO Office', kannadaName: 'ಆರ್‌ಟಿಒ ಕಚೇರಿ', aliases: ['RTO Office BRTS', 'RTO Navanagar', 'RTO'], latitude: 15.400625, longitude: 75.077294 },
  { id: 'hdbrts-stop-15', name: 'ISKCON Temple', kannadaName: 'ಇಸ್ಕಾನ್ ದೇವಸ್ಥಾನ', aliases: ['ISKCON BRTS', 'Iskcon', 'Rayapur Iskcon', 'ISKCON Temple BRTS'], latitude: 15.404742, longitude: 75.070007 },
  { id: 'hdbrts-stop-16', name: 'Rayapur', kannadaName: 'ರಾಯಾಪುರ', aliases: ['Rayapur BRTS', 'Rayapur Hubballi'], latitude: 15.406712, longitude: 75.065026 },
  { id: 'hdbrts-stop-17', name: 'KMF1', kannadaName: 'ಕೆಎಂಎಫ್-೧', aliases: ['KMF 1', 'KMF BRTS', 'Karnataka Milk Federation', 'KMF 1 BRTS'], latitude: 15.409349, longitude: 75.060749 },
  { id: 'hdbrts-stop-18', name: 'Navalur Railway Station', kannadaName: 'ನವಲೂರು ರೈಲ್ವೆ ನಿಲ್ದಾಣ', aliases: ['Navalur Station BRTS', 'Navalur Railway', 'Navalur Station'], latitude: 15.415155, longitude: 75.053843 },
  { id: 'hdbrts-stop-19', name: 'SDM Medical College', kannadaName: 'ಎಸ್ಡಿಎಂ ವೈದ್ಯಕೀಯ ಕಾಲೇಜು', aliases: ['SDM Hospital', 'SDM Dental College', 'SDM', 'SDM Medical College & Hospital'], latitude: 15.417389, longitude: 75.047967 },
  { id: 'hdbrts-stop-20', name: 'Sattur', kannadaName: 'ಸತ್ತೂರು', aliases: ['Sattur BRTS', 'Sattur Colony'], latitude: 15.418304, longitude: 75.042541 },
  { id: 'hdbrts-stop-21', name: 'Lakamanahalli', kannadaName: 'ಲಕಮನಹಳ್ಳಿ', aliases: ['Lakmanahalli', 'Lakmanahalli BRTS', 'Lakamanahalli Industrial Area'], latitude: 15.432911, longitude: 75.024929 },
  { id: 'hdbrts-stop-22', name: 'Gandhinagar', kannadaName: 'ಗಾಂಧಿನಗರ', aliases: ['Gandhinagar Dharwad', 'Gandhinagar BRTS'], latitude: 15.437785, longitude: 75.019192 },
  { id: 'hdbrts-stop-23', name: 'Vidyagiri', kannadaName: 'ವಿದ್ಯಾಗಿರಿ', aliases: ['Vidyagiri Dharwad', 'JSS College Vidyagiri', 'Vidyagiri BRTS'], latitude: 15.440850, longitude: 75.016861 },
  { id: 'hdbrts-stop-24', name: 'Toll Naka', kannadaName: 'ಟೋಲ್ ನಾಕಾ', aliases: ['Toll Naka Dharwad', 'Old Toll Naka', 'Toll Naka BRTS'], latitude: 15.446085, longitude: 75.012697 },
  { id: 'hdbrts-stop-25', name: 'Hosayellapur Cross', kannadaName: 'ಹೊಸಯಲ್ಲಾಪುರ ಕ್ರಾಸ್', aliases: ['Hosa Yellapur', 'Hosayellapur', 'Hosa Yellapur Cross', 'Hosayellapur Cross BRTS'], latitude: 15.449703, longitude: 75.011221 },
  { id: 'hdbrts-stop-26', name: 'NTTF', kannadaName: 'ಎನ್‌ಟಿಟಿಎಫ್', aliases: ['NTTF Dharwad', 'Nettur Technical Training Foundation', 'NTTF BRTS'], latitude: 15.453608, longitude: 75.009130 },
  { id: 'hdbrts-stop-27', name: 'Court Circle Dharwad', kannadaName: 'ಕೋರ್ಟ್ ಸರ್ಕಲ್ ಧಾರವಾಡ', aliases: ['Court Circle', 'Dharwad Court Circle', 'Court Circle BRTS'], latitude: 15.455642, longitude: 75.007025 },
  { id: 'hdbrts-stop-28', name: 'Jubilee Circle', kannadaName: 'ಜುಬಿಲಿ ಸರ್ಕಲ್', aliases: ['Jubilee Circle Dharwad', 'JC Dharwad', 'Jubilee Circle BRTS'], latitude: 15.458058, longitude: 75.007491 },
  { id: 'hdbrts-stop-29', name: 'Dharwad BRTS Terminal', kannadaName: 'ಧಾರವಾಡ ಬಿಆರ್‌ಟಿಎಸ್ ಟರ್ಮಿನಲ್', aliases: ['Dharwad CBT', 'Dharwad New Bus Stand', 'CBT Dharwad', 'Dharwad BRTS', 'Dharwad Bus Terminal'], latitude: 15.460160, longitude: 75.009429 }
];

console.log('--- 29 OFFICIAL CORRIDOR STATIONS ---');
const computedStops = stations.map((s, idx) => {
  const c = findClosestAlong({ latitude: s.latitude, longitude: s.longitude });
  console.log(`${idx + 1}`.padStart(2) + '. ' + s.name.padEnd(28) + ` | ${c.distMeters}m | offset: ${c.perpDist.toFixed(1)}m`);
  return {
    ...s,
    order: idx + 1,
    distanceAlongRoute: c.distMeters,
  };
});

// Decimate polyline slightly if needed to keep it optimal (~350 points is ~60m resolution across 22.5km)
// Let's see: 817 points is 26.5km, which is 32m per point - perfect for smooth high-definition road following!
console.log('\nTotal route points:', rawCoords.length);
console.log('Total route distance (m):', Math.round(totalDist));

fs.writeFileSync(path.join(__dirname, 'processed_route_data.json'), JSON.stringify({
  stops: computedStops,
  coordinates: rawCoords,
  totalDistanceMeters: Math.round(totalDist),
}, null, 2));

console.log('Saved to scripts/processed_route_data.json');
