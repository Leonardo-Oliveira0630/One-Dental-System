const fs = require('fs');
let content = fs.readFileSync('components/WhatsAppTemplatesEditor.tsx', 'utf8');

// The file had: const [ycloudPhoneNumber, setYcloudPhoneNumber] = useState(currentOrg.ycloudPhoneNumber || '');
// Let's remove the YCloud config section from the UI since it is now handled by WhatsAppChannelSettings

// Simple regex to remove the YCloud UI section
content = content.replace(
    /<div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">[\s\S]*?<\/div>\s*<div className="flex justify-between items-center mb-6">/m,
    '<div className="flex justify-between items-center mb-6">'
);

fs.writeFileSync('components/WhatsAppTemplatesEditor.tsx', content);
