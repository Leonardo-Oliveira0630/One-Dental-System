const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

const target = `        if (!job) {
            const activeJobWithBox = jobsRef.current.find(j => 
                j.boxNumber === rawCode || j.boxNumber === cleanedCode
            );`;

const replacement = `        if (!job) {
            const activeJobWithBox = jobsRef.current.find(j => {
                if (!j.boxNumber) return false;
                const box = String(j.boxNumber).trim().toUpperCase();
                return box === rawCode || box === cleanedCode;
            });`;

code = code.replace(target, replacement);

fs.writeFileSync('components/Scanner.tsx', code);
console.log("Box search patched");
