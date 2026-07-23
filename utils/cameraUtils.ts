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
            console.error("Error requesting camera permission:", err);
            // Even if it fails, try to enumerate (might just get deviceIds)
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices
            .filter(device => device.kind === 'videoinput')
            .map(device => ({
                deviceId: device.deviceId,
                label: device.label || `Camera ${device.deviceId.substring(0, 5)}`
            }));
    } catch (error) {
        console.error("Error getting available cameras:", error);
        return [];
    }
};

export const getSmartCameraSelection = (cameras: CameraDevice[]): string | undefined => {
    if (!cameras || cameras.length === 0) return undefined;

    // Filter out front cameras if possible
    const backCameras = cameras.filter(cam => 
        !cam.label.toLowerCase().includes('front') && 
        !cam.label.toLowerCase().includes('frontal')
    );

    const candidates = backCameras.length > 0 ? backCameras : cameras;

    // Bad keywords for barcode scanning (Ultra Wide, Macro, Telephoto)
    const badKeywords = ['ultra wide', 'ultra-wide', 'wide angle', 'macro', 'telephoto'];
    
    // Good keywords (Main, Wide, Back, Rear, Camera 0, Primary)
    const goodKeywords = ['main', 'wide', 'back camera', 'rear camera', 'camera 0', 'primary'];

    let bestCamera: CameraDevice | null = null;
    let highestScore = -1;

    for (const cam of candidates) {
        const label = cam.label.toLowerCase();
        let score = 0;

        // Penalty for bad keywords
        let hasBadKeyword = false;
        for (const bad of badKeywords) {
            if (label.includes(bad)) {
                hasBadKeyword = true;
                break;
            }
        }

        if (hasBadKeyword) {
            score -= 10;
        }

        // Bonus for good keywords
        for (const good of goodKeywords) {
            if (label.includes(good)) {
                // If it contains "wide" but also "ultra", the bad keyword penalty handles it
                if (good === 'wide' && hasBadKeyword) continue;
                score += 5;
            }
        }

        // Prefer back camera simply if it says 'back' or 'rear'
        if (label.includes('back') || label.includes('rear') || label.includes('traseira')) {
            score += 2;
        }

        // If it's the "Camera 0" or simply "camera2 0, facing back" which is common on Android
        if (label.includes(' 0') || label.includes(', facing back')) {
            score += 2;
        }

        if (score > highestScore) {
            highestScore = score;
            bestCamera = cam;
        }
    }

    return bestCamera ? bestCamera.deviceId : candidates[0]?.deviceId;
};
