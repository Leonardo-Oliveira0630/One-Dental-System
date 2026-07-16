const fs = require('fs');
let content = fs.readFileSync('pages/JobsList.tsx', 'utf8');

// Inside JobRow:
content = content.replace(
    'const JobRow = memo(({',
    'const JobRow = memo(({ isJobOverdue,'
);
content = content.replace(
    /getTranslatedStatus\(job\.status\)/g,
    'getTranslatedStatus(job.status, typeof isJobOverdue === "function" ? isJobOverdue(job) : false)'
);
content = content.replace(
    /getStatusColor\(job\.status\)/g,
    'getStatusColor(job.status, typeof isJobOverdue === "function" ? isJobOverdue(job) : false)'
);

// Inside JobCard:
content = content.replace(
    'const JobCard = memo(({',
    'const JobCard = memo(({ isJobOverdue,'
);
// Make sure isJobOverdue is passed in the render list
content = content.replace(
    'getTranslatedStatus={getTranslatedStatus}',
    'getTranslatedStatus={getTranslatedStatus}\n                            isJobOverdue={isJobOverdue}'
);

fs.writeFileSync('pages/JobsList.tsx', content);
console.log('JobsList updated again successfully.');
