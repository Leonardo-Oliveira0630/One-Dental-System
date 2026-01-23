
import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ClinicPatient, PatientHistoryRecord, Attachment } from '../../types';
import { 
    Plus, Search, Phone, Mail, Edit2, Trash2, X, Save, 
    Calendar, Clock, FileText, Camera, Box, Activity, 
    UploadCloud, Download, Loader2, User, ChevronRight, ArrowLeft, History, File
} from 'lucide-react';
import { FeatureLocked } from '../../components/FeatureLocked';
import * as api from '../../services/firebaseService';

export const Patients = () => {
  const { patients, addPatient, updatePatient, deletePatient, currentPlan, activeOrganization, currentUser, uploadFile } = useApp();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<ClinicPatient | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [filter, setFilter] = useState('');

  // Prontuário State
  const [history, setHistory] = useState<PatientHistoryRecord[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyType, setHistoryType] = useState<PatientHistoryRecord['type']>('EVOLUTION');
  const [historyDesc, setHistoryDesc] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [historyDate, setHistoryDate] = useState(new Date().toISOString().split('T')[0]);

  // --- PLAN CHECK ---
  if (currentPlan && !currentPlan.features.hasClinicModule) {
      return <FeatureLocked title="Gestão Clínica Indisponível" message={`O laboratório parceiro (${activeOrganization?.name}) não possui o módulo de Clínica disponível no plano atual.`} />;
  }

  useEffect(() => {
      if (selectedPatient && currentUser?.organizationId) {
          const unsub = api.subscribePatientHistory(currentUser.organizationId, selectedPatient.id, setHistory);
          return () => unsub();
      } else {
          setHistory([]);
      }
  }, [selectedPatient, currentUser]);

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

  const handleAddHistory = async (e: React.FormEvent, files?: FileList | null) => {
    e.preventDefault();
    if (!selectedPatient || !currentUser?.organizationId) return;

    setIsUploading(true);
    const attachments: Attachment[] = [];

    if (files) {
        for (let i = 0; i < files.length; i++) {
            const url = await uploadFile(files[i]);
            attachments.push({
                id: Math.random().toString(36).substr(2, 9),
                name: files[i].name,
                url,
                uploadedAt: new Date()
            });
        }
    }

    const record: PatientHistoryRecord = {
        id: `rec_${Date.now()}`,
        patientId: selectedPatient.id,
        type: historyType,
        description: historyDesc,
        date: new Date(historyDate),
        attachments,
        professionalId: currentUser.id,
        professionalName: currentUser.name,
        createdAt: new Date()
    };

    await api.apiAddPatientHistory(currentUser.organizationId, selectedPatient.id, record);
    setHistoryDesc('');
    setIsHistoryModalOpen(false);
    setIsUploading(false);
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
        {!selectedPatient ? (
            <>
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
            </>
        ) : (
            /* VISUALIZAÇÃO DETALHADA DO PRONTUÁRIO */
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <button onClick={() => setSelectedPatient(null)} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-black text-sm uppercase tracking-widest"><ArrowLeft size={20}/> Voltar para Lista</button>
                    <div className="flex gap-2">
                        <button onClick={() => setIsHistoryModalOpen(true)} className="px-6 py-3 bg-indigo-600 text-white font-black rounded-2xl shadow-xl flex items-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all">
                            <Plus size={20}/> ADICIONAR REGISTRO / EXAME
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* SIDEBAR: DADOS DO PACIENTE */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 text-center">
                            <div className="w-24 h-24 bg-indigo-600 text-white rounded-[24px] flex items-center justify-center text-4xl font-black mx-auto mb-6 shadow-xl shadow-indigo-100">
                                {selectedPatient.name.charAt(0)}
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-tight mb-2">{selectedPatient.name}</h2>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest mb-8">Paciente ID: {selectedPatient.id.substring(0,8)}</div>
                            
                            <div className="space-y-4 text-left border-t border-slate-50 pt-8">
                                <div><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Telefone</p><p className="font-bold text-slate-800">{selectedPatient.phone}</p></div>
                                <div><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Email</p><p className="font-bold text-slate-800 truncate">{selectedPatient.email || 'Não informado'}</p></div>
                                <div><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Documento (CPF)</p><p className="font-bold text-slate-800">{selectedPatient.cpf || 'Não informado'}</p></div>
                            </div>
                        </div>

                        {/* MINI GALERIA DE ARQUIVOS */}
                        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
                            <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-6 flex items-center gap-2"><Camera size={18} className="text-blue-500"/> Arquivos Recentes</h3>
                            <div className="grid grid-cols-3 gap-2">
                                {history.flatMap(h => h.attachments || []).slice(0, 9).map((att, i) => (
                                    <a key={i} href={att.url} target="_blank" rel="noreferrer" className="aspect-square bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center overflow-hidden hover:border-blue-300 transition-all group">
                                        {att.name.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                            <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                                        ) : att.name.toLowerCase().endsWith('.stl') ? (
                                            <Box className="text-indigo-400 group-hover:scale-110 transition-transform" size={24}/>
                                        ) : (
                                            <File className="text-slate-300" size={24}/>
                                        )}
                                    </a>
                                ))}
                                {history.flatMap(h => h.attachments || []).length === 0 && <div className="col-span-3 text-center py-6 text-slate-300 text-xs italic">Nenhum arquivo anexado.</div>}
                            </div>
                        </div>
                    </div>

                    {/* CONTEÚDO: TIMELINE / PRONTUÁRIO */}
                    <div className="lg:col-span-8">
                        <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-8 md:p-12">
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-12 flex items-center gap-3">
                                <History size={24} className="text-indigo-600"/> Histórico Clínico Digital
                            </h3>

                            {history.length === 0 ? (
                                <div className="py-20 text-center text-slate-400 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-100">
                                    <FileText size={48} className="mx-auto mb-4 opacity-10" />
                                    <p className="font-bold">Prontuário Vazio</p>
                                    <p className="text-xs max-w-xs mx-auto mt-2">Clique em "Adicionar Registro" para começar a documentar este paciente.</p>
                                </div>
                            ) : (
                                <div className="space-y-12 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                                    {history.map((record, idx) => (
                                        <div key={record.id} className="flex gap-8 relative animate-in fade-in slide-in-from-bottom-2">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 z-10 border-4 border-white shadow-md ${idx === 0 ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400'}`}>
                                                {idx === 0 ? <Clock size={16} /> : <div className="w-2 h-2 bg-slate-300 rounded-full" />}
                                            </div>
                                            <div className="flex-1 bg-slate-50/50 p-6 rounded-[24px] border border-slate-100 hover:border-indigo-100 hover:bg-white hover:shadow-xl transition-all group">
                                                <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            {getRecordIcon(record.type)}
                                                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{getRecordLabel(record.type)}</span>
                                                        </div>
                                                        <h4 className="font-black text-slate-800 text-lg leading-tight uppercase">{record.description}</h4>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="text-sm font-black text-slate-900 leading-none">{record.date.toLocaleDateString()}</p>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-tighter">Por: {record.professionalName}</p>
                                                    </div>
                                                </div>

                                                {record.attachments && record.attachments.length > 0 && (
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100">
                                                        {record.attachments.map(att => (
                                                            <a key={att.id} href={att.url} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 p-3 bg-white rounded-2xl border border-slate-100 hover:bg-indigo-50 hover:border-indigo-200 transition-all text-center">
                                                                {att.name.match(/\.(jpg|jpeg|png)$/i) ? <ImageIcon className="text-blue-500" size={20}/> : <FileText className="text-slate-400" size={20}/>}
                                                                <span className="text-[9px] font-black text-slate-600 uppercase truncate w-full">{att.name}</span>
                                                                <Download size={12} className="text-slate-300"/>
                                                            </a>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => currentUser?.organizationId && api.apiDeletePatientHistory(currentUser.organizationId, selectedPatient.id, record.id)} className="p-2 text-red-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}

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

        {/* MODAL ADICIONAR AO PRONTUÁRIO */}
        {isHistoryModalOpen && selectedPatient && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl animate-in zoom-in duration-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-black text-lg text-slate-800 uppercase tracking-tight">Novo Registro de Prontuário</h3>
                        <button onClick={() => setIsHistoryModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24} /></button>
                    </div>
                    <form onSubmit={(e) => handleAddHistory(e, (document.getElementById('patient-files') as HTMLInputElement).files)} className="p-8 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Data do Evento</label>
                                <input type="date" value={historyDate} onChange={e => setHistoryDate(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tipo de Registro</label>
                                <select value={historyType} onChange={e => setHistoryType(e.target.value as any)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold">
                                    <option value="EVOLUTION">Evolução Clínica</option>
                                    <option value="PROCEDURE">Procedimento Realizado</option>
                                    <option value="XRAY">Raio-X / Fotografia</option>
                                    <option value="SCAN">Escaneamento STL</option>
                                    <option value="NOTE">Observação Livre</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Descrição / Detalhamento</label>
                            <textarea required value={historyDesc} onChange={e => setHistoryDesc(e.target.value)} rows={4} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium resize-none" placeholder="O que foi realizado ou observado?" />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Anexar Mídias (Exames/STL/Fotos)</label>
                            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:bg-slate-50 transition-colors relative group">
                                <input type="file" multiple id="patient-files" className="absolute inset-0 opacity-0 cursor-pointer" />
                                <div className="flex flex-col items-center gap-2 text-slate-400 group-hover:text-indigo-600 transition-colors">
                                    <UploadCloud size={32} />
                                    <span className="text-xs font-bold uppercase tracking-tight">Selecione ou arraste arquivos</span>
                                </div>
                            </div>
                        </div>

                        <button type="submit" disabled={isUploading} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                            {isUploading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                            {isUploading ? 'PROCESSANDO UPLOADS...' : 'SALVAR NO PRONTUÁRIO'}
                        </button>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

const ImageIcon = ({ className, size }: { className?: string, size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
);
