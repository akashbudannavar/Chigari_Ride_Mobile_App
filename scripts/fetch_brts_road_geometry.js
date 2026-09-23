const https = require('https');
const fs = require('fs');

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
  // Query all ways tagged as busway or trunk/primary (PB Road) between Hubballi CBT and Dharwad BRTS
  console.log('Fetching road geometry for PB Road / HDBRTS corridor...');
  const q = `[out:json][timeout:60];
    (
      way["highway"="busway"](15.34,75.00,15.47,75.16);
      way["name"~"Pune Bangalore|PB Road|Pune-Bengaluru|Old NH 4",i](15.34,75.00,15.47,75.16);
      way["name"~"Hubli-Dharwad BRTS|HDBRTS",i](15.34,75.00,15.47,75.16);
      way["ref"="NH 48"](15.34,75.00,15.47,75.16);
      way["ref"="NH 4"](15.34,75.00,15.47,75.16);
    );
    out geom;`;
  
  const res = await queryOverpass(q);
  console.log('Result ways:', res.elements ? res.elements.length : 0);
  if (res.elements) {
    fs.writeFileSync('scripts/osm_brts_ways.json', JSON.stringify(res.elements, null, 2));
    console.log('Saved to scripts/osm_brts_ways.json');
  }
}

run();
