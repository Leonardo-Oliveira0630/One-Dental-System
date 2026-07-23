const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

const targetConstraint = `                  const videoConstraints: MediaTrackConstraints = {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                  };`;

const replaceConstraint = `                  const videoConstraints: MediaTrackConstraints = {
                    facingMode: 'environment',
                    width: { ideal: 1920, min: 1280 },
                    height: { ideal: 1080, min: 720 }
                  };`;

const targetZoom = `const targetZoom = Math.min(2.5, maxZoom); // Define um zoom 2.5x se suportado`;
const replaceZoom = `const targetZoom = Math.min(3.5, maxZoom); // Define um zoom 3.5x para câmera cropada`;

if (code.includes(targetConstraint)) {
    code = code.replace(targetConstraint, replaceConstraint);
    code = code.replace(targetZoom, replaceZoom);
    fs.writeFileSync('components/Scanner.tsx', code);
    console.log("Patched Scanner.tsx with higher res and zoom");
} else {
    console.log("Could not find the target text in Scanner.");
}
