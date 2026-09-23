const https = require('https');

function searchNominatim(query) {
  return new Promise((resolve, reject) => {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`;
    https.get(url, { headers: { 'User-Agent': 'ChigariRideApp-TransitResearch/1.0 (contact@chigariride.demo)' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ error: data });
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  const queries = [
    'Hubballi Central Bus Terminal',
    'Hubli CBT bus station',
    'Old Bus Stand Hubli',
    'Kittur Chennamma Circle Hubballi',
    'Hubballi Railway Station',
    'HDMC Hubli',
    'Hosur Cross Hubli',
    'KIMS Hubli',
    'BVB College Hubli',
    'Vidyanagar Hubli',
    'Unkal Lake Hubli',
    'Bhairidevarkoppa Hubli',
    'Navanagar Hubli',
    'Rayapur Hubli',
    'SDM College of Medical Sciences Dharwad',
    'Sattur Dharwad',
    'Lakamanahalli Dharwad',
    'Vidyagiri Dharwad',
    'Toll Naka Dharwad',
    'Jubilee Circle Dharwad',
    'Dharwad BRTS Terminal',
    'Dharwad New Bus Stand'
  ];

  for (const q of queries) {
    const res = await searchNominatim(q);
    console.log(`\n=== Query: "${q}" ===`);
    if (Array.isArray(res) && res.length > 0) {
      for (const item of res.slice(0, 2)) {
        console.log(`  -> ${item.display_name}`);
        console.log(`     Lat: ${item.lat}, Lon: ${item.lon}`);
      }
    } else {
      console.log('  -> No result or:', res);
    }
    await new Promise(r => setTimeout(r, 1100)); // Nominatim rate limit: 1 request per second
  }
}

run();
