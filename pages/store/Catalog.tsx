
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Plus, Search, ShoppingBag, BadgePercent, Package, X, Building } from 'lucide-react';
import { JobType, VariationGroup, CartItem } from '../../types';
import { useNavigate } from 'react-router-dom';
import { FeatureLocked } from '../../components/FeatureLocked';

// Variation Configuration Modal (Component)
const VariationConfigModal = ({ product, onClose }: { product: JobType; onClose: () => void; }) => {
    const { addToCart, currentUser } = useApp();
    const [quantity, setQuantity] = useState(1);
    const [selectedVariations, setSelectedVariations] = useState<Record<string, string | string[]>>({});
    const [variationTextValues, setVariationTextValues] = useState<Record<string, string>>({}); // Text state

    // Price calculation logic
    const unitPrice = useMemo(() => {
        let price = product.basePrice;
        const custom = currentUser?.customPrices?.find(p => p.jobTypeId === product.id);
        if (custom) price = custom.price;

        const allSelectedOptionIds = Object.values(selectedVariations).flat();
        allSelectedOptionIds.forEach(optId => {
            product.variationGroups.forEach(group => {
                const option = group.options.find(opt => opt.id === optId);
                if (option) price += option.priceModifier;
            });
        });
        return price;
    }, [selectedVariations, product, currentUser]);

    const finalPrice = unitPrice * quantity;

    // --- Conditional Logic ---
    const disabledOptions = useMemo(() => {
        const disabled = new Set<string>();
        const allSelectedOptionIds = Object.values(selectedVariations).flat();
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
        const newItem: CartItem = {
            cartItemId: `cart_${Date.now()}`,
            jobType: product,
            quantity,
            unitPrice,
            finalPrice,
            selectedVariationIds: Object.values(selectedVariations).flat() as string[],
            variationValues: variationTextValues // Store text
        };
        addToCart(newItem);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in duration-200">
                <div className="flex justify-between items-center p-4 border-b border-slate-100">
                    <h3 className="font-bold text-lg text-slate-800">Configurar: {product.name}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                </div>
                <div className="p-6 overflow-y-auto space-y-4">
                    {/* Variation Groups */}
                    {product.variationGroups.map(group => (
                        <div key={group.id} className="p-3 rounded-lg border bg-white border-slate-200">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-bold text-sm text-slate-700">{group.name}</h4>
                                <span className="text-xs font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                                    {group.selectionType === 'SINGLE' ? 'Seleção Única' : group.selectionType === 'MULTIPLE' ? 'Múltipla Escolha' : 'Texto Livre'}
                                </span>
                            </div>
                            <div className="space-y-2">
                                {group.options.map(option => {
                                    const isDisabled = disabledOptions.has(option.id);
                                    
                                    if (group.selectionType === 'TEXT') {
                                        return (
                                            <div key={option.id} className={`p-2 rounded bg-slate-50 border border-slate-200 ${isDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
                                                <div className="flex justify-between mb-1">
                                                    <label className="text-xs font-bold text-slate-600">{option.name}</label>
                                                    <span className="text-xs font-semibold">{option.priceModifier > 0 ? `+ R$ ${option.priceModifier.toFixed(2)}` : ''}</span>
                                                </div>
                                                <input 
                                                    type="text"
                                                    disabled={isDisabled}
                                                    value={variationTextValues[option.id] || ''}
                                                    onChange={e => handleTextVariationChange(group, option.id, e.target.value)}
                                                    className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    placeholder="Digite aqui..."
                                                />
                                            </div>
                                        )
                                    }

                                    const isSelected = group.selectionType === 'SINGLE'
                                        ? selectedVariations[group.id] === option.id
                                        : (selectedVariations[group.id] as string[])?.includes(option.id);
                                    return (
                                        <div key={option.id} onClick={() => !isDisabled && handleVariationChange(group, option.id)}
                                            className={`p-2 rounded flex justify-between items-center text-sm transition-all ${isDisabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'} ${isSelected ? 'bg-indigo-50 border border-indigo-300' : 'hover:bg-slate-50'}`}>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-4 h-4 border border-slate-300 flex items-center justify-center ${group.selectionType === 'SINGLE' ? 'rounded-full' : 'rounded'}`}>
                                                    {isSelected && <div className="w-2 h-2 bg-indigo-600 rounded-full" />}
                                                </div>
                                                <span className={isSelected ? 'font-bold text-indigo-800' : 'text-slate-600'}>{option.name}</span>
                                            </div>
                                            <span className="text-xs font-semibold">{option.priceModifier > 0 ? `+ R$ ${option.priceModifier.toFixed(2)}` : ''}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
                {/* ... (Footer logic remains) ... */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 mt-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-bold">Qtd:</label>
                        <input type="number" min="1" value={quantity} onChange={e => setQuantity(Math.max(1, parseInt(e.target.value)))}
                            className="w-20 px-2 py-1 border border-slate-300 rounded-md text-center" />
                        <div className="text-right">
                             <span className="text-xs text-slate-500">Total</span>
                             <p className="font-bold text-xl text-indigo-700">R$ {finalPrice.toFixed(2)}</p>
                        </div>
                    </div>
                    <button onClick={handleAddToCart}
                        className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg">
                        Adicionar ao Pedido
                    </button>
                </div>
            </div>
        </div>
    );
};

// ... (Catalog export remains) ...
export const Catalog = () => {
  // (No major changes needed in main Catalog view, logic handles everything)
  const { jobTypes, currentUser, activeOrganization, currentPlan } = useApp();
  const navigate = useNavigate();
  const [term, setTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [configuringProduct, setConfiguringProduct] = useState<JobType | null>(null);

  // --- SAFEGUARD: DENTIST WITHOUT ACTIVE LAB ---
  if (!activeOrganization) {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 max-w-md w-full flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                    <Building size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Nenhum Laboratório Selecionado</h2>
                <p className="text-slate-500 mb-6">
                    Selecione um laboratório para visualizar o catálogo de produtos disponível.
                </p>
                <button 
                    onClick={() => navigate('/dentist/partnerships')}
                    className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors w-full"
                >
                    Gerenciar Parcerias
                </button>
            </div>
        </div>
    );
  }

  // --- PLAN CHECK ---
  if (currentPlan && !currentPlan.features.hasStoreModule) {
      return (
          <FeatureLocked 
              title="Laboratório sem Loja Virtual" 
              message={`O laboratório ${activeOrganization.name} não possui o módulo de Loja Virtual habilitado no plano atual. Você não pode realizar pedidos online.`} 
          />
      );
  }

  // Filter products visible in store
  const visibleProducts = jobTypes.filter(t => t.isVisibleInStore !== false); // Default to true if undefined

  const categories = Array.from(new Set(visibleProducts.map(t => t.category)));

  const products = visibleProducts.filter(t => {
      const matchesTerm = t.name.toLowerCase().includes(term.toLowerCase());
      const matchesCat = selectedCategory === 'ALL' || t.category === selectedCategory;
      return matchesTerm && matchesCat;
  });

  const getPrice = (type: JobType) => {
    if (!currentUser?.customPrices) return { price: type.basePrice, isCustom: false };
    const custom = currentUser.customPrices.find(c => c.jobTypeId === type.id);
    if (custom) return { price: custom.price, isCustom: true };
    return { price: type.basePrice, isCustom: false };
  };

  return (
    <div className="space-y-8 pb-12">
       {configuringProduct && <VariationConfigModal product={configuringProduct} onClose={() => setConfiguringProduct(null)} />}
       <div className="bg-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-200 flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
                <h1 className="text-3xl font-bold mb-2">Catálogo de Próteses</h1>
                <p className="text-indigo-100 max-w-lg">Selecione e configure os serviços para montar seu pedido.</p>
            </div>
            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/20">
                <ShoppingBag size={48} className="text-white opacity-80" />
            </div>
       </div>
       <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100 sticky top-4 z-10">
            <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-3 text-slate-400" size={20} />
                <input 
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="Buscar por nome do serviço..."
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                />
            </div>
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                <button 
                    onClick={() => setSelectedCategory('ALL')}
                    className={`px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-colors ${selectedCategory === 'ALL' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                    Todas
                </button>
                {categories.map(cat => (
                    <button 
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>
       </div>
       {products.length === 0 ? (
           <div className="text-center py-12"><Package size={48} className="mx-auto text-slate-300 mb-4" /><h3 className="text-xl font-bold text-slate-700">Nenhum produto encontrado</h3><p className="text-slate-500">Tente buscar por outro termo ou categoria.</p></div>
       ) : (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map(product => {
                    const { price, isCustom } = getPrice(product);
                    return (
                        <div key={product.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col">
                            <div className="h-48 bg-slate-50 flex items-center justify-center relative overflow-hidden">
                                {product.imageUrl ? (
                                    <img 
                                        src={product.imageUrl} 
                                        alt={product.name} 
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                ) : (
                                    <Package size={64} className="relative z-10 text-slate-300 group-hover:text-indigo-500 transition-colors duration-300" />
                                )}
                                
                                {isCustom && (<div className="absolute top-3 right-3 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-md z-20"><BadgePercent size={10} /> OFERTA</div>)}
                                <div className="absolute bottom-3 left-3 bg-white/80 backdrop-blur-md px-2 py-1 rounded text-xs font-bold text-slate-600 uppercase tracking-wider z-20">{product.category}</div>
                            </div>
                            <div className="p-6 flex flex-col flex-1">
                                <div className="mb-4 flex-1"><h3 className="font-bold text-slate-900 text-lg leading-tight mb-2 group-hover:text-indigo-700 transition-colors">{product.name}</h3></div>
                                <div className="pt-4 border-t border-slate-100">
                                    <div className="flex justify-between items-end mb-4"><span className="text-xs text-slate-400 font-medium uppercase">A partir de</span><div className="text-right">{isCustom && (<span className="text-xs text-slate-400 line-through block">R$ {product.basePrice.toFixed(2)}</span>)}<span className={`font-bold text-xl ${isCustom ? 'text-green-600' : 'text-slate-800'}`}>R$ {price.toFixed(2)}</span></div></div>
                                    <button onClick={() => setConfiguringProduct(product)}
                                        className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all">
                                        <Plus size={18} /> Configurar e Comprar
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
           </div>
       )}
    </div>
  );
};
