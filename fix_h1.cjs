const fs = require('fs');
let content = fs.readFileSync('pages/lab/Inventory.tsx', 'utf8');

content = content.replace(
    `<h1 className="text-2xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
                        <Package className="text-indigo-600" /> CONTROLE DE ESTOQUE E INVENTÁRIO
                    </h1>`,
    `<h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2 tracking-tight flex-wrap">
                        <Package className="text-indigo-600 shrink-0" /> <span className="break-words min-w-0 flex-1">CONTROLE DE ESTOQUE E INVENTÁRIO</span>
                    </h1>`
);

// Also fix subtitle
content = content.replace(
    `<p className="text-slate-500 mt-1">{t("inventory.subtitle", "Gerencie produtos, categorias, insumos, maquinários e implantes do laboratório.")}</p>`,
    `<p className="text-slate-500 mt-1 text-sm sm:text-base break-words">{t("inventory.subtitle", "Gerencie produtos, categorias, insumos, maquinários e implantes do laboratório.")}</p>`
);

fs.writeFileSync('pages/lab/Inventory.tsx', content);
console.log('Fixed h1');
