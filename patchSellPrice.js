import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'pages/store/SupplierStore.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const regexes = [
  {
    find: /const price = item.product.sellPrice/g,
    replace: 'const basePrice = (item.product.isPromotion && item.product.promotionalPrice) ? item.product.promotionalPrice : item.product.sellPrice;\n      const price = basePrice'
  },
  {
    find: /const unitPrice = i.product.sellPrice/g,
    replace: 'const unitPrice = ((i.product.isPromotion && i.product.promotionalPrice) ? i.product.promotionalPrice : i.product.sellPrice)'
  },
  {
    find: /const unitPrice = item.product.sellPrice/g,
    replace: 'const unitPrice = ((item.product.isPromotion && item.product.promotionalPrice) ? item.product.promotionalPrice : item.product.sellPrice)'
  },
  {
    find: /R\$ \{p.sellPrice.toFixed\(2\)\}/g,
    replace: '{p.isPromotion ? (<span><span className="text-xs line-through text-slate-400 mr-1">R$ {p.sellPrice.toFixed(2)}</span>R$ {p.promotionalPrice?.toFixed(2)}</span>) : `R$ ${p.sellPrice.toFixed(2)}`}'
  },
  {
    find: /selectedItemForDetail.sellPrice/g,
    replace: '((selectedItemForDetail.isPromotion && selectedItemForDetail.promotionalPrice) ? selectedItemForDetail.promotionalPrice : selectedItemForDetail.sellPrice)'
  }
];

regexes.forEach(r => {
  content = content.replace(r.find, r.replace);
});

fs.writeFileSync(filePath, content);
