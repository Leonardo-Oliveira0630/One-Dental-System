const fs = require('fs');
let content = fs.readFileSync('pages/JobsList.tsx', 'utf8');

// 1. Remove the broken snippet that was inserted before isJobOverdue
const brokenStart = 'const getStatusColor = ';
const brokenEnd = "if (!job.sectorEntryTime) return { hours: 0, isAttention: false, label: '---' };";

const idx1 = content.indexOf(brokenStart);
const idx2 = content.indexOf(brokenEnd, idx1) + brokenEnd.length;

if (idx1 > -1 && idx2 > -1) {
    content = content.substring(0, idx1) + content.substring(idx2);
}

// 2. Re-create the 3 functions at the TOP of JobsList.tsx (outside the component)
const functionsRecreated = `
export const getStatusColor = (status: any, isOverdue = false) => {
    if (isOverdue) return 'bg-red-500 text-white border-red-600 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse';
    switch(status) {
        case 'PENDING_REQUISITION': return 'bg-amber-100 text-amber-700 border border-amber-200';
        case 'REJECTED_REQUISITION': return 'bg-red-100 text-red-700 border border-red-200';
        case 'COMPLETED': return 'bg-green-100 text-green-700 border border-green-200';
        case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700 border border-blue-200';
        case 'WAITING_APPROVAL': return 'bg-purple-100 text-purple-700 border border-purple-200';
        case 'DELIVERED': return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
        case 'REJECTED': return 'bg-red-100 text-red-700 border border-red-200';
        case 'CANCELED': return 'bg-gray-200 text-gray-700 border border-gray-300';
        case 'RETURNED': return 'bg-orange-100 text-orange-700 border border-orange-200';
        case 'SECTOR_TRANSITION': return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
        default: return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
};

export const getTranslatedStatus = (status: any, isOverdue = false) => {
    if (isOverdue) return 'Atrasado';
    switch(status) {
        case 'PENDING_REQUISITION': return 'Req. Pendente';
        case 'REJECTED_REQUISITION': return 'Req. Recusada';
        case 'WAITING_APPROVAL': return 'Aguardando';
        case 'PENDING': return 'Pendente';
        case 'IN_PROGRESS': return 'Produção';
        case 'COMPLETED': return 'Concluído';
        case 'DELIVERED': return 'Entregue';
        case 'REJECTED': return 'Rejeitado';
        case 'CANCELED': return 'Cancelado';
        case 'RETURNED': return 'Devolvido';
        case 'SECTOR_TRANSITION': return 'Em Transição';
        default: return status;
    }
};

export const getSectorTimeInfo = (job: any) => {
    if (!job.sectorEntryTime) return { hours: 0, isAttention: false, label: '---' };
    const diff = new Date().getTime() - new Date(job.sectorEntryTime).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    let label = '';
    if (hours > 0) label += \`\${hours}h \`;
    label += \`\${minutes}m\`;
    return { hours, isAttention: hours >= 18, label };
};

export const isJobOverdue = (job: any) => {
    if (!job.dueDate) return false;
    const isInactive = ['COMPLETED', 'DELIVERED', 'REJECTED', 'REJECTED_REQUISITION', 'CANCELED'].includes(job.status);
    if (isInactive) return false;
    const due = new Date(job.dueDate);
    due.setHours(23, 59, 59, 999);
    return new Date() > due;
};
`;

content = content.replace("export const JobsList = ", functionsRecreated + "\nexport const JobsList = ");

// 3. Remove isJobOverdue from inside JobsList
content = content.replace(/const isJobOverdue = \([\s\S]*?return new Date\(\) > due;\s*\};\s*/, '');

// 4. Remove the floating getSectorTimeInfo leftovers
const leftoversStart = "const diff = new Date().getTime() - new Date(job.sectorEntryTime).getTime();";
const leftoversEnd = "};\n";

const left1 = content.indexOf(leftoversStart);
const left2 = content.indexOf(leftoversEnd, left1) + leftoversEnd.length;

if (left1 > -1 && left2 > -1) {
    content = content.substring(0, left1) + content.substring(left2);
}

fs.writeFileSync('pages/JobsList.tsx', content);
console.log('Fixed JobsList');
