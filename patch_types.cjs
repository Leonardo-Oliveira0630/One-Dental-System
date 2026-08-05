const fs = require('fs');
let content = fs.readFileSync('types.ts', 'utf8');

content = content.replace(
`export interface JobType {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  baseCommission?: number;
  variationGroups: VariationGroup[];`,
`export interface JobType {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  baseCommission?: number;
  variationGroups: VariationGroup[];
  variations?: any[]; // Legacy variations`
);

fs.writeFileSync('types.ts', content);
