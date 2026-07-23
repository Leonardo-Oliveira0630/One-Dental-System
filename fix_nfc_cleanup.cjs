const fs = require('fs');
let code = fs.readFileSync('pages/NFCReader.tsx', 'utf8');

code = code.replace(
    'return () => clearTimeout(timeoutId);',
    `return () => {
                clearTimeout(timeoutId);
                channel.close();
            };`
);

fs.writeFileSync('pages/NFCReader.tsx', code);
