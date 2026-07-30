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
        let channelConfig: any = null;
        let systemApiKey = process.env.YCLOUD_API_KEY || '';
        let systemPhoneNumber = process.env.YCLOUD_PHONE_NUMBER || '';

        try {
            const settingsSnap = await this.db.collection('settings').doc('global').get();
            if (settingsSnap.exists) {
                const globalData = settingsSnap.data();
                if (globalData?.ycloudApiKey) systemApiKey = globalData.ycloudApiKey;
                if (globalData?.ycloudPhoneNumber) systemPhoneNumber = globalData.ycloudPhoneNumber;
            }
        } catch (e) {
            console.error("Could not fetch global settings for YCloud API key", e);
        }

        const snapshot = await this.db.collection('communication_channels')
            .where('orgId', '==', orgId)
            .where('status', '==', 'ACTIVE')
            .limit(1)
            .get();

        if (snapshot.empty) {
            console.log(`No active communication channel found for org ${orgId}, falling back to global Ycloud`);
            channelConfig = {
                provider: 'YCloud',
                status: 'ACTIVE',
                orgId: orgId,
                phoneNumber: systemPhoneNumber
            };
        } else {
            channelConfig = { ...snapshot.docs[0].data(), id: snapshot.docs[0].id };
            // If the org channel is YCloud but doesn't have phone, fallback to system
            if (channelConfig.provider === 'YCloud' && !channelConfig.phoneNumber) {
                channelConfig.phoneNumber = systemPhoneNumber;
            }
        }

        return {
            ...channelConfig,
            apiKey: channelConfig.apiKey || systemApiKey
        };
    }

    async getTemplate(orgId: string, module: string, templateType: string) {
        // Use globalSettings.globalWhatsappTemplates created by SuperAdmin UI
        try {
            const settingsSnap = await this.db.collection('settings').doc('global').get();
            if (settingsSnap.exists) {
                const globalSettings = settingsSnap.data();
                if (globalSettings && globalSettings.globalWhatsappTemplates) {
                    const t = globalSettings.globalWhatsappTemplates.find((tpl: any) => tpl.action === templateType && tpl.active);
                    if (t) {
                        const templateName = (t.metaTemplateName || t.name || '').trim();
                        if (templateName) {
                            return { type: 'meta_template', data: { ...t, name: templateName } };
                        }
                        return { type: 'meta_template', data: { ...t, name: t.action.toLowerCase() } };
                    }
                }
            }
        } catch (e) {
            console.error('Error fetching globalWhatsappTemplates', e);
        }

        const defaultTemplates: any = {
            'LAB_DISPATCH': { name: 'lab_boa_em_rota', body: 'Olá {{ dentist_name }}, seus trabalhos estão saindo para entrega/coleta com nosso motoboy:\n{{jobs_list}}' },
            'LAB_DELIVERED': { name: 'lab_delivered', body: 'Olá {{ dentist_name }}, os seguintes trabalhos foram entregues:\n{{jobs_list}}' },
            'CLINIC_APPOINTMENT': { name: 'clinic_appointment', body: 'Olá {{ patient_name }}, sua consulta está marcada para {{date}}.' },
            'SUPPLIER_UPDATE': { name: 'supplier_update', body: 'Seu pedido {{order_id}} foi atualizado para: {{status}}' }
        };
        
        if (defaultTemplates[templateType]) {
            return { type: 'meta_template', data: defaultTemplates[templateType] };
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
