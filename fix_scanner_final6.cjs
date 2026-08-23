const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

// Replace the bad call
code = code.replace(/const comm = calculateItemCommission\(item, user\.id, types, sector, user\.commissionRates\);/g, 
"const jobType = types.find(t => t.id === item.jobTypeId);\n      const comm = calculateItemCommission(item, jobType, user, item.quantity, sector, []);");

// Remove the `if (typeof typeof typeof comm === 'number')` nonsense
code = code.replace(/if \(typeof typeof typeof comm === 'number'\) commission \+= comm;/g, "if (typeof comm === 'number') commission += comm;");

fs.writeFileSync('components/Scanner.tsx', code);
