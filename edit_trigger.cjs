const fs = require('fs');

let content = fs.readFileSync('functions/src/index.ts', 'utf8');

// Replace onJobUpdated with onDeliveryRouteUpdated
const regex = /export const onJobUpdated = onDocumentUpdated\("organizations\/\{orgId\}\/jobs\/\{jobId\}", async \(event: any\) => \{[\s\S]*?\}\);\n/m;
const replacement = `export const onDeliveryRouteUpdated = onDocumentUpdated("organizations/{orgId}/deliveryRoutes/{routeId}", async (event: any) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;
  
  if (before.status !== "IN_TRANSIT" && after.status === "IN_TRANSIT") {
     const orgId = event.params.orgId;
     const db = admin.firestore();
     
     // Obter items da rota
     const itemsSnap = await db.collection("organizations").doc(orgId).collection("deliveryRoutes").doc(event.params.routeId).collection("routeItems").get();
     if (itemsSnap.empty) return;
     
     const items = itemsSnap.docs.map((doc: any) => doc.data());
     
     // Agrupar por dentista
     const jobsByDentist: Record<string, { dentistName: string, jobs: string[], dentistId: string, isAppUser: boolean }> = {};
     
     for (const item of items) {
       if (item.type !== "DELIVERY") continue; // só queremos avisar de entregas, não de coletas? Opcional
       const dId = item.dentistId;
       if (!jobsByDentist[dId]) {
         jobsByDentist[dId] = {
           dentistName: item.dentistName,
           dentistId: dId,
           jobs: [],
           isAppUser: !!item.clinicName // Heuristic or we will fetch it
         };
       }
       jobsByDentist[dId].jobs.push(\`- \${item.patientName || "Paciente"} (OS: \${item.jobId || "Sem número"})\`);
     }
     
     for (const dId of Object.keys(jobsByDentist)) {
       const info = jobsByDentist[dId];
       let phone = "";
       
       // Try users first
       let userSnap = await db.collection("users").doc(dId).get();
       if (userSnap.exists) {
         phone = (userSnap.data() as any)?.phone || "";
       } else {
         let manualSnap = await db.collection("organizations").doc(orgId).collection("manualDentists").doc(dId).get();
         if (manualSnap.exists) phone = (manualSnap.data() as any)?.phone || "";
       }
       
       if (!phone) continue;
       
       const jobsListStr = info.jobs.join("\\n");
       
       await getTemplateAndSend(orgId, "LAB_DISPATCH", {
         dentist_name: info.dentistName,
         jobs_list: jobsListStr
       }, phone);
     }
  }
});\n`;

content = content.replace(regex, replacement);
fs.writeFileSync('functions/src/index.ts', content);
console.log('Replaced onJobUpdated');
