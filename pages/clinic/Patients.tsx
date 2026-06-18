
import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ClinicPatient, PatientHistoryRecord, Attachment } from '../../types';
import { 
    Plus, Search, Phone, Mail, Edit2, Trash2, X, Save, 
    Calendar, Clock, FileText, Camera, Box, Activity, 
    UploadCloud, Download, Loader2, User, ChevronRight, ArrowLeft, History, File
} from 'lucide-react';
import { FeatureLocked } from '../../components/FeatureLocked';
import { PatientChartModal } from '../../components/PatientChartModal';
import * as api from '../../services/firebaseService';

export const Patients = () => {
  const { patients, addPatient, updatePatient, deletePatient, currentPlan, activeOrganization, currentUser } = useApp();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<ClinicPatient | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [filter, setFilter] = useState('');

  // --- PLAN CHECK (Permitir acesso limitado para cadastro de pacientes se não possuir módulo clínico) ---

  const handleOpenModal = (patient?: ClinicPatient) => {
    if (patient) {
        setEditingId(patient.id);
        setName(patient.name);
        setPhone(patient.phone);
        setEmail(patient.email || '');
        setCpf(patient.cpf || '');
    } else {
        setEditingId(null);
        setName('');
        setPhone('');
        setEmail('');
        setCpf('');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
        await updatePatient(editingId, { name, phone, email, cpf });
    } else {
        await addPatient({ 
          name, 
          phone, 
          email, 
          cpf, 
          createdAt: new Date(), 
          dentistId: currentUser?.id || '' 
        });
    }
    setIsModalOpen(false);
  };

  const filteredPatients = patients.filter(p => 
      p.name.toLowerCase().includes(filter.toLowerCase()) || 
      p.phone.includes(filter) ||
      (p.email && p.email.toLowerCase().includes(filter.toLowerCase()))
  );

  const getRecordIcon = (type: PatientHistoryRecord['type']) => {
      switch(type) {
          case 'PROCEDURE': return <Activity className="text-teal-500" />;
          case 'SCAN': return <Box className="text-indigo-500" />;
          case 'XRAY': return <Camera className="text-blue-500" />;
          case 'EVOLUTION': return <History className="text-amber-500" />;
          default: return <FileText className="text-slate-400" />;
      }
  };

  const getRecordLabel = (type: PatientHistoryRecord['type']) => {
      switch(type) {
          case 'PROCEDURE': return 'Procedimento';
          case 'SCAN': return 'Escaneamento 3D';
          case 'XRAY': return 'Radiografia / Imagem';
          case 'EVOLUTION': return 'Evolução Clínica';
          default: return 'Nota';
      }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gestão de Pacientes</h1>
                <p className="text-slate-500 font-medium">Controle de cadastros e prontuários clínicos.</p>
            </div>
            <button 
                onClick={() => handleOpenModal()}
                className="w-full md:w-auto px-6 py-3 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-xl shadow-indigo-100 transition-all active:scale-95"
            >
                <Plus size={20} /> NOVO PACIENTE
            </button>
        </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
                    <div className="relative mb-6">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                            placeholder="Buscar por nome, telefone ou documento..."
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredPatients.map(patient => (
                            <div key={patient.id} onClick={() => setSelectedPatient(patient)} className="p-6 border border-slate-100 rounded-[32px] hover:shadow-xl hover:border-indigo-200 transition-all bg-white cursor-pointer group relative overflow-hidden">
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                        {patient.name.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-black text-slate-800 text-lg leading-tight truncate uppercase tracking-tight">{patient.name}</h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Cadastrado em {new Date(patient.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="space-y-2 text-sm text-slate-500 font-bold mb-4">
                                    <div className="flex items-center gap-2">
                                        <Phone size={14} className="text-indigo-400" />
                                        {patient.phone}
                                    </div>
                                    {patient.email && (
                                        <div className="flex items-center gap-2 truncate">
                                            <Mail size={14} className="text-indigo-400" />
                                            <span className="truncate">{patient.email}</span>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                                    <span className="text-[10px] font-black text-indigo-600 uppercase flex items-center gap-1">Ver Prontuário <ChevronRight size={12}/></span>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => { e.stopPropagation(); handleOpenModal(patient); }} className="p-2 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-xl">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); deletePatient(patient.id); }} className="p-2 bg-slate-50 text-slate-400 hover:text-red-600 rounded-xl">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {filteredPatients.length === 0 && (
                            <div className="col-span-full py-20 text-center text-slate-400 italic font-medium">Nenhum paciente encontrado.</div>
                        )}
                    </div>
                </div>

                {/* MODAL CADASTRO BÁSICO */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md animate-in zoom-in duration-200 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <h3 className="font-black text-lg text-slate-800 uppercase tracking-tight">
                                    {editingId ? 'Editar Cadastro' : 'Ficha de Cadastro'}
                                </h3>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24} /></button>
                            </div>
                            <form onSubmit={handleSave} className="p-8 space-y-5">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome Completo</label>
                                    <input required value={name} onChange={e => setName(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Telefone / WhatsApp</label>
                                        <input required value={phone} onChange={e => setPhone(e.target.value)} placeholder="(00) 00000-0000" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Documento (CPF)</label>
                                        <input value={cpf} onChange={e => setCpf(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">E-mail</label>
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                                </div>
                                <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 mt-2 flex items-center justify-center gap-2 transform active:scale-95 transition-all">
                                    <Save size={18} /> CONFIRMAR DADOS
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* POPUP PRONTUÁRIO MULTI-ABAS DO PACIENTE */}
                {selectedPatient && (
                    <PatientChartModal 
                        patient={selectedPatient} 
                        onClose={() => setSelectedPatient(null)} 
                    />
                )}
    </div>
  );
};

const ImageIcon = ({ className, size }: { className?: string, size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
);
