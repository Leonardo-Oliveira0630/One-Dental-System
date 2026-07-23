const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

if (!code.includes('NDEFReader')) {
    code = code.replace(
        '  const nextSectorRef = useRef(nextSector);',
        `  const nextSectorRef = useRef(nextSector);
  
  // Web NFC API integration
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
  }, []);`
    );
    
    fs.writeFileSync('components/Scanner.tsx', code);
    console.log("Scanner Web NFC patched");
}
