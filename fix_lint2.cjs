const fs = require('fs');
let content = fs.readFileSync('pages/lab/Dentists.tsx', 'utf8');

content = content.replace(
    /const existing = customPrices\.find\(p => p\.jobTypeId === type\.id\);/g,
    'const existing = customPrices.find((p: any) => p.jobTypeId === type.id);'
);

fs.writeFileSync('pages/lab/Dentists.tsx', content);
