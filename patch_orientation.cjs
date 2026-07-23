const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

const target1 = `                  const videoConstraints: MediaTrackConstraints = selectedCameraId 
                    ? { deviceId: { exact: selectedCameraId } }
                    : { facingMode: 'environment' };`;

const replacement1 = `                  const isPortrait = window.innerHeight > window.innerWidth;
                  const idealWidth = isPortrait ? 1080 : 1920;
                  const idealHeight = isPortrait ? 1920 : 1080;

                  const videoConstraints: MediaTrackConstraints = selectedCameraId 
                    ? { deviceId: { exact: selectedCameraId }, width: { ideal: idealWidth }, height: { ideal: idealHeight } }
                    : { facingMode: 'environment', width: { ideal: idealWidth }, height: { ideal: idealHeight } };`;

if (code.includes(target1)) {
    code = code.replace(target1, replacement1);
    fs.writeFileSync('components/Scanner.tsx', code);
    console.log("Patched constraints for orientation");
} else {
    console.log("Could not find constraints target");
}
