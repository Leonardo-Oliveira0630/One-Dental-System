import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { SubscriptionPlan, UserRole } from '../../types';
/* Fixing ShieldCheck reference error by importing the correct icon name */
import { Plus, Trash2, Edit2, Check, X, Tag, ShieldCheck, Store, Activity, Database, Users, Stethoscope, Layers, Save, Loader2, ShieldAlert, AlertTriangle, Fingerprint, RefreshCw } from 'lucide-react';
import { db } from '../../services/firebaseConfig';
import * as firestorePkg from 'firebase/firestore';

const { doc, getDoc } = firestorePkg as any;

export const Plans = () => {
  const { allPlans, addSubscriptionPlan, updateSubscriptionPlan, deleteSubscriptionPlan, currentUser } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [permCheck, setPermCheck] = useState<{status: 'loading' | 'ok' | 'denied', detail?: string}>({status: 'loading'});

  // Estados do Formulário
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [isPublic, setIsPublic] = useState(true);
  const [targetAudience, setTargetAudience] = useState<'LAB' | 'CLINIC'>('LAB');
  const [maxUsers, setMaxUsers] = useState(-1);
  const [maxStorage, setMaxStorage] = useState(5);
  const [hasStore, setHasStore] = useState(true);
  const [hasClinic, setHasClinic] = useState(true);
  const [hasInternalManagement, setHasInternalManagement] = useState(true);

  // Diagnóstico de Permissão Real no Firestore
  useEffect(() => {
    const checkAccess = async () => {
      if (!currentUser) return;
      try {
        // Tenta ler o próprio documento de usuário diretamente do Firestore para validar o token
        const userRef = doc(db, 'users', currentUser.id);
        const snap = await getDoc(userRef);
        const data = snap.data();
        
        if (data?.role !== 'SUPER_ADMIN') {
          setPermCheck({status: 'denied', detail: `Seu papel no banco de dados é "${data?.role || 'null'}", mas esta área exige "SUPER_ADMIN".`});
        } else {
          setPermCheck({status: 'ok'});
        }
      } catch (err: any) {
        setPermCheck({status: 'denied', detail: err.message});
      }
    };
    checkAccess();
  }, [currentUser]);

  const isSaaSAdmin = currentUser?.role === UserRole.SUPER_ADMIN;

  const resetForm = () => {
    setName(''); setPrice(0); setIsPublic(true); setTargetAudience('LAB');
    setMaxUsers(-1); setMaxStorage(5); setHasStore(true); setHasClinic(true);
    setHasInternalManagement(true); setIsEditing(false); setEditingId(null);
  };

  const handleEdit = (plan: SubscriptionPlan) => {
    setIsEditing(true);
    setEditingId(plan.id);
    setName(plan.name);
    setPrice(plan.price);
    setIsPublic(plan.isPublic);
    setTargetAudience(plan.targetAudience || 'LAB');
    setMaxUsers(plan.features.maxUsers || -1);
    setMaxStorage(plan.features.maxStorageGB || 5);
    setHasStore(plan.features.hasStoreModule !== false);
    setHasClinic(plan.features.hasClinicModule !== false);
    setHasInternalManagement(plan.features.hasInternalManagement !== false);
  };

  const slugify = (text: string) => {
    return text.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, '_').replace(/[^\w-]+/g, '');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    
    if (currentUser?.role !== 'SUPER_ADMIN') {
      alert("Acesso Negado: O sistema detectou que você não é SUPER_ADMIN.");
      return;
    }

    setIsSaving(true);
    
    const planData: any = {
        name: name.trim(),
        price: Number(price),
        isPublic: Boolean(isPublic),
        active: true,
        targetAudience: targetAudience,
        features: {
            maxUsers: Number(maxUsers),
            maxStorageGB: Number(maxStorage),
            hasStoreModule: Boolean(hasStore),
            hasClinicModule: Boolean(hasClinic),
            hasInternalManagement: Boolean(hasInternalManagement)
        }
    };

    try {
        if (isEditing && editingId) {
            await updateSubscriptionPlan(editingId, planData);
            alert("Sucesso: Plano atualizado.");
        } else {
            const cleanId = slugify(name);
            await addSubscriptionPlan({ ...planData, id: cleanId });
            alert("Sucesso: Plano criado.");
        }
        resetForm();
    } catch (error: any) {
        console.error("ERRO FIREBASE AO GRAVAR PLANO:", error);
        let msg = "Erro desconhecido.";
        if (error.code === 'permission-denied') {
          msg = "PERMISSÃO NEGADA PELO FIREBASE. \n\nIsso significa que as 'Firestore Rules' no Console do Firebase estão bloqueando a escrita na coleção 'subscriptionPlans' para o seu UID.";
        } else {
          msg = error.message;
        }
        alert(msg);
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
        
        {/* PAINEL DE DIAGNÓSTICO DE PERMISSÃO */}
        <div className={`p-6 rounded-[32px] border-2 flex flex-col md:flex-row items-center gap-6 transition-all ${
            permCheck.status === 'ok' ? 'bg-green-50 border-green-100 text-green-800' : 
            permCheck.status === 'loading' ? 'bg-slate-50 border-slate-100 text-slate-500' :
            'bg-red-50 border-red-200 text-red-700'
        }`}>
            <div className={`p-4 rounded-2xl shrink-0 ${permCheck.status === 'ok' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                {permCheck.status === 'ok' ? <ShieldCheck size={32}/> : <ShieldAlert size={32}/>}
            </div>
            <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Status de Segurança</span>
                    {permCheck.status === 'loading' && <Loader2 size={12} className="animate-spin"/>}
                </div>
                <h2 className="text-lg font-black uppercase tracking-tight">
                    {permCheck.status === 'ok' ? 'Acesso Super Admin Validado' : 'Falha na Verificação de Nível'}
                </h2>
                <p className="text-sm font-medium opacity-80">
                    {permCheck.status === 'ok' 
                      ? 'Seu UID está autorizado para gerenciar coleções globais.' 
                      : permCheck.detail || 'Verificando credenciais no Firestore...'}
                </p>
                {permCheck.status === 'denied' && (
                    <div className="mt-4 p-3 bg-white/50 rounded-xl border border-red-200 text-[11px] font-bold space-y-1">
                        <p className="flex items-center gap-2"><Fingerprint size={12}/> Seu UID: <code className="bg-red-100 px-1 rounded">{currentUser?.id}</code></p>
                        <p className="flex items-center gap-2 text-red-600"><AlertTriangle size={12}/> <strong>Ação Necessária:</strong> Vá ao Firebase Console > Firestore > Collection 'users' e garanta que o campo 'role' deste UID seja 'SUPER_ADMIN'.</p>
                    </div>
                )}
            </div>
            {permCheck.status === 'denied' && (
                <button onClick={() => window.location.reload()} className="px-6 py-3 bg-red-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-red-700 transition-all">
                    <RefreshCw size={16}/> Revalidar Token
                </button>
            )}
        </div>

        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Planos & Assinaturas</h1>
                <p className="text-slate-500 font-medium">Controle de ofertas para Laboratórios e Clínicas.</p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4 h-fit">
                {allPlans.map(plan => (
                    <div key={plan.id} className={`bg-white p-6 rounded-[32px] border-2 shadow-sm relative transition-all group ${plan.isPublic ? 'border-slate-100' : 'border-orange-200 bg-orange-50/30'}`}>
                        {!plan.isPublic && <span className="absolute top-4 right-4 bg-orange-100 text-orange-700 text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest">Oculto</span>}
                        <div className="flex justify-between items-start mb-4">
                            <span className={`text-[9px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 uppercase tracking-widest ${plan.targetAudience === 'CLINIC' ? 'bg-teal-100 text-teal-700' : 'bg-blue-100 text-blue-700'}`}>
                                {plan.targetAudience === 'CLINIC' ? <Stethoscope size={12}/> : <Store size={12}/>}
                                {plan.targetAudience === 'CLINIC' ? 'Clínica' : 'Laboratório'}
                            </span>
                        </div>
                        <h3 className="text-xl font-black text-slate-800 mb-1 uppercase tracking-tight">{plan.name}</h3>
                        <p className="text-3xl font-black text-blue-600 mb-6">R$ {plan.price.toFixed(2)}<span className="text-sm text-slate-400 font-normal">/mês</span></p>
                        <div className="space-y-3 text-xs text-slate-600 mb-8 font-bold">
                            <div className="flex items-center gap-3"><Database size={16} className="text-slate-400" /><span>{plan.features.maxStorageGB} GB Armazenamento</span></div>
                            <div className={`flex items-center gap-3 ${plan.features.hasStoreModule ? 'text-green-700' : 'text-slate-300 line-through'}`}><Store size={16} /> Loja Virtual</div>
                            <div className={`flex items-center gap-3 ${plan.features.hasInternalManagement ? 'text-blue-700' : 'text-slate-300 line-through'}`}><Layers size={16} /> Gestão de Bancada OS</div>
                        </div>
                        <div className="flex gap-2 pt-4 border-t border-slate-50 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEdit(plan)} className="flex-1 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors">
                                <Edit2 size={14} /> Editar
                            </button>
                            <button onClick={() => { if(window.confirm('Excluir este plano?')) deleteSubscriptionPlan(plan.id); }} className="px-4 py-3 bg-red-50 text-red-500 hover:bg-red-100 rounded-2xl transition-colors">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
                {allPlans.length === 0 && <div className="col-span-2 py-20 text-center text-slate-400 border-2 border-dashed rounded-[32px]">Planos bloqueados ou não configurados.</div>}
            </div>

            <div className="lg:col-span-4 h-fit sticky top-6">
                <div className={`bg-white p-6 md:p-8 rounded-[40px] shadow-2xl border border-slate-100 ${permCheck.status !== 'ok' ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                    <h3 className="text-lg font-black text-slate-800 mb-8 flex items-center gap-3 uppercase tracking-tight">
                        <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200">{isEditing ? <Edit2 size={20}/> : <Plus size={20}/>}</div>
                        {isEditing ? 'Editar Plano' : 'Criar Novo Plano'}
                    </h3>
                    <form onSubmit={handleSave} className="space-y-5">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome do Plano</label>
                            <input value={name} onChange={e => setName(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" required placeholder="Ex: Premium - Gestão Total" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Público Alvo</label>
                            <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl">
                                <button type="button" onClick={() => setTargetAudience('LAB')} className={`flex-1 py-2.5 text-[10px] font-black uppercase rounded-xl transition-all ${targetAudience === 'LAB' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Laboratório</button>
                                <button type="button" onClick={() => setTargetAudience('CLINIC')} className={`flex-1 py-2.5 text-[10px] font-black uppercase rounded-xl transition-all ${targetAudience === 'CLINIC' ? 'bg-white text-teal-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Clínica</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Preço Mensal (R$)</label>
                                <input type="number" step="0.01" value={price} onChange={e => setPrice(parseFloat(e.target.value))} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-black focus:ring-2 focus:ring-blue-500 outline-none" required />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Visibilidade</label>
                                <select value={isPublic ? 'true' : 'false'} onChange={e => setIsPublic(e.target.value === 'true')} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                                    <option value="true">Público (Site)</option>
                                    <option value="false">Oculto (Manual)</option>
                                </select>
                            </div>
                        </div>
                        <div className="pt-4 border-t border-slate-100 space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-[24px] border border-slate-100">
                                <div className="flex items-center gap-3"><div className={`p-2 rounded-xl ${hasStore ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-400'}`}><Store size={18}/></div><span className="text-xs font-black text-slate-700 uppercase">Loja Online</span></div>
                                <button type="button" onClick={() => setHasStore(!hasStore)} className={`w-12 h-6 rounded-full transition-colors relative ${hasStore ? 'bg-green-500' : 'bg-slate-300'}`}><div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${hasStore ? 'left-7' : 'left-1'}`} /></button>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-[24px] border border-slate-100">
                                <div className="flex items-center gap-3"><div className={`p-2 rounded-xl ${hasInternalManagement ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-400'}`}><Layers size={18}/></div><span className="text-xs font-black text-slate-700 uppercase">Gestão Interna</span></div>
                                <button type="button" onClick={() => setHasInternalManagement(!hasInternalManagement)} className={`w-12 h-6 rounded-full transition-colors relative ${hasInternalManagement ? 'bg-blue-500' : 'bg-slate-300'}`}><div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${hasInternalManagement ? 'left-7' : 'left-1'}`} /></button>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-6 border-t border-slate-100">
                            <button type="submit" disabled={isSaving} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 text-[10px] uppercase tracking-widest">
                                {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                                {isEditing ? 'Atualizar Plano' : 'Confirmar Plano'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
  );
};
