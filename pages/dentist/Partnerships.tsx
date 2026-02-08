
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Handshake, Plus, Search, Building, CheckCircle, 
  MapPin, Star, X, MessageSquare, Package, 
  Clock, ArrowRight, History, Info, Globe, 
  ChevronRight, ShoppingBag, Store, User, Filter,
  Heart, Sparkles, ShieldCheck, BadgeCheck
} from 'lucide-react';
import * as api from '../../services/firebaseService';
import { LabRating, Organization, JobType } from '../../types';
import * as firestorePkg from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { getContrastColor } from '../../services/mockData';

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

    const isPartner = (labId: string) => userConnections.some(c => c.organizationId === labId);

    // 1. Identifica Labs "Frequentes" (Onde já teve pedidos)
    const frequentLabIds = useMemo(() => {
        const ids = new Set<string>();
        jobs.forEach(j => { if (j.organizationId) ids.add(j.organizationId); });
        return ids;
    }, [jobs]);

    // 2. Lógica de Pesquisa Unificada
    const searchResults = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return { partners: [], others: [] };

        const matches = allLaboratories.filter(lab => 
            lab.name.toLowerCase().includes(term) || 
            (lab.description && lab.description.toLowerCase().includes(term))
        );

        return {
            partners: matches.filter(l => isPartner(l.id)),
            others: matches.filter(l => !isPartner(l.id))
        };
    }, [allLaboratories, searchTerm, userConnections]);

    // 3. Busca Serviços e Reviews do Lab selecionado
    useEffect(() => {
        if (selectedLab) {
            const fetchLabData = async () => {
                setLoading(true);
                try {
                    const sRef = collection(db, `organizations/${selectedLab.id}/jobTypes`);
                    const sSnap = await getDocs(query(sRef, where('isVisibleInStore', '!=', false)));
                    setLabServices(sSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as JobType)));
                    
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

    const handleFirmPartnership = async (labId: string) => {
        if (window.confirm("Deseja oficializar a parceria com este laboratório?")) {
            setLoading(true);
            try {
                await addConnectionByCode(labId);
                alert("Parceria firmada! Você agora pode enviar pedidos.");
            } catch (e: any) {
                alert(e.message || "Erro ao conectar.");
            } finally {
                setLoading(false);
            }
        }
    };

    const renderLabCard = (lab: Organization) => {
        const partner = isPartner(lab.id);
        return (
            <div 
                key={lab.id} 
                onClick={() => setSelectedLab(lab)} 
                className={`bg-white rounded-[32px] p-5 shadow-sm border transition-all cursor-pointer group flex flex-col justify-between hover:shadow-2xl hover:-translate-y-1 ${partner ? 'border-blue-100 ring-1 ring-blue-50' : 'border-slate-100 hover:border-blue-200'}`}
            >
                <div>
                    <div className="flex items-start justify-between mb-4">
                        <div className="relative">
                            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-100 group-hover:scale-105 transition-transform">
                                {lab.logoUrl ? <img src={lab.logoUrl} className="w-full h-full object-contain"/> : <Building size={32} className="text-slate-300"/>}
                            </div>
                            {partner && (
                                <div className="absolute -top-2 -right-2 bg-blue-600 text-white p-1 rounded-full shadow-lg border-2 border-white">
                                    <BadgeCheck size={14} />
                                </div>
                            )}
                        </div>
                        <div className="text-right">
                            <div className="flex items-center gap-1 text-yellow-500 font-black text-sm mb-1">
                                <Star size={16} fill="currentColor" />
                                {lab.ratingAverage ? lab.ratingAverage.toFixed(1) : 'S/N'}
                            </div>
                            <span className="text-[9px] font-black text-slate-400 uppercase">{lab.ratingCount || 0} avaliações</span>
                        </div>
                    </div>
                    <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-tight group-hover:text-blue-600 transition-colors flex items-center gap-2">
                        {lab.name}
                    </h4>
                    <div className="flex items-center gap-1.5 text-slate-500 text-[10px] mt-2 font-black uppercase tracking-widest">
                        <MapPin size={12} className="text-blue-500" /> Atendimento Digital
                    </div>
                    <p className="text-[11px] text-slate-400 mt-3 line-clamp-2 leading-relaxed italic">
                        {lab.description || "Este laboratório é um novo parceiro potencial para sua clínica."}
                    </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                    {partner ? (
                        <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full flex items-center gap-1 uppercase">
                            <CheckCircle size={12}/> Minha Parceria
                        </span>
                    ) : (
                        <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full uppercase">
                            Novo Laboratório
                        </span>
                    )}
                    <div className="flex items-center gap-1 text-blue-600 font-black text-[10px] uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                        Ver Vitrine <ChevronRight size={14} />
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8 max-w-full overflow-x-hidden animate-in fade-in duration-500 pb-24">
            
            {/* SEARCH AREA (MARKETPLACE STYLE) */}
            <div className="sticky top-0 md:static bg-slate-50 z-30 pt-2 pb-6 px-2 md:px-0">
                <div className="max-w-4xl mx-auto relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-3">
                        <Search className="text-slate-400 group-focus-within:text-blue-600 transition-colors" size={24} />
                        <div className="h-6 w-px bg-slate-200"></div>
                    </div>
                    <input 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Busque laboratórios por nome, especialidade ou cidade..."
                        className="w-full pl-16 pr-4 py-5 bg-white border-2 border-slate-100 rounded-[32px] shadow-2xl shadow-slate-200/40 outline-none focus:border-blue-600 font-bold text-lg transition-all placeholder:text-slate-300"
                    />
                </div>
            </div>

            {/* CONTEÚDO DINÂMICO BASEADO NA BUSCA */}
            {searchTerm ? (
                <div className="space-y-12 animate-in fade-in duration-300">
                    {/* RESULTADOS: PARCEIROS */}
                    {searchResults.partners.length > 0 && (
                        <section className="space-y-4 px-2 md:px-0">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <ShieldCheck size={16} className="text-blue-600" /> Meus Parceiros Encontrados
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {searchResults.partners.map(lab => renderLabCard(lab))}
                            </div>
                        </section>
                    )}

                    {/* RESULTADOS: OUTROS LABS */}
                    <section className="space-y-4 px-2 md:px-0">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Sparkles size={16} className="text-indigo-500" /> {searchResults.partners.length > 0 ? 'Outras Opções' : 'Laboratórios Encontrados'}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {searchResults.others.map(lab => renderLabCard(lab))}
                        </div>
                        {searchResults.others.length === 0 && searchResults.partners.length === 0 && (
                            <div className="col-span-full py-24 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-100">
                                <div className="p-4 bg-slate-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                                    <Search size={32} className="text-slate-300" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-700">Nenhum laboratório encontrado</h3>
                                <p className="text-slate-400 max-w-xs mx-auto mt-2">Tente buscar por termos mais genéricos como "Prótese" ou "Digital".</p>
                            </div>
                        )}
                    </section>
                </div>
            ) : (
                /* HOME DO MARKETPLACE (SECTIONS RECENTES/FREQUENTES) */
                <div className="space-y-12 animate-in fade-in duration-300">
                    {/* MEUS FORNECEDORES (COM PEDIDOS ATIVOS) */}
                    {frequentLabIds.size > 0 && (
                        <section className="space-y-6">
                            <div className="flex justify-between items-center px-2">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <History size={16} /> Meus Fornecedores Frequentes
                                </h3>
                            </div>
                            <div className="flex gap-6 overflow-x-auto no-scrollbar pb-4 px-2">
                                {allLaboratories.filter(l => frequentLabIds.has(l.id)).map(lab => (
                                    <button key={lab.id} onClick={() => setSelectedLab(lab)} className="flex flex-col items-center gap-3 shrink-0 group">
                                        <div className="w-24 h-24 bg-white rounded-[32px] p-1 border-2 border-slate-100 group-hover:border-blue-600 group-hover:shadow-2xl transition-all shadow-md overflow-hidden flex items-center justify-center">
                                            <div className="w-full h-full rounded-[28px] overflow-hidden bg-slate-50 flex items-center justify-center">
                                                {lab.logoUrl ? <img src={lab.logoUrl} className="w-full h-full object-contain"/> : <Building size={32} className="text-slate-300"/>}
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <span className="text-[11px] font-black text-slate-700 uppercase block truncate w-24">{lab.name}</span>
                                            <div className="flex items-center justify-center gap-1 mt-1 text-yellow-500">
                                                <Star size={10} fill="currentColor" />
                                                <span className="text-[9px] font-black">{lab.ratingAverage?.toFixed(1) || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </button>
                                ))}
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
                                        <div key={id} onClick={() => setSelectedLab(lab)} className="p-4 bg-white rounded-2xl border border-slate-100 flex items-center gap-4 cursor-pointer hover:shadow-lg hover:border-blue-100 transition-all group">
                                            <div className="w-12 h-12 bg-slate-50 rounded-xl overflow-hidden shrink-0 flex items-center justify-center border border-slate-50">
                                                {lab.logoUrl ? <img src={lab.logoUrl} className="w-full h-full object-contain"/> : <Building size={20} className="text-slate-300"/>}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-bold text-slate-800 truncate text-sm group-hover:text-blue-600 transition-colors">{lab.name}</p>
                                                <div className="flex items-center gap-1 text-yellow-500 text-[10px] font-black">
                                                    <Star size={10} fill="currentColor"/> {lab.ratingAverage?.toFixed(1) || 'N/A'}
                                                </div>
                                            </div>
                                            <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-600" />
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* EXPLORAR TODOS (LISTA COMPLETA SEM FILTRO DE PARCERIA) */}
                    <section className="space-y-6 px-2 md:px-0">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Explorar todos os laboratórios</h3>
                            <span className="text-[10px] font-black text-slate-300 bg-slate-50 px-2 py-0.5 rounded-full">{allLaboratories.length} Laboratórios no Ecossistema</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {allLaboratories.map(lab => renderLabCard(lab))}
                        </div>
                    </section>
                </div>
            )}

            {/* VITRINE / PERFIL DO LABORATÓRIO (MODAL) */}
            {selectedLab && (
                <div className="fixed inset-0 z-[100] flex items-center justify-end bg-black/40 backdrop-blur-md animate-in fade-in transition-opacity">
                    <div className="bg-slate-50 w-full md:w-[600px] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        
                        {/* HEADER VITRINE */}
                        <div className="relative h-48 md:h-64 bg-slate-900 shrink-0">
                            <button onClick={() => setSelectedLab(null)} className="absolute top-6 left-6 z-10 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full transition-colors backdrop-blur-md"><X size={24}/></button>
                            <div className="absolute inset-0 bg-gradient-to-b from-blue-900/40 to-slate-900"></div>
                            
                            <div className="absolute -bottom-10 left-8 flex items-end gap-6">
                                <div className="w-32 h-32 bg-white rounded-[40px] p-2 shadow-2xl border-4 border-white flex items-center justify-center overflow-hidden">
                                    {selectedLab.logoUrl ? <img src={selectedLab.logoUrl} className="w-full h-full object-contain"/> : <Building size={48} className="text-slate-200"/>}
                                </div>
                                <div className="pb-4">
                                    <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter drop-shadow-lg">{selectedLab.name}</h2>
                                    <div className="flex items-center gap-3 mt-1">
                                        <div className="flex items-center gap-1.5 text-yellow-400 font-black text-sm">
                                            <Star size={18} fill="currentColor"/> {selectedLab.ratingAverage?.toFixed(1) || 'S/N'}
                                        </div>
                                        <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                                        <span className="text-slate-300 text-[10px] font-black uppercase tracking-widest">{selectedLab.ratingCount || 0} avaliações</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* NAVBAR INTERNA VITRINE */}
                        <div className="mt-14 px-8 flex border-b border-slate-200 gap-8 shrink-0 bg-slate-50">
                            {[
                                { id: 'SERVICES', label: 'Serviços', icon: <Package size={14}/> },
                                { id: 'REVIEWS', label: 'Avaliações', icon: <Star size={14}/> },
                                { id: 'ABOUT', label: 'Sobre', icon: <Info size={14}/> }
                            ].map(tab => (
                                <button 
                                    key={tab.id}
                                    onClick={() => setActiveProfileTab(tab.id as any)} 
                                    className={`py-4 text-[10px] font-black uppercase tracking-[0.15em] border-b-2 transition-all flex items-center gap-2 ${activeProfileTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                                >
                                    {tab.icon} {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* CONTEÚDO VITRINE */}
                        <div className="flex-1 overflow-y-auto p-8 no-scrollbar pb-20">
                            
                            {activeProfileTab === 'SERVICES' && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight flex items-center gap-2"><ShoppingBag size={20} className="text-blue-600"/> Catálogo de Serviços</h3>
                                        {!isPartner(selectedLab.id) && (
                                            <button 
                                                onClick={() => handleFirmPartnership(selectedLab.id)}
                                                className="px-6 py-2.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-900/20 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2"
                                            >
                                                <Handshake size={16} /> Firmar Parceria
                                            </button>
                                        )}
                                    </div>
                                    
                                    <div className="grid grid-cols-1 gap-4">
                                        {labServices.length === 0 ? (
                                            <div className="py-24 text-center text-slate-400 border-2 border-dashed rounded-[32px] italic flex flex-col items-center">
                                                <Store size={40} className="mb-4 opacity-10" />
                                                Catálogo em manutenção ou vazio.
                                            </div>
                                        ) : (
                                            labServices.map(service => (
                                                <div key={service.id} className="p-5 bg-white rounded-[24px] border border-slate-100 flex justify-between items-center hover:border-blue-200 hover:shadow-lg transition-all shadow-sm group">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-14 h-14 bg-slate-50 rounded-2xl overflow-hidden flex items-center justify-center shrink-0 border border-slate-50 group-hover:scale-105 transition-transform">
                                                            {service.imageUrl ? <img src={service.imageUrl} className="w-full h-full object-cover"/> : <Package size={24} className="text-slate-200"/>}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-slate-800 uppercase text-sm tracking-tight">{service.name}</p>
                                                            <span className="text-[9px] font-black text-slate-400 uppercase bg-slate-50 px-2 py-0.5 rounded mt-1 inline-block">{service.category}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-base font-black text-blue-600">R$ {service.basePrice.toFixed(2)}</p>
                                                        {isPartner(selectedLab.id) ? (
                                                            <button className="mt-1 text-[9px] font-black text-indigo-500 uppercase hover:underline flex items-center gap-1 justify-end">Configurar <ArrowRight size={10}/></button>
                                                        ) : (
                                                            <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter">Parceria Pendente</span>
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
                                    <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight flex items-center gap-2"><Star size={20} className="text-yellow-500"/> Opinião dos Dentistas</h3>
                                    <div className="space-y-4">
                                        {labReviews.length === 0 ? (
                                            <div className="py-20 text-center text-slate-400 bg-white rounded-[32px] border border-slate-100 italic">Nenhuma avaliação detalhada ainda.</div>
                                        ) : (
                                            labReviews.map(review => (
                                                <div key={review.id} className="p-6 bg-white rounded-[24px] border border-slate-100 shadow-sm relative overflow-hidden">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-black text-lg border-2 border-white shadow-sm">
                                                                {review.dentistName.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-slate-800 text-sm uppercase tracking-tight">{review.dentistName}</p>
                                                                <div className="flex gap-0.5 mt-0.5">
                                                                    {[1,2,3,4,5].map(s => <Star key={s} size={10} className={review.score >= s ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}/>)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{new Date(review.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                    {review.comment && (
                                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                            <p className="text-sm text-slate-600 leading-relaxed italic font-medium">"{review.comment}"</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeProfileTab === 'ABOUT' && (
                                <div className="space-y-8 animate-in fade-in duration-300">
                                    <section>
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Info size={16} className="text-blue-500"/> Sobre o Laboratório</h3>
                                        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm leading-relaxed text-sm text-slate-600 font-medium">
                                            <p className="whitespace-pre-wrap">
                                                {selectedLab.description || "Este laboratório ainda não atualizou as informações detalhadas da sua vitrine."}
                                            </p>
                                        </div>
                                    </section>

                                    <section>
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><MapPin size={16} className="text-blue-500"/> Abrangência Logística</h3>
                                        <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm">
                                            <div className="flex items-center gap-5">
                                                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shrink-0 border border-blue-100"><Globe size={28}/></div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Atendimento via My Tooth</p>
                                                    <p className="text-xs text-slate-400 font-medium">Fluxo 100% digital e integração com logística local.</p>
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
