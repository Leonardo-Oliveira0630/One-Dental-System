const fs = require('fs');
let content = fs.readFileSync('pages/admin/CommissionsTab.tsx', 'utf-8');

const targetStr = `import { Edit, DollarSign, X, Loader2, Save } from 'lucide-react';`;
const replaceStr = `import { Edit, DollarSign, X, Loader2, Save, Settings } from 'lucide-react';`;

content = content.replace(targetStr, replaceStr);
fs.writeFileSync('pages/admin/CommissionsTab.tsx', content);
console.log('Patched CommissionsTab.tsx');
