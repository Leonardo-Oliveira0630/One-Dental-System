import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'pages/supplier/Coupons.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  "{coupon.discountType === 'PERCENTAGE' ? \\`\\${coupon.discountValue}%\\` : \\`R$ \\${coupon.discountValue.toFixed(2)}\\`}",
  "{coupon.discountType === 'PERCENTAGE' ? `${coupon.discountValue}%` : `R$ ${coupon.discountValue.toFixed(2)}`}"
);

content = content.replace(
  "{coupon.maxUses ? \\`/ \\${coupon.maxUses}\\` : '(Ilimitado)'}",
  "{coupon.maxUses ? `/ ${coupon.maxUses}` : '(Ilimitado)'}"
);

fs.writeFileSync(filePath, content);
