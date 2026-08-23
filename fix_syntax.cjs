const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

// Fix the syntax error: osNumber: currentJob.osNumber || 'N/A'), -> osNumber: currentJob.osNumber || 'N/A'
code = code.replace(/osNumber: currentJob\.osNumber \|\| 'N\/A'\),/g, "osNumber: currentJob.osNumber || 'N/A'");

fs.writeFileSync('components/Scanner.tsx', code);
console.log("Syntax fixed");
