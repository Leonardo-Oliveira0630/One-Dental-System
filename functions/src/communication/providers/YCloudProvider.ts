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
        throw new Error('YCloud Provider: apiKey é obrigatória.');
    }

    const cleanTo = formatE164(to);
    let cleanFrom = phoneNumber ? formatE164(phoneNumber) : undefined;
    
    // Evita enviar from igual ao destinatário
    if (cleanFrom && cleanFrom === cleanTo) {
      cleanFrom = undefined;
    }

    const payload: any = {
        to: cleanTo,
        type: 'text',
        text: { body: message }
    };

    if (cleanFrom) {
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
      const status = error.response?.status;
      const apiErr = error.response?.data?.error?.message || error.response?.data?.message || error.message;
      
      let friendlyMessage = `Erro Ycloud (${status || 'API'}): ${apiErr}`;
      if (status === 409) {
        friendlyMessage = `Erro Ycloud 409: O número de remetente ${cleanFrom || 'configurado'} não está registrado na sua conta Ycloud WABA. Verifique a configuração da chave API / número remetente.`;
      } else if (status === 403) {
        friendlyMessage = `Erro Ycloud 403: Envio de mensagem livre (texto) bloqueado pela Meta/Ycloud fora da janela de 24 horas do cliente. Cadastre e aprove um Modelo/Template de mensagem no painel do Ycloud/Meta.`;
      }
      logger.error("[YCloudProvider.sendMessage]", friendlyMessage, error.response?.data);
      throw new Error(friendlyMessage);
    }
  }

  async sendTemplate(channelConfig: any, to: string, template: any, variables: any): Promise<any> {
    const { apiKey, phoneNumber } = channelConfig;
    if (!apiKey) {
        throw new Error('YCloud Provider: apiKey é obrigatória.');
    }

    const cleanTo = formatE164(to);
    let cleanFrom = phoneNumber ? formatE164(phoneNumber) : undefined;
    
    if (cleanFrom && cleanFrom === cleanTo) {
      cleanFrom = undefined;
    }

    let components: any[] = [];
    if (variables && Object.keys(variables).length > 0) {
        let bodyParameters: any[] = [];
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

    const payload: any = {
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
      const response = await axios.post('https://api.ycloud.com/v2/whatsapp/messages', payload, {
          headers: {
              'X-API-Key': apiKey,
              'Content-Type': 'application/json',
          }
      });
      return response.data;
    } catch (error: any) {
      const status = error.response?.status;
      const apiErr = error.response?.data?.error?.message || error.response?.data?.message || error.message;
      
      let friendlyMessage = `Erro Ycloud (${status || 'API'}): ${apiErr}`;
      if (status === 409) {
        friendlyMessage = `Erro Ycloud 409: O número de remetente ${cleanFrom || 'configurado'} não está registrado na sua conta Ycloud.`;
      } else if (status === 403) {
        friendlyMessage = `Erro Ycloud 403: O modelo de mensagem "${template.name}" não foi encontrado ou ainda não foi aprovado na Meta/Ycloud com o código de idioma pt_BR.`;
      }
      logger.error("[YCloudProvider.sendTemplate]", friendlyMessage, error.response?.data);
      throw new Error(friendlyMessage);
    }
  }

  async receiveWebhook(payload: any): Promise<any> {
      return payload;
  }
}
