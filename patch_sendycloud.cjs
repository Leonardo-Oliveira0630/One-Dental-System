const fs = require('fs');
let code = fs.readFileSync('functions/src/index.ts', 'utf8');

const regex = /logger\.info\(\`Mensagem real enviada com sucesso! ID: \$\{response\.data\.id\}\`\);/;
const replacement = `logger.info(\`Mensagem real enviada com sucesso! ID: \$\{response.data.id\}\`);
        // Log in Firestore
        await admin.firestore().collection("message_logs").add({
            orgId: orgId || "TEST",
            channelId: "YCLOUD_API",
            provider: "YCLOUD",
            direction: "OUTBOUND",
            templateId: "MANUAL_TEST",
            recipient: cleanTo,
            message: body,
            status: "SENT",
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });`;

code = code.replace(regex, replacement);

const errorRegex = /throw new HttpsError\("aborted", \`Erro no Ycloud: \$\{errorMsg\}\`\);/;
const errorReplacement = `await admin.firestore().collection("message_logs").add({
            orgId: orgId || "TEST",
            channelId: "YCLOUD_API",
            provider: "YCLOUD",
            direction: "OUTBOUND",
            templateId: "MANUAL_TEST",
            recipient: to,
            message: \`Erro: \${errorMsg}\`,
            status: "FAILED",
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        throw new HttpsError("aborted", \`Erro no Ycloud: \$\{errorMsg\}\`);`;

code = code.replace(errorRegex, errorReplacement);

fs.writeFileSync('functions/src/index.ts', code);
console.log('Patched sendYcloudWhatsApp with logging');
