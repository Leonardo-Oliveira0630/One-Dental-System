import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'types.ts');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  "  costPrice: number;\n  sellPrice: number;",
  "  costPrice: number;\n  sellPrice: number;\n  isPromotion?: boolean;\n  promotionalPrice?: number;"
);

fs.writeFileSync(filePath, content);
