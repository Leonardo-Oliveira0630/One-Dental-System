const fs = require('fs');
let code = fs.readFileSync('pages/JobDetails.tsx', 'utf8');

code = code.replace(/([a-zA-Z0-9_?\.\[\]\(\)\+\-\*\s\|\|:\?\-\<\>\!\&]+?)\.toFixed\(2\)/g, (match, expr) => {
  return `formatCurrency(${expr.trim()})`;
});

fs.writeFileSync('pages/JobDetails.tsx', code, 'utf8');
console.log('Done replacing .toFixed(2) with formatCurrency');
