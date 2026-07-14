const fs = require('fs');

let content = fs.readFileSync('functions/src/index.ts', 'utf8');

const jobTrigger = `
export const onJobUpdated = onDocumentUpdated("organizations/{orgId}/jobs/{jobId}", async (event: any) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;
  
  if (before.status !== "DELIVERED" && after.status === "DELIVERED") {
     const orgId = event.params.orgId;
     const db = admin.firestore();
     
     let phone = "";
     // Try users first
     const dId = after.dentistId;
     let userSnap = await db.collection("users").doc(dId).get();
     if (userSnap.exists) {
       phone = (userSnap.data() as any)?.phone || "";
     } else {
       // Manual
       const manualSnap = await db.collection("organizations").doc(orgId).collection("dentists").doc(dId).get();
       if (manualSnap.exists) {
         phone = (manualSnap.data() as any)?.phone || "";
       }
     }
     
     if (phone) {
       const osNumber = after.osNumber || after.id?.substring(after.id.length - 6).toUpperCase() || event.params.jobId.substring(event.params.jobId.length - 6).toUpperCase();
       
       await getTemplateAndSend(orgId, "LOGISTICS_DELIVERED", {
         dentistName: after.dentistName || "Dentista",
         patientName: after.patientName || "Paciente",
         osNumber: osNumber,
         jobsList: \`- \${after.patientName} (OS: \${osNumber})\`
       }, phone);
     }
  }
});
`;

content = content + jobTrigger;
fs.writeFileSync('functions/src/index.ts', content);
console.log('Added onJobUpdated');
