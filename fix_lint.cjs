const fs = require('fs');

function fixFile(file) {
    let content = fs.readFileSync(file, 'utf8');
    // Remove all weird zero-width or non-printable chars from the top
    content = content.replace(/\u200B/g, ''); // zero-width space
    
    // Specifically fix the end of the switch statement
    content = content.replace(/};\s*export const/, '};\n\nexport const');
    content = content.replace(/\\n\\nexport const/, '\n\nexport const');
    
    // There might be some control characters before 'export'
    content = content.replace(/}[\s\S]*?export const (Dentists|Finance) = \(\) => {/, '};\n\nexport const $1 = () => {');
    
    fs.writeFileSync(file, content);
}

fixFile('pages/lab/Dentists.tsx');
fixFile('pages/lab/Finance.tsx');
