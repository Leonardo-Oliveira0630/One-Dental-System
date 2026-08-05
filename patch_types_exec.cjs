const fs = require('fs');
let content = fs.readFileSync('types.ts', 'utf8');

content = content.replace(
`export interface JobItemExecution {
  itemId: string;
  jobTypeId: string;
  jobTypeName: string;
  sector: string;
  userId: string;
  userName: string;
  timestamp: Date;
  executedStages?: string[];
}`,
`export interface JobItemExecution {
  itemId: string;
  jobTypeId: string;
  jobTypeName: string;
  sector: string;
  userId: string;
  userName: string;
  timestamp: Date;
  executedStages?: string[];
  isBaseChecked?: boolean;
}`
);

fs.writeFileSync('types.ts', content);
