const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

const target = `} else {
            console.warn(\`[Scanner] Trabalho não encontrado para o código: \${cleanedCode}\`);
            await playNativeHaptic(false);
            playBeep(false);
            // Opcional: mostrar um feedback visual temporário de "Não encontrado"
        }`;

const replacement = `} else {
            console.warn(\`[Scanner] Trabalho não encontrado para o código: \${cleanedCode}\`);
            await playNativeHaptic(false);
            playBeep(false);
            alert(\`Nenhuma Ordem de Serviço encontrada com a caixa ou ID: "\${rawCode}"\`);
            // Opcional: mostrar um feedback visual temporário de "Não encontrado"
        }`;

code = code.replace(target, replacement);

fs.writeFileSync('components/Scanner.tsx', code);
console.log("Alert restored");
