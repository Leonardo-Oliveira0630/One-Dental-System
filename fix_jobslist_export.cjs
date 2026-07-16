const fs = require('fs');
let code = fs.readFileSync('pages/JobsList.tsx', 'utf8');

// Fix getSectorTimeInfo
const badSectorTime = `export const getSectorTimeInfo = (job: any) => {
    if (!job.sectorEntryTime) return { hours: 0, isAttention: false, label: '---' };
    };`;
const goodSectorTime = `export const getSectorTimeInfo = (job: any) => {
    if (!job.sectorEntryTime) return { hours: 0, isAttention: false, label: '---' };
    const diff = new Date().getTime() - new Date(job.sectorEntryTime).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    let label = '';
    if (hours > 0) label += \`\${hours}h \`;
    label += \`\${minutes}m\`;
    return { hours, isAttention: hours >= 18, label };
};`;

code = code.replace(badSectorTime, goodSectorTime);

// Fix export export
code = code.replace('export export const JobsList =', 'export const JobsList =');

// Fix weird catch blocks
code = code.replace(/} catch \(e\) \{\s*alert\("Erro ao salvar observação."\);\s*\};\s*\};\s*/g, '} catch (e) { alert("Erro ao salvar observação."); }\n};\n');
code = code.replace(/} catch \(e\) \{\s*alert\("Erro ao atualizar status."\);\s*\};\s*\};\s*/g, '} catch (e) { alert("Erro ao atualizar status."); }\n};\n');

// Also remove trailing braces at the end of the file that we appended blindly
code = code.replace(/};\s*\}\s*$/g, '};\n');

fs.writeFileSync('pages/JobsList.tsx', code);
console.log("Fixed exports");
