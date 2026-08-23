const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

code = code.replace(/const handleOpenScanner = \(\) => setIsCameraActive\(true\);\n    window\.addEventListener\('open-scanner', handleOpenScanner\);\n/g, "");

code = code.replace(/window\.removeEventListener\('open-scanner', \(\) => setIsCameraActive\(false\)\); \/\/ Just pass a function or keep a ref if needed\. Wait, we need to pass the same reference\./g, "");

const insertListener = `
    const handleOpenScannerCam = () => setIsCameraActive(true);
    window.addEventListener('open-scanner', handleOpenScannerCam);
`;

const removeListener = `
      window.removeEventListener('open-scanner', handleOpenScannerCam);
`;

code = code.replace(/window\.addEventListener\('keypress', handleKeyPress\);/, "window.addEventListener('keypress', handleKeyPress);" + insertListener);
code = code.replace(/window\.removeEventListener\('keypress', handleKeyPress\);/, "window.removeEventListener('keypress', handleKeyPress);" + removeListener);

fs.writeFileSync('components/Scanner.tsx', code);
