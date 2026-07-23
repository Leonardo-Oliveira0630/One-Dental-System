const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

// Replace the import
if (!code.includes('BarcodeFormat')) {
    code = code.replace(
        "import { BrowserMultiFormatReader } from '@zxing/library';",
        "import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';"
    );
}

// Replace the reader initialization
const oldReader = `const activeReader = new BrowserMultiFormatReader();`;
const newReader = `const hints = new Map();
          // Prioritize CODE_128, EAN_13, and QR_CODE to make scanning significantly faster
          hints.set(DecodeHintType.POSSIBLE_FORMATS, [
              BarcodeFormat.CODE_128,
              BarcodeFormat.QR_CODE,
              BarcodeFormat.EAN_13,
              BarcodeFormat.EAN_8,
              BarcodeFormat.CODE_39
          ]);
          // Add TRY_HARDER hint to improve accuracy
          hints.set(DecodeHintType.TRY_HARDER, true);
          const activeReader = new BrowserMultiFormatReader(hints);
          activeReader.timeBetweenDecodingAttempts = 150; // default is 500ms, decrease to read faster
          `;

if (code.includes(oldReader)) {
    code = code.replace(oldReader, newReader);
    fs.writeFileSync('components/Scanner.tsx', code);
    console.log("Patched scanner for speed");
} else {
    console.log("Could not find old reader initialization.");
}
