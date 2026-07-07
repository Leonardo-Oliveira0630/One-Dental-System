const fs = require('fs');

const files = [
  'pages/supplier/Dashboard.tsx',
  'pages/supplier/Products.tsx',
  'pages/supplier/Coupons.tsx',
  'pages/supplier/Settings.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // buttons with bg-indigo-600, bg-emerald-600, bg-purple-600 shouldn't have text-slate-900
    content = content.replace(/bg-indigo-600([^>]*?)text-slate-900/g, 'bg-indigo-600$1text-white');
    content = content.replace(/bg-indigo-500([^>]*?)text-slate-900/g, 'bg-indigo-500$1text-white');
    content = content.replace(/bg-emerald-600([^>]*?)text-slate-900/g, 'bg-emerald-600$1text-white');
    content = content.replace(/bg-purple-600([^>]*?)text-slate-900/g, 'bg-purple-600$1text-white');
    content = content.replace(/bg-red-600\/90 text-slate-900/g, 'bg-red-600/90 text-white');
    content = content.replace(/bg-red-600 text-slate-900/g, 'bg-red-600 text-white');
    
    fs.writeFileSync(file, content);
  }
});
