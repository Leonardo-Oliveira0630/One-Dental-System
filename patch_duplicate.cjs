const fs = require('fs');
let content = fs.readFileSync('pages/admin/DentistsTab.tsx', 'utf8');
content = content.replace(
    `state: '', subDentists: [] as any[], country: 'Brasil', clinicName: '', clientType: 'PESSOA_FISICA' as any, deliveryViaPost: false,`,
    `state: '', country: 'Brasil', clinicName: '', clientType: 'PESSOA_FISICA' as any, deliveryViaPost: false,`
);
content = content.replace(
    `state: '', subDentists: [] as any[], country: 'Brasil', clinicName: '', clientType: 'CLINICA' as any, deliveryViaPost: false,`,
    `state: '', country: 'Brasil', clinicName: '', clientType: 'CLINICA' as any, deliveryViaPost: false,`
);
fs.writeFileSync('pages/admin/DentistsTab.tsx', content);
console.log('patched DentistsTab duplicate key');
