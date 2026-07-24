const fs = require('fs');
let code = fs.readFileSync('components/AlertSystem.tsx', 'utf8');

const newAlertPopup = `export const AlertPopup = () => {
    const { activeAlert, dismissAlert, jobs } = useApp();

    useEffect(() => {
        if (!activeAlert) return;

        // Tenta disparar notificação push
        if ("Notification" in window) {
            if (Notification.permission === "granted") {
                new Notification("LABPROX: Alerta de Urgência", {
                    body: activeAlert.message,
                    icon: '/logo labprox.svg'
                });
            } else if (Notification.permission !== "denied") {
                Notification.requestPermission().then(permission => {
                    if (permission === "granted") {
                        new Notification("LABPROX: Alerta de Urgência", {
                            body: activeAlert.message,
                            icon: '/logo labprox.svg'
                        });
                    }
                });
            }
        }

        const playSound = () => {
            try {
                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                
                const playBeep = (time: number, freq: number, duration: number, vol: number = 0.2) => {
                    const oscillator = audioCtx.createOscillator();
                    const gainNode = audioCtx.createGain();
                    
                    oscillator.type = 'square';
                    oscillator.frequency.setValueAtTime(freq, time);
                    
                    gainNode.gain.setValueAtTime(vol, time);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, time + duration);
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audioCtx.destination);
                    
                    oscillator.start(time);
                    oscillator.stop(time + duration);
                };
                
                const now = audioCtx.currentTime;
                playBeep(now, 800, 0.2);
                playBeep(now + 0.25, 800, 0.2);
                playBeep(now + 0.5, 1000, 0.4);
            } catch (e) {
                console.error("Audio playback failed", e);
            }
        };

        playSound();
        const soundInterval = setInterval(playSound, 2 * 60 * 1000); // Repete a cada 2 minutos

        return () => clearInterval(soundInterval);
    }, [activeAlert]);

    if (!activeAlert) return null;`;

code = code.replace(/export const AlertPopup = \(\) => \{[\s\S]*?if \(!activeAlert\) return null;/, newAlertPopup);

fs.writeFileSync('components/AlertSystem.tsx', code);
console.log("Patched AlertPopup in AlertSystem.tsx");
