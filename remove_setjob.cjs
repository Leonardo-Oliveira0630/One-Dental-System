const fs = require('fs');
let content = fs.readFileSync('pages/JobDetails.tsx', 'utf8');

content = content.replace(
    /setJob\(\{[\s\S]*?history: newHistory\s*\}\);/,
    ''
);

fs.writeFileSync('pages/JobDetails.tsx', content);
