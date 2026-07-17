const fs = require('fs');
const content = fs.readFileSync('functions/src/index.ts', 'utf8');

const newContent = content.replace(
  'import * as admin from "firebase-admin";\nimport axios from "axios";\nimport { CommunicationService } from "./communication/services/CommunicationService";\nconst communicationService = new CommunicationService();\n\n// Triggers sync 2\nif (admin.apps.length === 0) {\n  admin.initializeApp();\n}',
  'import * as admin from "firebase-admin";\nimport axios from "axios";\n\n// Triggers sync 2\nif (admin.apps.length === 0) {\n  admin.initializeApp();\n}\n\nimport { CommunicationService } from "./communication/services/CommunicationService";\nconst communicationService = new CommunicationService();'
);

fs.writeFileSync('functions/src/index.ts', newContent);
console.log("Patched!");
