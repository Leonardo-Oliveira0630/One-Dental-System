const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

const targetConstraint1 = `{ deviceId: { exact: selectedCameraId }, width: { ideal: 1920, min: 1280 }, height: { ideal: 1080, min: 720 } }`;
const replacementConstraint1 = `{ deviceId: { exact: selectedCameraId }, width: { ideal: 4096 }, height: { ideal: 2160 } }`;

const targetConstraint2 = `{ facingMode: 'environment', width: { ideal: 1920, min: 1280 }, height: { ideal: 1080, min: 720 } }`;
const replacementConstraint2 = `{ facingMode: 'environment', width: { ideal: 4096 }, height: { ideal: 2160 } }`;

if (code.includes(targetConstraint1) && code.includes(targetConstraint2)) {
    code = code.replace(targetConstraint1, replacementConstraint1);
    code = code.replace(targetConstraint2, replacementConstraint2);
    fs.writeFileSync('components/Scanner.tsx', code);
    console.log("Patched constraints to avoid OverconstrainedError and request highest res");
} else {
    console.log("Could not find constraints");
}
