const fs = require('fs');
let content = fs.readFileSync('pages/JobDetails.tsx', 'utf8');

content = content.replace(
`                  totalUserComm += calculateItemCommission(item, jt, selectedUser, secQty);`,
`                  const exec = newExecutions.find((e: any) => e.itemId === item.id && e.sector === editingExecution.sector && e.userId === editingExecution.userId);
                  totalUserComm += calculateItemCommission(item, jt, selectedUser, secQty, editingExecution.sector, exec?.executedStages, exec?.isBaseChecked !== false);`
);

content = content.replace(
`                      totalUserComm += calculateItemCommission(i, jt, selectedUser, secQty, sector, exec?.executedStages);`,
`                      totalUserComm += calculateItemCommission(i, jt, selectedUser, secQty, sector, exec?.executedStages, exec?.isBaseChecked !== false);`
);

content = content.replace(
`                      totalUserComm += calculateItemCommission(item, jt, selectedUser, secQty, sector, exec?.executedStages);`,
`                      totalUserComm += calculateItemCommission(item, jt, selectedUser, secQty, sector, exec?.executedStages, exec?.isBaseChecked !== false);`
);

fs.writeFileSync('pages/JobDetails.tsx', content);
