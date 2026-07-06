import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'types.ts');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  "totalValue: number;\n  status: 'PENDING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';",
  "totalValue: number;\n  discountValue?: number;\n  couponCode?: string;\n  status: 'PENDING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';"
);

fs.writeFileSync(filePath, content);
