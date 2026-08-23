const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

code = code.replace(/osNumber: currentJob\.osNumber \|\| 'N\/A'\s*sector: sector/g, "osNumber: currentJob.osNumber || 'N/A',\n                    sector: sector");

fs.writeFileSync('components/Scanner.tsx', code);
