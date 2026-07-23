const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');
console.log(code.includes('Html5Qrcode'));
