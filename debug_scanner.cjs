const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

code = code.replace(/const handleOpenJobScanner = \(e: any\) => \{/, 
`const handleOpenJobScanner = (e: any) => {
      alert("Scanner listener fired! JobId: " + (e.detail?.jobId || 'none') + ", Jobs: " + jobsRef.current.length);`);

code = code.replace(/setScannedJob\(job\);\n\s*\}\n\s*\}/,
`setScannedJob(job);
        } else {
          alert("Job not found in jobsRef!");
        }
      }`);

fs.writeFileSync('components/Scanner.tsx', code);
