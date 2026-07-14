const fs = require('fs');
let content = fs.readFileSync('functions/src/index.ts', 'utf8');

const regex = /async function getTemplateAndSend[\s\S]*?\}\n\nexport const onAppointmentCreated/m;

const replacement = `async function getTemplateAndSend(orgId: string, type: string, variables: Record<string, string>, toNumber: string) {
  const db = admin.firestore();
  const orgSnap = await db.collection("organizations").doc(orgId).get();
  if (!orgSnap.exists) return;
  const org = orgSnap.data() as any;
  
  if (!org.hasWhatsappModule || !org.whatsappTemplates) return;
  
  const template = org.whatsappTemplates.find((t: any) => t.type === type && t.active);
  if (!template) return;
  
  let body = template.body;
  for (const [key, value] of Object.entries(variables)) {
    body = body.replace(new RegExp(\`\\\\{\\\\{\${key}\\\\\}\\\\\}\`, 'g'), value);
  }
  
  let apiKey = process.env.YCLOUD_API_KEY || "";
  let fromNumber = process.env.YCLOUD_PHONE_NUMBER || "";
  
  if (org.ycloudSettings) {
    if (org.ycloudSettings.apiKey) apiKey = org.ycloudSettings.apiKey;
    if (org.ycloudSettings.fromNumber) fromNumber = org.ycloudSettings.fromNumber;
  }
  
  if (!apiKey || apiKey === "your_ycloud_api_key_here") {
    logger.info(\`[Simulado] WhatsApp Automático para \${toNumber}: \${body}\`);
    return;
  }
  
  try {
    const ycloudUrl = \`https://api.ycloud.com/v2/whatsapp/messages/send\`;
    const cleanTo = toNumber.replace(/\\D/g, "");
    const cleanFrom = fromNumber.replace(/\\D/g, "");
    
    await axios.post(ycloudUrl, {
      to: \`+\${cleanTo}\`,
      from: \`+\${cleanFrom}\`,
      type: "text",
      text: {
        body: body
      }
    }, {
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json"
      }
    });
    logger.info(\`Notificação enviada com sucesso para \${toNumber}\`);
  } catch (e: any) {
    logger.error("Erro ao enviar notificação automática:", e.response?.data || e.message);
  }
}

export const onAppointmentCreated`;

content = content.replace(regex, replacement);
fs.writeFileSync('functions/src/index.ts', content);
console.log('Done replacing getTemplateAndSend');
