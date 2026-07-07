const fs = require('fs');

const file = 'pages/store/SupplierStore.tsx';
if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');
  
  // For the checkout modal:
  // It starts around 1634: {isCheckoutOpen && (
  // We can just find the block and replace inside it, or just replace everywhere if the rest of the file is light theme.
  
  // Wait, the rest of SupplierStore is ALREADY mostly light theme!
  // Let's replace the lingering dark theme classes safely globally within SupplierStore.tsx.
  
  const replacements = [
    { regex: /bg-slate-950/g, replacement: 'bg-slate-50' },
    { regex: /bg-slate-900/g, replacement: 'bg-white' },
    { regex: /bg-slate-850/g, replacement: 'bg-slate-100' },
    { regex: /border-slate-850/g, replacement: 'border-slate-200' },
    { regex: /border-slate-800/g, replacement: 'border-slate-200' },
    { regex: /border-slate-700/g, replacement: 'border-slate-300' },
    { regex: /text-slate-100/g, replacement: 'text-slate-900' },
    { regex: /text-slate-200/g, replacement: 'text-slate-800' },
    { regex: /text-slate-300/g, replacement: 'text-slate-700' },
    { regex: /text-slate-400/g, replacement: 'text-slate-500' },
    { regex: /text-slate-450/g, replacement: 'text-slate-600' },
    { regex: /hover:bg-slate-850/g, replacement: 'hover:bg-slate-100' },
  ];

  replacements.forEach(r => {
    content = content.replace(r.regex, r.replacement);
  });
  
  content = content.replace(/text-white/g, 'text-slate-900');
  content = content.replace(/bg-indigo-600([^>]*?)text-slate-900/g, 'bg-indigo-600$1text-white');
  content = content.replace(/bg-indigo-500([^>]*?)text-slate-900/g, 'bg-indigo-500$1text-white');
  content = content.replace(/bg-[#EE4D2D]([^>]*?)text-slate-900/g, 'bg-[#EE4D2D]$1text-white');

  // Fix button close in checkout
  content = content.replace(/className="text-slate-500 hover:text-slate-900"\s*>\s*✕/g, 'className="text-slate-500 hover:text-slate-900">\n                ✕');
  
  fs.writeFileSync(file, content);
}
