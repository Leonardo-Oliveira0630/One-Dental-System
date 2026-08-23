const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

code = code.replace(/alert\("Scanner listener fired! JobId: " \+ \(e\.detail\?\.jobId \|\| 'none'\) \+ ", Jobs: " \+ jobsRef\.current\.length\);/, 
  `console.log("Scanner listener fired! JobId: " + (e.detail?.jobId || 'none') + ", Jobs: " + jobsRef.current.length);`);

code = code.replace(/alert\("Job not found in jobsRef!"\);/, 
  `console.error("Job not found in jobsRef!");`);

code = code.replace(/export const GlobalScanner: React\.FC = \(\) => \{/, 
  `export const GlobalScanner: React.FC = () => {\n  console.log("GlobalScanner mounted!");`);

fs.writeFileSync('components/Scanner.tsx', code);
