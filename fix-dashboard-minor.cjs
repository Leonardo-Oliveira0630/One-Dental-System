const fs = require('fs');

const file = 'pages/supplier/Dashboard.tsx';
if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');
  
  content = content.replace(/text-slate-350/g, 'text-slate-600');
  content = content.replace(/hover:text-white/g, 'hover:text-slate-900');
  content = content.replace(/text-slate-900 bg-indigo-600/g, 'text-white bg-indigo-600');
  content = content.replace(/bg-indigo-650/g, 'bg-indigo-600');
  content = content.replace(/bg-indigo-650 text-slate-900/g, 'bg-indigo-600 text-white');
  content = content.replace(/bg-indigo-600 text-slate-900/g, 'bg-indigo-600 text-white');
  
  // also fix table row hover if necessary
  content = content.replace(/bg-slate-505\/10/g, 'bg-yellow-50');
  content = content.replace(/bg-yellow-505\/10/g, 'bg-yellow-50');
  content = content.replace(/bg-yellow-500\/10/g, 'bg-yellow-100');
  content = content.replace(/text-yellow-405/g, 'text-yellow-700');
  content = content.replace(/text-yellow-450/g, 'text-yellow-700');
  content = content.replace(/text-yellow-400/g, 'text-yellow-600');
  content = content.replace(/text-indigo-400/g, 'text-indigo-600');
  content = content.replace(/bg-indigo-500\/10/g, 'bg-indigo-50');
  content = content.replace(/bg-blue-500\/10/g, 'bg-blue-50');
  content = content.replace(/text-blue-400/g, 'text-blue-600');
  
  fs.writeFileSync(file, content);
}
const file2 = 'pages/supplier/Dashboard.tsx';
let content = fs.readFileSync(file2, 'utf8');
content = content.replace(/text-teal-400/g, 'text-teal-600');
content = content.replace(/bg-slate-950/g, 'bg-slate-50');
content = content.replace(/bg-slate-850/g, 'bg-slate-100');
content = content.replace(/text-slate-100/g, 'text-slate-900');
content = content.replace(/text-slate-300/g, 'text-slate-700');
content = content.replace(/text-slate-400/g, 'text-slate-500');
fs.writeFileSync(file2, content);
