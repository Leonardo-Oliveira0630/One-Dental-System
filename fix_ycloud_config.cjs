const fs = require('fs');
let code = fs.readFileSync('functions/src/index.ts', 'utf8');

const regex = /const getYcloudConfig = async \(\) => \{\n  let apiKey = "";\n  let fromNumber = "";\n  \n  try \{ apiKey = ycloudApiKeySecret.value\(\); \} catch \(e\) \{ logger.warn\("Secret YCLOUD_API_KEY não disponível via Secret Manager."\); \}\n  try \{ fromNumber = ycloudPhoneNumberSecret.value\(\); \} catch \(e\) \{ logger.warn\("Secret YCLOUD_PHONE_NUMBER não disponível via Secret Manager."\); \}\n\n  if \(\!apiKey\) apiKey = process.env.YCLOUD_API_KEY \|\| process.env.ycloud_api_key \|\| "";\n  if \(\!fromNumber\) fromNumber = process.env.YCLOUD_PHONE_NUMBER \|\| process.env.ycloud_phone_number \|\| "";\n\n  return \{ apiKey, fromNumber \};\n\};/;

const newCode = `const getYcloudConfig = async () => {
  let apiKey = "";
  let fromNumber = "";
  
  try { apiKey = ycloudApiKeySecret.value(); } catch (e) {}
  try { fromNumber = ycloudPhoneNumberSecret.value(); } catch (e) {}

  if (!apiKey) apiKey = process.env.YCLOUD_API_KEY || process.env.ycloud_api_key || "";
  if (!fromNumber) fromNumber = process.env.YCLOUD_PHONE_NUMBER || process.env.ycloud_phone_number || "";

  try {
    const db = admin.firestore();
    const globalSettingsDoc = await db.collection("settings").doc("global").get();
    if (globalSettingsDoc.exists) {
      const data = globalSettingsDoc.data();
      if (data?.ycloudApiKey) apiKey = data.ycloudApiKey;
      if (data?.ycloudPhoneNumber) fromNumber = data.ycloudPhoneNumber;
    }
  } catch (e) {
    logger.error("Failed to fetch Ycloud config from DB", e);
  }

  return { apiKey, fromNumber };
};`;

code = code.replace(regex, newCode);
fs.writeFileSync('functions/src/index.ts', code);
console.log('Fixed getYcloudConfig');
