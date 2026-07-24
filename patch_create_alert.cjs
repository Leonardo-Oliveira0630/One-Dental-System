const fs = require('fs');
let code = fs.readFileSync('components/AlertSystem.tsx', 'utf8');

const newStates = `
    const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
    const [scheduledTime, setScheduledTime] = useState(new Date().toTimeString().split(' ')[0].substring(0, 5));
    const [isRecurring, setIsRecurring] = useState(false);
    const [repeatInterval, setRepeatInterval] = useState(15);
    const [repeatCount, setRepeatCount] = useState(3);
`;

code = code.replace(/const \[scheduledDate, setScheduledDate\] = [^;]+;\n\s*const \[scheduledTime, setScheduledTime\] = [^;]+;/, newStates);

const newAlertObj = `
        const newAlert: JobAlert = {
            id: Math.random().toString(36).substr(2, 9),
            organizationId: currentUser.organizationId || 'mock-org',
            jobId: job.id,
            osNumber: job.osNumber || 'N/A',
            message: message || \`Atenção ao trabalho OS \${job.osNumber}\`,
            targetSector: targetType === 'SECTOR' ? selectedSector : undefined,
            targetUserId: targetType === 'USER' ? selectedUserId : undefined,
            scheduledFor: scheduledFor,
            createdBy: currentUser.name,
            createdAt: new Date(),
            readBy: [],
            repeatInterval: isRecurring ? repeatInterval : undefined,
            repeatCount: isRecurring ? repeatCount : undefined,
            repeatedCount: isRecurring ? 0 : undefined
        };
`;

code = code.replace(/const newAlert: JobAlert = \{[\s\S]*?\};/, newAlertObj);

const formAddition = `
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Data</label>
                            <input 
                                type="date"
                                required
                                value={scheduledDate}
                                onChange={e => setScheduledDate(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                            />
                         </div>
                         <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Hora</label>
                            <input 
                                type="time"
                                required
                                value={scheduledTime}
                                onChange={e => setScheduledTime(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                            />
                         </div>
                    </div>

                    <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={isRecurring}
                                onChange={e => setIsRecurring(e.target.checked)}
                                className="w-4 h-4 text-red-600 rounded"
                            />
                            Repetir este Alarme
                        </label>
                        
                        {isRecurring && (
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Intervalo (Minutos)</label>
                                    <input 
                                        type="number"
                                        min="1"
                                        required={isRecurring}
                                        value={repeatInterval}
                                        onChange={e => setRepeatInterval(Number(e.target.value))}
                                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Quantas Vezes?</label>
                                    <input 
                                        type="number"
                                        min="1"
                                        required={isRecurring}
                                        value={repeatCount}
                                        onChange={e => setRepeatCount(Number(e.target.value))}
                                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
`;

code = code.replace(/<div className="grid grid-cols-2 gap-4">[\s\S]*?<\/div>\s*<\/div>/, formAddition);

fs.writeFileSync('components/AlertSystem.tsx', code);
console.log("Patched CreateAlertModal in AlertSystem.tsx");
