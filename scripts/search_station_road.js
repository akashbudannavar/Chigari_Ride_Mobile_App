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
          resolve({ error: data.slice(0, 500) });
        }
      });
    }).on('error', reject);
  });
}

async function searchStationRoad() {
  // Query cinemas, theatres, bus stops, nodes along Station Road / Ganesh Peth
  const q = `[out:json][timeout:30];
    (
      node(15.340,75.140,15.355,75.155);
      way(15.340,75.140,15.355,75.155);
    );
    out center tags;`;
  const res = await queryOverpass(q);
  if (!res.elements) {
    console.log('No elements', res);
    return;
  }
  console.log('Total elements in Station Road / Ganesh Peth / CBT area:', res.elements.length);
  
  res.elements.forEach(el => {
    const name = el.tags && el.tags.name;
    const amenity = el.tags && el.tags.amenity;
    const highway = el.tags && el.tags.highway;
    const lat = el.lat || (el.center && el.center.lat);
    const lon = el.lon || (el.center && el.center.lon);
    if (name || amenity === 'cinema' || amenity === 'theatre' || highway === 'bus_stop') {
      if (/chandra|theatre|cinema|cbt|bus|station|ganesh|talkies/i.test(name || '') || amenity === 'cinema' || amenity === 'theatre' || highway === 'bus_stop') {
        console.log(`- ${name || '(no name)'} [${amenity || highway || el.type}]: lat=${lat}, lon=${lon}, tags=${JSON.stringify(el.tags)}`);
      }
    }
  });
}

searchStationRoad();
