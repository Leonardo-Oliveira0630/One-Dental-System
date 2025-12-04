import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SubscriptionPlan } from '../../types';
import { Plus, Trash2, Edit2, Check, X, Tag, Shield, Store, Activity, Database } from 'lucide-react';

export const Plans = () => {
  const { allPlans, addSubscriptionPlan, updateSubscriptionPlan, deleteSubscriptionPlan } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [isPublic, setIsPublic] = useState(true);
  
  // Features State
  const [maxUsers, setMaxUsers] = useState(-1);
  const [maxStorage, setMaxStorage] = useState(5);
  const [hasStore, setHasStore] = useState(true);
  const [hasClinic, setHasClinic] = useState(true);

  const resetForm = () => {
    setName('');
    setPrice(0);
    setIsPublic(true);
    setMaxUsers(-1);
    setMaxStorage(5);
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
    setMaxUsers(plan.features.maxUsers);
    setMaxStorage(plan.features.maxStorageGB);
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
        features: {
            maxUsers,
            maxStorageGB: maxStorage,
            hasStoreModule: hasStore,
            hasClinicModule: hasClinic
        }
    };

    try {
        if (isEditing && editingId) {
            await updateSubscriptionPlan(editingId, planData);
        } else {
            const id = name.toLowerCase().replace(/\s+/g, '_');
            await addSubscriptionPlan({ ...planData, id });
        }
        resetForm();
    } catch (error) {
        console.error(error);
        alert("Erro ao salvar plano");
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Planos & Assinaturas</h1>
                <p className="text-slate-500">Configure os níveis de serviço do SaaS.</p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* List */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                {allPlans.map(plan => (
                    <div key={plan.id} className={`bg-white p-6 rounded-2xl border-2 shadow-sm relative ${plan.isPublic ? 'border-slate-100' : 'border-orange-200 bg-orange-50/30'}`}>
                        {!plan.isPublic && <span className="absolute top-4 right-4 bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded">Oculto / Parceiro</span>}
                        
                        <h3 className="text-xl font-bold text-slate-800 mb-1">{plan.name}</h3>
                        <p className="text-2xl font-bold text-blue-600 mb-4">
                            {plan.price === 0 ? 'Grátis' : `R$ ${plan.price.toFixed(2)}`}
                            <span className="text-sm text-slate-400 font-normal">/mês</span>
                        </p>

                        <div className="space-y-2 text-sm text-slate-600 mb-6">
                            <div className="flex items-center gap-2">
                                <Database size={16} className="text-slate-400" />
                                <span>{plan.features.maxStorageGB} GB Armazenamento</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Shield size={16} className="text-slate-400" />
                                <span>{plan.features.maxUsers === -1 ? 'Usuários Ilimitados' : `${plan.features.maxUsers} Usuários`}</span>
                            </div>
                            <div className={`flex items-center gap-2 ${plan.features.hasStoreModule ? 'text-green-700' : 'text-slate-400 line-through'}`}>
                                <Store size={16} /> Loja Virtual
                            </div>
                            <div className={`flex items-center gap-2 ${plan.features.hasClinicModule ? 'text-green-700' : 'text-slate-400 line-through'}`}>
                                <Activity size={16} /> Gestão Clínica
                            </div>
                        </div>

                        <div className="flex gap-2 border-t border-slate-100 pt-4">
                            <button onClick={() => handleEdit(plan)} className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg font-bold flex items-center justify-center gap-2">
                                <Edit2 size={16} /> Editar
                            </button>
                            <button onClick={() => deleteSubscriptionPlan(plan.id)} className="px-3 py-2 text-slate-300 hover:text-red-500 rounded-lg">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Form */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 h-fit sticky top-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    {isEditing ? <Edit2 size={20} className="text-blue-600"/> : <Plus size={20} className="text-blue-600"/>}
                    {isEditing ? 'Editar Plano' : 'Novo Plano'}
                </h3>
                
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Plano</label>
                        <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required placeholder="Ex: Profissional" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Preço (R$)</label>
                            <input type="number" value={price} onChange={e => setPrice(parseFloat(e.target.value))} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none" required />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Visibilidade</label>
                            <select value={isPublic ? 'true' : 'false'} onChange={e => setIsPublic(e.target.value === 'true')} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white">
                                <option value="true">Público</option>
                                <option value="false">Oculto</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-3">Recursos</p>
                        
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">Max Usuários</label>
                                    <input type="number" value={maxUsers} onChange={e => setMaxUsers(parseInt(e.target.value))} className="w-full px-2 py-1 border rounded text-sm" placeholder="-1 para ilimitado" />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">Storage (GB)</label>
                                    <input type="number" value={maxStorage} onChange={e => setMaxStorage(parseInt(e.target.value))} className="w-full px-2 py-1 border rounded text-sm" />
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                                <span className="text-sm font-medium">Módulo Loja</span>
                                <button type="button" onClick={() => setHasStore(!hasStore)} className={`w-10 h-5 rounded-full transition-colors relative ${hasStore ? 'bg-green-500' : 'bg-slate-300'}`}>
                                    <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${hasStore ? 'left-6' : 'left-1'}`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                                <span className="text-sm font-medium">Módulo Clínica</span>
                                <button type="button" onClick={() => setHasClinic(!hasClinic)} className={`w-10 h-5 rounded-full transition-colors relative ${hasClinic ? 'bg-green-500' : 'bg-slate-300'}`}>
                                    <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${hasClinic ? 'left-6' : 'left-1'}`} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                        {isEditing && <button type="button" onClick={resetForm} className="flex-1 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-bold">Cancelar</button>}
                        <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md">
                            {isEditing ? 'Atualizar' : 'Criar Plano'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
  );
};