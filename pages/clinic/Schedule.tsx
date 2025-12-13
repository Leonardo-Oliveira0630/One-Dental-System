import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Appointment, AppointmentStatus } from '../../types';
import { Calendar as CalendarIcon, Clock, User, Plus, X, Trash2, CheckCircle, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { FeatureLocked } from '../../components/FeatureLocked';

export const Schedule = () => {
  const { appointments, patients, addAppointment, updateAppointment, deleteAppointment, currentUser, currentPlan, activeOrganization } = useApp();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);

  // Form State
  const [patientId, setPatientId] = useState('');
  const [time, setTime] = useState('09:00');
  const [procedure, setProcedure] = useState('');
  const [duration, setDuration] = useState(60);
  const [notes, setNotes] = useState('');

  // --- PLAN CHECK ---
  // Se for dentista, o currentPlan reflete o plano do Active Organization selecionado.
  // Se esse plano não tiver Clinic Module, bloqueia.
  if (currentPlan && !currentPlan.features.hasClinicModule) {
      return (
          <FeatureLocked 
              title="Gestão Clínica Indisponível" 
              message={`O laboratório parceiro (${activeOrganization?.name}) não possui o módulo de Clínica disponível no plano atual.`} 
          />
      );
  }

  // Calendar Logic
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
    } else {
      setSelectedAppt(null);
      setPatientId('');
      setTime('09:00');
      setProcedure('');
      setDuration(60);
      setNotes('');
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

    if (selectedAppt) {
      updateAppointment(selectedAppt.id, { date, procedure, durationMinutes: duration, notes, patientId, patientName: patient.name });
    } else {
      const newAppt: Appointment = {
        id: Math.random().toString(36).substr(2, 9),
        organizationId: currentUser.organizationId || 'mock-org',
        dentistId: currentUser.id,
        patientId,
        patientName: patient.name,
        date,
        durationMinutes: duration,
        procedure,
        notes,
        status: AppointmentStatus.SCHEDULED
      };
      addAppointment(newAppt);
    }
    setIsModalOpen(false);
  };

  // Filter appointments for selected day
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
          <p className="text-slate-500">Gerencie seus atendimentos diários.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Calendar Widget */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit">
          <div className="flex justify-between items-center mb-6">
            <button onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() - 1)))} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronLeft size={20}/></button>
            <h2 className="font-bold text-lg text-slate-800">
              {selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </h2>
            <button onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() + 1)))} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronRight size={20}/></button>
          </div>
          <div className="grid grid-cols-7 gap-2 text-center text-sm mb-2 font-bold text-slate-400">
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
                <button 
                  key={day} 
                  onClick={() => handleDayClick(day)}
                  className={`h-10 w-10 rounded-full flex flex-col items-center justify-center relative transition-all ${
                    isSelected ? 'bg-indigo-600 text-white font-bold shadow-lg' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {day}
                  {hasAppt && !isSelected && <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full absolute bottom-1"></div>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Daily Schedule */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-center min-w-[60px]">
                <span className="block text-xs font-bold text-slate-400 uppercase">{selectedDate.toLocaleDateString('pt-BR', { weekday: 'short' })}</span>
                <span className="block text-2xl font-bold text-slate-800">{selectedDate.getDate()}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-700">Agendamentos do Dia</h3>
            </div>
            <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-md">
              <Plus size={18} /> Novo
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {dailyAppointments.length === 0 ? (
              <div className="text-center py-12 text-slate-400">Nenhum agendamento para este dia.</div>
            ) : (
              dailyAppointments.map(appt => (
                <div key={appt.id} className="flex gap-4 p-4 rounded-xl border border-slate-100 hover:shadow-md transition-all bg-white group">
                  <div className="text-center min-w-[60px]">
                    <span className="block font-bold text-lg text-slate-800">{new Date(appt.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    <span className="text-xs text-slate-400">{appt.durationMinutes} min</span>
                  </div>
                  <div className="flex-1 border-l-2 border-indigo-100 pl-4">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-800">{appt.patientName}</h4>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(appt.status)}`}>
                        {appt.status}
                      </span>
                    </div>
                    <p className="text-sm text-indigo-600 font-medium mb-1">{appt.procedure}</p>
                    {appt.notes && <p className="text-xs text-slate-500 italic">"{appt.notes}"</p>}
                    
                    <div className="mt-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {appt.status === AppointmentStatus.SCHEDULED && (
                        <button onClick={() => updateAppointment(appt.id, { status: AppointmentStatus.CONFIRMED })} className="p-1.5 text-green-600 bg-green-50 rounded hover:bg-green-100" title="Confirmar"><CheckCircle size={16}/></button>
                      )}
                      <button onClick={() => updateAppointment(appt.id, { status: AppointmentStatus.CANCELED })} className="p-1.5 text-red-600 bg-red-50 rounded hover:bg-red-100" title="Cancelar"><X size={16}/></button>
                      <button onClick={() => handleOpenModal(appt)} className="p-1.5 text-blue-600 bg-blue-50 rounded hover:bg-blue-100" title="Editar">Editar</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-800">{selectedAppt ? 'Editar Agendamento' : 'Novo Agendamento'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Paciente</label>
                <select required value={patientId} onChange={e => setPatientId(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none bg-white">
                  <option value="">Selecione...</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Horário</label>
                  <input type="time" required value={time} onChange={e => setTime(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Duração (min)</label>
                  <input type="number" required value={duration} onChange={e => setDuration(parseInt(e.target.value))} className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none" step="15" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Procedimento</label>
                <input required value={procedure} onChange={e => setProcedure(e.target.value)} placeholder="Ex: Limpeza" className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Notas</label>
                <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none" />
              </div>
              <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 mt-4 shadow-lg">Salvar Agendamento</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};