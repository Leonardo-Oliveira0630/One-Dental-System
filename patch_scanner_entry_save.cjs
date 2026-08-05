const fs = require('fs');
const content = fs.readFileSync('components/Scanner.tsx', 'utf-8');

const regex = /newSectorMovements\.push\(\{\s*id: Math\.random\(\)\.toString\(\),\s*sector: sector,\s*entryTime: new Date\(\),\s*entryUserId: user\.id,\s*entryUserName: user\.name\s*\}\);/g;

const replacement = `newSectorMovements.push({
                id: Math.random().toString(),
                sector: sector,
                entryTime: new Date(),
                entryUserId: user.id,
                entryUserName: user.name,
                plannedItems: selectedItemIds,
                plannedStages: selectedStages
            });`;

const replaced = content.replace(regex, replacement);

if (replaced !== content) {
    fs.writeFileSync('components/Scanner.tsx', replaced);
    console.log('Successfully patched Scanner handleMoveJob');
} else {
    console.log('Failed to patch Scanner handleMoveJob');
}
