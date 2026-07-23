const fs = require('fs');
const lines = fs.readFileSync('components/Scanner.tsx', 'utf8').split('\n');

const startIndex = 405; // 0-indexed, so 406 is index 405
const endIndex = 523;   // index for line 524

const newEffect = `  useEffect(() => {
      let isMounted = true;
      let reader: BrowserMultiFormatReader | null = null;
      let scanLoopId: number | null = null;
      let stream: MediaStream | null = null;

      if (isCameraActive && videoRef.current) {
          if (cameras.length === 0) return;

          const startScanner = async () => {
              try {
                  const videoConstraints: MediaTrackConstraints = selectedCameraId 
                    ? { deviceId: { exact: selectedCameraId } }
                    : { facingMode: 'environment' };

                  const hasNativeScanner = 'BarcodeDetector' in window;

                  if (hasNativeScanner && videoRef.current) {
                      console.log("Using Native Web Barcode Scanner API");
                      const barcodeDetector = new (window as any).BarcodeDetector({ 
                          formats: ['code_128', 'qr_code', 'ean_13', 'ean_8', 'code_39'] 
                      });

                      stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: videoConstraints });
                      if (!isMounted) {
                          stream.getTracks().forEach(t => t.stop());
                          return;
                      }

                      videoRef.current.srcObject = stream;
                      videoRef.current.setAttribute("playsinline", "true");
                      await videoRef.current.play();

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
                          if (now - lastScan > 100) {
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
                              } catch (e) {}
                          }
                          scanLoopId = requestAnimationFrame(scanFrame);
                      };
                      
                      scanFrame();

                  } else {
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

                          const s = videoRef.current.srcObject;
                          if (s) {
                              stream = s as MediaStream;
                              const track = stream.getVideoTracks()[0];
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
                  }
              } catch (err) {
                  console.error("Camera error:", err);
                  if (reader && isMounted && videoRef.current) {
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

lines.splice(startIndex, endIndex - startIndex + 1, newEffect);
fs.writeFileSync('components/Scanner.tsx', lines.join('\n'));
console.log("Successfully replaced effect!");
