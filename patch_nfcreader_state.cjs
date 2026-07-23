const fs = require('fs');
let code = fs.readFileSync('pages/NFCReader.tsx', 'utf8');

code = code.replace(
    "navigate('/dashboard', { replace: true });",
    "navigate('/dashboard', { replace: true, state: { nfcScanCode: boxNumber.trim() } });"
);

fs.writeFileSync('pages/NFCReader.tsx', code);
