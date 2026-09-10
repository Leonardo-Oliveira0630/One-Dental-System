import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { StoreLayoutBlock, StoreSettings, BannerConfig, InventoryCategory, InventoryItemType } from '../../types';
import { smartCompress } from '../../services/compressionService';
import { 
  Settings, Store, Sparkles, Tag, HelpCircle, Save, Plus, Trash2, 
  ArrowUp, ArrowDown, ChevronRight, CheckCircle2, DollarSign, Wallet, 
  MapPin, Landmark, Layout, Grid, List as ListIcon, RefreshCw, Eye, Image as ImageIcon,
  CheckCircle, Crown, Info, Zap, MessageSquare, FolderPlus, Folder, Edit2, X
} from 'lucide-react';
import * as api from '../../services/firebaseService';

export const SupplierSettings = () => {
  const { 
    currentOrg, currentPlan, allPlans, updateOrganization, inventoryItems, getSaaSInvoices, 
    inventoryCategories, addInventoryCategory, updateInventoryCategory, deleteInventoryCategory 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'store' | 'plans' | 'asaas'>('store');
  const [loading, setLoading] = useState(false);

  // Store Customization state
  const [theme, setTheme] = useState<'shopee' | 'light' | 'dark' | 'amber' | 'indigo' | 'emerald' | 'orange'>('shopee');
  const [banners, setBanners] = useState<BannerConfig[]>([]);
  const [newBanner, setNewBanner] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string>('');
  
  // Category management state in Store settings
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<InventoryItemType>('MATERIAL');
  const [newCatImageUrl, setNewCatImageUrl] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [editingCatType, setEditingCatType] = useState<InventoryItemType>('MATERIAL');

  // Asaas & Frenet Integrations State
  const [asaasWalletId, setAsaasWalletId] = useState('');
  const [frenetToken, setFrenetToken] = useState('');
  const [phone, setPhone] = useState('');
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
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
      setProfilePhoto(settings.profilePhotoUrl || '');

      const fin = currentOrg.financialSettings || {};
      setAsaasWalletId(fin.asaasWalletId || '');
      setFrenetToken(currentOrg.frenetToken || '');
      setCep(currentOrg.cep || '');
      setAddress(currentOrg.address || '');
      setNumber(currentOrg.number || '');
      setComplement(currentOrg.complement || '');
      setNeighborhood(currentOrg.neighborhood || '');
      setCity(currentOrg.city || '');
      setState(currentOrg.state || '');
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
    setBanners([...banners, { imageUrl: newBanner.trim() }]);
    setNewBanner('');
  };

  const handleRemoveBanner = (index: number) => {
    setBanners(banners.filter((_, i) => i !== index));
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await smartCompress(file);
      const reader = new FileReader();
      reader.onload = (evt) => {
        const base64 = evt.target?.result as string;
        setBanners([...banners, { imageUrl: base64 }]);
      };
      reader.readAsDataURL(compressed);
    } catch (err) {
      console.error(err);
      alert('Erro ao processar imagem banner.');
    }
  };

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await smartCompress(file);
      const reader = new FileReader();
      reader.onload = (evt) => {
        const base64 = evt.target?.result as string;
        setProfilePhoto(base64);
      };
      reader.readAsDataURL(compressed);
    } catch (err) {
      console.error(err);
      alert('Erro ao processar foto de perfil.');
    }
  };

  // Category Management Handlers
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      alert('Informe o nome da categoria.');
      return;
    }
    setSavingCategory(true);
    try {
      await addInventoryCategory({
        name: newCatName.trim(),
        type: newCatType,
        imageUrl: newCatImageUrl.trim() || undefined
      });
      setNewCatName('');
      setNewCatType('MATERIAL');
      setNewCatImageUrl('');
      setIsAddingCategory(false);
      alert('Categoria criada com sucesso! Ela já está disponível no cadastro de produtos.');
    } catch (err) {
      console.error(err);
      alert('Erro ao criar categoria.');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleUpdateCategoryData = async (catId: string) => {
    if (!editingCatName.trim()) return;
    try {
      await updateInventoryCategory(catId, {
        name: editingCatName.trim(),
        type: editingCatType
      });
      setEditingCategoryId(null);
      alert('Categoria atualizada com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar categoria.');
    }
  };

  const handleDeleteCategory = async (catId: string, catName: string) => {
    if (!window.confirm(`Tem certeza que deseja remover a categoria "${catName}"?`)) return;
    try {
      await deleteInventoryCategory(catId);
      alert('Categoria removida com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao remover categoria.');
    }
  };

  const handleNewCatImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await smartCompress(file);
      const reader = new FileReader();
      reader.onload = (evt) => {
        setNewCatImageUrl(evt.target?.result as string);
      };
      reader.readAsDataURL(compressed);
    } catch (err) {
      console.error(err);
      alert('Erro ao processar imagem da nova categoria.');
    }
  };

  // SAVE CORE CONFIGURATION
  const handleSaveStoreConfig = async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const updatedStoreSettings: StoreSettings = {
        ...(currentOrg.storeSettings || {}),
        theme,
        banners,
        profilePhotoUrl: profilePhoto
      };
      
      await updateOrganization(currentOrg.id, {
        storeSettings: updatedStoreSettings
      });
      alert('Configurações da sua Loja salvas com sucesso!');
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
        financialSettings: updatedFin,
        frenetToken,
        cep,
        phone,
        address,
        number,
        complement,
        neighborhood,
        city,
        state
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
    <main id="supplier-settings" className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto bg-slate-50 text-slate-900 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-6 bg-white border border-slate-200 rounded-2xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações de Fornecedor</h1>
          <p className="text-slate-500 text-sm mt-1">
            Personalize seu tema e vitrine autoral, confira seu plano atual, limites ou configure sua wallet do Asaas.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('store')}
          className={`px-5 py-3 border-b-2 font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'store' 
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50' 
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Store size={18} />
          Configurar Loja
        </button>
        <button
          onClick={() => setActiveTab('plans')}
          className={`px-5 py-3 border-b-2 font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'plans' 
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50' 
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Crown size={18} />
          Planos
        </button>
        <button
          onClick={() => setActiveTab('asaas')}
          className={`px-5 py-3 border-b-2 font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'asaas' 
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50' 
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Wallet size={18} />
          Configurar Conta Asaas
        </button>
        
      </div>

      {/* TABS CONTAINER */}
      <div className="space-y-6">
        
        {/* TAB 1: CONFIGURE STORE */}
        {activeTab === 'store' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            {/* Customize Store settings panel */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Banner Carousel customizer */}
              <div className="bg-white border border-slate-200 p-4 sm:p-6 rounded-2xl space-y-4">
                <div>
                  <h3 className="font-bold text-md flex items-center gap-2 text-slate-900">
                    <ImageIcon className="text-indigo-500" />
                    Banners Deslizantes da Loja
                  </h3>
                  <p className="text-slate-500 text-xs mt-1">
                    Adicione banners promocionais em carrossel no topo da sua vitrine para divulgar lançamentos, campanhas e ofertas especiais.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="url"
                      placeholder="URL da imagem do banner (ex: https://...)"
                      value={newBanner}
                      onChange={e => setNewBanner(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <div className="flex gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        id="banner-image-upload-settings"
                        className="hidden"
                        onChange={handleBannerUpload}
                      />
                      <label
                        htmlFor="banner-image-upload-settings"
                        className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors border border-slate-200 whitespace-nowrap"
                      >
                        <Sparkles size={14} className="text-indigo-600" /> Upload Imagem
                      </label>
                      <button
                        type="button"
                        onClick={handleAddBanner}
                        className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-1 shadow-sm"
                        title="Adicionar Banner via Link"
                      >
                        <Plus size={18} />
                        <span className="text-xs sm:inline">Adicionar</span>
                      </button>
                    </div>
                  </div>

                  {banners.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs italic border-2 border-dashed border-slate-200 rounded-xl">
                      Nenhum banner cadastrado no momento. Faça upload ou insira uma URL acima.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 pt-2">
                      {banners.map((banner, idx) => (
                        <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-4">
                          <div className="flex items-center gap-3">
                            <img 
                              src={banner.imageUrl} 
                              alt={`Banner ${idx}`} 
                              className="w-24 h-16 rounded-xl object-cover bg-white border border-slate-200 flex-shrink-0"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.target as any).src = 'https://placehold.co/600x400?text=Banner+Error';
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-xs text-slate-800 truncate">Banner #{idx + 1}</p>
                              <p className="text-[10px] text-slate-500 truncate">{banner.imageUrl}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveBanner(idx)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remover Banner"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Título Central</label>
                              <input 
                                type="text" 
                                value={banner.title || ''} 
                                onChange={(e) => {
                                  const newBanners = [...banners];
                                  newBanners[idx].title = e.target.value;
                                  setBanners(newBanners);
                                }}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="Ex: Mega Ofertas da Semana"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Subtítulo (Opcional)</label>
                              <input 
                                type="text" 
                                value={banner.subtitle || ''} 
                                onChange={(e) => {
                                  const newBanners = [...banners];
                                  newBanners[idx].subtitle = e.target.value;
                                  setBanners(newBanners);
                                }}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="Ex: Toda a linha com descontos especiais"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Texto do Botão</label>
                              <input 
                                type="text" 
                                value={banner.buttonText || ''} 
                                onChange={(e) => {
                                  const newBanners = [...banners];
                                  newBanners[idx].buttonText = e.target.value;
                                  setBanners(newBanners);
                                }}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="Ex: Ver Ofertas"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Link de Redirecionamento</label>
                              <input 
                                type="text" 
                                value={banner.buttonLink || ''} 
                                onChange={(e) => {
                                  const newBanners = [...banners];
                                  newBanners[idx].buttonLink = e.target.value;
                                  setBanners(newBanners);
                                }}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="Ex: /loja/categoria..."
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Profile Photo / Logo */}
              <div className="bg-white border border-slate-200 p-4 sm:p-6 rounded-2xl space-y-4">
                <div>
                  <h3 className="font-bold text-md flex items-center gap-2 text-slate-900">
                    <ImageIcon className="text-indigo-500" />
                    Foto de Perfil / Logo da Loja
                  </h3>
                  <p className="text-slate-500 text-xs mt-1">
                    Importe e insira a logomarca da sua empresa. Ela será exibida no topo da sua vitrine e no catálogo de produtos.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="relative group flex-shrink-0">
                    <img 
                      src={profilePhoto || 'https://placehold.co/120x120?text=Logo'} 
                      alt="Logo da Loja"
                      className="w-20 h-20 rounded-2xl border-2 border-slate-200 bg-white object-cover shadow-sm" 
                    />
                  </div>
                  
                  <div className="flex-1 w-full space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="Cole a URL da imagem da logo..."
                        value={profilePhoto}
                        onChange={e => setProfilePhoto(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        id="profile-image-upload"
                        className="hidden"
                        onChange={handleProfilePhotoUpload}
                      />
                      <label
                        htmlFor="profile-image-upload"
                        className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs flex items-center justify-center cursor-pointer transition-colors border border-indigo-200 whitespace-nowrap gap-1.5"
                      >
                        <Sparkles size={14} className="text-indigo-600" /> Upload Logo
                      </label>
                    </div>
                    <p className="text-[11px] text-slate-400">Formatos aceitos: PNG, JPEG ou WebP. Resolução recomendada: 400x400px.</p>
                  </div>
                </div>
              </div>

              {/* Categories Management & Category Images */}
              <div className="bg-white border border-slate-200 p-4 sm:p-6 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-md flex items-center gap-2 text-slate-900">
                      <Folder className="text-indigo-500" />
                      Categorias da Loja e Imagens
                    </h3>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Crie e gerencie categorias de produtos e defina imagens para a seção "Explorar Nossas Categorias".
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingCategory(!isAddingCategory);
                      setEditingCategoryId(null);
                    }}
                    className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-indigo-200 transition-colors w-fit"
                  >
                    {isAddingCategory ? <X size={15} /> : <FolderPlus size={15} />}
                    {isAddingCategory ? 'Fechar Formulário' : '+ Nova Categoria'}
                  </button>
                </div>

                {/* Inline Category Creation Form */}
                {isAddingCategory && (
                  <form onSubmit={handleCreateCategory} className="bg-slate-50 border-2 border-indigo-200 rounded-2xl p-4 sm:p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-indigo-900 flex items-center gap-1.5">
                        <FolderPlus size={16} className="text-indigo-600" />
                        Cadastrar Nova Categoria
                      </h4>
                      <button 
                        type="button" 
                        onClick={() => setIsAddingCategory(false)}
                        className="text-slate-400 hover:text-slate-600 p-1"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Nome da Categoria *</label>
                        <input
                          type="text"
                          required
                          value={newCatName}
                          onChange={e => setNewCatName(e.target.value)}
                          placeholder="Ex: Resinas 3D, Fresadoras, Descartáveis..."
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Tipo de Item</label>
                        <select
                          value={newCatType}
                          onChange={e => setNewCatType(e.target.value as InventoryItemType)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="MATERIAL">Insumo / Material Odontológico</option>
                          <option value="SUPPLY">Suprimento / Consumível</option>
                          <option value="MACHINERY">Equipamento / Maquinário</option>
                          <option value="IMPLANT">Implante / Componente Protético</option>
                          <option value="OTHER">Outros</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Imagem Representativa da Categoria (Opcional)</label>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                          {newCatImageUrl ? (
                            <img src={newCatImageUrl} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon size={18} className="text-slate-300" />
                          )}
                        </div>
                        <input
                          type="url"
                          placeholder="URL da imagem da categoria..."
                          value={newCatImageUrl}
                          onChange={e => setNewCatImageUrl(e.target.value)}
                          className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <input
                          type="file"
                          accept="image/*"
                          id="new-cat-image-file"
                          className="hidden"
                          onChange={handleNewCatImageUpload}
                        />
                        <label
                          htmlFor="new-cat-image-file"
                          className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center cursor-pointer transition-colors border border-slate-200 whitespace-nowrap"
                        >
                          Upload
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setIsAddingCategory(false)}
                        className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={savingCategory}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-colors shadow-sm flex items-center gap-1.5"
                      >
                        {savingCategory ? 'Salvando...' : 'Criar Categoria'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Categories List */}
                <div className="space-y-3 pt-1">
                  {inventoryCategories && inventoryCategories.length > 0 ? (
                    inventoryCategories.map(cat => {
                      const productCount = (inventoryItems || []).filter(item => item.categoryId === cat.id).length;
                      const isEditing = editingCategoryId === cat.id;

                      return (
                        <div key={cat.id} className="p-3.5 border border-slate-200 bg-slate-50/70 hover:bg-white rounded-xl transition-colors space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-xs">
                                {cat.imageUrl ? (
                                  <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Folder size={20} className="text-indigo-400" />
                                )}
                              </div>
                              <div className="min-w-0">
                                {isEditing ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={editingCatName}
                                      onChange={e => setEditingCatName(e.target.value)}
                                      className="bg-white border border-indigo-400 rounded-lg px-2.5 py-1 text-xs text-slate-900 outline-none"
                                    />
                                    <select
                                      value={editingCatType}
                                      onChange={e => setEditingCatType(e.target.value as InventoryItemType)}
                                      className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800"
                                    >
                                      <option value="MATERIAL">Insumo/Material</option>
                                      <option value="SUPPLY">Suprimento</option>
                                      <option value="MACHINERY">Equipamento</option>
                                      <option value="IMPLANT">Implante</option>
                                      <option value="OTHER">Outro</option>
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateCategoryData(cat.id)}
                                      className="px-2.5 py-1 bg-indigo-600 text-white font-bold rounded-lg text-xs"
                                    >
                                      Salvar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingCategoryId(null)}
                                      className="text-slate-400 hover:text-slate-600 p-1 text-xs"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-2">
                                      <p className="font-bold text-sm text-slate-900 truncate">{cat.name}</p>
                                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                                        {cat.type === 'MACHINERY' ? 'Equipamento' : cat.type === 'IMPLANT' ? 'Implante' : cat.type === 'SUPPLY' ? 'Suprimento' : cat.type === 'OTHER' ? 'Outro' : 'Insumo/Material'}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                      {productCount} {productCount === 1 ? 'produto vinculado' : 'produtos vinculados'}
                                    </p>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <input
                                type="file"
                                accept="image/*"
                                id={`cat-image-${cat.id}`}
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  try {
                                    const compressed = await smartCompress(file);
                                    const reader = new FileReader();
                                    reader.onload = async (evt) => {
                                      const base64 = evt.target?.result as string;
                                      await updateInventoryCategory(cat.id, { imageUrl: base64 });
                                      alert('Imagem da categoria atualizada com sucesso!');
                                    };
                                    reader.readAsDataURL(compressed);
                                  } catch (err) {
                                    console.error(err);
                                    alert('Erro ao atualizar imagem da categoria.');
                                  }
                                }}
                              />
                              <label
                                htmlFor={`cat-image-${cat.id}`}
                                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-bold text-indigo-600 cursor-pointer transition-colors shadow-xs"
                              >
                                Alterar Imagem
                              </label>

                              {!isEditing && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCategoryId(cat.id);
                                    setEditingCatName(cat.name);
                                    setEditingCatType(cat.type || 'MATERIAL');
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                                  title="Editar Categoria"
                                >
                                  <Edit2 size={15} />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Excluir Categoria"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-slate-500 text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50">
                      Nenhuma categoria cadastrada. Clique em "+ Nova Categoria" acima para criar a primeira categoria da sua loja.
                    </div>
                  )}
                </div>
              </div>

              {/* SAVE ACTION FLOATER */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSaveStoreConfig}
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold p-3 px-6 rounded-xl transition-all shadow-md flex items-center gap-2"
                >
                  <Save size={18} />
                  <span>{loading ? 'Salvando...' : 'Salvar Alterações de Vitrine'}</span>
                </button>
              </div>

            </div>

            {/* PREVIEW & HELP GUIDE CONTAINER */}
            <div className="space-y-6">
              
              {/* Informative Help Center Panel: Como estilizar sua loja */}
              <div className="bg-white border border-slate-200 p-5 sm:p-6 rounded-2xl space-y-4 shadow-xs">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <HelpCircle className="text-indigo-600" size={22} />
                  <h3 className="font-bold text-base text-slate-900">
                    Como estilizar sua loja
                  </h3>
                </div>
                
                <div className="text-xs text-slate-600 space-y-4 leading-relaxed">
                  <p className="text-slate-500">
                    Personalize a vitrine do seu portal de fornecedor para encantar seus clientes, valorizar sua marca e aumentar suas vendas de produtos odontológicos.
                  </p>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <p className="font-bold text-slate-900 flex items-center gap-1.5">
                      <ImageIcon size={14} className="text-indigo-600" />
                      1. Banners Deslizantes da Loja
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      Adicione banners promocionais em carrossel no topo da sua loja. Você pode fazer o upload direto de imagens do seu dispositivo ou inserir uma URL. Em cada banner, defina <strong>Título Central</strong>, <strong>Subtítulo</strong>, <strong>Texto do Botão</strong> (ex: "Ver Ofertas") e o <strong>Link de Redirecionamento</strong> para guiar o cliente direto a uma categoria ou produto específico.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <p className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-indigo-600" />
                      2. Foto de Perfil e Logo da Loja
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      Importe e insira a logomarca da sua empresa através de upload de arquivo ou URL. A logo é exibida com destaque no cabeçalho da sua vitrine e no catálogo, identificando sua marca para todos os clientes e laboratórios parceiros.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <p className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Folder size={14} className="text-indigo-600" />
                      3. Imagens para Categorias
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      Defina fotos e ícones representativos para cada categoria de insumos e maquinários (como Resinas 3D, Fresadoras, Descartáveis, Equipamentos). Essas imagens aparecem em destaque na seção <strong>"Explorar nossas Categorias"</strong> na vitrine principal da loja.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <p className="font-bold text-slate-900 flex items-center gap-1.5">
                      <FolderPlus size={14} className="text-indigo-600" />
                      4. Criação e Gestão de Categorias
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      Você pode criar novas categorias diretamente aqui nesta tela pelo botão <strong>"+ Nova Categoria"</strong> ou durante o cadastro/edição de produtos (clicando em <em>"+ Nova Categoria"</em> ao lado do seletor). Todas as categorias criadas ficam sincronizadas em tempo real e disponíveis instantaneamente no ato do cadastro de produtos.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: PLANS & UPGRADES */}
        {activeTab === 'plans' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-8 text-white shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 sm:p-8 opacity-10"><Crown size={120} /></div>
               <div className="relative z-10">
                  <p className="text-indigo-400 font-bold uppercase text-xs tracking-widest mb-1">Seu Plano Atual de Fornecedor</p>
                  <h2 className="text-4xl font-black mb-4">{currentPlan?.name || 'Fornecedor Standard'}</h2>
                  <div className="flex flex-wrap gap-4 text-sm font-medium text-slate-800">
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
            <div className="bg-white border border-slate-200 p-4 sm:p-6 rounded-3xl">
               <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                 <Tag className="text-indigo-400" /> Resgatar Cupom de Parceria Fornecedora
               </h3>
               <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                  <input 
                    type="text" 
                    placeholder="Código do Cupom Parceiro" 
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="flex-1 bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-900 outline-none uppercase font-bold tracking-widest text-sm"
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
            <div className="bg-white border border-slate-200 p-4 sm:p-6 rounded-3xl space-y-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
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
                        <p className="font-bold text-slate-800">Fatura Mensalidade #{inv.id.substring(inv.id.length - 8).toUpperCase()}</p>
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
          <div className="bg-white border border-slate-200/80 p-4 sm:p-6 rounded-2xl space-y-6 animate-in fade-in duration-300 max-w-3xl">
            <h3 className="font-bold text-md flex items-center gap-2 border-b border-slate-200 pb-3">
              <Wallet className="text-indigo-400" />
              Credenciamento e Split do Asaas
            </h3>
            
            <p className="text-slate-500 text-xs leading-relaxed">
              Associe sua conta digital ASAAS para recolhimento direto das vendas de seus produtos, possibilitando liberação imediata de splits financeiros automáticos e transferências de saldo em conta.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ID da Carteira ASAAS (Wallet ID)</label>
                <input
                  type="text"
                  placeholder="Ex: account_1234567..."
                  value={asaasWalletId}
                  onChange={e => setAsaasWalletId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500 font-mono placeholder-slate-700"
                />
                <p className="text-[10px] text-slate-500 mt-1">ID da conta fornecido pelo Administrador ou localizado em sua conta comercial Asaas.</p>
              </div>


              {/* Address section */}
              <div className="sm:col-span-2 mt-4 pt-4 border-t border-slate-200">
                <h4 className="font-bold text-sm text-slate-900 mb-4">Endereço de Origem (Para cálculo de frete)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CEP</label>
                    <input
                      type="text"
                      placeholder="00000-000"
                      value={cep}
                      onChange={e => setCep(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rua / Logradouro</label>
                    <input
                      type="text"
                      placeholder="Ex: Rua das Flores"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Número</label>
                    <input
                      type="text"
                      placeholder="Ex: 123"
                      value={number}
                      onChange={e => setNumber(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Complemento</label>
                    <input
                      type="text"
                      placeholder="Ex: Sala 2"
                      value={complement}
                      onChange={e => setComplement(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bairro</label>
                    <input
                      type="text"
                      placeholder="Ex: Centro"
                      value={neighborhood}
                      onChange={e => setNeighborhood(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cidade</label>
                    <input
                      type="text"
                      placeholder="Ex: São Paulo"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Estado (UF)</label>
                    <input
                      type="text"
                      placeholder="Ex: SP"
                      value={state}
                      onChange={e => setState(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500 uppercase text-center"
                      maxLength={2}
                    />
                  </div>
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Token Frenet (Cotação de Frete)</label>
                <input
                  type="text"
                  placeholder="Token da API da Frenet"
                  value={frenetToken}
                  onChange={e => setFrenetToken(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500 font-mono placeholder-slate-700"
                />
                <p className="text-[10px] text-slate-500 mt-1">Crie sua conta na Frenet, gere o token e cole aqui para habilitar as opções de frete no checkout.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Chave Pix Comercial</label>
                <input
                  type="text"
                  placeholder="Ex: CNPJ ou E-mail ou Celular"
                  value={pixKey}
                  onChange={e => setPixKey(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dados Bancários Alternativos</label>
                <input
                  type="text"
                  placeholder="Ex: Banco Itaú - Ag 1234, Cc 5678-9"
                  value={bankInfo}
                  onChange={e => setBankInfo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Orientação de Faturamento e Checkout</label>
                <textarea
                  placeholder="Instruções para exibição ao comprador dental / laboratório no checkout..."
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 h-24 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-200 pt-4">
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
