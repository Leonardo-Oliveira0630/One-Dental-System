const fs = require('fs');
let code = fs.readFileSync('components/AlertSystem.tsx', 'utf8');

code = code.replace(/const playBeep = \(time, freq, duration, vol = 0\.2\) => \{/, 'const playBeep = (time: number, freq: number, duration: number, vol: number = 0.2) => {');

fs.writeFileSync('components/AlertSystem.tsx', code);
console.log("Patched AlertSystem.tsx types");
