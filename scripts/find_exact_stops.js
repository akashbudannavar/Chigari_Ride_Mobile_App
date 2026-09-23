const https = require('https');

const q = `[out:json];
  (
    node(15.340,75.120,15.368,75.150)["highway"="bus_stop"];
    node(15.340,75.120,15.368,75.150)["public_transport"="platform"];
    way(15.340,75.120,15.368,75.150)["amenity"="bus_station"];
    way(15.340,75.120,15.368,75.150)["public_transport"="station"];
  );
  out center tags;`;

const url = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(q);
https.get(url, { headers: { 'User-Agent': 'ChigariRideApp/1.0' } }, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const j = JSON.parse(d);
    console.log('Stops count:', j.elements.length);
    j.elements.forEach(el => {
      const lat = el.lat || (el.center && el.center.lat);
      const lon = el.lon || (el.center && el.center.lon);
      console.log(`- ${el.tags.name || el.tags.local_ref || 'Unnamed'}: lat=${lat}, lon=${lon}`);
    });
  });
});
