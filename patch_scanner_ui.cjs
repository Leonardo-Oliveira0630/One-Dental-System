const fs = require('fs');
const content = fs.readFileSync('components/Scanner.tsx', 'utf-8');

const regex = /\{!isEntry && eligibleItems\.length > 0 && \(\s*<div className="mb-6 space-y-2">\s*<label className="block text-sm font-bold text-slate-700 mb-2">Trabalhos Executados<\/label>/g;

const replacement = `{eligibleItems.length > 0 && (
            <div className="mb-6 space-y-2">
                <label className="block text-sm font-bold text-slate-700 mb-2">{isEntry ? 'Trabalhos a Executar' : 'Trabalhos Executados'}</label>`;

const replaced = content.replace(regex, replacement);

if (replaced !== content) {
    fs.writeFileSync('components/Scanner.tsx', replaced);
    console.log('Successfully patched Scanner UI');
} else {
    console.log('Failed to patch Scanner UI');
}
