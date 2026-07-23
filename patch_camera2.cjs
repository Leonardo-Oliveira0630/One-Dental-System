const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

const target = `                                track.applyConstraints({
                                    advanced: [{ zoom: targetZoom }]
                                }).catch(e => console.log("Erro ao aplicar zoom:", e));`;

const replacement = `                                track.applyConstraints({
                                    advanced: [{ zoom: targetZoom }] as any
                                }).catch(e => console.log("Erro ao aplicar zoom:", e));`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('components/Scanner.tsx', code);
    console.log("Patched Scanner.tsx zoom typescript error");
} else {
    console.log("Could not find the target text.");
}
