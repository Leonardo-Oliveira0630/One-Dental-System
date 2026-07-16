const fs = require('fs');
let code = fs.readFileSync('functions/src/index.ts', 'utf8');

code = code.replace(
/setGlobalOptions\(\{\s*maxInstances: 10,\s*secrets: \[asaasApiKeySecret, asaasWebhookTokenSecret, ycloudApiKeySecret, ycloudPhoneNumberSecret\]\s*\}\);/,
`setGlobalOptions({
    maxInstances: 10,
    region: "us-central1",
    secrets: [asaasApiKeySecret, asaasWebhookTokenSecret, ycloudApiKeySecret, ycloudPhoneNumberSecret]
});`
);

fs.writeFileSync('functions/src/index.ts', code);
