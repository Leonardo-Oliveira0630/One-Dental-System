const fs = require('fs');
let code = fs.readFileSync('functions/src/index.ts', 'utf8');

code = code.replace(/const getYcloudConfig = async \(\) => \{[\s\S]*?return \{ apiKey, fromNumber \};\n\};/, `const getYcloudConfig = async () => {
  let apiKey = "";
  let fromNumber = "";
  
  try { apiKey = ycloudApiKeySecret.value(); } catch (e) { logger.warn("Secret YCLOUD_API_KEY não disponível"); }
  try { fromNumber = ycloudPhoneNumberSecret.value(); } catch (e) { logger.warn("Secret YCLOUD_PHONE_NUMBER não disponível"); }

  if (!apiKey || !fromNumber) {
    try {
      const db = admin.firestore();
      const doc = await db.collection("secrets").doc("api_keys").get();
      if (doc.exists) {
        const data = doc.data();
        if (!apiKey && data?.YCLOUD_API_KEY) apiKey = data.YCLOUD_API_KEY;
        if (!fromNumber && data?.YCLOUD_PHONE_NUMBER) fromNumber = data.YCLOUD_PHONE_NUMBER;
      }
    } catch (e) {
      logger.warn("Erro ao buscar secrets no Firestore", e);
    }
  }

  if (!apiKey) apiKey = process.env.YCLOUD_API_KEY || process.env.ycloud_api_key || "";
  if (!fromNumber) fromNumber = process.env.YCLOUD_PHONE_NUMBER || process.env.ycloud_phone_number || "";

  return { apiKey, fromNumber };
};`);

fs.writeFileSync('functions/src/index.ts', code);
