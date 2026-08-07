const fs = require('fs');
let content = fs.readFileSync('pages/JobsList.tsx', 'utf8');
content = content.replace(/}\);\);\n}\);\);\n}\);/g, '});');
content = content.replace(/}\);\);\n}\);/g, '});');
fs.writeFileSync('pages/JobsList.tsx', content);
