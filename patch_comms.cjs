const fs = require('fs');
const content = fs.readFileSync('functions/src/communication/services/CommunicationService.ts', 'utf8');

const newContent = content.replace(
`    async getTemplate(orgId: string, module: string, templateType: string) {
        let snapshot = await this.db.collection('message_templates')
            .where('orgId', '==', orgId)
            .where('module', '==', module)
            .where('type', '==', templateType)
            .where('status', '==', 'APPROVED')
            .limit(1)
            .get();

        if (snapshot.empty) {
            snapshot = await this.db.collection('message_templates')
                .where('orgId', '==', 'GLOBAL')
                .where('module', '==', module)
                .where('type', '==', templateType)
                .where('status', '==', 'APPROVED')
                .limit(1)
                .get();
        }

        if (snapshot.empty) {
            throw new Error(\`Template not found for module \${module} and type \${templateType}\`);
        }

        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    }`,
`    async getTemplate(orgId: string, module: string, templateType: string) {
        // Try to find a Meta template in message_templates
        let snapshot = await this.db.collection('message_templates')
            .where('orgId', '==', orgId)
            .where('module', '==', module)
            .where('type', '==', templateType)
            .where('status', '==', 'APPROVED')
            .limit(1)
            .get();

        if (!snapshot.empty) {
            return { type: 'meta_template', data: { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } };
        }

        // Try GLOBAL in message_templates
        snapshot = await this.db.collection('message_templates')
            .where('orgId', '==', 'GLOBAL')
            .where('module', '==', module)
            .where('type', '==', templateType)
            .where('status', '==', 'APPROVED')
            .limit(1)
            .get();

        if (!snapshot.empty) {
            return { type: 'meta_template', data: { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } };
        }

        // Fallback to globalSettings.globalWhatsappTemplates created by SuperAdmin UI
        try {
            const settingsSnap = await this.db.collection('settings').doc('global').get();
            if (settingsSnap.exists) {
                const globalSettings = settingsSnap.data();
                if (globalSettings && globalSettings.globalWhatsappTemplates) {
                    const t = globalSettings.globalWhatsappTemplates.find((tpl: any) => tpl.action === templateType && tpl.active);
                    if (t) {
                        return { type: 'text_template', data: t };
                    }
                }
            }
        } catch (e) {
            console.error('Error fetching globalWhatsappTemplates', e);
        }

        throw new Error(\`Template not found for module \${module} and type \${templateType}\`);
    }`
).replace(
`            const result = await provider.sendTemplate(
                channelConfig,
                cleanPhone,
                template,
                variables
            );`,
`            let result;
            if (template.type === 'meta_template') {
                result = await provider.sendTemplate(
                    channelConfig,
                    cleanPhone,
                    template.data,
                    variables
                );
            } else {
                let textBody = template.data.body;
                if (variables && Object.keys(variables).length > 0) {
                    for (const [key, value] of Object.entries(variables)) {
                        const regex = new RegExp(\`\\\\{\\\\{(\\s*)\${key}(\\s*)\\\\}\\\\}\`, 'g');
                        textBody = textBody.replace(regex, String(value));
                    }
                }
                result = await provider.sendMessage(
                    channelConfig,
                    cleanPhone,
                    textBody
                );
            }`
).replace(
`templateId: template.id || null,`,
`templateId: (template.data && template.data.id) ? template.data.id : (template.data && template.data.action ? template.data.action : null),`
);

fs.writeFileSync('functions/src/communication/services/CommunicationService.ts', newContent);
console.log("Patched CommunicationService!");
