const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

const logic = `
  // Listen for NFC scans from other tabs
  useEffect(() => {
      const channel = new BroadcastChannel('nfc-channel');
      channel.onmessage = (event) => {
          if (event.data?.type === 'NFC_SCAN') {
              const code = event.data.code;
              // Acknowledge receipt so the other tab can close
              channel.postMessage({ type: 'NFC_ACK' });
              
              // Process the scan
              if (code) {
                  processScan(code);
              }
          }
      };
      return () => channel.close();
  }, [processScan]);
`;

code = code.replace(
    'const bufferRef = useRef<string>(\'\');',
    logic + '\n  const bufferRef = useRef<string>(\'\');'
);

fs.writeFileSync('components/Scanner.tsx', code);
