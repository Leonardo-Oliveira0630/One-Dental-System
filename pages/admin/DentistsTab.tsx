import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ManualDentist } from '../../types';
import { Plus, Search, Edit, Trash2, X, Stethoscope } from 'lucide-react';

export const DentistsTab = () => {
  const { manualDentists, addManualDentist, updateManualDentist, deleteManualDentist } = useApp();
  const [isAddingDentist, setIsAddingDentist] = useState(false);
  const [editingDentistId, setEditingDentistId] = useState<string | null>(null);
  const [dentistSearch, setDentistSearch] = useState('');

  // Form State
  const [dentistName, setDentistName] = useState('');
  const [dentistClinic, setDentistClinic] = useState('');
  const [dentistEmail, setDentistEmail] = useState('');
  const [dentistPhone, setDentistPhone] = useState('');

  const handleSaveManualDentist = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!dentistName) return;
      const data = { name: dentistName, clinicName: dentistClinic, email: dentistEmail, phone: dentistPhone };
      try {
          if (editingDentistId) {
              await updateManualDentist(editingDentistId, data);
          } else {
              await addManualDentist({ ...data, createdAt: new Date() });
          }
          setIsAddingDentist(false);
          setEditingDentistId(null);
          setDentistName(''); setDentistClinic(''); setDentistEmail(''); setDentistPhone('');
      } catch (err) { alert("Erro ao salvar cliente."); }
  };

  const filteredDentists = manualDentists.filter(d => 
    d.name.toLowerCase().includes(dentistSearch.toLowerCase()) || 
    (d.clinicName || '').toLowerCase().includes(dentistSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h3 className="font-bold text-slate-800 text-lg">Clientes Internos (Offline)</h3>
            <button onClick={() => setIsAddingDentist(true)} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg">
                <Plus size={20}/> Novo Cliente
            </button>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <div className="relative">
                <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                <input placeholder="Filtrar por nome ou clínica..." className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none" value={dentistSearch} onChange={e => setDentistSearch(e.target.value)}/>
            </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b">
                <tr><th className="p-4">Nome do Dentista</th><th className="p-4">Clínica</th><th className="p-4">Contato</th><th className="p-4 text-right">Ações</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDentists.map(dentist => (
                  <tr key={dentist.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-800">{dentist.name}</td>
                    <td className="p-4 text-slate-600 text-sm">{dentist.clinicName || '---'}</td>
                    <td className="p-4"><div className="text-xs text-slate-500">{dentist.email || 'Sem email'}</div><div className="text-xs font-bold text-slate-400">{dentist.phone || 'Sem telefone'}</div></td>
                    <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                            <button onClick={() => {
                                setEditingDentistId(dentist.id);
                                setDentistName(dentist.name);
                                setDentistClinic(dentist.clinicName || '');
                                setDentistEmail(dentist.email || '');
                                setDentistPhone(dentist.phone || '');
                                setIsAddingDentist(true);
                            }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={18}/></button>
                            <button onClick={() => deleteManualDentist(dentist.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                        </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>

        {isAddingDentist && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-6 border-b pb-4">
                      <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800"><Stethoscope className="text-blue-600" /> {editingDentistId ? 'Editar Cliente' : 'Novo Cliente'}</h3>
                      <button onClick={() => setIsAddingDentist(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                  </div>
                  <form onSubmit={handleSaveManualDentist} className="space-y-4">
                      <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Dentista</label><input required value={dentistName} onChange={e => setDentistName(e.target.value)} className="w-full px-4 py-2 border rounded-xl" /></div>
                      <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Clínica</label><input value={dentistClinic} onChange={e => setDentistClinic(e.target.value)} className="w-full px-4 py-2 border rounded-xl" /></div>
                      {/* Fixed: Replaced setValue with setDentistEmail */}
                      <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label><input type="email" value={dentistEmail} onChange={e => setDentistEmail(e.target.value)} className="w-full px-4 py-2 border rounded-xl" /></div>
                      <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefone</label><input value={dentistPhone} onChange={e => setDentistPhone(e.target.value)} className="w-full px-4 py-2 border rounded-xl" /></div>
                      <button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-all">Salvar</button>
                  </form>
              </div>
          </div>
        )}
    </div>
  );
};