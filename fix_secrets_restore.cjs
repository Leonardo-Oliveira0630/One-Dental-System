const fs = require('fs');
let code = fs.readFileSync('functions/src/index.ts', 'utf8');

// Restore defineSecret
code = code.replace(/\/\/ const ycloudApiKeySecret = defineSecret\("YCLOUD_API_KEY"\);/, 'const ycloudApiKeySecret = defineSecret("YCLOUD_API_KEY");');
code = code.replace(/\/\/ const ycloudPhoneNumberSecret = defineSecret\("YCLOUD_PHONE_NUMBER"\);/, 'const ycloudPhoneNumberSecret = defineSecret("YCLOUD_PHONE_NUMBER");');

// Restore setGlobalOptions secrets
code = code.replace(/\/\/ secrets: \[asaasApiKeySecret, asaasWebhookTokenSecret, ycloudApiKeySecret, ycloudPhoneNumberSecret\]/, 'secrets: [asaasApiKeySecret, asaasWebhookTokenSecret, ycloudApiKeySecret, ycloudPhoneNumberSecret]');

fs.writeFileSync('functions/src/index.ts', code);
console.log("Secrets restored!");
