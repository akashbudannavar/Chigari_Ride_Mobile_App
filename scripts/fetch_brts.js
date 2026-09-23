const https = require('https');

function queryOverpass(query) {
  return new Promise((resolve, reject) => {
    const url = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query);
    https.get(url, { headers: { 'User-Agent': 'ChigariRideApp/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  try {
    // 1. Find all bus stops and BRTS stations in Hubballi-Dharwad
    const qStops = `[out:json][timeout:60];
      (
        node["highway"="bus_stop"](15.33,75.00,15.47,75.16);
        node["public_transport"](15.33,75.00,15.47,75.16);
        way["highway"="bus_stop"](15.33,75.00,15.47,75.16);
      );
      out center tags;`;
    console.log('Fetching all stops in Hubballi-Dharwad...');
    const resStops = await queryOverpass(qStops);
    console.log('Total stops found:', resStops.elements.length);

    const targetNames = [
      'cbt', 'railway station', 'ambedkar', 'hdmc', 'hubli central',
      'hosur cross', 'hosur', 'kims', 'vidyanagar', 'bvb', 'unakal', 'unkal',
      'bairidevarkoppa', 'shantiniketan', 'apmc', 'navanagar', 'rayapur',
      'rto', 'iskcon', 'kmf', 'sanjivini', 'navalur', 'sdm', 'sattur',
      'lakamanahalli', 'yelakki', 'gandhinagar', 'vidyagiri', 'toll naka',
      'hosayellapur', 'nttf', 'court circle', 'jubilee circle', 'dharwad brts', 'dharwad'
    ];

    const matchedStops = resStops.elements.filter(el => {
      const name = (el.tags && (el.tags.name || el.tags['name:en'] || '')) .toLowerCase();
      return targetNames.some(t => name.includes(t));
    });

    console.log('Matched candidate stops:', matchedStops.length);
    for (const s of matchedStops) {
      const lat = s.lat || (s.center && s.center.lat);
      const lon = s.lon || (s.center && s.center.lon);
      console.log(`- ${s.tags.name} [${s.tags.highway || s.tags.public_transport}]: lat=${lat}, lon=${lon}`);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
