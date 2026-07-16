const fs = require('fs');
let code = fs.readFileSync('pages/superadmin/WhatsAppTemplates.tsx', 'utf8');

// Remove the Ycloud Global Config section
const startStr = "{/* Ycloud Global Config */}";
const endStr = "{/* Templates List */}";

if (code.includes(startStr) && code.includes(endStr)) {
  const startIndex = code.indexOf(startStr);
  const endIndex = code.indexOf(endStr);
  code = code.substring(0, startIndex) + code.substring(endIndex);
}

fs.writeFileSync('pages/superadmin/WhatsAppTemplates.tsx', code);
