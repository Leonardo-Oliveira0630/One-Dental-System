const fs = require('fs');
let content = fs.readFileSync('pages/JobDetails.tsx', 'utf8');

const oldGetTranslatedStatus = `const getTranslatedStatus = (status: JobStatus) => {
      switch(status) {
          case JobStatus.PENDING: return 'Pendente';`;
const newGetTranslatedStatus = `const getTranslatedStatus = (status: JobStatus | string) => {
      switch(status) {
          case 'APPROVED': return 'Aprovado';
          case JobStatus.PENDING: return 'Pendente';`;

content = content.replace(oldGetTranslatedStatus, newGetTranslatedStatus);
fs.writeFileSync('pages/JobDetails.tsx', content);
console.log('patched JobDetails status formatting');
