const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

// Remove ALL instances of the custom useEffect block
// A regex to match from `// Listeners for manual triggers` to `}, [processScan]);`
const blockRegex = /\/\/ Listeners for manual triggers[\s\S]*?\}, \[processScan\]\);\s*/g;
code = code.replace(blockRegex, "");

// Add it correctly at the end, right before `return (`
const listenersCode = `
  // Listeners for manual triggers and global barcode scanning
  useEffect(() => {
    const handleManualScan = (e: any) => {
      if (e.detail && e.detail.code) {
        processScan(e.detail.code);
      }
    };

    const handleOpenJobScanner = (e: any) => {
      if (e.detail && e.detail.jobId) {
        const job = jobsRef.current.find(j => j.id === e.detail.jobId);
        if (job) {
          setScannedJob(job);
        }
      }
    };

    const handleKeyPress = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement || 
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }
      
      const char = e.key;
      const now = Date.now();
      
      if (now - lastKeyTimeRef.current > SCANNER_TIMEOUT && bufferRef.current.length > 0) {
        bufferRef.current = '';
      }
      
      if (char === 'Enter') {
        const code = bufferRef.current.trim();
        if (code.length >= MIN_LENGTH) {
          processScan(code);
        }
        bufferRef.current = '';
      } else if (char.length === 1) {
        bufferRef.current += char;
      }
      
      lastKeyTimeRef.current = now;
    };

    window.addEventListener('manual-scan-trigger', handleManualScan);
    window.addEventListener('open-job-scanner-popup', handleOpenJobScanner);
    window.addEventListener('keypress', handleKeyPress);

    return () => {
      window.removeEventListener('manual-scan-trigger', handleManualScan);
      window.removeEventListener('open-job-scanner-popup', handleOpenJobScanner);
      window.removeEventListener('keypress', handleKeyPress);
    };
  }, [processScan]);
`;

code = code.replace(/  return \(/, listenersCode + "\n  return (");

// Fix TS2345: Argument of type '{ userId: string... }' missing properties
// We just need to remove the missing properties or fill them in.
// `amount: 0, status: CommissionStatus.PENDING, createdAt: new Date(), patientName: currentJob.patientName`
code = code.replace(/sector: sector\s*\}/g, "sector: sector,\n                    amount: commissionEarned,\n                    status: 'PENDING' as CommissionStatus,\n                    createdAt: new Date(),\n                    patientName: currentJob.patientName\n                }");

// Fix TS7006: Parameter 'event' implicitly has an 'any' type.
// Where is `(event)`?
code = code.replace(/\(Nfc as any\)\.addListener\('nfcTagScanned', \(event\)/g, "(Nfc as any).addListener('nfcTagScanned', (event: any)");

// Fix Expected 4 arguments, but got 6 in addCommissionRecord
// Already fixed, but there is one at 586: `addCommissionRecord(currentJob.id, user.id, ...)`
// Let's find any old style `addCommissionRecord` calls.
code = code.replace(/await addCommissionRecord\(\s*currentJob\.id,\s*user\.id,\s*commissionEarned,\s*sector,\s*currentJob\.patientName,\s*currentJob\.osNumber\s*\)/g, 
`await addCommissionRecord({
    userId: user.id,
    userName: user.name,
    jobId: currentJob.id,
    osNumber: currentJob.osNumber || 'N/A',
    sector: sector,
    amount: commissionEarned,
    status: 'PENDING' as CommissionStatus,
    createdAt: new Date(),
    patientName: currentJob.patientName
})`);

fs.writeFileSync('components/Scanner.tsx', code);
