const fs = require('fs');
let code = fs.readFileSync('functions/src/communication/services/CommunicationService.ts', 'utf8');

const regex = /return \{\n\s*\.\.\.channelConfig,\n\s*apiKey: systemApiKey\n\s*\};/;
code = code.replace(regex, "return {\n            ...channelConfig,\n            apiKey: channelConfig.apiKey || systemApiKey\n        };");

fs.writeFileSync('functions/src/communication/services/CommunicationService.ts', code);
console.log('Fixed CommunicationService');
