const fs = require('fs');
let content = fs.readFileSync('functions/src/index.ts', 'utf8');

content = content.replace(
  /const oldSessionSnap = await db\.collection\("ycloudSessions"\)\.doc\(cleanPhone\)\.get\(\);/,
  'const oldSessionSnap = await db.collection("twilioSessions").doc(cleanPhone).get();'
);

content = content.replace(
  /const session = sessionSnap\.exists \? sessionSnap\.data\(\) as any : \(await db\.collection\("ycloudSessions"\)\.doc\(cleanPhone\)\.get\(\)\)\.data\(\) as any;/,
  'const session = sessionSnap.exists ? sessionSnap.data() as any : (await db.collection("twilioSessions").doc(cleanPhone).get()).data() as any;'
);

content = content.replace(
  /await db\.collection\("ycloudSessions"\)\.doc\(cleanPhone\)\.delete\(\);\n      await db\.collection\("ycloudSessions"\)\.doc\(cleanPhone\)\.delete\(\);/,
  'await db.collection("ycloudSessions").doc(cleanPhone).delete();\n      await db.collection("twilioSessions").doc(cleanPhone).delete();'
);

fs.writeFileSync('functions/src/index.ts', content);
