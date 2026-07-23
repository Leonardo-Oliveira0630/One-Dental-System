const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

const target = `  useEffect(() => {
      let isMounted = true;
      let reader: BrowserMultiFormatReader | null = null;

      if (isCameraActive && videoRef.current) {
          const hints = new Map();`;

const replacement = `  useEffect(() => {
      let isMounted = true;
      let reader: BrowserMultiFormatReader | null = null;

      if (isCameraActive && videoRef.current) {
          if (cameras.length === 0) return; // wait for cameras to load
          const hints = new Map();`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('components/Scanner.tsx', code);
    console.log("Patched Scanner.tsx to wait for cameras");
} else {
    console.log("Could not find the target text.");
}
