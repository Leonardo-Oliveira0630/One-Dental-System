const fs = require('fs');
let code = fs.readFileSync('functions/src/index.ts', 'utf8');

code = code.replace(/export const onAppointmentCreatedV2 =/g, "export const triggerAppointmentCreated =");
code = code.replace(/export const onDeliveryRouteUpdatedV2 =/g, "export const triggerDeliveryRouteUpdated =");
code = code.replace(/export const onSupplierOrderUpdatedV2 =/g, "export const triggerSupplierOrderUpdated =");
code = code.replace(/export const onJobUpdatedV2 =/g, "export const triggerJobUpdated =");

fs.writeFileSync('functions/src/index.ts', code);
