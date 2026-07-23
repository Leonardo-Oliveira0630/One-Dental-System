const fs = require('fs');
let code = fs.readFileSync('pages/JobDetails.tsx', 'utf8');

if (!code.includes('activeJobsWithSameBox')) {
    code = code.replace(
        'const [editBoxNumber, setEditBoxNumber] = useState(\'\');',
        `const [editBoxNumber, setEditBoxNumber] = useState('');
        
  const activeJobsWithSameBox = useMemo(() => {
    if (!editBoxNumber.trim() || editBoxNumber.trim() === job?.boxNumber) return [];
    return jobs.filter(j => 
        j.id !== job?.id &&
        j.boxNumber === editBoxNumber.trim() && 
        ![JobStatus.COMPLETED, JobStatus.DELIVERED, JobStatus.CANCELED, JobStatus.REJECTED].includes(j.status)
    );
  }, [editBoxNumber, jobs, job]);`
    );

    code = code.replace(
        'const handleSaveChanges = async () => {',
        `const handleSaveChanges = async () => {
        if (activeJobsWithSameBox.length > 0) {
            alert('A caixa ' + editBoxNumber + ' já está em uso por outro caso em aberto. Finalize-o antes de usar esta caixa.');
            return;
        }`
    );

    code = code.replace(
        '<input type="text" value={editBoxNumber} onChange={e => setEditBoxNumber(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" />',
        `<input type="text" value={editBoxNumber} onChange={e => setEditBoxNumber(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
                              {activeJobsWithSameBox.length > 0 && (
                                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl relative z-10">
                                      <div className="flex items-center gap-2 text-amber-700 font-bold mb-2 text-[10px] uppercase">
                                          <AlertTriangle size={14} />
                                          <span>Caixa em uso!</span>
                                      </div>
                                      <ul className="space-y-2">
                                          {activeJobsWithSameBox.map(conflictingJob => (
                                              <li key={conflictingJob.id}>
                                                  <Link to={\`/jobs/\${conflictingJob.id}\`} target="_blank" rel="noopener noreferrer" className="block p-2 bg-white rounded-lg border border-amber-100 hover:border-amber-300 transition-colors shadow-sm">
                                                      <div className="text-xs font-bold text-slate-800">OS {conflictingJob.osNumber}</div>
                                                      <div className="text-[10px] text-slate-500 truncate">{conflictingJob.dentistName} - {conflictingJob.patientName}</div>
                                                  </Link>
                                              </li>
                                          ))}
                                      </ul>
                                  </div>
                              )}`
    );
    
    fs.writeFileSync('pages/JobDetails.tsx', code);
    console.log("JobDetails patched");
} else {
    console.log("JobDetails already patched");
}
