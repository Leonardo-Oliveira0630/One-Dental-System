const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

// 1. Add CameraDevice and getAvailableCameras, getSmartCameraSelection to imports
if (!code.includes('cameraUtils')) {
    code = code.replace(
        "import { calculateItemCommission } from '../utils/commissionUtils';",
        "import { calculateItemCommission } from '../utils/commissionUtils';\nimport { CameraDevice, getAvailableCameras, getSmartCameraSelection } from '../utils/cameraUtils';"
    );
}

// 2. Add cameras state and selectedCamera state
const stateInsertion = `  const [isUploading, setIsUploading] = useState(false);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);`;
if (!code.includes('setCameras')) {
    code = code.replace("  const [isUploading, setIsUploading] = useState(false);", stateInsertion);
}

// 3. Replace the useEffect for camera activation
const targetUseEffectStart = `  useEffect(() => {
      let isMounted = true;
      let reader: BrowserMultiFormatReader | null = null;`;

const targetUseEffectEnd = `  }, [isCameraActive]);`;

const targetRegex = new RegExp(
    targetUseEffectStart.replace(/[.*+?^$\{\}\(\)\|\[\]\\]/g, '\\$&') + 
    '[\\s\\S]*?' + 
    targetUseEffectEnd.replace(/[.*+?^$\{\}\(\)\|\[\]\\]/g, '\\$&')
);

const newUseEffect = `  useEffect(() => {
    let isMounted = true;
    
    const fetchCameras = async () => {
        if (!isCameraActive) return;
        const availableCameras = await getAvailableCameras();
        if (isMounted) {
            setCameras(availableCameras);
            if (availableCameras.length > 0 && !selectedCameraId) {
                setSelectedCameraId(getSmartCameraSelection(availableCameras) || null);
            }
        }
    };
    
    if (isCameraActive && cameras.length === 0) {
        fetchCameras();
    }
    
    return () => { isMounted = false; };
  }, [isCameraActive, selectedCameraId, cameras.length]);

  useEffect(() => {
      let isMounted = true;
      let reader: BrowserMultiFormatReader | null = null;

      if (isCameraActive && videoRef.current) {
          const activeReader = new BrowserMultiFormatReader();
          reader = activeReader;
          
          const startScanner = async () => {
              try {
                  const videoConstraints: MediaTrackConstraints = selectedCameraId 
                    ? { deviceId: { exact: selectedCameraId }, width: { ideal: 1920, min: 1280 }, height: { ideal: 1080, min: 720 } }
                    : { facingMode: 'environment', width: { ideal: 1920, min: 1280 }, height: { ideal: 1080, min: 720 } };

                  if (videoRef.current && isMounted) {
                      await activeReader.decodeFromConstraints(
                          {
                              audio: false,
                              video: videoConstraints
                          },
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

                      // Check for torch support and zoom after starting
                      const stream = videoRef.current.srcObject as MediaStream;
                      const track = stream?.getVideoTracks()[0];
                      if (track) {
                        try {
                            const capabilities = track.getCapabilities() as any;
                            
                            // Configurar zoom para melhorar a leitura de códigos
                            if (capabilities.zoom) {
                                const minZoom = capabilities.zoom.min || 1;
                                track.applyConstraints({
                                    advanced: [{ zoom: minZoom }] as any
                                }).catch(e => console.log("Erro ao aplicar zoom:", e));
                            }
                            
                            // Focus modes (continuous) and distance
                            const advancedConstraints: any = {};
                            if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
                                advancedConstraints.focusMode = 'continuous';
                            }
                            if (capabilities.focusDistance) {
                                // Prefer closer focus for barcode scanning
                                advancedConstraints.focusDistance = capabilities.focusDistance.min || 0;
                            }
                            
                            if (Object.keys(advancedConstraints).length > 0) {
                                track.applyConstraints({
                                    advanced: [advancedConstraints]
                                }).catch(e => console.log("Erro ao aplicar focus:", e));
                            }
                            
                            if (capabilities.torch) {
                              // Torch is supported
                            }
                        } catch (e) {
                            console.log("Capabilities error", e);
                        }
                      }
                  }
              } catch (err) {
                  console.error("Camera error:", err);
                  // Fallback to any camera if environment fails
                  if (isMounted && videoRef.current) {
                      try {
                          await activeReader.decodeFromVideoDevice(
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
          if (reader) {
              reader.reset();
          }
      };
  }, [isCameraActive, selectedCameraId]);`;

code = code.replace(targetRegex, newUseEffect);
fs.writeFileSync('components/Scanner.tsx', code);
console.log('Patched camera logic');
