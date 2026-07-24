const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

const injection = `      :root {
        --sat: env(safe-area-inset-top);
        --sar: env(safe-area-inset-right);
        --sab: env(safe-area-inset-bottom);
        --sal: env(safe-area-inset-left);
        --gradient-color: #8350e8;
        --sparkles-color: #8350e8;
      }
      .dark {
        --gradient-color: #8350e8;
        --sparkles-color: #ffffff;
      }`;

code = code.replace(/:root \{\s*--sat: env\(safe-area-inset-top\);\s*--sar: env\(safe-area-inset-right\);\s*--sab: env\(safe-area-inset-bottom\);\s*--sal: env\(safe-area-inset-left\);\s*\}/, injection);
fs.writeFileSync('index.html', code);
console.log("Patched index.html");
