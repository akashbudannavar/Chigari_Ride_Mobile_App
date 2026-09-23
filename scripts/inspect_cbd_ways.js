const https = require('https');

const q = `[out:json];
  (
    way(15.345,75.134,15.355,75.150)["highway"];
  );
  out geom;`;

const url = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(q);
https.get(url, { headers: { 'User-Agent': 'ChigariRideApp/1.0' } }, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const j = JSON.parse(d);
    console.log('Total ways in corridor:', j.elements.length);
    const named = j.elements.filter(w => w.tags && w.tags.name);
    console.log('Named ways count:', named.length);
    named.forEach(w => {
      console.log(`${w.id}: ${w.tags.name} [${w.tags.highway}], oneway=${w.tags.oneway}, pts=${w.geometry.length}, first=${w.geometry[0].lat.toFixed(5)},${w.geometry[0].lon.toFixed(5)} last=${w.geometry[w.geometry.length-1].lat.toFixed(5)},${w.geometry[w.geometry.length-1].lon.toFixed(5)}`);
    });
  });
});
