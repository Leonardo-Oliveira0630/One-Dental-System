import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { StoreLayoutBlock, StoreSettings } from '../../types';
import { 
  Settings, Store, Sparkles, Tag, HelpCircle, Save, Plus, Trash2, 
  ArrowUp, ArrowDown, ChevronRight, CheckCircle2, DollarSign, Wallet, 
  MapPin, Landmark, Layout, Grid, List as ListIcon, RefreshCw, Eye, Image as ImageIcon,
  CheckCircle, Crown, Info, Zap
} from 'lucide-react';
import * as api from '../../services/firebaseService';

export const SupplierSettings = () => {
  const { 
    currentOrg, currentPlan, allPlans, updateOrganization, inventoryItems, getSaaSInvoices 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'store' | 'plans' | 'asaas'>('store');
  const [loading, setLoading] = useState(false);

  // Store Customization state
  const [theme, setTheme] = useState<'shopee' | 'light' | 'dark' | 'amber' | 'indigo' | 'emerald' | 'orange'>('shopee');
  const [banners, setBanners] = useState<string[]>([]);
  const [newBanner, setNewBanner] = useState('');
  const [layoutBlocks, setLayoutBlocks] = useState<StoreLayoutBlock[]>([]);
  
  // Custom layout block creator state
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [blockTitle, setBlockTitle] = useState('');
  const [blockType, setBlockType] = useState<StoreLayoutBlock['type']>('CAROUSEL');
  const [blockCategoryId, setBlockCategoryId] = useState('');
  const [blockProductIds, setBlockProductIds] = useState<string[]>([]);

  // Asaas Integrations & Financials State
  const [asaasWalletId, setAsaasWalletId] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [bankInfo, setBankInfo] = useState('');
  const [instructions, setInstructions] = useState('');

  // Plans & Coupons State
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMessage, setCouponMessage] = useState({ text: '', type: '' });
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Load state from currentOrg
  useEffect(() => {
    if (currentOrg) {
      const settings = currentOrg.storeSettings || {};
      setTheme(settings.theme || 'shopee');
      setBanners(settings.banners || []);
      setLayoutBlocks(settings.layoutBlocks || [
        { id: 'default_carousel', type: 'CAROUSEL', title: 'Destaques' },
        { id: 'default_grid', type: 'GRID', title: 'Nossos Produtos' }
      ]);

      const fin = currentOrg.financialSettings || {};
      setAsaasWalletId(fin.asaasWalletId || '');
      setPixKey(fin.pixKey || '');
      setBankInfo(fin.bankInfo || '');
      setInstructions(fin.instructions || '');
    }
  }, [currentOrg]);

  // Load Invoices for Plans Tab
  useEffect(() => {
    if (currentOrg?.id && activeTab === 'plans') {
      setLoadingInvoices(true);
      getSaaSInvoices(currentOrg.id)
        .then(data => setInvoices(data || []))
        .catch(err => console.error(err))
        .finally(() => setLoadingInvoices(false));
    }
  }, [currentOrg?.id, activeTab]);

  // CATEGORIES extracted from inventory products for filter option
  const categories = Array.from(new Set((inventoryItems || []).map(i => i.categoryId).filter(Boolean)));

  const handleAddBanner = () => {
    if (!newBanner.trim()) return;
    setBanners([...banners, newBanner.trim()]);
    setNewBanner('');
  };

  const handleRemoveBanner = (index: number) => {
    setBanners(banners.filter((_, i) => i !== index));
  };

  // Layout Block Sorters & Builders
  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= layoutBlocks.length) return;
    
    const updated = [...layoutBlocks];
    const target = updated[index];
    updated[index] = updated[nextIndex];
    updated[nextIndex] = target;
    setLayoutBlocks(updated);
  };

  const handleRemoveBlock = (id: string) => {
    setLayoutBlocks(layoutBlocks.filter(b => b.id !== id));
  };

  const handleAddLayoutBlock = () => {
    const newBlock: StoreLayoutBlock = {
      id: `block_${Date.now()}`,
      type: 'CAROUSEL',
      title: 'Novo Bloco de Produtos'
    };
    setLayoutBlocks([...layoutBlocks, newBlock]);
  };

  const handleEditBlock = (block: StoreLayoutBlock) => {
    setEditingBlockId(block.id);
    setBlockTitle(block.title);
    setBlockType(block.type);
    setBlockCategoryId(block.categoryId || '');
    setBlockProductIds(block.productIds || []);
  };

  const handleSaveBlockConfig = () => {
    if (!editingBlockId) return;
    setLayoutBlocks(layoutBlocks.map(b => {
      if (b.id === editingBlockId) {
        return {
          ...b,
          title: blockTitle,
          type: blockType,
          categoryId: blockCategoryId || undefined,
          productIds: blockProductIds.length > 0 ? blockProductIds : undefined
        };
      }
      return b;
    }));
    setEditingBlockId(null);
  };

  const toggleSelectBlockProduct = (prodId: string) => {
    if (blockProductIds.includes(prodId)) {
      setBlockProductIds(blockProductIds.filter(id => id !== prodId));
    } else {
      setBlockProductIds([...blockProductIds, prodId]);
    }
  };

  // SAVE CORE CONFIGURATION
  const handleSaveStoreConfig = async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const updatedStoreSettings: StoreSettings = {
        theme,
        banners,
        layoutBlocks
      };
      
      await updateOrganization(currentOrg.id, {
        storeSettings: updatedStoreSettings
      });
      alert('Configurações da sua Loja Autoral salvas com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar as configurações.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFinancials = async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const updatedFin = {
        ...currentOrg.financialSettings,
        asaasWalletId,
        pixKey,
        bankInfo,
        instructions
      };
      await updateOrganization(currentOrg.id, {
        financialSettings: updatedFin
      });
      alert('Configurações Financeiras e Asaas salvas com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar as configurações financeiras.');
    } finally {
      setLoading(false);
    }
  };

  // Apply Coupon code
  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !currentPlan || !currentOrg) return;
    setCouponLoading(true);
    setCouponMessage({ text: '', type: '' });
    try {
      const coupon = await api.apiValidateCoupon(couponCode, currentPlan.id);
      if (!coupon) {
        setCouponMessage({ text: 'Cupom inválido ou expirado.', type: 'error' });
      } else {
        if ((coupon.discountType === 'PERCENTAGE' && coupon.discountValue === 100) || coupon.discountType === 'FREE_FOREVER') {
          await updateOrganization(currentOrg.id, { subscriptionStatus: 'ACTIVE' });
          await api.apiUpdateCoupon(coupon.id, { usedCount: coupon.usedCount + 1 });
          setCouponMessage({ text: 'Cupom aplicado com sucesso! Seu acesso de fornecedor foi liberado.', type: 'success' });
        } else {
          setCouponMessage({ text: 'Este cupom é válido, mas não concede 100% de desconto. Utilize a página de assinatura para aplicá-lo.', type: 'warning' });
        }
      }
    } catch (error) {
      console.error(error);
      setCouponMessage({ text: 'Erro ao validar cupom.', type: 'error' });
    } finally {
      setCouponLoading(false);
    }
  };

  return (
    <main id="supplier-settings" className="flex-1 p-6 space-y-6 overflow-y-auto bg-slate-950 text-slate-100 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900 border border-slate-800 rounded-2xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações de Fornecedor</h1>
          <p className="text-slate-400 text-sm mt-1">
            Personalize seu tema e vitrine autoral, confira seu plano atual, limites ou configure sua wallet do Asaas.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-1 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('store')}
          className={`px-5 py-3 border-b-2 font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'store' 
              ? 'border-indigo-550 border-indigo-500 text-indigo-400 bg-slate-900/40' 
              : 'border-transparent text-slate-450 text-slate-400 hover:text-white'
          }`}
        >
          <Store size={18} />
          Configurar Loja Autoral
        </button>
        <button
          onClick={() => setActiveTab('plans')}
          className={`px-5 py-3 border-b-2 font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'plans' 
              ? 'border-indigo-550 border-indigo-500 text-indigo-400 bg-slate-900/40' 
              : 'border-transparent text-slate-450 text-slate-400 hover:text-white'
          }`}
        >
          <Crown size={18} />
          Planos de Adesão
        </button>
        <button
          onClick={() => setActiveTab('asaas')}
          className={`px-5 py-3 border-b-2 font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'asaas' 
              ? 'border-indigo-550 border-indigo-500 text-indigo-400 bg-slate-900/40' 
              : 'border-transparent text-slate-450 text-slate-400 hover:text-white'
          }`}
        >
          <Wallet size={18} />
          Conta Asaas e Recebíveis
        </button>
      </div>

      {/* TABS CONTAINER */}
      <div className="space-y-6">
        
        {/* TAB 1: CONFIGURE STORE */}
        {activeTab === 'store' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            {/* Customize Store settings panel */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Theme Settings */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <h3 className="font-bold text-md flex items-center gap-2">
                  <Sparkles className="text-indigo-400" />
                  Tema Personalizado da Vitrine
                </h3>
                <p className="text-slate-400 text-xs">
                  Modifique as cores predominantes e visual do seu espaço interno de produtos de acordo com a sua identidade visual.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  {[
                    { id: 'shopee', name: 'Shopee Oficial', color: 'bg-orange-600' },
                    { id: 'light', name: 'Clean Light', color: 'bg-slate-200 text-slate-800' },
                    { id: 'dark', name: 'Cosmic Obsidian', color: 'bg-slate-950 text-slate-100 border border-slate-800' },
                    { id: 'amber', name: 'Premium Gold', color: 'bg-amber-500 text-slate-950' },
                    { id: 'indigo', name: 'Corporate Purple', color: 'bg-indigo-650 bg-indigo-600' },
                    { id: 'emerald', name: 'Bio Emerald', color: 'bg-emerald-600' },
                    { id: 'orange', name: 'Dynamic Orange', color: 'bg-orange-550 bg-orange-500' }
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id as any)}
                      className={`p-3.5 rounded-xl border text-xs font-black transition-all flex flex-col items-center gap-2 ${
                        theme === t.id 
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 shadow-lg' 
                          : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full ${t.color}`} />
                      <span>{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Banner Carousel customizer */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <h3 className="font-bold text-md flex items-center gap-2">
                  <ImageIcon className="text-indigo-400" />
                  Banners Deslizantes da Loja
                </h3>
                <p className="text-slate-400 text-xs">
                  Insira URLs de banners promocionais para aparecer em carrossel no topo da sua vitrine da loja.
                </p>

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="Ex: https://comercial.com/banner-promocao.jpg"
                      value={newBanner}
                      onChange={e => setNewBanner(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-650"
                    />
                    <button
                      onClick={handleAddBanner}
                      className="px-5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all"
                    >
                      <Plus size={18} />
                    </button>
                  </div>

                  {banners.length === 0 ? (
                    <p className="text-slate-500 text-xs italic">Nenhum banner cadastrado de momento.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      {banners.map((url, idx) => (
                        <div key={idx} className="bg-slate-950 border border-slate-850 rounded-xl overflow-hidden p-2 flex items-center justify-between gap-3">
                          <img 
                            src={url} 
                            alt={`Banner ${idx}`} 
                            className="w-16 h-10 object-cover rounded-lg bg-slate-900 border border-slate-800"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as any).src = 'https://placehold.co/600x400?text=Banner+Error';
                            }}
                          />
                          <span className="text-[10px] text-slate-500 truncate flex-1 font-mono">{url}</span>
                          <button
                            onClick={() => handleRemoveBanner(idx)}
                            className="text-slate-500 hover:text-red-400 p-1.5"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Layout arrangements and blocks */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-md flex items-center gap-2">
                      <Layout className="text-indigo-400" />
                      Blocos Autorais da Sua Vitrine
                    </h3>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Crie carrosséis de produtos, listas ou grids de destaque e mude a ordem de visualização na loja de acordo com sua estratégia!
                    </p>
                  </div>
                  <button
                    onClick={handleAddLayoutBlock}
                    className="p-2 bg-indigo-500/10 text-indigo-400 font-bold hover:bg-indigo-500/20 rounded-xl transition-all text-xs flex items-center gap-1 border border-indigo-500/25"
                  >
                    <Plus size={14} /> Bloco
                  </button>
                </div>

                <div className="space-y-3 pt-1">
                  {layoutBlocks.map((block, idx) => (
                    <div key={block.id} className="bg-slate-950 border border-slate-850 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-700 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                          {block.type === 'CAROUSEL' ? <RefreshCw size={18} /> : block.type === 'GRID' ? <Grid size={18} /> : block.type === 'BANNER' ? <ImageIcon size={18} /> : <ListIcon size={18} />}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-200">{block.title || 'Sem título'}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                            <span className="bg-slate-905 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-400">
                              {block.type === 'CAROUSEL' ? 'Carrossel' : block.type === 'GRID' ? 'Grade' : block.type === 'RELATED' ? 'Recomendações' : block.type === 'LIST' ? 'Lista' : 'Banner slider'}
                            </span>
                            {block.categoryId && <span>Filtrado: Categoria ativa</span>}
                            {block.productIds && <span>Personalizado ({block.productIds.length} itens)</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Move Controls */}
                        <button
                          disabled={idx === 0}
                          onClick={() => handleMoveBlock(idx, 'up')}
                          className="p-1 px-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white hover:border-slate-600 disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          disabled={idx === layoutBlocks.length - 1}
                          onClick={() => handleMoveBlock(idx, 'down')}
                          className="p-1 px-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white hover:border-slate-600 disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <ArrowDown size={14} />
                        </button>

                        <button
                          onClick={() => handleEditBlock(block)}
                          className="p-1 px-3 bg-indigo-650 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 text-xs font-bold font-sans"
                        >
                          Configurar
                        </button>

                        <button
                          onClick={() => handleRemoveBlock(block.id)}
                          className="p-1.5 hover:bg-red-500/10 text-slate-450 hover:text-red-400 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {layoutBlocks.length === 0 && (
                    <p className="text-center py-6 text-slate-600 text-xs italic border-2 border-dashed border-slate-850 rounded-xl">Sem blocos no layout. A vitrine exibirá a visualização padrão.</p>
                  )}
                </div>
              </div>

              {/* SAVE ACTION FLOATER */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSaveStoreConfig}
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold p-3 px-6 rounded-xl transition-all shadow-lg shadow-indigo-950/40 flex items-center gap-1.5"
                >
                  <Save size={18} />
                  <span>{loading ? 'Processando...' : 'Salvar Alterações de Vitrine'}</span>
                </button>
              </div>

            </div>

            {/* PREVIEW CONTAINER */}
            <div className="space-y-6">
              
              {/* BLOCK CONFIG EDIT MODAL/DRAWER (renders inline for better UX in sidebar) */}
              {editingBlockId && (
                <div className="bg-slate-900 border-2 border-indigo-500/40 rounded-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <h4 className="font-bold text-sm text-indigo-400">Configurar Bloco de Produtos</h4>
                    <button onClick={() => setEditingBlockId(null)} className="text-slate-400 hover:text-white">✕</button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Título do Bloco</label>
                      <input
                        type="text"
                        value={blockTitle}
                        onChange={e => setBlockTitle(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="Ex: Ofertas da Semana"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Tipo de Layout</label>
                      <select
                        value={blockType}
                        onChange={e => setBlockType(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="CAROUSEL">Carrossel Deslizante</option>
                        <option value="GRID">Grade Expandida</option>
                        <option value="RELATED">Produtos Relacionados (Por Categoria)</option>
                        <option value="LIST">Lista de Linhas Simples</option>
                      </select>
                    </div>

                    {/* Filter Option */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase">Filtro de Conteúdo</label>
                        <span className="text-[9px] text-slate-500">Opcional</span>
                      </div>
                      <select
                        value={blockCategoryId}
                        onChange={e => setBlockCategoryId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">Exibir Todos (Sem Filtrar Categoria)</option>
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    {/* Specific items picker */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Selecionar Itens Específicos</label>
                      <p className="text-[10px] text-slate-500 mb-2">Caso queira colocar uma curadoria de produtos específica neste bloco.</p>
                      
                      <div className="max-h-48 overflow-y-auto divide-y divide-slate-850 bg-slate-950 rounded-xl border border-slate-850 p-2">
                        {inventoryItems.map(p => {
                          const isSelected = blockProductIds.includes(p.id);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => toggleSelectBlockProduct(p.id)}
                              className="w-full flex items-center justify-between text-left p-2 hover:bg-slate-900 rounded-lg text-xs transition-colors"
                            >
                              <span className="truncate text-slate-350">{p.name}</span>
                              <div className={`w-4.5 h-4.5 rounded border flex items-center justify-center shrink-0 ${
                                isSelected ? 'border-indigo-500 bg-indigo-500/20 text-indigo-400' : 'border-slate-800 bg-transparent text-transparent'
                              }`}>
                                <CheckCircle size={10} />
                              </div>
                            </button>
                          );
                        })}

                        {inventoryItems.length === 0 && (
                          <p className="text-center py-4 text-slate-650 text-[10px]">Nenhum produto cadastrado.</p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveBlockConfig}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg"
                    >
                      Salvar Alteração do Bloco
                    </button>
                  </div>
                </div>
              )}

              {/* Informative Help Center Panel */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <h3 className="font-bold text-md flex items-center gap-2">
                  <HelpCircle className="text-indigo-400" />
                  Como funcionam as Lojas Autorais?
                </h3>
                <div className="text-xs text-slate-400 space-y-3 leading-relaxed">
                  <p>
                    Com as Lojas Autorais, os fornecedores parceiros podem montar seu próprio portal web customizado dentro de nossa plataforma.
                  </p>
                  <p>
                    <strong>1. Banner Inicial:</strong> Atraia mais compradores exibindo promoções do mês, novidades e ofertas de frete no topo da sua loja.
                  </p>
                  <p>
                    <strong>2. Blocos Customizados:</strong> Crie vitrines flexíveis (como por exemplo carrosséis de 'Destaques', grades de 'Mais Vendidos', ou listas técnicas). Você também pode filtrar para exibir apenas uma categoria específica por bloco!
                  </p>
                  <p>
                    <strong>3. Temas Autênticos:</strong> Altere as características de design, cores e bordas mudando o tema. O tema <strong>Shopee Oficial</strong>, por exemplo, simula as cores e disposição características do marketplace favorito de compras dos clientes!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PLANS & UPGRADES */}
        {activeTab === 'plans' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-10"><Crown size={120} /></div>
               <div className="relative z-10">
                  <p className="text-indigo-400 font-bold uppercase text-xs tracking-widest mb-1">Seu Plano Atual de Fornecedor</p>
                  <h2 className="text-4xl font-black mb-4">{currentPlan?.name || 'Fornecedor Standard'}</h2>
                  <div className="flex flex-wrap gap-4 text-sm font-medium text-slate-300">
                     <div className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-emerald-400" /> Produtos Ilimitados</div>
                     <div className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-emerald-400" /> Exposição no Feed Global Shopee</div>
                     <div className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-emerald-400" /> Configuração de Wallet Asaas para Splits</div>
                  </div>
                  
                  {currentOrg?.subscriptionStatus === 'OVERDUE' && (
                    <div className="mt-6 p-4 bg-red-500/20 border border-red-500/50 rounded-2xl flex items-center justify-between">
                      <div>
                        <p className="font-bold text-red-400">Mensalidade do Plano Vencida</p>
                        <p className="text-xs">Regularize sua mensalidade para voltar a expor seus produtos na loja global.</p>
                      </div>
                    </div>
                  )}

                  {(currentOrg?.subscriptionStatus === 'FREE' || currentOrg?.subscriptionStatus === 'TEST') && (
                    <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/35 rounded-2xl flex items-center justify-between">
                      <div>
                        <p className="font-bold text-emerald-400">Conta Fornecedora Isenta</p>
                        <p className="text-xs">Seu registro está configurado com isenção de mensalidades comerciais.</p>
                      </div>
                      <Crown size={20} className="text-emerald-400 animate-pulse" />
                    </div>
                  )}
               </div>
            </div>

            {/* Application of Promo Coupon keys */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
               <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
                 <Tag className="text-indigo-400" /> Resgatar Cupom de Parceria Fornecedora
               </h3>
               <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                  <input 
                    type="text" 
                    placeholder="Código do Cupom Parceiro" 
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="flex-1 bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-900 outline-none uppercase font-bold tracking-widest text-sm"
                  />
                  <button 
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition-all disabled:opacity-50 whitespace-nowrap text-sm"
                  >
                    {couponLoading ? 'Validando...' : 'Resgatar Cupom'}
                  </button>
               </div>
               {couponMessage.text && (
                 <p className={`mt-4 text-sm font-bold ${couponMessage.type === 'error' ? 'text-red-400' : couponMessage.type === 'success' ? 'text-emerald-400' : 'text-orange-400'}`}>
                   {couponMessage.text}
                 </p>
               )}
            </div>

            {/* Invoices summary */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <DollarSign className="text-indigo-400" /> Histórico de Recibos/Mensalidades
              </h3>
              {loadingInvoices ? (
                <div className="py-6 text-center text-slate-500">Carregando faturas...</div>
              ) : invoices.length === 0 ? (
                <p className="text-xs text-slate-500 italic pb-2">Sem faturas comerciais recentes registradas.</p>
              ) : (
                <div className="divide-y divide-slate-850">
                  {invoices.map((inv: any, idx) => (
                    <div key={idx} className="py-3 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-slate-300">Fatura Mensalidade #{inv.id.substring(inv.id.length - 8).toUpperCase()}</p>
                        <p className="text-slate-500 mt-1 font-mono">Vencimento: {inv.dueDate}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-teal-400">R$ {inv.value.toFixed(2)}</p>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded font-bold font-mono text-[9px] ${
                          inv.status === 'RECEIVED' || inv.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-500'
                        }`}>{inv.status === 'RECEIVED' ? 'PAGO' : 'PENDENTE'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: ASAAS SUB-ACCOUNT CREDENTIALS */}
        {activeTab === 'asaas' && (
          <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-2xl space-y-6 animate-in fade-in duration-300 max-w-3xl">
            <h3 className="font-bold text-md flex items-center gap-2 border-b border-slate-800 pb-3">
              <Wallet className="text-indigo-400" />
              Credenciamento e Split do Asaas
            </h3>
            
            <p className="text-slate-400 text-xs leading-relaxed">
              Associe sua conta digital ASAAS para recolhimento direto das vendas de seus produtos, possibilitando liberação imediata de splits financeiros automáticos e transferências de saldo em conta.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">ID da Carteira ASAAS (Wallet ID)</label>
                <input
                  type="text"
                  placeholder="Ex: account_1234567..."
                  value={asaasWalletId}
                  onChange={e => setAsaasWalletId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 font-mono placeholder-slate-700"
                />
                <p className="text-[10px] text-slate-500 mt-1">ID da conta fornecido pelo Administrador ou localizado em sua conta comercial Asaas.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Chave Pix Comercial</label>
                <input
                  type="text"
                  placeholder="Ex: CNPJ ou E-mail ou Celular"
                  value={pixKey}
                  onChange={e => setPixKey(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Dados Bancários Alternativos</label>
                <input
                  type="text"
                  placeholder="Ex: Banco Itaú - Ag 1234, Cc 5678-9"
                  value={bankInfo}
                  onChange={e => setBankInfo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Orientação de Faturamento e Checkout</label>
                <textarea
                  placeholder="Instruções para exibição ao comprador dental / laboratório no checkout..."
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500 h-24 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-800 pt-4">
              <button
                onClick={handleSaveFinancials}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold p-3 px-6 rounded-xl transition-all shadow-lg flex items-center gap-1.5"
              >
                <Save size={16} />
                <span>{loading ? 'Processando...' : 'Salvar Dados de Recebimento'}</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  );
};
