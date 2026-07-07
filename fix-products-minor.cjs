const fs = require('fs');
const files = ['pages/supplier/Products.tsx', 'pages/supplier/Coupons.tsx'];
files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/bg-indigo-950\/40/g, 'bg-indigo-200/50');
    content = content.replace(/bg-purple-950\/40/g, 'bg-purple-200/50');
    content = content.replace(/text-purple-400/g, 'text-purple-600');
    content = content.replace(/bg-purple-500\/15/g, 'bg-purple-50');
    content = content.replace(/text-orange-400/g, 'text-orange-600');
    content = content.replace(/bg-orange-500\/15/g, 'bg-orange-50');
    content = content.replace(/text-emerald-400/g, 'text-emerald-600');
    content = content.replace(/text-teal-400/g, 'text-teal-600');
    content = content.replace(/text-indigo-400/g, 'text-indigo-600');
    content = content.replace(/text-indigo-300/g, 'text-indigo-500');
    content = content.replace(/bg-indigo-555/g, 'bg-indigo-500');
    content = content.replace(/bg-slate-750/g, 'bg-slate-200');
    fs.writeFileSync(file, content);
  }
});
