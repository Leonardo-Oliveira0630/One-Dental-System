const fs = require('fs');

let content = fs.readFileSync('functions/src/index.ts', 'utf8');

const regex = /if \(newStatus\) \{[\s\S]*?await axios\.post\(ycloudUrl, \{/m;

const replacement = `if (newStatus) {
      await db.collection("organizations").doc(orgId).collection("appointments").doc(appointmentId).update({
        status: newStatus
      });
      
      let responseMsg = newStatus === "CONFIRMED" ? "Sua consulta foi confirmada com sucesso. Obrigado!" : "Sua consulta foi cancelada.";
      
      const orgSnap = await db.collection("organizations").doc(orgId).get();
      const org = orgSnap.data() as any;
      
      if (org?.hasWhatsappModule && org?.whatsappTemplates) {
         const type = newStatus === "CONFIRMED" ? "CLINIC_APPOINTMENT_CONFIRMED" : "CLINIC_APPOINTMENT_CANCELED";
         const template = org.whatsappTemplates.find((t: any) => t.type === type && t.active);
         if (template) {
            let patientName = "Paciente";
            let dateStr = "";
            let timeStr = "";
            try {
               const apptSnap = await db.collection("organizations").doc(orgId).collection("appointments").doc(appointmentId).get();
               if (apptSnap.exists) {
                  const appt = apptSnap.data() as any;
                  dateStr = new Date(appt.date).toLocaleDateString("pt-BR");
                  timeStr = appt.startTime || "";
                  const patSnap = await db.collection("organizations").doc(orgId).collection("patients").doc(appt.patientId).get();
                  if (patSnap.exists) {
                      patientName = (patSnap.data() as any).name;
                  }
               }
            } catch (e) {
               logger.error("Erro ao buscar dados para template no webhook", e);
            }
            
            let body = template.body;
            body = body.replace(/\\{\\{patient_name\\}\\}/g, patientName);
            body = body.replace(/\\{\\{date\\}\\}/g, dateStr);
            body = body.replace(/\\{\\{time\\}\\}/g, timeStr);
            responseMsg = body;
         }
      }
      
      let apiKey = process.env.YCLOUD_API_KEY || "";
      let fromNumber = process.env.YCLOUD_PHONE_NUMBER || "";
      
      if (org?.ycloudSettings) {
        if (org.ycloudSettings.apiKey) apiKey = org.ycloudSettings.apiKey;
        if (org.ycloudSettings.fromNumber) fromNumber = org.ycloudSettings.fromNumber;
      }
      
      if (apiKey && apiKey !== "your_ycloud_api_key_here") {
        const ycloudUrl = \`https://api.ycloud.com/v2/whatsapp/messages\`;
        
        await axios.post(ycloudUrl, {`;

content = content.replace(regex, replacement);
fs.writeFileSync('functions/src/index.ts', content);
console.log('Done replacing ycloudWebhook for templates');
