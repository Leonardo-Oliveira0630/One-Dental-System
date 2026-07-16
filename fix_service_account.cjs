const fs = require('fs');
let code = fs.readFileSync('functions/src/index.ts', 'utf8');

if (code.includes('setGlobalOptions({')) {
  code = code.replace(
    /setGlobalOptions\(\{[\s\S]*?secrets: \[.*?\]\n\}\);/g,
    `setGlobalOptions({\n    maxInstances: 10,\n    serviceAccount: "one-dental-system@appspot.gserviceaccount.com",\n    secrets: [asaasApiKeySecret, asaasWebhookTokenSecret, ycloudApiKeySecret, ycloudPhoneNumberSecret]\n});`
  );
  fs.writeFileSync('functions/src/index.ts', code);
  console.log("Service account patched!");
} else {
  console.log("setGlobalOptions not found");
}
