const fs = require('fs');
let content = fs.readFileSync('pages/dentist/DentistRequisitions.tsx', 'utf8');

const oldGetTranslatedStatus = `const getTranslatedStatus = (status: string) => {
                      switch (status) {
                          case 'PENDING': return 'Pendente';`;
const newGetTranslatedStatus = `const getTranslatedStatus = (status: string) => {
                      switch (status) {
                          case 'APPROVED': return 'Aprovado';
                          case 'PENDING': return 'Pendente';`;

content = content.replace(oldGetTranslatedStatus, newGetTranslatedStatus);
fs.writeFileSync('pages/dentist/DentistRequisitions.tsx', content);
console.log('patched DentistRequisitions status formatting');
