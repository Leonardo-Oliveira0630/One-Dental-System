const fs = require('fs');
let content = fs.readFileSync('components/Layout.tsx', 'utf8');

// Add state
content = content.replace('const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);', 'const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);\n  const [isSidebarHovered, setIsSidebarHovered] = useState(false);');

// Patch aside
const asideTarget = `<aside className={\`fixed inset-y-0 left-0 z-[70] w-64 \${bgClass} text-white transform transition-transform duration-300 ease-in-out print:hidden \${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }\`}>
        <div className="p-4 sm:p-6 h-full flex flex-col overflow-hidden">`;

const asideRepl = `<aside 
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        className={\`fixed inset-y-0 left-0 z-[70] \${bgClass} text-white transform transition-all duration-300 ease-in-out print:hidden \${
        isMobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 w-64'
      } \${isSidebarHovered ? 'md:w-64' : 'md:w-20'} overflow-x-hidden\`}>
        <div className="p-4 h-full flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar w-64">`;

content = content.replace(asideTarget, asideRepl);

// Patch main
const mainTarget = `<main className="flex-1 md:ml-64 transition-all duration-300 print:hidden flex flex-col min-h-screen overflow-x-hidden relative">`;
const mainRepl = `<main className={\`flex-1 transition-all duration-300 print:hidden flex flex-col min-h-screen overflow-x-hidden relative \${isSidebarHovered ? 'md:ml-64' : 'md:ml-20'}\`}>`;

content = content.replace(mainTarget, mainRepl);

fs.writeFileSync('components/Layout.tsx', content);
console.log('patched layout basic sidebar');
