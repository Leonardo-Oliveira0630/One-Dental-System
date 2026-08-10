const fs = require('fs');
const content = fs.readFileSync('utils/commissionUtils.ts', 'utf-8');

const regex = /const stagesToCheck = executedStages && executedStages\.length > 0\s*\?\s*executedStages\s*:\s*\(item\.sectorStages\?\.\[sectorName\] \|\| jobType\.sectorStages\?\.\[sectorName\] \|\| \[\]\);/;

const replacement = `const stagesToCheck = executedStages !== undefined
            ? executedStages
            : (item.sectorStages?.[sectorName] || jobType.sectorStages?.[sectorName] || []);`;

const replaced = content.replace(regex, replacement);

if (replaced !== content) {
    fs.writeFileSync('utils/commissionUtils.ts', replaced);
    console.log('Successfully patched commissionUtils');
} else {
    console.log('Failed to patch commissionUtils');
}
