const fs = require('fs');
const content = fs.readFileSync('components/Scanner.tsx', 'utf-8');

const regex = /if \(openMovement && \(openMovement\.plannedItems \|\| openMovement\.plannedStages\)\) \{/;

const replacement = `if (openMovement && (openMovement.plannedItems?.length > 0 || Object.keys(openMovement.plannedStages || {}).length > 0)) {`;

const replaced = content.replace(regex, replacement);

if (replaced !== content) {
    fs.writeFileSync('components/Scanner.tsx', replaced);
    console.log('Successfully patched openMovement condition');
} else {
    console.log('Failed to patch openMovement condition');
}
