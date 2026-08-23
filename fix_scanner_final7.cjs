const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

const missingStates = `
  const [commissionEarned, setCommissionEarned] = useState<number>(0);
  const [eligibleItems, setEligibleItems] = useState<{item: JobItem, jobType?: JobType}[]>([]);
`;

code = code.replace(/const \[selectedItemIds, setSelectedItemIds\] = useState<string\[\]>\(\[\]\);/, missingStates + "  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);");

fs.writeFileSync('components/Scanner.tsx', code);
