const fs = require('fs');
let content = fs.readFileSync('pages/JobsList.tsx', 'utf8');

const target1 = `const JobRow = memo(({ isJobOverdue, 
    job, 
    isClient,`;
const repl1 = `const JobRow = memo(({ isJobOverdue, 
    job, 
    isClient,
    isBudgetMode,`;

const target2 = `    isClient: boolean, 
    isLabStaff: boolean,`;
const repl2 = `    isClient: boolean, 
    isBudgetMode?: boolean,
    isLabStaff: boolean,`;

content = content.replace(target1, repl1);
content = content.replace(target2, repl2);

fs.writeFileSync('pages/JobsList.tsx', content);
console.log('patched JobRow args');
