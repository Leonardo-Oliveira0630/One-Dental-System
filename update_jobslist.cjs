const fs = require('fs');

let content = fs.readFileSync('pages/JobsList.tsx', 'utf8');

// 1. Add selectedStatuses state
content = content.replace(
    "const [statusFilter, setStatusFilter] = useState<string>('ALL');",
    "const [statusFilter, setStatusFilter] = useState<string>('ALL');\n  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);"
);

// 2. Add isJobOverdue helper before combinedJobs
content = content.replace(
    "const combinedJobs = useMemo(() => {",
    `const isJobOverdue = (job: any) => {
    if (!job.dueDate) return false;
    const isInactive = ['COMPLETED', 'DELIVERED', 'REJECTED', 'REJECTED_REQUISITION', 'CANCELED'].includes(job.status);
    if (isInactive) return false;
    const due = new Date(job.dueDate);
    due.setHours(23, 59, 59, 999);
    return new Date() > due;
  };

  const statusOptions = useMemo(() => [
    { value: 'OVERDUE', label: 'Atrasado' },
    ...Object.values(JobStatus).map(s => ({ value: s, label: getTranslatedStatus(s) }))
  ].sort((a, b) => a.label.localeCompare(b.label)), []);

  const combinedJobs = useMemo(() => {`
);

// 3. Update filteredJobs logic
content = content.replace(
    "if (statusFilter !== 'ALL') {",
    `if (selectedStatuses.length > 0) {
            const hasOverdueSelected = selectedStatuses.includes('OVERDUE');
            const hasOtherStatuses = selectedStatuses.some(s => s !== 'OVERDUE');
            
            let matchesStatus = false;
            
            if (hasOverdueSelected && isJobOverdue(job)) {
                matchesStatus = true;
            }
            
            if (hasOtherStatuses && selectedStatuses.includes(job.status)) {
                matchesStatus = true;
            }
            
            if (!matchesStatus) return false;
        } else if (statusFilter !== 'ALL') {`
);

// 4. Update useMemo dependencies for filteredJobs
content = content.replace(
    "[jobs, isClient, currentUser?.id, currentUser?.manualDentistId, activeManualDentistId, filterText, statusFilter, startDate, endDate, selectedDentists, selectedSectors, selectedCollaborators, filterUrgency, filterAttention, filterOrigin]",
    "[jobs, isClient, currentUser?.id, currentUser?.manualDentistId, activeManualDentistId, filterText, statusFilter, selectedStatuses, startDate, endDate, selectedDentists, selectedSectors, selectedCollaborators, filterUrgency, filterAttention, filterOrigin]"
);

// 5. Replace single select with MultiSelect
content = content.replace(
    '<select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-xs font-bold outline-none bg-slate-50">\n                    <option value="ALL">Todos os Status</option>\n                    {Object.values(JobStatus).map(s => <option key={s} value={s}>{getTranslatedStatus(s as JobStatus)}</option>)}\n                </select>',
    `<MultiSelect 
                            options={statusOptions} 
                            selectedValues={selectedStatuses} 
                            onChange={setSelectedStatuses} 
                            placeholder="Filtrar Status" 
                        />`
);

// 6. Overdue visual logic for JobRow
// In getStatusColor:
content = content.replace(
    "const getStatusColor = (status: any) => {",
    `const getStatusColor = (status: any, isOverdue = false) => {
      if (isOverdue) return 'bg-red-500 text-white border-red-600 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse';`
);

// In getTranslatedStatus:
content = content.replace(
    "const getTranslatedStatus = (status: any) => {",
    `const getTranslatedStatus = (status: any, isOverdue = false) => {
      if (isOverdue) return 'Atrasado';`
);

fs.writeFileSync('pages/JobsList.tsx', content);
console.log('JobsList updated successfully.');
