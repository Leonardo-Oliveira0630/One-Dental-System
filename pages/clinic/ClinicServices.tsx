
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ClinicService } from '../../types';
// Added Loader2 to imports from lucide-react
import { Plus, Edit2, Trash2, X, Save, Search, Stethoscope, Clock, DollarSign, Tag, Info, Loader2 } from 'lucide-react';
import { FeatureLocked } from '../../components/FeatureLocked';

export const ClinicServices = () => {
  const { clinicServices, addClinicService, updateClinicService, deleteClinicService, currentPlan, activeOrganization } = useApp();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [duration, setDuration] = useState(60);
  const [active, setActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // --- PLAN CHECK ---
  if (currentPlan && !currentPlan.features.hasClinicModule) {
      return (
          <FeatureLocked 
              title="Módulo de Clínica Bloqueado" 
              message="O módulo de gestão interna de procedimentos clínicos não está disponível no seu plano atual." 
          />
      );
  }

  const resetForm = () => {
    setName('');
    setCategory('');
    setDescription('');
    setPrice(0);
    setDuration(60);
    setActive(true);
    setIsEditing(false);
    setEditingId(null);
  };

  const handleEdit = (service: ClinicService) => {
    setIsEditing(true);
    setEditingId(service.id);
    setName(service.name);
    setCategory(service.category);
    setDescription(service.description || '');
    setPrice(service.price);
    setDuration(service.durationMinutes);
    setActive(service.active);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !category) {
        alert("Preencha o nome e a categoria.");
        return;
    }
    
    setIsSaving(true);
    try {
      if (isEditing && editingId) {
          await updateClinicService(editingId, { name, category, description, price, durationMinutes: duration, active });
      } else {
          await addClinicService({ name, category, description, price, durationMinutes: duration, active });
      }
      resetForm();
    } catch (error) {
        alert("Falha ao salvar procedimento.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredServices = clinicServices.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                <Stethoscope className="text-teal-600" /> Procedimentos da Clínica
            </h1>
            <p className="text-slate-500 font-medium">Tabela de serviços e preços cobrados dos seus pacientes.</p>
        </div>
        {isEditing && (
            <button 
                onClick={resetForm}
                className="px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 text-slate-600 flex items-center gap-2 font-bold transition-all"
            >
                <Plus size={18} /> Novo Procedimento
            </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LISTA DE SERVIÇOS */}
        <div className="lg:col-span-7 space-y-4">
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Buscar por procedimento ou categoria..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
                    />
                </div>
            </div>

            <div className="grid gap-3">
                {filteredServices.length === 0 ? (
                    <div className="py-20 text-center text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center">
                        <Tag size={48} className="mb-4 opacity-10" />
                        <p className="font-bold">Nenhum serviço cadastrado.</p>
                        <p className="text-xs">Clique no formulário ao lado para começar.</p>
                    </div>
                ) : (
                    filteredServices.map(service => (
                        <div 
                            key={service.id} 
                            onClick={() => handleEdit(service)}
                            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between group ${
                                editingId === service.id 
                                    ? 'bg-teal-50 border-teal-500 shadow-md scale-[1.01]' 
                                    : 'bg-white border-slate-100 shadow-sm hover:border-teal-200'
                            }`}
                        >
                            <div className="flex items-center gap-4 min-w-0">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${editingId === service.id ? 'bg-teal-600 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-teal-100 group-hover:text-teal-600'}`}>
                                    <Stethoscope size={24} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className={`font-black text-base truncate ${editingId === service.id ? 'text-teal-900' : 'text-slate-800'}`}>{service.name}</h3>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase">{service.category}</span>
                                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Clock size={12}/> {service.durationMinutes} min</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right flex items-center gap-4">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Preço Venda</p>
                                    <p className="text-lg font-black text-teal-600">R$ {service.price.toFixed(2)}</p>
                                </div>
                                {editingId !== service.id && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); deleteClinicService(service.id); }}
                                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* EDITOR FORM */}
        <div className="lg:col-span-5">
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden sticky top-6">
                <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2">
                        {isEditing ? <Edit2 size={18} className="text-teal-400" /> : <Plus size={18} className="text-teal-400" />}
                        {isEditing ? 'Editar Procedimento' : 'Novo Procedimento Clínico'}
                    </h3>
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-5">
                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex gap-3 mb-2">
                        <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-blue-700 font-bold leading-relaxed uppercase">
                            Este serviço é interno da sua clínica. Ele não altera os valores de compra nos laboratórios parceiros.
                        </p>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Nome do Procedimento</label>
                        <input value={name} onChange={e => setName(e.target.value)} required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold" placeholder="Ex: Restauração Resina" />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Categoria</label>
                        <input value={category} onChange={e => setCategory(e.target.value)} required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold" placeholder="Ex: Dentística" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Valor Venda (R$)</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-3 text-slate-400" size={16} />
                                <input type="number" step="0.01" value={price || ''} onChange={e => setPrice(parseFloat(e.target.value) || 0)} required className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-black" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Tempo Estimado (Min)</label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-3 text-slate-400" size={16} />
                                <input type="number" value={duration} onChange={e => setDuration(parseInt(e.target.value) || 0)} required className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-black" />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Descrição Breve (Opcional)</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium resize-none" placeholder="Detalhes técnicos para o prontuário..." />
                    </div>

                    <div className="flex items-center gap-2 py-2">
                        <button 
                            type="button" 
                            onClick={() => setActive(!active)}
                            className={`relative w-12 h-6 rounded-full transition-colors ${active ? 'bg-teal-600' : 'bg-slate-300'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${active ? 'left-7' : 'left-1'}`} />
                        </button>
                        <span className="text-xs font-bold text-slate-600">Serviço Ativo (Visível na Agenda)</span>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex gap-3">
                        {isEditing && (
                            <button 
                                type="button" 
                                onClick={resetForm} 
                                className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all"
                            >
                                Cancelar
                            </button>
                        )}
                        <button 
                            type="submit" 
                            disabled={isSaving}
                            className={`flex-[2] py-4 bg-teal-600 text-white font-black rounded-2xl shadow-xl shadow-teal-100 hover:bg-teal-700 active:scale-95 transition-all flex items-center justify-center gap-2 ${isSaving ? 'opacity-70' : ''}`}
                        >
                            {/* Fix: Loader2 was missing in imports to solve line 243 error */}
                            {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                            {isEditing ? 'ATUALIZAR PROCEDIMENTO' : 'SALVAR PROCEDIMENTO'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      </div>
    </div>
  );
};
