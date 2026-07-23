const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

const target = `                      // Check for torch support after starting
                      const stream = videoRef.current.srcObject as MediaStream;
                      const track = stream?.getVideoTracks()[0];
                      if (track) {
                        const capabilities = track.getCapabilities() as any;
                        if (capabilities.torch) {
                          // Torch is supported
                        }
                      }`;

const replacement = `                      // Check for torch support and zoom after starting
                      const stream = videoRef.current.srcObject as MediaStream;
                      const track = stream?.getVideoTracks()[0];
                      if (track) {
                        try {
                            const capabilities = track.getCapabilities() as any;
                            // Configurar zoom para melhorar a leitura de códigos
                            if (capabilities.zoom) {
                                const maxZoom = capabilities.zoom.max;
                                const targetZoom = Math.min(2.5, maxZoom); // Define um zoom 2.5x se suportado
                                track.applyConstraints({
                                    advanced: [{ zoom: targetZoom }]
                                }).catch(e => console.log("Erro ao aplicar zoom:", e));
                            }
                            if (capabilities.torch) {
                              // Torch is supported
                            }
                        } catch (e) {
                            console.log("Capabilities error", e);
                        }
                      }`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('components/Scanner.tsx', code);
    console.log("Patched Scanner.tsx with zoom capability");
} else {
    console.log("Could not find the target text.");
}
