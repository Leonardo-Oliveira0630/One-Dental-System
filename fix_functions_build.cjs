const fs = require('fs');

// 1. YCloudProvider.ts
let provider = fs.readFileSync('functions/src/communication/providers/YCloudProvider.ts', 'utf8');
provider = provider.replace('for (const [key, value] of Object.entries(variables))', 'for (const [, value] of Object.entries(variables))');
fs.writeFileSync('functions/src/communication/providers/YCloudProvider.ts', provider);

// 2. CommunicationService.ts
let service = fs.readFileSync('functions/src/communication/services/CommunicationService.ts', 'utf8');
service = service.replace('const data = snapshot.docs[0].data();', 'const data = snapshot.docs[0].data() as any;');
fs.writeFileSync('functions/src/communication/services/CommunicationService.ts', service);

// 3. webhook.ts
let webhook = fs.readFileSync('functions/src/communication/webhook.ts', 'utf8');
webhook = webhook.replace('const communicationService = new CommunicationService();\n', '');
fs.writeFileSync('functions/src/communication/webhook.ts', webhook);

// 4. index.ts
let index = fs.readFileSync('functions/src/index.ts', 'utf8');
// I replaced `customerPhone` in SUPPLIER_UPDATE but the variable is just `phone`
index = index.replace(/after\.supplierId, customerPhone, "SUPPLIER", "SUPPLIER_UPDATE"/g, 'after.supplierId, phone, "SUPPLIER", "SUPPLIER_UPDATE"');
fs.writeFileSync('functions/src/index.ts', index);
