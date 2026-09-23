const https = require('https');
const fs = require('fs');

function getRoute(origin, dest) {
  return new Promise((resolve, reject) => {
    const coords = `${origin.lon},${origin.lat};${dest.lon},${dest.lat}`;
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true`;
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

// Hubballi CBD stations in order from CBT to Hosur Cross and beyond:
const cbtToHosurStations = [
  { name: 'Hubballi CBT', lat: 15.344637, lon: 75.145415 },
  { name: 'Chandrakala Talkies', lat: 15.347200, lon: 75.145700 },
  { name: 'Railway Station-H', lat: 15.349537, lon: 75.148450 },
  { name: 'Corporation-H', lat: 15.350859, lon: 75.140701 },
  { name: 'Hubli OBS (Inside)', lat: 15.350369, lon: 75.136165 },
  { name: 'Glass House', lat: 15.351084, lon: 75.132951 },
  { name: 'Hosur Cross', lat: 15.354759, lon: 75.130456 },
  { name: 'Mahila Vidya Pith (Hosur Terminal)', lat: 15.357265, lon: 75.128937 },
  { name: 'JG Commerce College', lat: 15.359016, lon: 75.125790 },
  { name: 'KMC Cross', lat: 15.360210, lon: 75.127150 },
  { name: 'Arts College', lat: 15.365359, lon: 75.124021 },
  { name: 'BVB College / KLE Tech', lat: 15.367615, lon: 75.121185 },
];

async function run() {
  console.log('Testing segment-by-segment routing for CBT <-> Hosur <-> BVB:');
  for (let i = 0; i < cbtToHosurStations.length - 1; i++) {
    const s1 = cbtToHosurStations[i];
    const s2 = cbtToHosurStations[i + 1];
    const r = await getRoute(s1, s2);
    if (r) {
      console.log(`[${i+1}] ${s1.name} -> ${s2.name}: ${Math.round(r.distance)}m, ${r.geometry.coordinates.length} pts`);
      // Print street names used in this segment
      const streets = [...new Set(r.legs[0].steps.map(st => st.name).filter(Boolean))];
      console.log(`    Roads: ${streets.join(' -> ')}`);
    } else {
      console.log(`[${i+1}] FAILED for ${s1.name} -> ${s2.name}`);
    }
  }
}

run();
