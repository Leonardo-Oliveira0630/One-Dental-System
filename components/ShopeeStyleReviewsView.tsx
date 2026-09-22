import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
    Star, ThumbsUp, Camera, Video, Play, X, ShieldCheck, 
    MessageSquare, Filter, CheckCircle2, ChevronRight, Loader2, Sparkles,
    Tag, Layers, Award, ArrowLeft, Check
} from 'lucide-react';
import { LabRating } from '../types';
import { subscribeLabRatings } from '../services/firebaseService';

interface ServiceReputationSummary {
    id: string;
    name: string;
    scoreAvg: number;
    totalReviews: number;
    fiveStarPercent: number;
    countWithMedia: number;
    topTags: { tag: string; count: number }[];
}

interface ShopeeStyleReviewsViewProps {
    labId: string;
    serviceId?: string;
    serviceName?: string;
    onWriteReview?: () => void;
    showWriteButton?: boolean;
    availableServices?: { id: string; name: string; category?: string }[];
}

export const ShopeeStyleReviewsView: React.FC<ShopeeStyleReviewsViewProps> = ({
    labId,
    serviceId,
    serviceName,
    onWriteReview,
    showWriteButton = false,
    availableServices = []
}) => {
    const { t } = useTranslation();
    const [allLabReviews, setAllLabReviews] = useState<LabRating[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedServiceId, setSelectedServiceId] = useState<string>(serviceId || 'ALL');
    const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'MEDIA' | '5' | '4' | '3' | '2' | '1'>('ALL');
    const [lightboxMedia, setLightboxMedia] = useState<{ url: string; type: 'IMAGE' | 'VIDEO' } | null>(null);

    // Sync if parent passes or changes serviceId
    useEffect(() => {
        if (serviceId) {
            setSelectedServiceId(serviceId);
        }
    }, [serviceId]);

    // Load all ratings for the laboratory to compute both global & per-service reputations
    useEffect(() => {
        if (!labId) {
            setAllLabReviews([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const unsub = subscribeLabRatings(labId, (loaded) => {
            setAllLabReviews(loaded);
            setLoading(false);
        });

        return () => unsub();
    }, [labId]);

    // Compute reputation per service across all reviews
    const serviceReputations = useMemo(() => {
        const map = new Map<string, {
            id: string;
            name: string;
            scores: number[];
            mediaCount: number;
            tagCounts: Record<string, number>;
        }>();

        // Register available services if passed
        availableServices.forEach(srv => {
            map.set(srv.id, {
                id: srv.id,
                name: srv.name,
                scores: [],
                mediaCount: 0,
                tagCounts: {}
            });
        });

        // Populate with actual ratings
        allLabReviews.forEach(r => {
            const sId = r.serviceId || 'OTHER';
            const sName = r.serviceName || 'Serviço Protetizado';
            
            if (!map.has(sId)) {
                map.set(sId, {
                    id: sId,
                    name: sName,
                    scores: [],
                    mediaCount: 0,
                    tagCounts: {}
                });
            }

            const current = map.get(sId)!;
            current.scores.push(Number(r.score) || 5);
            if ((r.imageUrls?.length || 0) > 0 || (r.videoUrls?.length || 0) > 0) {
                current.mediaCount += 1;
            }
            (r.tags || []).forEach(tag => {
                current.tagCounts[tag] = (current.tagCounts[tag] || 0) + 1;
            });
        });

        const list: ServiceReputationSummary[] = [];
        map.forEach((item, id) => {
            const count = item.scores.length;
            const avg = count > 0 ? (item.scores.reduce((a, b) => a + b, 0) / count) : 5.0;
            const fiveStars = item.scores.filter(s => Math.round(s) >= 5).length;
            const fiveStarPercent = count > 0 ? Math.round((fiveStars / count) * 100) : 100;
            
            const topTags = Object.entries(item.tagCounts)
                .map(([tag, cnt]) => ({ tag, count: cnt }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 4);

            list.push({
                id,
                name: item.name,
                scoreAvg: avg,
                totalReviews: count,
                fiveStarPercent,
                countWithMedia: item.mediaCount,
                topTags
            });
        });

        // Sort by most reviewed first
        return list.sort((a, b) => b.totalReviews - a.totalReviews);
    }, [allLabReviews, availableServices]);

    // Active Service Data (if a specific service is selected)
    const activeServiceReputation = useMemo(() => {
        if (selectedServiceId === 'ALL') return null;
        return serviceReputations.find(s => s.id === selectedServiceId) || {
            id: selectedServiceId,
            name: serviceName || 'Serviço Selecionado',
            scoreAvg: 5.0,
            totalReviews: 0,
            fiveStarPercent: 100,
            countWithMedia: 0,
            topTags: []
        };
    }, [selectedServiceId, serviceReputations, serviceName]);

    // Filter reviews according to selected service & star/media filter
    const reviewsForActiveService = useMemo(() => {
        if (selectedServiceId === 'ALL') {
            return allLabReviews;
        }
        return allLabReviews.filter(r => r.serviceId === selectedServiceId || (!r.serviceId && serviceId === selectedServiceId));
    }, [allLabReviews, selectedServiceId, serviceId]);

    // Statistics Calculation for current view
    const totalCount = reviewsForActiveService.length;
    const averageScore = useMemo(() => {
        if (totalCount === 0) return activeServiceReputation ? activeServiceReputation.scoreAvg : 5.0;
        const sum = reviewsForActiveService.reduce((acc, r) => acc + (Number(r.score) || 5), 0);
        return (sum / totalCount);
    }, [reviewsForActiveService, totalCount, activeServiceReputation]);

    const countWithMedia = useMemo(() => {
        return reviewsForActiveService.filter(r => (r.imageUrls?.length || 0) > 0 || (r.videoUrls?.length || 0) > 0).length;
    }, [reviewsForActiveService]);

    const starCounts = useMemo(() => {
        const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviewsForActiveService.forEach(r => {
            const sc = Math.min(5, Math.max(1, Math.round(r.score || 5))) as 1|2|3|4|5;
            counts[sc] = (counts[sc] || 0) + 1;
        });
        return counts;
    }, [reviewsForActiveService]);

    // Aggregated top tags for current view
    const aggregatedTopTags = useMemo(() => {
        const counts: Record<string, number> = {};
        reviewsForActiveService.forEach(r => {
            (r.tags || []).forEach(t => {
                counts[t] = (counts[t] || 0) + 1;
            });
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6);
    }, [reviewsForActiveService]);

    // Media Gallery list (all photos & videos across current reviews)
    const allMediaItems = useMemo(() => {
        const items: { url: string; type: 'IMAGE' | 'VIDEO'; reviewId: string; dentistName: string; serviceName?: string }[] = [];
        reviewsForActiveService.forEach(r => {
            (r.imageUrls || []).forEach(url => items.push({ url, type: 'IMAGE', reviewId: r.id, dentistName: r.dentistName, serviceName: r.serviceName }));
            (r.videoUrls || []).forEach(url => items.push({ url, type: 'VIDEO', reviewId: r.id, dentistName: r.dentistName, serviceName: r.serviceName }));
        });
        return items;
    }, [reviewsForActiveService]);

    // Filtered reviews
    const filteredReviews = useMemo(() => {
        return reviewsForActiveService.filter(r => {
            if (selectedFilter === 'MEDIA') {
                return (r.imageUrls?.length || 0) > 0 || (r.videoUrls?.length || 0) > 0;
            }
            if (['5', '4', '3', '2', '1'].includes(selectedFilter)) {
                return Math.round(r.score) === Number(selectedFilter);
            }
            return true;
        });
    }, [reviewsForActiveService, selectedFilter]);

    if (loading) {
        return (
            <div className="py-16 text-center">
                <Loader2 className="animate-spin mx-auto text-blue-600 mb-3" size={32} />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Carregando reputação e avaliações...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header: Specific Service Reputation or Global Store Breakdown */}
            {activeServiceReputation && selectedServiceId !== 'ALL' ? (
                /* DEDICATED SERVICE REPUTATION CARD */
                <div className="bg-gradient-to-br from-blue-500/10 via-amber-500/5 to-purple-500/5 dark:from-blue-950/40 dark:via-amber-950/20 dark:to-purple-950/20 border border-blue-200 dark:border-blue-800/80 rounded-3xl p-5 sm:p-7 shadow-xs">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-blue-100 dark:border-blue-900/60">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-100/80 dark:bg-blue-900/60 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                    <Award size={12} /> Reputação do Tipo de Serviço
                                </span>
                                {activeServiceReputation.fiveStarPercent >= 90 && activeServiceReputation.totalReviews > 0 && (
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-900/60 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                        <Sparkles size={11} /> Altamente Recomendado
                                    </span>
                                )}
                            </div>
                            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                {activeServiceReputation.name}
                            </h3>
                        </div>

                        {!serviceId && (
                            <button
                                type="button"
                                onClick={() => setSelectedServiceId('ALL')}
                                className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                            >
                                <ArrowLeft size={13} /> Ver Todos os Serviços
                            </button>
                        )}
                    </div>

                    {/* Stats & Highlights Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5 items-center">
                        {/* Score Box */}
                        <div className="flex items-center gap-4 bg-white/80 dark:bg-[#131B2A]/80 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
                            <div className="flex flex-col items-center justify-center">
                                <span className="text-3xl sm:text-4xl font-black text-amber-500 tracking-tight">
                                    {totalCount > 0 ? averageScore.toFixed(1) : '5.0'}
                                </span>
                                <div className="flex items-center text-amber-400 mt-1">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <Star 
                                            key={s} 
                                            size={12} 
                                            className={`${s <= Math.round(averageScore) ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-700'}`} 
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="border-l border-slate-200 dark:border-slate-700 pl-4 text-xs space-y-1">
                                <div className="font-bold text-slate-800 dark:text-white">
                                    {totalCount} {totalCount === 1 ? 'avaliação' : 'avaliações'}
                                </div>
                                <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                                    {totalCount > 0 ? `${activeServiceReputation.fiveStarPercent}% recomendam este trabalho` : 'Nenhum relato com problema'}
                                </div>
                            </div>
                        </div>

                        {/* Top Highlights Tags */}
                        <div className="col-span-1 md:col-span-2 bg-white/80 dark:bg-[#131B2A]/80 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400 block mb-2">
                                Destaques mais elogiados pelos dentistas:
                            </span>
                            {aggregatedTopTags.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                    {aggregatedTopTags.map(([tag, count], idx) => (
                                        <span 
                                            key={idx}
                                            className="text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/80 px-2.5 py-1 rounded-xl flex items-center gap-1.5"
                                        >
                                            <Check size={12} className="text-blue-600 dark:text-blue-400" />
                                            {tag} <strong className="text-blue-900 dark:text-blue-200">({count})</strong>
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400 italic">
                                    Garantia de precisão, adaptação e acabamento de excelência.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                /* GLOBAL STORE RATING & SERVICE BREAKDOWN SELECTOR */
                <div className="space-y-6">
                    {/* Main Lab Rating Summary Card */}
                    <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row items-center gap-6">
                        {/* Main Rating Score Box */}
                        <div className="flex flex-col items-center justify-center text-center md:border-r md:border-amber-500/20 md:pr-8 min-w-[180px]">
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl sm:text-5xl font-black text-amber-500 tracking-tight">
                                    {totalCount > 0 ? averageScore.toFixed(1) : '5.0'}
                                </span>
                                <span className="text-lg font-bold text-amber-500/80">/5</span>
                            </div>
                            
                            <div className="flex items-center gap-1 text-amber-400 my-2">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <Star 
                                        key={s} 
                                        size={18} 
                                        className={`${s <= Math.round(averageScore || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} 
                                    />
                                ))}
                            </div>

                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                {totalCount} {totalCount === 1 ? 'avaliação no total' : 'avaliações no total'}
                            </span>
                        </div>

                        {/* Summary & Reputation Overview */}
                        <div className="flex-1 w-full space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                                    <Award size={16} className="text-amber-500" />
                                    Reputação Geral do Laboratório
                                </h4>
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                    <ShieldCheck size={12} /> 100% Casos Reais
                                </span>
                            </div>

                            {aggregatedTopTags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {aggregatedTopTags.map(([tag, count], idx) => (
                                        <span 
                                            key={idx}
                                            className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-[#131B2A] border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-xl shadow-xs"
                                        >
                                            ✓ {tag} ({count})
                                        </span>
                                    ))}
                                </div>
                            )}

                            {showWriteButton && onWriteReview && (
                                <div className="pt-1">
                                    <button
                                        onClick={onWriteReview}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <Sparkles size={14} /> Avaliar Trabalho Recebido
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* REPUTATION PER SERVICE TYPE CAROUSEL / GRID */}
                    {serviceReputations.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                    <Layers size={14} className="text-blue-500" />
                                    Reputação por Tipo de Serviço ({serviceReputations.length})
                                </label>
                                <span className="text-[11px] text-slate-400">
                                    Clique para ver avaliações específicas
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {serviceReputations.map(srv => {
                                    const isSelected = selectedServiceId === srv.id;
                                    return (
                                        <button
                                            key={srv.id}
                                            type="button"
                                            onClick={() => setSelectedServiceId(isSelected ? 'ALL' : srv.id)}
                                            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group shadow-xs ${
                                                isSelected 
                                                    ? 'bg-blue-50/90 dark:bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/30' 
                                                    : 'bg-white dark:bg-[#131B2A] border-slate-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start gap-2">
                                                <h5 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                    {srv.name}
                                                </h5>
                                                <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 px-2 py-0.5 rounded-full text-xs font-black shrink-0">
                                                    <Star size={11} className="fill-current" />
                                                    <span>{srv.totalReviews > 0 ? srv.scoreAvg.toFixed(1) : '5.0'}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 dark:text-slate-400">
                                                <span>{srv.totalReviews} {srv.totalReviews === 1 ? 'avaliação' : 'avaliações'}</span>
                                                {srv.countWithMedia > 0 && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold">
                                                            <Camera size={11} /> {srv.countWithMedia} fotos
                                                        </span>
                                                    </>
                                                )}
                                            </div>

                                            {srv.topTags.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                                                    {srv.topTags.slice(0, 2).map((t, idx) => (
                                                        <span key={idx} className="text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                                            ✓ {t.tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Filter Bar (All, With Media, 5★, 4★, 3★, 2★, 1★) */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                    type="button"
                    onClick={() => setSelectedFilter('ALL')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all border cursor-pointer ${
                        selectedFilter === 'ALL'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                            : 'bg-white dark:bg-[#131B2A] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-blue-400'
                    }`}
                >
                    Todas ({totalCount})
                </button>

                <button
                    type="button"
                    onClick={() => setSelectedFilter('MEDIA')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all border flex items-center gap-1.5 cursor-pointer ${
                        selectedFilter === 'MEDIA'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                            : 'bg-white dark:bg-[#131B2A] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-blue-400'
                    }`}
                >
                    <Camera size={13} /> Com Fotos/Vídeos ({countWithMedia})
                </button>

                {[5, 4, 3, 2, 1].map((s) => (
                    <button
                        key={s}
                        type="button"
                        onClick={() => setSelectedFilter(String(s) as any)}
                        className={`px-3 py-1.5 rounded-full text-xs font-black transition-all border flex items-center gap-1 cursor-pointer ${
                            selectedFilter === String(s)
                                ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20'
                                : 'bg-white dark:bg-[#131B2A] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-amber-400'
                        }`}
                    >
                        <span>{s}</span> <Star size={11} className="fill-current" /> ({starCounts[s as 1|2|3|4|5] || 0})
                    </button>
                ))}
            </div>

            {/* Media Gallery Strip (Shopee / Shein visual strip) */}
            {allMediaItems.length > 0 && selectedFilter !== '1' && selectedFilter !== '2' && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
                            <Camera size={14} className="text-blue-500" /> Galeria de Fotos e Vídeos dos Casos ({allMediaItems.length})
                        </span>
                    </div>

                    <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
                        {allMediaItems.map((item, idx) => (
                            <button
                                key={`thumb_${idx}`}
                                type="button"
                                onClick={() => setLightboxMedia({ url: item.url, type: item.type })}
                                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden relative shrink-0 hover:scale-105 transition-transform group cursor-pointer shadow-xs"
                            >
                                {item.type === 'VIDEO' ? (
                                    <>
                                        <video src={item.url} className="w-full h-full object-cover opacity-80" />
                                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                            <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
                                                <Play size={12} className="ml-0.5" />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <img src={item.url} alt="Foto cliente" className="w-full h-full object-cover" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Review Cards List */}
            {filteredReviews.length === 0 ? (
                <div className="py-12 text-center bg-slate-50 dark:bg-[#131B2A] rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-6">
                    <Star size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                    <h4 className="text-base font-bold text-slate-700 dark:text-slate-200">
                        {selectedFilter === 'ALL' 
                            ? 'Nenhuma avaliação registrada para este serviço ainda' 
                            : 'Nenhuma avaliação encontrada com os filtros selecionados'}
                    </h4>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
                        As notas de qualidade, comentários e fotos/vídeos aparecem aqui assim que os casos são entregues e avaliados pelos dentistas.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredReviews.map((review) => {
                        const dateFormatted = review.createdAt 
                            ? new Date(review.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                            : 'Recente';

                        return (
                            <div 
                                key={review.id} 
                                className="bg-white dark:bg-[#131B2A] p-5 sm:p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-3.5 hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
                            >
                                {/* Review Header */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 font-black text-sm flex items-center justify-center shrink-0 uppercase">
                                            {review.dentistName?.charAt(0) || 'D'}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                                    {review.dentistName}
                                                </h4>
                                                {review.verifiedPurchase !== false && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                                        <ShieldCheck size={11} /> Compra Verificada
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <div className="flex text-amber-400">
                                                    {[1, 2, 3, 4, 5].map((s) => (
                                                        <Star 
                                                            key={s} 
                                                            size={12} 
                                                            className={`${s <= review.score ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-700'}`} 
                                                        />
                                                    ))}
                                                </div>
                                                <span className="text-[11px] text-slate-400">
                                                    {dateFormatted}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {review.serviceName && (
                                        <button
                                            type="button"
                                            onClick={() => review.serviceId && setSelectedServiceId(review.serviceId)}
                                            className="text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-50 dark:bg-[#0B0F17] hover:bg-blue-50 dark:hover:bg-blue-950/40 px-2.5 py-1 rounded-full border border-slate-200/60 dark:border-slate-800 transition-colors cursor-pointer"
                                        >
                                            {review.serviceName}
                                        </button>
                                    )}
                                </div>

                                {/* Tags Highlight */}
                                {review.tags && review.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                                        {review.tags.map((t, idx) => (
                                            <span 
                                                key={idx}
                                                className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/60 px-2.5 py-0.5 rounded-full"
                                            >
                                                ✓ {t}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Comment Text */}
                                {review.comment && (
                                    <p className="text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium leading-relaxed">
                                        "{review.comment}"
                                    </p>
                                )}

                                {/* Review Media Grid (Photos & Videos) */}
                                {((review.imageUrls?.length || 0) > 0 || (review.videoUrls?.length || 0) > 0) && (
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {/* Photos */}
                                        {review.imageUrls?.map((url, idx) => (
                                            <button
                                                key={`r_img_${idx}`}
                                                type="button"
                                                onClick={() => setLightboxMedia({ url, type: 'IMAGE' })}
                                                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 overflow-hidden hover:opacity-90 hover:scale-105 transition-all cursor-pointer shadow-xs"
                                            >
                                                <img src={url} alt={`Foto ${idx+1}`} className="w-full h-full object-cover" />
                                            </button>
                                        ))}

                                        {/* Videos */}
                                        {review.videoUrls?.map((url, idx) => (
                                            <button
                                                key={`r_vid_${idx}`}
                                                type="button"
                                                onClick={() => setLightboxMedia({ url, type: 'VIDEO' })}
                                                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden relative hover:opacity-90 hover:scale-105 transition-all cursor-pointer shadow-xs flex items-center justify-center"
                                            >
                                                <video src={url} className="w-full h-full object-cover opacity-70" />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow">
                                                        <Play size={10} className="ml-0.5" />
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Lightbox Modal */}
            {lightboxMedia && (
                <div 
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 animate-in fade-in"
                    onClick={() => setLightboxMedia(null)}
                >
                    <div className="relative max-w-3xl max-h-[85vh] w-full flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setLightboxMedia(null)}
                            className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white bg-white/10 rounded-full cursor-pointer"
                        >
                            <X size={24} />
                        </button>
                        {lightboxMedia.type === 'VIDEO' ? (
                            <video 
                                src={lightboxMedia.url} 
                                controls 
                                autoPlay 
                                className="max-h-[80vh] w-auto max-w-full rounded-2xl shadow-2xl"
                            />
                        ) : (
                            <img 
                                src={lightboxMedia.url} 
                                alt="Foto avaliação" 
                                className="max-h-[80vh] w-auto max-w-full object-contain rounded-2xl shadow-2xl"
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
