const fs = require('fs');
let code = fs.readFileSync('services/nfcServices.ts', 'utf8');

const regex = /export const NfcReaderService = \{[\s\S]*?\};\n\/\*\*/;

const newService = `export const NfcReaderService = {
  startWebNfcScan: async (
    onScan: (uid: string, text?: string) => void,
    onError?: (err: any) => void,
    signal?: AbortSignal
  ): Promise<void> => {
    try {
      if (Capacitor.isNativePlatform()) {
        const isSupported = await Nfc.isSupported();
        if (!isSupported.supported) throw new Error('NFC não suportado.');
        
        await Nfc.startScanSession();
        
        Nfc.addListener('nfcTagScanned', (event) => {
          let textValue = '';
          const uid = event.id ? event.id.map((b: number) => b.toString(16).padStart(2, '0')).join('').toUpperCase() : '';
          
          if (event.messages && event.messages.length > 0) {
            for (const record of event.messages[0].records) {
              if (record.type && String.fromCharCode(...record.type) === 'T' && record.payload) {
                 textValue = String.fromCharCode(...record.payload).substring(3);
                 break;
              }
            }
          }
          onScan(uid, textValue);
        });
        
        if (signal) {
          signal.addEventListener('abort', () => {
             Nfc.stopScanSession();
             Nfc.removeAllListeners();
          });
        }
      } else {
        if (!('NDEFReader' in window)) {
          throw new Error('Web NFC não suportado.');
        }
        const ndef = new (window as any).NDEFReader();
        await ndef.scan({ signal });
        ndef.addEventListener("reading", ({ message, serialNumber }: any) => {
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
          } catch(e) {}
          onScan(serialNumber, textValue);
        });
      }
    } catch (err: any) {
      if (onError) onError(err);
      else throw err;
    }
  },
  setupUsbHidListener: (onScan: (uid: string) => void) => {
    let buffer = '';
    let lastKeyTime = Date.now();
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 50) buffer = '';
      lastKeyTime = currentTime;
      if (e.key === 'Enter' && buffer.length >= 4) {
        onScan(buffer.trim());
        buffer = '';
      } else if (e.key.length === 1) buffer += e.key;
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }
};
/**`;

code = code.replace(regex, newService);
fs.writeFileSync('services/nfcServices.ts', code);
