const fs = require('fs');
let content = fs.readFileSync('components/Scanner.tsx', 'utf8');

// Line 255
content = content.replace(
`                setSelectedItemIds(eligible.map(e => e.item.id));
                const initStages: Record<string, string[]> = {};
                eligible.forEach(({ item, jobType }) => {
                    initStages[item.id] = item.sectorStages?.[detectedSector] || jobType?.sectorStages?.[detectedSector] || [];
                });
                setSelectedStages(initStages);
                setCommissionEarned(commission);`,
`                setSelectedItemIds([]);
                setSelectedStages({});
                setCommissionEarned(0);`
);

// Line 851
content = content.replace(
`                      setSelectedItemIds(eligible.map(e => e.item.id));
                      const initStages: Record<string, string[]> = {};
                      eligible.forEach(({ item, jobType }) => {
                          initStages[item.id] = item.sectorStages?.[detectedSector] || jobType?.sectorStages?.[detectedSector] || [];
                      });
                      setSelectedStages(initStages);
                      setCommissionEarned(commission);`,
`                      setSelectedItemIds([]);
                      setSelectedStages({});
                      setCommissionEarned(0);`
);

// Line 1223
content = content.replace(
`                                    setSelectedItemIds(eligible.map(item => item.item.id));
                                    setCommissionEarned(commission);`,
`                                    setSelectedItemIds([]);
                                    setSelectedStages({});
                                    setCommissionEarned(0);`
);

fs.writeFileSync('components/Scanner.tsx', content);
