
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Handshake, Plus, Trash2, Loader2, Building, CheckCircle, Search, MapPin, Globe, Filter, Link as LinkIcon, Star, X, MessageSquare, Calendar } from 'lucide-react';
import * as api from '../../services/firebaseService';
import { LabRating, Organization } from '../../types';

export const Partnerships = () => {
    const { userConnections, addConnectionByCode, allLaboratories } = useApp();
    const [activeTab, setActiveTab] = useState<'MY_PARTNERS' | 'EXPLORE'>('MY_PARTNERS');
    const [orgCode, setOrgCode] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Review Modal State
    const [viewingReviewsLab, setViewingReviewsLab] = useState<Organization | null>(null);
    const [labReviews, setLabReviews] = useState<LabRating[]>([]);
    const [loadingReviews, setLoadingReviews] = useState(false);

    useEffect(() => {
        if (viewingReviewsLab) {
            setLoadingReviews(true);
            const unsub = api.subscribeLabRatings(viewingReviewsLab.id, (reviews) => {
                setLabReviews(reviews);
                setLoadingReviews(false);
            });
            return () => unsub();
        }
    }, [viewingReviewsLab]);

    const handleAdd = async (code: string) => {
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await addConnectionByCode(code);
            setSuccess('Parceria firmada com sucesso!');
            setOrgCode('');
            setTimeout(() => {
                setActiveTab('MY_PARTNERS');
                setSuccess('');
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Erro ao adicionar laboratório.');
        } finally {
            setLoading(false);
        }
    };

    const exploreLabs = useMemo(() => {
        const connectedIds = new Set(userConnections.map(c => c.organizationId));
        return allLaboratories
            .filter(lab => !connectedIds.has(lab.id))
            .filter(lab => 
                lab.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
    }, [allLaboratories, userConnections, searchTerm]);
    
    return (
        <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Rede de Parcerias</h1>
                    <p className="text-slate-500">Conecte seu consultório aos melhores laboratórios da plataforma.</p>
                </div>
            </div>

            {/* TABS NAVIGATION */}
            <div className="flex bg-slate-200 p-1 rounded-2xl w-fit">
                <button 
                    onClick={() => setActiveTab('MY_PARTNERS')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'MY_PARTNERS' ? 'bg-white text-blue-600 shadow' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Handshake size={18} /> Minhas Parcerias
                </button>
                <button 
                    onClick={() => setActiveTab('EXPLORE')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'EXPLORE' ? 'bg-white text-blue-600 shadow' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Search size={18} /> Explorar Laboratórios
                </button>
            </div>

            {/* TAB CONTENT: MY PARTNERS */}
            {activeTab === 'MY_PARTNERS' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1 space-y-6">
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-fit">
                            <h3 className="font-bold text-lg mb-2 flex items-center gap-2 text-slate-800">
                                <LinkIcon className="text-blue-600" size={20}/> Conexão Direta
                            </h3>
                            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                                Se você já possui o código enviado pelo seu laboratório, cole-o abaixo.
                            </p>
                            <form onSubmit={(e) => { e.preventDefault(); handleAdd(orgCode); }} className="space-y-3">
                                <input 
                                    value={orgCode}
                                    onChange={e => setOrgCode(e.target.value)}
                                    placeholder="Ex: org_123abc..."
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-mono"
                                    required
                                />
                                {error && activeTab === 'MY_PARTNERS' && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100">{error}</div>}
                                {success && activeTab === 'MY_PARTNERS' && <div className="p-3 bg-green-50 text-green-600 text-xs rounded-lg border border-green-100 flex items-center gap-2"><CheckCircle size={14}/> {success}</div>}
                                <button type="submit" disabled={loading} className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 disabled:opacity-70 flex items-center justify-center gap-2 transition-all shadow-lg">
                                    {loading ? <Loader2 className="animate-spin" size={18} /> : 'Vincular por Código'}
                                </button>
                            </form>
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 min-h-[400px]">
                            <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-slate-800">
                                <Handshake className="text-teal-600" size={20}/> Parceiros Ativos ({userConnections.length})
                            </h3>
                            {userConnections.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl">
                                    <Globe size={48} className="mb-4 opacity-20" />
                                    <p className="font-medium">Você ainda não possui parcerias firmadas.</p>
                                    <button onClick={() => setActiveTab('EXPLORE')} className="text-blue-600 font-bold hover:underline mt-2">Explorar laboratórios agora</button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {userConnections.map(conn => {
                                        const labInfo = allLaboratories.find(l => l.id === conn.organizationId);
                                        return (
                                            <div key={conn.id} className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-all group relative overflow-hidden">
                                                <div className="flex items-center gap-4 relative z-10">
                                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-slate-100 overflow-hidden">
                                                        {labInfo?.logoUrl ? (
                                                          <img src={labInfo.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                                                        ) : (
                                                          <Building size={24} />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-slate-800 truncate">{conn.organizationName}</p>
                                                        <div className="flex items-center gap-1 mt-1">
                                                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                                            <span className="text-[10px] text-green-600 font-black uppercase tracking-tighter">Parceria Ativa</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: EXPLORE */}
            {activeTab === 'EXPLORE' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Pesquisar laboratórios por nome..."
                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {exploreLabs.map(lab => (
                            <div key={lab.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300 overflow-hidden">
                                        {lab.logoUrl ? (
                                          <img src={lab.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                                        ) : (
                                          <Building size={32} />
                                        )}
                                    </div>
                                    <button 
                                        onClick={() => setViewingReviewsLab(lab)}
                                        className="text-right hover:scale-105 transition-transform"
                                    >
                                        <div className="flex items-center gap-1 text-yellow-500 font-black text-sm mb-1 justify-end">
                                            <Star size={16} className="fill-yellow-500" />
                                            {lab.ratingAverage ? lab.ratingAverage.toFixed(1) : 'S/N'}
                                        </div>
                                        <span className="text-[9px] font-black text-blue-400 uppercase bg-blue-50 px-2 py-1 rounded flex items-center gap-1">
                                            <MessageSquare size={10}/> {lab.ratingCount || 0} Avaliações
                                        </span>
                                    </button>
                                </div>
                                
                                <div className="flex-1">
                                    <h3 className="text-xl font-black text-slate-800 leading-tight mb-2 group-hover:text-blue-700 transition-colors">{lab.name}</h3>
                                    <div className="flex items-center gap-1.5 text-slate-500 text-sm mb-4">
                                        <MapPin size={14} className="shrink-0" />
                                        <span className="truncate">Atendimento Digital & Nacional</span>
                                    </div>
                                    <p className="text-xs text-slate-400 line-clamp-2 italic mb-4">"Membro ProTrack com infraestrutura digital completa."</p>
                                </div>

                                <div className="pt-6 border-t border-slate-50 mt-auto">
                                    <button 
                                        onClick={() => handleAdd(lab.id)}
                                        disabled={loading}
                                        className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                                    >
                                        {loading ? <Loader2 className="animate-spin" size={20} /> : <><Plus size={20}/> FIRMAR PARCERIA</>}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* MODAL: REVIEWS DETAIL */}
            {viewingReviewsLab && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col animate-in zoom-in duration-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-600 text-white rounded-xl overflow-hidden flex items-center justify-center">
                                    {viewingReviewsLab.logoUrl ? (
                                      <img src={viewingReviewsLab.logoUrl} className="w-8 h-8 object-contain" />
                                    ) : (
                                      <MessageSquare size={20}/>
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">{viewingReviewsLab.name}</h3>
                                    <div className="flex items-center gap-1 text-yellow-500 text-xs font-bold">
                                        <Star size={12} className="fill-yellow-500"/> {viewingReviewsLab.ratingAverage?.toFixed(1) || '0.0'} • {viewingReviewsLab.ratingCount || 0} avaliações
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setViewingReviewsLab(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24}/></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {loadingReviews ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                    <Loader2 className="animate-spin mb-2" />
                                    <p className="text-sm font-medium">Carregando depoimentos...</p>
                                </div>
                            ) : labReviews.length === 0 ? (
                                <div className="text-center py-12 text-slate-400 italic">
                                    Este laboratório ainda não recebeu comentários detalhados.
                                </div>
                            ) : (
                                labReviews.map(review => (
                                    <div key={review.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-xs font-bold text-blue-600 border border-slate-200 uppercase">
                                                    {review.dentistName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-800">{review.dentistName}</p>
                                                    <div className="flex gap-0.5">
                                                        {[1,2,3,4,5].map(s => (
                                                            <Star key={s} size={10} className={`${review.score >= s ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`} />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                                <Calendar size={10}/> {new Date(review.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                        {review.comment && (
                                            <p className="text-sm text-slate-600 leading-relaxed italic">"{review.comment}"</p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
