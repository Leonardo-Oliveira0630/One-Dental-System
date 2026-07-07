const fs = require('fs');

const files = [
  'pages/supplier/Dashboard.tsx',
  'pages/supplier/Products.tsx',
  'pages/supplier/Coupons.tsx',
  'pages/store/SupplierStore.tsx'
];

const replacements = [
  { regex: /bg-slate-950/g, replacement: 'bg-slate-50' },
  { regex: /bg-slate-900/g, replacement: 'bg-white' },
  { regex: /border-slate-800/g, replacement: 'border-slate-200' },
  { regex: /border-slate-850/g, replacement: 'border-slate-200' },
  { regex: /border-slate-700/g, replacement: 'border-slate-300' },
  { regex: /text-slate-100/g, replacement: 'text-slate-900' },
  { regex: /text-slate-200/g, replacement: 'text-slate-800' },
  { regex: /text-slate-300/g, replacement: 'text-slate-700' },
  { regex: /text-slate-400/g, replacement: 'text-slate-500' },
  { regex: /bg-slate-800/g, replacement: 'bg-slate-100' },
  { regex: /hover:bg-slate-700/g, replacement: 'hover:bg-slate-200' },
  { regex: /bg-slate-850\/35/g, replacement: 'bg-slate-50' },
  { regex: /bg-slate-955/g, replacement: 'bg-slate-100' }
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    if (file === 'pages/store/SupplierStore.tsx') {
      // For SupplierStore, we only want to change the modal parts, but wait, the user said:
      // "ja nas lojas quando tivermos o checkout, no popup dos produtos dos fornecedores, gostaria de todos com um tema claro e clean"
      // So we should be careful to only target the modals in SupplierStore.
      
      // We can just find the checkout modal and product detail modal blocks and replace them.
      // But actually, looking at the code for SupplierStore, the main page is mostly light already.
      // Let's just do a specific replacement for SupplierStore using a targeted approach.
    } else {
      replacements.forEach(r => {
        content = content.replace(r.regex, r.replacement);
      });
      // specific fixes for text that shouldn't be white on white
      content = content.replace(/text-white/g, 'text-slate-900');
      // For buttons, we might want to restore white text if they have a colored background like bg-indigo-600
      content = content.replace(/bg-indigo-600 text-slate-900/g, 'bg-indigo-600 text-white');
      content = content.replace(/bg-emerald-600 text-slate-900/g, 'bg-emerald-600 text-white');
      
      fs.writeFileSync(file, content);
    }
  }
});
