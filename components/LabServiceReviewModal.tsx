import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { 
    Star, X, Camera, Video, Upload, Trash2, CheckCircle2, 
    Loader2, Sparkles, ShieldCheck, ThumbsUp, AlertCircle, Eye, Play
} from 'lucide-react';
import { Job, LabRating, UserRole } from '../types';
import { useApp } from '../context/AppContext';
import { apiAddLabRating, uploadReviewMedia } from '../services/firebaseService';

interface LabServiceReviewModalProps {
    isOpen?: boolean;
    onClose: () => void;
    job: Job;
    labId?: string;
    labName?: string;
    serviceId?: string;
    serviceName?: string;
    onSuccess?: () => void;
}

const REVIEW_TAG_OPTIONS = [
    'Adaptação perfeita',
    'Excelente acabamento',
    'Cor e estética fiéis',
    'Entrega no prazo',
    'Entrega antecipada',
    'Ótima comunicação',
    'Embalagem muito segura',
    'Excelente custo-benefício',
    'Recomendo muito'
];

const STAR_LABELS: Record<number, string> = {
    1: 'Ruim • Teve muitos problemas',
    2: 'Regular • Poderia ser melhor',
    3: 'Bom • Atendeu ao básico',
    4: 'Muito Bom • Trabalho de qualidade',
    5: 'Excelente! • Qualidade e acabamento perfeitos'
};

export const LabServiceReviewModal: React.FC<LabServiceReviewModalProps> = ({
    isOpen = true,
    onClose,
    job,
    labId,
    labName,
    serviceId,
    serviceName,
    onSuccess
}) => {
    const { t } = useTranslation();
    const { currentUser, currentOrg, activeOrganization } = useApp();

    const [score, setScore] = useState<number>(5);
    const [hoverScore, setHoverScore] = useState<number>(0);
    const [comment, setComment] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>(['Adaptação perfeita', 'Excelente acabamento']);
    const [isAnonymous, setIsAnonymous] = useState(false);
    
    // Media files
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [uploadedVideos, setUploadedVideos] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [previewMediaUrl, setPreviewMediaUrl] = useState<{ url: string; type: 'IMAGE' | 'VIDEO' } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    if (isOpen === false) return null;

    const targetLabId = labId || job.labId || (job as any).targetOrganizationId || activeOrganization?.id || '';
    const targetLabName = labName || (job as any).targetOrganizationName || (activeOrganization?.name) || 'Laboratório';
    const primaryItem = job.items?.[0];
    const targetServiceName = serviceName || primaryItem?.name || job.patientName || 'Serviço Protetizado';
    const targetServiceId = serviceId || primaryItem?.jobTypeId || primaryItem?.id || '';

    const toggleTag = (tag: string) => {
        setSelectedTags(prev => 
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setIsUploading(true);
        setUploadError('');

        try {
            for (const file of files) {
                if (file.size > 50 * 1024 * 1024) {
                    setUploadError('Arquivo muito grande. O limite é de 50MB por foto ou vídeo.');
                    continue;
                }
                const result = await uploadReviewMedia(file);
                if (result.type === 'VIDEO') {
                    setUploadedVideos(prev => [...prev, result.url]);
                } else {
                    setUploadedImages(prev => [...prev, result.url]);
                }
            }
        } catch (err: any) {
            console.error('Erro ao enviar mídia de avaliação:', err);
            setUploadError('Erro ao fazer upload da mídia. Tente novamente.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const removeImage = (index: number) => {
        setUploadedImages(prev => prev.filter((_, i) => i !== index));
    };

    const removeVideo = (index: number) => {
        setUploadedVideos(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmitReview = async () => {
        if (!targetLabId) {
            setUploadError('ID do laboratório não identificado.');
            return;
        }

        setIsSubmitting(true);
        setUploadError('');

        try {
            const reviewerName = isAnonymous 
                ? 'Dentista Verificado'
                : (currentUser?.name || currentOrg?.name || 'Dentista');

            const newRating: LabRating = {
                id: `rating_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                labId: targetLabId,
                dentistId: currentUser?.id || currentOrg?.id || 'anonymous_dentist',
                dentistName: reviewerName,
                jobId: job.id,
                serviceId: targetServiceId,
                serviceName: targetServiceName,
                score: score,
                comment: comment.trim(),
                imageUrls: uploadedImages,
                videoUrls: uploadedVideos,
                tags: selectedTags,
                verifiedPurchase: true,
                isAnonymous: isAnonymous,
                patientName: job.patientName,
                createdAt: new Date()
            };

            await apiAddLabRating(newRating);

            if (onSuccess) {
                onSuccess();
            }
            onClose();
        } catch (err: any) {
            console.error('Erro ao salvar avaliação:', err);
            setUploadError(err.message || 'Erro ao publicar avaliação.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const currentScore = hoverScore || score;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-300">
            <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 15 }}
                className="bg-white dark:bg-[#131B2A] rounded-3xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 dark:border-slate-800"
            >
                {/* Header */}
                <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/70 dark:bg-[#0B0F17] shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                            <Sparkles size={20} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg truncate">
                                Avaliar Trabalho Recebido
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {targetLabName} • OS #{job.osNumber || job.id.substring(0, 8)}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer shrink-0"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-white dark:bg-[#131B2A]">
                    {/* Verified Delivery Badge */}
                    <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-3 sm:p-4 flex items-center gap-3">
                        <ShieldCheck className="text-emerald-600 dark:text-emerald-400 shrink-0" size={24} />
                        <div className="min-w-0 text-xs text-emerald-800 dark:text-emerald-300">
                            <strong className="font-black block text-[13px]">{targetServiceName}</strong>
                            <span>{t('store.confirmedDeliveredBadge', 'Entrega do caso confirmada. Sua avaliação ajuda o laboratório e outros dentistas!')}</span>
                        </div>
                    </div>

                    {/* Star Rating Section */}
                    <div className="text-center space-y-2 py-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-400 block">
                            Qualidade Geral do Serviço
                        </label>
                        <div className="flex items-center justify-center gap-2 sm:gap-3 py-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setScore(star)}
                                    onMouseEnter={() => setHoverScore(star)}
                                    onMouseLeave={() => setHoverScore(0)}
                                    className="p-1 hover:scale-125 active:scale-95 transition-all duration-150 cursor-pointer focus:outline-none"
                                >
                                    <Star 
                                        size={36} 
                                        className={`${star <= currentScore ? 'text-amber-400 fill-amber-400 filter drop-shadow-sm' : 'text-slate-200 dark:text-slate-700'} transition-colors`}
                                    />
                                </button>
                            ))}
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400 animate-in fade-in">
                            {STAR_LABELS[currentScore] || ''}
                        </p>
                    </div>

                    {/* Quick Tags (Shopee / Shein style) */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                            <ThumbsUp size={14} className="text-blue-500" />
                            Destaques do Trabalho
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            {REVIEW_TAG_OPTIONS.map(tag => {
                                const isSelected = selectedTags.includes(tag);
                                return (
                                    <button
                                        key={tag}
                                        type="button"
                                        onClick={() => toggleTag(tag)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                                            isSelected 
                                                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700 shadow-xs' 
                                                : 'bg-slate-50 dark:bg-[#0B0F17] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                                        }`}
                                    >
                                        {isSelected && '✓ '} {tag}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Detailed Review Comment */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Comentário da Avaliação
                            </label>
                            <span className="text-[10px] text-slate-400 font-mono">
                                {comment.length}/500
                            </span>
                        </div>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value.slice(0, 500))}
                            placeholder="Descreva sua experiência: como ficou a adaptação em boca, a anatomia, cor, prazo de entrega e atendimento do laboratório..."
                            className="w-full h-24 p-3.5 bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none resize-none font-medium leading-relaxed"
                        />
                    </div>

                    {/* Media Upload Section: Photos & Videos (Shopee/Shein style) */}
                    <div className="space-y-2.5">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                <Camera size={14} className="text-indigo-500" />
                                Fotos e Vídeos do Caso (Opcional)
                            </label>
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-wider">
                                {uploadedImages.length + uploadedVideos.length} anexados
                            </span>
                        </div>

                        <input 
                            ref={fileInputRef}
                            type="file" 
                            accept="image/*,video/*" 
                            multiple 
                            className="hidden" 
                            onChange={handleFileSelect} 
                        />

                        {/* Previews & Add buttons grid */}
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                            {/* Upload Button */}
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="h-24 sm:h-28 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50/60 dark:bg-[#0B0F17] flex flex-col items-center justify-center text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all cursor-pointer group disabled:opacity-50"
                            >
                                {isUploading ? (
                                    <Loader2 className="animate-spin text-blue-600" size={24} />
                                ) : (
                                    <>
                                        <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 shadow-xs flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                                            <Upload size={16} />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-wider text-center px-1">
                                            Adicionar Foto/Vídeo
                                        </span>
                                    </>
                                )}
                            </button>

                            {/* Image Previews */}
                            {uploadedImages.map((url, idx) => (
                                <div 
                                    key={`img_${idx}`} 
                                    className="h-24 sm:h-28 rounded-2xl bg-slate-100 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 overflow-hidden relative group shadow-xs"
                                >
                                    <img src={url} alt={`Foto ${idx+1}`} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                                        <button 
                                            type="button" 
                                            onClick={() => setPreviewMediaUrl({ url, type: 'IMAGE' })}
                                            className="p-1.5 bg-white/90 text-slate-800 rounded-full hover:scale-110 transition-transform cursor-pointer"
                                            title="Visualizar"
                                        >
                                            <Eye size={13} />
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => removeImage(idx)}
                                            className="p-1.5 bg-red-600 text-white rounded-full hover:scale-110 transition-transform cursor-pointer"
                                            title="Remover"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                    <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">
                                        Foto
                                    </span>
                                </div>
                            ))}

                            {/* Video Previews */}
                            {uploadedVideos.map((url, idx) => (
                                <div 
                                    key={`vid_${idx}`} 
                                    className="h-24 sm:h-28 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden relative group shadow-xs flex items-center justify-center"
                                >
                                    <video src={url} className="w-full h-full object-cover opacity-70" />
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg">
                                            <Play size={14} className="ml-0.5" />
                                        </div>
                                    </div>
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                                        <button 
                                            type="button" 
                                            onClick={() => setPreviewMediaUrl({ url, type: 'VIDEO' })}
                                            className="p-1.5 bg-white/90 text-slate-800 rounded-full hover:scale-110 transition-transform cursor-pointer"
                                            title="Assistir Vídeo"
                                        >
                                            <Play size={13} />
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => removeVideo(idx)}
                                            className="p-1.5 bg-red-600 text-white rounded-full hover:scale-110 transition-transform cursor-pointer"
                                            title="Remover"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                    <span className="absolute bottom-1 right-1 bg-blue-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                        <Video size={9} /> Vídeo
                                    </span>
                                </div>
                            ))}
                        </div>

                        {uploadError && (
                            <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs rounded-xl flex items-center gap-2">
                                <AlertCircle size={14} className="shrink-0" />
                                <span>{uploadError}</span>
                            </div>
                        )}
                    </div>

                    {/* Anonymous toggle */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div>
                            <span className="text-xs font-bold text-slate-800 dark:text-white block">
                                Ocultar meu nome
                            </span>
                            <span className="text-[11px] text-slate-400">
                                Exibirá como "Dentista Verificado" na loja online.
                            </span>
                        </div>
                        <input
                            type="checkbox"
                            checked={isAnonymous}
                            onChange={(e) => setIsAnonymous(e.target.checked)}
                            className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-5 bg-slate-50 dark:bg-[#0B0F17] border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-5 py-3 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmitReview}
                        disabled={isSubmitting || isUploading}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                <span>Publicando...</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle2 size={16} />
                                <span>Publicar Avaliação</span>
                            </>
                        )}
                    </button>
                </div>
            </motion.div>

            {/* Media Lightbox / Video Player Modal */}
            <AnimatePresence>
                {previewMediaUrl && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 animate-in fade-in">
                        <div className="relative max-w-3xl max-h-[85vh] w-full flex flex-col items-center justify-center">
                            <button
                                onClick={() => setPreviewMediaUrl(null)}
                                className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white bg-white/10 rounded-full cursor-pointer"
                            >
                                <X size={24} />
                            </button>
                            {previewMediaUrl.type === 'VIDEO' ? (
                                <video 
                                    src={previewMediaUrl.url} 
                                    controls 
                                    autoPlay 
                                    className="max-h-[80vh] w-auto max-w-full rounded-2xl shadow-2xl"
                                />
                            ) : (
                                <img 
                                    src={previewMediaUrl.url} 
                                    alt="Prévia da foto" 
                                    className="max-h-[80vh] w-auto max-w-full object-contain rounded-2xl shadow-2xl"
                                />
                            )}
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
