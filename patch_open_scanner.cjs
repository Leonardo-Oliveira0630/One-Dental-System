const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

code = code.replace(/window\.addEventListener\('keypress', handleKeyPress\);/,
  `window.addEventListener('keypress', handleKeyPress);
    const handleOpenScanner = () => setIsCameraActive(true);
    window.addEventListener('open-scanner', handleOpenScanner);`);

code = code.replace(/window\.removeEventListener\('keypress', handleKeyPress\);/,
  `window.removeEventListener('keypress', handleKeyPress);
      window.removeEventListener('open-scanner', () => setIsCameraActive(false)); // Just pass a function or keep a ref if needed. Wait, we need to pass the same reference.`);

fs.writeFileSync('components/Scanner.tsx', code);
