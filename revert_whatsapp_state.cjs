const fs = require('fs');
let code = fs.readFileSync('pages/superadmin/WhatsAppTemplates.tsx', 'utf8');

const regex = /\/\/ Ycloud Config State[\s\S]*?React\.useEffect\(\(\) => \{[\s\S]*?\}, \[\]\);/m;
code = code.replace(regex, "");

fs.writeFileSync('pages/superadmin/WhatsAppTemplates.tsx', code);
