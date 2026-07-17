const fs = require('fs');
let content = fs.readFileSync('pages/supplier/Settings.tsx', 'utf8');

if (!content.includes('import { WhatsAppChannelSettings }')) {
    content = content.replace(
        "import { WhatsAppTemplatesEditor }",
        "import { WhatsAppChannelSettings } from '../../components/WhatsAppChannelSettings';\nimport { WhatsAppTemplatesEditor }"
    );
}

content = content.replace(
    /<WhatsAppTemplatesEditor/g,
    `<WhatsAppChannelSettings orgId={currentOrg.id} />\n            <WhatsAppTemplatesEditor`
);

fs.writeFileSync('pages/supplier/Settings.tsx', content);
