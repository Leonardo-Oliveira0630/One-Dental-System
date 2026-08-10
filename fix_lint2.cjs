const fs = require('fs');
let types = fs.readFileSync('types.ts', 'utf8');

// replace the last occurrence of subDentists in User
types = types.replace("manualDentistId?: string;\n  subDentists?: { id: string; name: string; cro?: string; }[];", "manualDentistId?: string;");
fs.writeFileSync('types.ts', types);

let jobDetails = fs.readFileSync('pages/JobDetails.tsx', 'utf8');
jobDetails = jobDetails.replace(/ArrowLeft, Calendar/g, "ArrowLeft, Calendar, Stethoscope");
fs.writeFileSync('pages/JobDetails.tsx', jobDetails);
console.log('Fixed linting errors');
