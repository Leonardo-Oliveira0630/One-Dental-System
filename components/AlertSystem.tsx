
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Job, JobAlert, UserRole } from '../types';
import { AlertOctagon, Bell, Calendar, Clock, MapPin, Send, User, X } from 'lucide-react';

interface CreateAlertModalProps {
    job: Job;
    onClose: () => void;
}

export const CreateAlertModal: React.FC<CreateAlertModalProps> = ({ job, onClose }) => {
    const { addAlert, allUsers, sectors, currentUser } = useApp();
    const [message, setMessage] = useState('');
    const [targetType, setTargetType] = useState<'SECTOR' | 'USER'>('SECTOR');
    const [selectedSector, setSelectedSector] = useState(job.currentSector || '');
    const [selectedUserId, setSelectedUserId] = useState('');
    const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
    const [scheduledTime, setScheduledTime] = useState(new Date().toTimeString().split(' ')[0].substring(0, 5));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        // Combine date and time
        const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`);

        const newAlert: JobAlert = {
            id: Math.random().toString(36).substr(2, 9),
            jobId: job.id,
            osNumber: job.osNumber || 'N/A',
            message: message || `Atenção ao trabalho OS ${job.osNumber}`,
            targetSector: targetType === 'SECTOR' ? selectedSector : undefined,
            targetUserId: targetType === 'USER' ? selectedUserId : undefined,
            scheduledFor: scheduledFor,
            createdBy: currentUser.name,
            createdAt: new Date(),
            readBy: []
        };

        addAlert(newAlert);
        onClose();
        alert("Alarme criado com sucesso!");
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in zoom-in duration-200 overflow-hidden">
                <div className="bg-red-50 p-4 border-b border-red-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-red-800 flex items-center gap-2">
                        <Bell size={20} /> Criar Alerta de Urgência
                    </h3>
                    <button onClick={onClose} className="text-red-300 hover:text-red-500"><X size={20}/></button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Mensagem</label>
                        <textarea 
                            required
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                            placeholder="Ex: Entregar até 14h sem falta!"
                            rows={2}
                        />
                    </div>

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

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Destinatário</label>
                        <div className="flex bg-slate-100 p-1 rounded-lg mb-3">
                            <button
                                type="button"
                                onClick={() => setTargetType('SECTOR')}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${targetType === 'SECTOR' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                            >
                                Setor
                            </button>
                            <button
                                type="button"
                                onClick={() => setTargetType('USER')}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${targetType === 'USER' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                            >
                                Colaborador
                            </button>
                        </div>

                        {targetType === 'SECTOR' ? (
                            <div className="relative">
                                <MapPin size={16} className="absolute left-3 top-3 text-slate-400" />
                                <select
                                    value={selectedSector}
                                    onChange={e => setSelectedSector(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg bg-white"
                                >
                                    <option value="">Selecione um Setor...</option>
                                    {sectors.map(s => (
                                        <option key={s.id} value={s.name}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                             <div className="relative">
                                <User size={16} className="absolute left-3 top-3 text-slate-400" />
                                <select
                                    value={selectedUserId}
                                    onChange={e => setSelectedUserId(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg bg-white"
                                >
                                    <option value="">Selecione um Usuário...</option>
                                    {allUsers.filter(u => u.role !== UserRole.CLIENT).map(u => (
                                        <option key={u.id} value={u.id}>{u.name} ({u.sector || 'Geral'})</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <button 
                        type="submit"
                        className="w-full py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 flex items-center justify-center gap-2 mt-2 shadow-lg shadow-red-200"
                    >
                        <Send size={18} /> Agendar Alarme
                    </button>
                </form>
            </div>
        </div>
    );
};

export const AlertPopup = () => {
    const { activeAlert, dismissAlert } = useApp();

    if (!activeAlert) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-[200] flex justify-center p-4 animate-in slide-in-from-top-4 duration-300">
            <div className="bg-red-600 text-white rounded-2xl shadow-2xl p-6 max-w-md w-full border-4 border-red-400/50 flex flex-col gap-4">
                <div className="flex items-start gap-4">
                    <div className="bg-white/20 p-3 rounded-full shrink-0 animate-pulse">
                        <AlertOctagon size={32} />
                    </div>
                    <div>
                        <h4 className="font-bold text-lg uppercase tracking-wider mb-1">Alerta de Urgência</h4>
                        <p className="text-red-100 text-sm mb-2">
                            OS: <span className="font-mono font-bold">{activeAlert.osNumber}</span> • Enviado por: {activeAlert.createdBy}
                        </p>
                        <div className="bg-black/10 p-3 rounded-lg border border-white/10 text-lg font-bold">
                            "{activeAlert.message}"
                        </div>
                    </div>
                </div>
                
                <button 
                    onClick={() => dismissAlert(activeAlert.id)}
                    className="w-full py-3 bg-white text-red-700 font-bold rounded-xl hover:bg-red-50 transition-colors shadow-lg"
                >
                    CIENTE, VOU RESOLVER
                </button>
            </div>
        </div>
    );
};
