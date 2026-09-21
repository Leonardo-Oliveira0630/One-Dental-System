import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
    Star, ThumbsUp, Camera, Video, Play, X, ShieldCheck, 
    MessageSquare, Filter, CheckCircle2, ChevronRight, Loader2, Sparkles
} from 'lucide-react';
import { LabRating } from '../types';
import { subscribeServiceRatings, subscribeLabRatings } from '../services/firebaseService';

interface ShopeeStyleReviewsViewProps {
    labId: string;
    serviceId?: string;
    serviceName?: string;
    onWriteReview?: () => void;
    showWriteButton?: boolean;
}

export const ShopeeStyleReviewsView: React.FC<ShopeeStyleReviewsViewProps> = ({
    labId,
    serviceId,
    serviceName,
    onWriteReview,
    showWriteButton = false
}) => {
    const { t } = useTranslation();
    const [reviews, setReviews] = useState<LabRating[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'MEDIA' | '5' | '4' | '3' | '2' | '1'>('ALL');
    const [lightboxMedia, setLightboxMedia] = useState<{ url: string; type: 'IMAGE' | 'VIDEO' } | null>(null);

    useEffect(() => {
        if (!labId) {
            setReviews([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const unsub = subscribeServiceRatings(labId, serviceId || '', (loaded) => {
            setReviews(loaded);
            setLoading(false);
        });

        return () => unsub();
    }, [labId, serviceId]);

    // Statistics Calculation
    const totalCount = reviews.length;
    const averageScore = useMemo(() => {
        if (totalCount === 0) return 0;
        const sum = reviews.reduce((acc, r) => acc + (Number(r.score) || 5), 0);
        return (sum / totalCount);
    }, [reviews, totalCount]);

    const countWithMedia = useMemo(() => {
        return reviews.filter(r => (r.imageUrls?.length || 0) > 0 || (r.videoUrls?.length || 0) > 0).length;
    }, [reviews]);

    const starCounts = useMemo(() => {
        const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviews.forEach(r => {
            const sc = Math.min(5, Math.max(1, Math.round(r.score || 5))) as 1|2|3|4|5;
            counts[sc] = (counts[sc] || 0) + 1;
        });
        return counts;
    }, [reviews]);

    // Media Gallery list (all photos & videos across reviews)
    const allMediaItems = useMemo(() => {
        const items: { url: string; type: 'IMAGE' | 'VIDEO'; reviewId: string; dentistName: string }[] = [];
        reviews.forEach(r => {
            (r.imageUrls || []).forEach(url => items.push({ url, type: 'IMAGE', reviewId: r.id, dentistName: r.dentistName }));
            (r.videoUrls || []).forEach(url => items.push({ url, type: 'VIDEO', reviewId: r.id, dentistName: r.dentistName }));
        });
        return items;
    }, [reviews]);

    // Filtered reviews
    const filteredReviews = useMemo(() => {
        return reviews.filter(r => {
            if (selectedFilter === 'MEDIA') {
                return (r.imageUrls?.length || 0) > 0 || (r.videoUrls?.length || 0) > 0;
            }
            if (['5', '4', '3', '2', '1'].includes(selectedFilter)) {
                return Math.round(r.score) === Number(selectedFilter);
            }
            return true;
        });
    }, [reviews, selectedFilter]);

    if (loading) {
        return (
            <div className="py-16 text-center">
                <Loader2 className="animate-spin mx-auto text-blue-600 mb-3" size={32} />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Carregando avaliações...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header: Score Summary + Star Distribution (Shopee / Shein style) */}
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

                {/* Star Filter Chips & Distribution */}
                <div className="flex-1 w-full space-y-3">
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setSelectedFilter('ALL')}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all border cursor-pointer ${
                                selectedFilter === 'ALL'
                                    ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20'
                                    : 'bg-white dark:bg-[#131B2A] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-amber-400'
                            }`}
                        >
                            Todas ({totalCount})
                        </button>

                        <button
                            type="button"
                            onClick={() => setSelectedFilter('MEDIA')}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all border flex items-center gap-1.5 cursor-pointer ${
                                selectedFilter === 'MEDIA'
                                    ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20'
                                    : 'bg-white dark:bg-[#131B2A] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-amber-400'
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

                    {showWriteButton && onWriteReview && (
                        <div className="pt-2">
                            <button
                                onClick={onWriteReview}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                                <Sparkles size={14} /> Avaliar Este Serviço
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Media Gallery Strip (Shopee / Shein visual strip) */}
            {allMediaItems.length > 0 && selectedFilter !== '1' && selectedFilter !== '2' && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
                            <Camera size={14} className="text-blue-500" /> Fotos & Vídeos dos Compradores ({allMediaItems.length})
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
                        {selectedFilter === 'ALL' ? 'Nenhuma avaliação registrada ainda' : 'Nenhuma avaliação encontrada com este filtro'}
                    </h4>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
                        As avaliações com notas, comentários e fotos/vídeos aparecem aqui assim que os casos são entregues aos dentistas.
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
                                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 bg-slate-50 dark:bg-[#0B0F17] px-2.5 py-1 rounded-full border border-slate-200/60 dark:border-slate-800 hidden sm:inline-block">
                                            {review.serviceName}
                                        </span>
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

            {/* Lightbox Modal for Photos & Videos */}
            {lightboxMedia && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 animate-in fade-in">
                    <div className="relative max-w-3xl max-h-[85vh] w-full flex flex-col items-center justify-center">
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
                                alt="Foto ampliada da avaliação" 
                                className="max-h-[80vh] w-auto max-w-full object-contain rounded-2xl shadow-2xl"
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
