
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Handshake, Plus, Search, Building, CheckCircle, 
  MapPin, Star, X, MessageSquare, Package, 
  Clock, ArrowRight, History, Info, Globe, 
  ChevronRight, ShoppingBag, Store, User, Filter
} from 'lucide-react';
import * as api from '../../services/firebaseService';
import { LabRating, Organization, JobType } from '../../types';
import * as firestorePkg from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';

const { collection, getDocs, query, where } = firestorePkg as any;

export const Partnerships = () => {
    const { userConnections, addConnectionByCode, allLaboratories, jobs, currentUser } = useApp();
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Perfil Selecionado (Vitrine)
    const [selectedLab, setSelectedLab] = useState<Organization | null>(null);
    const [labServices, setLabServices] = useState<JobType[]>([]);
    const [labReviews, setLabReviews] = useState<LabRating[]>([]);
    const [activeProfileTab, setActiveProfileTab] = useState<'SERVICES' | 'REVIEWS' | 'ABOUT'>('SERVICES');
    
    // Histórico de Buscas (Local Storage)
    const [recentSearches, setRecentSearches] = useState<string[]>(() => {
        const saved = localStorage.getItem('recent_labs');
        return saved ? JSON.parse(saved) : [];
    });

    // 1. Identifica Labs "Frequentes" (Onde já teve pedidos)
    const frequentLabIds = useMemo(() => {
        const ids = new Set<string>();
        jobs.forEach(j => { if (j.organizationId) ids.add(j.organizationId); });
        return ids;
    }, [jobs]);

    // 2. Busca Serviços do Lab selecionado
    useEffect(() => {
        if (selectedLab) {
            const fetchLabData = async () => {
                setLoading(true);
                try {
                    // Carrega serviços
                    const sRef = collection(db, `organizations/${selectedLab.id}/jobTypes`);
                    const sSnap = await getDocs(query(sRef, where('isVisibleInStore', '!=', false)));
                    setLabServices(sSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as JobType)));
                    
                    // Carrega reviews
                    const rRef = collection(db, `organizations/${selectedLab.id}/ratings`);
                    const rSnap = await getDocs(rRef);
                    setLabReviews(rSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as LabRating)));
                } catch (e) {
                    console.error("Erro ao carregar dados da vitrine:", e);
                } finally {
                    setLoading(false);
                }
            };
            fetchLabData();
            
            // Salva no histórico de buscas
            setRecentSearches(prev => {
                const next = [selectedLab.id, ...prev.filter(id => id !== selectedLab.id)].slice(0, 5);
                localStorage.setItem('recent_labs', JSON.stringify(next));
                return next;
            });
        }
    }, [selectedLab]);

    const filteredLabs = useMemo(() => {
        return allLaboratories.filter(lab => 
            lab.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [allLaboratories, searchTerm]);

    const handleFirmPartnership = async (labId: string) => {
        if (window.confirm("Deseja oficializar a parceria com este laboratório?")) {
            setLoading(true);
            try {
                await addConnectionByCode(labId);
                alert("Parceria firmada! Você agora pode enviar pedidos.");
                // Atualiza o lab selecionado para refletir o status se necessário
            } catch (e: any) {
                alert(e.message || "Erro ao conectar.");
            } finally {
                setLoading(false);
            }
        }
    };

    const isPartner = (labId: string) => userConnections.some(c => c.organizationId === labId);

    return (
        <div className="space-y-8 max-w-full overflow-x-hidden animate-in fade-in duration-500 pb-24">
            
            {/* SEARCH AREA (ESTILO APP DELIVERY) */}
            <div className="sticky top-0 md:static bg-slate-50 z-30 pt-2 pb-4 px-2 md:px-0">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={24} />
                    <input 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Busque por nome do laboratório..."
                        className="w-full pl-14 pr-4 py-5 bg-white border-2 border-slate-100 rounded-[24px] shadow-xl shadow-slate-200/50 outline-none focus:border-blue-600 font-bold text-lg transition-all"
                    />
                </div>
            </div>

            {/* SEÇÃO: RECENTES & FREQUENTES */}
            {!searchTerm && (
                <div className="space-y-8 animate-in fade-in duration-300">
                    {/* MEUS FORNECEDORES (COM PEDIDOS) */}
                    {frequentLabIds.size > 0 && (
                        <section className="space-y-4">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                                <History size={16} /> Meus Fornecedores Frequentes
                            </h3>
                            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 px-2">
                                {Array.from(frequentLabIds).map(id => {
                                    const lab = allLaboratories.find(l => l.id === id);
                                    if (!lab) return null;
                                    return (
                                        <button key={id} onClick={() => setSelectedLab(lab)} className="flex flex-col items-center gap-2 shrink-0 group">
                                            <div className="w-20 h-20 bg-white rounded-full p-1 border-2 border-slate-100 group-hover:border-blue-600 transition-all shadow-md">
                                                <div className="w-full h-full rounded-full overflow-hidden bg-slate-50 flex items-center justify-center">
                                                    {lab.logoUrl ? <img src={lab.logoUrl} className="w-full h-full object-contain"/> : <Building size={24} className="text-slate-300"/>}
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-black text-slate-700 uppercase truncate w-20 text-center">{lab.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* VISTO RECENTEMENTE */}
                    {recentSearches.length > 0 && (
                        <section className="space-y-4">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-2">Visitados recentemente</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-2">
                                {recentSearches.map(id => {
                                    const lab = allLaboratories.find(l => l.id === id);
                                    if (!lab) return null;
                                    return (
                                        <div key={id} onClick={() => setSelectedLab(lab)} className="p-4 bg-white rounded-2xl border border-slate-100 flex items-center gap-4 cursor-pointer hover:shadow-lg transition-all">
                                            <div className="w-12 h-12 bg-slate-50 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                                                {lab.logoUrl ? <img src={lab.logoUrl} className="w-full h-full object-contain"/> : <Building size={20} className="text-slate-300"/>}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-bold text-slate-800 truncate text-sm">{lab.name}</p>
                                                <div className="flex items-center gap-1 text-yellow-500 text-[10px] font-black">
                                                    <Star size={10} fill="currentColor"/> {lab.ratingAverage?.toFixed(1) || 'N/A'}
                                                </div>
                                            </div>
                                            <ChevronRight size={16} className="text-slate-300" />
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}
                </div>
            )}

            {/* LISTA PRINCIPAL: EXPLORAR LABS */}
            <section className="space-y-4 px-2 md:px-0">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{searchTerm ? `Resultados para "${searchTerm}"` : 'Explorar todos os laboratórios'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredLabs.map(lab => (
                        <div key={lab.id} onClick={() => setSelectedLab(lab)} className="bg-white rounded-[32px] p-5 shadow-sm border border-slate-100 hover:shadow-2xl hover:border-blue-100 transition-all cursor-pointer group flex flex-col justify-between">
                            <div>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-100 group-hover:scale-105 transition-transform">
                                        {lab.logoUrl ? <img src={lab.logoUrl} className="w-full h-full object-contain"/> : <Building size={32} className="text-slate-300"/>}
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center gap-1 text-yellow-500 font-black text-sm mb-1">
                                            <Star size={16} fill="currentColor" />
                                            {lab.ratingAverage ? lab.ratingAverage.toFixed(1) : 'S/N'}
                                        </div>
                                        <span className="text-[9px] font-black text-slate-400 uppercase">{lab.ratingCount || 0} avaliações</span>
                                    </div>
                                </div>
                                <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-tight group-hover:text-blue-600 transition-colors">{lab.name}</h4>
                                <div className="flex items-center gap-1.5 text-slate-500 text-xs mt-2 font-bold">
                                    <MapPin size={14} className="text-blue-500" /> Atendimento Digital
                                </div>
                                <p className="text-[11px] text-slate-400 mt-3 line-clamp-2 leading-relaxed italic">
                                    {lab.description || "Nenhuma descrição informada pelo laboratório."}
                                </p>
                            </div>

                            <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                                {isPartner(lab.id) ? (
                                    <span className="text-[10px] font-black text-green-600 bg-green-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                                        <CheckCircle size={12}/> PARCEIRO ATIVO
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                                        VER VITRINE
                                    </span>
                                )}
                                <ArrowRight size={18} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                            </div>
                        </div>
                    ))}
                    {filteredLabs.length === 0 && (
                        <div className="col-span-full py-20 text-center text-slate-400 border-2 border-dashed rounded-3xl">
                            Nenhum laboratório encontrado com este nome.
                        </div>
                    )}
                </div>
            </section>

            {/* VITRINE / PERFIL DO LABORATÓRIO (MODAL FULLSCREEN MÓVEL) */}
            {selectedLab && (
                <div className="fixed inset-0 z-[100] flex items-center justify-end bg-black/40 backdrop-blur-md animate-in fade-in transition-opacity">
                    <div className="bg-slate-50 w-full md:w-[600px] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        
                        {/* HEADER VITRINE */}
                        <div className="relative h-48 md:h-56 bg-slate-900 shrink-0">
                            <button onClick={() => setSelectedLab(null)} className="absolute top-4 left-4 z-10 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full transition-colors"><X size={24}/></button>
                            {/* Banner Mockup */}
                            <div className="absolute inset-0 bg-gradient-to-b from-blue-900/50 to-slate-900"></div>
                            
                            <div className="absolute -bottom-10 left-8 flex items-end gap-5">
                                <div className="w-28 h-28 bg-white rounded-[32px] p-2 shadow-2xl border border-slate-100 flex items-center justify-center overflow-hidden">
                                    {selectedLab.logoUrl ? <img src={selectedLab.logoUrl} className="w-full h-full object-contain"/> : <Building size={48} className="text-slate-200"/>}
                                </div>
                                <div className="pb-4">
                                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter drop-shadow-md">{selectedLab.name}</h2>
                                    <div className="flex items-center gap-3 mt-1">
                                        <div className="flex items-center gap-1 text-yellow-400 font-black text-sm">
                                            <Star size={16} fill="currentColor"/> {selectedLab.ratingAverage?.toFixed(1) || 'S/N'}
                                        </div>
                                        <span className="text-slate-300 text-xs font-bold">• {selectedLab.ratingCount || 0} avaliações</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* NAVBAR INTERNA VITRINE */}
                        <div className="mt-12 px-8 flex border-b border-slate-200 gap-6 shrink-0 bg-slate-50">
                            <button onClick={() => setActiveProfileTab('SERVICES')} className={`py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeProfileTab === 'SERVICES' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Serviços</button>
                            <button onClick={() => setActiveProfileTab('REVIEWS')} className={`py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeProfileTab === 'REVIEWS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Avaliações</button>
                            <button onClick={() => setActiveProfileTab('ABOUT')} className={`py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeProfileTab === 'ABOUT' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Sobre</button>
                        </div>

                        {/* CONTEÚDO VITRINE */}
                        <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
                            
                            {activeProfileTab === 'SERVICES' && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight flex items-center gap-2"><ShoppingBag size={20} className="text-blue-600"/> Catálogo Digital</h3>
                                        {!isPartner(selectedLab.id) && (
                                            <button 
                                                onClick={() => handleFirmPartnership(selectedLab.id)}
                                                className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg hover:bg-blue-700 transition-all active:scale-95"
                                            >
                                                Firmar Parceria
                                            </button>
                                        )}
                                    </div>
                                    
                                    <div className="grid grid-cols-1 gap-4">
                                        {labServices.length === 0 ? (
                                            <div className="py-20 text-center text-slate-400 border-2 border-dashed rounded-3xl italic">Este laboratório ainda não publicou seu catálogo.</div>
                                        ) : (
                                            labServices.map(service => (
                                                <div key={service.id} className="p-4 bg-white rounded-2xl border border-slate-100 flex justify-between items-center hover:border-blue-200 transition-all shadow-sm">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                                                            {service.imageUrl ? <img src={service.imageUrl} className="w-full h-full object-cover"/> : <Package size={24} className="text-slate-200"/>}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-800 uppercase text-sm tracking-tight">{service.name}</p>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase">{service.category}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-black text-blue-600">R$ {service.basePrice.toFixed(2)}</p>
                                                        {isPartner(selectedLab.id) ? (
                                                            <button className="mt-1 text-[9px] font-black text-indigo-500 uppercase hover:underline">Configurar</button>
                                                        ) : (
                                                            <span className="text-[8px] font-bold text-slate-300 uppercase">Bloqueado</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeProfileTab === 'REVIEWS' && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight flex items-center gap-2"><Star size={20} className="text-yellow-500"/> Opinião dos Colegas</h3>
                                    <div className="space-y-4">
                                        {labReviews.length === 0 ? (
                                            <div className="py-20 text-center text-slate-400 italic">Nenhuma avaliação detalhada ainda.</div>
                                        ) : (
                                            labReviews.map(review => (
                                                <div key={review.id} className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-black text-slate-400">
                                                                {review.dentistName.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-800 text-sm">{review.dentistName}</p>
                                                                <div className="flex gap-0.5">
                                                                    {[1,2,3,4,5].map(s => <Star key={s} size={10} className={review.score >= s ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}/>)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-400">{new Date(review.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                    {review.comment && <p className="text-sm text-slate-600 leading-relaxed italic">"{review.comment}"</p>}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeProfileTab === 'ABOUT' && (
                                <div className="space-y-8 animate-in fade-in duration-300">
                                    <section>
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Info size={16} className="text-blue-500"/> Nossa História</h3>
                                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                                                {selectedLab.description || "Este laboratório ainda não cadastrou informações detalhadas sobre sua operação."}
                                            </p>
                                        </div>
                                    </section>

                                    <section>
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><MapPin size={16} className="text-blue-500"/> Localização & Cobertura</h3>
                                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 shrink-0"><Globe size={24}/></div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800">Atendimento Nacional</p>
                                                    <p className="text-xs text-slate-400">Logística integrada via sistema My Tooth.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
