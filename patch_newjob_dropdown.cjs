const fs = require('fs');
let content = fs.readFileSync('pages/NewJob.tsx', 'utf-8');

const targetStr = `<div className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">R$ {type.basePrice.toFixed(2)}</div>`;
const replacementStr = `<div className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">R$ {calculateItemPrice(type, [], selectedDentistObj, priceTables).toFixed(2)}</div>`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync('pages/NewJob.tsx', content);
console.log('Patched NewJob dropdown price');
