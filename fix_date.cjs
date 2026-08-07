const fs = require('fs');
let content = fs.readFileSync('pages/JobDetails.tsx', 'utf8');

content = content.replace(/\(job\.dueDate \? new Date\(job\.dueDate\)\.toLocaleDateString : \(\) => "-"\)\(\)/g, '(job.dueDate ? new Date(job.dueDate).toLocaleDateString() : "-")');
content = content.replace(/\(job\.dueDate \? new Date\(job\.dueDate\)\.toLocaleDateString : \(\) => "-"\)\(\[\]/g, '(job.dueDate ? new Date(job.dueDate).toLocaleDateString([]');
content = content.replace(/\(job\.dueDate \? new Date\(job\.dueDate\)\.toLocaleDateString : \(\) => "-"\)\('pt-BR'\)/g, '(job.dueDate ? new Date(job.dueDate).toLocaleDateString("pt-BR") : "-")');

fs.writeFileSync('pages/JobDetails.tsx', content);
console.log('fixed Date toLocaleDateString call');
