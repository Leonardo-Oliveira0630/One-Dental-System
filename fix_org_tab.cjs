const fs = require('fs');
let code = fs.readFileSync('pages/admin/OrganizationTab.tsx', 'utf8');

const regex = /<div className="mt-6">\s*<WhatsAppTemplatesEditor\s*currentOrg=\{currentOrg\}\s*onUpdate=\{\(\) => \{\}\}\s*\/>\s*<\/div>/;
code = code.replace(regex, '');

fs.writeFileSync('pages/admin/OrganizationTab.tsx', code);
console.log('Fixed OrganizationTab');
