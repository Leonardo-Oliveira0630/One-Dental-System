const fs = require('fs');
let content = fs.readFileSync('pages/lab/Dentists.tsx', 'utf8');

// We want to allow fixedPrice to be 0, or at least not splice it out
content = content.replace(
    `if (newFixed === 0 && !newCustomPrices[idx].discountPercent) newCustomPrices.splice(idx, 1);`,
    `// if (newFixed === 0 && !newCustomPrices[idx].discountPercent) newCustomPrices.splice(idx, 1);`
);

fs.writeFileSync('pages/lab/Dentists.tsx', content);
