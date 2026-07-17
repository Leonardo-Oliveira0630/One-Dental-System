const fs = require('fs');
let content = fs.readFileSync('functions/src/index.ts', 'utf8');
const regex = /async function getTemplateAndSend\([\s\S]*?\}\n\nexport const triggerAppointmentCreated/m;
const replacement = `async function getTemplateAndSend(orgId: string, type: string, variables: Record<string, string>, toNumber: string) {
  const db = admin.firestore();

  // Load org early so we can check hasWhatsappModule
  const orgSnap = await db.collection("organizations").doc(orgId).get();
  if (!orgSnap.exists) return;
  const org = orgSnap.data() as any;

  if (!org.hasWhatsappModule) return; // Se não tem módulo, não envia, mesmo sendo template global

  // 1. Check global template first
  let template = null;
  try {
    const globalSettingsSnap = await db.collection("settings").doc("global").get();
    if (globalSettingsSnap.exists) {
      const globalSettings = globalSettingsSnap.data();
      if (globalSettings && globalSettings.globalWhatsappTemplates) {
        template = globalSettings.globalWhatsappTemplates.find((t: any) => t.action === type && t.active);
      }
    }
  } catch (err) {
    logger.error("Erro ao carregar modelo global de WhatsApp:", err);
  }

  // 2. Fallback to organization template if no active global template
  if (!template) {
    if (!org.whatsappTemplates) return;
    template = org.whatsappTemplates.find((t: any) => t.type === type && t.active);
  }

  if (!template) {
    logger.warn(\`[getTemplateAndSend] Template do tipo \${type} não encontrado ou inativo para orgId: \${orgId}\`);
    return;
  }

  let body = template.body;
  for (const [key, value] of Object.entries(variables)) {
    body = body.replace(new RegExp(\`\\\\{\\\\{\${key}\\\\\}\\\\\}\`, 'g'), value);
  }

  const globalConfig = await getYcloudConfig();
  let apiKey = globalConfig.apiKey;
  let fromNumber = globalConfig.fromNumber;

  if (org.ycloudApiKey) apiKey = org.ycloudApiKey;
  if (org.ycloudPhoneNumber) fromNumber = org.ycloudPhoneNumber;

  if (!apiKey || apiKey === "your_ycloud_api_key_here") {
    logger.info(\`[Simulado] WhatsApp Automático para \${toNumber}: \${body}\`);
    return;
  }

  try {
    const ycloudUrl = \`https://api.ycloud.com/v2/whatsapp/messages\`;
    let cleanTo = toNumber.replace(/\\D/g, "");
    if (cleanTo.length === 10 || cleanTo.length === 11) {
      cleanTo = "55" + cleanTo;
    }
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

export const triggerAppointmentCreated`;
content = content.replace(regex, replacement);
fs.writeFileSync('functions/src/index.ts', content);
console.log('Done replacing getTemplateAndSend');
