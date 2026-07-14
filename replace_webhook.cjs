const fs = require('fs');

let content = fs.readFileSync('functions/src/index.ts', 'utf8');

const regex = /export const twilioWebhook = onRequest\([\s\S]*?\}\);\n/m;

const replacement = `export const ycloudWebhook = onRequest(async (req: any, res: any) => {
  const db = admin.firestore();
  try {
    const event = req.body;
    let from = "";
    let msg = "";

    if (event.type === "whatsappInboundMessage") {
      from = event.whatsappInboundMessage?.from || "";
      msg = event.whatsappInboundMessage?.text?.body || "";
    } else {
      // Fallback para outros formatos ou testes
      from = event.from || event.From || event.whatsappInboundMessage?.from || "";
      msg = (event.text?.body || event.Body || event.whatsappInboundMessage?.text?.body || "").trim();
    }
    
    logger.info("Recebido webhook do Ycloud", { from, msg });
    
    if (!from || !msg) {
      res.status(200).send("OK");
      return;
    }

    const cleanPhone = from.replace(/\\D/g, "");
    
    const sessionSnap = await db.collection("ycloudSessions").doc(cleanPhone).get();
    if (!sessionSnap.exists) {
      // Fallback check twilioSessions for transition period
      const oldSessionSnap = await db.collection("twilioSessions").doc(cleanPhone).get();
      if (!oldSessionSnap.exists) {
         res.status(200).send("OK");
         return;
      }
    }
    
    const session = sessionSnap.exists ? sessionSnap.data() as any : (await db.collection("twilioSessions").doc(cleanPhone).get()).data() as any;
    const orgId = session.orgId;
    const appointmentId = session.appointmentId;
    
    let newStatus = "";
    if (msg === "1" || msg.toLowerCase() === "sim" || msg.toLowerCase() === "confirmar") {
      newStatus = "CONFIRMED";
    } else if (msg === "2" || msg.toLowerCase() === "não" || msg.toLowerCase() === "nao" || msg.toLowerCase() === "cancelar") {
      newStatus = "CANCELED";
    }
    
    if (newStatus) {
      await db.collection("organizations").doc(orgId).collection("appointments").doc(appointmentId).update({
        status: newStatus
      });
      
      const responseMsg = newStatus === "CONFIRMED" ? "Sua consulta foi confirmada com sucesso. Obrigado!" : "Sua consulta foi cancelada.";
      
      const orgSnap = await db.collection("organizations").doc(orgId).get();
      const org = orgSnap.data() as any;
      let apiKey = process.env.YCLOUD_API_KEY || "";
      let fromNumber = process.env.YCLOUD_PHONE_NUMBER || "";
      
      if (org?.ycloudSettings) {
        if (org.ycloudSettings.apiKey) apiKey = org.ycloudSettings.apiKey;
        if (org.ycloudSettings.fromNumber) fromNumber = org.ycloudSettings.fromNumber;
      }
      
      if (apiKey && apiKey !== "your_ycloud_api_key_here") {
        const ycloudUrl = \`https://api.ycloud.com/v2/whatsapp/messages\`;
        
        await axios.post(ycloudUrl, {
          to: \`+\${cleanPhone}\`,
          from: \`+\${fromNumber.replace(/\\D/g, "")}\`,
          type: "text",
          text: {
            body: responseMsg
          }
        }, {
          headers: { "X-API-Key": apiKey, "Content-Type": "application/json" }
        });
      }
      
      await db.collection("ycloudSessions").doc(cleanPhone).delete();
      await db.collection("twilioSessions").doc(cleanPhone).delete();
    }
    
    res.status(200).send("OK");
  } catch (error) {
    logger.error("Erro no ycloudWebhook", error);
    res.status(200).send("Erro");
  }
});
`;

content = content.replace(regex, replacement);
fs.writeFileSync('functions/src/index.ts', content);
console.log('Done replacing ycloudWebhook');
