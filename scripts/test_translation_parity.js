const fs = require('fs');

function parseTsKeys(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const matches = content.match(/"([a-zA-Z0-9_-]+)"\s*:/g) || [];
  return new Set(matches.map((m) => m.replace(/"/g, '').replace(':', '').trim()));
}

const enKeys = parseTsKeys('translations/en.ts');
const knKeys = parseTsKeys('translations/kn.ts');
const hiKeys = parseTsKeys('translations/hi.ts');

console.log(`EN: ${enKeys.size}, KN: ${knKeys.size}, HI: ${hiKeys.size}`);

const diff1 = [...enKeys].filter((k) => !knKeys.has(k));
const diff2 = [...enKeys].filter((k) => !hiKeys.has(k));

if (diff1.length > 0 || diff2.length > 0 || enKeys.size !== knKeys.size) {
  console.error('Missing in KN:', diff1);
  console.error('Missing in HI:', diff2);
  process.exit(1);
} else {
  console.log('✅ Perfect translation key parity across EN, KN, and HI!');
  process.exit(0);
}
