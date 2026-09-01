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
        let systemApiKey = process.env.ycloud_api_key || process.env['YCLOUD_' + 'API_KEY'] || '';
        let systemPhoneNumber = process.env.ycloud_phone_number || process.env['YCLOUD_' + 'PHONE_NUMBER'] || '5527997599833';

        try {
            const settingsSnap = await this.db.collection('settings').doc('global').get();
            if (settingsSnap.exists) {
                const globalData = settingsSnap.data();
                if (globalData?.ycloudApiKey) systemApiKey = globalData.ycloudApiKey;
                if (globalData?.ycloudPhoneNumber && !globalData.ycloudPhoneNumber.includes('997544638')) {
                    systemPhoneNumber = globalData.ycloudPhoneNumber;
                }
            }
        } catch (e) {
            console.error("Could not fetch global settings for YCloud API key", e);
        }

        if (!systemPhoneNumber || systemPhoneNumber.includes('997544638')) {
            systemPhoneNumber = '5527997599833';
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

        let finalPhone = systemPhoneNumber || channelConfig.wabaPhoneNumber || channelConfig.ycloudPhoneNumber || channelConfig.phoneNumber;
        if (!finalPhone || finalPhone.includes('997544638') || finalPhone.length < 8) {
            finalPhone = '5527997599833';
        }

        return {
            ...channelConfig,
            apiKey: channelConfig.apiKey || systemApiKey,
            phoneNumber: finalPhone
        };
    }

    async getTemplate(orgId: string, module: string, templateType: string) {
        const defaultTemplates: any = {
            'LAB_DISPATCH': { name: 'lab_trabalho_em_rota', language: 'pt_BR', body: 'Olá {{dentist_name}}, seus trabalhos estão saindo para entrega com o entregador:\n{{jobs_list}}' },
            'LAB_DELIVERED': { name: 'lab_trabalho_entregue', language: 'pt_BR', body: 'Olá {{dentist_name}}, os seguintes trabalhos foram entregues:\n{{jobs_list}}' },
            'CLINIC_APPOINTMENT': { name: 'clinica_lembrete_consulta', language: 'pt_BR', body: 'Olá {{patient_name}}, sua consulta está agendada para {{date}} às {{time}}.' },
            'CLINIC_APPOINTMENT_CONFIRMED': { name: 'clinica_consulta_confirmada', language: 'pt_BR', body: 'Olá {{patient_name}}, sua consulta para {{date}} às {{time}} está confirmada.' },
            'CLINIC_APPOINTMENT_CANCELED': { name: 'clinica_consulta_cancelada', language: 'pt_BR', body: 'Olá {{patient_name}}, sua consulta para {{date}} às {{time}} foi cancelada.' },
            'SUPPLIER_UPDATE': { name: 'fornecedor_status_pedido', language: 'pt_PT', body: 'Seu pedido #{{order_id}} foi atualizado para: {{status}}' }
        };

        // Use globalSettings.globalWhatsappTemplates created by SuperAdmin UI
        try {
            const settingsSnap = await this.db.collection('settings').doc('global').get();
            if (settingsSnap.exists) {
                const globalSettings = settingsSnap.data();
                if (globalSettings && globalSettings.globalWhatsappTemplates) {
                    const t = globalSettings.globalWhatsappTemplates.find((tpl: any) => tpl.action === templateType && tpl.active);
                    if (t) {
                        let templateName = (t.metaTemplateName || '').trim();
                        // Se metaTemplateName estiver vazio ou contiver espaços (ex: nome de exibição), usa o padrão oficial da Meta
                        if (!templateName || templateName.includes(' ')) {
                            templateName = defaultTemplates[templateType]?.name || t.action.toLowerCase();
                        }
                        const language = t.language || defaultTemplates[templateType]?.language || (templateName === 'fornecedor_status_pedido' ? 'pt_PT' : 'pt_BR');
                        return { type: 'meta_template', data: { ...t, name: templateName, language } };
                    }
                }
            }
        } catch (e) {
            console.error('Error fetching globalWhatsappTemplates', e);
        }
        
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
