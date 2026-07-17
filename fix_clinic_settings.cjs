const fs = require('fs');
let code = fs.readFileSync('pages/clinic/ClinicSettings.tsx', 'utf8');

const regex = /\{currentOrg\?\.hasWhatsappModule && \(\s*<div className="mt-6">\s*<WhatsAppTemplatesEditor\s*currentOrg=\{currentOrg\}\s*onUpdate=\{\(\) => \{\}\}\s*\/>\s*<\/div>\s*\)\}/;
code = code.replace(regex, '');

fs.writeFileSync('pages/clinic/ClinicSettings.tsx', code);
console.log('Fixed ClinicSettings');
