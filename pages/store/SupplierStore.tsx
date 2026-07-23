import { ProductReviews } from "./ProductReviews";
import { MyOrdersTab } from "./MyOrdersTab";
import * as api from '../../services/firebaseService';
import React, { useState, useMemo, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { useApp } from '../../context/AppContext';
import { InventoryItem, Organization, SupplierOrder, StoreLayoutBlock } from '../../types';
import { useNavigate, useLocation } from 'react-router-dom';
import { MarketplaceBanner } from '../../components/MarketplaceBanner';
import { OfficialStores } from '../../components/OfficialStores';
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
  selectedOptions?: {
    groupId: string;
    groupName: string;
    optionId: string;
    optionName: string;
    priceModifier: number;
  }[];
  selectedTeeth?: string[];
}

type SortOption = 'RELEVANCE' | 'LATEST' | 'SALES' | 'PRICE_ASC' | 'PRICE_DESC';

export const SupplierStore = () => {
  const { 
    allSuppliers, allSupplierProducts, addSupplierOrder, supplierOrders, updateSupplierOrder, currentUser, currentOrg, globalSettings 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('ALL');
  const [selectedMarketplaceCategoryId, setSelectedMarketplaceCategoryId] = useState<string | null>(null);
  const [isCategoriesDropdownOpen, setIsCategoriesDropdownOpen] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('RELEVANCE');
  const [userLocation, setUserLocation] = useState('');
  const [searchRadius, setSearchRadius] = useState<number>(50);
  
  // Local Supplier Cart
    const [supplierCategories, setSupplierCategories] = useState<any[]>([]);
  const [selectedInternalCategory, setSelectedInternalCategory] = useState<string | null>(null);

  // Fetch supplier categories
  useEffect(() => {
    if (selectedSupplierId && selectedSupplierId !== 'ALL') {
      const fetchCats = async () => {
        try {
          const snap = await getDocs(collection(db, `organizations/${selectedSupplierId}/inventoryCategories`));
          setSupplierCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
          console.error('Error fetching categories', e);
        }
      };
      fetchCats();
    } else {
      setSupplierCategories([]);
      setSelectedInternalCategory(null);
    }
  }, [selectedSupplierId]);

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
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  useEffect(() => {
    if (currentOrg?.cpfCnpj) {
      setCpfCnpj(currentOrg.cpfCnpj);
    } else if (currentOrg?.financialSettings?.techResponsibleCpf) {
      setCpfCnpj(currentOrg.financialSettings.techResponsibleCpf);
    } else if (currentUser?.cpfCnpj) {
      setCpfCnpj(currentUser.cpfCnpj);
    }
  }, [currentOrg, currentUser]);

  const [isProcessing, setIsProcessing] = useState(false);

  const [orderSuccess, setOrderSuccess] = useState<SupplierOrder | null>(null);
  
  // Coupon State
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [couponError, setCouponError] = useState('');
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  // Detailed Product Modal (Shopee style switcher)
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<InventoryItem | null>(null);
  const [activeTab, setActiveTab] = useState<'STORE' | 'MY_ORDERS'>('STORE');
  const [shippingMethod, setShippingMethod] = useState<'COMBINE' | 'PAC' | 'SEDEX' | 'FRENET'>('COMBINE');
  const [shippingQuotes, setShippingQuotes] = useState<any[]>([]);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [isQuotingShipping, setIsQuotingShipping] = useState(false);
  const [selectedShippingService, setSelectedShippingService] = useState<any>(null);

  const [detailSelectedVar, setDetailSelectedVar] = useState<any>(null);
  const [detailSelectedOptions, setDetailSelectedOptions] = useState<{groupId: string, groupName: string, optionId: string, optionName: string, priceModifier: number}[]>([]);
  const [detailActiveImg, setDetailActiveImg] = useState<string>('');
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const supplierIdParam = searchParams.get('supplierId');
    const productIdParam = searchParams.get('productId');

    if (supplierIdParam) {
      setSelectedSupplierId(supplierIdParam);
    }
    
    if (productIdParam && allSupplierProducts.length > 0) {
      const product = allSupplierProducts.find(p => p.id === productIdParam);
      if (product) {
        setSelectedItemForDetail(product);
      }
    }
  }, [location.search, allSupplierProducts]);

  // Get active supplier organization information if a specific supplier is selected
  const activeSupplierOrg = useMemo(() => {
    if (selectedSupplierId === 'ALL') return null;
    return allSuppliers.find(s => s.id === selectedSupplierId) || null;
  }, [allSuppliers, selectedSupplierId]);

  useEffect(() => {
    if (activeSupplierOrg?.storeSettings?.banners && activeSupplierOrg.storeSettings.banners.length > 1) {
      const interval = setInterval(() => {
        setBannerIndex((prev) => (prev + 1) % activeSupplierOrg.storeSettings!.banners!.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [activeSupplierOrg]);

  const handleShareStore = () => {
    if (!activeSupplierOrg) return;
    const shareUrl = `http://labprox.com.br/#/store?supplierId=${activeSupplierOrg.id}`;
    navigator.clipboard.writeText(shareUrl);
    alert('Link da loja copiado para a área de transferência!');
  };

  const handleShareProduct = (product: InventoryItem) => {
    const shareUrl = `http://labprox.com.br/#/store?supplierId=${product.organizationId}&productId=${product.id}`;
    navigator.clipboard.writeText(shareUrl);
    alert('Link do produto copiado para a área de transferência!');
  };

  const StoreHeader = () => (
    <header className="flex items-center justify-between p-4 bg-white border-b border-slate-200">
      <div className="flex items-center gap-3">
          {activeSupplierOrg?.storeSettings?.profilePhotoUrl && <img src={activeSupplierOrg.storeSettings.profilePhotoUrl} className="w-10 h-10 rounded-full object-cover border border-slate-200" />}
          <h1 className="text-xl font-bold">{activeSupplierOrg?.name}</h1>
      </div>
      <div className="flex items-center justify-end gap-3 w-auto">
         <button onClick={handleShareStore} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <ClipboardCheck size={14} /> Compartilhar Loja
         </button>
      </div>
    </header>
  );

  // Auto-fill address from organization as a fallback
  useEffect(() => {
    if (currentOrg) {
      setAddress(prev => ({
        ...prev,
        street: prev.street || currentOrg.address || '',
        number: prev.number || currentOrg.number || '',
        complement: prev.complement || currentOrg.complement || '',
        neighborhood: prev.neighborhood || currentOrg.neighborhood || '',
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
          textHover: 'hover:text-slate-500',
          textPrimary: 'text-slate-350',
          bgPrimary: 'bg-slate-800 hover:bg-slate-700',
          borderActive: 'border-slate-400',
          accentBadge: 'bg-slate-800/40 text-slate-500'
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
          textHover: 'hover:text-indigo-600',
          textPrimary: 'text-indigo-600',
          bgPrimary: 'bg-indigo-600 hover:bg-indigo-500',
          borderActive: 'border-indigo-500',
          accentBadge: 'bg-indigo-50 text-indigo-450'
        };
      case 'emerald':
        return {
          bg: 'from-emerald-600 to-teal-600',
          textHover: 'hover:text-emerald-600',
          textPrimary: 'text-emerald-450',
          bgPrimary: 'bg-emerald-600 hover:bg-emerald-500',
          borderActive: 'border-emerald-500',
          accentBadge: 'bg-emerald-50 text-emerald-600'
        };
      case 'orange':
        return {
          bg: 'from-orange-500 to-amber-600',
          textHover: 'hover:text-orange-600',
          textPrimary: 'text-orange-600',
          bgPrimary: 'bg-orange-600 hover:bg-orange-500',
          borderActive: 'border-orange-500',
          accentBadge: 'bg-orange-500/10 text-orange-600'
        };
      default:
        // Default classic style
        return {
          bg: 'from-indigo-600 to-slate-900',
          textHover: 'hover:text-indigo-600',
          textPrimary: 'text-indigo-600',
          bgPrimary: 'bg-indigo-600 hover:bg-indigo-500',
          borderActive: 'border-indigo-500',
          accentBadge: 'bg-indigo-50 text-indigo-600'
        };
    }
  };

  const activeTheme = useMemo(() => {
    return getThemeClasses(activeSupplierOrg?.storeSettings?.theme);
  }, [activeSupplierOrg]);

  // Shopee Search / Algorithm scoring logic
  // Matches terms, scores them, favors richer items (combos, items with variations, rating)
const isPromo = (jt: any) => {
  if (jt.isPromotion === true) return true;
  if (jt.isPromotion === false) return false;
  return jt.isPromotion || !!jt.originalJobTypeId || !!jt.promotionQuantity || jt.isVoucherCombo === true;
};
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
    
    // Apply category filter
    if (selectedMarketplaceCategoryId) {
      currentFiltered = currentFiltered.filter(item => 
        item.product.marketplaceCategoryIds?.includes(selectedMarketplaceCategoryId)
      );
    }
    
    // Apply internal category filter (for single supplier view)
    if (selectedInternalCategory) {
      currentFiltered = currentFiltered.filter(item => item.product.categoryId === selectedInternalCategory);
    }

    // Apply location filter (mocked based on city/state if radius is provided)
    if (userLocation.trim().length > 2 && selectedSupplierId === 'ALL') {
       const userLocLower = userLocation.toLowerCase().trim();
       currentFiltered = currentFiltered.filter(item => {
          const supplier = allSuppliers.find(s => s.id === item.product.organizationId);
          if (!supplier) return false;
          const cityMatch = supplier.city?.toLowerCase().includes(userLocLower) || false;
          const stateMatch = supplier.state?.toLowerCase().includes(userLocLower) || false;
          
          if (searchRadius <= 50) {
             return cityMatch;
          } else if (searchRadius <= 200) {
             return cityMatch || stateMatch;
          }
          return true; // > 200km acts like national/no filter
       });
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
  }, [allSupplierProducts, searchQuery, selectedSupplierId, sortOption, allSuppliers, selectedMarketplaceCategoryId, userLocation, searchRadius]);

  // Helpers
  const handleApplyCoupon = async () => {
    if (!couponCodeInput.trim()) return;
    setCheckingCoupon(true);
    setCouponError('');
    try {
      const q = query(collection(db, 'supplierCoupons'), where('code', '==', couponCodeInput.toUpperCase()));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        setCouponError('Cupom inválido ou não encontrado.');
        setAppliedCoupon(null);
        return;
      }
      
      const c = { id: snap.docs[0].id, ...snap.docs[0].data() } as any;
      
      if (!c.active) {
        setCouponError('Este cupom não está mais ativo.');
        setAppliedCoupon(null);
        return;
      }
      
      if (c.maxUses && c.usedCount >= c.maxUses) {
        setCouponError('Este cupom já atingiu o limite de usos.');
        setAppliedCoupon(null);
        return;
      }
      
      // If it has applicableProductIds, verify if ANY item in cart matches
      if (c.applicableProductIds && c.applicableProductIds.length > 0) {
        const cartProductIds = cart.map(item => item.product.id);
        const hasApplicableProduct = cartProductIds.some(id => c.applicableProductIds.includes(id));
        if (!hasApplicableProduct) {
          setCouponError('Este cupom não é válido para os produtos no carrinho.');
          setAppliedCoupon(null);
          return;
        }
      }
      
      setAppliedCoupon(c);
    } catch (e) {
      console.error(e);
      setCouponError('Erro ao validar cupom.');
    } finally {
      setCheckingCoupon(false);
    }
  };

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
    setIsDescExpanded(false);
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

  const addToCart = (product: InventoryItem, customVar?: any, selectedOptions?: any[]) => {
    // Generate unique ID for cart item (product id + variation suffix if any)
    let cartItemId = product.id;
    if (customVar) cartItemId += `_var_${customVar.id}`;
    if (selectedOptions && selectedOptions.length > 0) {
      const optsHash = selectedOptions.map(o => o.optionId).sort().join('_');
      cartItemId += `_opts_${optsHash}`;
    }

    const basePrice = (product.isPromotion && product.promotionalPrice) ? product.promotionalPrice : product.sellPrice;
    const finalPrice = basePrice + (customVar?.priceModifier || 0) + (selectedOptions?.reduce((sum, o) => sum + o.priceModifier, 0) || 0);

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
        } : undefined,
        selectedOptions: selectedOptions && selectedOptions.length > 0 ? selectedOptions : undefined
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

    const cartTotals = useMemo(() => {
    const baseTotal = cart.reduce((total, item) => {
      const basePrice = (isPromo(item.product) && item.product.promotionalPrice) ? item.product.promotionalPrice : item.product.sellPrice;
      const price = basePrice 
        + (item.variation?.priceModifier || 0)
        + (item.selectedOptions?.reduce((sum, opt) => sum + opt.priceModifier, 0) || 0);
      return total + (price * item.quantity);
    }, 0);

    let discount = 0;
    if (appliedCoupon) {
      if (appliedCoupon.applicableProductIds && appliedCoupon.applicableProductIds.length > 0) {
        // Calculate discount only on applicable items
        const applicableTotal = cart.reduce((total, item) => {
          if (appliedCoupon.applicableProductIds.includes(item.product.id)) {
            const basePrice = (isPromo(item.product) && item.product.promotionalPrice) ? item.product.promotionalPrice : item.product.sellPrice;
            const price = basePrice + (item.variation?.priceModifier || 0) + (item.selectedOptions?.reduce((sum, opt) => sum + opt.priceModifier, 0) || 0);
            return total + (price * item.quantity);
          }
          return total;
        }, 0);
        discount = appliedCoupon.discountType === 'PERCENTAGE' 
          ? (applicableTotal * (appliedCoupon.discountValue / 100))
          : Math.min(appliedCoupon.discountValue, applicableTotal);
      } else {
        discount = appliedCoupon.discountType === 'PERCENTAGE'
          ? (baseTotal * (appliedCoupon.discountValue / 100))
          : Math.min(appliedCoupon.discountValue, baseTotal);
      }
    }
    
    return { baseTotal, discount, finalTotal: Math.max(0, baseTotal - discount) + (selectedShippingService?.ShippingPrice ? Number(selectedShippingService.ShippingPrice) : 0) };
  }, [cart, appliedCoupon, selectedShippingService]);

  useEffect(() => {
    const firstSupplierId = cart.length > 0 ? cart[0].product.organizationId : null;
    const supplier = firstSupplierId ? allSuppliers.find(s => s.id === firstSupplierId) : null;
    
    if (address.zipCode && address.zipCode.length >= 8 && supplier?.frenetToken) {
      handleQuoteShipping(address.zipCode, supplier.frenetToken, supplier.cep || '01001000');
    }
  }, [address.zipCode, cart, allSuppliers]);

  const handleQuoteShipping = async (cep: string, token: string, originCep: string) => {
    setIsQuotingShipping(true);
    setShippingQuotes([]);
    setShippingError(null);
    setSelectedShippingService(null);
    try {
      const items = cart.map(item => ({
        id: item.product.id,
        price: isPromo(item.product) && item.product.promotionalPrice ? item.product.promotionalPrice : item.product.sellPrice,
        quantity: item.quantity,
        weight: 0.5,
        height: 10,
        width: 15,
        length: 20
      }));
      const res = await api.apiCalculateFrenetShipping({
        originCep,
        destinationCep: cep,
        items,
        frenetToken: token
      });
      if (res && res.services) {
        const validServices = res.services.filter((s: any) => !s.Error);
        if (validServices.length > 0) {
          setShippingQuotes(validServices);
        } else {
          // If there are services but all have errors, grab the first error
          const errorService = res.services.find((s: any) => s.Error && s.MsgErro);
          setShippingError(errorService ? errorService.MsgErro : "Nenhuma opção de frete disponível para este CEP.");
        }
      }
    } catch (e: any) {
      console.error(e);
      setShippingError(e.message || "Erro ao calcular frete");
    } finally {
      setIsQuotingShipping(false);
    }
  };

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
        let supBaseTotal = items.reduce((sum, i) => {
          const unitPrice = ((i.product.isPromotion && i.product.promotionalPrice) ? i.product.promotionalPrice : i.product.sellPrice) 
            + (i.variation?.priceModifier || 0)
            + (i.selectedOptions?.reduce((s, o) => s + o.priceModifier, 0) || 0);
          return sum + (unitPrice * i.quantity);
        }, 0);
        
        let supDiscount = 0;
        if (appliedCoupon && appliedCoupon.organizationId === supId) {
          if (appliedCoupon.applicableProductIds && appliedCoupon.applicableProductIds.length > 0) {
             const applicableSupTotal = items.reduce((sum, i) => {
                if (appliedCoupon.applicableProductIds.includes(i.product.id)) {
                  const unitPrice = ((i.product.isPromotion && i.product.promotionalPrice) ? i.product.promotionalPrice : i.product.sellPrice) 
                    + (i.variation?.priceModifier || 0)
                    + (i.selectedOptions?.reduce((s, o) => s + o.priceModifier, 0) || 0);
                  return sum + (unitPrice * i.quantity);
                }
                return sum;
             }, 0);
             supDiscount = appliedCoupon.discountType === 'PERCENTAGE' ? (applicableSupTotal * (appliedCoupon.discountValue / 100)) : Math.min(appliedCoupon.discountValue, applicableSupTotal);
          } else {
             supDiscount = appliedCoupon.discountType === 'PERCENTAGE' ? (supBaseTotal * (appliedCoupon.discountValue / 100)) : Math.min(appliedCoupon.discountValue, supBaseTotal);
          }
        }
        
        const totalVal = Math.max(0, supBaseTotal - supDiscount);
        const supShippingCost = selectedShippingService?.ShippingPrice ? Number(selectedShippingService.ShippingPrice) : 0;
        
        const newOrder: SupplierOrder = {
          id: orderId,
          supplierId: supId,
          supplierName: getSupplierName(supId),
          buyerOrgId: currentOrg.id,
          buyerOrgName: currentOrg.name,
          buyerName: currentUser.name,
          buyerEmail: currentUser.email,
          items: items.map(i => {
            const unitPrice = ((i.product.isPromotion && i.product.promotionalPrice) ? i.product.promotionalPrice : i.product.sellPrice) 
              + (i.variation?.priceModifier || 0)
              + (i.selectedOptions?.reduce((s, o) => s + o.priceModifier, 0) || 0);
            
            let itemName = i.product.name;
            if (i.variation) {
              itemName += ` (Opção: ${i.variation.name})`;
            }
            if (i.selectedOptions && i.selectedOptions.length > 0) {
              itemName += ` [${i.selectedOptions.map(o => o.optionName).join(', ')}]`;
            }
            if (i.selectedTeeth && i.selectedTeeth.length > 0) {
              itemName += ` - Dentes: ${i.selectedTeeth.sort().join(", ")}`;
            }

            return {
              productId: i.product.id,
              name: itemName,
              quantity: i.quantity,
              price: unitPrice,
              variationId: i.variation?.id,
              variationName: i.variation?.name,
              selectedOptions: i.selectedOptions,
              selectedTeeth: i.selectedTeeth
            };
          }),
          totalValue: totalVal + supShippingCost,
          discountValue: supDiscount > 0 ? supDiscount : undefined,
          couponCode: supDiscount > 0 ? appliedCoupon.code : undefined,
          status: 'PENDING',
          createdAt: new Date(),
          notes: notes || undefined,
          shippingMethod,
          shippingCost: supShippingCost > 0 ? supShippingCost : undefined,
          trackingInfo: selectedShippingService ? `Frenet: ${selectedShippingService.ServiceDescription}` : undefined,
          paymentMethod: 'BOLETO', // Asaas allows user to choose
          buyerAddress: address
        };

        
        
        const result: any = await api.apiCreateSupplierPayment(newOrder, { cpfCnpj: cpfCnpj.replace(/\D/g, '') });

        if (result && result.success && result.invoiceUrl) {
          lastOrder = { ...newOrder, asaasInvoiceUrl: result.invoiceUrl } as SupplierOrder;
        } else {
           throw new Error("Falha ao gerar link de pagamento");
        }
      }

      saveCartToStorage([]); // clear
      setNotes('');
      setIsCheckoutOpen(false);
      
      if (lastOrder && lastOrder.asaasInvoiceUrl) {
         window.location.href = lastOrder.asaasInvoiceUrl;
      } else {
         setOrderSuccess(lastOrder);
      }
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
    <main id="supplier-store-container" className="h-full w-full overflow-y-auto bg-white text-[#15263f] relative block">
      
      {/* ALWAYS SHOW MARKETPLACE TOP MENU */}
      <div className="flex items-center md:justify-between p-4 bg-white border-b border-gray-200 sticky top-0 z-30 shrink-0 overflow-x-auto gap-4 scrollbar-hide w-full">
        <div className="hidden md:block w-auto md:w-32 flex-shrink-0"></div>
        
        <div className="flex items-center justify-start md:justify-center flex-nowrap gap-2 md:gap-6 whitespace-nowrap md:flex-1">
          <button 
            onClick={() => { setSelectedSupplierId('ALL'); setActiveTab('STORE'); }}
            className={`px-4 py-2 rounded-xl font-bold text-base transition-colors ${activeTab === 'STORE' && selectedSupplierId === 'ALL' ? 'bg-[#15263f] text-white' : 'text-slate-600 hover:bg-[#15263f] hover:text-white'}`}
          >
            Home
          </button>
          <button 
            onClick={() => setActiveTab('MY_ORDERS')}
            className={`px-4 py-2 rounded-xl font-bold text-base transition-colors ${activeTab === 'MY_ORDERS' ? 'bg-[#15263f] text-white' : 'text-slate-600 hover:bg-[#15263f] hover:text-white'}`}
          >
            Meus Pedidos
          </button>
          <div className="hidden md:flex gap-2 md:gap-6">
            <div 
              className="relative"
              onMouseEnter={() => setIsCategoriesDropdownOpen(true)}
              onMouseLeave={() => setIsCategoriesDropdownOpen(false)}
            >
              <button className={`px-4 py-2 rounded-xl font-bold text-base flex items-center gap-1 transition-colors ${selectedMarketplaceCategoryId ? 'bg-[#15263f] text-white' : 'text-slate-600 hover:bg-[#15263f] hover:text-white'}`}>
                Categorias <CornerDownRight size={16} />
              </button>
              {isCategoriesDropdownOpen && globalSettings?.marketplaceCategories && (
                <div className="absolute top-full left-0 mt-0 pt-2 w-72 z-50">
                  <div className="bg-white border border-slate-200 shadow-xl rounded-xl p-2 max-h-[70vh] overflow-y-auto">
                    <div 
                      className={`p-2 rounded-lg cursor-pointer hover:bg-slate-100 ${!selectedMarketplaceCategoryId ? 'bg-slate-100 font-bold text-[#15263f]' : 'text-slate-600'}`}
                      onClick={() => { setSelectedMarketplaceCategoryId(null); setIsCategoriesDropdownOpen(false); }}
                    >
                      Todas as Categorias
                    </div>
                    {globalSettings.marketplaceCategories.map(cat => (
                      <div key={cat.id} className="space-y-1 mt-1">
                        <div 
                          className={`p-2 rounded-lg cursor-pointer font-bold hover:bg-slate-100 text-slate-800 ${selectedMarketplaceCategoryId === cat.id ? 'text-orange-600 bg-orange-50' : ''}`}
                          onClick={() => { setSelectedMarketplaceCategoryId(cat.id); setIsCategoriesDropdownOpen(false); }}
                        >
                          {cat.name}
                        </div>
                        {cat.subcategories?.map(sub => (
                          <div key={sub.id} className="space-y-1 pl-4 border-l-2 border-slate-100 ml-2">
                            <div 
                              className={`p-1.5 rounded-lg cursor-pointer text-sm hover:bg-slate-50 text-slate-600 ${selectedMarketplaceCategoryId === sub.id ? 'text-orange-600 font-bold bg-orange-50/50' : ''}`}
                              onClick={() => { setSelectedMarketplaceCategoryId(sub.id); setIsCategoriesDropdownOpen(false); }}
                            >
                              {sub.name}
                            </div>
                            {sub.subcategories?.map(subsub => (
                              <div 
                                key={subsub.id} 
                                className={`p-1 pl-4 rounded-lg cursor-pointer text-xs hover:bg-slate-50 text-slate-500 ${selectedMarketplaceCategoryId === subsub.id ? 'text-orange-600 font-bold' : ''}`}
                                onClick={() => { setSelectedMarketplaceCategoryId(subsub.id); setIsCategoriesDropdownOpen(false); }}
                              >
                                {subsub.name}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
        
        <div className="flex items-center justify-end gap-4 w-auto md:w-32 flex-shrink-0">
          <button
            onClick={() => setIsCartOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-500 font-bold rounded-xl transition-all shadow-md flex items-center gap-2 whitespace-nowrap"
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="text-sm">Carrinho ({cart.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'STORE' && (
      <>
      {/* Dynamic Header/Banner depending on Selected Supplier to support custom Store settings */}
      {selectedSupplierId !== 'ALL' && activeSupplierOrg ? (
        <div className="w-full">
          <StoreHeader />
          {/* Banner Hero Area */}
          <div className="relative w-full h-[300px] bg-slate-200 flex items-center justify-center overflow-hidden">
            {activeSupplierOrg.storeSettings?.banners && activeSupplierOrg.storeSettings.banners.length > 0 ? (
              <img 
                src={activeSupplierOrg.storeSettings.banners[bannerIndex].imageUrl} 
                alt="Banner" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-10 text-slate-500">
                <h1 className="text-4xl font-bold">{activeSupplierOrg.name}</h1>
                <p className="mt-2 text-lg">{activeSupplierOrg.storeSettings?.catchphrase || 'Bem-vindo à nossa loja!'}</p>
              </div>
            )}
            
            {/* Banner Content overlay (If text/button configured) */}
            <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center text-white p-6 text-center">
              <h1 className="text-5xl font-extrabold tracking-tight">
                {(activeSupplierOrg.storeSettings?.banners?.[bannerIndex]?.title) || activeSupplierOrg.storeSettings?.catchphrase || activeSupplierOrg.name}
              </h1>
              {activeSupplierOrg.storeSettings?.banners?.[bannerIndex]?.subtitle && (
                <p className="text-xl mt-4 max-w-2xl text-white font-medium">
                  {activeSupplierOrg.storeSettings.banners[bannerIndex].subtitle}
                </p>
              )}
              {activeSupplierOrg.storeSettings?.banners?.[bannerIndex]?.buttonText ? (
                <button 
                  onClick={() => {
                     const link = activeSupplierOrg.storeSettings?.banners?.[bannerIndex]?.buttonLink;
                     if(link) window.location.href = link;
                  }}
                  className="mt-6 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-all"
                >
                  {activeSupplierOrg.storeSettings.banners[bannerIndex].buttonText}
                </button>
              ) : (
                <button className="mt-6 px-8 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-full transition-all">
                  Ver Produtos
                </button>
              )}
            </div>
          </div>

          <div className="max-w-7xl mx-auto p-6 space-y-12">
            {selectedInternalCategory && (
              <button 
                onClick={() => setSelectedInternalCategory(null)}
                className="flex items-center gap-2 text-indigo-600 font-bold hover:text-indigo-700 bg-indigo-50 px-4 py-2 rounded-xl w-fit transition-colors"
              >
                <ChevronLeft size={20} />
                Voltar para Página Inicial da Loja
              </button>
            )}

            {!selectedInternalCategory ? (
              <>
                {/* Featured Products */}
                <section>
                  <h2 className="text-2xl font-bold mb-6">Produtos em Destaque</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {(allSupplierProducts || []).filter(p => p.organizationId === selectedSupplierId).slice(0, 4).map(p => (
                      <div key={p.id} className="border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => openProductDetail(p)}>
                        <div className="aspect-square bg-slate-100 rounded-xl mb-4 overflow-hidden">
                          {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" /> : <Package size={48} className="text-slate-300 m-auto h-full" />}
                        </div>
                        <h3 className="font-bold text-sm line-clamp-2">{p.name}</h3>
                        <p className="font-mono font-bold text-emerald-600 mt-1">{isPromo(p) ? (<span><span className="text-xs line-through text-slate-500 mr-1">R$ {p.sellPrice.toFixed(2)}</span>R$ {p.promotionalPrice?.toFixed(2)}</span>) : `R$ ${p.sellPrice.toFixed(2)}`}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Categories */}
                {supplierCategories && supplierCategories.length > 0 && (
                  <section>
                    <h2 className="text-2xl font-bold mb-6">Explore nossas Categorias</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {supplierCategories.map(cat => (
                        <div 
                          key={cat.id} 
                          onClick={() => setSelectedInternalCategory(cat.id)}
                          className="relative h-64 rounded-2xl flex items-end p-6 cursor-pointer overflow-hidden group shadow-sm hover:shadow-md transition-all"
                        >
                          {cat.imageUrl ? (
                            <img src={cat.imageUrl} alt={cat.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="absolute inset-0 bg-slate-200 w-full h-full"></div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                          <h3 className="relative text-white text-2xl font-bold z-10">{cat.name}</h3>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Most Popular */}
                <section>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Todos os Produtos</h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {(allSupplierProducts || []).filter(p => p.organizationId === selectedSupplierId).map(p => (
                      <div key={p.id} className="border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => openProductDetail(p)}>
                        <div className="aspect-square bg-slate-100 rounded-xl mb-4 overflow-hidden">
                          {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" /> : <Package size={48} className="text-slate-300 m-auto h-full" />}
                        </div>
                        <h3 className="font-bold text-sm line-clamp-2">{p.name}</h3>
                        <p className="font-mono font-bold text-emerald-600 mt-1">{isPromo(p) ? (<span><span className="text-xs line-through text-slate-500 mr-1">R$ {p.sellPrice.toFixed(2)}</span>R$ {p.promotionalPrice?.toFixed(2)}</span>) : `R$ ${p.sellPrice.toFixed(2)}`}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            ) : (
              <>
                {/* Category Filtered View */}
                <section>
                  <h2 className="text-3xl font-bold mb-8">
                    {supplierCategories.find(c => c.id === selectedInternalCategory)?.name || 'Categoria'}
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {rankedProducts.map(p => (
                      <div key={p.id} className="border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => openProductDetail(p)}>
                        <div className="aspect-square bg-slate-100 rounded-xl mb-4 overflow-hidden flex items-center justify-center">
                          {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" /> : <Package size={48} className="text-slate-300" />}
                        </div>
                        <h3 className="font-bold text-sm line-clamp-2">{p.name}</h3>
                        <p className="font-mono font-bold text-emerald-600 mt-1">{isPromo(p) ? (<span><span className="text-xs line-through text-slate-500 mr-1">R$ {p.sellPrice.toFixed(2)}</span>R$ {p.promotionalPrice?.toFixed(2)}</span>) : `R$ ${p.sellPrice.toFixed(2)}`}</p>
                      </div>
                    ))}
                    {rankedProducts.length === 0 && (
                      <div className="col-span-full py-12 text-center text-slate-500">
                        Nenhum produto encontrado nesta categoria.
                      </div>
                    )}
                  </div>
                </section>

                <div className="h-px bg-slate-200 my-12"></div>

                {/* Random Products from this store */}
                <section>
                  <h2 className="text-2xl font-bold mb-6 text-slate-800">Mais produtos dessa loja</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {(() => {
                      const otherProducts = (allSupplierProducts || [])
                        .filter(p => p.organizationId === selectedSupplierId && p.categoryId !== selectedInternalCategory)
                        .sort(() => 0.5 - Math.random())
                        .slice(0, 4);
                      
                      return otherProducts.map(p => (
                        <div key={p.id} className="border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => openProductDetail(p)}>
                          <div className="aspect-square bg-slate-100 rounded-xl mb-4 overflow-hidden flex items-center justify-center">
                            {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" /> : <Package size={48} className="text-slate-300" />}
                          </div>
                          <h3 className="font-bold text-sm line-clamp-2">{p.name}</h3>
                          <p className="font-mono font-bold text-emerald-600 mt-1">{isPromo(p) ? (<span><span className="text-xs line-through text-slate-500 mr-1">R$ {p.sellPrice.toFixed(2)}</span>R$ {p.promotionalPrice?.toFixed(2)}</span>) : `R$ ${p.sellPrice.toFixed(2)}`}</p>
                        </div>
                      ));
                    })()}
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Banner configuration from Super Admin */}
          <MarketplaceBanner />

          {/* LOJAS OFICIAIS */}
          <div className="bg-white border-b border-gray-200">
            <OfficialStores 
              suppliers={
                globalSettings?.officialStoresIds?.length 
                  ? allSuppliers.filter(s => globalSettings.officialStoresIds?.includes(s.id))
                  : allSuppliers
              } 
              onStoreClick={(id) => setSelectedSupplierId(id)}
            />
          </div>
        </>
      )}

      {/* Control Panel: Search, Filter Supplier & Shopee Sorting options */}
      <div className="p-6 space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-100 border border-slate-200 rounded-2xl p-4">
          {/* Search */}
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3.5 top-3.5 text-slate-500" size={18} />
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
            <Filter className="text-slate-500 flex-shrink-0" size={18} />
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

          {/* Location / Radius (Only active when in ALL Suppliers) */}
          {selectedSupplierId === 'ALL' && (
            <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="relative">
                  <MapPin className="absolute left-3.5 top-3.5 text-slate-500" size={18} />
                  <input
                    type="text"
                    placeholder="Filtrar por cidade (Ex: São Paulo)"
                    value={userLocation}
                    onChange={e => setUserLocation(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-900 outline-none focus:ring-1 focus:ring-orange-500 placeholder-slate-400"
                  />
               </div>
               
               <div className="flex items-center gap-4 bg-white border border-slate-300 rounded-xl px-4 py-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Raio: {searchRadius === 201 ? '+200' : searchRadius} km</span>
                  <input
                     type="range"
                     min="10"
                     max="201"
                     step="10"
                     value={searchRadius}
                     onChange={e => setSearchRadius(Number(e.target.value))}
                     className="w-full accent-orange-500"
                  />
               </div>
            </div>
          )}
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
      </div>

      <div className="p-6">
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
                <div className="flex justify-between items-center pb-2 border-b border-slate-805 border-slate-200">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Sparkles className="text-orange-600" size={18} />
                    {block.title || 'Seção Destacada'}
                  </h3>
                  <span className="text-xs text-slate-500">{block.type}</span>
                </div>

                {block.type === 'BANNER' && (
                  <div className="relative rounded-2xl overflow-hidden aspect-[21/9] bg-white border border-slate-200">
                    <img 
                      src={activeSupplierOrg.storeSettings?.banners?.[0]?.imageUrl || 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&q=80&w=1200'} 
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
                        className="bg-white border border-slate-200 rounded-xl overflow-hidden w-60 flex-shrink-0 snap-start hover:border-orange-500 cursor-pointer transition-all p-3 space-y-3"
                      >
                        <div className="aspect-square bg-slate-50 rounded-lg overflow-hidden flex items-center justify-center">
                          <img src={p.imageUrl || 'https://via.placeholder.com/150'} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div>
                          <p className="font-bold text-xs truncate text-slate-250 leading-tight">{p.name}</p>
                          <div className="flex justify-between items-center pt-2">
                            <span className="text-[#EE4D2D] font-bold font-mono text-sm">{isPromo(p) ? (<span><span className="text-xs line-through text-slate-500 mr-1">R$ {p.sellPrice.toFixed(2)}</span>R$ {p.promotionalPrice?.toFixed(2)}</span>) : `R$ ${p.sellPrice.toFixed(2)}`}</span>
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
                        className="bg-white border border-slate-200 hover:border-[#EE4D2D]/50 rounded-2xl overflow-hidden flex flex-col justify-between group transition-all cursor-pointer"
                      >
                        <div className="p-4 space-y-3">
                          <div className="aspect-square bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center relative">
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
                            <h3 className="font-bold text-slate-800 line-clamp-1 group-hover:text-amber-400">{p.name}</h3>
                            <p className="text-slate-500 text-xs line-clamp-2 h-8 mt-1">{p.description || 'Nenhuma descrição...'}</p>
                          </div>
                          <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-mono">
                            <span className="text-[#EE4D2D] font-bold text-sm">{isPromo(p) ? (<span><span className="text-xs line-through text-slate-500 mr-1">R$ {p.sellPrice.toFixed(2)}</span>R$ {p.promotionalPrice?.toFixed(2)}</span>) : `R$ ${p.sellPrice.toFixed(2)}`}</span>
                            <span className="text-[10px] text-slate-500">Estoque: {p.currentStock || 0}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {block.type === 'RELATED' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white/40 p-4 border border-slate-200 rounded-2xl">
                    {blockProducts.slice(0, 4).map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => openProductDetail(p)}
                        className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col justify-between cursor-pointer hover:border-indigo-400 transition-all"
                      >
                        <div className="aspect-square rounded-lg overflow-hidden bg-white">
                          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer"/>
                        </div>
                        <p className="font-bold text-xs truncate mt-2">{p.name}</p>
                        <p className="text-[#EE4D2D] font-bold text-xs mt-1 font-mono">{isPromo(p) ? (<span><span className="text-xs line-through text-slate-500 mr-1">R$ {p.sellPrice.toFixed(2)}</span>R$ {p.promotionalPrice?.toFixed(2)}</span>) : `R$ ${p.sellPrice.toFixed(2)}`}</p>
                      </div>
                    ))}
                  </div>
                )}

                {block.type === 'LIST' && (
                  <div className="divide-y divide-slate-850 bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    {blockProducts.map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => openProductDetail(p)}
                        className="p-4 flex items-center justify-between hover:bg-slate-50/40 cursor-pointer transition-all gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <img src={p.imageUrl} alt={p.name} className="w-12 h-12 rounded-lg object-cover" referrerPolicy="no-referrer"/>
                          <div>
                            <p className="font-bold text-xs text-slate-800">{p.name}</p>
                            <p className="text-[10px] text-slate-500 max-w-lg truncate">{p.description}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[#EE4D2D] font-bold font-mono text-sm">{isPromo(p) ? (<span><span className="text-xs line-through text-slate-500 mr-1">R$ {p.sellPrice.toFixed(2)}</span>R$ {p.promotionalPrice?.toFixed(2)}</span>) : `R$ ${p.sellPrice.toFixed(2)}`}</p>
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
            <div className="col-span-full py-16 bg-white border border-slate-200 rounded-2xl text-center text-slate-500 space-y-3">
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
                  className="bg-white border border-slate-200 hover:border-orange-500/50 rounded-2xl overflow-hidden flex flex-col justify-between group transition-all cursor-pointer relative shadow-sm hover:shadow-md"
                >
                  <div className="p-4 space-y-3.5">
                    {/* Image/Placeholder wrapper */}
                    <div className="aspect-square bg-slate-50 border border-slate-100 rounded-xl overflow-hidden flex items-center justify-center relative">
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
                        <Package className="w-12 h-12 text-slate-700 stroke-1" />
                      )}
                      
                      {/* Floating Supplier Origin Tag */}
                      <div className="absolute top-2 left-2 bg-white/90 backdrop-blur border border-slate-100 px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold text-slate-500 flex items-center gap-1 shadow-sm">
                        <Building2 size={10} className="text-orange-500" />
                        {getSupplierName(p.organizationId).toUpperCase().substring(0, 18)}
                      </div>

                      {p.isCombo && (
                        <span className="absolute top-2 right-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold text-[8px] tracking-wider py-0.5 px-2 rounded-full uppercase shadow">
                          Combo Especial
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="space-y-1">
                      <h3 className="font-bold text-slate-900 line-clamp-1 group-hover:text-orange-600 transition-colors">
                        {p.name}
                      </h3>
                      <p className="text-slate-500 text-xs line-clamp-2 h-8">
                        {p.description || 'Nenhuma descrição detalhada informada.'}
                      </p>
                    </div>

                    {/* Variations mini badge */}
                    {p.variations && p.variations.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap">
                        {p.variations.slice(0, 3).map((v, i) => (
                          <span key={i} className="text-[9px] bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                            {v.name}
                          </span>
                        ))}
                        {p.variations.length > 3 && (
                          <span className="text-[9px] text-[#EE4D2D] font-bold">+{p.variations.length - 3}</span>
                        )}
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-mono text-slate-500">VALOR UNITÁRIO</p>
                        <p className="text-base font-bold font-mono text-emerald-600">{isPromo(p) ? (<span><span className="text-xs line-through text-slate-500 mr-1">R$ {p.sellPrice.toFixed(2)}</span>R$ {p.promotionalPrice?.toFixed(2)}</span>) : `R$ ${p.sellPrice.toFixed(2)}`}</p>
                      </div>
                      <div>
                        {p.currentStock && p.currentStock <= p.minStock ? (
                          <span className="text-[10px] text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-md font-mono">Esgotando</span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono">Estoque: {p.currentStock || 0}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Buy Button */}
                  <div className="p-3 bg-slate-50 border-t border-slate-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openProductDetail(p);
                      }}
                      className="w-full py-2 bg-white border border-slate-200 hover:bg-[#EE4D2D] hover:text-white text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
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
      </div>

      {/* Cart Drawer - Sidebar slider */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-end">
          <div className="bg-white border-l border-slate-200 w-full max-w-md h-full flex flex-col text-slate-900 shadow-2xl relative">
            <div className="p-6 border-b border-slate-200 border-slate-200 flex items-center justify-between bg-slate-50/40">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <ShoppingCart className="text-orange-600" />
                Cesta de Fornecedores
              </h3>
              <button 
                onClick={() => setIsCartOpen(false)} 
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
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
                    const unitPrice = ((isPromo(item.product) && item.product.promotionalPrice) ? item.product.promotionalPrice : item.product.sellPrice) 
                      + (item.variation?.priceModifier || 0)
                      + (item.selectedOptions?.reduce((sum, opt) => sum + opt.priceModifier, 0) || 0);
                    return (
                      <div key={item.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                        <div className="flex justify-between items-start gap-3">
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm line-clamp-1">{item.product.name}</h4>
                            {item.variation && (
                              <p className="text-xs text-orange-600 font-bold mt-1">
                                Opção: {item.variation.name}
                              </p>
                            )}
                            {item.selectedOptions && item.selectedOptions.length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {item.selectedOptions.map(opt => (
                                  <p key={opt.optionId} className="text-xs text-orange-600 font-bold">
                                    {opt.groupName}: <span className="text-slate-900">{opt.optionName}</span>
                                  </p>
                                ))}
                              </div>
                            )}
                            {item.selectedTeeth && item.selectedTeeth.length > 0 && (
                              <p className="text-xs text-indigo-600 font-bold mt-1">
                                Dentes: <span className="text-slate-900">{item.selectedTeeth.join(', ')}</span>
                              </p>
                            )}
                            <p className="text-[10px] text-slate-500 font-mono uppercase mt-1">
                              FORNECEDOR: {getSupplierName(item.product.organizationId)}
                            </p>
                          </div>
                          <button 
                            onClick={() => removeFromCartList(item.id)}
                            className="text-slate-500 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                          <div className={`flex items-center bg-white border border-slate-200 rounded-lg p-0.5 ${item.selectedTeeth && item.selectedTeeth.length > 0 ? 'opacity-50 pointer-events-none' : ''}`}>
                            <button 
                              onClick={() => updateQuantity(item.id, -1)}
                              className="p-1 text-slate-500 hover:text-slate-900"
                              disabled={item.selectedTeeth && item.selectedTeeth.length > 0}
                            >
                              <Minus size={14} />
                            </button>
                            <span className="px-3 text-sm font-bold font-mono text-slate-800">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.id, 1)}
                              className="p-1 text-slate-500 hover:text-slate-900"
                              disabled={item.selectedTeeth && item.selectedTeeth.length > 0}
                            >
                              <Plus size={14} />
                            </button>
                          </div>

                          <span className="font-mono text-xs font-bold text-emerald-600">
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
              <div className="p-6 border-t border-slate-200 bg-slate-50/40 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-500 text-sm">VALOR TOTAL DO PEDIDO:</span>
                  <span className="font-mono text-xl font-bold text-teal-600">R$ {cartTotals.finalTotal.toFixed(2)}</span>
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
          <div className="bg-white border border-slate-200 w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl text-slate-900 flex flex-col max-h-[92vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">DETALHES DO PRODUTO:</span>
                <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded uppercase font-bold">
                  {getSupplierName(selectedItemForDetail.organizationId)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleShareProduct(selectedItemForDetail)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg hover:bg-indigo-50 transition-colors"
                >
                  <ClipboardCheck size={14} /> Compartilhar Produto
                </button>
                <button 
                  onClick={() => setSelectedItemForDetail(null)}
                  className="text-slate-500 hover:text-slate-900 p-2"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Visual Images Slider */}
                <div className="space-y-3">
                  <div className="aspect-square bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden flex items-center justify-center p-2">
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
                      className={`w-14 h-14 bg-slate-50 rounded-xl overflow-hidden cursor-pointer border ${
                        detailActiveImg === selectedItemForDetail.imageUrl ? 'border-orange-500' : 'border-slate-200'
                      }`}
                    >
                      <img src={selectedItemForDetail.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    {selectedItemForDetail.imageUrls && selectedItemForDetail.imageUrls.map((url, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setDetailActiveImg(url)}
                        className={`w-14 h-14 bg-slate-50 rounded-xl overflow-hidden cursor-pointer border ${
                          detailActiveImg === url ? 'border-orange-500' : 'border-slate-200'
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
                    <h2 className="text-xl font-bold text-slate-900">{selectedItemForDetail.name}</h2>
                    <p className="text-xs text-slate-500 mt-1 font-mono">SKU: {selectedItemForDetail.code || 'S/ SKU'}</p>
                  </div>

                  {/* Combo contents list */}
                  {selectedItemForDetail.isCombo && selectedItemForDetail.comboItems && selectedItemForDetail.comboItems.length > 0 && (
                    <div className="p-3 bg-purple-950/25 border border-purple-900/30 rounded-xl space-y-1.5">
                      <p className="text-[10px] text-purple-600 font-bold uppercase tracking-wider">Insumos inclusos no Combo:</p>
                      <div className="space-y-1">
                        {selectedItemForDetail.comboItems.map((c, i) => (
                          <div key={i} className="flex justify-between items-center text-xs">
                            <span className="text-slate-700">• {c.name}</span>
                            <span className="text-[#EE4D2D] font-bold">x{c.quantity} un</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Variation Picker Options (LEGACY MODEL) */}
                  {selectedItemForDetail.variations && selectedItemForDetail.variations.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Selecione uma Opção (Variação):</label>
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
                                ? 'border-orange-500 bg-orange-500/10 text-orange-600' 
                                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {v.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Variation Groups Picker (NEW MODEL) */}
                  {selectedItemForDetail.variationGroups && selectedItemForDetail.variationGroups.length > 0 && (
                    <div className="space-y-4">
                      {selectedItemForDetail.variationGroups.map(group => (
                        <div key={group.id} className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                            {group.name} {group.selectionType === 'MULTIPLE' ? '(Múltipla Escolha)' : '(Escolha Única)'}
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {group.options.map(opt => {
                              const isSelected = detailSelectedOptions.some(o => o.groupId === group.id && o.optionId === opt.id);
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => {
                                    if (opt.imageUrl) {
                                      setDetailActiveImg(opt.imageUrl);
                                    }
                                    setDetailSelectedOptions(prev => {
                                      if (group.selectionType === 'SINGLE') {
                                        // Replace if same group
                                        const filtered = prev.filter(o => o.groupId !== group.id);
                                        return [...filtered, {
                                          groupId: group.id,
                                          groupName: group.name,
                                          optionId: opt.id,
                                          optionName: opt.name,
                                          priceModifier: opt.priceModifier
                                        }];
                                      } else {
                                        // Toggle for multiple
                                        if (isSelected) {
                                          return prev.filter(o => !(o.groupId === group.id && o.optionId === opt.id));
                                        } else {
                                          return [...prev, {
                                            groupId: group.id,
                                            groupName: group.name,
                                            optionId: opt.id,
                                            optionName: opt.name,
                                            priceModifier: opt.priceModifier
                                          }];
                                        }
                                      }
                                    });
                                  }}
                                  className={`px-3 py-2 border rounded-xl text-xs font-bold transition-all flex flex-col items-start ${
                                    isSelected 
                                      ? 'border-orange-500 bg-orange-500/10 text-orange-600' 
                                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  <span>{opt.name}</span>
                                  {opt.priceModifier > 0 && (
                                    <span className="text-[10px] font-mono opacity-80">+ R$ {opt.priceModifier.toFixed(2)}</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Dynamic Price Display */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] text-slate-500 font-mono">PREÇO CONFIGURADO</p>
                      <p className="text-2xl font-bold font-mono text-emerald-600">
                        R$ {(
                          ((isPromo(selectedItemForDetail) && selectedItemForDetail.promotionalPrice) ? selectedItemForDetail.promotionalPrice : selectedItemForDetail.sellPrice) 
                          + (detailSelectedVar?.priceModifier || 0)
                          + detailSelectedOptions.reduce((sum, opt) => sum + opt.priceModifier, 0)
                        ).toFixed(2)}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-[9px] text-slate-500 font-mono">ESTOQUE DISPONÍVEL</p>
                      <p className="text-sm font-bold text-slate-700 font-mono">
                        {(detailSelectedVar ? detailSelectedVar.currentStock : selectedItemForDetail.currentStock) || 0} un
                      </p>
                    </div>
                  </div>

                  {/* Action insert to Cesta */}
                  <button
                    onClick={() => {
                      addToCart(selectedItemForDetail, detailSelectedVar, detailSelectedOptions);
                      setSelectedItemForDetail(null);
                    }}
                    className="w-full py-3 bg-[#EE4D2D] hover:bg-orange-600 text-white font-bold rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <ShoppingCart size={16} /> Adicionar Esta Especificação à Cesta
                  </button>

                  {/* Specifications (Expandable) */}
                  <div className="text-sm text-slate-700 mt-6 border-t border-slate-100 pt-4">
                    <h4 className="font-bold mb-2">Especificações</h4>
                    <div className={`transition-all duration-300 ${isDescExpanded ? 'max-h-96 overflow-y-auto' : 'max-h-20 overflow-hidden'}`}>
                      {selectedItemForDetail.description || 'Nenhum detalhe adicional fornecido para este produto.'}
                    </div>
                    {selectedItemForDetail.description && selectedItemForDetail.description.length > 150 && (
                      <button onClick={() => setIsDescExpanded(!isDescExpanded)} className="text-orange-600 font-bold mt-2 text-xs">
                        {isDescExpanded ? 'Ver menos' : 'Ver mais'}
                      </button>
                    )}
                  </div>
                  
                  {/* Reviews Section */}
                  <ProductReviews productId={selectedItemForDetail.id} />
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl text-slate-900 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/40">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <ClipboardCheck className="text-indigo-600" />
                Finalizar Pedido
              </h3>
              <button 
                onClick={() => setIsCheckoutOpen(false)} 
                className="text-slate-500 hover:text-slate-900">
                ✕
              </button>
            </div>

            <form onSubmit={handleCheckout} className="p-6 overflow-y-auto space-y-5">
              {/* Shipping Method */}
              <div className="space-y-3 mb-4">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Opções de Frete</label>
                
                {(cart.length > 0 && allSuppliers.find(s => s.id === cart[0].product.organizationId)?.frenetToken) ? (
                  <div className="space-y-2">
                    {isQuotingShipping ? (
                      <div className="p-4 text-center text-slate-500 text-sm animate-pulse border border-slate-200 rounded-xl bg-slate-50">
                        Calculando frete com Frenet...
                      </div>
                    ) : shippingError ? (
                      <div className="p-4 text-center text-red-500 text-sm border border-red-200 rounded-xl bg-red-50">
                        {shippingError}
                      </div>
                    ) : shippingQuotes.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2">
                        {shippingQuotes.map((quote: any, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setShippingMethod('FRENET');
                              setSelectedShippingService(quote);
                            }}
                            className={`p-3 rounded-xl border text-left flex justify-between items-center transition-all ${
                              shippingMethod === 'FRENET' && selectedShippingService?.ServiceCode === quote.ServiceCode
                                ? 'border-indigo-500 bg-indigo-50 text-indigo-600' 
                                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <div className="font-bold text-sm">
                              {quote.ServiceDescription}
                              <div className="text-xs font-normal opacity-70">Prazo: {quote.DeliveryTime} dias úteis</div>
                            </div>
                            <div className="font-bold">
                              R$ {Number(quote.ShippingPrice).toFixed(2)}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-slate-500 text-sm border border-slate-200 rounded-xl bg-slate-50">
                        Insira seu CEP para calcular o frete ou selecione "Combinar com o vendedor".
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShippingMethod('COMBINE');
                      setSelectedShippingService(null);
                    }}
                    className={`p-3 rounded-xl border text-left font-bold text-sm transition-all ${
                      shippingMethod === 'COMBINE' 
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-600' 
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Combinar com o vendedor
                  </button>
                </div>
              </div>

              

              {/* Payment handled by Asaas Checkout */}
              {/* Delivery Address */}
              <div className="space-y-3.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Endereço para Entrega</label>
                
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-3">
                    <input
                      type="text"
                      required
                      placeholder="Rua / Avenida"
                      value={address.street}
                      onChange={e => setAddress(prev => ({ ...prev, street: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      type="text"
                      required
                      placeholder="Nº"
                      value={address.number}
                      onChange={e => setAddress(prev => ({ ...prev, number: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Complemento"
                      value={address.complement}
                      onChange={e => setAddress(prev => ({ ...prev, complement: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      required
                      placeholder="Bairro"
                      value={address.neighborhood}
                      onChange={e => setAddress(prev => ({ ...prev, neighborhood: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      required
                      placeholder="Cidade"
                      value={address.city}
                      onChange={e => setAddress(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 text-center uppercase"
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      type="text"
                      required
                      placeholder="CEP"
                      value={address.zipCode}
                      onChange={e => setAddress(prev => ({ ...prev, zipCode: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Observações do Pedido (Opcional)</label>
                <textarea
                  placeholder="Instruções para despacho ou entrega..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none h-16 resize-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              
              {/* Cupom de Desconto */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Cupom de Desconto</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCodeInput}
                    onChange={e => setCouponCodeInput(e.target.value.toUpperCase())}
                    disabled={appliedCoupon !== null}
                    placeholder="Insira o código do cupom"
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 uppercase disabled:opacity-50"
                  />
                  {!appliedCoupon ? (
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={checkingCoupon || !couponCodeInput}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {checkingCoupon ? '...' : 'Aplicar'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setAppliedCoupon(null); setCouponCodeInput(''); }}
                      className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-bold rounded-lg transition-colors"
                    >
                      Remover
                    </button>
                  )}
                </div>
                {couponError && <p className="text-red-600 text-xs">{couponError}</p>}
                {appliedCoupon && (
                  <p className="text-emerald-600 text-xs flex items-center gap-1">
                    <Check size={12} /> Cupom {appliedCoupon.code} aplicado com sucesso!
                  </p>
                )}
              </div>


              {/* Order summary breakdown */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span>R$ {cartTotals.baseTotal.toFixed(2)}</span>
                </div>
                {cartTotals.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Desconto ({appliedCoupon?.code})</span>
                    <span>- R$ {cartTotals.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500">
                  <span>Frete / Despacho</span>
                  <span className="text-emerald-600 font-semibold uppercase">Grátis</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm text-slate-900">
                  <span>Total a Pagar</span>
                  <span className="font-mono text-teal-600">R$ {cartTotals.finalTotal.toFixed(2)}</span>
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

      </>
      )}

      {activeTab === 'MY_ORDERS' && <MyOrdersTab />}
      
            {/* Success Modal */}
      {orderSuccess && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl text-slate-900 p-6 space-y-6 text-center">
            <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <Check size={36} />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold">Pedido Efetuado com Sucesso!</h3>
              <p className="text-slate-500 text-xs">
                Seu pedido foi registrado e encaminhado diretamente ao fornecedor para faturamento e despacho.
              </p>
            </div>

            {orderSuccess.paymentMethod === 'PIX' ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5">
                <span className="text-[10px] font-mono text-[#EE4D2D] uppercase font-black">PAGAMENTO VIA PIX (ASAAS)</span>
                <div className="w-32 h-32 bg-white rounded-lg mx-auto flex items-center justify-center text-slate-900 text-xs font-mono font-bold">
                  [ QR CODE PIX ]
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-slate-500">Pix Copia e Cola:</span>
                  <span className="text-xs font-mono text-slate-800 break-all select-all">{orderSuccess.asaasPixCopyPaste}</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed max-w-xs mx-auto">
                  Escaneie o QR Code PIX ou copie o código acima para efetuar a transferência direta via Asaas.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-3">
                <p className="text-emerald-600 font-bold">Transação via Asaas Gerada!</p>
                <a href={orderSuccess.asaasInvoiceUrl} target="_blank" rel="noreferrer" className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors">
                  Acessar Fatura Asaas
                </a>
                <p className="text-slate-500">Verifique os detalhes na fatura do seu cartão ou acesse o link acima.</p>
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
