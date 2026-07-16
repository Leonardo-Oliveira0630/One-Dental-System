const fs = require('fs');
let content = fs.readFileSync('pages/JobsList.tsx', 'utf8');

content = content.replace(
    '}: { \n    job: Job,',
    '}: { \n    isJobOverdue?: any,\n    job: Job,'
);
content = content.replace(
    '}: { \n    job: Job, \n    navigate: any,',
    '}: { \n    isJobOverdue?: any,\n    job: Job, \n    navigate: any,'
);

fs.writeFileSync('pages/JobsList.tsx', content);
