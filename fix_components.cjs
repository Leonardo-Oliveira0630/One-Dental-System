const fs = require('fs');

let scanner = fs.readFileSync('components/Scanner.tsx', 'utf8');

scanner = scanner.replace(/setNfcParam/g, "processScan");
scanner = scanner.replace(/setScanMode\(false\);/g, "// removed scanMode");
scanner = scanner.replace(/scanMode/g, "isNfcSupported");
scanner = scanner.replace(/activeTab/g, "isNfcSupported");

fs.writeFileSync('components/Scanner.tsx', scanner);
