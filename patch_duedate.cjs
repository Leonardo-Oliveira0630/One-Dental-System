const fs = require('fs');
let content = fs.readFileSync('pages/JobDetails.tsx', 'utf8');

content = content.replace(/new Date\(job.dueDate\).toLocaleDateString/g, '(job.dueDate ? new Date(job.dueDate).toLocaleDateString : () => "-")');
content = content.replace(/setEditDueDate\(new Date\(job.dueDate\).toISOString\(\).split\('T'\)\[0\]\);/g, 'if (job.dueDate) setEditDueDate(new Date(job.dueDate).toISOString().split("T")[0]);');
content = content.replace(/const oldDate = new Date\(job.dueDate\).toISOString\(\).split\('T'\)\[0\];/g, 'const oldDate = job.dueDate ? new Date(job.dueDate).toISOString().split("T")[0] : "";');

fs.writeFileSync('pages/JobDetails.tsx', content);
console.log('patched dueDate');
