
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ClinicPatient } from '../../types';
import { Plus, Search, Phone, Mail, Edit2, Trash2, X, Save } from 'lucide-react';

export const Patients = () => {
  const { patients, addPatient, updatePatient, deletePatient } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [filter, setFilter] = useState('');

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
        await addPatient({ name, phone, email, cpf, createdAt: new Date() });
    }
    setIsModalOpen(false);
  };

  const filteredPatients = patients.filter(p => 
      p.name.toLowerCase().includes(filter.toLowerCase()) || 
      p.phone.includes(filter) ||
      (p.email && p.email.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Meus Pacientes</h1>
                <p className="text-slate-500">Gerencie o cadastro de pacientes da sua clínica.</p>
            </div>
            <button 
                onClick={() => handleOpenModal()}
                className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 flex items-center gap-2 shadow-lg shadow-indigo-200"
            >
                <Plus size={20} /> Novo Paciente
            </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <div className="relative mb-4">
                <Search className="absolute left-3 top-3 text-slate-400" size={20} />
                <input 
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    placeholder="Buscar por nome, telefone ou email..."
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPatients.map(patient => (
                    <div key={patient.id} className="p-4 border border-slate-200 rounded-xl hover:shadow-md transition-shadow bg-slate-50 group relative">
                        <div className="flex items-start gap-4 mb-3">
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                                {patient.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">{patient.name}</h3>
                                {patient.cpf && <p className="text-xs text-slate-400">CPF: {patient.cpf}</p>}
                            </div>
                        </div>
                        <div className="space-y-2 text-sm text-slate-600">
                            <div className="flex items-center gap-2">
                                <Phone size={14} className="text-slate-400" />
                                {patient.phone}
                            </div>
                            {patient.email && (
                                <div className="flex items-center gap-2 truncate">
                                    <Mail size={14} className="text-slate-400" />
                                    <span className="truncate">{patient.email}</span>
                                </div>
                            )}
                        </div>
                        
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleOpenModal(patient)} className="p-1.5 bg-white text-blue-600 rounded-lg border border-slate-200 hover:bg-blue-50">
                                <Edit2 size={14} />
                            </button>
                            <button onClick={() => deletePatient(patient.id)} className="p-1.5 bg-white text-red-600 rounded-lg border border-slate-200 hover:bg-red-50">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}
                {filteredPatients.length === 0 && (
                    <div className="col-span-full text-center py-8 text-slate-400">
                        Nenhum paciente encontrado.
                    </div>
                )}
            </div>
        </div>

        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in zoom-in duration-200">
                    <div className="flex justify-between items-center p-6 border-b border-slate-100">
                        <h3 className="font-bold text-lg text-slate-800">
                            {editingId ? 'Editar Paciente' : 'Novo Paciente'}
                        </h3>
                        <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={24} />
                        </button>
                    </div>
                    <form onSubmit={handleSave} className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Nome Completo</label>
                            <input 
                                required
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Telefone / Celular</label>
                            <input 
                                required
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                placeholder="(00) 00000-0000"
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Email (Opcional)</label>
                            <input 
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">CPF (Opcional)</label>
                            <input 
                                value={cpf}
                                onChange={e => setCpf(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <button 
                            type="submit" 
                            className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg mt-2 flex items-center justify-center gap-2"
                        >
                            <Save size={18} /> Salvar
                        </button>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};
