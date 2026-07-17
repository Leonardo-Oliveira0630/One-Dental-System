const fs = require('fs');
let content = fs.readFileSync('pages/admin/OrganizationTab.tsx', 'utf8');

// Add import
if (!content.includes('import { WhatsAppChannelSettings }')) {
    content = content.replace(
        "import { WhatsAppTemplatesEditor }",
        "import { WhatsAppChannelSettings } from '../../components/WhatsAppChannelSettings';\nimport { WhatsAppTemplatesEditor }"
    );
}

// Inject component
content = content.replace(
    /<WhatsAppTemplatesEditor/g,
    `<WhatsAppChannelSettings orgId={currentOrg.id} />\n                <WhatsAppTemplatesEditor`
);

fs.writeFileSync('pages/admin/OrganizationTab.tsx', content);
