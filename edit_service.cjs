const fs = require('fs');

let content = fs.readFileSync('services/ycloudService.ts', 'utf8');
content = content.replace(/TwilioService/g, 'YcloudService');
content = content.replace(/sendTwilioWhatsApp/g, 'sendYcloudWhatsApp');
content = content.replace(/Twilio/g, 'Ycloud');
content = content.replace(/twilio/gi, 'ycloud');
fs.writeFileSync('services/ycloudService.ts', content);
console.log('Replaced in service');
