const fs = require('fs');
let content = fs.readFileSync('components/Layout.tsx', 'utf8');

const target = `<Link to={to} onClick={onClick} className={\`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative group \${ active ? 'bg-gradient-to-r from-[#00B8D9]/15 to-[#00B8D9]/5 text-[#00B8D9] font-semibold border-l-4 border-[#00B8D9] pl-3' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200' }\`} >`;
const repl = `<Link to={to} onClick={onClick} className={\`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative group \${ active ? 'bg-gradient-to-r from-[#00B8D9]/15 to-[#00B8D9]/5 text-[#00B8D9] font-semibold border-l-4 border-[#00B8D9] pl-3' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200' }\`} title={label}>`;

content = content.replace(target, repl);
fs.writeFileSync('components/Layout.tsx', content);
console.log('patched SidebarItem title');
