const fs = require('fs');

const file = 'functions/src/index.ts';
if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');

  const oldSetGlobalOptions = `setGlobalOptions({
  maxInstances: 10,
  secrets: [asaasApiKeySecret, asaasWebhookTokenSecret]
});`;

  const newSetGlobalOptions = `setGlobalOptions({
  maxInstances: 10,
  secrets: [asaasApiKeySecret, asaasWebhookTokenSecret],
  cors: true
});`;

  content = content.replace(oldSetGlobalOptions, newSetGlobalOptions);
  
  const oldCalc = `export const calculateFrenetShipping = onCall(async (req: any) => {`;
  const newCalc = `export const calculateFrenetShipping = onCall({ cors: true }, async (req: any) => {`;
  
  content = content.replace(oldCalc, newCalc);

  fs.writeFileSync(file, content);
}
