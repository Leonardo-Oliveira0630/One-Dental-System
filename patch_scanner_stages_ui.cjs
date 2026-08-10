const fs = require('fs');
const content = fs.readFileSync('components/Scanner.tsx', 'utf-8');

// Replace the condition `{isItemSelected && itemSectorStages.length > 0 && (` with `{itemSectorStages.length > 0 && (`
let replaced = content.replace(/\{isItemSelected && itemSectorStages\.length > 0 && \(/g, '{itemSectorStages.length > 0 && (');

// Also update the stage checkbox onChange to select the parent item if it wasn't selected
const onChangeRegex = /onChange=\{\(e\) => \{\s*const newStages = e\.target\.checked\s*\?\s*\[\.\.\.itemExecutedStages, stageName\]\s*:\s*itemExecutedStages\.filter\(s => s !== stageName\);\s*const updatedStagesMap = \{ \.\.\.selectedStages, \[item\.id\]: newStages \};\s*setSelectedStages\(updatedStagesMap\);\s*if \(currentUserRef\.current\) \{\s*setCommissionEarned\(calculateCommissionForItems\(scannedJob, currentUserRef\.current, selectedItemIds, jobTypesRef\.current, activeUserSector, updatedStagesMap\)\);\s*\}\s*\}\}/g;

const newOnChange = `onChange={(e) => {
                                                                const newStages = e.target.checked
                                                                    ? [...itemExecutedStages, stageName]
                                                                    : itemExecutedStages.filter(s => s !== stageName);
                                                                const updatedStagesMap = { ...selectedStages, [item.id]: newStages };
                                                                setSelectedStages(updatedStagesMap);
                                                                
                                                                // Auto-select parent item if checking a stage
                                                                let nextItemIds = selectedItemIds;
                                                                if (e.target.checked && !selectedItemIds.includes(item.id)) {
                                                                    nextItemIds = [...selectedItemIds, item.id];
                                                                    setSelectedItemIds(nextItemIds);
                                                                }

                                                                if (currentUserRef.current) {
                                                                    setCommissionEarned(calculateCommissionForItems(scannedJob, currentUserRef.current, nextItemIds, jobTypesRef.current, activeUserSector, updatedStagesMap));
                                                                }
                                                            }}`;

replaced = replaced.replace(onChangeRegex, newOnChange);

if (replaced !== content) {
    fs.writeFileSync('components/Scanner.tsx', replaced);
    console.log('Successfully patched Scanner Stages UI');
} else {
    console.log('Failed to patch Scanner Stages UI');
}
