import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'types.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Fix ProductCatalogItem duplicates
content = content.replace(
  "  isPromotion?: boolean;\n  promotionalPrice?: number;\n  promotionalPrice?: number;\n  isPromotion?: boolean;",
  "  isPromotion?: boolean;\n  promotionalPrice?: number;"
);

// Add to InventoryItem
const invRegex = /(export interface InventoryItem \{[\s\S]*?sellPrice: number;)/;
content = content.replace(invRegex, "$1\n  isPromotion?: boolean;\n  promotionalPrice?: number;");

fs.writeFileSync(filePath, content);
