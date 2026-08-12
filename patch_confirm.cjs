const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf-8');
code = code.replace(
    "if (!window.confirm(`Confirmar ${actionText} em ${targetName}?`)) return;",
    "// window.confirm removed due to iframe restrictions"
);
fs.writeFileSync('components/Scanner.tsx', code);
