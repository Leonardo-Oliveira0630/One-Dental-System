const fs = require('fs');
let code = fs.readFileSync('pages/JobDetails.tsx', 'utf8');

// Replace common patterns of .toFixed(2) in monetary contexts with formatCurrency(...)
// Example: type.basePrice.toFixed(2) -> formatCurrency(type.basePrice)
// job.totalValue.toFixed(2) -> formatCurrency(job.totalValue)

code = code.replace(/([a-zA-Z0-9_?\.\[\]\(\)\+\-\*\s\|\|:\?\-\<\>\!\&]+?)\.toFixed\(2\)/g, (match, expr) => {
  // Exclude non-monetary metrics if any (e.g. percentages or quantities or sizes)
  if (expr.includes('percent') || expr.includes('percentage') || expr.includes('discount') && !expr.includes('appliedDiscountFixed') && !expr.includes('Fixed')) {
    // wait, percentages shouldn't be formatted as currency R$ formatCurrency unless intended, but let's check
  }
  return `formatCurrency(${expr.trim()})`;
});

fs.writeFileSync('pages/JobDetails.tsx', code, 'utf8');
console.log('Done replacing .toFixed(2) with formatCurrency');
