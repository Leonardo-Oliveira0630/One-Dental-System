import * as admin from 'firebase-admin';
import { ICommunicationProvider } from '../interfaces/ICommunicationProvider';
import { YCloudProvider } from '../providers/YCloudProvider';

export class CommunicationService {
    private db: admin.firestore.Firestore;
    private providers: Map<string, ICommunicationProvider>;

    constructor() {
        this.db = admin.firestore();
        this.providers = new Map();
        this.registerProvider(new YCloudProvider());
    }

    private registerProvider(provider: ICommunicationProvider) {
        this.providers.set(provider.name, provider);
    }

    async getChannelConfig(orgId: string) {
        const snapshot = await this.db.collection('communication_channels')
            .where('orgId', '==', orgId)
            .where('status', '==', 'ACTIVE')
            .limit(1)
            .get();

        if (snapshot.empty) {
            throw new Error(`No active communication channel found for org ${orgId}`);
        }

        const data = snapshot.docs[0].data() as any;

        let systemApiKey = process.env.YCLOUD_API_KEY || '';
        if (!systemApiKey) {
            try {
                const settingsSnap = await this.db.collection('settings').doc('global').get();
                if (settingsSnap.exists) {
                    systemApiKey = settingsSnap.data()?.ycloudApiKey || '';
                }
            } catch (e) {
                console.error("Could not fetch global settings for YCloud API key", e);
            }
        }

        return {
            ...data,
            apiKey: systemApiKey, 
            id: snapshot.docs[0].id
        };
    }

    async getTemplate(orgId: string, module: string, templateType: string) {
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

        throw new Error(`Template not found for module ${module} and type ${templateType}`);
    }

    async logMessage(logData: any) {
        await this.db.collection('message_logs').add({
            ...logData,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    async sendTemplateMessage(orgId: string, to: string, module: string, templateType: string, variables: any) {
        try {
            // Clean phone
            let cleanPhone = to.replace(/\D/g, "");
            if (cleanPhone.length === 10 || cleanPhone.length === 11) {
              cleanPhone = "55" + cleanPhone;
            }

            const channelConfig = await this.getChannelConfig(orgId);
            const template = await this.getTemplate(orgId, module, templateType);
            
            const providerName = channelConfig.provider;
            const provider = this.providers.get(providerName);
            
            if (!provider) {
                throw new Error(`Provider ${providerName} not found`);
            }

            let result;
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
                        const regex = new RegExp('\\{\\{\\s*' + key + '\\s*\\}\\}', 'g');
                        textBody = textBody.replace(regex, String(value));
                    }
                }
                result = await provider.sendMessage(
                    channelConfig,
                    cleanPhone,
                    textBody
                );
            }

            await this.logMessage({
                orgId,
                channelId: channelConfig.id,
                provider: providerName,
                direction: 'OUTBOUND',
                templateId: (template.data && template.data.id) ? template.data.id : (template.data && template.data.action ? template.data.action : null),
                recipient: cleanPhone,
                message: JSON.stringify(result),
                status: 'SENT',
                sentAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return result;
        } catch (error: any) {
            console.error('Error sending template message:', error);
            
            // Clean phone
            let cleanPhone = to.replace(/\D/g, "");
            if (cleanPhone.length === 10 || cleanPhone.length === 11) {
              cleanPhone = "55" + cleanPhone;
            }

            await this.logMessage({
                orgId,
                direction: 'OUTBOUND',
                recipient: cleanPhone,
                message: error.message,
                status: 'FAILED',
                failedReason: error.message,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            throw error;
        }
    }
}
