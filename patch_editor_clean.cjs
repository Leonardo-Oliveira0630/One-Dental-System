const fs = require('fs');
let content = fs.readFileSync('components/WhatsAppTemplatesEditor.tsx', 'utf8');

// Find the start and end of the YCLOUD block
const startComment = '{/* YCLOUD SENDER NUMBER & API KEY */}';
const startIdx = content.indexOf(startComment);
if (startIdx !== -1) {
    let endIdx = content.indexOf('</div>', content.indexOf('<div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">', startIdx) + 50);
    // Let's find the closing tag for the YCloud block.
    // It's followed by `      {/* HEADER */}`
    const nextSection = '{/* HEADER */}';
    const nextIdx = content.indexOf(nextSection);
    
    if (nextIdx !== -1) {
        content = content.substring(0, startIdx) + content.substring(nextIdx);
    }
}

fs.writeFileSync('components/WhatsAppTemplatesEditor.tsx', content);
