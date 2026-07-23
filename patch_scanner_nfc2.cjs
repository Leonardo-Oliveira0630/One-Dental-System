const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

const oldNfc = `          ndef.addEventListener("reading", ({ message, serialNumber }: any) => {
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
          });`;

const newNfc = `          ndef.addEventListener("reading", ({ message, serialNumber }: any) => {
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
                  // Fallback para qualquer outro formato: tentar decodificar como utf-8
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
            } catch (error) {
              console.error("[Web NFC] Error processing reading:", error);
              alert("Erro ao processar tag NFC: " + error.message);
            }
          });`;

code = code.replace(oldNfc, newNfc);
fs.writeFileSync('components/Scanner.tsx', code);
console.log("Scanner NFC enhanced patched");
