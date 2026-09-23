const https = require('https');
const fs = require('fs');
const path = require('path');

function haversine(c1, c2) {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (c2.latitude - c1.latitude) * rad;
  const dLon = (c2.longitude - c1.longitude) * rad;
  const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(c1.latitude*rad)*Math.cos(c2.latitude*rad)*Math.sin(dLon/2)*Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function getOSRMRoute(waypoints) {
  return new Promise((resolve, reject) => {
    const coordsStr = waypoints.map(w => `${w.longitude.toFixed(6)},${w.latitude.toFixed(6)}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson&steps=true`;
    https.get(url, { headers: { 'User-Agent': 'ChigariRideApp/1.0' } }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          if (j.routes && j.routes[0]) {
            resolve(j.routes[0]);
          } else {
            resolve(null);
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// 1. Hubballi CBD stations in physical sequence from Hubballi CBT to BVB College
const hubballiCBDStops = [
  {
    id: 'hdbrts-stop-01',
    name: 'CBT / Hubballi Central Bus Terminal',
    kannadaName: 'ಕೇಂದ್ರೀಯ ಬಸ್ ನಿಲ್ದಾಣ (ಸಿಬಿಟಿ)',
    aliases: ['Hubballi CBT', 'CBT Hubballi', 'Central Bus Terminal', 'CBT', 'City Bus Terminus'],
    latitude: 15.344637,
    longitude: 75.145415,
  },
  {
    id: 'hdbrts-stop-02',
    name: 'Chandrakala Talkies',
    kannadaName: 'ಚಂದ್ರಕಲಾ ಚಿತ್ರಮಂದಿರ',
    aliases: ['Chandrakala Theatre', 'Chandrakala Talkies Stop', 'Ganesh Peth'],
    latitude: 15.347200,
    longitude: 75.145650,
  },
  {
    id: 'hdbrts-stop-03',
    name: 'Railway Station-H',
    kannadaName: 'ಹುಬ್ಬಳ್ಳಿ ರೈಲ್ವೆ ನಿಲ್ದಾಣ',
    aliases: ['Hubballi Railway Station', 'Railway Station Hubli', 'Hubballi Railway BRT Station'],
    latitude: 15.349537,
    longitude: 75.148450,
  },
  {
    id: 'hdbrts-stop-04',
    name: 'Corporation-H',
    kannadaName: 'ಮಹಾನಗರ ಪಾಲಿಕೆ (ಎಚ್‌ಡಿಎಂಸಿ)',
    aliases: ['HDMC', 'Corporation', 'HDMC BRT Station', 'Hubli Dharwad Municipal Corporation'],
    latitude: 15.350859,
    longitude: 75.140701,
  },
  {
    id: 'hdbrts-stop-05',
    name: 'Hubli OBS (Inside)',
    kannadaName: 'ಹಳೆಯ ಬಸ್ ನಿಲ್ದಾಣ (ಒಬಿಎಸ್)',
    aliases: ['Hubli OBS', 'Old Bus Station', 'OCBS Hubli', 'Hubli OCBS BRT Station'],
    latitude: 15.351148,
    longitude: 75.136260,
  },
  {
    id: 'hdbrts-stop-06',
    name: 'Glass House',
    kannadaName: 'ಗ್ಲಾಸ್ ಹೌಸ್',
    aliases: ['Glass House Hubli', 'Indira Gandhi Glass House'],
    latitude: 15.351180,
    longitude: 75.132800,
  },
  {
    id: 'hdbrts-stop-07',
    name: 'Hosur Cross',
    kannadaName: 'ಹೊಸೂರು ಕ್ರಾಸ್',
    aliases: ['Hosur Circle', 'Hosur Circle BRTS', 'Hosur Cross BRTS'],
    latitude: 15.354759,
    longitude: 75.130456,
  },
  {
    id: 'hdbrts-stop-08',
    name: 'Mahila Vidya Pith (Hosur Terminal)',
    kannadaName: 'ಮಹಿಳಾ ವಿದ್ಯಾಪೀಠ (ಹೊಸೂರು ಟರ್ಮಿನಲ್)',
    aliases: ['Mahila Vidya Pith', 'Hosur Interchange', 'Hosur Regional Terminal', 'Hosur Terminal'],
    latitude: 15.357265,
    longitude: 75.128937,
  },
  {
    id: 'hdbrts-stop-09',
    name: 'JG Commerce College',
    kannadaName: 'ಜೆ.ಜಿ. ವಾಣಿಜ್ಯ ಕಾಲೇಜು',
    aliases: ['JG College of Commerce', 'JG Commerce', 'Jagadguru Gangadhar College'],
    latitude: 15.358800,
    longitude: 75.127900,
  },
  {
    id: 'hdbrts-stop-10',
    name: 'KMC Cross',
    kannadaName: 'ಕೆಎಂಸಿ ಕ್ರಾಸ್ / ಕಿಮ್ಸ್',
    aliases: ['KMC Cross', 'KIMS', 'KIMS Hospital', 'KMC'],
    latitude: 15.360210,
    longitude: 75.127150,
  },
  {
    id: 'hdbrts-stop-11',
    name: 'Arts College',
    kannadaName: 'ಆರ್ಟ್ಸ್ ಕಾಲೇಜು (ವಿದ್ಯಾನಗರ)',
    aliases: ['Arts College', 'Kadasiddeshwar Arts College', 'Vidyanagar Arts College', 'Vidyanagar'],
    latitude: 15.364400,
    longitude: 75.124600,
  },
];

// 2. Existing good northern stations (from BVB College to Dharwad BRTS Terminal)
const existingDharwadStops = [
  { id: 'hdbrts-stop-12', name: 'BVB College / KLE Tech', kannadaName: 'ಬಿವಿಬಿ ಕಾಲೇಜು / ಕೆಎಲ್ಇ ಟೆಕ್', aliases: ['BVB College', 'KLE Tech', 'BVBCET', 'BVB'], latitude: 15.367615, longitude: 75.121185 },
  { id: 'hdbrts-stop-13', name: 'Unakal Cross', kannadaName: 'ಉಣಕಲ್ ಕ್ರಾಸ್', aliases: ['Unkal Cross', 'Unakal Cross BRTS'], latitude: 15.370132, longitude: 75.118875 },
  { id: 'hdbrts-stop-14', name: 'Unkal Village', kannadaName: 'ಉಣಕಲ್ ಗ್ರಾಮ', aliases: ['Unakal Village', 'Unkal', 'Unkal Village BRTS'], latitude: 15.375645, longitude: 75.114143 },
  { id: 'hdbrts-stop-15', name: 'Unkal Lake', kannadaName: 'ಉಣಕಲ್ ಕೆರೆ', aliases: ['Unkal Lake BRTS', 'Unakal Lake', 'Unkal Kere'], latitude: 15.382329, longitude: 75.111880 },
  { id: 'hdbrts-stop-16', name: 'Bairidevarkoppa', kannadaName: 'ಬೈರಿದೇವರಕೊಪ್ಪ', aliases: ['Bhairidevarakoppa', 'Bairidevarakoppa BRTS'], latitude: 15.387034, longitude: 75.105381 },
  { id: 'hdbrts-stop-17', name: 'Shantiniketan', kannadaName: 'ಶಾಂತಿನಿಕೇತನ', aliases: ['Shantinikethan', 'Shantinikethan BRTS', 'Shantiniketan BRTS'], latitude: 15.391352, longitude: 75.098158 },
  { id: 'hdbrts-stop-18', name: 'APMC 3rd Gate', kannadaName: 'ಎಪಿಎಂಸಿ ೩ನೇ ಗೇಟ್', aliases: ['APMC Gate 3', 'APMC BRTS', 'APMC'], latitude: 15.393670, longitude: 75.092154 },
  { id: 'hdbrts-stop-19', name: 'Navanagar', kannadaName: 'ನವನಗರ', aliases: ['Navanagar BRTS', 'Navanagar Hubballi'], latitude: 15.397150, longitude: 75.082543 },
  { id: 'hdbrts-stop-20', name: 'RTO Office', kannadaName: 'ಆರ್‌ಟಿಒ ಕಚೇರಿ', aliases: ['RTO Office BRTS', 'RTO Navanagar'], latitude: 15.400625, longitude: 75.077294 },
  { id: 'hdbrts-stop-21', name: 'ISKCON Temple', kannadaName: 'ಇಸ್ಕಾನ್ ದೇವಸ್ಥಾನ', aliases: ['ISKCON BRTS', 'Iskcon', 'Rayapur Iskcon'], latitude: 15.404742, longitude: 75.070007 },
  { id: 'hdbrts-stop-22', name: 'Rayapur', kannadaName: 'ರಾಯಾಪುರ', aliases: ['Rayapur BRTS', 'Rayapur Hubballi'], latitude: 15.406712, longitude: 75.065026 },
  { id: 'hdbrts-stop-23', name: 'KMF1', kannadaName: 'ಕೆಎಂಎಫ್-೧', aliases: ['KMF 1', 'KMF BRTS', 'Karnataka Milk Federation'], latitude: 15.409349, longitude: 75.060749 },
  { id: 'hdbrts-stop-24', name: 'Navalur Railway Station', kannadaName: 'ನವಲೂರು ರೈಲ್ವೆ ನಿಲ್ದಾಣ', aliases: ['Navalur Station BRTS', 'Navalur Railway'], latitude: 15.415155, longitude: 75.053843 },
  { id: 'hdbrts-stop-25', name: 'SDM Medical College', kannadaName: 'ಎಸ್ಡಿಎಂ ವೈದ್ಯಕೀಯ ಕಾಲೇಜು', aliases: ['SDM Hospital', 'SDM Dental College', 'SDM'], latitude: 15.417389, longitude: 75.047967 },
  { id: 'hdbrts-stop-26', name: 'Sattur', kannadaName: 'ಸತ್ತೂರು', aliases: ['Sattur BRTS', 'Sattur Colony'], latitude: 15.418304, longitude: 75.042541 },
  { id: 'hdbrts-stop-27', name: 'Lakamanahalli', kannadaName: 'ಲಕಮನಹಳ್ಳಿ', aliases: ['Lakmanahalli', 'Lakmanahalli BRTS'], latitude: 15.432911, longitude: 75.024929 },
  { id: 'hdbrts-stop-28', name: 'Gandhinagar', kannadaName: 'ಗಾಂಧಿನಗರ', aliases: ['Gandhinagar Dharwad', 'Gandhinagar BRTS'], latitude: 15.437785, longitude: 75.019192 },
  { id: 'hdbrts-stop-29', name: 'Vidyagiri', kannadaName: 'ವಿದ್ಯಾಗಿರಿ', aliases: ['Vidyagiri Dharwad', 'JSS College Vidyagiri'], latitude: 15.440850, longitude: 75.016861 },
  { id: 'hdbrts-stop-30', name: 'Toll Naka', kannadaName: 'ಟೋಲ್ ನಾಕಾ', aliases: ['Toll Naka Dharwad', 'Old Toll Naka'], latitude: 15.446085, longitude: 75.012697 },
  { id: 'hdbrts-stop-31', name: 'Hosayellapur Cross', kannadaName: 'ಹೊಸಯಲ್ಲಾಪುರ ಕ್ರಾಸ್', aliases: ['Hosa Yellapur', 'Hosayellapur Cross BRTS'], latitude: 15.449703, longitude: 75.011221 },
  { id: 'hdbrts-stop-32', name: 'NTTF', kannadaName: 'ಎನ್‌ಟಿಟಿಎಫ್', aliases: ['NTTF Dharwad', 'NTTF BRTS'], latitude: 15.453608, longitude: 75.009130 },
  { id: 'hdbrts-stop-33', name: 'Court Circle Dharwad', kannadaName: 'ಕೋರ್ಟ್ ಸರ್ಕಲ್ ಧಾರವಾಡ', aliases: ['Court Circle', 'Dharwad Court Circle'], latitude: 15.455642, longitude: 75.007025 },
  { id: 'hdbrts-stop-34', name: 'Jubilee Circle', kannadaName: 'ಜುಬಿಲಿ ಸರ್ಕಲ್', aliases: ['Jubilee Circle Dharwad', 'JC Dharwad'], latitude: 15.458058, longitude: 75.007491 },
  { id: 'hdbrts-stop-35', name: 'Dharwad BRTS Terminal', kannadaName: 'ಧಾರವಾಡ ಬಿಆರ್‌ಟಿಎಸ್ ಟರ್ಮಿನಲ್', aliases: ['Dharwad CBT', 'Dharwad New Bus Stand', 'CBT Dharwad'], latitude: 15.460160, longitude: 75.009429 }
];

async function run() {
  console.log('Generating road geometry for Hubballi CBD segment-by-segment...');
  
  // Waypoint list for CBT -> Hosur Cross section:
  // CBT -> Chandrakala Talkies -> Railway Station -> (via Station Rd) -> Corporation HDMC -> Hubli OBS -> Glass House -> Hosur Cross
  const cbdWaypoints = [
    { latitude: 15.344637, longitude: 75.145415 }, // CBT
    { latitude: 15.347200, longitude: 75.145650 }, // Chandrakala Talkies
    { latitude: 15.349537, longitude: 75.148450 }, // Railway Station
    { latitude: 15.352889, longitude: 75.145389 }, // Dr Ambedkar Circle
    { latitude: 15.350859, longitude: 75.140701 }, // Corporation HDMC
    { latitude: 15.351148, longitude: 75.136260 }, // Hubli OBS
    { latitude: 15.351180, longitude: 75.132800 }, // Glass House
    { latitude: 15.354759, longitude: 75.130456 }, // Hosur Cross
  ];

  const cbdCoords = [];
  for (let i = 0; i < cbdWaypoints.length - 1; i++) {
    const p1 = cbdWaypoints[i];
    const p2 = cbdWaypoints[i + 1];
    const r = await getOSRMRoute([p1, p2]);
    if (!r) {
      console.error(`Failed to route between waypoint ${i} and ${i+1}`);
      return;
    }
    const legPts = r.geometry.coordinates.map(c => ({ latitude: Number(c[1].toFixed(6)), longitude: Number(c[0].toFixed(6)) }));
    console.log(`Leg ${i+1}: ${Math.round(r.distance)}m, ${legPts.length} points`);
    if (cbdCoords.length > 0) {
      cbdCoords.push(...legPts.slice(1));
    } else {
      cbdCoords.push(...legPts);
    }
  }

  // Waypoint list for Hosur Cross -> BVB College along PB Road
  const hosurToBvbWaypoints = [
    { latitude: 15.354759, longitude: 75.130456 }, // Hosur Cross
    { latitude: 15.357265, longitude: 75.128937 }, // Mahila Vidya Pith
    { latitude: 15.358800, longitude: 75.127900 }, // JG Commerce College
    { latitude: 15.360210, longitude: 75.127150 }, // KMC Cross
    { latitude: 15.364400, longitude: 75.124600 }, // Arts College
    { latitude: 15.367615, longitude: 75.121185 }, // BVB College
  ];

  // Route straight along PB Road from Hosur Cross to BVB College
  const rPb = await getOSRMRoute(hosurToBvbWaypoints);
  const pbRoadCoords = rPb.geometry.coordinates.map(c => ({ latitude: Number(c[1].toFixed(6)), longitude: Number(c[0].toFixed(6)) }));
  console.log(`PB Road Hosur -> BVB: ${Math.round(rPb.distance)}m, ${pbRoadCoords.length} points`);

  // Load existing good Dharwad-side coordinates from BVB College to Dharwad BRTS Terminal
  const prevData = require('./processed_route_data.json');
  let bvbIdx = 0;
  let minD = Infinity;
  for (let i = 0; i < prevData.coordinates.length; i++) {
    const d = haversine(prevData.coordinates[i], { latitude: 15.367615, longitude: 75.121185 });
    if (d < minD) {
      minD = d;
      bvbIdx = i;
    }
  }
  console.log(`BVB College found in existing good Dharwad route at index ${bvbIdx} (offset ${minD.toFixed(1)}m)`);
  const dharwadCoords = prevData.coordinates.slice(bvbIdx);
  console.log(`Existing untouched Dharwad-side points from BVB to Dharwad: ${dharwadCoords.length}`);

  // Combine: cbdCoords + pbRoadCoords (slice 1) + dharwadCoords (slice 1)
  const fullPolyline = [
    ...cbdCoords,
    ...pbRoadCoords.slice(1),
    ...dharwadCoords.slice(1)
  ];

  console.log(`\nFull Corridor Combined Road Coordinates: ${fullPolyline.length}`);

  // Combine all stops
  const allStopsRaw = [...hubballiCBDStops, ...existingDharwadStops];

  // Compute cumulative distances
  const cumDist = [0];
  let totalDist = 0;
  for (let i = 0; i < fullPolyline.length - 1; i++) {
    totalDist += haversine(fullPolyline[i], fullPolyline[i+1]);
    cumDist.push(totalDist);
  }

  function findClosestAlong(p) {
    let minD = Infinity;
    let bestDist = 0;
    for (let i = 0; i < fullPolyline.length - 1; i++) {
      const v = fullPolyline[i];
      const w = fullPolyline[i+1];
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

  console.log('\n--- ALL 35 VERIFIED STATIONS VALIDATION ---');
  console.log('Order | Station Name'.padEnd(42) + '| Along Route | Offset to Road');
  console.log('-'.repeat(70));

  let monotonic = true;
  let prevDist = -1;

  const allStops = allStopsRaw.map((s, idx) => {
    const c = findClosestAlong(s);
    console.log(
      `${idx+1}`.padStart(2) + ' | ' +
      s.name.padEnd(36) + ' | ' +
      `${c.distMeters}m`.padStart(9) + ' | ' +
      `${c.perpDist.toFixed(1)}m`
    );
    if (c.distMeters <= prevDist) {
      console.error(`  --> NON-MONOTONIC ERROR: ${s.name} (${c.distMeters}m) <= prev (${prevDist}m)`);
      monotonic = false;
    }
    prevDist = c.distMeters;
    return {
      ...s,
      order: idx + 1,
      distanceAlongRoute: c.distMeters,
      perpendicularDistance: c.perpDist
    };
  });

  if (monotonic) {
    console.log('\nSUCCESS: All 35 stations progress strictly monotonically along the road!');
  }

  fs.writeFileSync('scripts/corridor_full_data.json', JSON.stringify({
    stops: allStops,
    coordinates: fullPolyline,
    totalDistanceMeters: Math.round(totalDist)
  }, null, 2));

  console.log('Saved to scripts/corridor_full_data.json');
}

run();
