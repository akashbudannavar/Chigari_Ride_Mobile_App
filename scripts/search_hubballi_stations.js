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

async function searchHubliStations() {
  const q = `[out:json][timeout:30];
    (
      node(15.33,75.12,15.38,75.16)[name];
      way(15.33,75.12,15.38,75.16)[name];
    );
    out center tags;`;
  const res = await queryOverpass(q);
  if (!res.elements) {
    console.log('No elements', res);
    return;
  }
  console.log('Total elements in Hubballi CBD:', res.elements.length);
  const keywords = ['Hosur', 'Mahila', 'Vidya', 'JG', 'Commerce', 'KMC', 'Arts', 'Glass', 'OBS', 'Corporation', 'HDMC', 'Railway', 'Chandrakala', 'CBT', 'Central Bus', 'Ambedkar', 'Station'];
  
  const matches = [];
  res.elements.forEach(el => {
    const name = el.tags.name || '';
    const lat = el.lat || (el.center && el.center.lat);
    const lon = el.lon || (el.center && el.center.lon);
    for (const kw of keywords) {
      if (name.toLowerCase().includes(kw.toLowerCase())) {
        matches.push({ name, kw, type: el.type, id: el.id, lat, lon, tags: el.tags });
        break;
      }
    }
  });

  console.log('Matched stations/places:');
  matches.forEach(m => {
    console.log(`- ${m.name} (${m.tags.highway || m.tags.amenity || m.tags.public_transport || m.tags.leisure || m.type}): lat=${m.lat}, lon=${m.lon}`);
  });
}

searchHubliStations();
