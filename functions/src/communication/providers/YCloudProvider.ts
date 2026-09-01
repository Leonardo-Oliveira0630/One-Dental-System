import axios from 'axios';
import { ICommunicationProvider } from '../interfaces/ICommunicationProvider';
import * as logger from "firebase-functions/logger";

function formatE164(phone: string): string {
  if (!phone) return '';
  let clean = phone.replace(/\D/g, '');
  if (clean.length === 10 || clean.length === 11) {
    clean = '55' + clean;
  }
  return '+' + clean;
}

export class YCloudProvider implements ICommunicationProvider {
  name = 'YCloud';

  async sendMessage(channelConfig: any, to: string, message: string): Promise<any> {
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
    const payload: any = {
        to: cleanTo,
        type: 'text',
        text: { body: message }
    };
    if (cleanFrom && cleanFrom.length >= 8) {
        payload.from = cleanFrom;
    }

    try {
      const response = await axios.post('https://api.ycloud.com/v2/whatsapp/messages', payload, {
          headers: {
              'X-API-Key': apiKey,
              'Content-Type': 'application/json',
          }
      });
      return response.data;
    } catch (error: any) {
      const errorData = error.response?.data;
      const apiErr = errorData?.error?.message || errorData?.message || error.message;
      if (payload.from && (error.response?.status === 403 || error.response?.status === 409 || apiErr.includes('has not been registered') || apiErr.includes('not been registered'))) {
        logger.warn(`[YCloudProvider] Remetente ${payload.from} rejeitado (${apiErr}), tentando enviar sem 'from'...`);
        delete payload.from;
        try {
          const retryResponse = await axios.post('https://api.ycloud.com/v2/whatsapp/messages', payload, {
              headers: {
                  'X-API-Key': apiKey,
                  'Content-Type': 'application/json',
              }
          });
          return retryResponse.data;
        } catch (retryError: any) {
          error = retryError;
        }
      }

      const status = error.response?.status;
      const finalErrorData = error.response?.data;
      const finalApiErr = finalErrorData?.error?.message || finalErrorData?.message || error.message;
      const errorTarget = finalErrorData?.error?.target || '';

      let friendlyMessage = `Erro Ycloud (${status || 'API'}): ${finalApiErr}${errorTarget ? ` [target: ${errorTarget}]` : ''}`;
      if (status === 409) {
        friendlyMessage = `Erro Ycloud 409: O número de remetente ${cleanFrom} não está registrado na sua conta Ycloud WABA. Detalhes: ${finalApiErr}`;
      } else if (status === 403) {
        friendlyMessage = `Erro Ycloud 403: Envio de mensagem livre bloqueado fora da janela de 24h. Detalhes: ${finalApiErr}`;
      } else if (status === 400) {
        friendlyMessage = `Erro Ycloud 400 (Parâmetro Inválido/Ausente): ${finalApiErr}${errorTarget ? ` (Campo: ${errorTarget})` : ''}. Verifique o número de telefone e as configurações.`;
      }
      logger.error("[YCloudProvider.sendMessage]", friendlyMessage, finalErrorData);
      throw new Error(friendlyMessage);
    }
  }

  async sendTemplate(channelConfig: any, to: string, template: any, variables: any): Promise<any> {
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

    let components: any[] = [];
    if (variables && Object.keys(variables).length > 0) {
        let bodyParameters: any[] = [];
        for (const [, value] of Object.entries(variables)) {
             let safeValue = value !== undefined && value !== null ? String(value) : '-';
             if (safeValue.trim() === '') safeValue = '-';
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

    const payload: any = {
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
      const response = await axios.post('https://api.ycloud.com/v2/whatsapp/messages', payload, {
          headers: {
              'X-API-Key': apiKey,
              'Content-Type': 'application/json',
          }
      });
      return response.data;
    } catch (error: any) {
      const errorData = error.response?.data;
      const apiErr = errorData?.error?.message || errorData?.message || error.message;
      if (payload.from && (error.response?.status === 403 || error.response?.status === 409 || apiErr.includes('has not been registered') || apiErr.includes('not been registered'))) {
        logger.warn(`[YCloudProvider] Remetente ${payload.from} rejeitado (${apiErr}), tentando enviar template sem 'from'...`);
        delete payload.from;
        try {
          const retryResponse = await axios.post('https://api.ycloud.com/v2/whatsapp/messages', payload, {
              headers: {
                  'X-API-Key': apiKey,
                  'Content-Type': 'application/json',
              }
          });
          return retryResponse.data;
        } catch (retryError: any) {
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
        const textPayload: any = {
            to: cleanTo,
            type: 'text',
            text: { body: textBody }
        };
        try {
            const textResponse = await axios.post('https://api.ycloud.com/v2/whatsapp/messages', textPayload, {
                headers: {
                    'X-API-Key': apiKey,
                    'Content-Type': 'application/json',
                }
            });
            logger.info(`[YCloudProvider] Mensagem enviada com sucesso via fallback de texto! ID: ${textResponse.data?.id}`);
            return textResponse.data;
        } catch (textErr: any) {
            logger.error("[YCloudProvider] Fallback de texto também falhou:", textErr.response?.data || textErr.message);
        }
      }

      const status = error.response?.status;
      const finalErrorData = error.response?.data;
      const finalApiErr = finalErrorData?.error?.message || finalErrorData?.message || error.message;
      const errorCode = finalErrorData?.error?.code || error.code || '';
      
      let friendlyMessage = `Erro Ycloud (${status || 'API'} - ${errorCode}): ${finalApiErr}`;
      if (status === 409) {
        friendlyMessage = `Erro Ycloud 409: O número de remetente ${cleanFrom || 'configurado'} não está registrado na sua conta Ycloud WABA. Detalhes: ${finalApiErr}`;
      } else if (status === 403) {
        friendlyMessage = `Erro Ycloud 403: O modelo "${template.name}" não foi encontrado na conta/WABA do remetente, ou as variáveis não coincidem, ou a conta Meta está com pendência. Detalhe da Meta: ${finalApiErr}`;
      }
      logger.error("[YCloudProvider.sendTemplate]", friendlyMessage, { errorData: finalErrorData, payload });
      throw new Error(friendlyMessage);
    }
  }

  async receiveWebhook(payload: any): Promise<any> {
      return payload;
  }
}
