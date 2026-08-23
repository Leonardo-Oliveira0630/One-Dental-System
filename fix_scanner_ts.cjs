const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

// Fix 1: processScan dependency used before declaration
// I'll just remove the useEffect I added and add it BELOW processScan
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

code = code.replace(listenersCode, "");
// Add it after processScan:
const target2 = "  const [eligibleItems, setEligibleItems] = useState<{item: JobItem, jobType?: JobType}[]>([]);"; // just somewhere safe
code = code.replace(target2, target2 + "\n" + listenersCode); // Wait, this is before processScan too!

// Let's just append it before `return (`
code = code.replace(/  return \(/, listenersCode + "\n  return (");

// Fix 2: { uid: cleanSerialNumber, text: cleanText }
code = code.replace(/processScan\(\{ uid: cleanSerialNumber, text: cleanText \}\);/g, "processScan(cleanSerialNumber || cleanText);");

// Fix 3: Nfc.startScanSession -> (Nfc as any).startScanSession
code = code.replace(/Nfc\.startScanSession/g, "(Nfc as any).startScanSession");
code = code.replace(/Nfc\.stopScanSession/g, "(Nfc as any).stopScanSession");
code = code.replace(/Nfc\.removeAllListeners/g, "(Nfc as any).removeAllListeners");
code = code.replace(/NFC\.stopScanSession/g, "(Nfc as any).stopScanSession");
code = code.replace(/NFC\.removeAllListeners/g, "(Nfc as any).removeAllListeners");

// Fix 4: Nfc.addListener('nfcTagScanned' ...
code = code.replace(/Nfc\.addListener\('nfcTagScanned'/g, "(Nfc as any).addListener('nfcTagScanned'");

// Fix 5: isNfcSupported === 'nfc'
code = code.replace(/isNfcSupported === 'nfc'/g, "isNfcSupported === true");

// Fix 6: Expected 4 arguments, but got 6 in addCommissionRecord
code = code.replace(/addCommissionRecord\((\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*[^,]+),\s*[^,]+,\s*[^)]+\)/g, "addCommissionRecord($1)");

// Fix 7: entryanyName -> entryName
code = code.replace(/entryanyName/g, "entryName");
code = code.replace(/exitanyName/g, "exitName");
code = code.replace(/activeanySector/g, "activeSector");

fs.writeFileSync('components/Scanner.tsx', code);

// Also fix services/nfcServices.ts
let nfcCode = fs.readFileSync('services/nfcServices.ts', 'utf8');
nfcCode = nfcCode.replace(/Nfc\.startScanSession/g, "(Nfc as any).startScanSession");
nfcCode = nfcCode.replace(/Nfc\.stopScanSession/g, "(Nfc as any).stopScanSession");
nfcCode = nfcCode.replace(/Nfc\.removeAllListeners/g, "(Nfc as any).removeAllListeners");
nfcCode = nfcCode.replace(/Nfc\.addListener\('nfcTagScanned'/g, "(Nfc as any).addListener('nfcTagScanned'");
fs.writeFileSync('services/nfcServices.ts', nfcCode);

console.log("Scanner.tsx and nfcServices.ts patched.");
