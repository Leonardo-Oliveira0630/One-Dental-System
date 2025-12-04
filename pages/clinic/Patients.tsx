

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ClinicPatient } from '../../types';
import { Search, Plus, User, Phone, Mail, FileText, Edit2, Trash2, X, Save } from 'lucide-react';

export const Patients = () => {
  const { patients, addPatient, updatePatient, deletePatient, currentUser } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [anamnesis, setAnamnesis] = useState('');

  const filtered = patients.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleOpenModal = (patient?: ClinicPatient) => {
    if (patient) {
      setEditingId(patient.id);
      setName(patient.name);
      setPhone(patient.phone);
      setEmail(patient.email || '');
      setCpf(patient.cpf || '');
      setAnamnesis(patient.anamnesis || '');
    } else {
      setEditingId(null);
      setName('');
      setPhone('');
      setEmail('');
      setCpf('');
      setAnamnesis('');
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (editingId) {
      updatePatient(editingId, { name, phone, email, cpf, anamnesis });
    } else {
      // FIX: The context function `addPatient` expects a partial object.
      // The previous code was creating a full, but invalid, ClinicPatient object.
      // This now correctly passes only the form data to the context.
      addPatient({
        name,
        phone,
        email,
        cpf,
        anamnesis,
        createdAt: new Date()
      });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pacientes</h1>
          <p className="text-slate-500">Gerencie o cadastro e histórico dos seus pacientes.</p>
        </div>
        <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg">
          <Plus size={20} /> Novo Paciente
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 text-slate-400" size={20} />
        <input 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nome..."
          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(patient => (
          <div key={patient.id} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold text-lg">
                  {patient.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{patient.name}</h3>
                  <p className="text-xs text-slate-500">Desde {new Date(patient.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleOpenModal(patient)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit2 size={16} /></button>
                <button onClick={() => deletePatient(patient.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
              </div>
            </div>
            
            <div className="space-y-2 text-sm text-slate-600 mb-4">
              <div className="flex items-center gap-2"><Phone size={14} className="text-slate-400"/> {patient.phone}</div>
              {patient.email && <div className="flex items-center gap-2"><Mail size={14} className="text-slate-400"/> {patient.email}</div>}
            </div>

            {patient.anamnesis && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-500 line-clamp-3 italic">
                <FileText size={12} className="inline mr-1" /> "{patient.anamnesis}"
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-800">{editingId ? 'Editar Paciente' : 'Novo Paciente'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nome Completo</label>
                <input required value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Telefone</label>
                  <input required value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">CPF (Opcional)</label>
                  <input value={cpf} onChange={e => setCpf(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Email (Opcional)</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Anamnese / Histórico</label>
                <textarea rows={4} value={anamnesis} onChange={e => setAnamnesis(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Alergias, medicamentos em uso, histórico..." />
              </div>
              <div className="pt-4 flex gap-3 justify-end">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 flex items-center gap-2"><Save size={18}/> Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};