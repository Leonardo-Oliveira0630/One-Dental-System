import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { AlertTriangle, Trash2, CheckSquare, Square, Building2, Search, Loader2 } from 'lucide-react';
import { db } from '../../services/firebaseConfig';
<<<<<<< HEAD
import { collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
=======
import { collection, query, where, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
>>>>>>> b8afe1068821dd1cd9974b1cecd26fe0c8b335ed
import { isLabOrganization } from '../../services/firebaseService';

export const LabResets = () => {
    const { allOrganizations } = useApp();
    const [selectedOrgId, setSelectedOrgId] = useState('');
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<'ALL' | 'LABS_ONLY'>('ALL');
    const [isResetting, setIsResetting] = useState(false);
    const [progressStatus, setProgressStatus] = useState<string>('');
    
    const labs = useMemo(() => {
        return allOrganizations
          .filter(o => {
              if (filterType === 'LABS_ONLY') {
                  return isLabOrganization(o) || o.orgType === 'LAB' || o.orgType === 'LAB_OUTSOURCED' || (o as any).isLab === true;
              }
              return true;
          })
          .filter(o => (o.name || '').toLowerCase().includes(search.toLowerCase()) || (o.id || '').toLowerCase().includes(search.toLowerCase()));
    }, [allOrganizations, search, filterType]);

    const [selections, setSelections] = useState({
        jobTypes: false,
        clients: false,
        collaborators: false,
        commissions: false,
        sectors: false,
        jobs: false,
        receipts: false,
        billing: false,
    });

    const handleToggle = (key: keyof typeof selections) => {
        setSelections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Helper to delete all documents using writeBatch in chunks of 400
    const deleteRefsInBatches = async (refs: any[], label: string) => {
        if (!refs || refs.length === 0) return 0;
        const CHUNK_SIZE = 400;
        let totalDeleted = 0;
        for (let i = 0; i < refs.length; i += CHUNK_SIZE) {
            const chunk = refs.slice(i, i + CHUNK_SIZE);
            const batch = writeBatch(db);
            chunk.forEach(ref => {
                batch.delete(ref);
            });
            await batch.commit();
            totalDeleted += chunk.length;
            setProgressStatus(`Apagando ${label}: ${totalDeleted}/${refs.length}...`);
        }
        return totalDeleted;
    };

    const deleteDocsInQuery = async (q: any, label: string) => {
        setProgressStatus(`Buscando ${label}...`);
        const snap = await getDocs(q);
        const refs = snap.docs.map(d => d.ref);
        return await deleteRefsInBatches(refs, label);
    };

    const handleReset = async () => {
        if (!selectedOrgId) return;
        const org = allOrganizations.find(o => o.id === selectedOrgId);
        if (!org) return;

        const anySelected = Object.values(selections).some(v => v);
        if (!anySelected) {
            alert('Selecione pelo menos uma funcionalidade para resetar.');
            return;
        }

        const confirm1 = window.confirm(`ATENÇÃO: Você está prestes a apagar dados permanentemente do laboratório "${org.name}". Deseja continuar?`);
        if (!confirm1) return;
        
        const confirm2 = window.prompt(`Para confirmar a exclusão, digite o nome do laboratório exatamente como aparece: "${org.name}"`);
        if (confirm2 !== org.name) {
            alert('Nome incorreto. Cancelando operação.');
            return;
        }

        setIsResetting(true);
        setProgressStatus('Iniciando reset...');
        try {
            const results: string[] = [];

            if (selections.jobTypes) {
                const count = await deleteDocsInQuery(collection(db, `organizations/${org.id}/jobTypes`), 'Tipos de Serviço');
                results.push(`${count} Tipos de Serviço`);
            }

            if (selections.clients) {
                const q = query(collection(db, 'users'), where('organizationId', '==', org.id), where('role', '==', 'CLIENT'));
                const count1 = await deleteDocsInQuery(q, 'Clientes (Usuários)');
                const count2 = await deleteDocsInQuery(collection(db, `organizations/${org.id}/manualDentists`), 'Clientes Manuais');
                results.push(`${count1 + count2} Clientes/Dentistas`);
            }

            if (selections.collaborators) {
                const q1 = query(collection(db, 'users'), where('organizationId', '==', org.id), where('role', '==', 'COLLABORATOR'));
                const q2 = query(collection(db, 'users'), where('organizationId', '==', org.id), where('role', '==', 'MANAGER'));
                const count1 = await deleteDocsInQuery(q1, 'Colaboradores');
                const count2 = await deleteDocsInQuery(q2, 'Gerentes');
                results.push(`${count1 + count2} Colaboradores/Gerentes`);
            }

            if (selections.commissions) {
<<<<<<< HEAD
                const count = await deleteDocsInQuery(collection(db, `organizations/${org.id}/commissions`), 'Comissões');
                results.push(`${count} Registros de Comissões`);
=======
                // 1. Apagar lançamentos e extratos de comissões
                const qComm = collection(db, `organizations/${org.id}/commissions`);
                const commCount = await deleteDocsInQuery(qComm);

                // 2. Apagar grupos de comissões cadastrados
                const qGroups = collection(db, `organizations/${org.id}/commissionGroups`);
                const groupsCount = await deleteDocsInQuery(qGroups);

                // 3. Resetar regras de comissão individuais e desvincular grupos dos usuários do lab
                const usersQ = query(collection(db, 'users'), where('organizationId', '==', org.id));
                const usersSnap = await getDocs(usersQ);
                let usersResetCount = 0;
                const userUpdatePromises = [];
                for (const uDoc of usersSnap.docs) {
                    const data = uDoc.data();
                    if ((data.commissionSettings && data.commissionSettings.length > 0) || data.commissionGroupId) {
                        userUpdatePromises.push(updateDoc(uDoc.ref, {
                            commissionSettings: [],
                            commissionGroupId: null
                        }));
                        usersResetCount++;
                    }
                }
                await Promise.all(userUpdatePromises);

                results.push(`${commCount} Lançamentos de Comissões, ${groupsCount} Grupos de Ganhos e ${usersResetCount} Regras de Colaboradores Zeradas`);
>>>>>>> b8afe1068821dd1cd9974b1cecd26fe0c8b335ed
            }

            if (selections.sectors) {
                const count = await deleteDocsInQuery(collection(db, `organizations/${org.id}/sectors`), 'Setores');
                results.push(`${count} Setores`);
            }

            if (selections.jobs) {
                setProgressStatus('Buscando trabalhos para apagar...');
                const q = collection(db, `organizations/${org.id}/jobs`);
                const snap = await getDocs(q);
                const allJobRefs: any[] = [];
                
                for (const d of snap.docs) {
                    allJobRefs.push(d.ref);
                    try {
                        const msgsSnap = await getDocs(collection(db, `organizations/${org.id}/jobs/${d.id}/messages`));
                        msgsSnap.docs.forEach(m => allJobRefs.push(m.ref));
                    } catch (e) {
                        // Subcollection might be empty or missing
                    }
                    try {
                        const appSnap = await getDocs(collection(db, `organizations/${org.id}/jobs/${d.id}/caseApprovals`));
                        appSnap.docs.forEach(a => allJobRefs.push(a.ref));
                    } catch (e) {
                        // Subcollection might be empty or missing
                    }
                }

                await deleteRefsInBatches(allJobRefs, 'Trabalhos e histórico');
                results.push(`${snap.size} Trabalhos (e subcoleções)`);
            }

            if (selections.receipts) {
                const qReceipts = query(collection(db, 'receipts'), where('organizationId', '==', org.id));
                const count1 = await deleteDocsInQuery(qReceipts, 'Recibos Globais');
                const count2 = await deleteDocsInQuery(collection(db, `organizations/${org.id}/dentistPayments`), 'Pagamentos de Dentistas');
                const count3 = await deleteDocsInQuery(collection(db, `organizations/${org.id}/patientPayments`), 'Pagamentos de Pacientes');
                results.push(`${count1 + count2 + count3} Recibos e Pagamentos`);
            }

            if (selections.billing) {
                const count1 = await deleteDocsInQuery(collection(db, `organizations/${org.id}/billingBatches`), 'Faturas de Laboratório');
                const count2 = await deleteDocsInQuery(collection(db, `organizations/${org.id}/patientBillingBatches`), 'Faturas de Pacientes');
                results.push(`${count1 + count2} Registros de Faturamento (Faturas)`);
            }

            setProgressStatus('Finalizado!');
            alert(`Reset concluído com sucesso!\n\nItens apagados:\n${results.join('\n')}`);
            
            // Reset selections
            setSelections({
                jobTypes: false,
                clients: false,
                collaborators: false,
                commissions: false,
                sectors: false,
                jobs: false,
                receipts: false,
                billing: false,
            });
            setSelectedOrgId('');

        } catch (error: any) {
            console.error('Erro durante reset:', error);
            alert(`Ocorreu um erro durante o reset: ${error?.message || error}`);
        } finally {
            setIsResetting(false);
            setProgressStatus('');
        }
    };

    const options = [
        { key: 'jobTypes', label: 'Tipos de Serviço Cadastrados', desc: 'Apaga todos os serviços, preços e variações do laboratório.' },
        { key: 'clients', label: 'Cadastro de Clientes', desc: 'Apaga todos os dentistas/clínicas vinculados ao laboratório.' },
        { key: 'collaborators', label: 'Cadastro de Colaboradores', desc: 'Apaga os usuários com perfil de Colaborador ou Gerente (Administradores são mantidos).' },
<<<<<<< HEAD
        { key: 'commissions', label: 'Registro de Comissões dos Colaboradores', desc: 'Apaga apenas os lançamentos e extratos de comissões gerados, mantendo intactos os grupos e regras da aba Ganhos.' },
=======
        { key: 'commissions', label: 'Comissões dos Colaboradores', desc: 'Apaga todos os lançamentos e extratos de comissão, zera as regras individuais e exclui os grupos de ganhos.' },
>>>>>>> b8afe1068821dd1cd9974b1cecd26fe0c8b335ed
        { key: 'sectors', label: 'Cadastro de Setores', desc: 'Apaga os setores de produção.' },
        { key: 'jobs', label: 'Trabalhos Criados', desc: 'Apaga o histórico de pedidos e ordens de serviço.' },
        { key: 'receipts', label: 'Recibos Criados', desc: 'Apaga os pagamentos e recibos registrados (entradas e saídas).' },
        { key: 'billing', label: 'Faturamento de Clientes', desc: 'Apaga as faturas geradas, zerando saldos devedores ou de crédito.' },
    ] as const;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
                    <AlertTriangle size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Reset de Laboratórios</h1>
                    <p className="text-sm font-bold text-slate-500">Ferramenta administrativa para zerar dados específicos de laboratórios em fase de validação (MVP).</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                        <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Building2 size={16} className="text-blue-500" />
                            1. Selecionar Laboratório
                        </h2>

                        <div className="flex gap-1 mb-4 bg-slate-100 p-1 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setFilterType('ALL')}
                                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                                    filterType === 'ALL'
                                        ? 'bg-white text-slate-800 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                Todas ({allOrganizations.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilterType('LABS_ONLY')}
                                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                                    filterType === 'LABS_ONLY'
                                        ? 'bg-white text-slate-800 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                Somente Labs
                            </button>
                        </div>

                        <div className="relative mb-4">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar por nome ou ID..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                            />
                        </div>

                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {labs.map(lab => (
                                <button
                                    key={lab.id}
                                    onClick={() => setSelectedOrgId(lab.id)}
                                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                                        selectedOrgId === lab.id
                                            ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500/20'
                                            : 'bg-white border-slate-200 hover:border-blue-300'
                                    }`}
                                >
                                    <h3 className="font-black text-slate-800 text-sm">{lab.name}</h3>
                                    <p className="text-[10px] font-bold text-slate-500 font-mono mt-1">ID: {lab.id}</p>
                                </button>
                            ))}
                            {labs.length === 0 && (
                                <p className="text-sm text-slate-500 font-bold text-center py-4">Nenhum laboratório encontrado.</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                    <div className={`bg-white rounded-3xl p-6 border transition-all shadow-sm ${selectedOrgId ? 'border-red-200' : 'border-slate-200 opacity-50 pointer-events-none'}`}>
                        <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-1 flex items-center gap-2">
                            <Trash2 size={16} className={selectedOrgId ? "text-red-500" : "text-slate-400"} />
                            2. Funcionalidades para Resetar
                        </h2>
                        <p className="text-xs font-bold text-slate-500 mb-6">
                            Selecione os módulos que deseja apagar permanentemente do banco de dados para este laboratório. 
                            <strong className="text-red-500 ml-1">Esta ação é irreversível.</strong>
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                            {options.map((opt) => {
                                const isSelected = selections[opt.key as keyof typeof selections];
                                return (
                                    <div 
                                        key={opt.key}
                                        onClick={() => !isResetting && handleToggle(opt.key as keyof typeof selections)}
                                        className={`flex items-start gap-3 p-4 rounded-2xl border transition-all ${
                                            isResetting ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                                        } ${
                                            isSelected 
                                            ? 'bg-red-50/50 border-red-200' 
                                            : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className={`mt-0.5 ${isSelected ? 'text-red-600' : 'text-slate-400'}`}>
                                            {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                                        </div>
                                        <div>
                                            <h4 className={`text-sm font-black ${isSelected ? 'text-red-900' : 'text-slate-700'}`}>{opt.label}</h4>
                                            <p className={`text-xs mt-1 font-bold ${isSelected ? 'text-red-700/70' : 'text-slate-500'}`}>{opt.desc}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-red-50 rounded-2xl border border-red-100 gap-4">
                            <div>
                                <h4 className="font-black text-red-900 text-sm">Pronto para resetar?</h4>
                                <p className="text-xs font-bold text-red-700/70 mt-0.5">
                                    {isResetting ? (progressStatus || 'Processando...') : 'Os dados selecionados serão apagados permanentemente.'}
                                </p>
                            </div>
                            <button
                                onClick={handleReset}
                                disabled={isResetting || !Object.values(selections).some(v => v)}
                                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-black text-sm rounded-xl shadow-lg shadow-red-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shrink-0"
                            >
                                {isResetting ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>{progressStatus || 'Apagando...'}</span>
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={16} />
                                        <span>Executar Reset</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
