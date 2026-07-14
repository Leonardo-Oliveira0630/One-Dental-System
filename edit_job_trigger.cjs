const fs = require('fs');

let content = fs.readFileSync('functions/src/index.ts', 'utf8');

const regex = /await getTemplateAndSend\(orgId, "LOGISTICS_DELIVERED", \{[\s\S]*?\}, phone\);/m;
const replacement = `await getTemplateAndSend(orgId, "LAB_DISPATCH", {
         dentist_name: after.dentistName || "Dentista",
         jobs_list: \`- \${after.patientName} (OS: \${osNumber})\`
       }, phone);`;

content = content.replace(regex, replacement);
fs.writeFileSync('functions/src/index.ts', content);
console.log('Fixed onJobUpdated trigger');
