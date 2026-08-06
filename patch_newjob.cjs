const fs = require('fs');
let content = fs.readFileSync('pages/NewJob.tsx', 'utf8');

// Allow fixedPrice of 0 to be valid
content = content.replace(
    /custom\.fixedPrice \!== undefined && custom\.fixedPrice > 0/g,
    'custom.fixedPrice !== undefined && custom.fixedPrice >= 0'
);

fs.writeFileSync('pages/NewJob.tsx', content);
