const fs = require('fs');

const contract = fs.readFileSync('services/sharedTicketContract.ts', 'utf8');
const match = contract.match(/AUTHORITATIVE_STATIONS:\s*AuthoritativeStation\[\]\s*=\s*(\[[\s\S]*?\n\];)/);
const stations = eval(match[1].replace(/;\s*$/, ''));

function resolveAuthoritativeStation(inputName) {
  if (!inputName) return stations[0];
  const raw = inputName.trim();
  
  // 1. Direct code match
  const byCode = stations.find(s => s.code.toLowerCase() === raw.toLowerCase());
  if (byCode) return byCode;

  // 2. Exact name match
  const byExact = stations.find(s => s.name.toLowerCase() === raw.toLowerCase());
  if (byExact) return byExact;

  const clean = raw.toLowerCase().replace(/[^a-z0-9]/g, '');

  // 3. Normalized alphanumeric match
  const byNorm = stations.find(s => s.name.toLowerCase().replace(/[^a-z0-9]/g, '') === clean);
  if (byNorm) return byNorm;

  // 4. Specific alias mappings
  if (clean.includes('bvb') || clean.includes('kletech') || clean.includes('bvbcet')) {
    return stations.find(s => s.initials === 'BVB');
  }
  if (clean.includes('dharwadnew') || clean.includes('dnbs')) {
    return stations.find(s => s.initials === 'DNBS');
  }
  if (clean.includes('dharwadbrts') || clean.includes('cbtdharwad') || clean.includes('dharwadcbt')) {
    return stations.find(s => s.initials === 'DBT');
  }
  if (clean.includes('courtcircle')) {
    return stations.find(s => s.initials === 'CC');
  }
  if (clean.includes('jubilee')) {
    return stations.find(s => s.initials === 'JC');
  }
  if (clean.includes('nttf')) {
    return stations.find(s => s.initials === 'NTTF');
  }
  if (clean.includes('yellapur') || clean.includes('hyc')) {
    return stations.find(s => s.initials === 'HYC');
  }
  if (clean.includes('tollnaka') || clean.includes('tn')) {
    return stations.find(s => s.initials === 'TN');
  }
  if (clean.includes('vidyagiri')) {
    return stations.find(s => s.initials === 'V' && s.name === 'Vidyagiri');
  }
  if (clean.includes('gandhinagar')) {
    return stations.find(s => s.initials === 'G');
  }
  if (clean.includes('lakmanahalli') || clean.includes('lakamanahalli')) {
    return stations.find(s => s.initials === 'L');
  }
  if (clean.includes('sdm')) {
    return stations.find(s => s.initials === 'SMC');
  }
  if (clean.includes('sattur')) {
    return stations.find(s => s.initials === 'S' && s.name === 'Sattur');
  }
  if (clean.includes('navalur') || clean.includes('navluru')) {
    return stations.find(s => s.initials === 'NRS');
  }
  if (clean.includes('sanjeevini')) {
    return stations.find(s => s.initials === 'SP');
  }
  if (clean.includes('kmf')) {
    return stations.find(s => s.initials === 'KMF');
  }
  if (clean.includes('rayapur')) {
    return stations.find(s => s.initials === 'R');
  }
  if (clean.includes('iskcon')) {
    return stations.find(s => s.initials === 'IT');
  }
  if (clean.includes('rto')) {
    return stations.find(s => s.initials === 'RTO');
  }
  if (clean.includes('navanagar')) {
    return stations.find(s => s.initials === 'N');
  }
  if (clean.includes('apmc')) {
    return stations.find(s => s.initials === 'AG');
  }
  if (clean.includes('shantiniket')) {
    return stations.find(s => s.name === 'Shantinikethan');
  }
  if (clean.includes('biridevar') || clean.includes('bairidevar')) {
    return stations.find(s => s.name === 'Biridevarakoppa');
  }
  if (clean.includes('unkallake') || clean.includes('unakallake')) {
    return stations.find(s => s.name === 'Unakal Lake');
  }
  if (clean.includes('unkalcross') || clean.includes('unakalcross')) {
    return stations.find(s => s.name === 'Unakal Cross');
  }
  if (clean.includes('unkal') || clean.includes('unakal')) {
    return stations.find(s => s.name === 'Unakal Village');
  }
  if (clean.includes('vidyanagar')) {
    return stations.find(s => s.initials === 'V' && s.name === 'Vidyanagar');
  }
  if (clean.includes('kims')) {
    return stations.find(s => s.initials === 'KIMS');
  }
  if (clean.includes('hosurregional') || clean.includes('hrt')) {
    return stations.find(s => s.initials === 'HRT');
  }
  if (clean.includes('hosurcross') || clean.includes('hc')) {
    return stations.find(s => s.initials === 'HC');
  }
  if (clean.includes('gokul') || clean.includes('hnbs')) {
    return stations.find(s => s.initials === 'HNBS');
  }
  if (clean.includes('hdmc')) {
    return stations.find(s => s.initials === 'HDMC');
  }
  if (clean.includes('ambedkar') || clean.includes('dbrac')) {
    return stations.find(s => s.initials === 'DBRAC');
  }
  if (clean.includes('hubballirailway') || clean.includes('hrs')) {
    return stations.find(s => s.initials === 'HRS');
  }
  if (clean.includes('cbt') || clean.includes('hubballicentral') || clean.includes('hcbt')) {
    return stations.find(s => s.initials === 'HCBT');
  }

  return stations[0];
}

const chigariRoute = fs.readFileSync('data/chigariRoute.ts', 'utf8');
const nameRegex = /"name":\s*"([^"]+)"/g;
let m;
const stops = [];
while ((m = nameRegex.exec(chigariRoute)) !== null) {
  if (!stops.includes(m[1])) stops.push(m[1]);
}

let errors = 0;
stops.forEach((s, idx) => {
  const r = resolveAuthoritativeStation(s);
  if (r.name === 'Dharwad New Bus Stand' && s !== 'Dharwad New Bus Stand') {
    console.log('UNRESOLVED:', s, 'fell back to', r.name);
    errors++;
  } else {
    console.log(`${idx+1}. '${s}' -> '${r.name}' (${r.code})`);
  }
});

console.log('Total Stops:', stops.length, 'Errors:', errors);
