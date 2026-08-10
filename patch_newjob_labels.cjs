const fs = require('fs');
let content = fs.readFileSync('pages/NewJob.tsx', 'utf8');

content = content.replace("Selecionar Dentista ou Clínica", "Cliente");

fs.writeFileSync('pages/NewJob.tsx', content);
console.log('patched labels');
