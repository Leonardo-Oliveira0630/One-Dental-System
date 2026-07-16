const fs = require('fs');
let code = fs.readFileSync('pages/superadmin/WhatsAppTemplates.tsx', 'utf8');
code = code.replace(/const handleSaveConfig = async \(\) => \{[\s\S]*?setIsSavingConfig\(false\);\n  \};\n/, "");
code = code.replace(/const \[showApiKey.*?;\n/g, "");
code = code.replace(/const \[ycloudApiKey.*?;\n/g, "");
code = code.replace(/const \[ycloudPhone.*?;\n/g, "");
code = code.replace(/const \[isSavingConfig.*?;\n/g, "");
fs.writeFileSync('pages/superadmin/WhatsAppTemplates.tsx', code);
