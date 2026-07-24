const fs = require('fs');
let code = fs.readFileSync('pages/JobDetails.tsx', 'utf8');

code = code.replace(/<div className="bg-white rounded-\[32px\] shadow-sm border border-slate-100 p-5 md:p-8 relative overflow-hidden shrink-0">/, '<div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-5 md:p-8 relative overflow-visible shrink-0">');
code = code.replace(/<div className=\{\`absolute top-0 left-0 w-1\.5 md:w-2 h-full \$\{job.urgency === UrgencyLevel\.VIP \? 'bg-orange-500' : 'bg-blue-600'\}\`\} \/>/, '<div className={`absolute top-0 left-0 w-1.5 md:w-2 h-full rounded-l-[32px] ${job.urgency === UrgencyLevel.VIP ? \'bg-orange-500\' : \'bg-blue-600\'}`} />');

fs.writeFileSync('pages/JobDetails.tsx', code);
console.log("Patched JobDetails.tsx overflow");
