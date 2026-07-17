const fs = require('fs');
let content = fs.readFileSync('functions/src/index.ts', 'utf8');

content = content.replace(
    /await getTemplateAndSend\(orgId, "LAB_DISPATCH", \{/g,
    'await communicationService.sendTemplateMessage(orgId, info.phone, "LAB", "LAB_DISPATCH", {'
);

content = content.replace(
    /await getTemplateAndSend\(after\.supplierId, "SUPPLIER_UPDATE", \{/g,
    'await communicationService.sendTemplateMessage(after.supplierId, customerPhone, "SUPPLIER", "SUPPLIER_UPDATE", {'
);

content = content.replace(
    /await getTemplateAndSend\(orgId, "LAB_DELIVERED", \{/g,
    'await communicationService.sendTemplateMessage(orgId, after.dentistPhone, "LAB", "LAB_DELIVERED", {'
);

fs.writeFileSync('functions/src/index.ts', content);
