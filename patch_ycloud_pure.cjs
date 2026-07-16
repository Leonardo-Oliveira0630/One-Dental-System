const fs = require('fs');
let code = fs.readFileSync('functions/src/index.ts', 'utf8');

code = code.replace(/const getYcloudConfig = async \(\) => \{[\s\S]*?return \{ apiKey, fromNumber \};\n\};/, `const getYcloudConfig = async () => {
  let apiKey = "";
  let fromNumber = "";
  
  try { apiKey = ycloudApiKeySecret.value(); } catch (e) { logger.warn("Secret YCLOUD_API_KEY não disponível via Secret Manager."); }
  try { fromNumber = ycloudPhoneNumberSecret.value(); } catch (e) { logger.warn("Secret YCLOUD_PHONE_NUMBER não disponível via Secret Manager."); }

  if (!apiKey) apiKey = process.env.YCLOUD_API_KEY || process.env.ycloud_api_key || "";
  if (!fromNumber) fromNumber = process.env.YCLOUD_PHONE_NUMBER || process.env.ycloud_phone_number || "";

  return { apiKey, fromNumber };
};`);

fs.writeFileSync('functions/src/index.ts', code);
