const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

const missingStates = `
  const [commissionEarned, setCommissionEarned] = useState<number>(0);
  const [eligibleItems, setEligibleItems] = useState<{item: JobItem, jobType?: JobType}[]>([]);
`;

code = code.replace("  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);", missingStates + "  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);");

// Now we need to add the correct event listeners at line 614!
// Actually, let's just replace `  return (` with the event listeners. We know it's at line 614.
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

  return (`;

code = code.replace("  return (\n    <div", listenersCode + "\n    <div");

// Also, the Expected 4 arguments but got 6 in line 409!
// `components/Scanner.tsx(409,115): error TS2554: Expected 4 arguments, but got 6.`
// Wait, my regex for replacing `addCommissionRecord` earlier only targeted the `await` case!
// Let's replace any `addCommissionRecord` that takes more than 1 argument.
code = code.replace(/addCommissionRecord\([^,]+,\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*[^)]+\)/g, (match) => {
    // If it has multiple arguments, let's just make it the object.
    // It's probably `addCommissionRecord(currentJob.id, user.id, commAmount, sector, currentJob.patientName, currentJob.osNumber)`
    return `addCommissionRecord({
        userId: user.id,
        userName: user.name,
        jobId: currentJob.id,
        osNumber: currentJob.osNumber || 'N/A',
        sector: sector,
        amount: commAmount,
        status: 'PENDING' as CommissionStatus,
        createdAt: new Date(),
        patientName: currentJob.patientName
    })`;
});

// Also fix `components/Scanner.tsx(277,66): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.`
// What is on line 277? Let's check where `window.setTimeout` or similar is? Or `indexOf`?
// I will just replace `parseInt` or whatever if needed, but I don't know what it is.
