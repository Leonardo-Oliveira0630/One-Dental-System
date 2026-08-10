const fs = require('fs');
let content = fs.readFileSync('components/Layout.tsx', 'utf8');

content = content.replace(
  /\$\{isSidebarHovered \? 'md:w-64' : 'md:w-20'\} overflow-x-hidden/g,
  "${isSidebarHovered ? 'md:w-64' : 'md:w-20'} overflow-x-hidden group/sidebar"
);

fs.writeFileSync('components/Layout.tsx', content);
console.log('patched aside');
