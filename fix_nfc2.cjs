const fs = require('fs');
let code = fs.readFileSync('services/nfcServices.ts', 'utf8');

const replacement = `  },
  setupUsbHidListener: (onScan: (uid: string) => void) => {
    let buffer = '';
    let lastKeyTime = Date.now();
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 50) buffer = '';
      lastKeyTime = currentTime;
      if (e.key === 'Enter' && buffer.length >= 4) {
        onScan(buffer.trim());
        buffer = '';
      } else if (e.key.length === 1) buffer += e.key;
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }
};
`;

code = code.split('  }\n    \n    };')[0] + "  }\n};\n"; 
// Wait, no. I'll just find the exact index.
const splitStr = "    window.addEventListener('keydown', handleKeyDown, { capture: true });";
if (code.includes(splitStr)) {
   let parts = code.split(splitStr);
   let before = parts[0].trim();
   // remove the extra "};" at the end of before
   if (before.endsWith("};")) {
      before = before.slice(0, -2);
   }
   let finalCode = before + replacement + "\n/**" + parts[1].split("/**")[1];
   fs.writeFileSync('services/nfcServices.ts', finalCode);
   console.log("Fixed manually.");
}
