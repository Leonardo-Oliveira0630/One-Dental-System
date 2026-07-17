const fs = require('fs');
const content = fs.readFileSync('functions/src/index.ts', 'utf8');

const start = content.indexOf('export const triggerAppointmentCreated = onDocumentCreated');
const end = content.indexOf('export const triggerDeliveryRouteUpdated');

console.log(content.substring(start, end));
