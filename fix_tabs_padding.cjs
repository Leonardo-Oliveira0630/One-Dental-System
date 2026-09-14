const fs = require('fs');
let content = fs.readFileSync('pages/lab/Inventory.tsx', 'utf8');

content = content.replace(
    /px-6 py-3 font-bold text-sm tracking-wide transition-all border-b-2/g,
    'px-4 sm:px-6 py-3 font-bold text-xs sm:text-sm tracking-wide transition-all border-b-2'
);

content = content.replace(
    /overflow-x-auto whitespace-nowrap/g,
    'overflow-x-auto whitespace-nowrap scrollbar-hide'
);

fs.writeFileSync('pages/lab/Inventory.tsx', content);
console.log('Fixed tabs padding');
