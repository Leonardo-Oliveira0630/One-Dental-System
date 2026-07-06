import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'components/Layout.tsx');
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('Ticket')) {
    content = content.replace("} from 'lucide-react';", ", Ticket} from 'lucide-react';");
}

const searchStr = `<SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/supplier/products" icon={<Package size={20} />} label="Meus Produtos" active={location.pathname === '/supplier/products'} />`;
const newMenuItem = `\n                    <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/supplier/coupons" icon={<Ticket size={20} />} label="Cupons" active={location.pathname === '/supplier/coupons'} />`;

if (!content.includes('/supplier/coupons')) {
    content = content.replace(searchStr, searchStr + newMenuItem);
}

fs.writeFileSync(filePath, content);
