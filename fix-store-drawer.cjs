const fs = require('fs');

const file = 'pages/store/SupplierStore.tsx';
if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');
  
  content = content.replace(/bg-blue-600 text-slate-900/g, 'bg-blue-600 text-white');
  content = content.replace(/bg-blue-700/g, 'bg-blue-500'); // hover
  content = content.replace(/border-slate-855/g, 'border-slate-200');
  content = content.replace(/border-b-slate-850/g, 'border-slate-200');
  content = content.replace(/hover:bg-slate-800/g, 'hover:bg-slate-100');
  
  fs.writeFileSync(file, content);
}
