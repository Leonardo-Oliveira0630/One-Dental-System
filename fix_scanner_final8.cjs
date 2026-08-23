const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

code = code.replace(/setCommissionEarned\(calculateCommissionForItems\(job, user, plannedIds, jobTypesRef\.current, detectedSector, plannedStg\)\);/g, 
"setCommissionEarned(calculateCommissionForItems(job.items?.filter(i => plannedIds.includes(i.id)) || [], user, jobTypesRef.current, detectedSector));");

fs.writeFileSync('components/Scanner.tsx', code);
