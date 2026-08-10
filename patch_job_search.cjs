const fs = require('fs');
let content = fs.readFileSync('pages/JobsList.tsx', 'utf8');

content = content.replace(
    /normalizeText\(job\.osNumber \|\| ''\)\.includes\(searchLower\) \|\|/g,
    \`normalizeText(job.osNumber || '').includes(searchLower) ||
          normalizeText(job.boxNumber || '').includes(searchLower) ||\`
);

content = content.replace(
    'placeholder="Buscar OS, Paciente, Dentista..."',
    'placeholder="Buscar OS, Caixa, Paciente, Dentista..."'
);

fs.writeFileSync('pages/JobsList.tsx', content);
console.log('patched search');
