const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

const targetConstraint1 = `{ deviceId: { exact: selectedCameraId }, width: { ideal: 4096 }, height: { ideal: 2160 } }`;
const replacementConstraint1 = `{ deviceId: { exact: selectedCameraId }, width: { ideal: 1920 }, height: { ideal: 1080 } }`;

const targetConstraint2 = `{ facingMode: 'environment', width: { ideal: 4096 }, height: { ideal: 2160 } }`;
const replacementConstraint2 = `{ facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }`;

if (code.includes(targetConstraint1) && code.includes(targetConstraint2)) {
    code = code.replace(targetConstraint1, replacementConstraint1);
    code = code.replace(targetConstraint2, replacementConstraint2);
    fs.writeFileSync('components/Scanner.tsx', code);
    console.log("Patched constraints back to 1080p for ZXing performance");
} else {
    console.log("Could not find constraints");
}
