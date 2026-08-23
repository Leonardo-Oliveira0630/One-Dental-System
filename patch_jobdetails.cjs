const fs = require('fs');
let code = fs.readFileSync('pages/JobDetails.tsx', 'utf8');

code = code.replace(/window\.dispatchEvent\(new CustomEvent\('open-job-scanner-popup', \{ detail: \{ jobId: job\.id \} \}\)\)/g, 
  `{ 
    console.log('Dispatching open-job-scanner-popup for job', job.id); 
    window.dispatchEvent(new CustomEvent('open-job-scanner-popup', { detail: { jobId: job.id } })); 
  }`);

fs.writeFileSync('pages/JobDetails.tsx', code);
