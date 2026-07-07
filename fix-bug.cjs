const fs = require('fs');

const file = 'pages/store/SupplierStore.tsx';
if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');
  
  content = content.replace(/shippingAddress\.zipCode/g, 'address.zipCode');
  
  fs.writeFileSync(file, content);
}
