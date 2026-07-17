const fs = require('fs');
let code = fs.readFileSync('functions/src/communication/services/CommunicationService.ts', 'utf8');

const regex = /\/\/ Try to find a Meta template in message_templates[\s\S]*?\/\/ Fallback to globalSettings\.globalWhatsappTemplates created by SuperAdmin UI/;

code = code.replace(regex, "// Use globalSettings.globalWhatsappTemplates created by SuperAdmin UI");

fs.writeFileSync('functions/src/communication/services/CommunicationService.ts', code);
console.log('Fixed CommunicationService templates');
