const fs = require('fs');
let code = fs.readFileSync('pages/Reports.tsx', 'utf-8');

code = code.replace(
  'const tableData = [];\n        groupJobs.forEach(job => {',
  'const tableData: any[] = [];\n        groupJobs.forEach(job => {'
);

code = code.replace(
  'find((h) => h.action === \'COMPLETED\' || h.statusTo === JobStatus.COMPLETED)',
  'find((h: any) => h.action === \'COMPLETED\' || h.statusTo === JobStatus.COMPLETED)'
);

code = code.replace(
  'yPos = doc.lastAutoTable.finalY + 15;',
  'yPos = (doc as any).lastAutoTable.finalY + 15;'
);

fs.writeFileSync('pages/Reports.tsx', code);
