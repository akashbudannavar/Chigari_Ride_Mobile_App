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

async function run() {
  // Query all nodes and ways in Hubballi-Dharwad containing "BRT" or "Chigari"
  const q = `[out:json][timeout:30];
    (
      node["name"~"BRT",i](15.33,75.00,15.47,75.16);
      way["name"~"BRT",i](15.33,75.00,15.47,75.16);
      node["name"~"CBT",i](15.33,75.00,15.47,75.16);
      node["name"~"Chigari",i](15.33,75.00,15.47,75.16);
      way["name"~"Chigari",i](15.33,75.00,15.47,75.16);
    );
    out center tags;`;
  
  const res = await queryOverpass(q);
  if (res.elements) {
    console.log(`Found ${res.elements.length} elements:`);
    const sorted = res.elements
      .map(el => {
        const lat = el.lat || (el.center && el.center.lat);
        const lon = el.lon || (el.center && el.center.lon);
        return { name: el.tags.name, type: el.type, id: el.id, lat, lon, tags: el.tags };
      })
      .sort((a, b) => a.lat - b.lat); // sorted South to North (Hubballi to Dharwad)
    
    for (const item of sorted) {
      console.log(`${item.name} (${item.type}/${item.id}): lat=${item.lat}, lon=${item.lon}`);
    }
  } else {
    console.log('Error/Response:', res);
  }
}

run();
