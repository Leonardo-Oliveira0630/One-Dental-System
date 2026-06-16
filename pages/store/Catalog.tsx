
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
    Plus, Search, ShoppingBag, BadgePercent, Package, X, Building, Tag, 
    ChevronLeft, ChevronRight, Star, ImageIcon, MessageSquare, 
    LayoutGrid, List, Heart, ExternalLink, Info, Loader2, ChevronDown, Handshake, Shield, Lock, CheckCircle
} from 'lucide-react';
import { JobType, VariationGroup, CartItem, LabRating } from '../../types';
import { useNavigate, useParams } from 'react-router-dom';
import { FeatureLocked } from '../../components/FeatureLocked';
import { motion, AnimatePresence } from 'motion/react';
import * as api from '../../services/firebaseService';

// --- Components ---

const BannerCarousel = ({ images }: { images: string[] }) => {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (images.length <= 1) return;
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % images.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [images]);

    if (!images || images.length === 0) {
        return (
            <div className="w-full aspect-[21/9] md:aspect-[25/7] bg-gradient-to-r from-[#0F4C81] to-[#00B8D9] rounded-card p-8 flex items-center justify-between text-white overflow-hidden relative shadow-premium">
                <div className="z-10 animate-in slide-in-from-left duration-700">
                    <h1 className="text-3xl md:text-5xl font-black mb-4 tracking-tighter col-span-1 border-none outline-none">Catálogo Digital</h1>
                    <p className="text-slate-100 text-lg font-medium max-w-md opacity-90">Qualidade e precisão para seus casos clínicos.</p>
                </div>
                <ShoppingBag size={180} className="absolute -right-10 -bottom-10 text-white/10 rotate-12 pointer-events-none" />
            </div>
        );
    }

    return (
        <div className="relative w-full aspect-[21/9] md:aspect-[25/7] rounded-card overflow-hidden shadow-premium group">
            <AnimatePresence mode="wait">
                <motion.img
                    key={index}
                    src={images[index]}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="absolute inset-0 w-full h-full object-cover"
                />
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
            
            <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-12 text-white">
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                   <span className="bg-[#00B8D9] text-[#1E293B] text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest mb-4 inline-block">Destaque</span>
                   <h2 className="text-3xl md:text-5xl font-black tracking-tighter drop-shadow-lg">Excelência em Próteses</h2>
                </motion.div>
            </div>

            {images.length > 1 && (
                <>
                    <button onClick={() => setIndex((prev) => (prev - 1 + images.length) % images.length)} 
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/40">
                        <ChevronLeft size={24} />
                    </button>
                    <button onClick={() => setIndex((prev) => (prev + 1) % images.length)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/40">
                        <ChevronRight size={24} />
                    </button>
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                        {images.map((_, i) => (
                            <button key={i} onClick={() => setIndex(i)} className={`w-2 h-2 rounded-full transition-all ${i === index ? 'bg-white w-6' : 'bg-white/40'}`} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

const PortfolioSection = ({ portfolio }: { portfolio: any[] }) => {
    if (!portfolio || portfolio.length === 0) {
        return (
            <div className="py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <ImageIcon size={48} className="mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-bold text-slate-600">Nenhum trabalho no portfólio ainda</h3>
                <p className="text-slate-400">Em breve mostraremos fotos de casos reais aqui.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in zoom-in duration-500">
            {portfolio.map((item, i) => (
                <motion.div 
                    key={item.id} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="group bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-2xl transition-all"
                >
                    <div className="aspect-square overflow-hidden relative">
                        <img src={item.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                             <ExternalLink className="text-white" size={32} />
                        </div>
                    </div>
                    <div className="p-6">
                        <h4 className="font-black text-slate-800 text-lg mb-2">{item.title}</h4>
                        <p className="text-slate-500 text-sm leading-relaxed">{item.description}</p>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

const ReviewsSection = ({ labId }: { labId: string }) => {
    const [reviews, setReviews] = useState<LabRating[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = api.subscribeLabRatings(labId, (r) => {
            setReviews(r);
            setLoading(false);
        });
        return unsub;
    }, [labId]);

    if (loading) return <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600" /></div>;

    if (reviews.length === 0) {
        return (
            <div className="py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <Star size={48} className="mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-bold text-slate-600">Sem avaliações recentes</h3>
                <p className="text-slate-400">Seja o primeiro a avaliar este laboratório após seu pedido!</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {reviews.map((row) => (
                <div key={row.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex gap-6">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center shrink-0 text-indigo-600 font-bold">
                        {row.dentistName.charAt(0)}
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h4 className="font-bold text-slate-800">{row.dentistName}</h4>
                                <div className="flex text-amber-400 mt-0.5">
                                    {[...Array(5)].map((_, i) => <Star key={i} size={14} fill={i < row.score ? 'currentColor' : 'none'} />)}
                                </div>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recente</span>
                        </div>
                        <p className="text-slate-600 text-sm italic">"{row.comment}"</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

// Variation Configuration Modal (Component with Partner Checking)
const VariationConfigModal = ({ product, selectedLab, onClose }: { product: JobType; selectedLab: import('../../types').Organization; onClose: () => void; }) => {
    const { addToCart, currentUser, userConnections, addConnectionByCode } = useApp();
    const [quantity, setQuantity] = useState(1);
    const [selectedVariations, setSelectedVariations] = useState<Record<string, string | string[]>>({});
    const [variationTextValues, setVariationTextValues] = useState<Record<string, string>>({}); 

    // Soft-partnership checkout gate state
    const [showPartnerModal, setShowPartnerModal] = useState(false);
    const [isLinking, setIsLinking] = useState(false);
    const [linkError, setLinkError] = useState('');

    // Logic to calculate final price for a product based on user discounts
    const calculateFinalUnitPrice = (type: JobType, selectedIds: string[]) => {
        if (!currentUser) {
            let total = type.basePrice;
            selectedIds.forEach(id => {
                type.variationGroups.forEach(g => {
                    const opt = g.options.find(o => o.id === id);
                    if (opt) total += opt.priceModifier;
                });
            });
            return total;
        }
        
        let discountableTotal = type.basePrice;
        let exemptTotal = 0;

        selectedIds.forEach(id => {
            type.variationGroups.forEach(g => {
                const opt = g.options.find(o => o.id === id);
                if (opt) {
                    if (opt.isDiscountExempt) exemptTotal += opt.priceModifier;
                    else discountableTotal += opt.priceModifier;
                }
            });
        });

        let discountRate = 0; 
        const custom = currentUser.customPrices?.find(p => p.jobTypeId === type.id);
        if (custom) {
            if (custom.discountPercent !== undefined) discountRate = custom.discountPercent / 100;
            else if (custom.price !== undefined) {
                discountableTotal = custom.price;
                discountRate = 0; 
            }
        } else if (currentUser.globalDiscountPercent) {
            discountRate = currentUser.globalDiscountPercent / 100;
        }

        const discountedSum = discountableTotal * (1 - discountRate);
        return discountedSum + exemptTotal;
    };

    const unitPrice = useMemo(() => {
        const allSelectedOptionIds = Object.values(selectedVariations).flat() as string[];
        return calculateFinalUnitPrice(product, allSelectedOptionIds);
    }, [selectedVariations, product, currentUser]);

    const finalPrice = unitPrice * quantity;

    const disabledOptions = useMemo(() => {
        const disabled = new Set<string>();
        const allSelectedOptionIds = Object.values(selectedVariations).flat() as string[];
        allSelectedOptionIds.forEach(selectedId => {
            product.variationGroups.forEach(group => {
                const option = group.options.find(opt => opt.id === selectedId);
                if (option?.disablesOptions) {
                    option.disablesOptions.forEach(idToDisable => disabled.add(idToDisable));
                }
            });
        });
        return disabled;
    }, [selectedVariations, product]);

    useEffect(() => {
        if (disabledOptions.size === 0) return;
        const newSelections = JSON.parse(JSON.stringify(selectedVariations));
        let changed = false;
        for (const groupId in newSelections) {
            if (Array.isArray(newSelections[groupId])) {
                const valid = newSelections[groupId].filter((id: string) => !disabledOptions.has(id));
                if (valid.length !== newSelections[groupId].length) {
                    newSelections[groupId] = valid;
                    changed = true;
                }
            } else if (disabledOptions.has(newSelections[groupId])) {
                delete newSelections[groupId];
                changed = true;
            }
        }
        if (changed) setSelectedVariations(newSelections);
    }, [disabledOptions, selectedVariations]);


    const handleVariationChange = (group: VariationGroup, optionId: string) => {
        setSelectedVariations(prev => {
            const newSelections = { ...prev };
            const current = newSelections[group.id];
            if (group.selectionType === 'SINGLE') {
                newSelections[group.id] = optionId;
            } else {
                const arr = Array.isArray(current) ? [...current] : [];
                const idx = arr.indexOf(optionId);
                if (idx > -1) arr.splice(idx, 1);
                else arr.push(optionId);
                newSelections[group.id] = arr;
            }
            return newSelections;
        });
    };

    const handleTextVariationChange = (group: VariationGroup, optionId: string, value: string) => {
        setVariationTextValues(prev => ({ ...prev, [optionId]: value }));
        setSelectedVariations(prev => {
            const newSelections = { ...prev };
            const current = (newSelections[group.id] as string[]) || [];
            if (value.trim().length > 0) {
                if (!current.includes(optionId)) newSelections[group.id] = [...current, optionId];
            } else {
                newSelections[group.id] = current.filter(id => id !== optionId);
            }
            return newSelections;
        });
    };

    const handleAddToCart = () => {
        // Guard check: is the dentist partnered with the lab?
        const isConnected = userConnections.some(c => c.organizationId === selectedLab.id);
        if (!isConnected) {
            setShowPartnerModal(true);
            return;
        }

        const newItem: CartItem = {
            cartItemId: `cart_${Date.now()}`,
            jobType: product,
            quantity,
            unitPrice,
            finalPrice,
            selectedVariationIds: Object.values(selectedVariations).flat() as string[],
            variationValues: variationTextValues 
        };
        addToCart(newItem);
        onClose();
    };

    const handleLinkAndAddToCart = async () => {
        setIsLinking(true);
        setLinkError('');
        try {
            // Establish the partnership connection automatically
            await addConnectionByCode(selectedLab.id);
            
            // Add item to cart and dismiss
            const newItem: CartItem = {
                cartItemId: `cart_${Date.now()}`,
                jobType: product,
                quantity,
                unitPrice,
                finalPrice,
                selectedVariationIds: Object.values(selectedVariations).flat() as string[],
                variationValues: variationTextValues 
            };
            addToCart(newItem);
            setShowPartnerModal(false);
            onClose();
        } catch (err: any) {
            setLinkError(err.message || 'Ocorreu um erro ao firmar parceria automática. Tente novamente mais tarde.');
        } finally {
            setIsLinking(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden relative"
                id="variation-modal-box"
            >
                {/* PARTNERSHIP PROMPT OVERLAY */}
                {showPartnerModal && (
                    <div className="absolute inset-0 z-50 bg-slate-900/85 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
                        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-200">
                            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                                <Handshake size={32} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Firmar Parceria?</h3>
                                <p className="text-slate-500 font-medium text-sm mt-2 leading-relaxed">
                                    Para adicionar <span className="font-bold text-slate-800">{product.name}</span> ao carrinho e enviar pedidos, é preciso estar vinculado a <span className="font-bold text-slate-800">{selectedLab.name}</span>. Deseja realizar essa vinculação agora?
                                </p>
                            </div>

                            {linkError && (
                                <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100 font-medium text-left">
                                    {linkError}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <button 
                                    onClick={handleLinkAndAddToCart}
                                    disabled={isLinking}
                                    className="px-5 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-100 disabled:opacity-50"
                                >
                                    {isLinking ? <Loader2 className="animate-spin" size={16} /> : "Sim, Vincular"}
                                </button>
                                <button 
                                    onClick={() => setShowPartnerModal(false)}
                                    disabled={isLinking}
                                    className="px-5 py-4 bg-slate-100 text-slate-800 font-black rounded-2xl hover:bg-slate-200 transition-all text-xs uppercase tracking-wider"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                    <div>
                        <h3 className="font-black text-2xl text-slate-900 tracking-tighter">{product.name}</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Configuração Personalizada</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-full transition-colors"><X size={24} /></button>
                </div>
                <div className="p-6 md:p-8 overflow-y-auto space-y-6 bg-slate-50/30">
                    {product.variationGroups.map(group => (
                        <div key={group.id} className="p-5 rounded-3xl border bg-white border-slate-100 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Tag className="text-indigo-500" size={16} /> {group.name}
                                </h4>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                                    {group.selectionType === 'SINGLE' ? 'Tipo Único' : group.selectionType === 'MULTIPLE' ? 'Combo' : 'Mensagem'}
                                </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {group.options.map(option => {
                                    const isDisabled = disabledOptions.has(option.id);
                                    if (group.selectionType === 'TEXT') {
                                        return (
                                            <div key={option.id} className={`col-span-2 p-3 rounded-2xl bg-slate-50 border border-slate-200 ${isDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
                                                <div className="flex justify-between mb-2">
                                                    <label className="text-xs font-bold text-slate-600">{option.name}</label>
                                                    <span className="text-[10px] font-black text-indigo-600">{option.priceModifier > 0 ? `+ R$ ${option.priceModifier.toFixed(2)}` : ''}</span>
                                                </div>
                                                <input type="text" disabled={isDisabled} value={variationTextValues[option.id] || ''} onChange={e => handleTextVariationChange(group, option.id, e.target.value)}
                                                    className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium" placeholder="Ex: Cor A2..." />
                                            </div>
                                        )
                                    }

                                    const isSelected = group.selectionType === 'SINGLE'
                                        ? selectedVariations[group.id] === option.id
                                        : (selectedVariations[group.id] as string[])?.includes(option.id);
                                    return (
                                        <button key={option.id} onClick={() => !isDisabled && handleVariationChange(group, option.id)}
                                            className={`p-4 rounded-2xl flex flex-col items-start gap-1 text-sm transition-all border-2 ${isDisabled ? 'cursor-not-allowed opacity-40 grayscale' : 'cursor-pointer'} ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white border-slate-100 hover:border-indigo-300 text-slate-600'}`}>
                                            <div className="flex justify-between items-center w-full">
                                                <span className={`font-black uppercase text-[10px] tracking-widest ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>Opção</span>
                                                {option.priceModifier > 0 && <span className={`font-bold text-[10px] ${isSelected ? 'text-white' : 'text-indigo-600'}`}>+ R$ {option.priceModifier.toFixed(2)}</span>}
                                            </div>
                                            <span className="font-bold text-left leading-tight">{option.name}</span>
                                            {option.isDiscountExempt && <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded mt-1 ${isSelected ? 'bg-white/20 text-white' : 'bg-orange-50 text-orange-500'}`}>Fixo</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-8 bg-white border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-6 w-full md:w-auto">
                        <div className="flex items-center gap-3">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Qtd:</label>
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                                <button onClick={() => setQuantity(q => Math.max(1, q-1))} className="w-8 h-8 flex items-center justify-center font-bold text-slate-600 hover:text-indigo-600 hover:bg-white rounded-lg transition-all">-</button>
                                <input type="number" readOnly value={quantity} className="w-10 bg-transparent text-center font-black text-slate-800 pointer-events-none" />
                                <button onClick={() => setQuantity(q => q+1)} className="w-8 h-8 flex items-center justify-center font-bold text-slate-600 hover:text-indigo-600 hover:bg-white rounded-lg transition-all">+</button>
                            </div>
                        </div>
                        <div className="h-10 w-[1px] bg-slate-100 hidden md:block" />
                        <div>
                             <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block">Total estimado</span>
                             <p className="font-black text-2xl text-indigo-700 tracking-tighter">R$ {finalPrice.toFixed(2)}</p>
                        </div>
                    </div>
                    <button onClick={handleAddToCart}
                        className="w-full md:w-auto px-10 py-5 bg-indigo-600 text-white font-black rounded-[20px] hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95 text-lg">
                        Adicionar ao Carrinho
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

// --- Main Component ---

export const Catalog = () => {
    const { slug } = useParams<{ slug: string }>();
    const { allLaboratories, currentUser, activeOrganization, currentPlan, userConnections, addConnectionByCode } = useApp();
    const navigate = useNavigate();
    const [term, setTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [configuringProduct, setConfiguringProduct] = useState<JobType | null>(null);
    const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'PORTFOLIO' | 'REVIEWS'>('PRODUCTS');
    const [localJobTypes, setLocalJobTypes] = useState<JobType[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);

    // Dynamic Connection states
    const [connecting, setConnecting] = useState(false);
    const [connectionMsg, setConnectionMsg] = useState('');
    const [connectionErr, setConnectionErr] = useState('');

    const [fetchedLab, setFetchedLab] = useState<import('../../types').Organization | null>(null);
    const [isLoadingLab, setIsLoadingLab] = useState(!!slug);

    useEffect(() => {
        if (!slug) {
            setFetchedLab(null);
            setIsLoadingLab(false);
            return;
        }

        let isMounted = true;
        setIsLoadingLab(true);

        api.getOrganizationBySlug(slug)
            .then(lab => {
                if (isMounted) {
                    setFetchedLab(lab);
                    setIsLoadingLab(false);
                }
            })
            .catch(err => {
                console.error("Erro ao obter laboratório por slug:", err);
                if (isMounted) {
                    setIsLoadingLab(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [slug]);

    const selectedLab = useMemo(() => {
        if (slug) {
            return fetchedLab || allLaboratories.find(l => l.storeSlug === slug || l.id === slug) || null;
        }
        return activeOrganization;
    }, [slug, fetchedLab, allLaboratories, activeOrganization]);

    useEffect(() => {
        if (!selectedLab?.id) {
            setLocalJobTypes([]);
            setLoadingProducts(false);
            return;
        }
        setLoadingProducts(true);
        const unsub = api.subscribeJobTypes(selectedLab.id, (types) => {
            setLocalJobTypes(types);
            setLoadingProducts(false);
        });
        return unsub;
    }, [selectedLab?.id]);

    const isGuest = !currentUser;
    const isPriceVisible = !isGuest || (selectedLab?.storeVisibility !== 'PRIVATE');

    // Callback to link partnership directly in storefront
    const handleDirectLink = async () => {
        if (!selectedLab) return;
        setConnecting(true);
        setConnectionErr('');
        setConnectionMsg('');
        try {
            await addConnectionByCode(selectedLab.id);
            setConnectionMsg('Parceria vinculada com sucesso!');
            setTimeout(() => setConnectionMsg(''), 4000);
        } catch (e: any) {
            setConnectionErr(e.message || 'Erro ao firmar parceria com o laboratório.');
        } finally {
            setConnecting(false);
        }
    };

    if (isLoadingLab) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8">
                <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
                <p className="text-slate-500 font-bold text-sm">Carregando loja do laboratório...</p>
            </div>
        );
    }

    if (slug && !selectedLab) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8">
                <div className="bg-white p-10 rounded-[32px] shadow-sm border border-slate-100 max-w-md w-full flex flex-col items-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 text-slate-300">
                        <Building size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tighter">Laboratório não encontrado</h2>
                    <p className="text-slate-500 mb-8 font-medium">
                        O laboratório solicitado por essa URL não existe ou ainda não configurou seu link de compartilhamento.
                    </p>
                    <button onClick={() => navigate('/dentist/partnerships')}
                        className="px-10 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all w-full animate-pulse">
                        EXPLORAR LABORATÓRIOS
                    </button>
                </div>
            </div>
        );
    }

    if (!selectedLab) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8">
                <div className="bg-white p-10 rounded-[32px] shadow-sm border border-slate-100 max-w-md w-full flex flex-col items-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 text-slate-300">
                        <Building size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tighter">Ops! Laboratório ausente.</h2>
                    <p className="text-slate-500 mb-8 font-medium">
                        Parece que você ainda não selecionou qual laboratório deseja visitar hoje.
                    </p>
                    <button onClick={() => navigate('/dentist/partnerships')}
                        className="px-10 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all w-full">
                        EXPLORAR LABORATÓRIOS
                    </button>
                </div>
            </div>
        );
    }

    if (currentPlan && !currentPlan.features.hasStoreModule && !slug) {
        return (
            <FeatureLocked 
                title="Módulo de Loja Bloqueado" 
                message={`O laboratório ${selectedLab.name} não possui o módulo de Loja Virtual habilitado no plano atual.`} 
            />
        );
    }

    const storeSettings = selectedLab.storeSettings || {
        banners: [],
        layoutType: 'CARDS',
        portfolio: [],
        menuOptions: ['PRODUCTS', 'PORTFOLIO', 'REVIEWS']
    };

    const visibleProducts = localJobTypes.filter(t => t.isVisibleInStore !== false);
    const categories = Array.from(new Set(visibleProducts.map(t => t.category)));

    const products = visibleProducts.filter(t => {
        const termLower = term.toLowerCase();
        const matchesTerm = t.name.toLowerCase().includes(termLower) || t.category.toLowerCase().includes(termLower);
        const matchesCat = selectedCategory === 'ALL' || t.category === selectedCategory;
        return matchesTerm && matchesCat;
    });

    const getPrice = (type: JobType) => {
        if (!currentUser) return { price: type.basePrice, isCustom: false };
        const custom = currentUser.customPrices?.find(c => c.jobTypeId === type.id);
        if (custom) {
            if (custom.price !== undefined) return { price: custom.price, isCustom: true };
            if (custom.discountPercent !== undefined) return { price: type.basePrice * (1 - custom.discountPercent / 100), isCustom: true };
        }
        if (currentUser.globalDiscountPercent) return { price: type.basePrice * (1 - currentUser.globalDiscountPercent / 100), isCustom: true };
        return { price: type.basePrice, isCustom: false };
    };

    const handleConfigureProduct = (product: JobType) => {
        if (isGuest) {
            setShowAuthModal(true);
        } else {
            setConfiguringProduct(product);
        }
    };

    const isLinked = userConnections.some(c => c.organizationId === selectedLab.id);

    return (
        <div className="space-y-8 pb-20 animate-in fade-in duration-500">
            {configuringProduct && <VariationConfigModal product={configuringProduct} selectedLab={selectedLab} onClose={() => setConfiguringProduct(null)} />}
            
            {showAuthModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-8 rounded-[32px] max-w-md w-full shadow-2xl text-center space-y-6">
                        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                            <Shield size={32} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Fazer Pedido ou Customizar</h3>
                            <p className="text-slate-500 font-medium text-sm mt-2 leading-relaxed">
                                Para poder escolher variações, aplicar cupons e enviar trabalhos ao laboratório, você precisa estar cadastrado e logado.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button 
                                onClick={() => navigate('/login?mode=register')} 
                                className="px-5 py-3.5 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all text-xs"
                            >
                                Criar Conta
                            </button>
                            <button 
                                onClick={() => navigate('/login')} 
                                className="px-5 py-3.5 bg-slate-100 text-slate-800 font-bold rounded-2xl hover:bg-slate-200 transition-all text-xs"
                            >
                                Fazer Login
                            </button>
                        </div>
                        <button 
                            onClick={() => setShowAuthModal(false)}
                            className="text-xs text-slate-400 hover:text-slate-600 font-bold underline"
                        >
                            Voltar ao Catálogo
                        </button>
                    </motion.div>
                </div>
            )}

            {/* Back to Partnerships Link */}
            <div className="flex items-center justify-between" id="catalog-header-nav-row">
                <button 
                    onClick={() => navigate('/dentist/partnerships')}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 hover:text-slate-900 font-bold text-xs rounded-xl shadow-sm border border-slate-100 transition-all hover:shadow hover:-translate-x-0.5"
                >
                    <ChevronLeft size={16} /> VOLTAR PARA PARCERIAS
                </button>
            </div>

            {/* Marketplace Laboratory Showcase Header */}
            <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6" id="marketplace-profile-header">
                <div className="flex items-center gap-5">
                    <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-3xl flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                        {selectedLab.logoUrl ? (
                            <img src={selectedLab.logoUrl} alt={selectedLab.name} className="w-full h-full object-containScale" />
                        ) : (
                            <Building size={36} className="text-slate-400" />
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-tight">{selectedLab.name}</h1>
                            {isLinked ? (
                                <span className="text-[10px] bg-green-50 text-green-600 border border-green-200 font-black px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Parceiro Vinculado
                                </span>
                            ) : (
                                <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 font-black px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span> Sem Parceria Ativa
                                </span>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-4 mt-2 text-slate-500 text-xs flex-wrap font-bold">
                            <div className="flex items-center gap-1 text-yellow-500 font-black">
                                <Star fill="currentColor" size={14} className="fill-yellow-500" />
                                {selectedLab.ratingAverage ? selectedLab.ratingAverage.toFixed(1) : "S/N"}
                            </div>
                            <span>•</span>
                            <span className="font-semibold">{selectedLab.ratingCount || 0} Avaliações</span>
                            <span>•</span>
                            <span className="bg-slate-50 text-slate-600 px-2 py-0.5 rounded text-[10px] font-black font-mono">ID: {selectedLab.id}</span>
                        </div>
                    </div>
                </div>

                {!isLinked && (
                    <div className="w-full md:w-auto relative" id="linking-action-button-area">
                        {connectionMsg && (
                            <div className="absolute bottom-full mb-2 right-0 bg-green-50 border border-green-200 text-green-700 text-xs py-2 px-4 rounded-xl font-medium shadow flex items-center gap-1 w-max">
                                <CheckCircle size={14} /> {connectionMsg}
                            </div>
                        )}
                        {connectionErr && (
                            <div className="absolute bottom-full mb-2 right-0 bg-red-50 border border-red-200 text-red-700 text-xs py-2 px-4 rounded-xl font-medium shadow w-max">
                                {connectionErr}
                            </div>
                        )}
                        <button 
                            onClick={handleDirectLink}
                            disabled={connecting}
                            className="w-full md:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                        >
                            {connecting ? <Loader2 className="animate-spin" size={16} /> : <><Handshake size={16} /> FIRMAR PARCERIA REQUERIDA</>}
                        </button>
                    </div>
                )}
            </div>

            {/* 1. Header Banner */}
            <BannerCarousel images={storeSettings.banners || []} />

            {/* 2. Store Menu */}
            <div className="flex border-b border-slate-200">
                {(storeSettings.menuOptions || ['PRODUCTS', 'PORTFOLIO', 'REVIEWS']).map(opt => (
                    <button 
                        key={opt}
                        onClick={() => setActiveTab(opt as any)}
                        className={`px-8 py-5 text-sm font-black uppercase tracking-widest transition-all relative ${activeTab === opt ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        {opt === 'PRODUCTS' ? 'Catálogo' : opt === 'PORTFOLIO' ? 'Portfólio' : 'Avaliações'}
                        {activeTab === opt && (
                            <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* 3. Content Sections */}
            <AnimatePresence mode="wait">
                {activeTab === 'PRODUCTS' && (
                    <motion.div 
                        key="products"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-8"
                    >
                        {/* Filters */}
                        <div className="flex flex-col md:flex-row gap-6 items-center bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
                            <div className="relative flex-1 w-full flex flex-col gap-3">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
                                    <input 
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-lg"
                                        placeholder="Qual serviço você procura? Ex: Coroa, Coping..."
                                        value={term}
                                        onChange={(e) => setTerm(e.target.value)}
                                    />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {categories.slice(0, 8).map(cat => (
                                        <button 
                                            key={cat} 
                                            onClick={() => setSelectedCategory(selectedCategory === cat ? 'ALL' : cat)} 
                                            className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full transition-all border ${selectedCategory === cat ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-indigo-500'}`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="relative min-w-[200px] w-full md:w-auto self-start md:self-center">
                                <select 
                                    value={selectedCategory} 
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="w-full appearance-none bg-slate-50 border border-slate-100 text-slate-600 font-black text-sm uppercase tracking-widest px-6 py-4 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                                >
                                    <option value="ALL">Todas Categorias</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                                <ChevronDown size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Products List/Grid */}
                        {loadingProducts ? (
                            <div className="text-center py-20">
                                <Loader2 className="animate-spin text-indigo-600 mx-auto" size={36} />
                                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest block mt-3">Carregando catálogo...</span>
                            </div>
                        ) : products.length === 0 ? (
                            <div className="text-center py-20 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200">
                                <Package size={64} className="mx-auto text-slate-200 mb-4" />
                                <h3 className="text-2xl font-black text-slate-800 tracking-tighter">Nenhum resultado</h3>
                                <p className="text-slate-400 font-medium">Tente uma busca diferente ou selecione outra categoria.</p>
                            </div>
                        ) : (
                            <div className={storeSettings.layoutType === 'LIST' ? 'space-y-4' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8'}>
                                {products.map(product => {
                                    const { price, isCustom } = getPrice(product);
                                    if (storeSettings.layoutType === 'LIST') {
                                        return (
                                            <div key={product.id} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
                                                <div className="flex items-center gap-6">
                                                    <div className="w-20 h-20 bg-slate-50 rounded-2xl overflow-hidden shrink-0 border border-slate-100">
                                                        {product.imageUrl ? <img src={product.imageUrl} className="w-full h-full object-cover" /> : <Package size={32} className="m-auto mt-6 text-slate-300 pointer-events-none" />}
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-black uppercase text-indigo-500 tracking-widest">{product.category}</span>
                                                        <h3 className="font-bold text-slate-800 text-lg leading-tight">{product.name}</h3>
                                                        <div className="flex items-center gap-4 mt-1">
                                                             <span className="text-xs font-bold text-slate-400">A partir de</span>
                                                             {isPriceVisible ? (
                                                                 <>
                                                                    <span className={`font-black ${isCustom ? 'text-green-600' : 'text-indigo-600'}`}>R$ {price.toFixed(2)}</span>
                                                                    {isCustom && <span className="bg-green-50 text-green-600 text-[8px] font-black px-2 py-0.5 rounded tracking-widest">EXCLUSIVO</span>}
                                                                 </>
                                                             ) : (
                                                                 <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 border border-amber-100/50 rounded-lg">
                                                                    <Lock size={12} /> Faça login para ver valores
                                                                 </span>
                                                             )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleConfigureProduct(product)} className="px-6 py-3 bg-indigo-600 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">
                                                    CONFIGURAR
                                                </button>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div key={product.id} className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group flex flex-col">
                                            <div className="h-60 bg-slate-50 flex items-center justify-center relative overflow-hidden">
                                                {product.imageUrl ? (
                                                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                ) : (
                                                    <Package size={80} className="relative z-10 text-slate-200 group-hover:text-indigo-400 transition-colors duration-300" />
                                                )}
                                                {isCustom && (<div className="absolute top-4 right-4 bg-green-500 text-white text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1 shadow-xl z-20"><BadgePercent size={12} /> SPECIAL PRICE</div>)}
                                                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black text-slate-600 uppercase tracking-widest z-20 border border-white/50">{product.category}</div>
                                                <div className="absolute inset-0 bg-indigo-900/0 group-hover:bg-indigo-900/10 transition-colors duration-300 pointer-events-none" />
                                            </div>
                                            <div className="p-8 flex flex-col flex-1">
                                                <div className="mb-6 flex-1 text-center md:text-left">
                                                    <h3 className="font-black text-slate-900 text-xl tracking-tight leading-tight group-hover:text-indigo-600 transition-colors">{product.name}</h3>
                                                </div>
                                                <div className="pt-6 border-t border-slate-50">
                                                    <div className="flex justify-between items-end mb-6">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">{isCustom ? 'Sua Oferta' : 'Investimento'}</span>
                                                            <div className="flex items-baseline gap-2">
                                                                {isPriceVisible ? (
                                                                    <>
                                                                        <span className={`font-black text-3xl tracking-tighter ${isCustom ? 'text-green-600' : 'text-slate-900'}`}>R$ {price.toFixed(2)}</span>
                                                                        {isCustom && <span className="text-[10px] text-slate-300 line-through">R$ {product.basePrice.toFixed(2)}</span>}
                                                                    </>
                                                                ) : (
                                                                    <span className="flex items-center gap-1.5 text-xs font-black text-amber-600 bg-amber-50 px-3 py-1.5 border border-amber-100/50 rounded-xl leading-tight">
                                                                        <Lock size={14} /> Registrar para ver preço
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <button onClick={() => handleConfigureProduct(product)} className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:bg-indigo-600 transition-all active:scale-90 shadow-xl shadow-slate-200 group-hover:shadow-indigo-200">
                                                            <Plus size={24} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'PORTFOLIO' && (
                    <motion.div key="portfolio" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                        <PortfolioSection portfolio={storeSettings.portfolio || []} />
                    </motion.div>
                )}

                {activeTab === 'REVIEWS' && (
                    <motion.div key="reviews" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        <ReviewsSection labId={selectedLab.id} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
