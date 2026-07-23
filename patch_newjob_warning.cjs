const fs = require('fs');
let code = fs.readFileSync('pages/NewJob.tsx', 'utf8');

if (!code.includes('activeJobsWithSameBox')) {
    code = code.replace(
        'const [boxNumber, setBoxNumber] = useState(\'\');',
        `const [boxNumber, setBoxNumber] = useState('');
  
  const activeJobsWithSameBox = useMemo(() => {
    if (!boxNumber.trim()) return [];
    return jobs.filter(j => 
        j.boxNumber === boxNumber.trim() && 
        ![JobStatus.COMPLETED, JobStatus.DELIVERED, JobStatus.CANCELED, JobStatus.REJECTED].includes(j.status)
    );
  }, [boxNumber, jobs]);`
    );

    code = code.replace(
        'const handleSubmit = async (e: React.FormEvent) => {',
        `const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeJobsWithSameBox.length > 0) {
        alert('A caixa ' + boxNumber + ' já está em uso por outro caso em aberto. Finalize-o antes de usar esta caixa.');
        return;
    }`
    );

    code = code.replace(
        '<input value={boxNumber} onChange={e => setBoxNumber(e.target.value)} placeholder="00" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-center font-black text-2xl focus:ring-2 focus:ring-blue-500 outline-none" />',
        `<input value={boxNumber} onChange={e => setBoxNumber(e.target.value)} placeholder="00" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-center font-black text-2xl focus:ring-2 focus:ring-blue-500 outline-none" />
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

    if (!code.includes('AlertTriangle')) {
        code = code.replace(
            'import { Plus, X, Upload, Trash2, Calendar, FileText, CheckCircle2, ChevronRight, UserCircle2, Pill, Search, Stethoscope, Briefcase, Box, MessageCircle, Info } from \'lucide-react\';',
            'import { Plus, X, Upload, Trash2, Calendar, FileText, CheckCircle2, ChevronRight, UserCircle2, Pill, Search, Stethoscope, Briefcase, Box, MessageCircle, Info, AlertTriangle } from \'lucide-react\';'
        );
    }
    
    fs.writeFileSync('pages/NewJob.tsx', code);
    console.log("NewJob patched");
}
