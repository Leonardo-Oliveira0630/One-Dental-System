const fs = require('fs');
let code = fs.readFileSync('functions/src/index.ts', 'utf8');

const regex = /if \(orgId\) \{\n\s*const orgSnap = await admin\.firestore\(\)\.collection\("organizations"\)\.doc\(orgId\)\.get\(\);\n\s*if \(orgSnap\.exists\) \{\n\s*const org = orgSnap\.data\(\) as any;\n\s*if \(org\.ycloudPhoneNumber\) \{\n\s*fromNumber = org\.ycloudPhoneNumber;\n\s*\}\n\s*\}\n\s*\}/;

const newCode = `if (orgId) {
    const orgSnap = await admin.firestore().collection("organizations").doc(orgId).get();
    if (orgSnap.exists) {
      const org = orgSnap.data() as any;
      if (org.ycloudPhoneNumber) {
        fromNumber = org.ycloudPhoneNumber;
      }
    }
    const channelSnap = await admin.firestore().collection("communication_channels")
      .where("orgId", "==", orgId)
      .where("status", "==", "ACTIVE")
      .limit(1)
      .get();
    if (!channelSnap.empty) {
      const channelData = channelSnap.docs[0].data();
      if (channelData.phoneNumber) fromNumber = channelData.phoneNumber;
      if (channelData.apiKey) apiKey = channelData.apiKey;
    }
  }`;

code = code.replace(regex, newCode);
fs.writeFileSync('functions/src/index.ts', code);
console.log('Fixed sendYcloudWhatsApp');
