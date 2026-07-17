export interface ICommunicationProvider {
  name: string;
  sendMessage(channelConfig: any, to: string, message: string): Promise<any>;
  sendTemplate(channelConfig: any, to: string, template: any, variables: any): Promise<any>;
  receiveWebhook(payload: any): Promise<any>;
}
