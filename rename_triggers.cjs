const fs = require('fs');
let code = fs.readFileSync('functions/src/index.ts', 'utf8');

code = code.replace(/export const onAppointmentCreated =/g, "export const onAppointmentCreatedV2 =");
code = code.replace(/export const onDeliveryRouteUpdated =/g, "export const onDeliveryRouteUpdatedV2 =");
code = code.replace(/export const onSupplierOrderUpdated =/g, "export const onSupplierOrderUpdatedV2 =");
code = code.replace(/export const onJobUpdated =/g, "export const onJobUpdatedV2 =");

fs.writeFileSync('functions/src/index.ts', code);
