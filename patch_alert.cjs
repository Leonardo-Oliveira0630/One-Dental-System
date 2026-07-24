const fs = require('fs');
let code = fs.readFileSync('components/AlertSystem.tsx', 'utf8');

code = code.replace(/import React, \{ useState \} from 'react';/, "import React, { useState, useEffect } from 'react';");

const alertPopupFix = `export const AlertPopup = () => {
    const { activeAlert, dismissAlert, jobs } = useApp();

    useEffect(() => {
        if (activeAlert) {
            try {
                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                
                const playBeep = (time, freq, duration, vol = 0.2) => {
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
        }
    }, [activeAlert]);

    if (!activeAlert) return null;`;

code = code.replace(/export const AlertPopup = \(\) => \{\n\s*const \{ activeAlert, dismissAlert, jobs \} = useApp\(\);\n\n\s*if \(!activeAlert\) return null;/, alertPopupFix);

fs.writeFileSync('components/AlertSystem.tsx', code);
console.log("Patched AlertSystem.tsx");
