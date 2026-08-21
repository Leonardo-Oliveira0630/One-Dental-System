const fs = require('fs');

const missingFuncs = `
  const getEligibleItemsAndComm = (job: Job, user: User, types: JobType[], sector: string) => {
    let commission = 0;
    const eligible: any[] = [];
    if (!job.items) return { eligible, commission };
    for (const item of job.items) {
      const comm = calculateItemCommission(item, user.id, types, sector, user.commissionRates);
      if (comm !== null) {
        eligible.push(item);
        if (typeof comm === 'number') commission += comm;
      }
    }
    return { eligible, commission };
  };

  const calculateCommissionForItems = (items: JobItem[], user: User, types: JobType[], sector: string) => {
    let commission = 0;
    for (const item of items) {
      const comm = calculateItemCommission(item, user.id, types, sector, user.commissionRates);
      if (typeof comm === 'number') commission += comm;
    }
    return commission;
  };
`;

let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

// Insert after processScan definition
code = code.replace(/const processScan = useCallback\(async \(code: string\) => \{/, missingFuncs + "\n  const processScan = useCallback(async (code: string) => {");

// fix isUploadingRef -> isUploading 
code = code.replace(/isUploadingRef\.current/g, "isUploading");
fs.writeFileSync('components/Scanner.tsx', code);
