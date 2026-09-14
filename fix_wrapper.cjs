const fs = require('fs');
let content = fs.readFileSync('pages/lab/Inventory.tsx', 'utf8');

content = content.replace(
    /className="px-4 pb-4 sm:px-6 sm:pb-6 md:p-4 sm:p-8 max-w-7xl mx-auto space-y-8 pb-32"/,
    'className="px-3 sm:px-6 md:px-8 py-4 sm:py-8 max-w-7xl mx-auto space-y-6 pb-32 w-full overflow-x-hidden"'
);

fs.writeFileSync('pages/lab/Inventory.tsx', content);
console.log('Fixed wrapper');
