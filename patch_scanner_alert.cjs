const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

const target = `} else {
            console.warn(\`[Scanner] Trabalho não encontrado para o código: \${cleanedCode}\`);
            await playNativeHaptic(false);
            playBeep(false);`;

const replacement = `} else {
            console.warn(\`[Scanner] Trabalho não encontrado para o código: \${cleanedCode}\`);
            await playNativeHaptic(false);
            playBeep(false);
            alert(\`Nenhuma Ordem de Serviço encontrada com a caixa ou ID: \${rawCode}\`);`;

if (code.includes(target) && !code.includes('alert(\`Nenhuma Ordem de Serviço encontrada com a caixa ou ID:')) {
    code = code.replace(target, replacement);
    fs.writeFileSync('components/Scanner.tsx', code);
    console.log("Scanner alert patched");
}
