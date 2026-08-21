const fs = require('fs');

let admin = fs.readFileSync('pages/superadmin/NfcKitsAdmin.tsx', 'utf8');

admin = admin.replace(/getKits/g, "getKitBoxes");
admin = admin.replace(/setupKeyboardScanner/g, "setupUsbHidListener");
admin = admin.replace(/setupUsbHidListener\(\(code\) => \{/g, "setupUsbHidListener((code: string) => {");

fs.writeFileSync('pages/superadmin/NfcKitsAdmin.tsx', admin);
