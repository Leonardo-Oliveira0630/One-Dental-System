const fs = require('fs');
const file = 'pages/store/SupplierStore.tsx';
if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');
  
  content = content.replace(
    /\{currentOrg\?\.frenetToken \?/g, 
    '{(cart.length > 0 && allSuppliers.find(s => s.id === cart[0].product.organizationId)?.frenetToken) ?'
  );
  
  fs.writeFileSync(file, content);
}
