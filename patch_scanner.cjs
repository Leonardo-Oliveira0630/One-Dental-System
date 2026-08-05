const fs = require('fs');
let content = fs.readFileSync('components/Scanner.tsx', 'utf-8');

const targetStr = `                  if (openMovement && (openMovement.plannedItems?.length > 0 || Object.keys(openMovement.plannedStages || {}).length > 0)) {`;
const replaceStr = `                  if (openMovement && ((openMovement.plannedItems && openMovement.plannedItems.length > 0) || Object.keys(openMovement.plannedStages || {}).length > 0)) {`;

content = content.replace(targetStr, replaceStr);
fs.writeFileSync('components/Scanner.tsx', content);
console.log('Patched Scanner.tsx');
