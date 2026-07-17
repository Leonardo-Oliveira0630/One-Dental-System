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
        var _a;
        const snapshot = await this.db.collection('communication_channels')
            .where('orgId', '==', orgId)
            .where('status', '==', 'ACTIVE')
            .limit(1)
            .get();
        if (snapshot.empty) {
            throw new Error(`No active communication channel found for org ${orgId}`);
        }
        const data = snapshot.docs[0].data();
        let systemApiKey = process.env.YCLOUD_API_KEY || '';
        if (!systemApiKey) {
            try {
                const settingsSnap = await this.db.collection('settings').doc('global').get();
                if (settingsSnap.exists) {
                    systemApiKey = ((_a = settingsSnap.data()) === null || _a === void 0 ? void 0 : _a.ycloudApiKey) || '';
                }
            }
            catch (e) {
                console.error("Could not fetch global settings for YCloud API key", e);
            }
        }
        return Object.assign(Object.assign({}, data), { apiKey: systemApiKey, id: snapshot.docs[0].id });
    }
    async getTemplate(orgId, module, templateType) {
        // Try to find a Meta template in message_templates
        let snapshot = await this.db.collection('message_templates')
            .where('orgId', '==', orgId)
            .where('module', '==', module)
            .where('type', '==', templateType)
            .where('status', '==', 'APPROVED')
            .limit(1)
            .get();
        if (!snapshot.empty) {
            return { type: 'meta_template', data: Object.assign({ id: snapshot.docs[0].id }, snapshot.docs[0].data()) };
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
            return { type: 'meta_template', data: Object.assign({ id: snapshot.docs[0].id }, snapshot.docs[0].data()) };
        }
        // Fallback to globalSettings.globalWhatsappTemplates created by SuperAdmin UI
        try {
            const settingsSnap = await this.db.collection('settings').doc('global').get();
            if (settingsSnap.exists) {
                const globalSettings = settingsSnap.data();
                if (globalSettings && globalSettings.globalWhatsappTemplates) {
                    const t = globalSettings.globalWhatsappTemplates.find((tpl) => tpl.action === templateType && tpl.active);
                    if (t) {
                        return { type: 'text_template', data: t };
                    }
                }
            }
        }
        catch (e) {
            console.error('Error fetching globalWhatsappTemplates', e);
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