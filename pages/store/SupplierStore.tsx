import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { InventoryItem, Organization, SupplierOrder } from '../../types';
import { 
  ShoppingBag, Search, Filter, ShoppingCart, Plus, Minus, Trash2, 
  X, MapPin, CreditCard, Sparkles, Building2, Package, Check, ClipboardCheck, ArrowRight, CornerDownRight 
} from 'lucide-react';

interface SupplierCartItem {
  id: string; // matches product ID
  product: InventoryItem;
  quantity: number;
}

export const SupplierStore = () => {
  const { 
    allSuppliers, allSupplierProducts, addSupplierOrder, currentUser, currentOrg 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('ALL');
  
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
    const saved = localStorage.getItem('supplier_cart_data');
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
    localStorage.setItem('supplier_cart_data', JSON.stringify(newCart));
  };

  // Filter products
  const filteredProducts = useMemo(() => {
    return (allSupplierProducts || []).filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesSupplier = selectedSupplierId === 'ALL' || p.organizationId === selectedSupplierId;
      return matchesSearch && matchesSupplier;
    });
  }, [allSupplierProducts, searchQuery, selectedSupplierId]);

  // Helpers
  const getSupplierName = (orgId: string) => {
    return allSuppliers.find(s => s.id === orgId)?.name || 'Fornecedor Parceiro';
  };

  const getSupplierLocation = (orgId: string) => {
    const s = allSuppliers.find(s => s.id === orgId);
    if (!s) return '';
    return `${s.city || 'São Paulo'} - ${s.state || 'SP'}`;
  };

  const addToCart = (product: InventoryItem) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.quantity >= (product.currentStock || 999)) {
        alert('Quantidade máxima de estoque atingida para este item.');
        return;
      }
      const updated = cart.map(item => 
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      );
      saveCartToStorage(updated);
    } else {
      saveCartToStorage([...cart, { id: product.id, product, quantity: 1 }]);
    }
    setIsCartOpen(true);
  };

  const updateQuantity = (productId: string, delta: number) => {
    const item = cart.find(i => i.id === productId);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      const updated = cart.filter(i => i.id !== productId);
      saveCartToStorage(updated);
    } else {
      if (delta > 0 && newQty > (item.product.currentStock || 999)) {
        alert('Limite do estoque atingido.');
        return;
      }
      const updated = cart.map(i => 
        i.id === productId ? { ...i, quantity: newQty } : i
      );
      saveCartToStorage(updated);
    }
  };

  const removeFromCartList = (productId: string) => {
    const updated = cart.filter(i => i.id !== productId);
    saveCartToStorage(updated);
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => total + (item.product.sellPrice * item.quantity), 0);
  }, [cart]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || !currentUser || !currentOrg) return;

    setIsProcessing(true);

    try {
      // Create separate orders if products are from different suppliers
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
        const totalVal = items.reduce((sum, i) => sum + (i.product.sellPrice * i.quantity), 0);
        
        const newOrder: SupplierOrder = {
          id: orderId,
          supplierId: supId,
          supplierName: getSupplierName(supId),
          buyerOrgId: currentOrg.id,
          buyerOrgName: currentOrg.name,
          buyerName: currentUser.name,
          buyerEmail: currentUser.email,
          items: items.map(i => ({
            productId: i.product.id,
            name: i.product.name,
            quantity: i.quantity,
            price: i.product.sellPrice
          })),
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

      // Order created successfully
      setOrderSuccess(lastOrder);
      saveCartToStorage([]); // Clear cart
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
    <main id="supplier-store-container" className="flex-1 p-6 space-y-6 overflow-y-auto bg-slate-950 text-slate-100 min-h-screen">
      {/* Welcome & Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900 border border-slate-800 rounded-2xl relative overflow-hidden">
        <div className="relative z-10">
          <span className="text-xs text-indigo-400 font-mono tracking-wider font-bold">LOJA ONLINE EXCLUSIVA</span>
          <h1 className="text-2xl font-bold tracking-tight mt-1">Materiais e Insumos de Fornecedores</h1>
          <p className="text-slate-400 text-sm mt-1 max-w-xl">
            Compre diretamente de vários fornecedores cadastrados sem burocracias de contratos ou vínculos de parcerias estritos.
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <button
            onClick={() => setIsCartOpen(true)}
            className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-950/40 flex items-center gap-2"
          >
            <ShoppingCart className="w-5 h-5" />
            <span>Meu Carrinho</span>
            {cart.length > 0 && (
              <span className="bg-white text-indigo-600 rounded-full w-5 h-5 text-xs flex items-center justify-center border font-bold">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </button>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 rounded-full blur-3xl -mr-20 -mt-20" />
      </div>

      {/* Control Panel: Search & Suppliers Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4">
        {/* Search */}
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3.5 top-3.5 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Buscar produtos, insumos, brocas, etc..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-600"
          />
        </div>

        {/* Supplier Selector */}
        <div className="md:col-span-2 flex items-center gap-2">
          <Filter className="text-slate-500 flex-shrink-0" size={18} />
          <select
            value={selectedSupplierId}
            onChange={e => setSelectedSupplierId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Todos Fornecedores</option>
            {allSuppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.city || 'Cali'})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full py-16 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-500 space-y-3">
            <ShoppingBag className="w-12 h-12 mx-auto stroke-1 text-slate-600" />
            <p className="text-sm">Nenhum insumo ou produto exposto por fornecedores no momento.</p>
          </div>
        ) : (
          filteredProducts.map(p => {
            const supplierLoc = getSupplierLocation(p.organizationId);
            const inCart = cart.find(c => c.id === p.id);
            return (
              <div key={p.id} className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl overflow-hidden flex flex-col justify-between group transition-all">
                <div className="p-4 space-y-3.5">
                  {/* Image/Placeholder */}
                  <div className="aspect-square bg-slate-950 border border-slate-850 rounded-xl overflow-hidden flex items-center justify-center relative">
                    {p.imageUrl ? (
                      <img 
                        src={p.imageUrl} 
                        alt={p.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Package className="w-12 h-12 text-slate-750 stroke-1" />
                    )}
                    <div className="absolute top-2 left-2 bg-slate-900/90 backdrop-blur border border-slate-800 px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold text-slate-400 flex items-center gap-1">
                      <Building2 size={10} className="text-indigo-400" />
                      {getSupplierName(p.organizationId).toUpperCase().substring(0, 18)}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-200 line-clamp-1 group-hover:text-indigo-400 transition-colors">
                      {p.name}
                    </h3>
                    <p className="text-slate-400 text-xs line-clamp-2 h-8">
                      {p.description || 'Nenhuma descrição detalhada informada.'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-850 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-mono text-slate-500">VALOR UNITÁRIO</p>
                      <p className="text-base font-bold font-mono text-teal-400">R$ {p.sellPrice.toFixed(2)}</p>
                    </div>
                    <div>
                      {p.currentStock && p.currentStock <= p.minStock ? (
                        <span className="text-[10px] text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded-md font-mono">Estoque Baixo</span>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono">Disponível: {p.currentStock || 0}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer action */}
                <div className="p-3 bg-slate-950/40 border-t border-slate-850">
                  <button
                    onClick={() => addToCart(p)}
                    className="w-full py-2.5 bg-slate-800 hover:bg-indigo-650 hover:bg-indigo-600 text-xs font-bold text-slate-300 hover:text-white rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-750"
                  >
                    <Plus size={14} /> Adicionar ao Carrinho
                    {inCart && ` (${inCart.quantity})`}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-end">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full flex flex-col text-slate-100 shadow-2xl relative">
            <div className="p-6 border-b border-slate-850 flex items-center justify-between bg-slate-950/40">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <ShoppingCart className="text-indigo-400" />
                Carrinho Fornecedores
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
                  {cart.map(item => (
                    <div key={item.id} className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-3">
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <h4 className="font-bold text-slate-200 text-sm line-clamp-1">{item.product.name}</h4>
                          <p className="text-[10px] text-slate-500 font-mono uppercase mt-0.5">
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

                        <span className="font-mono text-xs font-bold text-teal-400">
                          R$ {(item.product.sellPrice * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
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
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-950/40 flex items-center justify-center gap-1.5"
                >
                  Continuar para Pagamento <ArrowRight size={16} />
                </button>
              </div>
            )}
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
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-55 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-1"
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
                <span className="text-[10px] font-mono text-indigo-400 uppercase font-black">PAGAMENTO VIA PIX</span>
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
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all"
            >
              Voltar para Loja
            </button>
          </div>
        </div>
      )}
    </main>
  );
};
