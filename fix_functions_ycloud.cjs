const fs = require('fs');
let code = fs.readFileSync('functions/src/index.ts', 'utf8');

// Fix sendYcloudWhatsApp
code = code.replace(
  /export const sendYcloudWhatsApp = onCall\(\{ maxInstances: 10 \}, async \(request\) => \{\n  const \{ to, body \} = request\.data as any;\n  if \(!to \|\| !body\) \{\n    throw new HttpsError\("invalid-argument", "Número de destino e corpo da mensagem são obrigatórios\."\);\n  \}\n\n  const globalConfig = await getYcloudConfig\(\);\n  let apiKey = globalConfig\.apiKey;\n  let fromNumber = globalConfig\.fromNumber;\n\n\n\n  if \(!apiKey \|\| apiKey === "your_ycloud_api_key_here"\) \{/g,
  `export const sendYcloudWhatsApp = onCall({ maxInstances: 10 }, async (request) => {
  const { to, body, orgId } = request.data as any;
  if (!to || !body) {
    throw new HttpsError("invalid-argument", "Número de destino e corpo da mensagem são obrigatórios.");
  }

  const globalConfig = await getYcloudConfig();
  let apiKey = globalConfig.apiKey;
  let fromNumber = globalConfig.fromNumber;
  
  if (orgId) {
    const orgSnap = await admin.firestore().collection("organizations").doc(orgId).get();
    if (orgSnap.exists) {
      const org = orgSnap.data() as any;
      if (org.ycloudPhoneNumber) {
        fromNumber = org.ycloudPhoneNumber;
      }
    }
  }

  if (!apiKey || apiKey === "your_ycloud_api_key_here") {`
);

// Fix getTemplateAndSend
code = code.replace(
  /  const globalConfig = await getYcloudConfig\(\);\n  let apiKey = globalConfig\.apiKey;\n  let fromNumber = globalConfig\.fromNumber;\n  \n\n  \n  if \(!apiKey \|\| apiKey === "your_ycloud_api_key_here"\) \{/g,
  `  const globalConfig = await getYcloudConfig();
  let apiKey = globalConfig.apiKey;
  let fromNumber = org.ycloudPhoneNumber || globalConfig.fromNumber;

  if (!apiKey || apiKey === "your_ycloud_api_key_here") {`
);

fs.writeFileSync('functions/src/index.ts', code);
