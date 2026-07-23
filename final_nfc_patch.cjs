const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

const targetState = `  const [isUploading, setIsUploading] = useState(false);
  const [nextSector, setNextSector] = useState<string>('');`;

const newState = `  const [isUploading, setIsUploading] = useState(false);
  const [nextSector, setNextSector] = useState<string>('');
  const [isNfcSupported, setIsNfcSupported] = useState(false);
  const [nfcStatus, setNfcStatus] = useState<'idle' | 'scanning' | 'error'>('idle');`;

code = code.replace(targetState, newState);

const nfcOldBlock = `  // Web NFC API integration
  useEffect(() => {
    let ndef: any = null;
    let abortController = new AbortController();

    const startNfc = async () => {
      if ('NDEFReader' in window) {
        try {
          ndef = new (window as any).NDEFReader();
          await ndef.scan({ signal: abortController.signal });
          
          ndef.addEventListener("reading", ({ message, serialNumber }: any) => {
            console.log("[Web NFC] Tag detected:", serialNumber);
            try {
              for (const record of message.records) {
                if (record.recordType === "text") {
                  const textDecoder = new TextDecoder(record.encoding);
                  const text = textDecoder.decode(record.data);
                  console.log("[Web NFC] Text record:", text);
                  if (processScanRef.current) {
                      processScanRef.current(text);
                  }
                  break;
                } else if (record.recordType === "url") {
                  const textDecoder = new TextDecoder();
                  const url = textDecoder.decode(record.data);
                  console.log("[Web NFC] URL record:", url);
                  // Extract box number or ID from URL if it's our app URL
                  const parts = url.split('/');
                  const lastPart = parts[parts.length - 1];
                  if (lastPart) {
                    if (processScanRef.current) {
                        processScanRef.current(lastPart);
                    }
                  }
                  break;
                }
              }
            } catch (error) {
              console.error("[Web NFC] Error processing reading:", error);
            }
          });
          
          console.log("[Web NFC] Scanning active.");
        } catch (error) {
          console.log("[Web NFC] Error starting scan:", error);
        }
      }
    };

    startNfc();

    return () => {
      abortController.abort();
    };
  }, []);`;

const nfcNewBlock = `  // Web NFC API integration
  useEffect(() => {
    let ndef: any = null;
    let abortController = new AbortController();
    
    setIsNfcSupported('NDEFReader' in window);

    const startNfc = async (fromUserInteraction = false) => {
      if ('NDEFReader' in window) {
        try {
          ndef = new (window as any).NDEFReader();
          await ndef.scan({ signal: abortController.signal });
          setNfcStatus('scanning');
          console.log("NFC Scanner started successfully!");
          
          ndef.addEventListener("reading", ({ message, serialNumber }: any) => {
            console.log("[Web NFC] Tag detected:", serialNumber);
            try {
              for (const record of message.records) {
                console.log("[Web NFC] Record Type:", record.recordType, "Media Type:", record.mediaType);
                if (record.recordType === "text" || (record.recordType === "mime" && record.mediaType === "text/plain")) {
                  const textDecoder = new TextDecoder(record.encoding || 'utf-8');
                  const text = textDecoder.decode(record.data);
                  console.log("[Web NFC] Text/Mime record:", text);
                  if (processScanRef.current) {
                      processScanRef.current(text);
                  }
                  break;
                } else if (record.recordType === "url") {
                  const textDecoder = new TextDecoder(record.encoding || 'utf-8');
                  const url = textDecoder.decode(record.data);
                  console.log("[Web NFC] URL record:", url);
                  const parts = url.split('/');
                  const lastPart = parts[parts.length - 1];
                  if (lastPart) {
                    if (processScanRef.current) {
                        processScanRef.current(lastPart);
                    }
                  }
                  break;
                } else {
                  // Fallback
                  const textDecoder = new TextDecoder('utf-8');
                  const text = textDecoder.decode(record.data);
                  console.log("[Web NFC] Fallback record decode:", text);
                  if (text && text.length > 0 && text.length < 50) {
                      if (processScanRef.current) {
                          processScanRef.current(text);
                      }
                      break;
                  }
                }
              }
            } catch (error: any) {
              console.error("[Web NFC] Error processing reading:", error);
              alert("Erro ao processar tag NFC: " + error.message);
            }
          });
          
        } catch (error: any) {
          console.log("[Web NFC] Error starting scan:", error);
          setNfcStatus('error');
          if (fromUserInteraction) {
             alert("Erro ao iniciar NFC: " + error.message);
          } else if (error.name === 'NotAllowedError') {
             console.warn("NFC scan requires user gesture or permission.");
          }
        }
      }
    };

    startNfc();
    
    // Expose for manual triggering
    (window as any).triggerNfcStart = () => startNfc(true);

    return () => {
      abortController.abort();
    };
  }, []);`;

code = code.replace(nfcOldBlock, nfcNewBlock);

fs.writeFileSync('components/Scanner.tsx', code);
console.log("Scanner completely patched!");
