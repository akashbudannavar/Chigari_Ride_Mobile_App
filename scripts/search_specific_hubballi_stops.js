const https = require('https');

function searchNominatim(query) {
  return new Promise((resolve) => {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', Hubballi')}&format=json&addressdetails=1&limit=5`;
    https.get(url, { headers: { 'User-Agent': 'ChigariRideApp/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

async function run() {
  const queries = [
    'Chandrakala Talkies',
    'Chandrakala Theatre',
    'KMC Cross',
    'Arts College',
    'JG Commerce College',
    'Mahila Vidya Pith',
    'Glass House Hubli',
    'Hubli Old Bus Stand',
    'HDMC Corporation',
    'Hubballi Railway Station',
    'Central Bus Terminal Hubballi',
    'CBT Hubballi'
  ];

  for (const q of queries) {
    const res = await searchNominatim(q);
    console.log(`\nQuery: "${q}" -> found ${res.length}`);
    res.forEach(r => {
      console.log(`  - ${r.display_name} (lat: ${r.lat}, lon: ${r.lon})`);
    });
  }
}

run();
