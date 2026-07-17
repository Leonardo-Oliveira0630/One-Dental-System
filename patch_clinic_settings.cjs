const fs = require('fs');
let content = fs.readFileSync('pages/clinic/ClinicSettings.tsx', 'utf8');

// Add import
if (!content.includes('import { WhatsAppChannelSettings }')) {
    content = content.replace(
        "import { WhatsAppTemplatesEditor }",
        "import { WhatsAppChannelSettings } from '../../components/WhatsAppChannelSettings';\nimport { WhatsAppTemplatesEditor }"
    );
}

// Add tab option
content = content.replace(
    /<button\n\s*onClick=\{\(\) => setActiveTab\('SUBSCRIPTION'\)\}/,
    `<button
            onClick={() => setActiveTab('WHATSAPP')}
            className={\`px-4 py-2 text-sm font-medium \${
              activeTab === 'WHATSAPP'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }\`}
          >
            WhatsApp
          </button>\n          <button\n            onClick={() => setActiveTab('SUBSCRIPTION')}`
);

// Add tab content
const whatsappTabContent = `
        {activeTab === 'WHATSAPP' && currentOrg && (
          <div className="space-y-6">
            <WhatsAppChannelSettings orgId={currentOrg.id} />
          </div>
        )}
`;

content = content.replace(
    /\{activeTab === 'SUBSCRIPTION' && \(/,
    whatsappTabContent + "\n        {activeTab === 'SUBSCRIPTION' && ("
);

fs.writeFileSync('pages/clinic/ClinicSettings.tsx', content);
