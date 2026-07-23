const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

const targetUI = `<div className="flex items-center gap-2">
                    <button 
                        onClick={toggleTorch}`;

const replacementUI = `<div className="flex items-center gap-2">
                    {cameras.length > 1 && (
                      <select 
                        className="bg-black/40 border border-white/20 text-white text-[10px] rounded-lg px-2 py-1 outline-none mr-2 max-w-[120px] truncate"
                        value={selectedCameraId || ''}
                        onChange={(e) => setSelectedCameraId(e.target.value)}
                      >
                        {cameras.map(cam => (
                          <option key={cam.deviceId} value={cam.deviceId} className="text-black">{cam.label}</option>
                        ))}
                      </select>
                    )}
                    <button 
                        onClick={toggleTorch}`;

if (code.includes(targetUI)) {
    code = code.replace(targetUI, replacementUI);
    fs.writeFileSync('components/Scanner.tsx', code);
    console.log("Patched Scanner.tsx UI with camera selection");
} else {
    console.log("Could not find the target text in Scanner.");
}
