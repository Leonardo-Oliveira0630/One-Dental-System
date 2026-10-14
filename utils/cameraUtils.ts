import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export interface CameraDevice {
    deviceId: string;
    label: string;
}

export const getAvailableCameras = async (): Promise<CameraDevice[]> => {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
            console.error("mediaDevices.enumerateDevices not supported");
            return [];
        }

        // Request permission first, otherwise labels might be empty
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
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
                label = `Câmera ${index + 1}`;
            }

            // Friendly tag for PC external webcams vs notebook built-in webcams
            if (labelLower.includes('usb') || labelLower.includes('external') || labelLower.includes('logitech') || labelLower.includes('c920') || labelLower.includes('c922') || labelLower.includes('obs') || labelLower.includes('cam')) {
                if (!labelLower.includes('externa') && !labelLower.includes('integrada')) {
                    label += ' (Externa USB)';
                }
            } else if (labelLower.includes('integrated') || labelLower.includes('built-in') || labelLower.includes('front') || labelLower.includes('internal') || labelLower.includes('hp hd') || labelLower.includes('dell')) {
                if (!labelLower.includes('notebook') && !labelLower.includes('integrada')) {
                    label += ' (Integrada Notebook)';
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

    // Preference 1: External USB Webcams or Rear/Back Mobile Cameras
    const externalOrBack = cameras.filter(cam => {
        const lbl = cam.label.toLowerCase();
        return lbl.includes('externa') || lbl.includes('usb') || lbl.includes('logitech') || lbl.includes('back') || lbl.includes('rear') || lbl.includes('traseira');
    });

    if (externalOrBack.length > 0) {
        return externalOrBack[0].deviceId;
    }

    return cameras[0].deviceId;
};

export const capturePhotoWithNativePreference = async (
    onCaptured: (file: File) => void,
    onOpenModalFallback: () => void
): Promise<void> => {
    if (Capacitor.isNativePlatform()) {
        try {
            // First check & request camera permission if needed
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
                source: CameraSource.Camera
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
            // If the user cancelled the camera app, do nothing
            if (errStr.includes('cancelled') || errStr.includes('cancel') || errStr.includes('user cancelled')) {
                return;
            }
            console.warn("Native camera failed, falling back to camera modal:", err);
            onOpenModalFallback();
            return;
        }
    }

    // On web / desktop or if fallback needed:
    onOpenModalFallback();
};
