const fs = require('fs');

function removeComponent(filePath, componentNames) {
    if (!fs.existsSync(filePath)) return;
    let code = fs.readFileSync(filePath, 'utf8');

    // Remove imports
    componentNames.forEach(comp => {
        const importRegex = new RegExp(`import\\s+\\{\\s*${comp}\\s*\\}\\s+from\\s+['"].*${comp}['"];?\\n?`, 'g');
        code = code.replace(importRegex, '');
    });

    // Remove <WhatsAppTemplatesEditor ... /> completely
    code = code.replace(/\{?\/\*\s*WhatsApp Templates Editor\s*\*\/\s*\}?/g, '');
    code = code.replace(/\{currentOrg\?\.hasWhatsappModule && \(\s*<div className="mt-6">\s*<WhatsAppTemplatesEditor[^>]*\/>\s*<\/div>\s*\)\}/g, '');
    code = code.replace(/<WhatsAppTemplatesEditor[^>]*\/>/g, '');

    // Remove <WhatsAppChannelSettings ... />
    code = code.replace(/<WhatsAppChannelSettings[^>]*\/>/g, '');

    // Remove the {activeTab === 'WHATSAPP' && ... } block
    code = code.replace(/\{activeTab === 'WHATSAPP' && currentOrg && \(\s*<div className="space-y-6">\s*<\/div>\s*\)\}/g, '');

    // Update activeTab definition to exclude WHATSAPP
    code = code.replace(/useState<'INFO' \| 'SUBSCRIPTION' \| 'WHATSAPP'>/g, "useState<'INFO' | 'SUBSCRIPTION'>");

    fs.writeFileSync(filePath, code);
}

const files = [
    'pages/clinic/ClinicSettings.tsx',
    'pages/supplier/Settings.tsx',
    'pages/admin/OrganizationTab.tsx'
];

files.forEach(f => removeComponent(f, ['WhatsAppChannelSettings', 'WhatsAppTemplatesEditor']));

console.log('Removed components from pages.');
