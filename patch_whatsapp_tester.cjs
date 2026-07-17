const fs = require('fs');
let code = fs.readFileSync('pages/superadmin/WhatsAppTemplates.tsx', 'utf8');

// replace the last '</div>\n    </div>\n  );\n};' with '</div>\n      <YcloudTester />\n    </div>\n  );\n};'
code = code.replace(/<\/div>\n\s*<\/div>\n\s*\);\n\};/, '</div>\n      <YcloudTester />\n    </div>\n  );\n};');

fs.writeFileSync('pages/superadmin/WhatsAppTemplates.tsx', code);
console.log('Patched WhatsAppTemplates.tsx');
