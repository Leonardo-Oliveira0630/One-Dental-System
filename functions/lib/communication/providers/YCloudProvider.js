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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.YCloudProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const logger = __importStar(require("firebase-functions/logger"));
function formatE164(phone) {
    if (!phone)
        return '';
    let clean = phone.replace(/\D/g, '');
    if (clean.length === 10 || clean.length === 11) {
        clean = '55' + clean;
    }
    return '+' + clean;
}
class YCloudProvider {
    constructor() {
        this.name = 'YCloud';
    }
    async sendMessage(channelConfig, to, message) {
        var _a, _b, _c, _d, _e, _f, _g;
        const { apiKey, phoneNumber } = channelConfig;
        if (!apiKey) {
            throw new Error('YCloud Provider: apiKey é obrigatória.');
        }
        const cleanTo = formatE164(to);
        let cleanFrom = phoneNumber ? formatE164(phoneNumber) : undefined;
        // Evita enviar from igual ao destinatário
        if (cleanFrom && cleanFrom === cleanTo) {
            cleanFrom = undefined;
        }
        const payload = {
            to: cleanTo,
            type: 'text',
            text: { body: message }
        };
        if (cleanFrom) {
            payload.from = cleanFrom;
        }
        try {
            const response = await axios_1.default.post('https://api.ycloud.com/v2/whatsapp/messages', payload, {
                headers: {
                    'X-API-Key': apiKey,
                    'Content-Type': 'application/json',
                }
            });
            return response.data;
        }
        catch (error) {
            const status = (_a = error.response) === null || _a === void 0 ? void 0 : _a.status;
            const apiErr = ((_d = (_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.error) === null || _d === void 0 ? void 0 : _d.message) || ((_f = (_e = error.response) === null || _e === void 0 ? void 0 : _e.data) === null || _f === void 0 ? void 0 : _f.message) || error.message;
            let friendlyMessage = `Erro Ycloud (${status || 'API'}): ${apiErr}`;
            if (status === 409) {
                friendlyMessage = `Erro Ycloud 409: O número de remetente ${cleanFrom || 'configurado'} não está registrado na sua conta Ycloud WABA. Verifique a configuração da chave API / número remetente.`;
            }
            else if (status === 403) {
                friendlyMessage = `Erro Ycloud 403: Envio de mensagem livre (texto) bloqueado pela Meta/Ycloud fora da janela de 24 horas do cliente. Cadastre e aprove um Modelo/Template de mensagem no painel do Ycloud/Meta.`;
            }
            logger.error("[YCloudProvider.sendMessage]", friendlyMessage, (_g = error.response) === null || _g === void 0 ? void 0 : _g.data);
            throw new Error(friendlyMessage);
        }
    }
    async sendTemplate(channelConfig, to, template, variables) {
        var _a, _b, _c, _d, _e, _f, _g;
        const { apiKey, phoneNumber } = channelConfig;
        if (!apiKey) {
            throw new Error('YCloud Provider: apiKey é obrigatória.');
        }
        const cleanTo = formatE164(to);
        let cleanFrom = phoneNumber ? formatE164(phoneNumber) : undefined;
        if (cleanFrom && cleanFrom === cleanTo) {
            cleanFrom = undefined;
        }
        let components = [];
        if (variables && Object.keys(variables).length > 0) {
            let bodyParameters = [];
            for (const [, value] of Object.entries(variables)) {
                bodyParameters.push({
                    type: "text",
                    text: String(value)
                });
            }
            components.push({
                type: "body",
                parameters: bodyParameters
            });
        }
        const payload = {
            to: cleanTo,
            type: 'template',
            template: {
                name: template.name,
                language: {
                    policy: "deterministic",
                    code: template.language || "pt_BR"
                },
                components: components.length > 0 ? components : undefined
            }
        };
        if (cleanFrom) {
            payload.from = cleanFrom;
        }
        logger.info(`Sending YCloud Template ${template.name} from ${cleanFrom || 'default'} to ${cleanTo}`);
        try {
            const response = await axios_1.default.post('https://api.ycloud.com/v2/whatsapp/messages', payload, {
                headers: {
                    'X-API-Key': apiKey,
                    'Content-Type': 'application/json',
                }
            });
            return response.data;
        }
        catch (error) {
            const status = (_a = error.response) === null || _a === void 0 ? void 0 : _a.status;
            const apiErr = ((_d = (_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.error) === null || _d === void 0 ? void 0 : _d.message) || ((_f = (_e = error.response) === null || _e === void 0 ? void 0 : _e.data) === null || _f === void 0 ? void 0 : _f.message) || error.message;
            let friendlyMessage = `Erro Ycloud (${status || 'API'}): ${apiErr}`;
            if (status === 409) {
                friendlyMessage = `Erro Ycloud 409: O número de remetente ${cleanFrom || 'configurado'} não está registrado na sua conta Ycloud.`;
            }
            else if (status === 403) {
                friendlyMessage = `Erro Ycloud 403: O modelo de mensagem "${template.name}" não foi encontrado ou ainda não foi aprovado na Meta/Ycloud com o código de idioma pt_BR.`;
            }
            logger.error("[YCloudProvider.sendTemplate]", friendlyMessage, (_g = error.response) === null || _g === void 0 ? void 0 : _g.data);
            throw new Error(friendlyMessage);
        }
    }
    async receiveWebhook(payload) {
        return payload;
    }
}
exports.YCloudProvider = YCloudProvider;
//# sourceMappingURL=YCloudProvider.js.map