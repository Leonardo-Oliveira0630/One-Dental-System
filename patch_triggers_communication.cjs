const fs = require('fs');
let content = fs.readFileSync('functions/src/index.ts', 'utf8');

// We also need to add the import for CommunicationService at the top
if (!content.includes('import { CommunicationService }')) {
    content = content.replace('import axios from "axios";', 'import axios from "axios";\nimport { CommunicationService } from "./communication";\nconst communicationService = new CommunicationService();\n');
}

content = content.replace(
    'await getTemplateAndSend(orgId, "CLINIC_APPOINTMENT", {',
    'await communicationService.sendTemplateMessage(orgId, phone, "CLINIC", "CLINIC_APPOINTMENT", {'
);

fs.writeFileSync('functions/src/index.ts', content);
