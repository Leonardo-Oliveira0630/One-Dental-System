const fs = require('fs');
let code = fs.readFileSync('pages/supplier/Settings.tsx', 'utf8');

const regexBtn = /<button\s*onClick=\{\(\) => setActiveTab\('notifications'\)\}.*?<\/button>/s;
code = code.replace(regexBtn, '');

const regexState = /useState<'store' \| 'plans' \| 'asaas' \| 'notifications'>/;
code = code.replace(regexState, "useState<'store' | 'plans' | 'asaas'>");

fs.writeFileSync('pages/supplier/Settings.tsx', code);
console.log('Fixed SupplierSettings tabs');
