import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'types.ts');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  "export interface ProductCatalogItem {\n  id: string;\n  name: string;\n  code?: string;\n  description?: string;\n  type: InventoryItemType;\n  categoryId?: string;\n  costPrice: number;\n  sellPrice: number;\n  organizationId: string;\n}",
  "export interface ProductCatalogItem {\n  id: string;\n  name: string;\n  code?: string;\n  description?: string;\n  type: InventoryItemType;\n  categoryId?: string;\n  costPrice: number;\n  sellPrice: number;\n  promotionalPrice?: number;\n  isPromotion?: boolean;\n  organizationId: string;\n}"
);

const newCoupon = `
export interface SupplierCoupon {
  id: string;
  organizationId: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  validUntil?: Date;
  maxUses?: number;
  usedCount: number;
  active: boolean;
  applicableProductIds?: string[];
}
`;

if (!content.includes('export interface SupplierCoupon')) {
    content = content + newCoupon;
}

fs.writeFileSync(filePath, content);
