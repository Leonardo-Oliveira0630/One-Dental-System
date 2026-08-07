const fs = require('fs');
let content = fs.readFileSync('components/Layout.tsx', 'utf8');

const target = `                            {hasPerm('jobs:create') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/new-job" icon={<PlusCircle size={20} />} label="Novo Caso" active={location.pathname === '/new-job'} />}
                            {hasPerm('jobs:view') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/budgets" icon={<FileText size={20} />} label="Orçamentos" active={location.pathname === '/budgets'} />}
                            {hasPerm('jobs:create') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/new-budget" icon={<PlusCircle size={20} />} label="Novo Orçamento" active={location.pathname === '/new-budget'} />}
                            {hasPerm('jobs:view') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/jobs" icon={<List size={20} />} label="Trabalhos" active={location.pathname === '/jobs'} />}`;

const repl = `                            {hasPerm('jobs:create') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/new-job" icon={<PlusCircle size={20} />} label="Novo Caso" active={location.pathname === '/new-job'} />}
                            {hasPerm('jobs:view') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/jobs" icon={<List size={20} />} label="Trabalhos" active={location.pathname === '/jobs'} />}
                            {hasPerm('jobs:create') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/new-budget" icon={<PlusCircle size={20} />} label="Novo Orçamento" active={location.pathname === '/new-budget'} />}
                            {hasPerm('jobs:view') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/budgets" icon={<FileText size={20} />} label="Orçamentos" active={location.pathname === '/budgets'} />}`;

content = content.replace(target, repl);

fs.writeFileSync('components/Layout.tsx', content);
console.log('patched layout');
