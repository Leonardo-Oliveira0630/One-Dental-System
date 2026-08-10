const fs = require('fs');
let content = fs.readFileSync('pages/JobDetails.tsx', 'utf8');

const target = `    const nextOsNumber = \`\${baseOs}-\${nextSeq}\`;

    if (action === 'PROSSEGUIMENTO') {
        navigate('/new-job', {
            state: {
                entryType: 'CONTINUATION',
                fromBudget: job,`;

const repl = `    const nextOsNumber = job.isBudget ? job.osNumber : \`\${baseOs}-\${nextSeq}\`;

    if (action === 'PROSSEGUIMENTO') {
        navigate('/new-job', {
            state: {
                entryType: 'CONTINUATION',
                fromBudget: job,`;

content = content.replace(target, repl);
fs.writeFileSync('pages/JobDetails.tsx', content);
console.log('patched budget next OS number');
