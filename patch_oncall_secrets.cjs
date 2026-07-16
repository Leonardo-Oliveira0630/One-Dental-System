const fs = require('fs');
let code = fs.readFileSync('functions/src/index.ts', 'utf8');

code = code.replace(/export const sendYcloudWhatsApp = onCall\(\{ maxInstances: 10 \}, async \(request\) => \{/, 
  'export const sendYcloudWhatsApp = onCall({ maxInstances: 10, secrets: [ycloudApiKeySecret, ycloudPhoneNumberSecret] }, async (request) => {');

code = code.replace(/export const optimizeAndUploadImage = onCall\(\{ maxInstances: 10 \}, async \(request\) => \{/, 
  'export const optimizeAndUploadImage = onCall({ maxInstances: 10, secrets: [asaasApiKeySecret, asaasWebhookTokenSecret, ycloudApiKeySecret, ycloudPhoneNumberSecret] }, async (request) => {');

code = code.replace(/export const calculateFrenetShipping = onCall\(\{ cors: true \}, async \(req: any\) => \{/, 
  'export const calculateFrenetShipping = onCall({ cors: true, secrets: [asaasApiKeySecret, asaasWebhookTokenSecret, ycloudApiKeySecret, ycloudPhoneNumberSecret] }, async (req: any) => {');

fs.writeFileSync('functions/src/index.ts', code);
