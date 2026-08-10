const fs = require('fs');
let content = fs.readFileSync('pages/JobDetails.tsx', 'utf8');

content = content.replace('placeholder="Buscar dentista ou clínica..."', 'placeholder="Buscar cliente ou clínica..."');

fs.writeFileSync('pages/JobDetails.tsx', content);
console.log('patched labels');
