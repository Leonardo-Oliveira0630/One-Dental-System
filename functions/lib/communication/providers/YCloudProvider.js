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
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const { apiKey, phoneNumber } = channelConfig;
        if (!apiKey) {
            throw new Error('YCloud Provider: Chave da API (apiKey) não configurada.');
        }
        const cleanTo = formatE164(to);
        if (!cleanTo || cleanTo.length < 8) {
            throw new Error(`YCloud Provider: Número de destinatário (to) inválido: "${to}".`);
        }
        let rawPhone = phoneNumber;
        if (!rawPhone || rawPhone.includes('997544638') || rawPhone.length < 8) {
            rawPhone = '5527997599833';
        }
        const cleanFrom = formatE164(rawPhone);
        const payload = {
            to: cleanTo,
            type: 'text',
            text: { body: message }
        };
        if (cleanFrom && cleanFrom.length >= 8) {
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
            const errorData = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data;
            const apiErr = ((_b = errorData === null || errorData === void 0 ? void 0 : errorData.error) === null || _b === void 0 ? void 0 : _b.message) || (errorData === null || errorData === void 0 ? void 0 : errorData.message) || error.message;
            if (payload.from && (((_c = error.response) === null || _c === void 0 ? void 0 : _c.status) === 403 || ((_d = error.response) === null || _d === void 0 ? void 0 : _d.status) === 409 || apiErr.includes('has not been registered') || apiErr.includes('not been registered'))) {
                logger.warn(`[YCloudProvider] Remetente ${payload.from} rejeitado (${apiErr}), tentando enviar sem 'from'...`);
                delete payload.from;
                try {
                    const retryResponse = await axios_1.default.post('https://api.ycloud.com/v2/whatsapp/messages', payload, {
                        headers: {
                            'X-API-Key': apiKey,
                            'Content-Type': 'application/json',
                        }
                    });
                    return retryResponse.data;
                }
                catch (retryError) {
                    error = retryError;
                }
            }
            const status = (_e = error.response) === null || _e === void 0 ? void 0 : _e.status;
            const finalErrorData = (_f = error.response) === null || _f === void 0 ? void 0 : _f.data;
            const finalApiErr = ((_g = finalErrorData === null || finalErrorData === void 0 ? void 0 : finalErrorData.error) === null || _g === void 0 ? void 0 : _g.message) || (finalErrorData === null || finalErrorData === void 0 ? void 0 : finalErrorData.message) || error.message;
            const errorTarget = ((_h = finalErrorData === null || finalErrorData === void 0 ? void 0 : finalErrorData.error) === null || _h === void 0 ? void 0 : _h.target) || '';
            let friendlyMessage = `Erro Ycloud (${status || 'API'}): ${finalApiErr}${errorTarget ? ` [target: ${errorTarget}]` : ''}`;
            if (status === 409) {
                friendlyMessage = `Erro Ycloud 409: O número de remetente ${cleanFrom} não está registrado na sua conta Ycloud WABA. Detalhes: ${finalApiErr}`;
            }
            else if (status === 403) {
                friendlyMessage = `Erro Ycloud 403: Envio de mensagem livre bloqueado fora da janela de 24h. Detalhes: ${finalApiErr}`;
            }
            else if (status === 400) {
                friendlyMessage = `Erro Ycloud 400 (Parâmetro Inválido/Ausente): ${finalApiErr}${errorTarget ? ` (Campo: ${errorTarget})` : ''}. Verifique o número de telefone e as configurações.`;
            }
            logger.error("[YCloudProvider.sendMessage]", friendlyMessage, finalErrorData);
            throw new Error(friendlyMessage);
        }
    }
    async sendTemplate(channelConfig, to, template, variables) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        const { apiKey, phoneNumber } = channelConfig;
        if (!apiKey) {
            throw new Error('YCloud Provider: Chave da API (apiKey) não configurada.');
        }
        const cleanTo = formatE164(to);
        if (!cleanTo || cleanTo.length < 8) {
            throw new Error(`YCloud Provider: Número de destinatário (to) inválido: "${to}".`);
        }
        let rawPhone = phoneNumber;
        if (!rawPhone || rawPhone.includes('997544638') || rawPhone.length < 8) {
            rawPhone = '5527997599833';
        }
        const cleanFrom = formatE164(rawPhone);
        if (!template || !template.name) {
            throw new Error('YCloud Provider: Nome do template (template.name) ausente.');
        }
        let components = [];
        if (variables && Object.keys(variables).length > 0) {
            let bodyParameters = [];
            for (const [, value] of Object.entries(variables)) {
                let safeValue = value !== undefined && value !== null ? String(value) : '-';
                if (safeValue.trim() === '')
                    safeValue = '-';
                safeValue = safeValue.replace(/\n/g, ' | ');
                bodyParameters.push({
                    type: "text",
                    text: safeValue
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
                    code: template.language || "pt_BR"
                },
                components: components.length > 0 ? components : undefined
            }
        };
        if (cleanFrom && cleanFrom.length >= 8) {
            payload.from = cleanFrom;
        }
        logger.info(`Sending YCloud Template ${template.name} from ${cleanFrom || 'default'} to ${cleanTo}`, { payload });
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
            const errorData = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data;
            const apiErr = ((_b = errorData === null || errorData === void 0 ? void 0 : errorData.error) === null || _b === void 0 ? void 0 : _b.message) || (errorData === null || errorData === void 0 ? void 0 : errorData.message) || error.message;
            if (payload.from && (((_c = error.response) === null || _c === void 0 ? void 0 : _c.status) === 403 || ((_d = error.response) === null || _d === void 0 ? void 0 : _d.status) === 409 || apiErr.includes('has not been registered') || apiErr.includes('not been registered'))) {
                logger.warn(`[YCloudProvider] Remetente ${payload.from} rejeitado (${apiErr}), tentando enviar template sem 'from'...`);
                delete payload.from;
                try {
                    const retryResponse = await axios_1.default.post('https://api.ycloud.com/v2/whatsapp/messages', payload, {
                        headers: {
                            'X-API-Key': apiKey,
                            'Content-Type': 'application/json',
                        }
                    });
                    return retryResponse.data;
                }
                catch (retryError) {
                    error = retryError;
                }
            }
            // Fallback to text message if template fails
            if (template && template.body) {
                logger.warn(`[YCloudProvider] Falha ao enviar template ${template.name}, tentando enviar como mensagem de texto...`);
                let textBody = template.body;
                if (variables && Object.keys(variables).length > 0) {
                    for (const [key, value] of Object.entries(variables)) {
                        const regex = new RegExp('\\{\\{\\s*' + key + '\\s*\\}\\}', 'g');
                        textBody = textBody.replace(regex, value !== undefined && value !== null ? String(value) : '-');
                    }
                }
                const textPayload = {
                    to: cleanTo,
                    type: 'text',
                    text: { body: textBody }
                };
                try {
                    const textResponse = await axios_1.default.post('https://api.ycloud.com/v2/whatsapp/messages', textPayload, {
                        headers: {
                            'X-API-Key': apiKey,
                            'Content-Type': 'application/json',
                        }
                    });
                    logger.info(`[YCloudProvider] Mensagem enviada com sucesso via fallback de texto! ID: ${(_e = textResponse.data) === null || _e === void 0 ? void 0 : _e.id}`);
                    return textResponse.data;
                }
                catch (textErr) {
                    logger.error("[YCloudProvider] Fallback de texto também falhou:", ((_f = textErr.response) === null || _f === void 0 ? void 0 : _f.data) || textErr.message);
                }
            }
            const status = (_g = error.response) === null || _g === void 0 ? void 0 : _g.status;
            const finalErrorData = (_h = error.response) === null || _h === void 0 ? void 0 : _h.data;
            const finalApiErr = ((_j = finalErrorData === null || finalErrorData === void 0 ? void 0 : finalErrorData.error) === null || _j === void 0 ? void 0 : _j.message) || (finalErrorData === null || finalErrorData === void 0 ? void 0 : finalErrorData.message) || error.message;
            const errorCode = ((_k = finalErrorData === null || finalErrorData === void 0 ? void 0 : finalErrorData.error) === null || _k === void 0 ? void 0 : _k.code) || error.code || '';
            let friendlyMessage = `Erro Ycloud (${status || 'API'} - ${errorCode}): ${finalApiErr}`;
            if (status === 409) {
                friendlyMessage = `Erro Ycloud 409: O número de remetente ${cleanFrom || 'configurado'} não está registrado na sua conta Ycloud WABA. Detalhes: ${finalApiErr}`;
            }
            else if (status === 403) {
                friendlyMessage = `Erro Ycloud 403: O modelo "${template.name}" não foi encontrado na conta/WABA do remetente, ou as variáveis não coincidem, ou a conta Meta está com pendência. Detalhe da Meta: ${finalApiErr}`;
            }
            logger.error("[YCloudProvider.sendTemplate]", friendlyMessage, { errorData: finalErrorData, payload });
            throw new Error(friendlyMessage);
        }
    }
    async receiveWebhook(payload) {
        return payload;
    }
}
exports.YCloudProvider = YCloudProvider;
//# sourceMappingURL=YCloudProvider.js.map