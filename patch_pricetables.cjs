const fs = require('fs');
let content = fs.readFileSync('pages/lab/PriceTables.tsx', 'utf8');

content = content.replace(
    'className="flex items-center justify-between"',
    'className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"'
);

content = content.replace(
    'className="relative w-64"',
    'className="relative w-full sm:w-64"'
);

content = content.replace(
    'className="p-4 sm:p-6 bg-slate-50/50 flex justify-between items-center border-b border-slate-50"',
    'className="p-4 sm:p-6 bg-slate-50/50 flex flex-col sm:flex-row justify-between sm:items-center border-b border-slate-50 gap-4"'
);

content = content.replace(
    'className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50"',
    'className="p-4 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 gap-4"'
);

fs.writeFileSync('pages/lab/PriceTables.tsx', content);
