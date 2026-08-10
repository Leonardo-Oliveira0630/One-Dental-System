const fs = require('fs');
let content = fs.readFileSync('pages/JobDetails.tsx', 'utf8');

content = content.replace(
    'const visibleTypes = jobTypes.filter(t => t.isVisibleInternally !== false);',
    \`const visibleTypes = jobTypes.filter(t => job.clientOrigin === 'LABORATORY' ? t.isVisibleInternallyLabs === true : t.isVisibleInternally !== false);\`
);

content = content.replace(
    \`{jobTypes.filter(t => t.isVisibleInternally !== false || t.id === item.jobTypeId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}\`,
    \`{jobTypes.filter(t => (job.clientOrigin === 'LABORATORY' ? t.isVisibleInternallyLabs === true : t.isVisibleInternally !== false) || t.id === item.jobTypeId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}\`
);

content = content.replace(
    \`{jobTypes.filter(t => t.isVisibleInternally !== false).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}\`,
    \`{jobTypes.filter(t => job.clientOrigin === 'LABORATORY' ? t.isVisibleInternallyLabs === true : t.isVisibleInternally !== false).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}\`
);

fs.writeFileSync('pages/JobDetails.tsx', content);
console.log('patched jobdetails');
