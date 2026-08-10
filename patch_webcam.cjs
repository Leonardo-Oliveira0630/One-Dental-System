const fs = require('fs');
let content = fs.readFileSync('components/WebcamModal.tsx', 'utf-8');

content = content.replace(
    /const file = new File\(\[blob\], \\`capture-\\\$\\{new Date\(\)\.getTime\(\)\\}\.jpg\\`, \{ type: 'image\/jpeg' \}\);/g,
    "const file = new File([blob], `capture-${new Date().getTime()}.jpg`, { type: 'image/jpeg' });"
);

// wait actually it was written as \`capture-\${new Date().getTime()}.jpg\`
content = content.replace(
    "\\`capture-\\\${new Date().getTime()}.jpg\\`",
    "`capture-${new Date().getTime()}.jpg`"
);

fs.writeFileSync('components/WebcamModal.tsx', content);
console.log('Successfully patched WebcamModal.tsx');
