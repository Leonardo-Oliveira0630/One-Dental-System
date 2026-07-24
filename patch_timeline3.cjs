const fs = require('fs');
let code = fs.readFileSync('components/ui/timeline-animation.tsx', 'utf8');

code = code.replace(/return \(\s*\{React\.createElement\((.*?)\)\}\s*\)/s, 'return React.createElement($1);');

fs.writeFileSync('components/ui/timeline-animation.tsx', code);
console.log("Patched timeline-animation again");
