const fs = require('fs');

let content = fs.readFileSync('functions/src/index.ts', 'utf8');

const webhookCode = `
import { communicationWebhook } from './communication/webhook';
export const communication = {
    webhook: communicationWebhook
};
`;

content = content + '\n' + webhookCode;
fs.writeFileSync('functions/src/index.ts', content);
