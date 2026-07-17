const fs = require('fs');
let content = fs.readFileSync('functions/src/index.ts', 'utf8');

const startStr = 'async function getTemplateAndSend(orgId: string, type: string, variables: Record<string, string>, toNumber: string) {';
const startIdx = content.indexOf(startStr);

if (startIdx !== -1) {
    let bracketCount = 0;
    let endIdx = -1;
    let started = false;
    
    for (let i = startIdx; i < content.length; i++) {
        if (content[i] === '{') {
            bracketCount++;
            started = true;
        } else if (content[i] === '}') {
            bracketCount--;
        }
        
        if (started && bracketCount === 0) {
            endIdx = i;
            break;
        }
    }
    
    if (endIdx !== -1) {
        content = content.substring(0, startIdx) + content.substring(endIdx + 1);
        fs.writeFileSync('functions/src/index.ts', content);
        console.log("Removed getTemplateAndSend");
    }
} else {
    console.log("getTemplateAndSend not found");
}
