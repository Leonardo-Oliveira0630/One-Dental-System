const fs = require('fs');
const path = require('path');

const directories = ['./pages', './components'];

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            // Fix history
            const historyRegex = /\[\.\.\.\(([^.]+)\.history\s*\|\|\s*\[\]\),\s*\{/g;
            if (historyRegex.test(content)) {
                content = content.replace(historyRegex, '[...($1.history || []).filter(Boolean), {');
                modified = true;
            }

            // Fix sectorMovements
            const sectorMovementsRegex = /\[\.\.\.\(([^.]+)\.sectorMovements\s*\|\|\s*\[\]\),\s*\{/g;
            if (sectorMovementsRegex.test(content)) {
                content = content.replace(sectorMovementsRegex, '[...($1.sectorMovements || []).filter(Boolean), {');
                modified = true;
            }

            // Fix attachments
            const attachmentsRegex = /\[\.\.\.\(([^.]+)\.attachments\s*\|\|\s*\[\]\),\s*([^\]]+)\]/g;
            if (attachmentsRegex.test(content)) {
                content = content.replace(attachmentsRegex, '[...($1.attachments || []).filter(Boolean), $2]');
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

directories.forEach(processDirectory);
console.log('Done.');
