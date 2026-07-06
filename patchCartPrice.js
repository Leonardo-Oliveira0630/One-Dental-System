import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'pages/store/SupplierStore.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace sellPrice in addToCart
content = content.replace(
  "const finalPrice = product.sellPrice \n      + (customVar?.priceModifier || 0)\n      + (selectedOptions?.reduce((sum, o) => sum + o.priceModifier, 0) || 0);",
  "const basePrice = (product.isPromotion && product.promotionalPrice) ? product.promotionalPrice : product.sellPrice;\n    const finalPrice = basePrice + (customVar?.priceModifier || 0) + (selectedOptions?.reduce((sum, o) => sum + o.priceModifier, 0) || 0);"
);

fs.writeFileSync(filePath, content);
