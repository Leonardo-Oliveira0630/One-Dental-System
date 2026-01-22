
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Appointment, AppointmentStatus } from '../../types';
import { Calendar as CalendarIcon, Clock, User, Plus, X, Trash2, CheckCircle, AlertCircle, ChevronLeft, ChevronRight, LayoutGrid, Stethoscope } from 'lucide-react';
import { FeatureLocked } from '../../components/FeatureLocked';

export const Schedule = () => {
  const { appointments, patients, clinicRooms, clinicDentists, addAppointment, updateAppointment, deleteAppointment, currentUser, currentPlan, activeOrganization } = useApp();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);

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

  const dailyAppointments = appointments.filter(a => {
    const d = new Date(a.date);
    return d.getDate() === selectedDate.getDate() && 
           d.getMonth() === selectedDate.getMonth() && 
           d.getFullYear() === selectedDate.getFullYear();
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const getStatusColor = (status: AppointmentStatus) => {
    switch(status) {
      case AppointmentStatus.CONFIRMED: return 'bg-green-100 text-green-700 border-green-200';
      case AppointmentStatus.COMPLETED: return 'bg-blue-100 text-blue-700 border-blue-200';
      case AppointmentStatus.CANCELED: return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agenda Clínica</h1>
          <p className="text-slate-500">Gestão de consultas, salas e corpo clínico.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit">
          <div className="flex justify-between items-center mb-6">
            <button onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() - 1)))} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronLeft size={20}/></button>
            <h2 className="font-bold text-lg text-slate-800 uppercase tracking-tight">
              {selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </h2>
            <button onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() + 1)))} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronRight size={20}/></button>
          </div>
          <div className="grid grid-cols-7 gap-2 text-center text-[10px] mb-2 font-black text-slate-400 uppercase tracking-widest">
            {['D','S','T','Q','Q','S','S'].map(d => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array(firstDay).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
            {Array(daysInMonth).fill(null).map((_, i) => {
              const day = i + 1;
              const isSelected = day === selectedDate.getDate();
              const hasAppt = appointments.some(a => {
                const d = new Date(a.date);
                return d.getDate() === day && d.getMonth() === selectedDate.getMonth();
              });
              return (
                <button key={day} onClick={() => handleDayClick(day)} className={`h-10 w-10 rounded-full flex flex-col items-center justify-center relative transition-all ${isSelected ? 'bg-indigo-600 text-white font-bold shadow-lg' : 'hover:bg-slate-50 text-slate-700'}`}>
                  {day}
                  {hasAppt && !isSelected && <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full absolute bottom-1"></div>}
                </button>
              )
            })}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-center min-w-[60px]">
                <span className="block text-xs font-bold text-slate-400 uppercase">{selectedDate.toLocaleDateString('pt-BR', { weekday: 'short' })}</span>
                <span className="block text-2xl font-bold text-slate-800">{selectedDate.getDate()}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-700">Fluxo de Atendimento</h3>
            </div>
            <button onClick={() => handleOpenModal()} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-md transition-all">
              <Plus size={18} /> Novo Agendamento
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
            {dailyAppointments.length === 0 ? (
              <div className="text-center py-20 text-slate-400 italic">Nenhum atendimento programado para hoje.</div>
            ) : (
              dailyAppointments.map(appt => {
                const room = clinicRooms.find(r => r.id === appt.roomId);
                const dentist = clinicDentists.find(d => d.id === appt.clinicDentistId);
                return (
                    <div key={appt.id} className="flex gap-4 p-5 rounded-[24px] border border-slate-100 hover:shadow-xl transition-all bg-white group relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: dentist?.color || '#e2e8f0' }} />
                        <div className="text-center min-w-[70px] flex flex-col justify-center border-r border-slate-50 pr-4">
                            <span className="block font-black text-xl text-slate-900 leading-none">{new Date(appt.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-tighter">{appt.durationMinutes} min</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-black text-slate-800 text-lg uppercase tracking-tight truncate">{appt.patientName}</h4>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border tracking-widest ${getStatusColor(appt.status)}`}>
                                    {appt.status}
                                </span>
                            </div>
                            <p className="text-sm text-indigo-600 font-bold mb-3 flex items-center gap-1"><CheckCircle size={14}/> {appt.procedure}</p>
                            
                            <div className="flex flex-wrap gap-3">
                                <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                    <LayoutGrid size={12} className="text-slate-400" />
                                    <span className="text-[10px] font-black text-slate-500 uppercase">{room?.name || 'Sem Sala'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                    <Stethoscope size={12} className="text-slate-400" />
                                    <span className="text-[10px] font-black text-slate-500 uppercase">{dentist?.name || 'Dr. Titular'}</span>
                                </div>
                            </div>
                            
                            <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleOpenModal(appt)} className="px-3 py-1.5 bg-slate-900 text-white text-[10px] font-black rounded-lg hover:bg-blue-600">EDITAR</button>
                                <button onClick={() => deleteAppointment(appt.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
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
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl p-8 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{selectedAppt ? 'Editar Agendamento' : 'Novo Atendimento'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
            </div>
            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Paciente</label>
                    <select required value={patientId} onChange={e => setPatientId(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Selecione um paciente...</option>
                        {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Horário</label>
                    <input type="time" required value={time} onChange={e => setTime(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Duração (min)</label>
                    <input type="number" required value={duration} onChange={e => setDuration(parseInt(e.target.value))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold" step="15" />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Consultório (Sala)</label>
                    <select value={roomId} onChange={e => setRoomId(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold">
                        <option value="">A definir...</option>
                        {clinicRooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Dentista Responsável</label>
                    <select value={clinicDentistId} onChange={e => setClinicDentistId(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold">
                        <option value="">Dr. Titular</option>
                        {clinicDentists.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </div>
                <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Procedimento</label>
                    <input required value={procedure} onChange={e => setProcedure(e.target.value)} placeholder="Ex: Moldagem Prótese" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
                </div>
              </div>
              <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 mt-4">SALVAR NA AGENDA</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
