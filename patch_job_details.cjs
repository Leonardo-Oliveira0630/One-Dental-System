const fs = require('fs');
let code = fs.readFileSync('pages/JobDetails.tsx', 'utf8');

// The div we want to replace
const targetDiv = '<div className="flex flex-wrap gap-2 flex-1 lg:justify-end">';
const newDiv = '<div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 flex-1 lg:justify-end w-full">';

code = code.replace(targetDiv, newDiv);

// On all these buttons, they currently have "flex-1 xs:flex-none". Let's change them to just "w-full sm:w-auto"
code = code.replace(/className="flex-1 xs:flex-none /g, 'className="w-full sm:w-auto ');

fs.writeFileSync('pages/JobDetails.tsx', code);
console.log("Patched JobDetails.tsx");
