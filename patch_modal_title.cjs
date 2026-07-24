const fs = require('fs');
let code = fs.readFileSync('components/PrintOverlay.tsx', 'utf8');

const target = `Modo: {printData.mode === 'SHEET' ? 'Ficha A4 (Meia Folha)' : printData.mode === 'LABEL' ? 'Etiqueta Térmica' : printData.mode === 'ADDRESS_LABEL' ? 'Etiqueta de Endereço' : 'Roteiro de Rota'}`;

const replacement = `Modo: {printData.mode === 'SHEET' ? 'Ficha Interna (A4 Meia Folha)' : printData.mode === 'INVOICE_SHEET' ? 'Ficha de Entrega (A4 Inteira)' : printData.mode === 'LABEL' ? 'Etiqueta Térmica' : printData.mode === 'ADDRESS_LABEL' ? 'Etiqueta de Endereço' : 'Roteiro de Rota'}`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('components/PrintOverlay.tsx', code);
    console.log("Patched modal title");
} else {
    console.log("Could not find modal title target");
}
