import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource, CameraDirection } from '@capacitor/camera';

export interface CameraDevice {
    deviceId: string;
    label: string;
}

export const isMobileDevice = (): boolean => {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isTouchTablet = 'ontouchstart' in window && navigator.maxTouchPoints > 1 && window.innerWidth <= 1024;
    const isNative = Capacitor ? Capacitor.isNativePlatform() : false;
    return isMobileUA || isTouchTablet || isNative;
};

export const getAvailableCameras = async (): Promise<CameraDevice[]> => {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
            console.error("mediaDevices.enumerateDevices not supported");
            return [];
        }

        // Request permission using rear camera constraint (environment) to avoid defaulting to front camera on Android
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' } }
            });
            stream.getTracks().forEach(track => track.stop());
        } catch (err) {
            console.warn("Permission check stream error (enumeration will proceed):", err);
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');

        return videoDevices.map((device, index) => {
            let label = device.label ? device.label.trim() : '';
            const labelLower = label.toLowerCase();

            if (!label) {
                // By Android HAL specification, camera 0 is almost universally the primary rear camera
                label = index === 0 ? 'Câmera Traseira Principal' : `Câmera ${index + 1}`;
            }

            // Friendly tag for PC external webcams vs notebook built-in webcams vs mobile rear/front
            if (labelLower.includes('usb') || labelLower.includes('external') || labelLower.includes('logitech') || labelLower.includes('c920') || labelLower.includes('c922') || labelLower.includes('obs') || labelLower.includes('cam')) {
                if (!labelLower.includes('externa') && !labelLower.includes('integrada')) {
                    label += ' (Externa USB)';
                }
            } else if (labelLower.includes('integrated') || labelLower.includes('built-in') || labelLower.includes('front') || labelLower.includes('internal') || labelLower.includes('hp hd') || labelLower.includes('dell') || labelLower.includes('selfie') || labelLower.includes('user')) {
                if (!labelLower.includes('notebook') && !labelLower.includes('integrada') && !labelLower.includes('frontal')) {
                    label += ' (Frontal / Integrada)';
                }
            }

            return {
                deviceId: device.deviceId,
                label: label
            };
        });
    } catch (error) {
        console.error("Error getting available cameras:", error);
        return [];
    }
};

export const getSmartCameraSelection = (cameras: CameraDevice[]): string | undefined => {
    if (!cameras || cameras.length === 0) return undefined;

    // Score devices to identify the primary rear (environment) camera, especially on Android devices
    const scored = cameras.map((cam, index) => {
        const lbl = cam.label.toLowerCase();
        let score = 0;

        // 1. HARD DISQUALIFICATION for front/selfie/user cameras
        const isFront = lbl.includes('front') || lbl.includes('frontal') || lbl.includes('user') ||
                        lbl.includes('selfie') || lbl.includes('facetime') || lbl.includes('anterior') ||
                        lbl.includes('integrada') || lbl.includes('built-in');
        if (isFront) {
            score -= 1000;
        }

        // 2. HIGH REWARD for Rear / Back / Environment cameras
        const isRear = lbl.includes('back') || lbl.includes('rear') || lbl.includes('traseira') ||
                       lbl.includes('traseiro') || lbl.includes('posterior') || lbl.includes('environment') ||
                       lbl.includes('facing back') || lbl.includes('camera 0') || lbl.includes('câmera 0') ||
                       lbl.includes('camera2 0') || lbl.includes('0, facing back') || lbl.includes('main') ||
                       lbl.includes('principal') || lbl.includes('primary');
        if (isRear) {
            score += 500;
        }

        // 3. Prefer Main rear camera over Ultra-Wide/Macro (main camera has optimal autofocus for barcodes)
        if (lbl.includes('0') || lbl.includes('main') || lbl.includes('principal') || lbl.includes('primary')) {
            score += 100;
        }
        if (lbl.includes('wide') || lbl.includes('ultra') || lbl.includes('macro') || lbl.includes('depth') || lbl.includes('telephoto')) {
            score -= 50;
        }

        // 4. External USB webcams on PC
        if (lbl.includes('usb') || lbl.includes('externa') || lbl.includes('logitech') || lbl.includes('c920') || lbl.includes('c922')) {
            score += 300;
        }

        // 5. Android HAL spec: camera 0 is Primary Rear Camera if unlabelled
        if (index === 0 && !isFront) {
            score += 150;
        }

        return { deviceId: cam.deviceId, score };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored[0].deviceId;
};

export const capturePhotoWithNativePreference = async (
    onCaptured: (file: File) => void,
    onOpenModalFallback: () => void
): Promise<void> => {
    if (Capacitor.isNativePlatform()) {
        try {
            try {
                const perm = await Camera.checkPermissions();
                if (perm.camera !== 'granted') {
                    await Camera.requestPermissions({ permissions: ['camera'] });
                }
            } catch (pErr) {
                console.warn("Could not check/request native permissions:", pErr);
            }

            const photo = await Camera.getPhoto({
                quality: 100,
                allowEditing: false,
                resultType: CameraResultType.Uri,
                source: CameraSource.Camera,
                direction: CameraDirection.Rear
            });

            if (photo && photo.webPath) {
                const response = await fetch(photo.webPath);
                const blob = await response.blob();
                const ext = photo.format || 'jpg';
                const file = new File(
                    [blob],
                    `foto-caso-${Date.now()}.${ext}`,
                    { type: `image/${ext === 'png' ? 'png' : 'jpeg'}` }
                );
                onCaptured(file);
                return;
            }
        } catch (err: any) {
            const errStr = (err?.message || err?.toString() || '').toLowerCase();
            if (errStr.includes('cancelled') || errStr.includes('cancel') || errStr.includes('user cancelled')) {
                return;
            }
            console.warn("Native camera failed, falling back to camera modal:", err);
            onOpenModalFallback();
            return;
        }
    }

    onOpenModalFallback();
};
