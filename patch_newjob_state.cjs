const fs = require('fs');
let content = fs.readFileSync('pages/NewJob.tsx', 'utf8');

content = content.replace(
    \`const [selectedDentistObj, setSelectedDentistObj] = useState<any | null>(null);\`,
    \`const [clientOrigin, setClientOrigin] = useState<'DENTIST' | 'LABORATORY'>('DENTIST');
  const [selectedDentistObj, setSelectedDentistObj] = useState<any | null>(null);\`
);

content = content.replace(
    \`  const filteredJobTypes = useMemo(() => {
    const visible = jobTypes.filter(t => t.isVisibleInternally !== false);
    if (!jobTypeSearchQuery) return visible.slice(0, 10);
    const query = jobTypeSearchQuery.toLowerCase();
    return visible.filter(t => t.name.toLowerCase().includes(query)).slice(0, 10);
  }, [jobTypeSearchQuery, jobTypes]);\`,
    \`  const filteredJobTypes = useMemo(() => {
    let visible = jobTypes;
    if (clientOrigin === 'DENTIST') {
        visible = jobTypes.filter(t => t.isVisibleInternally !== false);
    } else {
        visible = jobTypes.filter(t => t.isVisibleInternallyLabs === true);
    }
    if (!jobTypeSearchQuery) return visible.slice(0, 10);
    const query = jobTypeSearchQuery.toLowerCase();
    return visible.filter(t => t.name.toLowerCase().includes(query)).slice(0, 10);
  }, [jobTypeSearchQuery, jobTypes, clientOrigin]);\`
);

fs.writeFileSync('pages/NewJob.tsx', content);
console.log('patched newjob state');
