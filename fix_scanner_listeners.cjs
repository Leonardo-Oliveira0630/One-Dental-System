const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

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
      // Ignorar se o usuário estiver digitando em um input
      if (
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement || 
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }
      
      const char = e.key;
      const now = Date.now();
      
      // Resetar o buffer se passou muito tempo (provavelmente não é scanner)
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

// Insert the listenersCode before `const handleClose = () => {` or before `const processScan = `
const target = "  const processScan = useCallback(async (code: string) => {";
code = code.replace(target, listenersCode + "\n" + target);

fs.writeFileSync('components/Scanner.tsx', code);
console.log("Added listeners to Scanner.tsx");
