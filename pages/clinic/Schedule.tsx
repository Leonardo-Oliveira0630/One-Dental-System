
import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Appointment, AppointmentStatus } from '../../types';
import { 
  Calendar as CalendarIcon, Clock, User, Plus, X, Trash2, CheckCircle, 
  AlertCircle, ChevronLeft, ChevronRight, LayoutGrid, Stethoscope, 
  Briefcase, Filter, RotateCcw, Search, MapPin
} from 'lucide-react';
import { FeatureLocked } from '../../components/FeatureLocked';

export const Schedule = () => {
  const { 
    appointments, 
    patients, 
    clinicRooms, 
    clinicDentists, 
    clinicServices,
    addAppointment, 
    updateAppointment, 
    deleteAppointment, 
    currentUser, 
    currentPlan, 
    activeOrganization 
  } = useApp();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);

  // Estados de Filtro
  const [filterRoomId, setFilterRoomId] = useState<string>('ALL');
  const [filterDentistId, setFilterDentistId] = useState<string>('ALL');

  // Form State
  const [patientId, setPatientId] = useState('');
  const [time, setTime] = useState('09:00');
  const [procedure, setProcedure] = useState('');
  const [duration, setDuration] = useState(60);
  const [notes, setNotes] = useState('');
  const [roomId, setRoomId] = useState('');
  const [clinicDentistId, setClinicDentistId] = useState('');

  // --- PLAN CHECK ---
  if (currentPlan && !currentPlan.features.hasClinicModule) {
      return <FeatureLocked title="Gestão Clínica Indisponível" message={`O laboratório parceiro (${activeOrganization?.name}) não possui o módulo de Clínica disponível no plano atual.`} />;
  }

  const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay();
  
  const handleDayClick = (day: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(day);
    setSelectedDate(newDate);
  };

  const handleOpenModal = (appt?: Appointment) => {
    if (appt) {
      setSelectedAppt(appt);
      setPatientId(appt.patientId);
      setTime(new Date(appt.date).toTimeString().substr(0, 5));
      setProcedure(appt.procedure);
      setDuration(appt.durationMinutes);
      setNotes(appt.notes || '');
      setRoomId(appt.roomId || '');
      setClinicDentistId(appt.clinicDentistId || '');
    } else {
      setSelectedAppt(null);
      setPatientId('');
      setTime('09:00');
      setProcedure('');
      setDuration(60);
      setNotes('');
      setRoomId('');
      setClinicDentistId('');
    }
    setIsModalOpen(true);
  };

  const handleServiceChange = (serviceName: string) => {
      setProcedure(serviceName);
      const serviceInfo = clinicServices.find(s => s.name === serviceName);
      if (serviceInfo) {
          setDuration(serviceInfo.durationMinutes);
      }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    const date = new Date(selectedDate);
    const [hours, minutes] = time.split(':');
    date.setHours(parseInt(hours), parseInt(minutes));

    const payload = { 
        date, procedure, durationMinutes: duration, notes, patientId, patientName: patient.name,
        roomId, clinicDentistId
    };

    if (selectedAppt) {
      updateAppointment(selectedAppt.id, payload);
    } else {
      const newAppt: Appointment = {
        id: Math.random().toString(36).substr(2, 9),
        organizationId: currentUser.organizationId || 'mock-org',
        dentistId: currentUser.id,
        status: AppointmentStatus.SCHEDULED,
        ...payload
      };
      addAppointment(newAppt);
    }
    setIsModalOpen(false);
  };

  // --- LÓGICA DE FILTRAGEM REFINADA ---
  const filteredAppointments = useMemo(() => {
    return appointments.filter(a => {
        const d = new Date(a.date);
        const sameDay = d.getDate() === selectedDate.getDate() && 
                        d.getMonth() === selectedDate.getMonth() && 
                        d.getFullYear() === selectedDate.getFullYear();
        
        if (!sameDay) return false;
        
        // Filtro por Sala
        if (filterRoomId !== 'ALL' && a.roomId !== filterRoomId) return false;
        
        // Filtro por Dentista
        if (filterDentistId !== 'ALL' && a.clinicDentistId !== filterDentistId) return false;

        return true;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [appointments, selectedDate, filterRoomId, filterDentistId]);

  const getStatusColor = (status: AppointmentStatus) => {
    switch(status) {
      case AppointmentStatus.CONFIRMED: return 'bg-green-100 text-green-700 border-green-200';
      case AppointmentStatus.COMPLETED: return 'bg-blue-100 text-blue-700 border-blue-200';
      case AppointmentStatus.CANCELED: return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const activeServices = clinicServices.filter(s => s.active);

  return (
    <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarIcon className="text-indigo-600" /> Agenda da Clínica
          </h1>
          <p className="text-slate-500 font-medium">Gestão de atendimentos, salas e equipe clínica.</p>
        </div>
        <button onClick={() => handleOpenModal()} className="w-full md:w-auto px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95">
          <Plus size={20} /> NOVO AGENDAMENTO
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        {/* CALENDÁRIO LATERAL */}
        <div className="lg:col-span-3 space-y-6">
            <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <button onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() - 1)))} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><ChevronLeft size={20}/></button>
                <h2 className="font-black text-sm text-slate-800 uppercase tracking-widest text-center">
                  {selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </h2>
                <button onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() + 1)))} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><ChevronRight size={20}/></button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] mb-3 font-black text-slate-400 uppercase tracking-tighter">
                {['D','S','T','Q','Q','S','S'].map(d => <div key={d}>{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array(firstDay).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
                {Array(daysInMonth).fill(null).map((_, i) => {
                  const day = i + 1;
                  const isSelected = day === selectedDate.getDate();
                  const hasAppt = appointments.some(a => {
                    const d = new Date(a.date);
                    return d.getDate() === day && d.getMonth() === selectedDate.getMonth();
                  });
                  return (
                    <button key={day} onClick={() => handleDayClick(day)} className={`h-9 w-9 rounded-xl flex flex-col items-center justify-center relative transition-all text-xs font-bold ${isSelected ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'hover:bg-slate-50 text-slate-600'}`}>
                      {day}
                      {hasAppt && !isSelected && <div className="w-1 h-1 bg-indigo-400 rounded-full absolute bottom-1.5"></div>}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* MINI STATS DA AGENDA */}
            <div className="bg-indigo-900 rounded-[32px] p-6 text-white shadow-xl relative overflow-hidden hidden lg:block">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Clock size={80}/></div>
                <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">Carga Horária</p>
                <h3 className="text-2xl font-black">{filteredAppointments.length} Atendimentos</h3>
                <p className="text-xs text-indigo-200 mt-2 font-medium">Filtros ativos podem ocultar alguns registros.</p>
            </div>
        </div>

        {/* LISTA DE AGENDAMENTOS E FILTROS */}
        <div className="lg:col-span-9 bg-white rounded-[32px] shadow-sm border border-slate-100 flex flex-col overflow-hidden">
          
          {/* BARRA DE FILTROS REFINADA */}
          <div className="p-4 md:p-6 border-b border-slate-50 bg-slate-50/50 flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center gap-2 text-slate-400 mr-2">
                <Filter size={18} />
                <span className="text-xs font-black uppercase tracking-widest">Filtros:</span>
            </div>
            
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                {/* Filtro por Sala */}
                <div className="relative">
                    <LayoutGrid size={14} className="absolute left-3 top-3 text-slate-400" />
                    <select 
                        value={filterRoomId} 
                        onChange={e => setFilterRoomId(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none shadow-sm"
                    >
                        <option value="ALL">Todos os Consultórios</option>
                        {clinicRooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                </div>

                {/* Filtro por Dentista */}
                <div className="relative">
                    <Stethoscope size={14} className="absolute left-3 top-3 text-slate-400" />
                    <select 
                        value={filterDentistId} 
                        onChange={e => setFilterDentistId(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none shadow-sm"
                    >
                        <option value="ALL">Todos os Dentistas</option>
                        <option value="">Dr. Titular (Dono)</option>
                        {clinicDentists.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </div>
            </div>

            {(filterRoomId !== 'ALL' || filterDentistId !== 'ALL') && (
                <button 
                    onClick={() => { setFilterRoomId('ALL'); setFilterDentistId('ALL'); }}
                    className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    title="Limpar Filtros"
                >
                    <RotateCcw size={20} />
                </button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
            <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-lg font-black">{selectedDate.getDate()}</div>
                    <div>
                        <h3 className="font-bold text-slate-800 leading-none">{selectedDate.toLocaleDateString('pt-BR', { weekday: 'long' })}</h3>
                        <p className="text-[10px] text-slate-400 font-black uppercase mt-1">Fluxo de Caixa e Pacientes</p>
                    </div>
                </div>
            </div>

            {filteredAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                <Search size={48} className="mb-4 opacity-20" />
                <p className="font-black uppercase text-xs tracking-widest">Nenhum registro para os filtros atuais</p>
              </div>
            ) : (
              filteredAppointments.map(appt => {
                const room = clinicRooms.find(r => r.id === appt.roomId);
                const dentist = clinicDentists.find(d => d.id === appt.clinicDentistId);
                return (
                    <div key={appt.id} className="flex gap-4 p-5 rounded-[24px] border border-slate-100 hover:shadow-xl hover:border-indigo-100 transition-all bg-white group relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: dentist?.color || '#6366f1' }} />
                        <div className="text-center min-w-[75px] flex flex-col justify-center border-r border-slate-50 pr-4">
                            <span className="block font-black text-xl text-slate-900 leading-none">{new Date(appt.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase mt-1.5 tracking-tighter bg-slate-50 rounded px-1">{appt.durationMinutes} MIN</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-black text-slate-800 text-lg uppercase tracking-tight truncate pr-4">{appt.patientName}</h4>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border tracking-widest shrink-0 ${getStatusColor(appt.status)}`}>
                                    {appt.status}
                                </span>
                            </div>
                            <p className="text-sm text-indigo-600 font-bold mb-4 flex items-center gap-1.5"><Briefcase size={14}/> {appt.procedure}</p>
                            
                            <div className="flex flex-wrap gap-2">
                                <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100">
                                    <MapPin size={12} className="text-slate-400" />
                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">{room?.name || 'A DEFINIR SALA'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100">
                                    <Stethoscope size={12} className="text-slate-400" />
                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">{dentist?.name || 'DR. TITULAR'}</span>
                                </div>
                            </div>
                            
                            <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                                <button onClick={() => handleOpenModal(appt)} className="px-4 py-1.5 bg-slate-900 text-white text-[10px] font-black rounded-xl hover:bg-indigo-600 transition-colors">EDITAR FICHA</button>
                                <button onClick={() => deleteAppointment(appt.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={18}/></button>
                            </div>
                        </div>
                    </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal Agendamento */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl p-8 animate-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{selectedAppt ? 'Reagendar / Editar' : 'Marcar Consulta'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24}/></button>
            </div>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Paciente da Clínica</label>
                    <div className="relative">
                        <User className="absolute left-3 top-3 text-slate-400" size={18} />
                        <select required value={patientId} onChange={e => setPatientId(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 appearance-none">
                            <option value="">Selecione o paciente...</option>
                            {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                </div>
                
                <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Serviço / Procedimento</label>
                    <div className="relative">
                        <Briefcase className="absolute left-3 top-3 text-slate-400" size={18} />
                        <select 
                            required 
                            value={procedure} 
                            onChange={e => handleServiceChange(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                        >
                            <option value="">Escolha o procedimento...</option>
                            {activeServices.map(s => (
                                <option key={s.id} value={s.name}>{s.name} - {s.category}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Horário</label>
                    <div className="relative">
                        <Clock className="absolute left-3 top-3 text-slate-400" size={18} />
                        <input type="time" required value={time} onChange={e => setTime(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" />
                    </div>
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Duração (Min)</label>
                    <input type="number" required value={duration} onChange={e => setDuration(parseInt(e.target.value))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" step="15" />
                </div>
                
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Alocar em Sala</label>
                    <div className="relative">
                        <LayoutGrid className="absolute left-3 top-3 text-slate-400" size={18} />
                        <select value={roomId} onChange={e => setRoomId(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none appearance-none">
                            <option value="">A definir...</option>
                            {clinicRooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Dentista Responsável</label>
                    <div className="relative">
                        <Stethoscope className="absolute left-3 top-3 text-slate-400" size={18} />
                        <select value={clinicDentistId} onChange={e => setClinicDentistId(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none appearance-none">
                            <option value="">Dr. Titular (Eu)</option>
                            {clinicDentists.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>
                </div>
                
                <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Notas Internas</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium h-24 resize-none outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Histórico resumido ou observações importantes..." />
                </div>
              </div>
              <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-[24px] shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">
                  {selectedAppt ? 'SALVAR ALTERAÇÕES' : 'CONFIRMAR AGENDAMENTO'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
