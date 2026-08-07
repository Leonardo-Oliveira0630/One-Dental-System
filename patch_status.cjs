const fs = require('fs');
let content = fs.readFileSync('pages/JobsList.tsx', 'utf8');

const oldGetStatusColor = `export const getStatusColor = (status: any, isOverdue = false) => {
    if (isOverdue) return 'bg-red-500 text-white border-red-600 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse';
    switch(status) {`;
const newGetStatusColor = `export const getStatusColor = (status: any, isOverdue = false) => {
    if (isOverdue) return 'bg-red-500 text-white border-red-600 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse';
    switch(status) {
        case 'APPROVED': return 'bg-emerald-100 text-emerald-700 border border-emerald-200';`;

const oldGetTranslatedStatus = `export const getTranslatedStatus = (status: any, isOverdue = false) => {
    if (isOverdue) return 'Atrasado';
    switch(status) {`;
const newGetTranslatedStatus = `export const getTranslatedStatus = (status: any, isOverdue = false) => {
    if (isOverdue) return 'Atrasado';
    switch(status) {
        case 'APPROVED': return 'Aprovado';`;

content = content.replace(oldGetStatusColor, newGetStatusColor);
content = content.replace(oldGetTranslatedStatus, newGetTranslatedStatus);
fs.writeFileSync('pages/JobsList.tsx', content);
console.log('patched status formatting');
