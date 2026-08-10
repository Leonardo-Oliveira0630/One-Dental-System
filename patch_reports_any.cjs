const fs = require('fs');
let content = fs.readFileSync('pages/Reports.tsx', 'utf8');

content = content.replace(
`          let finishDate = job.status === JobStatus.COMPLETED && job.history ? new Date(job.history.slice().reverse().find(h => h.action === 'COMPLETED' || h.statusTo === JobStatus.COMPLETED)?.timestamp || new Date()).toLocaleDateString('pt-BR') : '-';`,
`          let finishDate = job.status === JobStatus.COMPLETED && job.history ? new Date(job.history.slice().reverse().find((h: any) => h.action === 'COMPLETED' || h.statusTo === JobStatus.COMPLETED)?.timestamp || new Date()).toLocaleDateString('pt-BR') : '-';`
);

fs.writeFileSync('pages/Reports.tsx', content);
