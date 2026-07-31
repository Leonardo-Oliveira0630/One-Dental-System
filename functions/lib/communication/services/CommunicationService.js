"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunicationService = void 0;
const admin = __importStar(require("firebase-admin"));
const YCloudProvider_1 = require("../providers/YCloudProvider");
class CommunicationService {
    constructor() {
        this.db = admin.firestore();
        this.providers = new Map();
        this.registerProvider(new YCloudProvider_1.YCloudProvider());
    }
    registerProvider(provider) {
        this.providers.set(provider.name, provider);
    }
    async getChannelConfig(orgId) {
        let channelConfig = null;
        let systemApiKey = process.env.YCLOUD_API_KEY || '';
        let systemPhoneNumber = process.env.YCLOUD_PHONE_NUMBER || '';
        try {
            const settingsSnap = await this.db.collection('settings').doc('global').get();
            if (settingsSnap.exists) {
                const globalData = settingsSnap.data();
                if (globalData === null || globalData === void 0 ? void 0 : globalData.ycloudApiKey)
                    systemApiKey = globalData.ycloudApiKey;
                if (globalData === null || globalData === void 0 ? void 0 : globalData.ycloudPhoneNumber)
                    systemPhoneNumber = globalData.ycloudPhoneNumber;
            }
        }
        catch (e) {
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
        }
        else {
            channelConfig = Object.assign(Object.assign({}, snapshot.docs[0].data()), { id: snapshot.docs[0].id });
            // If the org channel is YCloud but doesn't have phone, fallback to system
            if (channelConfig.provider === 'YCloud' && !channelConfig.phoneNumber) {
                channelConfig.phoneNumber = systemPhoneNumber;
            }
        }
        return Object.assign(Object.assign({}, channelConfig), { apiKey: channelConfig.apiKey || systemApiKey });
    }
    async getTemplate(orgId, module, templateType) {
        // Use globalSettings.globalWhatsappTemplates created by SuperAdmin UI
        try {
            const settingsSnap = await this.db.collection('settings').doc('global').get();
            if (settingsSnap.exists) {
                const globalSettings = settingsSnap.data();
                if (globalSettings && globalSettings.globalWhatsappTemplates) {
                    const t = globalSettings.globalWhatsappTemplates.find((tpl) => tpl.action === templateType && tpl.active);
                    if (t) {
                        const templateName = (t.metaTemplateName || t.name || '').trim();
                        if (templateName) {
                            return { type: 'meta_template', data: Object.assign(Object.assign({}, t), { name: templateName }) };
                        }
                        return { type: 'meta_template', data: Object.assign(Object.assign({}, t), { name: t.action.toLowerCase() }) };
                    }
                }
            }
        }
        catch (e) {
            console.error('Error fetching globalWhatsappTemplates', e);
        }
        const defaultTemplates = {
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
    async logMessage(logData) {
        await this.db.collection('message_logs').add(Object.assign(Object.assign({}, logData), { createdAt: admin.firestore.FieldValue.serverTimestamp() }));
    }
    async sendTemplateMessage(orgId, to, module, templateType, variables) {
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
                result = await provider.sendTemplate(channelConfig, cleanPhone, template.data, variables);
            }
            else {
                let textBody = template.data.body;
                if (variables && Object.keys(variables).length > 0) {
                    for (const [key, value] of Object.entries(variables)) {
                        const regex = new RegExp('\\{\\{\\s*' + key + '\\s*\\}\\}', 'g');
                        textBody = textBody.replace(regex, String(value));
                    }
                }
                result = await provider.sendMessage(channelConfig, cleanPhone, textBody);
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
        }
        catch (error) {
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
exports.CommunicationService = CommunicationService;
//# sourceMappingURL=CommunicationService.js.map