const fs = require('fs');
let code = fs.readFileSync('components/PrintOverlay.tsx', 'utf8');

const target = `                      <div className="absolute right-0 top-[-22px] flex flex-col items-end shrink-0">
                          <div className="scale-x-[1.1] origin-top-right">`;

const replacement = `                      <div className="absolute right-0 top-[-22px] flex flex-col items-end shrink-0">
                          <div className="scale-x-[1.3] origin-top-right">`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('components/PrintOverlay.tsx', code);
    console.log("Patched PrintOverlay.tsx to INCREASE barcode width to the left");
} else {
    console.log("Could not find the target text.");
}
