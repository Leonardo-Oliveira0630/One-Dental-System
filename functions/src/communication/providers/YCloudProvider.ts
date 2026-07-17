import axios from 'axios';
import { ICommunicationProvider } from '../interfaces/ICommunicationProvider';
import * as logger from "firebase-functions/logger";

export class YCloudProvider implements ICommunicationProvider {
  name = 'YCloud';

  async sendMessage(channelConfig: any, to: string, message: string): Promise<any> {
    const { apiKey, phoneNumber } = channelConfig;
    if (!apiKey) {
        throw new Error('YCloud Provider requires system apiKey');
    }
    if (!phoneNumber) {
        throw new Error('YCloud Provider requires phoneNumber in channelConfig for the tenant');
    }

    const payload = {
        from: phoneNumber, // YCloud requires specifying the sender if you have multiple
        to: to,
        type: 'text',
        text: { body: message }
    };

    const response = await axios.post('https://api.ycloud.com/v2/whatsapp/messages', payload, {
        headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
        }
    });

    return response.data;
  }

  async sendTemplate(channelConfig: any, to: string, template: any, variables: any): Promise<any> {
    const { apiKey, phoneNumber } = channelConfig;
    if (!apiKey) {
        throw new Error('YCloud Provider requires system apiKey');
    }
    if (!phoneNumber) {
        throw new Error('YCloud Provider requires phoneNumber in channelConfig for the tenant');
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

    const payload = {
        from: phoneNumber,
        to: to,
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

    logger.info(`Sending YCloud Template ${template.name} from ${phoneNumber} to ${to}`);
    const response = await axios.post('https://api.ycloud.com/v2/whatsapp/messages', payload, {
        headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
        }
    });

    return response.data;
  }

  async receiveWebhook(payload: any): Promise<any> {
      return payload;
  }
}
