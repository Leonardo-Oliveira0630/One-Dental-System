const fs = require('fs');
let code = fs.readFileSync('services/nfcServices.ts', 'utf8');

const badBlockRegex = /  }\s*};\s*window\.addEventListener\('keydown', handleKeyDown, \{ capture: true \}\);\s*return \(\) => \{\s*window\.removeEventListener\('keydown', handleKeyDown, \{ capture: true \}\);\s*\};\s*\}\};/m;

const replacement = `  },
  /**
   * Configura um listener global de teclado para capturar leituras de USB HID
   */
  setupUsbHidListener: (onScan: (uid: string) => void) => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const currentTime = Date.now();
      
      if (currentTime - lastKeyTime > 50) {
        buffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter' && buffer.length >= 4) {
        const uid = buffer.trim();
        if (uid) onScan(uid);
        buffer = '';
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }
};`;

code = code.replace(badBlockRegex, replacement);
fs.writeFileSync('services/nfcServices.ts', code);
