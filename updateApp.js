import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('import { SupplierCoupons }')) {
    content = content.replace(
        "import { SupplierProducts } from './pages/supplier/Products';",
        "import { SupplierProducts } from './pages/supplier/Products';\nimport { SupplierCoupons } from './pages/supplier/Coupons';"
    );
}

if (!content.includes('<Route path="/supplier/coupons"')) {
    content = content.replace(
        "<Route path=\"/supplier/products\" element={<ProtectedRoute><SupplierProducts /></ProtectedRoute>} />",
        "<Route path=\"/supplier/products\" element={<ProtectedRoute><SupplierProducts /></ProtectedRoute>} />\n      <Route path=\"/supplier/coupons\" element={<ProtectedRoute><SupplierCoupons /></ProtectedRoute>} />"
    );
}

fs.writeFileSync(filePath, content);
