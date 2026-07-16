const fs = require('fs');
let code = fs.readFileSync('functions/src/index.ts', 'utf8');

code = code.replace(
  /secrets: \[asaasApiKeySecret, asaasWebhookTokenSecret, ycloudApiKeySecret, ycloudPhoneNumberSecret\]/g,
  '// secrets: [asaasApiKeySecret, asaasWebhookTokenSecret, ycloudApiKeySecret, ycloudPhoneNumberSecret]'
);

fs.writeFileSync('functions/src/index.ts', code);
console.log("Secrets removed from setGlobalOptions");
