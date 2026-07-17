const fs = require('fs');
let content = fs.readFileSync('components/WhatsAppTemplatesEditor.tsx', 'utf8');

const startIdx = content.indexOf('<div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">');
const endMarker = 'Salvar Credenciais YCloud';
const endIdxMarker = content.indexOf(endMarker);
let endIdx = content.indexOf('</div>', endIdxMarker);
// find next </div>
endIdx = content.indexOf('</div>', endIdx + 1);

if (startIdx !== -1 && endIdx !== -1) {
    content = content.substring(0, startIdx) + content.substring(endIdx + 6);
    fs.writeFileSync('components/WhatsAppTemplatesEditor.tsx', content);
    console.log("Replaced");
} else {
    console.log("Not found");
}

