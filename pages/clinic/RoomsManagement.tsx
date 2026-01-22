
import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { ClinicRoom, AppointmentStatus } from '../../types';
import { Plus, LayoutGrid, X, Save, Trash2, Clock, User, UserPlus, Info, CheckCircle2, MoreHorizontal } from 'lucide-react';
import { FeatureLocked } from '../../components/FeatureLocked';

export const RoomsManagement = () => {
    const { clinicRooms, clinicDentists, appointments, addClinicRoom, updateClinicRoom, deleteClinicRoom, currentPlan } = useApp();
    const [isAdding, setIsAdding] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    // --- PLAN CHECK ---
    if (currentPlan && !currentPlan.features.hasClinicModule) {
        return <FeatureLocked title="Módulo de Salas Bloqueado" message="A gestão de consultórios físicos não está disponível no seu plano." />;
    }

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;
        await addClinicRoom({ name, description, active: true });
        setName(''); setDescription(''); setIsAdding(false);
    };

    // Lógica de Status em Tempo Real
    const roomStates = useMemo(() => {
        const now = new Date();
        const states: Record<string, any> = {};

        clinicRooms.forEach(room => {
            // Busca agendamento que esteja acontecendo AGORA nesta sala
            const currentAppt = appointments.find(a => {
                if (a.roomId !== room.id || a.status === AppointmentStatus.CANCELED) return false;
                const start = new Date(a.date);
                const end = new Date(start.getTime() + (a.durationMinutes * 60000));
                return now >= start && now <= end;
            });

            // Busca próximo agendamento do dia
            const nextAppt = appointments
                .filter(a => a.roomId === room.id && new Date(a.date) > now && a.status === AppointmentStatus.SCHEDULED)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

            states[room.id] = { current: currentAppt, next: nextAppt };
        });

        return states;
    }, [clinicRooms, appointments]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                        <LayoutGrid className="text-blue-600" /> Planta Baixa: Unidades
                    </h1>
                    <p className="text-slate-500 font-medium">Gestão visual de ocupação dos consultórios em tempo real.</p>
                </div>
                <button onClick={() => setIsAdding(true)} className="px-5 py-2.5 bg-slate-900 text-white font-black rounded-xl hover:bg-blue-600 transition-all shadow-lg flex items-center gap-2 text-sm">
                    <Plus size={18} /> Adicionar Consultório
                </button>
            </div>

            {/* PLANTA BAIXA VISUAL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {clinicRooms.length === 0 ? (
                    <div className="col-span-full py-20 text-center text-slate-400 bg-white rounded-[32px] border-2 border-dashed border-slate-100 flex flex-col items-center">
                        <LayoutGrid size={48} className="mb-4 opacity-10" />
                        <p className="font-bold">Nenhuma sala cadastrada.</p>
                        <p className="text-xs">Cadastre suas unidades para ver a ocupação aqui.</p>
                    </div>
                ) : (
                    clinicRooms.map(room => {
                        const state = roomStates[room.id];
                        const isOccupied = !!state.current;
                        const dentist = state.current ? clinicDentists.find(d => d.id === state.current.clinicDentistId) : null;

                        return (
                            <div key={room.id} className={`relative p-6 rounded-[32px] border-2 transition-all duration-300 group overflow-hidden ${isOccupied ? 'bg-white border-red-200 shadow-xl shadow-red-50' : 'bg-white border-slate-100 hover:border-blue-200 shadow-sm'}`}>
                                
                                {/* Header da Sala */}
                                <div className="flex justify-between items-start mb-6">
                                    <div className="min-w-0">
                                        <h3 className="font-black text-slate-900 text-lg leading-tight truncate uppercase tracking-tight">{room.name}</h3>
                                        <div className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${isOccupied ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${isOccupied ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                                            {isOccupied ? 'Em Atendimento' : 'Livre'}
                                        </div>
                                    </div>
                                    <button onClick={() => deleteClinicRoom(room.id)} className="p-2 text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                                </div>

                                {/* Conteúdo Central */}
                                <div className="min-h-[100px] flex flex-col justify-center">
                                    {isOccupied ? (
                                        <div className="space-y-4 animate-in slide-in-from-bottom-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600 font-bold shrink-0">
                                                    {state.current.patientName.charAt(0)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Paciente</p>
                                                    <p className="font-bold text-slate-800 truncate">{state.current.patientName}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0" style={{ color: dentist?.color }}>
                                                    <User size={20} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Profissional</p>
                                                    <p className="font-bold text-slate-800 truncate">{dentist?.name || 'Não atribuído'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-6 opacity-40">
                                            <CheckCircle2 size={32} className="mx-auto text-green-500 mb-2" />
                                            <p className="text-xs font-bold text-slate-400 uppercase">Consultório Pronto</p>
                                        </div>
                                    )}
                                </div>

                                {/* Rodapé / Próximo Agendamento */}
                                <div className={`mt-6 pt-4 border-t border-slate-50 flex items-center justify-between transition-colors ${isOccupied ? 'border-red-50' : ''}`}>
                                    <div className="flex-1">
                                        {state.next ? (
                                            <div className="flex items-center gap-2 text-slate-400">
                                                <Clock size={12} />
                                                <span className="text-[10px] font-bold uppercase truncate">
                                                    Próximo: {new Date(state.next.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Sem próximos</span>
                                        )}
                                    </div>
                                    <button className="text-slate-400 hover:text-blue-600 transition-colors"><MoreHorizontal size={20}/></button>
                                </div>

                                {/* Background Accent */}
                                {isOccupied && <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-red-500/5 rounded-full pointer-events-none blur-3xl"></div>}
                            </div>
                        );
                    })
                )}
            </div>

            {/* MODAL: NOVA SALA */}
            {isAdding && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md animate-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-[32px]">
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Novo Consultório</h3>
                            <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24}/></button>
                        </div>
                        <form onSubmit={handleAdd} className="p-8 space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Identificação da Sala</label>
                                <input value={name} onChange={e => setName(e.target.value)} required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder="Ex: Sala 01 - Ortodontia" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Descrição Breve (Opcional)</label>
                                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium resize-none" placeholder="Ex: Equipamento de raio-x periapical instalado." />
                            </div>
                            <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all transform active:scale-95 flex items-center justify-center gap-2">
                                <Save size={20}/> SALVAR UNIDADE
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
