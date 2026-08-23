const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

code = code.replace(/entryName/g, "entryUserName");
code = code.replace(/exitName/g, "exitUserName");
code = code.replace(/activeSectorRef/g, "activeanySectorRef");
code = code.replace(/activeSector/g, "activeanySector");

// Also, the previous script might have missed the TS errors if they were on different lines, let's fix them manually:
// 1. Expected 4 arguments, but got 6.
code = code.replace(/await addCommissionRecord\([^)]+\)/g, (match) => {
    if (match.includes("currentJob.id") && match.includes("commissionEarned") && !match.includes("amount: commissionEarned")) {
        return `await addCommissionRecord({
                    userId: user.id,
                    userName: user.name,
                    jobId: currentJob.id,
                    osNumber: currentJob.osNumber || 'N/A',
                    sector: sector,
                    amount: commissionEarned,
                    status: 'PENDING' as CommissionStatus,
                    createdAt: new Date(),
                    patientName: currentJob.patientName
                })`;
    }
    return match;
});

// 2. We need to check if there are any remaining `processScan` duplicates in `useEffect`s
// Since I ran a regex before, it should have been clean.

// Let's remove ANY custom event listener use-effects and rebuild them properly at the end
// Because my regex before: /\/\/ Listeners for manual triggers[\s\S]*?\}, \[processScan\]\);\s*/g
// might not have matched if it didn't end with `}, [processScan]);` perfectly.

// Remove ALL `window.addEventListener('manual-scan-trigger'` completely.
// Then we just put one at the bottom.
const blockRegex = /  \/\/ Listeners for manual triggers[\s\S]*?window\.removeEventListener\('keypress', handleKeyPress\);\n    };\n  \}, \[processScan\]\);\n/g;
code = code.replace(blockRegex, "");

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

fs.writeFileSync('components/Scanner.tsx', code);
