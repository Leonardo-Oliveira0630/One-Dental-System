const fs = require('fs');

let store = fs.readFileSync('pages/store/SupplierStore.tsx', 'utf8');

const regexToReplace = /<div className="space-y-3 mb-4">\s*<label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Forma de Pagamento<\/label>[\s\S]*?(<div className="space-y-3 mb-4">\s*<label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Opções de Frete \(Melhor Envio\)<\/label>)/;

if (store.match(regexToReplace)) {
  store = store.replace(regexToReplace, `$1`);
  fs.writeFileSync('pages/store/SupplierStore.tsx', store);
  console.log("Success");
} else {
  console.log("Not found");
}
