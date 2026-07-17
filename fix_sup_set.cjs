const fs = require('fs');
let code = fs.readFileSync('pages/supplier/Settings.tsx', 'utf8');

const regex = /\{\/\* TAB 4: NOTIFICATIONS \*\/\}\s*\{activeTab === 'notifications' && currentOrg && \(\s*<div className="animate-in fade-in duration-300">\s*<WhatsAppTemplatesEditor\s*currentOrg=\{currentOrg\}\s*onUpdate=\{\(\) => \{\}\}\s*\/>\s*<\/div>\s*\)\}/;
code = code.replace(regex, '');

fs.writeFileSync('pages/supplier/Settings.tsx', code);
console.log('Fixed SupplierSettings');
