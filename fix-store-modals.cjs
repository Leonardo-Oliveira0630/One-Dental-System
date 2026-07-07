const fs = require('fs');

const file = 'pages/store/SupplierStore.tsx';
if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');
  
  content = content.replace(/text-teal-400/g, 'text-teal-600');
  content = content.replace(/text-emerald-400/g, 'text-emerald-600');
  content = content.replace(/bg-emerald-500\/10/g, 'bg-emerald-50');
  content = content.replace(/border-emerald-500\/20/g, 'border-emerald-200');
  
  content = content.replace(/text-indigo-400/g, 'text-indigo-600');
  content = content.replace(/bg-indigo-500\/10/g, 'bg-indigo-50');
  content = content.replace(/text-purple-400/g, 'text-purple-600');
  
  content = content.replace(/text-red-400/g, 'text-red-600');
  
  // also the cart totals
  content = content.replace(/text-orange-400/g, 'text-orange-600');

  // Fix button text colors for colored bg
  content = content.replace(/bg-indigo-600([^>]*?)text-slate-900/g, 'bg-indigo-600$1text-white');
  
  fs.writeFileSync(file, content);
}
