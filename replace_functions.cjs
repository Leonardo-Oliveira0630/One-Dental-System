const fs = require('fs');

let content = fs.readFileSync('functions/src/index.ts', 'utf8');

// Replace sendTwilioWhatsApp
content = content.replace(/export const sendTwilioWhatsApp =[\s\S]*?\}\);\n/m, `export const sendYcloudWhatsApp = onCall({ maxInstances: 10 }, async (request) => {
  const { to, body, orgId } = request.data as any;
  if (!to || !body) {
    throw new HttpsError("invalid-argument", "Número de destino e corpo da mensagem são obrigatórios.");
  }

  let apiKey = process.env.YCLOUD_API_KEY || "";
  let fromNumber = process.env.YCLOUD_PHONE_NUMBER || ""; 

  if (orgId) {
    try {
      const db = admin.firestore();
      const orgSnap = await db.collection("organizations").doc(orgId).get();
      if (orgSnap.exists) {
        const orgData = orgSnap.data();
        if (orgData?.ycloudSettings) {
          if (orgData.ycloudSettings.apiKey) apiKey = orgData.ycloudSettings.apiKey;
          if (orgData.ycloudSettings.fromNumber) fromNumber = orgData.ycloudSettings.fromNumber;
        }
      }
    } catch (err: any) {
      logger.error("Erro ao carregar configurações Ycloud da organização:", err.message);
    }
  }

  if (!apiKey || apiKey === "your_ycloud_api_key_here") {
    logger.info(\`[Ycloud Simulation] Credenciais não configuradas. Simulação de envio para \${to}: \${body}\`);
    return {
      success: true,
      sid: "SM_simulated_" + Math.random().toString(36).substring(2, 12),
      simulated: true,
      message: \`WhatsApp enviado via simulador: \${body}\`
    };
  }

  try {
    const ycloudUrl = \`https://api.ycloud.com/v2/whatsapp/messages/send\`;
    const cleanTo = to.replace(/\\D/g, "");
    const cleanFrom = fromNumber.replace(/\\D/g, "");
    
    logger.info(\`Enviando mensagem WhatsApp Ycloud real para \${cleanTo}...\`);
    const response = await axios.post(ycloudUrl, {
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
    
    logger.info(\`Mensagem real enviada com sucesso! ID: \${response.data.id}\`);
    return {
      success: true,
      sid: response.data.id,
      simulated: false
    };
  } catch (error: any) {
    const errorMsg = error.response?.data?.message || error.response?.data?.error?.message || error.message;
    logger.error(\`Erro ao enviar mensagem via Ycloud real: \${errorMsg}\`, error.response?.data);
    throw new HttpsError("internal", \`Erro no Ycloud: \${errorMsg}\`);
  }
});
`);

fs.writeFileSync('functions/src/index.ts', content);
console.log('Done replacing sendYcloudWhatsApp');
