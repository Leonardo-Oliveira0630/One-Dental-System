const fs = require('fs');
let content = fs.readFileSync('components/Scanner.tsx', 'utf8');

content = content.replace(
`  const calculateCommissionForItems = (job: Job, user: any, selectedIds: string[], jobTypes: JobType[], sectorToUse: string, stagesMap?: Record<string, string[]>) => {
      if (!user || (!selectedIds || selectedIds.length === 0)) return 0;
      const sector = sectorToUse || 'Gestão';
      let totalComm = 0;
      
      job.items.forEach(item => {
          if (!selectedIds.includes(item.id)) return;
          if (item.commissionDisabled) return;
          
          const secQty = (item.sectorQuantities && item.sectorQuantities[sector]) ? item.sectorQuantities[sector] : item.quantity;
          const jt = jobTypes.find(t => t.id === item.jobTypeId);
          const stagesToUse = stagesMap?.[item.id] || [];
          totalComm += calculateItemCommission(item, jt, user, secQty, sector, stagesToUse);
      });
      return totalComm;
  };`,
`  const calculateCommissionForItems = (job: Job, user: any, selectedIds: string[], jobTypes: JobType[], sectorToUse: string, stagesMap?: Record<string, string[]>) => {
      if (!user) return 0;
      const sector = sectorToUse || 'Gestão';
      let totalComm = 0;
      
      job.items.forEach(item => {
          const isBaseChecked = selectedIds.includes(item.id);
          const stagesToUse = stagesMap?.[item.id] || [];
          if (!isBaseChecked && stagesToUse.length === 0) return;
          if (item.commissionDisabled) return;
          
          const secQty = (item.sectorQuantities && item.sectorQuantities[sector]) ? item.sectorQuantities[sector] : item.quantity;
          const jt = jobTypes.find(t => t.id === item.jobTypeId);
          totalComm += calculateItemCommission(item, jt, user, secQty, sector, stagesToUse, isBaseChecked);
      });
      return totalComm;
  };`
);

fs.writeFileSync('components/Scanner.tsx', content);
