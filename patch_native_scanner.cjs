const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

// Replace the camera useEffect
const startToken = `  useEffect(() => {
      let isMounted = true;
      let reader: BrowserMultiFormatReader | null = null;`;

const endToken = `      return () => { 
          isMounted = false;
          if (reader) {
              reader.reset();
          }
      };
  }, [isCameraActive, selectedCameraId, cameras.length]);`;

const targetRegex = new RegExp(startToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?' + endToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

if (!targetRegex.test(code)) {
    console.log("Could not find the target block for native scanner patch.");
    process.exit(1);
}

const replacement = `  useEffect(() => {
      let isMounted = true;
      let reader: BrowserMultiFormatReader | null = null;
      let scanLoopId: number | null = null;
      let stream: MediaStream | null = null;

      if (isCameraActive && videoRef.current) {
          if (cameras.length === 0) return; // wait for cameras to load

          const startScanner = async () => {
              try {
                  const videoConstraints: MediaTrackConstraints = selectedCameraId 
                    ? { deviceId: { exact: selectedCameraId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
                    : { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } };

                  // 1. Check if we have native BarcodeDetector API
                  const hasNativeScanner = 'BarcodeDetector' in window;

                  if (hasNativeScanner && videoRef.current) {
                      console.log("Using native Web Barcode Detection API");
                      const barcodeDetector = new (window as any).BarcodeDetector({ 
                          formats: ['code_128', 'qr_code', 'ean_13', 'ean_8', 'code_39'] 
                      });

                      stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: videoConstraints });
                      if (!isMounted) {
                          stream.getTracks().forEach(t => t.stop());
                          return;
                      }

                      videoRef.current.srcObject = stream;
                      videoRef.current.setAttribute("playsinline", "true"); // required for iOS
                      await videoRef.current.play();

                      // Set focus and zoom if available
                      const track = stream.getVideoTracks()[0];
                      if (track) {
                          try {
                              const capabilities = track.getCapabilities() as any;
                              const advancedConstraints: any = {};
                              if (capabilities.zoom) advancedConstraints.zoom = capabilities.zoom.min || 1;
                              if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) advancedConstraints.focusMode = 'continuous';
                              if (capabilities.focusDistance) advancedConstraints.focusDistance = capabilities.focusDistance.min || 0;
                              
                              if (Object.keys(advancedConstraints).length > 0) {
                                  await track.applyConstraints({ advanced: [advancedConstraints] });
                              }
                          } catch (e) {}
                      }

                      let lastScan = 0;
                      const scanFrame = async () => {
                          if (!isMounted || !isCameraActive || !videoRef.current) return;
                          
                          const now = Date.now();
                          if (now - lastScan > 100) { // Scan a cada 100ms
                              lastScan = now;
                              try {
                                  const barcodes = await barcodeDetector.detect(videoRef.current);
                                  if (barcodes && barcodes.length > 0) {
                                      const text = barcodes[0].rawValue;
                                      if (processScanRef.current) {
                                          processScanRef.current(text);
                                      }
                                      setIsCameraActive(false);
                                      return;
                                  }
                              } catch (e) {
                                  console.log("Native barcode detection failed for this frame", e);
                              }
                          }
                          scanLoopId = requestAnimationFrame(scanFrame);
                      };
                      
                      scanFrame();

                  } else {
                      console.log("Fallback to ZXing BrowserMultiFormatReader");
                      const hints = new Map();
                      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
                          BarcodeFormat.CODE_128, BarcodeFormat.QR_CODE, BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.CODE_39
                      ]);
                      hints.set(DecodeHintType.TRY_HARDER, true);
                      
                      const activeReader = new BrowserMultiFormatReader(hints);
                      activeReader.timeBetweenDecodingAttempts = 150; 
                      reader = activeReader;

                      if (videoRef.current && isMounted) {
                          await activeReader.decodeFromConstraints(
                              { audio: false, video: videoConstraints },
                              videoRef.current,
                              (result, err) => {
                                  if (result && isMounted) {
                                      if (processScanRef.current) {
                                          processScanRef.current(result.getText());
                                      }
                                      setIsCameraActive(false);
                                  }
                              }
                          );

                          // Set focus and zoom if available
                          const stream = videoRef.current.srcObject as MediaStream;
                          const track = stream?.getVideoTracks()[0];
                          if (track) {
                              try {
                                  const capabilities = track.getCapabilities() as any;
                                  const advancedConstraints: any = {};
                                  if (capabilities.zoom) advancedConstraints.zoom = capabilities.zoom.min || 1;
                                  if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) advancedConstraints.focusMode = 'continuous';
                                  if (capabilities.focusDistance) advancedConstraints.focusDistance = capabilities.focusDistance.min || 0;
                                  if (Object.keys(advancedConstraints).length > 0) {
                                      track.applyConstraints({ advanced: [advancedConstraints] }).catch(e => {});
                                  }
                              } catch (e) {}
                          }
                      }
                  }

              } catch (err) {
                  console.error("Camera error:", err);
                  // Fallback to any camera if environment fails
                  if (!hasNativeScanner && reader && isMounted && videoRef.current) {
                      try {
                          await reader.decodeFromVideoDevice(
                              null,
                              videoRef.current,
                              (result, err) => {
                                  if (result && isMounted) {
                                      if (processScanRef.current) {
                                          processScanRef.current(result.getText());
                                      }
                                      setIsCameraActive(false);
                                  }
                              }
                          );
                      } catch (fallbackErr) {
                          console.error("Fallback camera error:", fallbackErr);
                          if (isMounted) setIsCameraActive(false);
                      }
                  }
              }
          };

          startScanner();
      }

      return () => { 
          isMounted = false;
          if (scanLoopId !== null) {
              cancelAnimationFrame(scanLoopId);
          }
          if (stream) {
              stream.getTracks().forEach(t => t.stop());
          }
          if (reader) {
              reader.reset();
          }
      };
  }, [isCameraActive, selectedCameraId, cameras.length]);`;

code = code.replace(targetRegex, replacement);
fs.writeFileSync('components/Scanner.tsx', code);
console.log("Successfully patched native scanner");
