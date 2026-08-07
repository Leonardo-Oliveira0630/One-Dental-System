const fs = require('fs');
let content = fs.readFileSync('pages/NewJob.tsx', 'utf8');

const target1 = `      if (entryType === 'NEW' && !location.state?.osNumber) {
        setOsNumber('');
      }`;
const repl1 = `      if (entryType === 'NEW' && !location.state?.osNumber) {
        setOsNumber(generateNextNewOs());
      }`;

const target2 = `    if (entryType === 'NEW') {
        if (!location.state?.osNumber) setOsNumber('');`;
const repl2 = `    if (entryType === 'NEW') {
        if (!location.state?.osNumber) setOsNumber(generateNextNewOs());`;

content = content.replace(target1, repl1);
content = content.replace(target2, repl2);

fs.writeFileSync('pages/NewJob.tsx', content);
console.log('patched newjob osNumber prefill');
