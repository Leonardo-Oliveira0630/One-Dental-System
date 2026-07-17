const fs = require('fs');
let content = fs.readFileSync('components/WhatsAppTemplatesEditor.tsx', 'utf8');

// Replace state variables
content = content.replace(/const \[ycloudPhoneNumber, setYcloudPhoneNumber\].*?\n/, '');
content = content.replace(/const \[ycloudApiKey, setYcloudApiKey\].*?\n/, '');

// Remove saveYcloudSettings
const funcStart = content.indexOf('const saveYcloudSettings = async () => {');
if (funcStart !== -1) {
    let bracketCount = 0;
    let funcEnd = -1;
    let started = false;
    for (let i = funcStart; i < content.length; i++) {
        if (content[i] === '{') {
            bracketCount++;
            started = true;
        } else if (content[i] === '}') {
            bracketCount--;
        }
        if (started && bracketCount === 0) {
            funcEnd = i;
            break;
        }
    }
    if (funcEnd !== -1) {
        content = content.substring(0, funcStart) + content.substring(funcEnd + 1);
    }
}

fs.writeFileSync('components/WhatsAppTemplatesEditor.tsx', content);
