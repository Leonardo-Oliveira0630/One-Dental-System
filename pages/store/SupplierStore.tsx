import React, { useState, useMemo, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { useApp } from '../../context/AppContext';
import { InventoryItem, Organization, SupplierOrder } from '../../types';
import { useNavigate, useLocation } from 'react-router-dom';
import * as api from '../../services/firebaseService';

// Subcomponents & Modals
import { MarketplaceBanner } from '../../components/MarketplaceBanner';
import { OfficialStores } from '../../components/OfficialStores';
import { MyOrdersTab } from './MyOrdersTab';
import { StoreProductCard } from './components/StoreProductCard';
import { StoreProductDetailModal } from './components/StoreProductDetailModal';
import { StoreCartDrawer, SupplierCartItem } from './components/StoreCartDrawer';
import { StoreCheckoutModal } from './components/StoreCheckoutModal';
import { StoreHeroBanner } from './components/StoreHeroBanner';
import { StoreCategoryNav } from './components/StoreCategoryNav';
import { SupplierStoreChatModal } from './components/SupplierStoreChatModal';

import { 
  ShoppingBag, Search, Filter, ShoppingCart, 
  MapPin, Check, Sparkles, Building2, Package, 
  ChevronLeft, ArrowUpDown, X, Tag, MessageSquare
} from 'lucide-react';

type SortOption = 'RELEVANCE' | 'LATEST' | 'SALES' | 'PRICE_ASC' | 'PRICE_DESC';

export const SupplierStore = () => {
  const { 
    allSuppliers, 
    allSupplierProducts, 
    addSupplierOrder, 
    supplierOrders, 
    updateSupplierOrder, 
    currentUser, 
    currentOrg, 
    globalSettings 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('ALL');
  const [selectedMarketplaceCategoryId, setSelectedMarketplaceCategoryId] = useState<string | null>(null);
  const [selectedInternalCategory, setSelectedInternalCategory] = useState<string | null>(null);
  const [supplierCategories, setSupplierCategories] = useState<any[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>('RELEVANCE');
  const [userLocation, setUserLocation] = useState('');
  const [searchRadius, setSearchRadius] = useState<number>(50);
  const [showLocationFilter, setShowLocationFilter] = useState(false);

  // Cart State
  const [cart, setCart] = useState<SupplierCartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [notes, setNotes] = useState('');
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<SupplierOrder | null>(null);
  const [buyerOrders, setBuyerOrders] = useState<SupplierOrder[]>([]);
  const [isCheckingPaymentOrder, setIsCheckingPaymentOrder] = useState(false);

  // Chat Modal State
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatInitialSupplierId, setChatInitialSupplierId] = useState<string | undefined>(undefined);
  const [chatInitialSupplierName, setChatInitialSupplierName] = useState<string | undefined>(undefined);
  const [chatInitialOrderId, setChatInitialOrderId] = useState<string | undefined>(undefined);
  const [chatInitialProduct, setChatInitialProduct] = useState<any | undefined>(undefined);

  // Subscribe to buyer orders to monitor payment confirmations in real-time
  useEffect(() => {
    if (!currentOrg) return;
    const unsub = api.subscribeBuyerSupplierOrders(currentOrg.id, (loadedOrders) => {
      setBuyerOrders(loadedOrders);
      
      // Check if any order was just confirmed/paid to clear the corresponding cart
      const hasRecentPaid = loadedOrders.some(
        (o) => o.paymentStatus === 'PAID' && Date.now() - new Date(o.createdAt).getTime() < 1000 * 60 * 30
      );
      // Auto clear cart if payment succeeded
    });
    return () => unsub();
  }, [currentOrg]);

  const pendingBuyerOrders = useMemo(() => {
    return buyerOrders.filter(
      (o) => (o.paymentStatus === 'PENDING' || o.status === 'PENDING') && o.status !== 'CANCELLED'
    );
  }, [buyerOrders]);

  const handleCheckPayment = async (orderId: string) => {
    setIsCheckingPaymentOrder(true);
    try {
      const res = await api.apiCheckSupplierOrderPayment(orderId);
      if (res.paid) {
        saveCartToStorage([]);
        setCart([]);
        const found = buyerOrders.find((o) => o.id === orderId);
        if (found) {
          setOrderSuccess({ ...found, paymentStatus: 'PAID' });
        }
        setIsCartOpen(false);
        setActiveTab('MY_ORDERS');
      } else {
        alert('Pagamento ainda não identificado no Asaas. Por favor, conclua a transação via PIX ou Boleto.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao verificar status do pagamento.');
    } finally {
      setIsCheckingPaymentOrder(false);
    }
  };

  const handleCancelPendingOrder = async (orderId: string) => {
    try {
      await api.apiCancelSupplierOrder(orderId);
    } catch (err) {
      console.error(err);
    }
  };

  // Coupon State
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [couponError, setCouponError] = useState('');
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  // Detail Modal & Navigation State
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<InventoryItem | null>(null);
  const [activeTab, setActiveTab] = useState<'STORE' | 'MY_ORDERS'>('STORE');
  const [shippingMethod, setShippingMethod] = useState<'COMBINE' | 'PAC' | 'SEDEX' | 'FRENET' | 'PICKUP' | 'MOTOBOY'>('COMBINE');
  const [shippingQuotes, setShippingQuotes] = useState<any[]>([]);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [isQuotingShipping, setIsQuotingShipping] = useState(false);
  const [selectedShippingService, setSelectedShippingService] = useState<any>(null);
  const [bannerIndex, setBannerIndex] = useState(0);

  const navigate = useNavigate();
  const location = useLocation();

  // Load URL Search Params
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

  // Active supplier organization
  const activeSupplierOrg = useMemo(() => {
    if (selectedSupplierId === 'ALL') return null;
    return allSuppliers.find(s => s.id === selectedSupplierId) || null;
  }, [allSuppliers, selectedSupplierId]);

  // Fetch supplier internal categories when specific supplier is active
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

  // Rotate supplier banners
  useEffect(() => {
    if (activeSupplierOrg?.storeSettings?.banners && activeSupplierOrg.storeSettings.banners.length > 1) {
      const interval = setInterval(() => {
        setBannerIndex((prev) => (prev + 1) % activeSupplierOrg.storeSettings!.banners!.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [activeSupplierOrg]);

  // Auto-fill address fallback from current organization or user
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

  // Auto-fill CPF / CNPJ
  useEffect(() => {
    if (currentOrg?.cpfCnpj) {
      setCpfCnpj(currentOrg.cpfCnpj);
    } else if (currentOrg?.financialSettings?.techResponsibleCpf) {
      setCpfCnpj(currentOrg.financialSettings.techResponsibleCpf);
    } else if (currentUser?.cpfCnpj) {
      setCpfCnpj(currentUser.cpfCnpj);
    }
  }, [currentOrg, currentUser]);

  // Load Cart from LocalStorage
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

  const saveCartToStorage = (newCart: SupplierCartItem[]) => {
    setCart(newCart);
    localStorage.setItem('supplier_cart_data_new', JSON.stringify(newCart));
  };

  const isPromo = (jt: any) => {
    if (jt.isPromotion === true) return true;
    if (jt.isPromotion === false) return false;
    return jt.isPromotion || !!jt.originalJobTypeId || !!jt.promotionQuantity || jt.isVoucherCombo === true;
  };

  // Filtered & Ranked Products
  const rankedProducts = useMemo(() => {
    const raw = (allSupplierProducts || []).filter(p => p.isVisibleInStore !== false);
    
    // 1. Score items based on relevance
    const scoredList = raw.map(product => {
      let score = 0;
      const titleLower = product.name.toLowerCase();
      const descLower = (product.description || '').toLowerCase();
      const qLower = searchQuery.toLowerCase().trim();

      if (qLower) {
        if (titleLower.includes(qLower)) {
          score += 50;
          if (titleLower.startsWith(qLower)) score += 20;
        }
        const parts = qLower.split(/\s+/);
        parts.forEach(part => {
          if (titleLower.includes(part)) score += 10;
          if (descLower.includes(part)) score += 3;
        });
      } else {
        score += 10;
      }

      if (product.isCombo) score += 15;
      if (product.variations && product.variations.length > 0) score += 10;
      const supplier = allSuppliers.find(s => s.id === product.organizationId);
      if (supplier?.ratingAverage) {
        score += supplier.ratingAverage * 2;
      }

      return { product, score };
    });

    // 2. Filter by supplier
    let currentFiltered = scoredList;
    if (selectedSupplierId !== 'ALL') {
      currentFiltered = scoredList.filter(item => item.product.organizationId === selectedSupplierId);
    }
    
    // Filter by marketplace category
    if (selectedMarketplaceCategoryId) {
      currentFiltered = currentFiltered.filter(item => 
        item.product.marketplaceCategoryIds?.includes(selectedMarketplaceCategoryId)
      );
    }
    
    // Filter by supplier internal category
    if (selectedInternalCategory) {
      currentFiltered = currentFiltered.filter(item => item.product.categoryId === selectedInternalCategory);
    }

    // Filter by location/radius
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
        return true;
      });
    }

    // 3. Sort options
    switch (sortOption) {
      case 'LATEST':
        currentFiltered.sort((a, b) => b.product.id.localeCompare(a.product.id));
        break;
      case 'SALES':
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
        currentFiltered.sort((a, b) => b.score - a.score);
        break;
    }

    return currentFiltered.map(item => item.product);
  }, [allSupplierProducts, searchQuery, selectedSupplierId, sortOption, allSuppliers, selectedMarketplaceCategoryId, selectedInternalCategory, userLocation, searchRadius]);

  // Product Count map per category for active supplier
  const categoryCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    (allSupplierProducts || []).forEach(p => {
      if (selectedSupplierId !== 'ALL' && p.organizationId !== selectedSupplierId) return;
      if (p.categoryId) {
        map[p.categoryId] = (map[p.categoryId] || 0) + 1;
      }
    });
    return map;
  }, [allSupplierProducts, selectedSupplierId]);

  const getSupplierName = (orgId: string) => {
    return allSuppliers.find(s => s.id === orgId)?.name || 'Fornecedor Parceiro';
  };

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

  const addToCart = (
    product: InventoryItem, 
    customVar?: any, 
    selectedOptions?: any[], 
    addQty: number = 1
  ) => {
    if (product.organizationId === currentOrg?.id) {
      alert('Você não pode comprar produtos da sua própria loja.');
      return;
    }

    let cartItemId = product.id;
    if (customVar) cartItemId += `_var_${customVar.id}`;
    if (selectedOptions && selectedOptions.length > 0) {
      const optsHash = selectedOptions.map(o => o.optionId).sort().join('_');
      cartItemId += `_opts_${optsHash}`;
    }

    const existing = cart.find(item => item.id === cartItemId);
    const availableStock = customVar ? (customVar.currentStock ?? product.currentStock) : product.currentStock;

    if (existing) {
      if (existing.quantity + addQty > (availableStock || 999)) {
        alert('Toda a quantidade desse estoque já está no seu carrinho.');
        return;
      }
      const updated = cart.map(item => 
        item.id === cartItemId ? { ...item, quantity: item.quantity + addQty } : item
      );
      saveCartToStorage(updated);
    } else {
      const targetCartItem: SupplierCartItem = {
        id: cartItemId,
        product,
        quantity: addQty,
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
        alert('Limite do estoque atingido.');
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

  // Cart Totals Calculator
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
    
    return { 
      baseTotal, 
      discount, 
      finalTotal: Math.max(0, baseTotal - discount) + (selectedShippingService?.ShippingPrice ? Number(selectedShippingService.ShippingPrice) : 0) 
    };
  }, [cart, appliedCoupon, selectedShippingService]);

  // Auto-quote shipping when address CEP changes
  useEffect(() => {
    const firstSupplierId = cart.length > 0 ? cart[0].product.organizationId : null;
    const supplier = firstSupplierId ? allSuppliers.find(s => s.id === firstSupplierId) : null;
    
    if (
      address.zipCode && 
      address.zipCode.length >= 8 && 
      supplier?.frenetToken && 
      shippingMethod !== 'PICKUP' && 
      shippingMethod !== 'MOTOBOY'
    ) {
      handleQuoteShipping(address.zipCode, supplier.frenetToken, supplier.cep || '01001000');
    }
  }, [address.zipCode, cart, allSuppliers, shippingMethod]);

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

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || !currentUser || !currentOrg) return;

    setIsProcessing(true);

    try {
      const itemsBySupplier: Record<string, SupplierCartItem[]> = {};
      cart.forEach(item => {
        const supId = item.product.organizationId;
        if (!itemsBySupplier[supId]) itemsBySupplier[supId] = [];
        itemsBySupplier[supId].push(item);
      });

      let lastOrder: SupplierOrder | null = null;

      for (const [supId, items] of Object.entries(itemsBySupplier)) {
        const orderId = `order_sup_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const supBaseTotal = items.reduce((sum, i) => {
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
            supDiscount = appliedCoupon.discountType === 'PERCENTAGE' 
              ? (applicableSupTotal * (appliedCoupon.discountValue / 100)) 
              : Math.min(appliedCoupon.discountValue, applicableSupTotal);
          } else {
            supDiscount = appliedCoupon.discountType === 'PERCENTAGE' 
              ? (supBaseTotal * (appliedCoupon.discountValue / 100)) 
              : Math.min(appliedCoupon.discountValue, supBaseTotal);
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
            if (i.variation) itemName += ` (Opção: ${i.variation.name})`;
            if (i.selectedOptions && i.selectedOptions.length > 0) {
              itemName += ` [${i.selectedOptions.map(o => o.optionName).join(', ')}]`;
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
          trackingInfo: selectedShippingService 
            ? `${selectedShippingService.ServiceDescription}` 
            : shippingMethod === 'PICKUP' 
            ? 'Retirada em Mãos (No Balcão do Fornecedor)' 
            : shippingMethod === 'MOTOBOY' 
            ? 'Entrega Expressa por Motoboy (Envio Direto)' 
            : 'A Combinar Diretamente com Fornecedor',
          paymentMethod: 'BOLETO',
          buyerAddress: address
        };

        const result: any = await api.apiCreateSupplierPayment(newOrder, { cpfCnpj: cpfCnpj.replace(/\D/g, '') });

        if (result && result.success && result.invoiceUrl) {
          lastOrder = { ...newOrder, asaasInvoiceUrl: result.invoiceUrl } as SupplierOrder;
        } else {
          throw new Error("Falha ao gerar link de pagamento");
        }
      }

      // Note: We deliberately KEEP the items in the cart until the payment is confirmed.
      setNotes('');
      setIsCheckoutOpen(false);
      
      if (lastOrder) {
        setOrderSuccess(lastOrder);
        if (lastOrder.asaasInvoiceUrl) {
          window.open(lastOrder.asaasInvoiceUrl, '_blank');
        }
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao processar seu pedido. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <main id="supplier-store-container" className="h-full w-full overflow-y-auto bg-zinc-50/50 dark:bg-[#0B0F17] text-zinc-900 dark:text-slate-100 pb-24 font-sans block transition-colors">
      
      {/* 1. TOP STORE NAVBAR (Your Next Store signature clean navigation) */}
      <nav className="sticky top-0 z-30 bg-white/95 dark:bg-[#131B2A]/95 backdrop-blur-md border-b border-zinc-200/80 dark:border-slate-800 px-4 sm:px-6 py-3 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Segmented View Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-slate-800/80 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setSelectedSupplierId('ALL');
                setSelectedInternalCategory(null);
                setActiveTab('STORE');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'STORE'
                  ? 'bg-white dark:bg-slate-700 text-zinc-950 dark:text-white shadow-xs'
                  : 'text-zinc-600 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Loja de Fornecedores
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('MY_ORDERS')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'MY_ORDERS'
                  ? 'bg-white dark:bg-slate-700 text-zinc-950 dark:text-white shadow-xs'
                  : 'text-zinc-600 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Meus Pedidos
            </button>
          </div>

          {/* Quick Cart & Chat Pill Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                setChatInitialSupplierId(selectedSupplierId !== 'ALL' ? selectedSupplierId : undefined);
                setChatInitialSupplierName(activeSupplierOrg?.name);
                setChatInitialOrderId(undefined);
                setIsChatModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-zinc-100 dark:bg-slate-800 hover:bg-zinc-200 dark:hover:bg-slate-700 text-zinc-900 dark:text-slate-100 rounded-xl transition-all text-xs font-bold border border-zinc-200 dark:border-slate-700"
              title="Chat com Fornecedores"
            >
              <MessageSquare size={15} className="text-zinc-700 dark:text-slate-300" />
              <span className="hidden sm:inline">Mensagens</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="group relative flex items-center gap-2.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-md active:scale-95 text-xs font-bold"
            >
              <ShoppingCart size={15} />
              <span className="hidden sm:inline">Carrinho</span>
              {totalCartCount > 0 && (
                <span className="px-1.5 py-0.2 bg-white text-blue-700 rounded-full font-mono text-[10px] font-black">
                  {totalCartCount}
                </span>
              )}
              {cartTotals.finalTotal > 0 && (
                <span className="hidden md:inline pl-1 border-l border-blue-400 font-mono">
                  R$ {cartTotals.finalTotal.toFixed(2)}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* 2. MAIN STORE CONTENT */}
      {activeTab === 'STORE' && (
        <div className="space-y-6">
          
          {/* Dynamic Hero Banner for Selected Supplier vs General Marketplace */}
          {selectedSupplierId !== 'ALL' && activeSupplierOrg ? (
            <StoreHeroBanner
              supplierOrg={activeSupplierOrg}
              bannerIndex={bannerIndex}
              onShareStore={handleShareStore}
              onBackToAllStores={() => {
                setSelectedSupplierId('ALL');
                setSelectedInternalCategory(null);
              }}
              productCount={(allSupplierProducts || []).filter(p => p.organizationId === selectedSupplierId).length}
            />
          ) : (
            <>
              {/* General Marketplace Banner */}
              <MarketplaceBanner />

              {/* Official Stores Carousel */}
              <div className="bg-white dark:bg-[#131B2A] border-b border-zinc-200/80 dark:border-slate-800 transition-colors">
                <OfficialStores 
                  suppliers={
                    globalSettings?.officialStoresIds?.length 
                      ? allSuppliers.filter(s => globalSettings.officialStoresIds?.includes(s.id))
                      : allSuppliers
                  } 
                  onStoreClick={(id) => {
                    setSelectedSupplierId(id);
                    setSelectedInternalCategory(null);
                  }}
                />
              </div>
            </>
          )}

          {/* 3. STORE CONTROLS TOOLBAR (Search, Categories, Sorting, Radius) */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 space-y-4">
            
            {/* Search and Supplier Selection Bar */}
            <div className="bg-white dark:bg-[#131B2A] p-3 sm:p-4 rounded-2xl border border-zinc-200/80 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                {/* Search Input */}
                <div className="md:col-span-6 relative">
                  <Search className="absolute left-3.5 top-3 text-zinc-400 dark:text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Pesquisar insumo, resina, equipamento, marca..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-50/70 dark:bg-slate-800/80 border border-zinc-200 dark:border-slate-700 rounded-xl pl-10 pr-9 py-2.5 text-xs text-zinc-900 dark:text-white outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 placeholder-zinc-400 dark:placeholder-slate-400 font-medium transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-3 text-zinc-400 dark:text-slate-400 hover:text-zinc-700 dark:hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Supplier Dropdown Switcher */}
                <div className="md:col-span-4 relative">
                  <Building2 className="absolute left-3.5 top-3 text-zinc-400 dark:text-slate-400" size={16} />
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => {
                      setSelectedSupplierId(e.target.value);
                      setSelectedInternalCategory(null);
                    }}
                    className="w-full bg-zinc-50/70 dark:bg-slate-800/80 border border-zinc-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-900 dark:text-white outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 font-bold transition-all cursor-pointer"
                  >
                    <option value="ALL">Todos os Fornecedores</option>
                    {allSuppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.city ? `(${s.city}-${s.state || ''})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Location Filter Toggle */}
                {selectedSupplierId === 'ALL' && (
                  <div className="md:col-span-2">
                    <button
                      type="button"
                      onClick={() => setShowLocationFilter(!showLocationFilter)}
                      className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        showLocationFilter || userLocation
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-zinc-200 dark:border-slate-700 bg-zinc-50/70 dark:bg-slate-800/80 text-zinc-700 dark:text-slate-200 hover:bg-zinc-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <MapPin size={14} />
                      <span>{userLocation ? userLocation : 'Localização'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Expandable Location Filter */}
              {selectedSupplierId === 'ALL' && showLocationFilter && (
                <div className="p-3 bg-zinc-50 dark:bg-slate-800/50 rounded-xl border border-zinc-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 text-zinc-400 dark:text-slate-400" size={15} />
                    <input
                      type="text"
                      placeholder="Filtrar por cidade ou estado..."
                      value={userLocation}
                      onChange={(e) => setUserLocation(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-3 bg-white dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-lg px-3 py-1.5">
                    <span className="text-[10px] font-bold text-zinc-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      Raio: {searchRadius > 200 ? '+200' : searchRadius} km
                    </span>
                    <input
                      type="range"
                      min="10"
                      max="201"
                      step="10"
                      value={searchRadius}
                      onChange={(e) => setSearchRadius(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* Sorting Pills Toolbar */}
              <div className="flex flex-wrap items-center justify-between text-xs gap-2 pt-2 border-t border-zinc-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-zinc-400 dark:text-slate-400 text-[11px] font-medium mr-1 flex items-center gap-1">
                    <ArrowUpDown size={12} /> Ordenar:
                  </span>

                  {[
                    { id: 'RELEVANCE', label: 'Relevância' },
                    { id: 'SALES', label: 'Mais Vendidos' },
                    { id: 'PRICE_ASC', label: 'Menor Preço' },
                    { id: 'PRICE_DESC', label: 'Maior Preço' },
                    { id: 'LATEST', label: 'Recentes' }
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSortOption(s.id as SortOption)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        sortOption === s.id
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-zinc-100 dark:bg-slate-800 text-zinc-600 dark:text-slate-300 hover:bg-zinc-200/70 dark:hover:bg-slate-700'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <span className="text-[11px] font-mono text-zinc-500 dark:text-slate-400">
                  {rankedProducts.length} {rankedProducts.length === 1 ? 'produto' : 'produtos'}
                </span>
              </div>
            </div>

            {/* Horizontal Category Pill Carousel */}
            {selectedSupplierId !== 'ALL' && supplierCategories.length > 0 && (
              <StoreCategoryNav
                categories={supplierCategories}
                selectedCategoryId={selectedInternalCategory}
                onSelectCategory={setSelectedInternalCategory}
                totalProductsCount={(allSupplierProducts || []).filter(p => p.organizationId === selectedSupplierId).length}
                categoryCountMap={categoryCountMap}
              />
            )}
          </section>

          {/* 4. PRODUCT GRID (Your Next Store signature clean grid) */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6">
            {rankedProducts.length === 0 ? (
              <div className="py-20 bg-white dark:bg-[#131B2A] rounded-3xl border border-zinc-200/80 dark:border-slate-800 text-center text-zinc-400 space-y-3 p-6 transition-colors">
                <Package size={48} strokeWidth={1} className="mx-auto text-zinc-300 dark:text-slate-600" />
                <div className="space-y-1">
                  <h3 className="font-extrabold text-base text-zinc-800 dark:text-slate-100">
                    Nenhum produto encontrado
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-slate-400 max-w-sm mx-auto">
                    Tente ajustar seus termos de busca, filtros ou selecionar outro fornecedor parceiro.
                  </p>
                </div>
                {(searchQuery || selectedInternalCategory || userLocation) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedInternalCategory(null);
                      setUserLocation('');
                    }}
                    className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all shadow-xs"
                  >
                    Limpar Filtros
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
                {rankedProducts.map((p) => (
                  <StoreProductCard
                    key={p.id}
                    product={p}
                    supplierName={getSupplierName(p.organizationId)}
                    onOpenDetail={(prod) => setSelectedItemForDetail(prod)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* 5. MY ORDERS TAB */}
      {activeTab === 'MY_ORDERS' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <MyOrdersTab />
        </div>
      )}

      {/* 6. PRODUCT DETAIL MODAL */}
      {selectedItemForDetail && (
        <StoreProductDetailModal
          product={selectedItemForDetail}
          supplierName={getSupplierName(selectedItemForDetail.organizationId)}
          onClose={() => setSelectedItemForDetail(null)}
          onAddToCart={addToCart}
          onShareProduct={handleShareProduct}
          onOpenChat={(prod) => {
            setChatInitialSupplierId(prod.organizationId);
            setChatInitialSupplierName(getSupplierName(prod.organizationId));
            setChatInitialOrderId(undefined);
            setChatInitialProduct(prod);
            setIsChatModalOpen(true);
          }}
        />
      )}

      {/* 7. CART SLIDE-OVER DRAWER */}
      <StoreCartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        getSupplierName={getSupplierName}
        updateQuantity={updateQuantity}
        removeFromCart={removeFromCartList}
        cartTotals={cartTotals}
        couponCodeInput={couponCodeInput}
        setCouponCodeInput={setCouponCodeInput}
        appliedCoupon={appliedCoupon}
        setAppliedCoupon={setAppliedCoupon}
        couponError={couponError}
        checkingCoupon={checkingCoupon}
        handleApplyCoupon={handleApplyCoupon}
        onProceedToCheckout={() => setIsCheckoutOpen(true)}
        pendingOrders={pendingBuyerOrders}
        onCheckPayment={handleCheckPayment}
        onCancelPendingOrder={handleCancelPendingOrder}
        isCheckingPayment={isCheckingPaymentOrder}
      />

      {/* 8. CHECKOUT MODAL */}
      <StoreCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cart={cart}
        address={address}
        setAddress={setAddress}
        shippingMethod={shippingMethod}
        setShippingMethod={setShippingMethod}
        shippingQuotes={shippingQuotes}
        shippingError={shippingError}
        isQuotingShipping={isQuotingShipping}
        selectedShippingService={selectedShippingService}
        setSelectedShippingService={setSelectedShippingService}
        hasFrenetToken={Boolean(cart.length > 0 && allSuppliers.find(s => s.id === cart[0].product.organizationId)?.frenetToken)}
        notes={notes}
        setNotes={setNotes}
        cartTotals={cartTotals}
        appliedCoupon={appliedCoupon}
        isProcessing={isProcessing}
        onSubmitOrder={handleCheckout}
      />

      {/* 9. ORDER SUCCESS MODAL */}
      {orderSuccess && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl border border-zinc-200 p-6 sm:p-8 space-y-6 text-center shadow-2xl">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
              <Check size={32} />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-extrabold text-zinc-950">Pedido Gerado com Sucesso!</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Seu pedido foi registrado e enviado diretamente para o fornecedor.
              </p>
            </div>

            {orderSuccess.asaasInvoiceUrl && (
              <a
                href={orderSuccess.asaasInvoiceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center w-full py-3.5 bg-zinc-950 hover:bg-zinc-800 text-white font-bold rounded-2xl transition-all shadow-md text-xs"
              >
                Abrir Fatura / Pagamento Asaas
              </a>
            )}

            <button
              type="button"
              onClick={() => {
                setOrderSuccess(null);
                setIsCartOpen(false);
              }}
              className="w-full py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold rounded-2xl transition-all text-xs"
            >
              Voltar para Loja
            </button>
          </div>
        </div>
      )}

      {/* 10. SUPPLIER STORE CHAT MODAL */}
      <SupplierStoreChatModal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        initialSupplierId={chatInitialSupplierId}
        initialSupplierName={chatInitialSupplierName}
        initialOrderId={chatInitialOrderId}
        initialProduct={chatInitialProduct}
      />
    </main>
  );
};
