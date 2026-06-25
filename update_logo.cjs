const fs = require('fs');
const filePath = './components/Logo.tsx';
let content = fs.readFileSync(filePath, 'utf8');
content = content.replace(/export const LOGO_BASE64: string = '.*';/g, "export const LOGO_BASE64: string = '';");
fs.writeFileSync(filePath, content);
console.log('Logo configuration updated.');
