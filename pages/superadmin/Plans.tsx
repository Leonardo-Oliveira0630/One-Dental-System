
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SubscriptionPlan } from '../../types';
import { 
  Plus, Trash2, Edit2, Check, X, Tag, Shield, Store, 
  Activity, Database, Users, Stethoscope, Infinity, 
  Layers, Package, Settings2, ShieldCheck, Gauge
} from 'lucide-react';

export const Plans = () => {
  const { allPlans, addSubscriptionPlan, updateSubscriptionPlan, deleteSubscriptionPlan } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [isPublic, setIsPublic] = useState(true);
  const [targetAudience, setTargetAudience] = useState<'LAB' | 'CLINIC'>('LAB');
  const [trialDays, setTrialDays] = useState(7);
  
  // Features State
  const [maxUsers, setMaxUsers] = useState(-1);
  const [maxStorage, setMaxStorage] = useState(5);
  const [maxDentists, setMaxDentists] = useState(-1);
  const [maxJobsPerMonth, setMaxJobsPerMonth] = useState(-1);
  const [hasStore, setHasStore] = useState(true);
  const [hasClinic, setHasClinic] = useState(true);

  const resetForm = () => {
    setName('');
    setPrice(0);
    setIsPublic(true);
    setTargetAudience('LAB');
    setTrialDays(7);
    setMaxUsers(-1);
    setMaxStorage(5);
    setMaxDentists(-1);
    setMaxJobsPerMonth(-1);
    setHasStore(true);
    setHasClinic(true);
    setIsEditing(false);
    setEditingId(null);
  };

  const handleEdit = (plan: SubscriptionPlan) => {
    setIsEditing(true);
    setEditingId(plan.id);
    setName(plan.name);
    setPrice(plan.price);
    setIsPublic(plan.isPublic);
    setTargetAudience(plan.targetAudience || 'LAB');
    setTrialDays(plan.trialDays || 0);
    setMaxUsers(plan.features.maxUsers);
    setMaxStorage(plan.features.maxStorageGB);
    setMaxDentists(plan.features.maxDentists || -1);
    setMaxJobsPerMonth(plan.features.maxJobsPerMonth || -1);
    setHasStore(plan.features.hasStoreModule);
    setHasClinic(plan.features.hasClinicModule);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const planData: Omit<SubscriptionPlan, 'id'> = {
        name,
        price,
        isPublic,
        active: true,
        targetAudience,
        trialDays,
        features: {
            maxUsers,
            maxStorageGB: maxStorage,
            maxDentists,
            maxJobsPerMonth,
            hasStoreModule: hasStore,
            hasClinicModule: hasClinic
        }
    };

    try {
        if (isEditing && editingId) {
            await updateSubscriptionPlan(editingId, planData);
        } else {
            const id = `plan_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
            await addSubscriptionPlan({ ...planData, id });
        }
        resetForm();
        alert("Plano configurado com sucesso!");
    } catch (error) {
        console.error(error);
        alert("Erro ao salvar plano");
    }
  };

  const LimitBadge = ({ value, label, icon: Icon }: any) => (
    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
        <Icon size={14} className="text-slate-400" />
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{label}:</span>
        <span className="text-xs font-black text-slate-800">
            {value === -1 ? <Infinity size={14} className="inline text-blue-600" /> : value}
        </span>
    </div>
  );

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden animate-in fade-in duration-500">
        <div className="flex justify-between items-end">
            <div>
                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Engenharia de Planos</h1>
                <p className="text-slate-500 font-medium">Defina os limites de hardware, usuários e produção do ecossistema.</p>
            </div>
            {isEditing && (
                <button onClick={resetForm} className="px-4 py-2 bg-slate-100 text-slate-500 rounded-xl font-bold hover:bg-slate-200 transition-all flex items-center gap-2">
                    <X size={18} /> Cancelar Edição
                </button>
            )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            {/* LISTA DE PLANOS EXISTENTES */}
            <div className="xl:col-span-7 space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Planos Ativos</h3>
                {allPlans.length === 0 ? (
                    <div className="bg-white p-12 rounded-[32px] border-2 border-dashed border-slate-200 text-center">
                        <Package size={48} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-slate-400 font-bold">Nenhum plano configurado no sistema.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {allPlans.map(plan => (
                            <div key={plan.id} className={`bg-white p-6 rounded-[32px] border-2 transition-all relative overflow-hidden group ${plan.isPublic ? 'border-slate-100 shadow-sm' : 'border-amber-100 bg-amber-50/20 shadow-none'}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`text-[9px] font-black px-2 py-1 rounded-lg flex items-center gap-1 border ${plan.targetAudience === 'CLINIC' ? 'bg-teal-50 text-teal-700 border-teal-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                        {plan.targetAudience === 'CLINIC' ? <Stethoscope size={10}/> : <Store size={10}/>}
                                        {plan.targetAudience === 'CLINIC' ? 'CLÍNICA' : 'LABORATÓRIO'}
                                    </span>
                                    {!plan.isPublic && <span className="bg-amber-100 text-amber-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Privado</span>}
                                </div>

                                <h3 className="text-xl font-black text-slate-800 leading-tight mb-1">{plan.name}</h3>
                                <div className="flex items-baseline gap-1 mb-6">
                                    <span className="text-2xl font-black text-slate-900">R$ {plan.price.toFixed(2)}</span>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">/mês</span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mb-6">
                                    <LimitBadge value={plan.features.maxUsers} label="Users" icon={Users} />
                                    <LimitBadge value={plan.features.maxStorageGB} label="Storage" icon={Database} />
                                    <LimitBadge value={plan.features.maxDentists} label="Dentistas" icon={Stethoscope} />
                                    <LimitBadge value={plan.features.maxJobsPerMonth} label="Casos/Mês" icon={Gauge} />
                                </div>

                                <div className="flex gap-2 pt-4 border-t border-slate-50">
                                    <button onClick={() => handleEdit(plan)} className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-black/10 flex items-center justify-center gap-2">
                                        <Edit2 size={14} /> Editar
                                    </button>
                                    <button onClick={() => { if(window.confirm('Excluir plano?')) deleteSubscriptionPlan(plan.id); }} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* FORMULÁRIO DE CUSTOMIZAÇÃO */}
            <div className="xl:col-span-5">
                <div className="bg-white p-8 rounded-[40px] shadow-2xl border border-slate-100 sticky top-6">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-blue-100">
                            <Settings2 size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{isEditing ? 'Atualizar Definições' : 'Configurar Novo Plano'}</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Controle de cotas e permissões</p>
                        </div>
                    </div>
                    
                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Título do Plano</label>
                                <input value={name} onChange={e => setName(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-[20px] focus:ring-2 focus:ring-blue-500 outline-none font-black text-lg" required placeholder="Ex: Enterprise Digital" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Preço Mensal (R$)</label>
                                    <input type="number" step="0.01" value={price} onChange={e => setPrice(parseFloat(e.target.value))} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-[20px] font-black text-xl text-blue-600 outline-none" required />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Trial (Dias)</label>
                                    <input type="number" value={trialDays} onChange={e => setTrialDays(parseInt(e.target.value))} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-[20px] font-black text-xl outline-none" required />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Público do Serviço</label>
                                <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl">
                                    <button type="button" onClick={() => setTargetAudience('LAB')} className={`flex-1 py-3 text-xs font-black uppercase rounded-xl transition-all ${targetAudience === 'LAB' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}>Laboratório</button>
                                    <button type="button" onClick={() => setTargetAudience('CLINIC')} className={`flex-1 py-3 text-xs font-black uppercase rounded-xl transition-all ${targetAudience === 'CLINIC' ? 'bg-teal-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}>Clínica</button>
                                </div>
                            </div>
                        </div>

                        {/* SEÇÃO DE LIMITES - CUSTOMIZAÇÃO REQUERIDA */}
                        <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 space-y-5">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Gauge size={14} className="text-blue-600"/> Capacidade & Infraestrutura
                            </h4>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Máx Usuários</label>
                                    <div className="relative">
                                        <input type="number" value={maxUsers} onChange={e => setMaxUsers(parseInt(e.target.value))} className="w-full px-4 py-3 border border-slate-200 rounded-xl font-black text-sm" />
                                        {maxUsers === -1 && <Infinity size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600" />}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Storage (GB)</label>
                                    <input type="number" value={maxStorage} onChange={e => setMaxStorage(parseInt(e.target.value))} className="w-full px-4 py-3 border border-slate-200 rounded-xl font-black text-sm" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Máx Dentistas</label>
                                    <div className="relative">
                                        <input type="number" value={maxDentists} onChange={e => setMaxDentists(parseInt(e.target.value))} className="w-full px-4 py-3 border border-slate-200 rounded-xl font-black text-sm" />
                                        {maxDentists === -1 && <Infinity size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600" />}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Casos / Mês</label>
                                    <div className="relative">
                                        <input type="number" value={maxJobsPerMonth} onChange={e => setMaxJobsPerMonth(parseInt(e.target.value))} className="w-full px-4 py-3 border border-slate-200 rounded-xl font-black text-sm" />
                                        {maxJobsPerMonth === -1 && <Infinity size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600" />}
                                    </div>
                                </div>
                            </div>
                            <p className="text-[9px] text-slate-400 italic text-center font-bold uppercase tracking-tighter">Dica: Use "-1" para recursos ILIMITADOS.</p>
                        </div>

                        {/* MÓDULOS DE SISTEMA */}
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ativação de Módulos</h4>
                            <div className="grid grid-cols-1 gap-2">
                                <button type="button" onClick={() => setHasStore(!hasStore)} className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${hasStore ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100 opacity-50'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${hasStore ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}><Store size={18}/></div>
                                        <span className={`text-xs font-black uppercase ${hasStore ? 'text-indigo-900' : 'text-slate-400'}`}>Loja Virtual (E-commerce)</span>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${hasStore ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200'}`}>{hasStore && <Check size={14}/>}</div>
                                </button>
                                
                                <button type="button" onClick={() => setHasClinic(!hasClinic)} className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${hasClinic ? 'bg-teal-50 border-teal-200' : 'bg-white border-slate-100 opacity-50'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${hasClinic ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-400'}`}><Activity size={18}/></div>
                                        <span className={`text-xs font-black uppercase ${hasClinic ? 'text-teal-900' : 'text-slate-400'}`}>Gestão Clínica & Agenda</span>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${hasClinic ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-200'}`}>{hasClinic && <Check size={14}/>}</div>
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-2xl">
                            <button 
                                type="button" 
                                onClick={() => setIsPublic(!isPublic)}
                                className={`relative w-12 h-6 rounded-full transition-colors ${isPublic ? 'bg-green-500' : 'bg-slate-300'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isPublic ? 'left-7' : 'left-1'}`} />
                            </button>
                            <span className="text-[10px] font-black text-slate-600 uppercase">Exibir este plano publicamente no registro</span>
                        </div>

                        <button type="submit" className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-blue-900/20 hover:shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3">
                            <ShieldCheck size={24} /> 
                            {isEditing ? 'ATUALIZAR ARQUITETURA' : 'FORJAR NOVO PLANO'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </div>
  );
};
