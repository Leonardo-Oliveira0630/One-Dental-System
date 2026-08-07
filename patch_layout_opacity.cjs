const fs = require('fs');
let content = fs.readFileSync('components/Layout.tsx', 'utf8');

// SidebarItem label
content = content.replace(
  /<span className="text-sm truncate">\{label\}<\/span>/g,
  '<span className="text-sm truncate opacity-100 md:opacity-0 md:group-hover/sidebar:opacity-100 transition-opacity duration-300">{label}</span>'
);

// SidebarItem badge
content = content.replace(
  /<span className="absolute right-4 bg-emerald-500 text-white text-\[9px\] px-2 py-0.5 rounded-full font-black shadow-lg animate-pulse">\{badge\}<\/span>/g,
  '<span className="absolute right-4 bg-emerald-500 text-white text-[9px] px-2 py-0.5 rounded-full font-black shadow-lg animate-pulse opacity-100 md:opacity-0 md:group-hover/sidebar:opacity-100 transition-opacity duration-300">{badge}</span>'
);

// Logout text
content = content.replace(
  /<LogOut size=\{20\} \/><span>Sair<\/span>/g,
  '<LogOut size={20} className="shrink-0" /><span className="opacity-100 md:opacity-0 md:group-hover/sidebar:opacity-100 transition-opacity duration-300">Sair</span>'
);

// Brand name wrapper
content = content.replace(
  /<div className="flex flex-col min-w-0">/g,
  '<div className="flex flex-col min-w-0 opacity-100 md:opacity-0 md:group-hover/sidebar:opacity-100 transition-opacity duration-300">'
);

// Section titles
content = content.replace(
  /<p className="text-\[9px\] font-black text-slate-500 uppercase tracking-widest px-4 mb-1 truncate">Produção<\/p>/g,
  '<p className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-4 mb-1 truncate opacity-100 md:opacity-0 md:group-hover/sidebar:opacity-100 transition-opacity duration-300">Produção</p>'
);
content = content.replace(
  /<p className="text-\[9px\] font-black text-indigo-400 uppercase tracking-widest px-4 mb-2 truncate">Minha Clínica<\/p>/g,
  '<p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest px-4 mb-2 truncate opacity-100 md:opacity-0 md:group-hover/sidebar:opacity-100 transition-opacity duration-300">Minha Clínica</p>'
);
content = content.replace(
  /<p className="text-\[9px\] font-black text-\[#00B8D9\] uppercase tracking-widest px-4 mb-2 truncate">Menu do Visitante<\/p>/g,
  '<p className="text-[9px] font-black text-[#00B8D9] uppercase tracking-widest px-4 mb-2 truncate opacity-100 md:opacity-0 md:group-hover/sidebar:opacity-100 transition-opacity duration-300">Menu do Visitante</p>'
);

// Buyer Lab Selector
content = content.replace(
  /<div className="mb-6 px-2 relative shrink-0">/g,
  '<div className="mb-6 px-2 relative shrink-0 opacity-100 md:opacity-0 md:group-hover/sidebar:opacity-100 transition-opacity duration-300">'
);

fs.writeFileSync('components/Layout.tsx', content);
console.log('patched opacity classes');
