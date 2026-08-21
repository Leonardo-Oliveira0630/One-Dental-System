const fs = require('fs');

let scanner = fs.readFileSync('components/Scanner.tsx', 'utf8');

if (!scanner.includes('@capgo/capacitor-nfc')) {
  scanner = `import { Capacitor } from '@capacitor/core';\nimport { Nfc } from '@capgo/capacitor-nfc';\n` + scanner;
}

const nfcEffectRegex = /const startNfc = async \([^)]*\) => {[\s\S]*?(?=const handleFileUpload)/m;

const newStartNfc = `const startNfc = async (fromUserInteraction = false) => {
      try {
        if (Capacitor.isNativePlatform()) {
          const isSupported = await Nfc.isSupported();
          if (!isSupported.supported) throw new Error('NFC nativo não suportado.');
          
          await Nfc.startScanSession();
          setNfcStatus('scanning');
          console.log("Native NFC Scanner started successfully!");
          
          Nfc.addListener('nfcTagScanned', (event) => {
            const serialNumber = event.id ? event.id.map((b: any) => b.toString(16).padStart(2, '0')).join('').toUpperCase() : '';
            console.log("[Native NFC] Tag detected. SerialNumber:", serialNumber);
            
            let textValue = '';
            if (event.messages && event.messages.length > 0) {
              for (const record of event.messages[0].records) {
                if (record.type && String.fromCharCode(...record.type) === 'T' && record.payload) {
                   textValue = String.fromCharCode(...record.payload).substring(3);
                   break;
                }
              }
            }
            
            if (navigator.vibrate) navigator.vibrate(50);
            
            let cleanSerialNumber = serialNumber.replace(/:/g, "").toUpperCase();
            let cleanText = textValue ? textValue.toUpperCase().trim() : '';
            
            if (cleanText.startsWith('BOX-')) {
               cleanText = cleanText.replace('BOX-', '');
            }
            
            if (cleanSerialNumber || cleanText) {
                setNfcParam({ uid: cleanSerialNumber, text: cleanText });
                setScanMode(false);
                setIsCameraActive(false);
                Nfc.stopScanSession();
                Nfc.removeAllListeners();
            }
          });
          
          abortController.signal.addEventListener('abort', () => {
             Nfc.stopScanSession();
             Nfc.removeAllListeners();
          });
          
        } else if ('NDEFReader' in window) {
          ndef = new (window as any).NDEFReader();
          await ndef.scan({ signal: abortController.signal });
          setNfcStatus('scanning');
          console.log("Web NFC Scanner started successfully!");
          
          ndef.addEventListener("reading", ({ message, serialNumber }: any) => {
            console.log("[Web NFC] Tag detected. SerialNumber:", serialNumber);
            let textValue = '';
            try {
              if (message && message.records) {
                 for (const record of message.records) {
                   if (record.recordType === "text" || (record.recordType === "mime" && record.mediaType === "text/plain")) {
                     const textDecoder = new TextDecoder(record.encoding || 'utf-8');
                     textValue = textDecoder.decode(record.data);
                     break;
                   }
                 }
              }
            } catch (e) {
              console.error("[Web NFC] Error reading NDEF:", e);
            }
            
            if (navigator.vibrate) navigator.vibrate(50);
            
            let cleanSerialNumber = (serialNumber || '').replace(/:/g, "").toUpperCase();
            let cleanText = textValue ? textValue.toUpperCase().trim() : '';
            if (cleanText.startsWith('BOX-')) cleanText = cleanText.replace('BOX-', '');
            
            if (cleanSerialNumber || cleanText) {
                setNfcParam({ uid: cleanSerialNumber, text: cleanText });
                setScanMode(false);
                setIsCameraActive(false);
            }
          });
        }
      } catch (error: any) {
         setNfcStatus('error');
         if (fromUserInteraction) {
             alert("Erro ao iniciar NFC: " + error.message);
         }
      }
    };

    if (scanMode && activeTab === 'nfc') {
      startNfc(false);
    }

    return () => {
      abortController.abort();
      if (Capacitor.isNativePlatform()) {
         try { Nfc.stopScanSession(); Nfc.removeAllListeners(); } catch(e){}
      }
    };
  }, [scanMode, activeTab]);

  `;

scanner = scanner.replace(nfcEffectRegex, newStartNfc);

// Also patch the initial NFC capability check
const nfcSupportRegex = /setIsNfcSupported\('NDEFReader' in window\);/g;
scanner = scanner.replace(nfcSupportRegex, `setIsNfcSupported(Capacitor.isNativePlatform() || 'NDEFReader' in window);`);

fs.writeFileSync('components/Scanner.tsx', scanner);
console.log("Patched Scanner.tsx");

