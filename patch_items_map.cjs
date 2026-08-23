const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

code = code.replace(/scannedJob\.items\.map/g, "(scannedJob.items || []).map");
code = code.replace(/scannedJob\.items\.length/g, "(scannedJob.items || []).length");
code = code.replace(/currentJob\.items\.map/g, "(currentJob.items || []).map");
code = code.replace(/currentJob\.items\.length/g, "(currentJob.items || []).length");

fs.writeFileSync('components/Scanner.tsx', code);
