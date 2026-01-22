
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ClinicDentist } from '../../types';
// Added Check to the lucide-react imports
import { Plus, User, Stethoscope, Hash, Edit2, Trash2, X, Save, Palette, Check } from 'lucide-react';
import { FeatureLocked } from '../../components/FeatureLocked';

const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'];

export const DentistsManagement = () => {
    const { clinicDentists, addClinicDentist, updateClinicDentist, deleteClinicDentist, currentPlan } = useApp();
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [cro, setCro] = useState('');
    const [specialty, setSpecialty] = useState('');
    const [color, setColor] = useState(COLORS[0]);

    // --- PLAN CHECK ---
    if (currentPlan && !currentPlan.features.hasClinicModule) {
        return <FeatureLocked title="Corpo Clínico Bloqueado" message="A gestão de dentistas associados não está disponível no seu plano." />;
    }

    const resetForm = () => {
        setName(''); setCro(''); setSpecialty(''); setColor(COLORS[0]);
        setIsEditing(false); setEditingId(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !cro) return;

        if (isEditing && editingId) {
            await updateClinicDentist(editingId, { name, cro, specialty, color });
        } else {
            await addClinicDentist({ name, cro, specialty, color, active: true });
        }
        resetForm();
    };

    const startEdit = (dentist: ClinicDentist) => {
        setIsEditing(true);
        setEditingId(dentist.id);
        setName(dentist.name);
        setCro(dentist.cro);
        setSpecialty(dentist.specialty);
        setColor(dentist.color);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                        <User className="text-teal-600" /> Corpo Clínico
                    </h1>
                    <p className="text-slate-500 font-medium">Cadastre os dentistas que atendem na sua unidade.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* LISTA DE DENTISTAS */}
                <div className="lg:col-span-7 space-y-4">
                    <div className="grid gap-4">
                        {clinicDentists.length === 0 ? (
                            <div className="py-20 text-center text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                                <User size={48} className="mx-auto mb-4 opacity-10" />
                                <p className="font-bold">Nenhum profissional cadastrado.</p>
                            </div>
                        ) : (
                            clinicDentists.map(dentist => (
                                <div key={dentist.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-teal-200 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg" style={{ backgroundColor: dentist.color }}>
                                            {dentist.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-800 leading-tight">{dentist.name}</h3>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 font-bold uppercase tracking-tight">
                                                <span className="flex items-center gap-1"><Stethoscope size={12}/> {dentist.specialty}</span>
                                                <span className="flex items-center gap-1"><Hash size={12}/> {dentist.cro}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={() => startEdit(dentist)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 size={18}/></button>
                                        <button onClick={() => deleteClinicDentist(dentist.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* FORMULÁRIO */}
                <div className="lg:col-span-5">
                    <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden sticky top-6">
                        <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                            <h3 className="font-bold flex items-center gap-2">
                                {isEditing ? <Edit2 size={18} className="text-teal-400" /> : <Plus size={18} className="text-teal-400" />}
                                {isEditing ? 'Editar Profissional' : 'Novo Dentista'}
                            </h3>
                            {isEditing && <button onClick={resetForm} className="text-slate-400 hover:text-white"><X size={20}/></button>}
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome Completo</label>
                                <input value={name} onChange={e => setName(e.target.value)} required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">CRO</label>
                                    <input value={cro} onChange={e => setCro(e.target.value)} required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold" placeholder="Ex: 12345-UF" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Especialidade</label>
                                    <input value={specialty} onChange={e => setSpecialty(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold" placeholder="Ex: Ortodontia" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Cor na Agenda</label>
                                <div className="flex flex-wrap gap-2">
                                    {COLORS.map(c => (
                                        <button key={c} type="button" onClick={() => setColor(c)} className={`w-10 h-10 rounded-xl transition-all ${color === c ? 'ring-4 ring-teal-100 scale-110' : 'opacity-60 hover:opacity-100'}`} style={{ backgroundColor: c }}>
                                            {color === c && <Check size={18} className="text-white mx-auto" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button type="submit" className="w-full py-4 bg-teal-600 text-white font-black rounded-2xl shadow-xl hover:bg-teal-700 transition-all flex items-center justify-center gap-2">
                                <Save size={20}/> {isEditing ? 'ATUALIZAR CADASTRO' : 'CADASTRAR DENTISTA'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};
