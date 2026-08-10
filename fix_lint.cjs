const fs = require('fs');
let types = fs.readFileSync('types.ts', 'utf8');

// There are two 'subDentists' in User interface maybe?
// I see in the linter output: types.ts(647,3) and types.ts(654,3)
// Let's remove lines 646 to 655 and just use regex correctly.
// Let's print out lines 640-660 of types.ts to be sure.
console.log(types.split('\n').slice(640, 656).join('\n'));
