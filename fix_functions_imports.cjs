const fs = require('fs');
let content = fs.readFileSync('functions/src/index.ts', 'utf8');

content = content.replace(
    /import \{ CommunicationService \} from "\.\/communication";/g,
    'import { CommunicationService } from "./communication/services/CommunicationService";'
);

fs.writeFileSync('functions/src/index.ts', content);
