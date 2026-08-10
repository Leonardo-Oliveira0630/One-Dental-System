const fs = require('fs');
let content = fs.readFileSync('components/Scanner.tsx', 'utf8');

content = content.replace(
`            // Register item executions
            selectedItemIds.forEach(itemId => {
                const item = currentJob.items.find((i: JobItem) => i.id === itemId);
                const jt = jobTypesRef.current.find((t: JobType) => t.id === item?.jobTypeId);
                if (item && jt) {
                    newItemExecutions.push({
                        itemId: item.id,
                        jobTypeId: item.jobTypeId,
                        jobTypeName: jt.name,
                        sector: sector,
                        userId: user.id,
                        userName: user.name,
                        timestamp: new Date(),
                        executedStages: selectedStages[item.id] || []
                    });
                }
            });`,
`            // Register item executions
            currentJob.items.forEach((item: any) => {
                const isBaseChecked = selectedItemIds.includes(item.id);
                const stagesToUse = selectedStages[item.id] || [];
                if (!isBaseChecked && stagesToUse.length === 0) return;
                
                const jt = jobTypesRef.current.find((t: JobType) => t.id === item?.jobTypeId);
                if (jt) {
                    newItemExecutions.push({
                        itemId: item.id,
                        jobTypeId: item.jobTypeId,
                        jobTypeName: jt.name,
                        sector: sector,
                        userId: user.id,
                        userName: user.name,
                        timestamp: new Date(),
                        executedStages: stagesToUse,
                        isBaseChecked: isBaseChecked
                    });
                }
            });`
);

fs.writeFileSync('components/Scanner.tsx', content);
