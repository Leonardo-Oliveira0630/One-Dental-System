
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';
import { 
    Plus, Search, ShoppingBag, BadgePercent, Package, X, Building, Tag, Store, 
    ChevronLeft, ChevronRight, Star, ImageIcon, MessageSquare, 
    LayoutGrid, List, Heart, ExternalLink, Info, Loader2, ChevronDown, Handshake, Shield, Lock, CheckCircle, MapPin, ShoppingCart, Share2, Copy,
    ClipboardList, Ticket, Clock, Camera, Award, Sparkles
} from 'lucide-react';
import { JobType, VariationGroup, CartItem, LabRating, BannerConfig } from '../../types';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { FeatureLocked } from '../../components/FeatureLocked';
import { StoreTopMenu } from '../../components/StoreTopMenu';
import { Odontogram } from '../../components/Odontogram';
import { motion, AnimatePresence } from 'motion/react';
import * as api from '../../services/firebaseService';

import { Cart } from './Cart';
import { JobsList } from '../JobsList';
import { Partnerships } from '../dentist/Partnerships';
import { MyVouchersTab } from './MyVouchersTab';

// --- Components ---

const BannerCarousel = ({ images }: { images: BannerConfig[] }) => {
    const { t } = useTranslation();
    const [index, setIndex] = useState(0);
    const [direction, setDirection] = useState(1); // 1 for next/right, -1 for prev/left

    useEffect(() => {
        if (images.length <= 1) return;
        const timer = setInterval(() => {
            setDirection(1);
            setIndex((prev) => (prev + 1) % images.length);
        }, 8000); // 8000ms as requested (slower auto-slide)
        return () => clearInterval(timer);
    }, [images]);

    if (!images || images.length === 0) {
        return (
            <div className="w-full aspect-[21/9] md:aspect-[25/7] bg-gradient-to-r from-[#0F4C81] to-[#00B8D9] rounded-card p-4 sm:p-8 flex items-center justify-between text-white overflow-hidden relative shadow-premium">
                <div className="z-10 animate-in slide-in-from-left duration-700">
                    <h1 className="text-3xl md:text-5xl font-black mb-4 tracking-tighter col-span-1 border-none outline-none">{t('store.digitalCatalog', 'Catálogo Digital')}</h1>
                    <p className="text-slate-100 text-lg font-medium max-w-md opacity-90">{t('store.catalogBannerSubtitle', 'Qualidade e precisão para seus casos clínicos.')}</p>
                </div>
                <ShoppingBag size={180} className="absolute -right-10 -bottom-10 text-white/10 rotate-12 pointer-events-none" />
            </div>
        );
    }

    const currentBanner = images[index];
    const hasAnyText = currentBanner.title || currentBanner.subtitle || currentBanner.buttonText;

    // Transition variants for lateral slide
    const slideVariants = {
        enter: (dir: number) => ({
            x: dir > 0 ? '100%' : '-100%',
            opacity: 0
        }),
        center: {
            x: 0,
            opacity: 1
        },
        exit: (dir: number) => ({
            x: dir < 0 ? '100%' : '-100%',
            opacity: 0
        })
    };

    const handlePrev = () => {
        setDirection(-1);
        setIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    const handleNext = () => {
        setDirection(1);
        setIndex((prev) => (prev + 1) % images.length);
    };

    const handleDotClick = (i: number) => {
        setDirection(i > index ? 1 : -1);
        setIndex(i);
    };

    return (
        <div className="relative w-full aspect-[21/9] md:aspect-[25/7] rounded-card overflow-hidden shadow-premium group">
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
                <motion.img
                    key={index}
                    src={currentBanner.imageUrl}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                        x: { type: "spring", stiffness: 180, damping: 25 },
                        opacity: { duration: 0.5 }
                    }}
                    className="absolute inset-0 w-full h-full object-cover"
                />
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />
            
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 sm:p-6 md:p-12 text-white z-10">
                {hasAnyText && (
                    <motion.div 
                        key={index}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ 
                            x: { type: "spring", stiffness: 150, damping: 24 },
                            opacity: { duration: 0.5 },
                            delay: 0.1
                        }}
                        className="max-w-2xl flex flex-col items-center justify-center gap-2 text-center"
                    >
                        {currentBanner.title && (
                            <h2 className="text-2xl md:text-5xl font-black tracking-tighter drop-shadow-lg leading-tight uppercase">
                                {currentBanner.title}
                            </h2>
                        )}
                        {currentBanner.subtitle && (
                            <p className="text-sm md:text-lg text-slate-150 font-medium drop-shadow-md mt-1 line-clamp-2 max-w-xl">
                                {currentBanner.subtitle}
                            </p>
                        )}
                        {currentBanner.buttonText && (
                            <button 
                                onClick={() => {
                                    const link = currentBanner.buttonLink;
                                    if (link) {
                                        if (link.startsWith('http://') || link.startsWith('https://')) {
                                            window.open(link, '_blank');
                                        } else {
                                            window.location.href = link;
                                        }
                                    }
                                }}
                                className="mt-4 px-6 py-2.5 bg-[#00B8D9] hover:bg-[#00B8D9]/90 text-[#1E293B] font-black rounded-full transition-all text-xs uppercase tracking-wider w-fit shadow-lg hover:scale-105 active:scale-95"
                            >
                                {currentBanner.buttonText}
                            </button>
                        )}
                    </motion.div>
                )}
            </div>

            {images.length > 1 && (
                <>
                    <button onClick={handlePrev} 
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/40 z-20">
                        <ChevronLeft size={24} />
                    </button>
                    <button onClick={handleNext}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/40 z-20">
                        <ChevronRight size={24} />
                    </button>
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                        {images.map((_, i) => (
                            <button key={i} onClick={() => handleDotClick(i)} className={`w-2 h-2 rounded-full transition-all ${i === index ? 'bg-white w-6' : 'bg-white/40'}`} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

const PortfolioSection = ({ portfolio }: { portfolio: any[] }) => {
    const { t } = useTranslation();
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

    const handlePrev = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (selectedIdx === null) return;
        setSelectedIdx((prev) => (prev! === 0 ? portfolio.length - 1 : prev! - 1));
    };

    const handleNext = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (selectedIdx === null) return;
        setSelectedIdx((prev) => (prev! === portfolio.length - 1 ? 0 : prev! + 1));
    };

    const handleDragEnd = (event: any, info: any) => {
        const threshold = 50;
        if (info.offset.x < -threshold) {
            handleNext();
        } else if (info.offset.x > threshold) {
            handlePrev();
        }
    };

    useEffect(() => {
        if (selectedIdx === null) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'Escape') setSelectedIdx(null);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIdx]);

    if (!portfolio || portfolio.length === 0) {
        return (
            <div className="py-20 text-center bg-slate-50 dark:bg-[#131B2A] rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                <ImageIcon size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                <h3 className="text-xl font-bold text-slate-600 dark:text-slate-300">{t('store.noPortfolioYet', 'Nenhum trabalho no portfólio ainda')}</h3>
                <p className="text-slate-400 dark:text-slate-500">{t('store.portfolioSoon', 'Em breve mostraremos fotos de casos reais aqui.')}</p>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:p-8 animate-in fade-in zoom-in duration-500">
                {portfolio.map((item, i) => (
                    <motion.div 
                        key={item.id} 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        onClick={() => setSelectedIdx(i)}
                        className="group bg-white dark:bg-[#131B2A] rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-2xl transition-all cursor-pointer"
                    >
                        <div className="aspect-square overflow-hidden relative">
                            <img src={item.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                 <ExternalLink className="text-white animate-in zoom-in-50 duration-300" size={32} />
                            </div>
                        </div>
                        <div className="px-4 pb-4 sm:px-6 sm:pb-6">
                            <h4 className="font-black text-slate-800 dark:text-white text-lg mb-2">{item.title}</h4>
                            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{item.description}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Lightbox / Slideshow Modal */}
            <AnimatePresence>
                {selectedIdx !== null && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedIdx(null)}
                        className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 md:p-4 sm:p-8 select-none"
                    >
                        {/* Top action bar */}
                        <div className="absolute top-4 sm:p-6 left-6 right-6 flex items-center justify-between text-white z-10">
                            <span className="font-mono text-xs bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
                                {selectedIdx + 1} {t('store.of', 'de')} {portfolio.length}
                            </span>
                            <button 
                                onClick={() => setSelectedIdx(null)}
                                className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all active:scale-95 cursor-pointer"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Main viewer container */}
                        <div className="relative w-full max-w-4xl h-[70vh] flex items-center justify-center">
                            {/* Left Arrow (Desktop Only) */}
                            <button 
                                onClick={handlePrev}
                                className="absolute left-2 md:-left-20 z-20 p-4 bg-white/10 hover:bg-white/25 rounded-full text-white transition-all active:scale-90 hidden sm:flex items-center justify-center cursor-pointer border border-white/5"
                            >
                                <ChevronLeft size={28} />
                            </button>

                            {/* Drag image container */}
                            <motion.div
                                key={selectedIdx}
                                drag="x"
                                dragConstraints={{ left: 0, right: 0 }}
                                dragElastic={0.6}
                                onDragEnd={handleDragEnd}
                                initial={{ opacity: 0, scale: 0.95, x: 50 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.95, x: -50 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                onClick={(e) => e.stopPropagation()}
                                className="flex flex-col items-center justify-center max-w-full max-h-full cursor-grab active:cursor-grabbing text-center"
                            >
                                <img 
                                    src={portfolio[selectedIdx].imageUrl} 
                                    alt={portfolio[selectedIdx].title || "Item"} 
                                    className="max-h-[50vh] md:max-h-[60vh] object-contain rounded-2xl shadow-2xl select-none pointer-events-none border border-white/10"
                                />
                                {portfolio[selectedIdx].title && (
                                    <div className="mt-6 max-w-lg text-white">
                                        <h4 className="font-black text-xl md:text-2xl tracking-tight">{portfolio[selectedIdx].title}</h4>
                                        {portfolio[selectedIdx].description && (
                                            <p className="text-slate-300 text-sm mt-2 leading-relaxed">{portfolio[selectedIdx].description}</p>
                                        )}
                                    </div>
                                )}
                            </motion.div>

                            {/* Right Arrow (Desktop Only) */}
                            <button 
                                onClick={handleNext}
                                className="absolute right-2 md:-right-20 z-20 p-4 bg-white/10 hover:bg-white/25 rounded-full text-white transition-all active:scale-90 hidden sm:flex items-center justify-center cursor-pointer border border-white/5"
                            >
                                <ChevronRight size={28} />
                            </button>
                        </div>

                        {/* Swipe instructions (Mobile helper) */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center pointer-events-none">
                            <p className="text-xs text-slate-400 font-medium tracking-wide">
                                {t('store.swipeInstructions', 'Deslize para o lado ou utilize as setas do teclado para navegar')}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

import { ShopeeStyleReviewsView } from '../../components/ShopeeStyleReviewsView';

const ReviewsSection = ({ labId, availableServices }: { labId: string; availableServices?: { id: string; name: string; category?: string }[] }) => {
    return <ShopeeStyleReviewsView labId={labId} availableServices={availableServices} />;
};

// Variation Configuration Modal (Component with Partner Checking & Service Reviews Tab)
const VariationConfigModal = ({ product, selectedLab, localPriceTables, onClose, initialTab = 'CONFIG' }: { product: JobType; selectedLab: import('../../types').Organization; localPriceTables: any[]; onClose: () => void; initialTab?: 'CONFIG' | 'REVIEWS'; }) => {
    const { t } = useTranslation();
    const { addToCart, currentUser, currentOrg, userConnections, addConnectionByCode } = useApp();
    const [modalTab, setModalTab] = useState<'CONFIG' | 'REVIEWS'>(initialTab);
    const [quantity, setQuantity] = useState(1);
    const isOwnStore = selectedLab?.id === currentOrg?.id;
    const [selectedVariations, setSelectedVariations] = useState<Record<string, string | string[]>>({});
    const [variationTextValues, setVariationTextValues] = useState<Record<string, string>>({}); 
    const [selectedTeeth, setSelectedTeeth] = useState<string[]>([]);

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
        
        let basePrice = type.basePrice || 0;
        let discountRate = 0;
        
        if (currentUser.priceTableId) {
            const table = localPriceTables.find(t => t.id === currentUser.priceTableId);
            if (table && table.prices?.[type.id]?.basePrice !== undefined && table.prices[type.id].basePrice !== null && !isNaN(table.prices[type.id].basePrice)) {
                basePrice = Number(table.prices[type.id].basePrice);
            }
        }
        
        const custom = currentUser.customPrices?.find(p => p.jobTypeId === type.id);
        if (currentUser.isCustomPricing) {
            if (custom) {
                if (custom.fixedPrice !== undefined && custom.fixedPrice !== null && !isNaN(custom.fixedPrice) && Number(custom.fixedPrice) > 0) {
                    basePrice = Number(custom.fixedPrice);
                    discountRate = 0;
                } else if (custom.discountPercent !== undefined && custom.discountPercent !== null && !isNaN(custom.discountPercent)) {
                    discountRate = Number(custom.discountPercent) / 100;
                } else if (custom.price !== undefined && custom.price !== null && !isNaN(custom.price) && Number(custom.price) > 0) {
                    basePrice = Number(custom.price);
                    discountRate = 0;
                } else if (currentUser.globalDiscountPercent !== undefined && currentUser.globalDiscountPercent !== null && !isNaN(currentUser.globalDiscountPercent)) {
                    discountRate = Number(currentUser.globalDiscountPercent) / 100;
                }
            } else if (currentUser.globalDiscountPercent !== undefined && currentUser.globalDiscountPercent !== null && !isNaN(currentUser.globalDiscountPercent)) {
                discountRate = Number(currentUser.globalDiscountPercent) / 100;
            }
        } else if (currentUser.globalDiscountPercent !== undefined && currentUser.globalDiscountPercent !== null && !isNaN(currentUser.globalDiscountPercent)) {
             discountRate = Number(currentUser.globalDiscountPercent) / 100;
        }

        let discountableTotal = basePrice;
        let exemptTotal = 0;
        
        selectedIds.forEach(id => {
            type.variationGroups?.forEach(g => {
                const opt = g.options.find(o => o.id === id);
                if (opt) {
                    let modifier = opt.priceModifier || 0;
                    let isCustomFixedVariation = false;
                    
                    if (currentUser.priceTableId) {
                        const table = localPriceTables.find(t => t.id === currentUser.priceTableId);
                        if (table && table.prices?.[type.id]?.variations?.[opt.id] !== undefined && table.prices[type.id].variations[opt.id] !== null && !isNaN(table.prices[type.id].variations[opt.id])) {
                            modifier = Number(table.prices[type.id].variations[opt.id]);
                        }
                    }

                    if (currentUser.isCustomPricing) {
                        if (custom && custom.variations && custom.variations[opt.id] !== undefined && custom.variations[opt.id] !== null && !isNaN(custom.variations[opt.id])) {
                            modifier = Number(custom.variations[opt.id]);
                            isCustomFixedVariation = true;
                        }
                    }
                    
                    if (isCustomFixedVariation || opt.isDiscountExempt) {
                        exemptTotal += modifier;
                    } else {
                        discountableTotal += modifier;
                    }
                }
            });
        });

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
        if (isOwnStore) {
            alert(t('store.ownStoreAlert', 'Você não pode adicionar serviços da sua própria loja ao carrinho.'));
            return;
        }

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
            variationValues: variationTextValues,
            selectedTeeth: selectedTeeth.length > 0 ? selectedTeeth : undefined
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
                variationValues: variationTextValues,
                selectedTeeth: selectedTeeth.length > 0 ? selectedTeeth : undefined
            };
            addToCart(newItem);
            setShowPartnerModal(false);
            onClose();
        } catch (err: any) {
            setLinkError(err.message || t('store.partnerLinkedError', 'Erro ao firmar parceria com o laboratório.'));
        } finally {
            setIsLinking(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-300">
            <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white dark:bg-[#131B2A] rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden relative border border-slate-100 dark:border-slate-800"
                id="variation-modal-box"
            >
                {/* PARTNERSHIP PROMPT OVERLAY */}
                {showPartnerModal && (
                    <div className="absolute inset-0 z-50 bg-slate-900/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-[#131B2A] rounded-2xl sm:rounded-3xl p-5 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto">
                                <Handshake size={30} />
                            </div>
                            <div>
                                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">{t('store.linkPartnershipPromptTitle', 'Firmar Parceria?')}</h3>
                                <p className="text-slate-500 dark:text-slate-400 font-medium text-xs sm:text-sm mt-2 leading-relaxed">
                                    {t('store.linkPartnershipPromptDesc', 'Para adicionar {{product}} ao carrinho e enviar pedidos, é preciso estar vinculado a {{lab}}. Deseja realizar essa vinculação agora?', { product: product.name, lab: selectedLab.name })}
                                </p>
                            </div>

                            {linkError && (
                                <div className="p-3 bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 text-xs rounded-xl border border-red-100 dark:border-red-800 font-medium text-left">
                                    {linkError}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-2.5 pt-2">
                                <button 
                                    onClick={handleLinkAndAddToCart}
                                    disabled={isLinking}
                                    className="px-4 py-3 bg-blue-600 text-white font-black rounded-xl sm:rounded-2xl hover:bg-blue-700 transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-100 dark:shadow-none disabled:opacity-50 cursor-pointer"
                                >
                                    {isLinking ? <Loader2 className="animate-spin" size={16} /> : t('store.yesLink', 'Sim, Vincular')}
                                </button>
                                <button 
                                    onClick={() => setShowPartnerModal(false)}
                                    disabled={isLinking}
                                    className="px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-black rounded-xl sm:rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-xs uppercase tracking-wider cursor-pointer"
                                >
                                    {t('store.cancel', 'Cancelar')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-center px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="min-w-0 pr-3">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-black text-lg sm:text-2xl text-slate-900 dark:text-white tracking-tight truncate">{product.name}</h3>
                            <button
                                type="button"
                                onClick={() => setModalTab('REVIEWS')}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800/70 px-2.5 py-0.5 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors cursor-pointer"
                                title={t('store.viewServiceReputation', 'Ver reputação e avaliações deste serviço')}
                            >
                                <Star size={12} className="fill-amber-400 text-amber-400" />
                                <span className="font-black text-slate-900 dark:text-white">
                                    {product.ratingAverage ? product.ratingAverage.toFixed(1) : '5.0'}
                                </span>
                                <span className="text-slate-500 dark:text-slate-400 text-[10px]">
                                    ({product.ratingCount || 0} {product.ratingCount === 1 ? 'avaliação' : 'avaliações'})
                                </span>
                            </button>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                            <span className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">{t('store.customConfig', 'Configuração Personalizada')}</span>
                            {product.productionTimeDays !== undefined && product.productionTimeDays !== null && Number(product.productionTimeDays) > 0 && (
                                <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/80 px-2 py-0.5 rounded-full">
                                    <Clock size={12} className="text-blue-600 dark:text-blue-400" />
                                    {t('store.productionLeadTime', 'Prazo:')} {product.productionTimeDays} {product.productionTimeDays === 1 ? t('store.businessDay', 'dia útil') : t('store.businessDays', 'dias úteis')}
                                </span>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full transition-colors shrink-0"><X size={20} /></button>
                </div>

                {/* Sub-tabs for Service: Configuração vs Avaliações (Shopee/Shein style) */}
                <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B0F17] px-4 sm:px-6 shrink-0 gap-2">
                    <button
                        type="button"
                        onClick={() => setModalTab('CONFIG')}
                        className={`py-2.5 px-3.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                            modalTab === 'CONFIG'
                                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                    >
                        {t('store.customizeAndOrder', 'Personalizar & Pedir')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setModalTab('REVIEWS')}
                        className={`py-2.5 px-3.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                            modalTab === 'REVIEWS'
                                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                    >
                        <Star size={13} className="text-amber-400 fill-amber-400" />
                        {t('store.serviceReviewsTab', 'Avaliações do Serviço')}
                    </button>
                </div>

                {modalTab === 'REVIEWS' ? (
                    <div className="px-4 py-5 sm:px-6 sm:py-6 overflow-y-auto space-y-5 bg-white dark:bg-[#131B2A] flex-1">
                        <ShopeeStyleReviewsView 
                            labId={selectedLab.id} 
                            serviceId={product.id} 
                            serviceName={product.name} 
                        />
                    </div>
                ) : (
                    <div className="px-3 py-4 sm:px-6 sm:py-6 overflow-y-auto space-y-5 bg-slate-50/50 dark:bg-[#0B0F17] flex-1">
                        {product.variationGroups.map(group => (
                            <div key={group.id} className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl border bg-white dark:bg-[#131B2A] border-slate-100 dark:border-slate-800 shadow-xs">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-bold text-sm sm:text-base text-slate-800 dark:text-white flex items-center gap-2">
                                        <Tag className="text-blue-500 dark:text-blue-400" size={15} /> {group.name}
                                    </h4>
                                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
                                        {group.selectionType === 'SINGLE' ? t('store.singleType', 'Tipo Único') : group.selectionType === 'MULTIPLE' ? t('store.comboType', 'Combo') : t('store.textType', 'Mensagem')}
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                    {group.options.map(option => {
                                        const isDisabled = disabledOptions.has(option.id);
                                        if (group.selectionType === 'TEXT') {
                                            return (
                                                <div key={option.id} className={`col-span-1 sm:col-span-2 p-3 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-[#0E1626] border border-slate-200 dark:border-slate-700 ${isDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
                                                    <div className="flex justify-between mb-1.5">
                                                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">{option.name}</label>
                                                        <span className="text-[10px] font-black text-blue-600 dark:text-blue-400">{option.priceModifier > 0 ? `+ R$ ${option.priceModifier.toFixed(2)}` : ''}</span>
                                                    </div>
                                                    <input type="text" disabled={isDisabled} value={variationTextValues[option.id] || ''} onChange={e => handleTextVariationChange(group, option.id, e.target.value)}
                                                        className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-[#131B2A] text-slate-900 dark:text-white font-medium" placeholder="Ex: Cor A2..." />
                                                </div>
                                            )
                                        }

                                        const isSelected = group.selectionType === 'SINGLE'
                                            ? selectedVariations[group.id] === option.id
                                            : (selectedVariations[group.id] as string[])?.includes(option.id);
                                        return (
                                            <button key={option.id} onClick={() => !isDisabled && handleVariationChange(group, option.id)}
                                                className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl flex flex-col items-start gap-1 text-xs sm:text-sm transition-all border-2 ${isDisabled ? 'cursor-not-allowed opacity-40 grayscale' : 'cursor-pointer'} ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100 dark:shadow-none' : 'bg-white dark:bg-[#0E1626] border-slate-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-600 text-slate-600 dark:text-slate-300'}`}>
                                                <div className="flex justify-between items-center w-full">
                                                    <span className={`font-black uppercase text-[9px] sm:text-[10px] tracking-widest ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>{t('store.option', 'Opção')}</span>
                                                    {option.priceModifier > 0 && <span className={`font-bold text-[10px] ${isSelected ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`}>+ R$ {option.priceModifier.toFixed(2)}</span>}
                                                </div>
                                                <span className="font-bold text-left leading-tight">{option.name}</span>
                                                {option.isDiscountExempt && <span className={`text-[8px] sm:text-[9px] font-black uppercase px-1.5 py-0.5 rounded mt-0.5 ${isSelected ? 'bg-white/20 text-white' : 'bg-orange-50 dark:bg-orange-950/60 text-orange-500 dark:text-orange-400 border border-orange-200/50 dark:border-orange-800/50'}`}>{t('store.fixed', 'Fixo')}</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                        
                        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl border bg-white dark:bg-[#131B2A] border-slate-100 dark:border-slate-800 shadow-xs space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400 block">{t('store.relatedTeethOptional', 'Dentes Relacionados (Opcional)')}</label>
                            <div className="bg-slate-50 dark:bg-[#0E1626] border border-slate-100 dark:border-slate-800 rounded-2xl p-2 sm:p-4 flex justify-center items-center overflow-x-auto">
                                <Odontogram 
                                    selectedTeeth={selectedTeeth}
                                    onChange={(teeth) => {
                                        setSelectedTeeth(teeth);
                                        if (teeth.length > 0) {
                                            setQuantity(teeth.length);
                                        } else {
                                            setQuantity(1);
                                        }
                                    }}
                                    className="w-full max-w-[260px] sm:max-w-[320px] md:max-w-[400px] h-auto"
                                />
                            </div>
                            {selectedTeeth.length > 0 && (
                                <p className="text-xs text-blue-600 dark:text-blue-400 font-bold">
                                    {t('store.selectedTeethLabel', 'Dentes selecionados:')} {selectedTeeth.sort().join(', ')}
                                </p>
                            )}
                        </div>
                    </div>
                )}
                <div className="p-3 sm:p-5 bg-white dark:bg-[#131B2A] border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 shrink-0 shadow-lg">
                    <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-4 w-full sm:w-auto">
                        <div className="flex items-center gap-2">
                            <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400">{t('store.qty', 'Qtd:')}</label>
                            <div className={`flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl ${selectedTeeth.length > 0 ? 'opacity-50 pointer-events-none' : ''}`}>
                                <button onClick={() => setQuantity(q => Math.max(1, q-1))} className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all text-sm" disabled={selectedTeeth.length > 0}>-</button>
                                <input type="number" readOnly value={quantity} className="w-8 sm:w-10 bg-transparent text-center font-black text-slate-800 dark:text-white text-xs sm:text-sm pointer-events-none" />
                                <button onClick={() => setQuantity(q => q+1)} className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all text-sm" disabled={selectedTeeth.length > 0}>+</button>
                            </div>
                        </div>
                        <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 hidden sm:block" />
                        <div className="text-right sm:text-left">
                             <span className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-400 uppercase font-black tracking-widest block">{t('store.estimatedTotal', 'Total estimado')}</span>
                             <p className="font-black text-lg sm:text-2xl text-blue-600 dark:text-blue-400 tracking-tight">R$ {finalPrice.toFixed(2)}</p>
                        </div>
                    </div>
                    <button onClick={handleAddToCart}
                        disabled={isOwnStore}
                        className={`w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 text-white font-black rounded-xl sm:rounded-2xl shadow-lg transition-all active:scale-95 text-sm sm:text-base cursor-pointer ${isOwnStore ? 'bg-slate-400 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100 dark:shadow-none'}`}>
                        {isOwnStore ? t('store.myStoreDisabled', 'Minha Loja') : t('store.addToCart', 'Adicionar ao Carrinho')}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

// --- Main Component ---

export const Catalog = () => {
    const { t } = useTranslation();
    const { slug } = useParams<{ slug: string }>();
    const { allLaboratories, allSuppliers, currentUser, currentOrg, activeOrganization, currentPlan, userConnections, addConnectionByCode, cart, switchActiveOrganization } = useApp();
    const navigate = useNavigate();
    const location = useLocation();
    const [term, setTerm] = useState('');
    const [mainTab, setMainTab] = useState<'STORE' | 'PARTNERSHIPS' | 'MY_ORDERS' | 'CART' | 'VOUCHERS'>(() => {
        const searchParams = new URLSearchParams(location.search);
        const tab = searchParams.get('tab');
        if (tab === 'vouchers') return 'VOUCHERS';
        if (tab === 'my_orders') return 'MY_ORDERS';
        return 'STORE';
    });

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const tab = searchParams.get('tab');
        if (tab === 'vouchers') {
            setMainTab('VOUCHERS');
        } else if (tab === 'my_orders') {
            setMainTab('MY_ORDERS');
        }
    }, [location.search]);
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [configuringProduct, setConfiguringProduct] = useState<JobType | null>(null);
    const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'PROMOTIONS' | 'PORTFOLIO' | 'REVIEWS' | 'ABOUT'>('PRODUCTS');
    const [localJobTypes, setLocalJobTypes] = useState<JobType[]>([]);
    const [localPriceTables, setLocalPriceTables] = useState<any[]>([]);
    const [labRatings, setLabRatings] = useState<LabRating[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [copiedServiceId, setCopiedServiceId] = useState<string | null>(null);
    const [configuringProductInitialTab, setConfiguringProductInitialTab] = useState<'CONFIG' | 'REVIEWS'>('CONFIG');

    const handleShareProduct = (productId: string) => {
        const slugOrId = selectedLab?.storeSlug || selectedLab?.id;
        if (!slugOrId) return;
        const shareUrl = `${window.location.origin}/store/${slugOrId}?serviceId=${productId}`;
        navigator.clipboard.writeText(shareUrl)
            .then(() => {
                setCopiedServiceId(productId);
                setTimeout(() => setCopiedServiceId(null), 2000);
            })
            .catch((err) => {
                console.error("Erro ao copiar link:", err);
            });
    };

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
            return fetchedLab || allLaboratories.find(l => l.storeSlug === slug || l.id === slug) || allSuppliers?.find(s => s.storeSlug === slug || s.id === slug) || null;
        }
        if (activeOrganization) return activeOrganization;
        if (currentOrg && (api.isLabOrganization(currentOrg) || currentOrg.orgType === 'LAB' || currentOrg.orgType === 'LAB_OUTSOURCED' || (currentOrg as any).isLab)) {
            return currentOrg;
        }
        return allLaboratories[0] || null;
    }, [slug, fetchedLab, allLaboratories, allSuppliers, activeOrganization, currentOrg]);

    useEffect(() => {
        if (!selectedLab?.id) {
            setLocalJobTypes([]);
            setLocalPriceTables([]);
            setLoadingProducts(false);
            return;
        }
        setLoadingProducts(true);
        const unsubRatings = api.subscribeLabRatings(selectedLab.id, (ratings) => {
            setLabRatings(ratings);
        });

        if (selectedLab.orgType === 'SUPPLIER') {
            const unsub = api.subscribeInventoryItems(selectedLab.id, (items) => {
                const mapped: JobType[] = items.map(item => ({
                    id: item.id,
                    name: item.name,
                    category: item.type || 'MATERIAL',
                    basePrice: item.sellPrice || 0,
                    variationGroups: item.variationGroups || [],
                    isVisibleInStore: item.isVisibleInStore !== false,
                    imageUrl: item.imageUrl || '',
                    description: item.description || ''
                } as any));
                setLocalJobTypes(mapped);
                setLoadingProducts(false);
            });
            return () => {
                unsub();
                unsubRatings();
            };
        } else {
            let unsubTypes = api.subscribeJobTypes(selectedLab.id, (types) => {
                setLocalJobTypes(types);
                setLoadingProducts(false);
            });
            let unsubTables = api.subscribePriceTables(selectedLab.id, (tables) => {
                setLocalPriceTables(tables);
            });
            return () => {
                unsubTypes();
                unsubTables();
                unsubRatings();
            };
        }
    }, [selectedLab?.id, selectedLab?.orgType]);

    const isGuest = !currentUser;
    const isPriceVisible = !isGuest || (selectedLab?.storeVisibility !== 'PRIVATE');

    // Auto-trigger product configuration if serviceId query parameter is present
    useEffect(() => {
        if (localJobTypes.length > 0) {
            const searchParams = new URLSearchParams(location.search);
            const serviceId = searchParams.get('serviceId');
            if (serviceId) {
                const product = localJobTypes.find(jt => jt.id === serviceId);
                if (product) {
                    if (isGuest) {
                        setShowAuthModal(true);
                    } else {
                        setConfiguringProduct(product);
                    }
                }
            }
        }
    }, [localJobTypes, location.search, isGuest]);

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
            <div className="flex flex-col items-center justify-center h-[60vh] text-center p-4 sm:p-8">
                <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
                <p className="text-slate-500 font-bold text-sm">{t('store.loadingStore', 'Carregando loja do laboratório...')}</p>
            </div>
        );
    }

    if (slug && !selectedLab) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center p-4 sm:p-8">
                <div className="bg-white dark:bg-[#131B2A] p-10 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800 max-w-md w-full flex flex-col items-center">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 text-slate-300 dark:text-slate-600">
                        <Building size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tighter">{t('store.labNotFound', 'Laboratório não encontrado')}</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium">
                        {t('store.labNotFoundDesc', 'O laboratório solicitado por essa URL não existe ou ainda não configurou seu link de compartilhamento.')}
                    </p>
                    <button onClick={() => navigate('/dentist/partnerships')}
                        className="px-10 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 dark:shadow-none transition-all w-full animate-pulse cursor-pointer">
                        {t('store.exploreLabs', 'EXPLORAR LABORATÓRIOS')}
                    </button>
                </div>
            </div>
        );
    }

    if (selectedLab && currentPlan && !currentPlan.features.hasStoreModule && !slug) {
        return (
            <FeatureLocked 
                title={t('store.storeModuleLocked', 'Módulo de Loja Bloqueado')} 
                message={t('store.storeModuleLockedDesc', 'O laboratório {{name}} não possui o módulo de Loja Virtual habilitado no plano atual.', { name: selectedLab.name })} 
            />
        );
    }

    const storeSettings = selectedLab?.storeSettings || {
        banners: [],
        layoutType: 'CARDS',
        portfolio: [],
        menuOptions: ['PRODUCTS', 'PORTFOLIO', 'REVIEWS']
    };

    const isOwnStore = Boolean(
        (currentOrg?.id && selectedLab?.id === currentOrg.id) || 
        (currentUser?.organizationId && selectedLab?.id === currentUser.organizationId)
    );
    const isOutsourcingStore = !isOwnStore && (currentOrg?.orgType === 'LAB' || currentOrg?.orgType === 'LAB_OUTSOURCED') && selectedLab?.id !== currentOrg?.id;
    const visibleProducts = localJobTypes.filter(t => {
        if (isOutsourcingStore) {
            return t.isVisibleInOutsourcing !== false;
        } else {
            return t.isVisibleInStore !== false;
        }
    });
    const categories = Array.from(new Set(visibleProducts.map(t => t.category)));

    const isPromo = (jt: any) => {
        if (jt.isPromotion === true) return true;
        if (jt.isPromotion === false) return false;
        return jt.isPromotion || !!jt.originalJobTypeId || !!jt.promotionQuantity || jt.isVoucherCombo === true;
    };
    
    const visiblePromos = localJobTypes.filter(jt => {
        if (!isPromo(jt)) return false;
        if (isOutsourcingStore) {
            return jt.isVisibleInOutsourcing !== false;
        } else {
            return jt.isVisibleInStore !== false;
        }
    });

    const products = visibleProducts.filter(t => {
        if (isPromo(t)) return false;
        const termLower = term.toLowerCase();
        const matchesTerm = t.name.toLowerCase().includes(termLower) || t.category.toLowerCase().includes(termLower);
        const matchesCat = selectedCategory === 'ALL' || t.category === selectedCategory;
        return matchesTerm && matchesCat;
    });

    const getPrice = (type: JobType) => {
        if (!currentUser) return { price: type.basePrice, isCustom: false };
        
        let basePrice = type.basePrice;
        
        if (currentUser.priceTableId) {
            const table = localPriceTables.find(t => t.id === currentUser.priceTableId);
            if (table && table.prices[type.id]?.basePrice !== undefined) {
                basePrice = table.prices[type.id].basePrice;
            }
        }
        
        if (currentUser.isCustomPricing) {
            const custom = currentUser.customPrices?.find(c => c.jobTypeId === type.id);
            if (custom) {
                if (custom.fixedPrice !== undefined && custom.fixedPrice > 0) return { price: custom.fixedPrice, isCustom: true };
                if (custom.price !== undefined) return { price: custom.price, isCustom: true };
                if (custom.discountPercent !== undefined) return { price: basePrice * (1 - custom.discountPercent / 100), isCustom: true };
            }
            if (currentUser.globalDiscountPercent) return { price: basePrice * (1 - currentUser.globalDiscountPercent / 100), isCustom: true };
        }
        
        // If not custom pricing, or custom pricing had no overrides, check if basePrice was changed by table
        if (basePrice !== type.basePrice) {
            return { price: basePrice, isCustom: true }; // Consider table price as custom for display purposes
        }
        
        return { price: type.basePrice, isCustom: false };
    };

    // Reputation calculation per service type from live reviews & static fields
    const serviceRatingsMap = useMemo(() => {
        const map = new Map<string, { scores: number[]; mediaCount: number; tagCounts: Record<string, number> }>();
        labRatings.forEach(r => {
            const sId = r.serviceId || 'UNKNOWN';
            if (!map.has(sId)) {
                map.set(sId, { scores: [], mediaCount: 0, tagCounts: {} });
            }
            const entry = map.get(sId)!;
            entry.scores.push(Number(r.score) || 5);
            if ((r.imageUrls?.length || 0) > 0 || (r.videoUrls?.length || 0) > 0) {
                entry.mediaCount += 1;
            }
            (r.tags || []).forEach((t: string) => {
                entry.tagCounts[t] = (entry.tagCounts[t] || 0) + 1;
            });
        });

        const result: Record<string, { avg: number; count: number; countWithMedia: number; topTags: string[] }> = {};
        map.forEach((data, sId) => {
            const count = data.scores.length;
            const avg = count > 0 ? (data.scores.reduce((a, b) => a + b, 0) / count) : 5.0;
            const topTags = Object.entries(data.tagCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([tag]) => tag)
                .slice(0, 2);
            result[sId] = { avg, count, countWithMedia: data.mediaCount, topTags };
        });
        return result;
    }, [labRatings]);

    const getServiceReputation = (product: JobType) => {
        const fromMap = serviceRatingsMap[product.id];
        if (fromMap && fromMap.count > 0) {
            return fromMap;
        }
        if (product.ratingCount && product.ratingCount > 0) {
            return {
                avg: product.ratingAverage || 5.0,
                count: product.ratingCount,
                countWithMedia: 0,
                topTags: []
            };
        }
        return {
            avg: 5.0,
            count: 0,
            countWithMedia: 0,
            topTags: []
        };
    };

    const handleConfigureProduct = (product: JobType) => {
        if (isGuest) {
            setShowAuthModal(true);
        } else {
            setConfiguringProductInitialTab('CONFIG');
            setConfiguringProduct(product);
        }
    };

    const handleOpenProductReviews = (product: JobType) => {
        if (isGuest) {
            setShowAuthModal(true);
        } else {
            setConfiguringProductInitialTab('REVIEWS');
            setConfiguringProduct(product);
        }
    };

    const isLinked = selectedLab ? userConnections.some(c => c.organizationId === selectedLab.id) : false;

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0B0F17] relative">
            {/* Top Navigation Menu */}
            <div className="bg-white dark:bg-[#131B2A] border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shrink-0 w-full shadow-xs">
                <div className="flex items-center justify-between px-2.5 sm:px-4 py-2 gap-2 sm:gap-4 max-w-7xl mx-auto w-full">
                    {/* Navigation Tabs */}
                    <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none py-0.5 flex-1 min-w-0">
                        <button
                            onClick={() => setMainTab('STORE')}
                            className={`px-3 sm:px-4 py-2 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${mainTab === 'STORE' ? 'bg-[#15263f] text-white dark:bg-blue-600 shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            <ShoppingBag size={15} />
                            <span>{t('store.onlineStore', 'Loja Online')}</span>
                        </button>
                        <button
                            onClick={() => setMainTab('PARTNERSHIPS')}
                            className={`px-3 sm:px-4 py-2 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${mainTab === 'PARTNERSHIPS' ? 'bg-[#15263f] text-white dark:bg-blue-600 shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            <Handshake size={15} />
                            <span>{t('store.labPartnerships', 'Parcerias Lab')}</span>
                        </button>
                        <button
                            onClick={() => setMainTab('MY_ORDERS')}
                            className={`px-3 sm:px-4 py-2 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${mainTab === 'MY_ORDERS' ? 'bg-[#15263f] text-white dark:bg-blue-600 shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            <ClipboardList size={15} />
                            <span>{t('store.myOrders', 'Meus Pedidos')}</span>
                        </button>
                        <button
                            onClick={() => setMainTab('VOUCHERS')}
                            className={`px-3 sm:px-4 py-2 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${mainTab === 'VOUCHERS' ? 'bg-[#15263f] text-white dark:bg-blue-600 shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            <Ticket size={15} />
                            <span>{t('store.vouchers', 'Vouchers')}</span>
                        </button>
                    </div>

                    {/* Cart Button */}
                    <div className="flex items-center shrink-0">
                        <button
                            onClick={() => setMainTab('CART')}
                            className="px-3 sm:px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 active:scale-95 font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm cursor-pointer"
                        >
                            <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                            <span className="hidden xs:inline sm:inline">{t('store.cart', 'Carrinho')}</span>
                            <span className="bg-white/20 text-white px-1.5 py-0.5 rounded-md text-[10px] sm:text-xs font-black">{cart?.length || 0}</span>
                        </button>
                    </div>
                </div>
            </div>

            {mainTab === 'PARTNERSHIPS' && (
                <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#0B0F17] animate-in fade-in">
                    <Partnerships onSelectLab={(labId) => {
                        switchActiveOrganization(labId);
                        setMainTab('STORE');
                    }} />
                </div>
            )}

            {mainTab === 'MY_ORDERS' && (
                <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#0B0F17] animate-in fade-in">
                    <JobsList isStoreContext={true} />
                </div>
            )}

            {mainTab === 'VOUCHERS' && (
                <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#0B0F17] animate-in fade-in p-3 sm:p-6 max-w-6xl mx-auto w-full">
                    <MyVouchersTab />
                </div>
            )}

            {mainTab === 'CART' && (
                <div className="flex-1 p-3 sm:p-6 md:p-8 overflow-y-auto bg-slate-50 dark:bg-[#0B0F17] animate-in fade-in">
                    <Cart onBackToStore={() => setMainTab('STORE')} />
                </div>
            )}

            {mainTab === 'STORE' && (
                !selectedLab ? (
                    <div className="flex-1 flex flex-col items-center justify-center h-[60vh] text-center p-4 sm:p-8 bg-white dark:bg-[#131B2A] animate-in fade-in duration-500">
                        <div className="bg-white dark:bg-[#131B2A] p-6 sm:p-10 rounded-3xl sm:rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800 max-w-md w-full flex flex-col items-center">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-5 text-slate-300 dark:text-slate-600">
                                <Building size={36} />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">{t('store.labNotFound', 'Ops! Laboratório ausente.')}</h2>
                            <p className="text-slate-500 dark:text-slate-400 mb-6 font-medium text-xs sm:text-sm">
                                {t('store.selectLabPrompt', 'Parece que você ainda não selecionou qual laboratório deseja visitar hoje.')}
                            </p>
                            <button onClick={() => setMainTab('PARTNERSHIPS')}
                                className="px-6 sm:px-10 py-3.5 sm:py-4 bg-indigo-600 text-white font-black rounded-xl sm:rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 dark:shadow-none transition-all w-full text-xs sm:text-sm cursor-pointer">
                                {t('store.exploreLabs', 'EXPLORAR LABORATÓRIOS')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 p-3 sm:p-6 md:p-8 space-y-6 sm:space-y-8 pb-20 animate-in fade-in duration-500 overflow-y-auto">
                {configuringProduct && <VariationConfigModal product={configuringProduct} selectedLab={selectedLab} localPriceTables={localPriceTables} initialTab={configuringProductInitialTab} onClose={() => setConfiguringProduct(null)} />}
            
            {showAuthModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-300">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-[#131B2A] p-5 sm:p-8 rounded-2xl sm:rounded-[32px] max-w-md w-full shadow-2xl text-center space-y-5 border border-slate-100 dark:border-slate-800">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto">
                            <Shield size={30} />
                        </div>
                        <div>
                            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">{t('store.authModalTitle', 'Fazer Pedido ou Customizar')}</h3>
                            <p className="text-slate-500 dark:text-slate-400 font-medium text-xs sm:text-sm mt-2 leading-relaxed">
                                {t('store.authModalDesc', 'Para poder escolher variações, aplicar cupons e enviar trabalhos ao laboratório, você precisa estar cadastrado e logado.')}
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5 pt-2">
                            <button 
                                onClick={() => navigate(`/register-lab?redirect=${encodeURIComponent(location.pathname + location.search)}&type=DENTIST`)} 
                                className="px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl sm:rounded-2xl hover:bg-indigo-700 transition-all text-xs cursor-pointer"
                            >
                                {t('store.createAccount', 'Criar Conta')}
                            </button>
                            <button 
                                onClick={() => navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`)} 
                                className="px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold rounded-xl sm:rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-xs cursor-pointer"
                            >
                                {t('store.login', 'Fazer Login')}
                            </button>
                        </div>
                        <button 
                            onClick={() => setShowAuthModal(false)}
                            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-bold underline cursor-pointer"
                        >
                            {t('store.backToCatalog', 'Voltar ao Catálogo')}
                        </button>
                    </motion.div>
                </div>
            )}

            {/* Marketplace Laboratory Showcase Header */}
            <div className="bg-white dark:bg-[#131B2A] p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6" id="marketplace-profile-header">
                <div className="flex items-center gap-3.5 sm:gap-5 min-w-0 w-full md:w-auto">
                    <div className="w-14 h-14 sm:w-20 sm:h-20 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl sm:rounded-3xl flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                        {selectedLab.logoUrl ? (
                            <img src={selectedLab.logoUrl} alt={selectedLab.name} className="w-full h-full object-contain" />
                        ) : (
                            <Building size={28} className="text-slate-400 dark:text-slate-500" />
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-lg sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight truncate max-w-[240px] sm:max-w-none">{selectedLab.name}</h1>
                            {isOwnStore ? (
                                <span className="text-[9px] sm:text-[10px] bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-black px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full uppercase tracking-widest flex items-center gap-1 shrink-0">
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> {t('store.myStoreBadge', 'Minha Loja')}
                                </span>
                            ) : isLinked ? (
                                <span className="text-[9px] sm:text-[10px] bg-green-50 dark:bg-green-950/60 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 font-black px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full uppercase tracking-widest flex items-center gap-1 shrink-0">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> {t('store.linkedPartnerBadge', 'Parceiro Vinculado')}
                                </span>
                            ) : (
                                <span className="text-[9px] sm:text-[10px] bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-black px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full uppercase tracking-widest flex items-center gap-1 shrink-0">
                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span> {t('store.noPartnerBadge', 'Sem Parceria')}
                                </span>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-2 sm:gap-4 mt-1.5 text-slate-500 dark:text-slate-400 text-xs flex-wrap font-bold">
                            <div className="flex items-center gap-1 text-yellow-500 font-black">
                                <Star fill="currentColor" size={13} className="fill-yellow-500" />
                                {selectedLab.ratingAverage ? selectedLab.ratingAverage.toFixed(1) : "S/N"}
                            </div>
                            <span>•</span>
                            <span className="font-semibold text-[11px] sm:text-xs">{selectedLab.ratingCount || 0} {t('store.reviewsTab', 'Avaliações')}</span>
                            <span className="hidden sm:inline">•</span>
                            <span className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-black font-mono hidden sm:inline">ID: {selectedLab.id}</span>
                        </div>
                    </div>
                </div>

                {!isLinked && !isOwnStore && (
                    <div className="w-full md:w-auto relative" id="linking-action-button-area">
                        {connectionMsg && (
                            <div className="absolute bottom-full mb-2 right-0 bg-green-50 dark:bg-green-950/80 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-xs py-1.5 px-3 rounded-xl font-medium shadow flex items-center gap-1 w-max z-10">
                                <CheckCircle size={14} /> {connectionMsg}
                            </div>
                        )}
                        {connectionErr && (
                            <div className="absolute bottom-full mb-2 right-0 bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs py-1.5 px-3 rounded-xl font-medium shadow w-max z-10">
                                {connectionErr}
                            </div>
                        )}
                        <button 
                            onClick={handleDirectLink}
                            disabled={connecting}
                            className="w-full md:w-auto px-5 py-3 sm:px-6 sm:py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl sm:rounded-2xl shadow-lg shadow-blue-100 dark:shadow-none transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                            {connecting ? <Loader2 className="animate-spin" size={16} /> : <><Handshake size={16} /> {t('store.firmPartnership', 'FIRMAR PARCERIA')}</>}
                        </button>
                    </div>
                )}
            </div>

            {/* Own Store Preview Notice Banner */}
            {isOwnStore && (
                <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-blue-500/10 border border-blue-200 dark:border-blue-900/60 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                            <Store size={20} />
                        </div>
                        <div>
                            <p className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">{t('store.ownStoreBannerTitle', 'Modo de Visualização da Sua Loja')}</p>
                            <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">{t('store.ownStoreBannerDesc', 'Esta é a vitrine que seus dentistas e parceiros visualizam. Opções de compra de si mesmo estão desativadas.')}</p>
                        </div>
                    </div>
                    <button 
                        type="button" 
                        onClick={() => setMainTab('PARTNERSHIPS')} 
                        className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 font-bold rounded-xl border border-blue-200 dark:border-slate-700 text-xs shadow-xs transition-all shrink-0 cursor-pointer"
                    >
                        {t('store.exploreOtherLabs', 'Explorar Outros Laboratórios')}
                    </button>
                </div>
            )}

            {/* 1. Header Banner */}
            <BannerCarousel images={storeSettings.banners || []} />

            {/* 2. Store Menu */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none gap-1 sm:gap-2">
                {[...(storeSettings.menuOptions || ['PRODUCTS', 'PORTFOLIO', 'REVIEWS']).reduce((acc, curr) => {
                    acc.push(curr);
                    if (curr === 'PRODUCTS') {
                        acc.push('PROMOTIONS');
                    }
                    return acc;
                }, [] as string[]), 'ABOUT'].map(opt => (
                    <button 
                        key={opt}
                        onClick={() => setActiveTab(opt as any)}
                        className={`px-4 sm:px-8 py-3.5 sm:py-5 text-xs sm:text-sm font-black uppercase tracking-wider sm:tracking-widest transition-all relative shrink-0 cursor-pointer ${activeTab === opt ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200'}`}
                    >
                        {opt === 'PRODUCTS' ? t('store.catalogTab', 'Catálogo') : opt === 'PROMOTIONS' ? t('store.promotionsTab', 'Promoções') : opt === 'PORTFOLIO' ? t('store.portfolioTab', 'Portfólio') : opt === 'REVIEWS' ? t('store.reviewsTab', 'Avaliações') : t('store.aboutTab', 'Sobre')}
                        {activeTab === opt && (
                            <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 sm:h-1 bg-blue-600 dark:bg-blue-500 rounded-full" />
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
                        className="space-y-6 sm:space-y-8"
                    >
                        {/* Filters */}
                        <div className="flex flex-col md:flex-row gap-4 sm:gap-6 items-stretch md:items-center bg-white dark:bg-[#131B2A] p-4 sm:p-6 rounded-2xl sm:rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800">
                            <div className="relative flex-1 w-full flex flex-col gap-3">
                                <div className="relative">
                                    <Search className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={20} />
                                    <input 
                                        className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700/80 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-sm sm:text-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                                        placeholder={t('store.searchPlaceholder', 'Qual serviço você procura? Ex: Coroa, Coping...')}
                                        value={term}
                                        onChange={(e) => setTerm(e.target.value)}
                                    />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {categories.map(cat => (
                                        <button 
                                            key={cat} 
                                            onClick={() => setSelectedCategory(selectedCategory === cat ? 'ALL' : cat)} 
                                            className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full transition-all border cursor-pointer ${selectedCategory === cat ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-slate-50 dark:bg-[#0B0F17] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400'}`}
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
                                    className="w-full appearance-none bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 font-black text-sm uppercase tracking-widest px-6 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                                >
                                    <option value="ALL">{t('store.allCategories', 'Todas Categorias')}</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat} className="bg-white dark:bg-[#131B2A] text-slate-800 dark:text-slate-100">{cat}</option>
                                    ))}
                                </select>
                                <ChevronDown size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
                            </div>
                        </div>

                        {/* Products List/Grid */}
                        {loadingProducts ? (
                            <div className="text-center py-20">
                                <Loader2 className="animate-spin text-blue-600 dark:text-blue-400 mx-auto" size={36} />
                                <span className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest block mt-3">{t('store.loadingCatalog', 'Carregando catálogo...')}</span>
                            </div>
                        ) : products.length === 0 ? (
                            <div className="text-center py-20 bg-slate-50 dark:bg-[#131B2A] rounded-[40px] border-2 border-dashed border-slate-200 dark:border-slate-800">
                                <Package size={64} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tighter">{t('store.noResultsTitle', 'Nenhum resultado')}</h3>
                                <p className="text-slate-400 dark:text-slate-400 font-medium">{t('store.noResultsDesc', 'Tente uma busca diferente ou selecione outra categoria.')}</p>
                            </div>
                        ) : (
                            <div className={storeSettings.layoutType === 'LIST' ? 'space-y-4' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8'}>
                                {products.map(product => {
                                    const { price, isCustom } = getPrice(product);
                                    const rep = getServiceReputation(product);
                                    if (storeSettings.layoutType === 'LIST') {
                                        return (
                                            <div key={product.id} className="bg-white dark:bg-[#131B2A] p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group hover:shadow-md dark:hover:border-slate-700 transition-all">
                                                <div className="flex items-center gap-4 sm:p-6">
                                                    <div className="w-20 h-20 bg-slate-50 dark:bg-[#0E1626] rounded-2xl overflow-hidden shrink-0 border border-slate-100 dark:border-slate-800 flex items-center justify-center">
                                                        {product.imageUrl ? <img src={product.imageUrl} className="w-full h-full object-cover" /> : <Package size={32} className="text-slate-300 dark:text-slate-600 pointer-events-none" />}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-widest">{product.category}</span>
                                                            {product.productionTimeDays !== undefined && product.productionTimeDays !== null && Number(product.productionTimeDays) > 0 && (
                                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 px-2 py-0.5 rounded-full">
                                                                    <Clock size={10} />
                                                                    {product.productionTimeDays} {product.productionTimeDays === 1 ? t('store.businessDay', 'dia útil') : t('store.businessDays', 'dias úteis')}
                                                                </span>
                                                            )}
                                                            {/* Service Reputation Badge */}
                                                            <button
                                                                type="button"
                                                                onClick={(e) => { e.stopPropagation(); handleOpenProductReviews(product); }}
                                                                className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/80 px-2 py-0.5 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
                                                                title={t('store.viewServiceReviews', 'Ver avaliações deste serviço')}
                                                            >
                                                                <Star size={10} className="fill-amber-400 text-amber-400" />
                                                                <span>{rep.count > 0 ? rep.avg.toFixed(1) : '5.0'}</span>
                                                                <span className="text-slate-400 dark:text-slate-500 font-normal">({rep.count})</span>
                                                                {rep.countWithMedia > 0 && (
                                                                    <span className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 font-semibold ml-0.5">
                                                                        <Camera size={9} />
                                                                        <span>{rep.countWithMedia}</span>
                                                                    </span>
                                                                )}
                                                            </button>
                                                        </div>
                                                        <h3 className="font-bold text-slate-800 dark:text-white text-lg leading-tight mt-0.5">{product.name}</h3>
                                                        <div className="flex items-center gap-4 mt-1">
                                                            <span className="text-xs font-bold text-slate-400 dark:text-slate-400">{t('store.startingFrom', 'A partir de')}</span>
                                                            {isPriceVisible ? (
                                                                <>
                                                                    <span className={`font-black ${isCustom ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}>R$ {price.toFixed(2)}</span>
                                                                    {isCustom && <span className="bg-green-50 dark:bg-green-950/60 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 text-[8px] font-black px-2 py-0.5 rounded tracking-widest">{t('store.exclusive', 'EXCLUSIVO')}</span>}
                                                                </>
                                                            ) : (
                                                                <button onClick={(e) => { e.stopPropagation(); navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`); }} className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-0.5 border border-amber-100/50 dark:border-amber-800/50 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors cursor-pointer">
                                                                    <Lock size={12} /> {t('store.loginToSeePrices', 'Faça login para ver valores')}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={() => handleShareProduct(product.id)}
                                                        className={`p-3 rounded-xl border transition-all cursor-pointer ${copiedServiceId === product.id ? 'bg-green-50 dark:bg-green-950/60 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 border-slate-100 dark:border-slate-700'}`}
                                                        title={t('store.shareProduct', 'Compartilhar serviço')}
                                                    >
                                                        {copiedServiceId === product.id ? (
                                                            <span className="text-[10px] font-black uppercase tracking-wider px-1">{t('store.copied', 'Copiado!')}</span>
                                                        ) : (
                                                            <Share2 size={16} />
                                                        )}
                                                    </button>
                                                    <button onClick={() => handleConfigureProduct(product)} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-100 dark:shadow-none active:scale-95 transition-all cursor-pointer">
                                                        {t('store.configureBtn', 'CONFIGURAR')}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div key={product.id} className="bg-white dark:bg-[#131B2A] rounded-[32px] sm:rounded-[40px] shadow-sm hover:shadow-2xl dark:shadow-slate-950/60 border border-slate-100 dark:border-slate-800/90 overflow-hidden hover:-translate-y-1.5 transition-all duration-300 group flex flex-col">
                                            <div className="h-60 bg-slate-50 dark:bg-[#0E1626] flex items-center justify-center relative overflow-hidden border-b border-slate-100 dark:border-slate-800/60">
                                                {product.imageUrl ? (
                                                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                ) : (
                                                    <Package size={80} className="relative z-10 text-slate-300 dark:text-slate-600 group-hover:text-blue-400 dark:group-hover:text-blue-400 transition-colors duration-300" />
                                                )}
                                                {isCustom && (<div className="absolute top-4 right-4 bg-green-500 text-white text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1 shadow-xl z-20"><BadgePercent size={12} /> {t('store.specialPrice', 'SPECIAL PRICE')}</div>)}
                                                
                                                {/* Top left category badge */}
                                                <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3.5 py-1.5 rounded-full text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest z-20 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                                                    {product.category}
                                                </div>

                                                {/* Reputation Tag overlay top-left */}
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); handleOpenProductReviews(product); }}
                                                    className="absolute top-4 left-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-full text-[11px] font-black text-slate-900 dark:text-white z-20 border border-amber-200/80 dark:border-amber-800/80 shadow-sm flex items-center gap-1.5 hover:scale-105 transition-transform cursor-pointer"
                                                    title={t('store.viewServiceReputation', 'Ver reputação e avaliações deste serviço')}
                                                >
                                                    <Star size={13} className="fill-amber-400 text-amber-400" />
                                                    <span>{rep.count > 0 ? rep.avg.toFixed(1) : '5.0'}</span>
                                                    <span className="text-slate-400 dark:text-slate-500 text-[10px] font-normal">({rep.count})</span>
                                                    {rep.countWithMedia > 0 && (
                                                        <span className="inline-flex items-center text-blue-600 dark:text-blue-400 font-bold ml-0.5">
                                                            <Camera size={11} />
                                                        </span>
                                                    )}
                                                </button>

                                                <div className="absolute inset-0 bg-blue-900/0 group-hover:bg-blue-900/10 dark:group-hover:bg-blue-500/10 transition-colors duration-300 pointer-events-none" />
                                            </div>
                                            <div className="p-4 sm:p-8 flex flex-col flex-1">
                                                <div className="mb-4 flex-1 text-center md:text-left">
                                                    <h3 className="font-black text-slate-900 dark:text-white text-xl tracking-tight leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{product.name}</h3>
                                                    
                                                    {/* Top Praised Tags / Badges */}
                                                    {rep.topTags.length > 0 && (
                                                        <div className="flex items-center gap-1.5 flex-wrap mt-2 justify-center md:justify-start">
                                                            {rep.topTags.map(tag => (
                                                                <span key={tag} className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60">
                                                                    ✓ {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {product.productionTimeDays !== undefined && product.productionTimeDays !== null && Number(product.productionTimeDays) > 0 && (
                                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 mt-2.5 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60 w-fit mx-auto md:mx-0">
                                                            <Clock size={12} className="text-blue-600 dark:text-blue-400 shrink-0" />
                                                            <span>Prazo: <strong className="text-slate-900 dark:text-white font-bold">{product.productionTimeDays} {product.productionTimeDays === 1 ? t('store.businessDay', 'dia útil') : t('store.businessDays', 'dias úteis')}</strong></span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
                                                    <div className="flex justify-between items-end">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] text-slate-400 dark:text-slate-400 font-black uppercase tracking-widest mb-1">{isCustom ? t('store.yourOffer', 'Sua Oferta') : t('store.investment', 'Investimento')}</span>
                                                            <div className="flex items-baseline gap-2">
                                                                {isPriceVisible ? (
                                                                    <>
                                                                        <span className={`font-black text-3xl tracking-tighter ${isCustom ? 'text-green-600 dark:text-green-400' : 'text-slate-900 dark:text-white'}`}>R$ {price.toFixed(2)}</span>
                                                                        {isCustom && <span className="text-[10px] text-slate-400 line-through">R$ {product.basePrice.toFixed(2)}</span>}
                                                                    </>
                                                                ) : (
                                                                    <button onClick={(e) => { e.stopPropagation(); navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`); }} className="flex items-center gap-1.5 text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-3 py-1.5 border border-amber-100/50 dark:border-amber-800/50 rounded-xl leading-tight hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors cursor-pointer">
                                                                        <Lock size={14} /> {t('store.registerToSeePrice', 'Registrar para ver preço')}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button 
                                                                onClick={() => handleShareProduct(product.id)}
                                                                className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all cursor-pointer ${copiedServiceId === product.id ? 'bg-green-50 dark:bg-green-950/60 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                                                title={t('store.shareProduct', 'Compartilhar serviço')}
                                                            >
                                                                {copiedServiceId === product.id ? (
                                                                    <span className="text-[9px] font-black uppercase tracking-widest text-center leading-tight">{t('store.copied', 'Copiado!')}</span>
                                                                ) : (
                                                                    <Share2 size={18} />
                                                                )}
                                                            </button>
                                                            <button onClick={() => handleConfigureProduct(product)} className="w-12 h-12 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl flex items-center justify-center hover:bg-blue-600 dark:hover:bg-blue-500 transition-all active:scale-90 shadow-xl shadow-slate-200 dark:shadow-none group-hover:shadow-blue-200 dark:group-hover:shadow-none cursor-pointer">
                                                                <Plus size={24} />
                                                            </button>
                                                        </div>
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

                {activeTab === 'PROMOTIONS' && (
                    <motion.div key="promotions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="px-4 pb-4 sm:px-6 sm:pb-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:p-6">
                            {visiblePromos.map(promo => {
                                const originalProduct = localJobTypes.find(jt => jt.id === promo.originalJobTypeId);
                                return (
                                <div key={promo.id} className="bg-white dark:bg-[#131B2A] rounded-2xl border border-yellow-200 dark:border-yellow-700/60 overflow-hidden shadow-sm hover:shadow-xl transition-all group flex flex-col relative">
                                    <div className="absolute top-4 left-4 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider z-10 shadow-sm flex items-center gap-1">
                                        <Tag size={12} /> {t('store.promoBadge', 'PROMOÇÃO')}
                                    </div>
                                    <div className="h-48 bg-slate-100 dark:bg-[#0E1626] relative overflow-hidden">
                                        {promo.imageUrl ? (
                                            <img src={promo.imageUrl} alt={promo.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center text-slate-300 dark:text-slate-600">
                                                <Store size={64} />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                                        <div className="absolute bottom-4 left-4 right-4 text-white">
                                            <h3 className="font-bold text-lg leading-tight mb-1">{promo.name}</h3>
                                            <span className="text-xs bg-white/20 backdrop-blur-md px-2 py-1 rounded-full font-medium">{promo.category}</span>
                                            {promo.isVoucherCombo && (
                                                <span className="text-xs bg-blue-500/80 backdrop-blur-md px-2 py-1 rounded-full font-medium ml-2 border border-blue-400">{t('store.voucherPackage', 'Pacote de Vouchers')}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="p-5 flex flex-col flex-1">
                                        {promo.promotionCallText && (
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 italic mb-4">"{promo.promotionCallText}"</p>
                                        )}
                                        {originalProduct && promo.promotionQuantity && (
                                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-4 bg-slate-50 dark:bg-[#0E1626] p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span>{t('store.product', 'Produto:')}</span>
                                                    <span className="font-bold text-slate-700 dark:text-slate-200">{originalProduct.name}</span>
                                                </div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <span>{t('store.packageQuantity', 'Quantidade do pacote:')}</span>
                                                    <span className="font-bold text-slate-700 dark:text-slate-200">{promo.promotionQuantity} un.</span>
                                                </div>
                                                <div className="flex justify-between items-center text-red-400 line-through">
                                                    <span>{t('store.originalTotalPrice', 'Preço original total:')}</span>
                                                    <span>{(originalProduct.basePrice * promo.promotionQuantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold mb-0.5">{t('store.forOnly', 'Por apenas')}</p>
                                                <p className="text-xl font-black text-blue-600 dark:text-blue-400">{promo.basePrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleShareProduct(promo.id);
                                                    }}
                                                    className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all cursor-pointer ${copiedServiceId === promo.id ? 'bg-green-50 dark:bg-green-950/60 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 border-slate-200 dark:border-slate-700'}`}
                                                    title={t('store.sharePromotion', 'Compartilhar promoção')}
                                                >
                                                    {copiedServiceId === promo.id ? (
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-center leading-tight">{t('store.copied', 'Copiado!')}</span>
                                                    ) : (
                                                        <Share2 size={16} />
                                                    )}
                                                </button>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setConfiguringProduct(promo);
                                                    }}
                                                    className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-sm cursor-pointer"
                                                >
                                                    <ShoppingCart size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )})}
                            {visiblePromos.length === 0 && (
                                <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 bg-white dark:bg-[#131B2A] rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed">
                                    <Tag size={48} className="mb-4 text-slate-300 dark:text-slate-600" />
                                    <p className="font-medium text-lg text-slate-500 dark:text-slate-400">{t('store.noPromotionsActive', 'Nenhuma promoção ativa no momento.')}</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
                {activeTab === 'PORTFOLIO' && (
                    <motion.div key="portfolio" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                        <PortfolioSection portfolio={storeSettings.portfolio || []} />
                    </motion.div>
                )}

                {activeTab === 'REVIEWS' && (
                    <motion.div key="reviews" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        <ReviewsSection 
                            labId={selectedLab.id} 
                            availableServices={localJobTypes.map(p => ({ id: p.id, name: p.name, category: p.category }))}
                        />
                    </motion.div>
                )}

                {activeTab === 'ABOUT' && selectedLab && (
                    <motion.div 
                        key="about" 
                        initial={{ opacity: 0, y: 20 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -20 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:p-8"
                    >
                        {/* Location Details */}
                        <div className="bg-white dark:bg-[#131B2A] p-4 sm:p-6 md:p-4 sm:p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                            <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                                <MapPin className="text-blue-600 dark:text-blue-400" size={24} /> {t('store.locationAddress', 'Localização & Endereço')}
                            </h3>
                            
                            <div className="space-y-4 font-medium text-slate-600 dark:text-slate-300">
                                {selectedLab.address ? (
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-slate-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-2xl shrink-0">
                                            <MapPin size={22} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800 dark:text-white mb-1">{t('store.mainAddress', 'Endereço Principal')}</p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                                {selectedLab.address}, {selectedLab.number}
                                                {selectedLab.complement && ` - ${selectedLab.complement}`}
                                            </p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mt-1">
                                                {selectedLab.neighborhood && `${selectedLab.neighborhood}, `}
                                                {selectedLab.city && `${selectedLab.city} - ${selectedLab.state}`}
                                            </p>
                                            {selectedLab.cep && <p className="text-xs text-slate-400 dark:text-slate-400 mt-2 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded w-fit border border-slate-200 dark:border-slate-700">CEP: {selectedLab.cep}</p>}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-slate-400 dark:text-slate-500 italic bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                                        {t('store.addressNotProvided', 'Endereço não informado pelo laboratório.')}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Contacts & General Info */}
                        <div className="bg-white dark:bg-[#131B2A] p-4 sm:p-6 md:p-4 sm:p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                            <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                                <Info className="text-teal-600 dark:text-teal-400" size={24} /> {t('store.contactAndResponsible', 'Contato & Responsável')}
                            </h3>

                            <div className="space-y-6">
                                {/* Contacts */}
                                <div className="space-y-4">
                                    {(selectedLab.phone || selectedLab.email) ? (
                                        <>
                                            {selectedLab.phone && (
                                                <div className="flex items-center gap-4">
                                                    <span className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300 rounded-2xl text-xl">📞</span>
                                                    <div>
                                                        <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">{t('store.phone', 'Telefone')}</p>
                                                        <p className="text-base font-black text-slate-800 dark:text-white">{selectedLab.phone}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {selectedLab.email && (
                                                <div className="flex items-center gap-4">
                                                    <span className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300 rounded-2xl text-xl">📧</span>
                                                    <div>
                                                        <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">{t('store.commercialEmail', 'E-mail Comercial')}</p>
                                                        <p className="text-base font-black text-slate-800 dark:text-white select-all">{selectedLab.email}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="text-center py-6 text-slate-400 dark:text-slate-500 italic bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                                            {t('store.commercialContactsEmpty', 'Contatos comerciais não preenchidos.')}
                                        </div>
                                    )}
                                </div>

                                {/* Technical Responsible */}
                                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
                                    <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('store.technicalResponsibility', 'Responsabilidade Técnica')}</h4>
                                    
                                    <div className="bg-slate-50 dark:bg-[#0E1626] p-5 rounded-[24px] border border-slate-100 dark:border-slate-800 space-y-3">
                                        <p className="text-base font-bold text-slate-800 dark:text-white">
                                            {selectedLab.financialSettings?.techResponsibleName || t('store.notInformed', 'Não Informado')}
                                        </p>
                                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                                            {selectedLab.croNumero && (
                                                <p className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                                                    <span className="font-bold text-slate-400 dark:text-slate-400 uppercase mr-1">CRO:</span> 
                                                    <span className="font-black text-slate-700 dark:text-slate-200">{selectedLab.croNumero} {selectedLab.croUf && ` / ${selectedLab.croUf}`}</span>
                                                </p>
                                            )}
                                            {selectedLab.financialSettings?.techResponsibleCpf && (
                                                <p className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                                                    <span className="font-bold text-slate-400 dark:text-slate-400 uppercase mr-1">CPF:</span> 
                                                    <span className="font-black text-slate-700 dark:text-slate-200">{selectedLab.financialSettings.techResponsibleCpf}</span>
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            </div>
                )
            )}
        </div>
    );
};
