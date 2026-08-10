const fs = require('fs');
let content = fs.readFileSync('pages/JobsList.tsx', 'utf8');

const target = `  const combinedJobs = useMemo(() => {
    if (!isClient) return jobs;`;

const replacement = `  const combinedJobs = useMemo(() => {
    if (isBudgetMode) return budgets || [];
    if (!isClient) return jobs;`;

content = content.replace(target, replacement);
fs.writeFileSync('pages/JobsList.tsx', content);
console.log('patched combinedJobs');
