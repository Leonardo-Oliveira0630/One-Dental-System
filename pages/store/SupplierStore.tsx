import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { InventoryItem, Organization, SupplierOrder, StoreLayoutBlock } from '../../types';
import { 
  ShoppingBag, Search, Filter, ShoppingCart, Plus, Minus, Trash2, 
  X, MapPin, CreditCard, Sparkles, Building2, Package, Check, 
  ClipboardCheck, ArrowRight, CornerDownRight, Star, Heart, Flame, Gift, Grid, List, ChevronLeft, ChevronRight
} from 'lucide-react';

interface SupplierCartItem {
  id: string; // matches product ID + variation id (to allow distinct variations of same prod in cart)
  product: InventoryItem;
  quantity: number;
  variation?: {
    id: string;
    name: string;
    priceModifier: number;
    imageUrl?: string;
  };
}

type SortOption = 'RELEVANCE' | 'LATEST' | 'SALES' | 'PRICE_ASC' | 'PRICE_DESC';

export const SupplierStore = () => {
  const { 
    allSuppliers, allSupplierProducts, addSupplierOrder, currentUser, currentOrg 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('ALL');
  const [sortOption, setSortOption] = useState<SortOption>('RELEVANCE');
  
  // Local Supplier Cart
  const [cart, setCart] = useState<SupplierCartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CREDIT_CARD' | 'PIX'>('PIX');
  const [address, setAddress] = useState({
    street: currentUser?.address || '',
    number: '',
    complement: '',
    neighborhood: '',
    city: currentUser?.city || '',
    state: currentUser?.state || '',
    zipCode: currentUser?.cep || ''
  });
  
  // Checkout Processing
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<SupplierOrder | null>(null);

  // Detailed Product Modal (Shopee style switcher)
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<InventoryItem | null>(null);
  const [detailSelectedVar, setDetailSelectedVar] = useState<any>(null);
  const [detailActiveImg, setDetailActiveImg] = useState<string>('');

  // Auto-fill address from organization as a fallback
  useEffect(() => {
    if (currentOrg) {
      setAddress(prev => ({
        ...prev,
        street: prev.street || currentOrg.address || '',
        city: prev.city || currentOrg.city || '',
        state: prev.state || currentOrg.state || '',
        zipCode: prev.zipCode || currentOrg.cep || ''
      }));
    }
  }, [currentOrg]);

  // Load cart from local storage if available
  useEffect(() => {
    const saved = localStorage.getItem('supplier_cart_data_new');
    if (saved) {
      try {
        setCart(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Sync cart to local storage
  const saveCartToStorage = (newCart: SupplierCartItem[]) => {
    setCart(newCart);
    localStorage.setItem('supplier_cart_data_new', JSON.stringify(newCart));
  };

  // Get active supplier organization information if a specific supplier is selected
  const activeSupplierOrg = useMemo(() => {
    if (selectedSupplierId === 'ALL') return null;
    return allSuppliers.find(s => s.id === selectedSupplierId) || null;
  }, [allSuppliers, selectedSupplierId]);

  // Theme helper mapping
  const getThemeClasses = (themeId?: string) => {
    switch (themeId) {
      case 'shopee':
        return {
          bg: 'from-orange-600 to-red-600',
          textHover: 'hover:text-[#EE4D2D]',
          textPrimary: 'text-[#EE4D2D]',
          bgPrimary: 'bg-[#EE4D2D] hover:bg-[#ff5d3c]',
          borderActive: 'border-[#EE4D2D]',
          accentBadge: 'bg-[#EE4D2D]/10 text-[#EE4D2D]'
        };
      case 'dark':
        return {
          bg: 'from-slate-800 to-slate-950',
          textHover: 'hover:text-slate-400',
          textPrimary: 'text-slate-350',
          bgPrimary: 'bg-slate-800 hover:bg-slate-700',
          borderActive: 'border-slate-400',
          accentBadge: 'bg-slate-800/40 text-slate-400'
        };
      case 'amber':
        return {
          bg: 'from-amber-500 to-yellow-600',
          textHover: 'hover:text-amber-400',
          textPrimary: 'text-amber-450',
          bgPrimary: 'bg-amber-600 hover:bg-amber-500',
          borderActive: 'border-amber-500',
          accentBadge: 'bg-amber-500/10 text-amber-500'
        };
      case 'indigo':
        return {
          bg: 'from-indigo-600 to-purple-600',
          textHover: 'hover:text-indigo-400',
          textPrimary: 'text-indigo-400',
          bgPrimary: 'bg-indigo-600 hover:bg-indigo-500',
          borderActive: 'border-indigo-500',
          accentBadge: 'bg-indigo-500/10 text-indigo-450'
        };
      case 'emerald':
        return {
          bg: 'from-emerald-600 to-teal-600',
          textHover: 'hover:text-emerald-400',
          textPrimary: 'text-emerald-450',
          bgPrimary: 'bg-emerald-600 hover:bg-emerald-500',
          borderActive: 'border-emerald-500',
          accentBadge: 'bg-emerald-500/10 text-emerald-400'
        };
      case 'orange':
        return {
          bg: 'from-orange-500 to-amber-600',
          textHover: 'hover:text-orange-400',
          textPrimary: 'text-orange-400',
          bgPrimary: 'bg-orange-600 hover:bg-orange-500',
          borderActive: 'border-orange-500',
          accentBadge: 'bg-orange-500/10 text-orange-400'
        };
      default:
        // Default classic style
        return {
          bg: 'from-indigo-600 to-slate-900',
          textHover: 'hover:text-indigo-400',
          textPrimary: 'text-indigo-400',
          bgPrimary: 'bg-indigo-600 hover:bg-indigo-500',
          borderActive: 'border-indigo-500',
          accentBadge: 'bg-indigo-500/10 text-indigo-400'
        };
    }
  };

  const activeTheme = useMemo(() => {
    return getThemeClasses(activeSupplierOrg?.storeSettings?.theme);
  }, [activeSupplierOrg]);

  // Shopee Search / Algorithm scoring logic
  // Matches terms, scores them, favors richer items (combos, items with variations, rating)
  const rankedProducts = useMemo(() => {
    const raw = (allSupplierProducts || []).filter(p => p.isVisibleInStore !== false);
    
    // 1. First score each item
    const scoredList = raw.map(product => {
      let score = 0;
      const titleLower = product.name.toLowerCase();
      const descLower = (product.description || '').toLowerCase();
      const qLower = searchQuery.toLowerCase().trim();

      if (qLower) {
        // Query exact match
        if (titleLower.includes(qLower)) {
          score += 50;
          // Matches starting word
          if (titleLower.startsWith(qLower)) {
            score += 20;
          }
        }
        // Partial term split match
        const parts = qLower.split(/\s+/);
        parts.forEach(part => {
          if (titleLower.includes(part)) score += 10;
          if (descLower.includes(part)) score += 3;
        });
      } else {
        // Default organic scroll score
        score += 10;
      }

      // Shopee algorithm boosts:
      // Combos are prioritized:
      if (product.isCombo) score += 15;
      // Products with variations get priority boost:
      if (product.variations && product.variations.length > 0) score += 10;
      // Supplier rating integration:
      const supplier = allSuppliers.find(s => s.id === product.organizationId);
      if (supplier?.ratingAverage) {
        score += supplier.ratingAverage * 2;
      }

      return { product, score };
    });

    // 2. Apply supplier filters
    let currentFiltered = scoredList;
    if (selectedSupplierId !== 'ALL') {
      currentFiltered = scoredList.filter(item => item.product.organizationId === selectedSupplierId);
    }

    // 3. Apply sorting options
    switch (sortOption) {
      case 'LATEST':
        // Sort newest first
        currentFiltered.sort((a, b) => b.product.id.localeCompare(a.product.id));
        break;
      case 'SALES':
        // Boost scored combo / best products
        currentFiltered.sort((a, b) => b.score - a.score);
        break;
      case 'PRICE_ASC':
        currentFiltered.sort((a, b) => a.product.sellPrice - b.product.sellPrice);
        break;
      case 'PRICE_DESC':
        currentFiltered.sort((a, b) => b.product.sellPrice - a.product.sellPrice);
        break;
      case 'RELEVANCE':
      default:
        // Relevance descending score
        currentFiltered.sort((a, b) => b.score - a.score);
        break;
    }

    return currentFiltered.map(item => item.product);
  }, [allSupplierProducts, searchQuery, selectedSupplierId, sortOption, allSuppliers]);

  // Helpers
  const getSupplierName = (orgId: string) => {
    return allSuppliers.find(s => s.id === orgId)?.name || 'Fornecedor Parceiro';
  };

  const getSupplierLocation = (orgId: string) => {
    const s = allSuppliers.find(s => s.id === orgId);
    if (!s) return '';
    return `${s.city || 'São Paulo'} - ${s.state || 'SP'}`;
  };

  const openProductDetail = (p: InventoryItem) => {
    setSelectedItemForDetail(p);
    setDetailActiveImg(p.imageUrl || '');
    if (p.variations && p.variations.length > 0) {
      // select first variation by default
      setDetailSelectedVar(p.variations[0]);
      if (p.variations[0].imageUrl) {
        setDetailActiveImg(p.variations[0].imageUrl);
      }
    } else {
      setDetailSelectedVar(null);
    }
  };

  const addToCart = (product: InventoryItem, customVar?: any) => {
    // Generate unique ID for cart item (product id + variation suffix if any)
    const cartItemId = customVar ? `${product.id}_var_${customVar.id}` : product.id;
    const finalPrice = product.sellPrice + (customVar?.priceModifier || 0);

    const existing = cart.find(item => item.id === cartItemId);
    const availableStock = customVar ? (customVar.currentStock ?? product.currentStock) : product.currentStock;

    if (existing) {
      if (existing.quantity >= (availableStock || 999)) {
        alert('Toda a quantidade desse estoque de variação já está no carrinho.');
        return;
      }
      const updated = cart.map(item => 
        item.id === cartItemId ? { ...item, quantity: item.quantity + 1 } : item
      );
      saveCartToStorage(updated);
    } else {
      const targetCartItem: SupplierCartItem = {
        id: cartItemId,
        product,
        quantity: 1,
        variation: customVar ? {
          id: customVar.id,
          name: customVar.name,
          priceModifier: customVar.priceModifier,
          imageUrl: customVar.imageUrl
        } : undefined
      };
      saveCartToStorage([...cart, targetCartItem]);
    }
    setIsCartOpen(true);
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    const item = cart.find(i => i.id === cartItemId);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      const updated = cart.filter(i => i.id !== cartItemId);
      saveCartToStorage(updated);
    } else {
      const maxStock = item.variation ? (item.variation.imageUrl ? 20 : 50) : (item.product.currentStock || 999);
      if (delta > 0 && newQty > maxStock) {
        alert('Limite do estoque atingido para essa especificação.');
        return;
      }
      const updated = cart.map(i => 
        i.id === cartItemId ? { ...i, quantity: newQty } : i
      );
      saveCartToStorage(updated);
    }
  };

  const removeFromCartList = (cartItemId: string) => {
    const updated = cart.filter(i => i.id !== cartItemId);
    saveCartToStorage(updated);
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => {
      const price = item.product.sellPrice + (item.variation?.priceModifier || 0);
      return total + (price * item.quantity);
    }, 0);
  }, [cart]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || !currentUser || !currentOrg) return;

    setIsProcessing(true);

    try {
      // Split into multiple orders based on supplier organization IDs
      const itemsBySupplier: Record<string, SupplierCartItem[]> = {};
      cart.forEach(item => {
        const supId = item.product.organizationId;
        if (!itemsBySupplier[supId]) {
          itemsBySupplier[supId] = [];
        }
        itemsBySupplier[supId].push(item);
      });

      let lastOrder: SupplierOrder | null = null;

      for (const [supId, items] of Object.entries(itemsBySupplier)) {
        const orderId = `order_sup_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const totalVal = items.reduce((sum, i) => {
          const unitPrice = i.product.sellPrice + (i.variation?.priceModifier || 0);
          return sum + (unitPrice * i.quantity);
        }, 0);
        
        const newOrder: SupplierOrder = {
          id: orderId,
          supplierId: supId,
          supplierName: getSupplierName(supId),
          buyerOrgId: currentOrg.id,
          buyerOrgName: currentOrg.name,
          buyerName: currentUser.name,
          buyerEmail: currentUser.email,
          items: items.map(i => {
            const unitPrice = i.product.sellPrice + (i.variation?.priceModifier || 0);
            return {
              productId: i.product.id,
              name: i.variation ? `${i.product.name} (Opção: ${i.variation.name})` : i.product.name,
              quantity: i.quantity,
              price: unitPrice
            };
          }),
          totalValue: totalVal,
          status: 'PENDING',
          createdAt: new Date(),
          notes: notes || undefined,
          paymentMethod: paymentMethod,
          buyerAddress: address
        };

        await addSupplierOrder(newOrder);
        lastOrder = newOrder;
      }

      // Sync and succeed
      setOrderSuccess(lastOrder);
      saveCartToStorage([]); // clear
      setNotes('');
      setIsCheckoutOpen(false);
    } catch (err) {
      console.error(err);
      alert('Erro ao processar seu pedido. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main id="supplier-store-container" className="flex-1 p-6 space-y-6 overflow-y-auto bg-white text-slate-900 min-h-screen">
      
      {/* Dynamic Header/Banner depending on Selected Supplier to support custom Store settings */}
      {selectedSupplierId !== 'ALL' && activeSupplierOrg ? (
        <div className={`p-6 bg-gradient-to-r ${activeTheme.bg} border border-slate-800 rounded-2xl relative overflow-hidden transition-all duration-350`}>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-950/70 border border-white/10 flex items-center justify-center font-bold text-2xl text-white">
                {activeSupplierOrg.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="text-[10px] bg-white/20 text-white font-bold py-0.5 px-2 rounded-full uppercase tracking-wider">
                  LOJA OFICIAL
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-white mt-1">{activeSupplierOrg.name}</h1>
                <p className="text-white/80 text-xs mt-0.5 max-w-xl">
                  {activeSupplierOrg.storeSettings?.catchphrase || `Compre diretamente com as melhores condições e entrega expressa do fornecedor.`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedSupplierId('ALL')}
                className="px-4 py-2 bg-slate-950/30 hover:bg-slate-950/50 border border-white/10 rounded-xl text-xs font-bold text-white transition-all"
              >
                Voltar ao Marketplace
              </button>

              <button
                onClick={() => setIsCartOpen(true)}
                className="px-4 py-2 bg-white text-slate-900 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md"
              >
                <ShoppingCart size={14} /> Minha Cesta ({cart.reduce((s, i) => s + i.quantity, 0)})
              </button>
            </div>
          </div>
          
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        </div>
      ) : (
        <>
          {/* General Shopee Marketplace welcome Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-orange-100 to-red-100 border border-orange-200 rounded-2xl relative overflow-hidden">
            <div className="relative z-10">
              <span className="text-[10px] bg-orange-500 text-white font-bold py-0.5 px-3 rounded-full uppercase tracking-widest font-mono">
                SHOPEE DENTAL MARKETPLACE
              </span>
              <h1 className="text-2xl font-bold tracking-tight mt-1 text-slate-900">Mais Barato Direct dos Fornecedores</h1>
              <p className="text-slate-700 text-xs mt-2 max-w-xl leading-relaxed">
                Pesquise qualquer insumo, compare ofertas, compre combos econômicos e dezenas de variações exclusivas para clínicas e laboratórios na hora.
              </p>
            </div>
            <div className="relative z-10 flex items-center gap-3">
              <button
                onClick={() => setIsCartOpen(true)}
                className="px-5 py-3 bg-white text-[#EE4D2D] hover:bg-orange-50 font-bold rounded-xl transition-all shadow-xl flex items-center gap-2 border border-orange-200"
              >
                <ShoppingCart className="w-5 h-5" />
                <span className="text-sm">Meu Carrinho</span>
                {cart.length > 0 && (
                  <span className="bg-[#EE4D2D] text-white rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold">
                    {cart.reduce((s, i) => s + i.quantity, 0)}
                  </span>
                )}
              </button>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/50 rounded-full blur-3xl -mr-20 -mt-20" />
          </div>

          {/* LOJAS OFICIAIS EM DESTAQUE (Mercado Livre Mockup Style) */}
          <div className="bg-slate-900/50 border border-slate-900 rounded-2xl p-6 md:p-8 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-sm md:text-base font-extrabold tracking-widest text-slate-100 uppercase flex items-center justify-center gap-1.5">
                <span className="text-orange-500 text-lg">✧</span> LOJAS OFICIAIS EM DESTAQUE <span className="text-orange-500 text-lg">✧</span>
              </h2>
              <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
                As Lojas Oficiais das melhores marcas, você encontra aqui, acesse a sua preferida.
              </p>
            </div>

            {/* Circular Store Logos Slider */}
            <div className="relative group/slider max-w-5xl mx-auto flex items-center">
              {/* Carousel Container */}
              <div 
                id="official-stores-carousel"
                className="flex gap-4 sm:gap-6 overflow-x-auto py-2 scroll-smooth w-full px-2 items-center justify-start sm:justify-center"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {allSuppliers.length === 0 ? (
                  // Fallback beautiful mockup brands if there are no registered suppliers
                  [
                    { id: 'm1', name: 'Adidas Dental', logo: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=120&auto=format&fit=crop&q=60', initials: 'AD' },
                    { id: 'm2', name: 'Mondial Lab', logo: '', initials: 'ML' },
                    { id: 'm3', name: 'Omo Dental', logo: '', initials: 'OD' },
                    { id: 'm4', name: 'Pandora Inc', logo: '', initials: 'PI' },
                    { id: 'm5', name: 'Taiff Equip', logo: '', initials: 'TE' },
                    { id: 'm6', name: 'Wella Medical', logo: '', initials: 'WM' },
                    { id: 'm7', name: 'Wap Clean', logo: '', initials: 'WC' },
                  ].map((brand) => (
                    <div 
                      key={brand.id}
                      className="flex flex-col items-center gap-2.5 flex-shrink-0 cursor-not-allowed group/brand"
                    >
                      <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-full flex items-center justify-center shadow-lg border border-slate-200 transition-all duration-300 group-hover/brand:scale-105 group-hover/brand:shadow-xl relative overflow-hidden">
                        {brand.logo ? (
                          <img src={brand.logo} alt={brand.name} className="w-14 h-14 object-contain rounded-full" />
                        ) : (
                          <span className="text-slate-800 font-black text-xl tracking-tight">{brand.initials}</span>
                        )}
                        <div className="absolute inset-0 bg-slate-900/5 opacity-0 group-hover/brand:opacity-100 transition-opacity" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-400 group-hover/brand:text-slate-200 transition-colors max-w-[85px] text-center truncate">{brand.name}</span>
                    </div>
                  ))
                ) : (
                  allSuppliers.map((supplier) => {
                    const initials = supplier.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                    return (
                      <button 
                        key={supplier.id}
                        onClick={() => setSelectedSupplierId(supplier.id)}
                        className="flex flex-col items-center gap-2.5 flex-shrink-0 cursor-pointer group/brand outline-none focus:outline-none"
                      >
                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-full flex items-center justify-center shadow-lg border border-slate-200 transition-all duration-300 group-hover/brand:scale-105 group-hover/brand:shadow-xl relative overflow-hidden">
                          {supplier.logoUrl ? (
                            <img 
                              src={supplier.logoUrl} 
                              alt={supplier.name} 
                              className="w-16 h-16 object-contain rounded-full"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-full flex items-center justify-center shadow-inner">
                              <span className="text-white font-black text-base tracking-tight">{initials}</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-slate-900/5 opacity-0 group-hover/brand:opacity-100 transition-opacity" />
                        </div>
                        <span className="text-[11px] font-black text-slate-400 group-hover/brand:text-[#EE4D2D] transition-colors max-w-[95px] text-center truncate uppercase tracking-tight">{supplier.name}</span>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Slider Right Navigation Button */}
              <button 
                onClick={() => {
                  const el = document.getElementById('official-stores-carousel');
                  if (el) el.scrollLeft += 240;
                }}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 bg-white hover:bg-slate-50 text-slate-800 shadow-xl border border-slate-100 w-10 h-10 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 z-10"
                title="Próximas lojas"
              >
                <ChevronRight size={18} className="text-[#EE4D2D] stroke-[3]" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Control Panel: Search, Filter Supplier & Shopee Sorting options */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-100 border border-slate-200 rounded-2xl p-4">
          {/* Search */}
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Pesquise o produto que deseja (Ex: silicone, resina, gesso...)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-900 outline-none focus:ring-1 focus:ring-orange-500 placeholder-slate-400"
            />
          </div>

          {/* Supplier Selector */}
          <div className="md:col-span-2 flex items-center gap-2">
            <Filter className="text-slate-400 flex-shrink-0" size={18} />
            <select
              value={selectedSupplierId}
              onChange={e => setSelectedSupplierId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="ALL">Selecionar Loja de Fornecedor</option>
              {allSuppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.city || 'Cali'})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Shopee Style Sorting Tabs */}
        <div className="bg-slate-100 border border-slate-200 rounded-xl p-2 flex flex-wrap items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-500 px-2 font-medium">Ordenar por:</span>
            
            <button
              onClick={() => setSortOption('RELEVANCE')}
              className={`px-4 py-1.5 rounded-lg font-bold transition-all ${
                sortOption === 'RELEVANCE' 
                  ? 'bg-[#EE4D2D] text-white' 
                  : 'bg-white text-slate-600 hover:text-slate-900'
              }`}
            >
              Popular / Relevância
            </button>

            <button
              onClick={() => setSortOption('LATEST')}
              className={`px-4 py-1.5 rounded-lg font-bold transition-all ${
                sortOption === 'LATEST' 
                  ? 'bg-[#EE4D2D] text-white' 
                  : 'bg-white text-slate-600 hover:text-slate-900'
              }`}
            >
              Mais Recentes
            </button>

            <button
              onClick={() => setSortOption('SALES')}
              className={`px-4 py-1.5 rounded-lg font-bold transition-all ${
                sortOption === 'SALES' 
                  ? 'bg-[#EE4D2D] text-white' 
                  : 'bg-white text-slate-600 hover:text-slate-900'
              }`}
            >
              Mais Vendidos
            </button>

            <button
              onClick={() => setSortOption('PRICE_ASC')}
              className={`px-4 py-1.5 rounded-lg font-bold transition-all ${
                sortOption === 'PRICE_ASC' 
                  ? 'bg-[#EE4D2D] text-white' 
                  : 'bg-white text-slate-600 hover:text-slate-900'
              }`}
            >
              Menor Preço
            </button>

            <button
              onClick={() => setSortOption('PRICE_DESC')}
              className={`px-4 py-1.5 rounded-lg font-bold transition-all relative ${
                sortOption === 'PRICE_DESC' 
                  ? 'bg-[#EE4D2D] text-white' 
                  : 'bg-white text-slate-600 hover:text-slate-900'
              }`}
            >
              Maior Preço
            </button>
          </div>

          <span className="text-[10px] text-slate-500 font-mono pr-2">
            Mostrando {rankedProducts.length} itens encontrados
          </span>
        </div>
      </div>

      {/* RENDER DYNAMIC STOREFRONT IF IN SINGLE SUPPLIER MODE OR STANDARD GRID IF ALL */}
      {selectedSupplierId !== 'ALL' && activeSupplierOrg && activeSupplierOrg.storeSettings?.layoutBlocks && activeSupplierOrg.storeSettings.layoutBlocks.length > 0 ? (
        
        /* SEQUENTIAL RENDER OF CONFIGURED LAYOUT BLOCKS FOR THIS SUPPLIER */
        <div className="space-y-12">
          {activeSupplierOrg.storeSettings.layoutBlocks.map((block: StoreLayoutBlock) => {
            const blockProducts = rankedProducts.filter(p => {
              if (block.productIds && block.productIds.length > 0) {
                return block.productIds.includes(p.id);
              }
              return true;
            });

            return (
              <div key={block.id} className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-805 border-slate-800">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Sparkles className="text-orange-400" size={18} />
                    {block.title || 'Seção Destacada'}
                  </h3>
                  <span className="text-xs text-slate-500">{block.type}</span>
                </div>

                {block.type === 'BANNER' && (
                  <div className="relative rounded-2xl overflow-hidden aspect-[21/9] bg-slate-900 border border-slate-800">
                    <img 
                      src={activeSupplierOrg.storeSettings?.banners?.[0] || 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&q=80&w=1200'} 
                      alt="Banner Loja" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-6">
                      <p className="text-white font-bold text-lg md:text-2xl drop-shadow">{block.title}</p>
                    </div>
                  </div>
                )}

                {block.type === 'CAROUSEL' && (
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin snap-x">
                    {blockProducts.slice(0, 10).map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => openProductDetail(p)}
                        className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden w-60 flex-shrink-0 snap-start hover:border-orange-500 cursor-pointer transition-all p-3 space-y-3"
                      >
                        <div className="aspect-square bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center">
                          <img src={p.imageUrl || 'https://via.placeholder.com/150'} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div>
                          <p className="font-bold text-xs truncate text-slate-250 leading-tight">{p.name}</p>
                          <div className="flex justify-between items-center pt-2">
                            <span className="text-[#EE4D2D] font-bold font-mono text-sm">R$ {p.sellPrice.toFixed(2)}</span>
                            <span className="text-[9px] text-[#EE4D2D] bg-[#EE4D2D]/10 px-1 rounded">Ver</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {block.type === 'GRID' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {blockProducts.map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => openProductDetail(p)}
                        className="bg-slate-900 border border-slate-800 hover:border-[#EE4D2D]/50 rounded-2xl overflow-hidden flex flex-col justify-between group transition-all cursor-pointer"
                      >
                        <div className="p-4 space-y-3">
                          <div className="aspect-square bg-slate-950 border border-slate-850 rounded-xl overflow-hidden flex items-center justify-center relative">
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" referrerPolicy="no-referrer" />
                            ) : (
                              <Package className="w-12 h-12 text-slate-700" />
                            )}
                            {p.isCombo && (
                              <span className="absolute top-2 left-2 bg-purple-500 text-white font-bold text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider">
                                Combo
                              </span>
                            )}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-200 line-clamp-1 group-hover:text-amber-400">{p.name}</h3>
                            <p className="text-slate-400 text-xs line-clamp-2 h-8 mt-1">{p.description || 'Nenhuma descrição...'}</p>
                          </div>
                          <div className="pt-2 border-t border-slate-850 flex items-center justify-between font-mono">
                            <span className="text-[#EE4D2D] font-bold text-sm">R$ {p.sellPrice.toFixed(2)}</span>
                            <span className="text-[10px] text-slate-500">Estoque: {p.currentStock || 0}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {block.type === 'RELATED' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-900/40 p-4 border border-slate-850 rounded-2xl">
                    {blockProducts.slice(0, 4).map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => openProductDetail(p)}
                        className="bg-slate-950 p-3 rounded-xl border border-slate-850 flex flex-col justify-between cursor-pointer hover:border-indigo-400 transition-all"
                      >
                        <div className="aspect-square rounded-lg overflow-hidden bg-slate-900">
                          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer"/>
                        </div>
                        <p className="font-bold text-xs truncate mt-2">{p.name}</p>
                        <p className="text-[#EE4D2D] font-bold text-xs mt-1 font-mono">R$ {p.sellPrice.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                )}

                {block.type === 'LIST' && (
                  <div className="divide-y divide-slate-850 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    {blockProducts.map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => openProductDetail(p)}
                        className="p-4 flex items-center justify-between hover:bg-slate-950/40 cursor-pointer transition-all gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <img src={p.imageUrl} alt={p.name} className="w-12 h-12 rounded-lg object-cover" referrerPolicy="no-referrer"/>
                          <div>
                            <p className="font-bold text-xs text-slate-200">{p.name}</p>
                            <p className="text-[10px] text-slate-500 max-w-lg truncate">{p.description}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[#EE4D2D] font-bold font-mono text-sm">R$ {p.sellPrice.toFixed(2)}</p>
                          <span className="text-[9px] text-[#EE4D2D] bg-[#EE4D2D]/10 px-1.5 py-0.5 rounded font-bold uppercase">Ver Opções</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      ) : (
        
        /* STANDARD ALL PRODUCTS CENTRIC MARKETPLACE GRID (Shopee Ideal) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {rankedProducts.length === 0 ? (
            <div className="col-span-full py-16 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-500 space-y-3">
              <ShoppingBag className="w-12 h-12 mx-auto stroke-1 text-slate-600" />
              <p className="text-sm">Nenhum insumo ou produto exposto por fornecedores no momento.</p>
            </div>
          ) : (
            rankedProducts.map(p => {
              const supplierLoc = getSupplierLocation(p.organizationId);
              return (
                <div 
                  key={p.id} 
                  onClick={() => openProductDetail(p)}
                  className="bg-slate-900 border border-slate-800 hover:border-orange-500/50 rounded-2xl overflow-hidden flex flex-col justify-between group transition-all cursor-pointer relative"
                >
                  <div className="p-4 space-y-3.5">
                    {/* Image/Placeholder wrapper */}
                    <div className="aspect-square bg-slate-950 border border-slate-850 rounded-xl overflow-hidden flex items-center justify-center relative">
                      {p.imageUrl ? (
                        <img 
                          src={p.imageUrl} 
                          alt={p.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-350" 
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            console.error('Image load error for:', p.imageUrl, p);
                            e.currentTarget.src = 'https://via.placeholder.com/150';
                          }}
                        />
                      ) : (
                        <Package className="w-12 h-12 text-slate-750 stroke-1" />
                      )}
                      
                      {/* Floating Supplier Origin Tag */}
                      <div className="absolute top-2 left-2 bg-slate-900/90 backdrop-blur border border-slate-800 px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold text-slate-400 flex items-center gap-1">
                        <Building2 size={10} className="text-orange-400" />
                        {getSupplierName(p.organizationId).toUpperCase().substring(0, 18)}
                      </div>

                      {p.isCombo && (
                        <span className="absolute top-2 right-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-[8px] tracking-wider py-0.5 px-2 rounded-full uppercase shadow">
                          Combo Especial
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="space-y-1">
                      <h3 className="font-bold text-slate-200 line-clamp-1 group-hover:text-orange-400 transition-colors">
                        {p.name}
                      </h3>
                      <p className="text-slate-400 text-xs line-clamp-2 h-8">
                        {p.description || 'Nenhuma descrição detalhada informada.'}
                      </p>
                    </div>

                    {/* Variations mini badge */}
                    {p.variations && p.variations.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap">
                        {p.variations.slice(0, 3).map((v, i) => (
                          <span key={i} className="text-[9px] bg-slate-950 border border-slate-850 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                            {v.name}
                          </span>
                        ))}
                        {p.variations.length > 3 && (
                          <span className="text-[9px] text-[#EE4D2D] font-bold">+{p.variations.length - 3}</span>
                        )}
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-850 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-mono text-slate-500">VALOR UNITÁRIO</p>
                        <p className="text-base font-bold font-mono text-emerald-400">R$ {p.sellPrice.toFixed(2)}</p>
                      </div>
                      <div>
                        {p.currentStock && p.currentStock <= p.minStock ? (
                          <span className="text-[10px] text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded-md font-mono">Esgotando</span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono">Estoque: {p.currentStock || 0}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Buy Button */}
                  <div className="p-3 bg-slate-950/40 border-t border-slate-855 border-t-slate-850">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openProductDetail(p);
                      }}
                      className="w-full py-2 bg-slate-800 hover:bg-[#EE4D2D] hover:text-white text-xs font-bold text-slate-300 rounded-xl transition-all flex items-center justify-center gap-1.5"
                    >
                      <Plus size={13} /> Ver Opções & Comprar
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Cart Drawer - Sidebar slider */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-end">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full flex flex-col text-slate-100 shadow-2xl relative">
            <div className="p-6 border-b border-slate-855 border-b-slate-850 flex items-center justify-between bg-slate-950/40">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <ShoppingCart className="text-orange-400" />
                Cesta de Fornecedores
              </h3>
              <button 
                onClick={() => setIsCartOpen(false)} 
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-16 text-slate-500 space-y-2">
                  <ShoppingCart className="w-12 h-12 mx-auto stroke-1" />
                  <p className="text-sm">Seu carrinho está vazio.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map(item => {
                    const unitPrice = item.product.sellPrice + (item.variation?.priceModifier || 0);
                    return (
                      <div key={item.id} className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-3">
                        <div className="flex justify-between items-start gap-3">
                          <div>
                            <h4 className="font-bold text-slate-200 text-sm line-clamp-1">{item.product.name}</h4>
                            {item.variation && (
                              <p className="text-xs text-orange-400 font-bold mt-1">
                                Opção: {item.variation.name}
                              </p>
                            )}
                            <p className="text-[10px] text-slate-500 font-mono uppercase mt-1">
                              FORNECEDOR: {getSupplierName(item.product.organizationId)}
                            </p>
                          </div>
                          <button 
                            onClick={() => removeFromCartList(item.id)}
                            className="text-slate-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-slate-850">
                          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                            <button 
                              onClick={() => updateQuantity(item.id, -1)}
                              className="p-1 text-slate-400 hover:text-white"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="px-3 text-sm font-bold font-mono text-slate-200">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.id, 1)}
                              className="p-1 text-slate-400 hover:text-white"
                            >
                              <Plus size={14} />
                            </button>
                          </div>

                          <span className="font-mono text-xs font-bold text-emerald-400">
                            R$ {(unitPrice * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-6 border-t border-slate-850 bg-slate-950/40 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-400 text-sm">VALOR TOTAL DO PEDIDO:</span>
                  <span className="font-mono text-xl font-bold text-teal-400">R$ {cartTotal.toFixed(2)}</span>
                </div>

                <button
                  onClick={() => setIsCheckoutOpen(true)}
                  className="w-full py-3 bg-[#EE4D2D] hover:bg-orange-600 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-1.5"
                >
                  Continuar para Pagamento <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DETAILED PRODUCT DIALOG (Shopee-like options configuration) */}
      {selectedItemForDetail && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl text-slate-100 flex flex-col max-h-[92vh]">
            <div className="p-5 border-b border-slate-850 flex items-center justify-between bg-slate-950/30">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">DETALHES DO PRODUTO:</span>
                <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded uppercase font-bold">
                  {getSupplierName(selectedItemForDetail.organizationId)}
                </span>
              </div>
              <button 
                onClick={() => setSelectedItemForDetail(null)}
                className="text-slate-400 hover:text-white p-2"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Visual Images Slider */}
                <div className="space-y-3">
                  <div className="aspect-square bg-slate-950 border border-slate-850 rounded-2xl overflow-hidden flex items-center justify-center p-2">
                    <img 
                      src={detailActiveImg || selectedItemForDetail.imageUrl || 'https://via.placeholder.com/150'} 
                      alt="" 
                      className="w-full h-full object-contain rounded-xl"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  
                  {/* Gallery elements */}
                  <div className="flex gap-2.5 overflow-x-auto py-1">
                    <div 
                      onClick={() => setDetailActiveImg(selectedItemForDetail.imageUrl || '')}
                      className={`w-14 h-14 bg-slate-950 rounded-xl overflow-hidden cursor-pointer border ${
                        detailActiveImg === selectedItemForDetail.imageUrl ? 'border-orange-500' : 'border-slate-850'
                      }`}
                    >
                      <img src={selectedItemForDetail.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    {selectedItemForDetail.imageUrls && selectedItemForDetail.imageUrls.map((url, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setDetailActiveImg(url)}
                        className={`w-14 h-14 bg-slate-950 rounded-xl overflow-hidden cursor-pointer border ${
                          detailActiveImg === url ? 'border-orange-500' : 'border-slate-850'
                        }`}
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Text specifications and option Pickers */}
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-100">{selectedItemForDetail.name}</h2>
                    <p className="text-xs text-slate-500 mt-1 font-mono">SKU: {selectedItemForDetail.code || 'S/ SKU'}</p>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed max-h-24 overflow-y-auto">
                    {selectedItemForDetail.description || 'Nenhum detalhe adicional fornecido para este produto.'}
                  </p>

                  {/* Combo contents list */}
                  {selectedItemForDetail.isCombo && selectedItemForDetail.comboItems && selectedItemForDetail.comboItems.length > 0 && (
                    <div className="p-3 bg-purple-950/25 border border-purple-900/30 rounded-xl space-y-1.5">
                      <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">Insumos inclusos no Combo:</p>
                      <div className="space-y-1">
                        {selectedItemForDetail.comboItems.map((c, i) => (
                          <div key={i} className="flex justify-between items-center text-xs">
                            <span className="text-slate-300">• {c.name}</span>
                            <span className="text-[#EE4D2D] font-bold">x{c.quantity} un</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Variation Picker Options (SHOOPE MODEL) */}
                  {selectedItemForDetail.variations && selectedItemForDetail.variations.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Selecione uma Opção (Variação):</label>
                      <div className="flex flex-wrap gap-2">
                        {selectedItemForDetail.variations.map((v, i) => (
                          <button
                            key={v.id || i}
                            type="button"
                            onClick={() => {
                              setDetailSelectedVar(v);
                              if (v.imageUrl) {
                                setDetailActiveImg(v.imageUrl);
                              }
                            }}
                            className={`px-3 py-2 border rounded-xl text-xs font-bold transition-all ${
                              detailSelectedVar?.id === v.id 
                                ? 'border-orange-500 bg-orange-500/10 text-orange-400' 
                                : 'border-slate-800 bg-slate-950 text-slate-350 hover:bg-slate-850'
                            }`}
                          >
                            {v.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dynamic Price Display */}
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-850 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] text-slate-500 font-mono">PREÇO CONFIGURADO</p>
                      <p className="text-2xl font-bold font-mono text-emerald-400">
                        R$ {(selectedItemForDetail.sellPrice + (detailSelectedVar?.priceModifier || 0)).toFixed(2)}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-[9px] text-slate-500 font-mono">ESTOQUE DISPONÍVEL</p>
                      <p className="text-sm font-bold text-slate-300 font-mono">
                        {(detailSelectedVar ? detailSelectedVar.currentStock : selectedItemForDetail.currentStock) || 0} un
                      </p>
                    </div>
                  </div>

                  {/* Action insert to Cesta */}
                  <button
                    onClick={() => {
                      addToCart(selectedItemForDetail, detailSelectedVar);
                      setSelectedItemForDetail(null);
                    }}
                    className="w-full py-3 bg-[#EE4D2D] hover:bg-orange-600 text-white font-bold rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <ShoppingCart size={16} /> Adicionar Esta Especificação à Cesta
                  </button>

                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-850 flex justify-between items-center bg-slate-950/40">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <ClipboardCheck className="text-indigo-400" />
                Finalizar Pedido
              </h3>
              <button 
                onClick={() => setIsCheckoutOpen(false)} 
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCheckout} className="p-6 overflow-y-auto space-y-5">
              {/* Payment Method */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Forma de Pagamento</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('PIX')}
                    className={`p-3 rounded-xl border font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                      paymentMethod === 'PIX' 
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' 
                        : 'border-slate-800 bg-slate-950 text-slate-450 hover:bg-slate-850'
                    }`}
                  >
                    <Sparkles size={14} /> Pagar com PIX
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CREDIT_CARD')}
                    className={`p-3 rounded-xl border font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                      paymentMethod === 'CREDIT_CARD' 
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' 
                        : 'border-slate-800 bg-slate-950 text-slate-450 hover:bg-slate-850'
                    }`}
                  >
                    <CreditCard size={14} /> Cartão de Crédito
                  </button>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="space-y-3.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Endereço para Entrega</label>
                
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-3">
                    <input
                      type="text"
                      required
                      placeholder="Rua / Avenida"
                      value={address.street}
                      onChange={e => setAddress(prev => ({ ...prev, street: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      type="text"
                      required
                      placeholder="Nº"
                      value={address.number}
                      onChange={e => setAddress(prev => ({ ...prev, number: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Complemento"
                      value={address.complement}
                      onChange={e => setAddress(prev => ({ ...prev, complement: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      required
                      placeholder="Bairro"
                      value={address.neighborhood}
                      onChange={e => setAddress(prev => ({ ...prev, neighborhood: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      required
                      placeholder="Cidade"
                      value={address.city}
                      onChange={e => setAddress(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      type="text"
                      required
                      placeholder="UF"
                      maxLength={2}
                      value={address.state}
                      onChange={e => setAddress(prev => ({ ...prev, state: e.target.value.toUpperCase() }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 text-center uppercase"
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      type="text"
                      required
                      placeholder="CEP"
                      value={address.zipCode}
                      onChange={e => setAddress(prev => ({ ...prev, zipCode: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Observações do Pedido (Opcional)</label>
                <textarea
                  placeholder="Instruções para despacho ou entrega..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none h-16 resize-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Order summary breakdown */}
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Itens Selecionados</span>
                  <span>R$ {cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Frete / Despacho</span>
                  <span className="text-emerald-400 font-semibold uppercase">Grátis</span>
                </div>
                <div className="border-t border-slate-800 pt-2 flex justify-between font-bold text-sm text-slate-100">
                  <span>Total a Pagar</span>
                  <span className="font-mono text-teal-400">R$ {cartTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-3 bg-[#EE4D2D] hover:bg-orange-650 disabled:opacity-55 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-1"
              >
                {isProcessing ? 'Enviando...' : 'Confirmar e Enviar Pedido'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {orderSuccess && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl text-slate-100 p-6 space-y-6 text-center">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <Check size={36} />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold">Pedido Efetuado com Sucesso!</h3>
              <p className="text-slate-400 text-xs">
                Seu pedido foi registrado e encaminhado diretamente ao fornecedor para faturamento e despacho.
              </p>
            </div>

            {orderSuccess.paymentMethod === 'PIX' ? (
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-3.5">
                <span className="text-[10px] font-mono text-[#EE4D2D] uppercase font-black">PAGAMENTO VIA PIX</span>
                <div className="w-32 h-32 bg-white rounded-lg mx-auto flex items-center justify-center text-slate-900 text-xs font-mono font-bold">
                  [ QR CODE PIX ]
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                  Escaneie o QR Code PIX acima para efetuar a transferência direta e agilizar a expedição do produto.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl text-xs space-y-1">
                <p className="text-emerald-400 font-bold">Transação de Crédito Aprovada!</p>
                <p className="text-slate-400">Verifique os detalhes na fatura do seu cartão de crédito.</p>
              </div>
            )}

            <button
              onClick={() => {
                setOrderSuccess(null);
                setIsCartOpen(false);
              }}
              className="w-full py-2.5 bg-[#EE4D2D] hover:bg-orange-650 text-white font-bold rounded-xl transition-all"
            >
              Voltar para Loja
            </button>
          </div>
        </div>
      )}
    </main>
  );
};
