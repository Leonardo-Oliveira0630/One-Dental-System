const fs = require('fs');
let code = fs.readFileSync('functions/src/index.ts', 'utf8');

code = code.replace(
  /export const toggleWhatsappModule = onCall\(async \(request: any\) => \{\n  const \{ orgId, activate \} = request\.data;\n  const \{ key, url \} = await getAsaasConfig\(\);\n  const db = admin\.firestore\(\);\n\n  try \{/g,
  `export const toggleWhatsappModule = onCall(async (request: any) => {\n  try {\n    const { orgId, activate } = request.data;\n    const { key, url } = await getAsaasConfig();\n    const db = admin.firestore();`
);

code = code.replace(
  /export const createSaaSSubscription = onCall\(async \(req: any\) => \{\n  const \{orgId, planId, email, name, cpfCnpj\} = req\.data;\n  const \{key, url\} = await getAsaasConfig\(\);\n\n  try \{/g,
  `export const createSaaSSubscription = onCall(async (req: any) => {\n  try {\n    const {orgId, planId, email, name, cpfCnpj} = req.data;\n    const {key, url} = await getAsaasConfig();`
);

code = code.replace(
  /export const getSaaSInvoices = onCall\(async \(request: any\) => \{\n  const \{orgId\} = request\.data;\n  const \{key, url\} = await getAsaasConfig\(\);\n\n  try \{/g,
  `export const getSaaSInvoices = onCall(async (request: any) => {\n  try {\n    const {orgId} = request.data;\n    const {key, url} = await getAsaasConfig();`
);

code = code.replace(
  /export const createLabSubAccount = onCall\(async \(request: any\) => \{\n  const \{orgId, accountData\} = request\.data;\n  const \{key, url\} = await getAsaasConfig\(\);\n  try \{/g,
  `export const createLabSubAccount = onCall(async (request: any) => {\n  try {\n    const {orgId, accountData} = request.data;\n    const {key, url} = await getAsaasConfig();`
);

code = code.replace(/throw new HttpsError\("internal", /g, 'throw new HttpsError("aborted", ');

fs.writeFileSync('functions/src/index.ts', code);
