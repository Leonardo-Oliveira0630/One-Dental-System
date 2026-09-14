const fs = require('fs');
let content = fs.readFileSync('pages/lab/Inventory.tsx', 'utf8');

content = content.replace(
    /className="flex-1 xl:flex-none justify-center px-4 sm:px-6 py-3 bg-emerald-600 text-white text-sm sm:text-base font-bold rounded-xl hover:bg-emerald-700 shadow-md flex items-center gap-2 whitespace-nowrap"/g,
    'className="w-full sm:flex-1 xl:w-auto justify-center px-4 sm:px-6 py-3 bg-emerald-600 text-white text-sm sm:text-base font-bold rounded-xl hover:bg-emerald-700 shadow-md flex items-center gap-2"'
);

content = content.replace(
    /className="flex-1 xl:flex-none justify-center px-4 sm:px-6 py-3 bg-amber-600 text-white text-sm sm:text-base font-bold rounded-xl hover:bg-amber-700 shadow-md flex items-center gap-2 whitespace-nowrap"/g,
    'className="w-full sm:flex-1 xl:w-auto justify-center px-4 sm:px-6 py-3 bg-amber-600 text-white text-sm sm:text-base font-bold rounded-xl hover:bg-amber-700 shadow-md flex items-center gap-2"'
);

content = content.replace(
    /className="flex-1 xl:flex-none justify-center px-4 sm:px-6 py-3 bg-indigo-600 text-white text-sm sm:text-base font-bold rounded-xl hover:bg-indigo-700 shadow-md flex items-center gap-2 whitespace-nowrap"/g,
    'className="w-full sm:flex-1 xl:w-auto justify-center px-4 sm:px-6 py-3 bg-indigo-600 text-white text-sm sm:text-base font-bold rounded-xl hover:bg-indigo-700 shadow-md flex items-center gap-2"'
);

fs.writeFileSync('pages/lab/Inventory.tsx', content);
console.log('Fixed buttons');
