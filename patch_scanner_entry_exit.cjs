const fs = require('fs');
const content = fs.readFileSync('components/Scanner.tsx', 'utf-8');

const regex = /if \(isLastActionEntryHere && detectedSector\) \{([\s\S]*?)\} else \{\s*setEligibleItems\(\[\]\);\s*setSelectedItemIds\(\[\]\);\s*setSelectedStages\(\{\}\);\s*\}/;

const replacement = `if (detectedSector) {
                  const { eligible, commission } = getEligibleItemsAndComm(job, user, jobTypesRef.current, detectedSector);
                  setEligibleItems(eligible);
                  
                  if (isLastActionEntryHere) {
                      const openMovement = job.sectorMovements?.find(m => m.sector === detectedSector && !m.exitTime);
                      if (openMovement && (openMovement.plannedItems || openMovement.plannedStages)) {
                          const plannedIds = openMovement.plannedItems || [];
                          const plannedStg = openMovement.plannedStages || {};
                          setSelectedItemIds(plannedIds);
                          setSelectedStages(plannedStg);
                          setCommissionEarned(calculateCommissionForItems(job, user, plannedIds, jobTypesRef.current, detectedSector, plannedStg));
                      } else {
                          setSelectedItemIds(eligible.map(e => e.item.id));
                          const initStages: Record<string, string[]> = {};
                          eligible.forEach(({ item, jobType }) => {
                              initStages[item.id] = item.sectorStages?.[detectedSector] || jobType?.sectorStages?.[detectedSector] || [];
                          });
                          setSelectedStages(initStages);
                          setCommissionEarned(commission);
                      }
                  } else {
                      setSelectedItemIds([]);
                      setSelectedStages({});
                      setCommissionEarned(0);
                  }
              } else {
                  setEligibleItems([]);
                  setSelectedItemIds([]);
                  setSelectedStages({});
                  setCommissionEarned(0);
              }`;

const replaced = content.replace(regex, replacement);

if (replaced !== content) {
    fs.writeFileSync('components/Scanner.tsx', replaced);
    console.log('Successfully patched Scanner');
} else {
    console.log('Failed to patch Scanner');
}
