
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { JobType, VariationGroup, VariationOption } from '../types';
import { Plus, Edit2, Trash2, X, Save, Layers, Package, Tag, AlertCircle, Folder, ToggleLeft, ToggleRight, List, Type, Image as ImageIcon, UploadCloud, Store, Eye, EyeOff, PercentCircle, Briefcase, Share2, Check } from 'lucide-react';

type Tab = 'BASIC' | 'VARIATIONS';

// Helper to generate Firestore-compatible IDs (alphanumeric)
const generateFirestoreId = (prefix: string) => {
  return `${prefix}_${Math.random().toString(36).substr(2, 9)}`;
};

export const JobTypes = () => {
  const { jobTypes, addJobType, updateJobType, deleteJobType, uploadFile, sectors, currentUser, currentOrg, currentPlan } = useApp();
  
  const isFreeLab = currentOrg?.orgType === 'LAB' && (currentOrg?.planId === 'free_lab' || currentPlan?.id === 'free_lab' || currentPlan?.features?.isLabFreeStoreOnly === true);

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('BASIC');

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleShare = (type: JobType, e: React.MouseEvent) => {
    e.stopPropagation();
    const slugOrId = currentOrg?.storeSlug || currentOrg?.id;
    if (!slugOrId) {
        alert("O laboratório ainda não possui identificador ou link de loja.");
        return;
    }
    const shareUrl = `${window.location.origin}/#/store/${slugOrId}?serviceId=${type.id}`;
    navigator.clipboard.writeText(shareUrl)
        .then(() => {
            setCopiedId(type.id);
            setTimeout(() => setCopiedId(null), 2000);
        })
        .catch((err) => {
            console.error("Erro ao copiar link:", err);
            alert("Não foi possível copiar o link automaticamente.");
        });
  };

  
  const isPromo = (jt: any) => {
    if (jt.isPromotion === true) return true;
    if (jt.isPromotion === false) return false;
    return jt.isPromotion === true || !!jt.originalJobTypeId || !!jt.promotionQuantity || jt.isVoucherCombo === true;
  };

  const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';
  const canCreate = isAdmin || currentUser?.permissions?.includes('catalog:create');
  const canEdit = isAdmin || currentUser?.permissions?.includes('catalog:edit');
  const canDelete = isAdmin || currentUser?.permissions?.includes('catalog:delete');

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [basePrice, setBasePrice] = useState(0);
  const [baseCommission, setBaseCommission] = useState<number | ''>('');
  const [variationGroups, setVariationGroups] = useState<VariationGroup[]>([]);
  const [isVisibleInStore, setIsVisibleInStore] = useState(true);
  const [isVisibleInOutsourcing, setIsVisibleInOutsourcing] = useState(true);
  const [isVisibleInternally, setIsVisibleInternally] = useState(true);
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [allowedSectors, setAllowedSectors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [mainTab, setMainTab] = useState<'SERVICES' | 'PROMOTIONS'>('SERVICES');
  const [isPromotion, setIsPromotion] = useState(false);
  const [promotionQuantity, setPromotionQuantity] = useState<number | ''>('');
  const [isVoucherCombo, setIsVoucherCombo] = useState(true);
  const [promotionCallText, setPromotionCallText] = useState('');
  const [originalJobTypeId, setOriginalJobTypeId] = useState('');
  const [applyToAllVariations, setApplyToAllVariations] = useState(true);
  const [promoVariationOptionId, setPromoVariationOptionId] = useState('');
  const [promoVariationOptionIds, setPromoVariationOptionIds] = useState<string[]>([]);

  const resetForm = () => {
    setName('');
    setCategory('');
    setBasePrice(0);
    setBaseCommission('');
    setVariationGroups([]);
    setIsVisibleInStore(true);
    setIsVisibleInOutsourcing(true);
    setIsVisibleInternally(!isFreeLab);
    setImageUrl('');
    setImageFile(null);
    setPreviewUrl('');
    setAllowedSectors([]);
    setPromotionQuantity('');
    setPromotionCallText('');
    setIsVoucherCombo(true);
    setOriginalJobTypeId('');
    setApplyToAllVariations(true);
    setPromoVariationOptionId('');
    setPromoVariationOptionIds([]);
    setIsEditing(false);
    setEditingId(null);
    setActiveTab('BASIC');
  };

  const handleEdit = (type: JobType) => {
    setIsEditing(true);
    setEditingId(type.id);
    setName(type.name);
    setCategory(type.category);
    setBasePrice(type.basePrice);
    setBaseCommission(type.baseCommission ?? '');
    setVariationGroups(type.variationGroups || []);
    setIsVisibleInStore(type.isVisibleInStore !== false); // Default true if undefined
    setIsVisibleInOutsourcing(type.isVisibleInOutsourcing !== false); // Default true if undefined
    setIsVisibleInternally(isFreeLab ? false : (type.isVisibleInternally !== false));
    setImageUrl(type.imageUrl || '');
    setPreviewUrl(type.imageUrl || '');
    setAllowedSectors(type.allowedSectors || []);
    setIsPromotion(type.isPromotion || false);
    setPromotionQuantity(type.promotionQuantity || '');
    setPromotionCallText(type.promotionCallText || '');
    setOriginalJobTypeId(type.originalJobTypeId || '');
    setIsVoucherCombo(type.isVoucherCombo ?? true);
    setApplyToAllVariations(type.applyToAllVariations !== false);
    setPromoVariationOptionId(type.promoVariationOptionId || '');
    setPromoVariationOptionIds(type.promoVariationOptionIds || (type.promoVariationOptionId ? [type.promoVariationOptionId] : []));
    setImageFile(null);
    setActiveTab('BASIC');
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setImageFile(file);
          setPreviewUrl(URL.createObjectURL(file));
      }
  };

  const getOriginalJobTypeVariations = () => {
    if (!originalJobTypeId) return [];
    const originalType = jobTypes.find(jt => jt.id === originalJobTypeId);
    if (!originalType || !originalType.variationGroups) return [];
    
    const options: { id: string; name: string; groupName: string }[] = [];
    originalType.variationGroups.forEach(group => {
      if (group.options) {
        group.options.forEach(opt => {
          options.push({
            id: opt.id,
            name: opt.name,
            groupName: group.name
          });
        });
      }
    });
    return options;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !category) {
        alert("Preencha o nome e a categoria.");
        return;
    }
    
    setIsSaving(true);
    try {
      let finalImageUrl = imageUrl;

      // Upload image if selected
      if (imageFile) {
          finalImageUrl = await uploadFile(imageFile);
      }

      const isPromoToSave = mainTab === 'PROMOTIONS';
      
      let promoVariationOptionName = '';
      let promoVariationGroupName = '';
      let fallbackOptionId = promoVariationOptionId;
      if (isPromoToSave && !applyToAllVariations && promoVariationOptionIds.length > 0) {
        const foundOptions = getOriginalJobTypeVariations().filter(o => promoVariationOptionIds.includes(o.id));
        if (foundOptions.length > 0) {
          promoVariationOptionName = foundOptions.map(o => o.name).join(', ');
          promoVariationGroupName = Array.from(new Set(foundOptions.map(o => o.groupName))).join(', ');
          fallbackOptionId = promoVariationOptionIds[0];
        }
      }

      const commonFields = {
          name, 
          category, 
          basePrice, 
          baseCommission: baseCommission === '' ? undefined : Number(baseCommission), 
          variationGroups, 
          isVisibleInStore, 
          isVisibleInOutsourcing, 
          isVisibleInternally, 
          imageUrl: finalImageUrl, 
          allowedSectors,
          isPromotion: isPromoToSave,
      };

      const promoFields = isPromoToSave ? {
          promotionQuantity: promotionQuantity === '' ? undefined : Number(promotionQuantity),
          promotionCallText,
          originalJobTypeId,
          isVoucherCombo,
          applyToAllVariations,
          promoVariationOptionId: fallbackOptionId,
          promoVariationOptionIds,
          promoVariationOptionName,
          promoVariationGroupName
      } : {
          promotionQuantity: undefined,
          promotionCallText: '',
          originalJobTypeId: '',
          isVoucherCombo: false,
          applyToAllVariations: true,
          promoVariationOptionId: '',
          promoVariationOptionIds: [],
          promoVariationOptionName: '',
          promoVariationGroupName: ''
      };

      const savePayload = {
          ...commonFields,
          ...promoFields
      };

      if (isEditing && editingId) {
          await updateJobType(editingId, savePayload);
      } else {
          const newType: Omit<JobType, 'id'> = savePayload as any;
          await addJobType(newType);
      }
      resetForm();
    } catch (error) {
        console.error("Failed to save Job Type:", error);
        alert("Falha ao salvar o tipo de trabalho. Verifique se você tem permissão ou está conectado a um laboratório.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- Variation Group & Option Handlers ---

  const addGroup = () => {
      const newGroup: VariationGroup = {
          id: generateFirestoreId('group'),
          name: `Novo Grupo ${variationGroups.length + 1}`,
          selectionType: 'SINGLE',
          options: []
      };
      setVariationGroups([...variationGroups, newGroup]);
  };

  const updateGroup = (groupId: string, updates: Partial<VariationGroup>) => {
      setVariationGroups(groups => groups.map(g => g.id === groupId ? { ...g, ...updates } : g));
  };

  const deleteGroup = (groupId: string) => {
      setVariationGroups(groups => groups.filter(g => g.id !== groupId));
  };

  const addOption = (groupId: string) => {
      const newOption: VariationOption = {
          id: generateFirestoreId('opt'),
          name: 'Nova Opção',
          priceModifier: 0,
          disablesOptions: [],
          isDiscountExempt: false
      };
      const group = variationGroups.find(g => g.id === groupId);
      const currentOptions = group?.options || []; 
      
      updateGroup(groupId, { options: [...currentOptions, newOption] });
  };
  
  const updateOption = (groupId: string, optionId: string, updates: Partial<VariationOption>) => {
      const group = variationGroups.find(g => g.id === groupId);
      if (!group) return;
      const currentOptions = group.options || [];
      const updatedOptions = currentOptions.map(o => o.id === optionId ? { ...o, ...updates } : o);
      updateGroup(groupId, { options: updatedOptions });
  };

  const deleteOption = (groupId: string, optionId: string) => {
      const group = variationGroups.find(g => g.id === groupId);
      if (!group) return;
      const currentOptions = group.options || [];
      updateGroup(groupId, { options: currentOptions.filter(o => o.id !== optionId) });
  };

  const cycleSelectionType = (current: string): 'SINGLE' | 'MULTIPLE' | 'TEXT' => {
      if (current === 'SINGLE') return 'MULTIPLE';
      if (current === 'MULTIPLE') return 'TEXT';
      return 'SINGLE';
  };

  const getSelectionTypeLabel = (type: string) => {
      switch(type) {
          case 'SINGLE': return 'Seleção Única (Radio)';
          case 'MULTIPLE': return 'Múltipla Escolha (Check)';
          case 'TEXT': return 'Campo de Texto (Input)';
          default: return type;
      }
  };

  return (
    <div className="space-y-6 pb-12">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">Catálogo de Serviços e Promoções</h1>
            <p className="text-slate-500">Gerencie tipos de próteses, preços, pacotes promocionais e variações.</p>
        </div>
        <div className="flex items-center gap-4">
            <div className="bg-slate-100 p-1 rounded-xl flex items-center shrink-0">
                <button
                    onClick={() => { setMainTab('SERVICES'); setIsPromotion(false); resetForm(); }}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${mainTab === 'SERVICES' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Serviços
                </button>
                <button
                    onClick={() => { setMainTab('PROMOTIONS'); setIsPromotion(true); resetForm(); }}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${mainTab === 'PROMOTIONS' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Promoções
                </button>
            </div>
            {isEditing && canCreate && (
                <button 
                    onClick={resetForm}
                    className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 flex items-center gap-2 whitespace-nowrap"
                >
                    <Plus size={18} /> {mainTab === 'PROMOTIONS' ? 'Nova Promoção' : 'Novo Serviço'}
                </button>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: List */}
        <div className="space-y-4 lg:col-span-1 order-2 lg:order-1">
            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-2">{mainTab === 'PROMOTIONS' ? 'Promoções' : 'Serviços'} Cadastrados</h3>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
                {jobTypes.filter(type => mainTab === 'PROMOTIONS' ? isPromo(type) : !isPromo(type)).map(type => (
                    <div 
                        key={type.id} 
                        onClick={() => handleEdit(type)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                            editingId === type.id 
                                ? 'bg-blue-50 border-blue-400 shadow-md' 
                                : 'bg-white border-slate-100 shadow-sm hover:border-blue-200'
                        }`}
                    >
                        <div className="flex gap-3">
                            {/* Thumbnail */}
                            <div className="w-12 h-12 rounded-lg bg-slate-100 shrink-0 overflow-hidden border border-slate-200 flex items-center justify-center">
                                {type.imageUrl ? (
                                    <img src={type.imageUrl} alt={type.name} className="w-full h-full object-cover" />
                                ) : (
                                    <Package size={20} className="text-slate-300" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1 gap-2">
                                    <h3 className={`font-bold truncate ${editingId === type.id ? 'text-blue-800' : 'text-slate-800'}`}>
                                        {type.name}
                                    </h3>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button 
                                            onClick={(e) => handleShare(type, e)}
                                            className={`p-1.5 rounded-lg border transition-all ${
                                                copiedId === type.id 
                                                    ? 'bg-green-50 border-green-200 text-green-600' 
                                                    : 'bg-slate-50 border-slate-100 hover:border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'
                                            }`}
                                            title="Compartilhar Link"
                                        >
                                            {copiedId === type.id ? <Check size={13} /> : <Share2 size={13} />}
                                        </button>
                                        {editingId !== type.id && canDelete && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); deleteJobType(type.id); }} 
                                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                                title="Excluir"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-semibold uppercase truncate max-w-[80px]">{type.category}</span>
                                    <span className="font-bold text-slate-700">R$ {type.basePrice.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-1 flex-wrap">
                            <div className="text-xs text-slate-400 flex items-center gap-1">
                                <Layers size={12} />
                                {type.variationGroups.length} grupos
                            </div>
                            <div className="flex gap-1 flex-wrap">
                                {type.isVisibleInStore === false && (
                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded flex items-center gap-1">
                                        <EyeOff size={10} /> Oculto na Loja
                                    </span>
                                )}
                                {type.isVisibleInternally === false && (
                                    <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                        <EyeOff size={10} /> Oculto Interno
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Right Column: Editor Form */}
        <div className="lg:col-span-2 order-1 lg:order-2">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
                {/* Header / Tabs */}
                <div className="bg-slate-50 border-b border-slate-200 flex">
                    <button
                        onClick={() => setActiveTab('BASIC')}
                        className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                            activeTab === 'BASIC' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Package size={18} /> Dados Gerais
                    </button>
                    <button
                        onClick={() => setActiveTab('VARIATIONS')}
                        className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                            activeTab === 'VARIATIONS' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Layers size={18} /> Grupos & Variações
                        <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full text-[10px]">
                            {variationGroups.length}
                        </span>
                    </button>
                </div>

                <form onSubmit={handleSave} className="p-6">
                    {activeTab === 'BASIC' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                             <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold text-slate-800">
                                    {isEditing ? `Editando: ${name}` : (mainTab === 'PROMOTIONS' ? 'Nova Promoção' : 'Novo Serviço')}
                                </h2>
                             </div>
                             
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    {mainTab === 'PROMOTIONS' && (
                                        <>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Tipo de Promoção</label>
                                            <div className="flex gap-4">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="radio" checked={isVoucherCombo} onChange={() => setIsVoucherCombo(true)} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                                                    <span className="text-sm text-slate-700">Pacote/Combo (Gera Voucher)</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="radio" checked={!isVoucherCombo} onChange={() => setIsVoucherCombo(false)} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                                                    <span className="text-sm text-slate-700">Unitário (Desconto Direto)</span>
                                                </label>
                                            </div>
                                            {isVoucherCombo && (
                                                <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2 rounded border border-slate-200">
                                                    O cliente comprará o pacote e receberá um voucher com a quantidade definida para resgatar em pedidos futuros sem precisar enviar paciente ou STL agora.
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1">Serviço Original</label>
                                            <select value={originalJobTypeId} onChange={e => {
                                                setOriginalJobTypeId(e.target.value);
                                                setPromoVariationOptionId('');
                                            }} required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                                                <option value="">Selecione um Serviço...</option>
                                                {jobTypes.filter(jt => !jt.isPromotion).map(jt => (
                                                    <option key={jt.id} value={jt.id}>{jt.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        {originalJobTypeId && (
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-2">Escopo da Promoção</label>
                                                <div className="flex gap-4 mb-2">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="radio" checked={applyToAllVariations} onChange={() => {
                                                            setApplyToAllVariations(true);
                                                            setPromoVariationOptionId("");
                                                            setPromoVariationOptionIds([]);
                                                        }} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                                                        <span className="text-xs font-medium text-slate-700">Qualquer variação (Todo o Serviço)</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="radio" checked={!applyToAllVariations} onChange={() => setApplyToAllVariations(false)} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                                                        <span className="text-xs font-medium text-slate-700">Variação Específica</span>
                                                    </label>
                                                </div>
                                                
                                                {!applyToAllVariations && (
                                                    <div className="space-y-4 mt-2 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                                        <label className="block text-xs font-bold text-slate-700">Selecione as Variações Vigentes:</label>
                                                        {(() => {
                                                            const originalType = jobTypes.find(jt => jt.id === originalJobTypeId);
                                                            if (!originalType || !originalType.variationGroups || originalType.variationGroups.length === 0) {
                                                                return <p className="text-xs text-slate-500 italic">O serviço selecionado não possui variações cadastradas.</p>;
                                                            }
                                                            return originalType.variationGroups.map(group => (
                                                                <div key={group.id} className="border-t border-slate-200 pt-2 first:border-0 first:pt-0">
                                                                    <p className="text-xs font-bold text-indigo-600 mb-1">{group.name}</p>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                        {(group.options || []).map(opt => {
                                                                            const isChecked = promoVariationOptionIds.includes(opt.id);
                                                                            return (
                                                                                <label key={opt.id} className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-slate-100 rounded text-xs">
                                                                                    <input 
                                                                                        type="checkbox" 
                                                                                        checked={isChecked} 
                                                                                        onChange={() => {
                                                                                            if (isChecked) {
                                                                                                setPromoVariationOptionIds(promoVariationOptionIds.filter(id => id !== opt.id));
                                                                                            } else {
                                                                                                setPromoVariationOptionIds([...promoVariationOptionIds, opt.id]);
                                                                                            }
                                                                                        }} 
                                                                                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" 
                                                                                    />
                                                                                    <span className="text-slate-700 font-medium">{opt.name}</span>
                                                                                </label>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            ));
                                                        })()}
                                                        <p className="text-[10px] text-slate-500 leading-tight">
                                                            A promoção será restrita e só poderá ser aplicada quando as variações selecionadas acima forem selecionadas pelo cliente no carrinho.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">{mainTab === 'PROMOTIONS' ? 'Nome do Pacote' : 'Nome do Serviço'}</label>
                                        <input value={name} onChange={e => setName(e.target.value)} required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Categoria</label>
                                        <input value={category} onChange={e => setCategory(e.target.value)} required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: Prótese Fixa"/>
                                    </div>
                                    {mainTab === 'PROMOTIONS' && (
                                        <>
                                            {isVoucherCombo && (
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-700 mb-1">Quantidade do Pacote</label>
                                                    <input type="number" min="1" value={promotionQuantity} onChange={e => setPromotionQuantity(e.target.value === '' ? '' : parseInt(e.target.value))} required={isVoucherCombo} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: 10"/>
                                                </div>
                                            )}
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-1">Texto de Chamada</label>
                                                <input value={promotionCallText} onChange={e => setPromotionCallText(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: Aproveite o combo promocional!"/>
                                            </div>
                                        </>
                                    )}
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">{mainTab === 'PROMOTIONS' ? 'Preço Promocional (R$)' : 'Preço Base (R$)'}</label>
                                        <div className="flex flex-col gap-2">
                                            {mainTab === 'PROMOTIONS' && originalJobTypeId && promotionQuantity && (
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="number" 
                                                        placeholder="% de desconto" 
                                                        className="w-1/3 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value);
                                                            if (!isNaN(val)) {
                                                                const original = jobTypes.find(jt => jt.id === originalJobTypeId);
                                                                if (original) {
                                                                    const total = original.basePrice * Number(promotionQuantity);
                                                                    setBasePrice(total - (total * (val / 100)));
                                                                }
                                                            }
                                                        }}
                                                    />
                                                    <span className="text-xs text-slate-500 flex-1">
                                                        (Opcional) Digite a % para calcular o R$ abaixo
                                                    </span>
                                                </div>
                                            )}
                                            <div className="relative">
                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">R$</div>
                                                <input type="number" step="0.01" value={basePrice} onChange={e => setBasePrice(parseFloat(e.target.value))} required className="w-full pl-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                            </div>
                                        </div>
                                        {mainTab === 'PROMOTIONS' && originalJobTypeId && promotionQuantity && (
                                            <div className="mt-2 text-xs font-medium text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200 flex justify-between">
                                                <span>Valor original total: R$ {((jobTypes.find(jt => jt.id === originalJobTypeId)?.basePrice || 0) * Number(promotionQuantity) || 0).toFixed(2)}</span>
                                                {jobTypes.find(jt => jt.id === originalJobTypeId) && basePrice < ((jobTypes.find(jt => jt.id === originalJobTypeId)?.basePrice || 0) * Number(promotionQuantity)) && (
                                                    <span className="text-green-600 font-bold">-{Math.round(((((jobTypes.find(jt => jt.id === originalJobTypeId)?.basePrice || 0) * Number(promotionQuantity)) - basePrice) / ((jobTypes.find(jt => jt.id === originalJobTypeId)?.basePrice || 1) * Number(promotionQuantity))) * 100)}% off</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {mainTab === 'SERVICES' && (
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Valor Base de Comissão (R$)</label>
                                        <input type="number" step="0.01" value={baseCommission} onChange={e => setBaseCommission(e.target.value === '' ? '' : parseFloat(e.target.value))} placeholder="Ex: 5.00" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
                                        <p className="text-xs text-slate-500 mt-1">Usado caso o colaborador não tenha valor fixo na aba Ganhos.</p>
                                    </div>
                                    )}
                                </div>

                                {/* Store Configuration */}
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                                    <h3 className="font-bold text-slate-700 flex items-center gap-2 border-b border-slate-200 pb-2 text-xs uppercase tracking-wider">
                                        <Store size={18} className="text-zinc-500" /> Canais de Exibição/Vendas
                                    </h3>
                                    
                                    <div className="space-y-3">
                                        <div className="flex flex-col gap-1 bg-white p-3 rounded-lg border border-slate-200">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-slate-800">Loja Clínicas (Dentistas)</span>
                                                <button 
                                                    type="button" 
                                                    onClick={() => setIsVisibleInStore(!isVisibleInStore)}
                                                    className={`relative w-10 h-5 rounded-full transition-colors duration-200 ease-in-out shrink-0 ${isVisibleInStore ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                                >
                                                    <span className={`block w-3 h-3 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out mt-1 ml-1 ${isVisibleInStore ? 'translate-x-5' : 'translate-x-0'}`} />
                                                </button>
                                            </div>
                                            <span className="text-[10px] text-slate-400">Exibir no catálogo geral para cirurgiões-dentistas</span>
                                        </div>

                                        <div className="flex flex-col gap-1 bg-white p-3 rounded-lg border border-slate-200">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-slate-800">Canal Terceirização</span>
                                                <button 
                                                    type="button" 
                                                    onClick={() => setIsVisibleInOutsourcing(!isVisibleInOutsourcing)}
                                                    className={`relative w-10 h-5 rounded-full transition-colors duration-200 ease-in-out shrink-0 ${isVisibleInOutsourcing ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                                >
                                                    <span className={`block w-3 h-3 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out mt-1 ml-1 ${isVisibleInOutsourcing ? 'translate-x-5' : 'translate-x-0'}`} />
                                                </button>
                                            </div>
                                            <span className="text-[10px] text-slate-400">Exibir no catálogo para laboratórios parceiros contratantes</span>
                                        </div>

                                        <div className={`flex flex-col gap-1 bg-white p-3 rounded-lg border border-slate-200 ${isFreeLab ? 'hidden' : 'flex'}`}>
                                            {!isFreeLab && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-slate-800">Trabalhos Internos</span>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setIsVisibleInternally(!isVisibleInternally)}
                                                        className={`relative w-10 h-5 rounded-full transition-colors duration-200 ease-in-out shrink-0 ${isVisibleInternally ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                                    >
                                                        <span className={`block w-3 h-3 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out mt-1 ml-1 ${isVisibleInternally ? 'translate-x-5' : 'translate-x-0'}`} />
                                                    </button>
                                                </div>
                                            )}
                                            {!isFreeLab && (
                                                <span className="text-[10px] text-slate-400">Ativar visibilidade para trabalhos manuais ou ordens internas criadas no laboratório</span>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Imagem do Produto</label>
                                        <div className="flex items-center gap-4">
                                            <div className="w-20 h-20 bg-white border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center overflow-hidden relative group">
                                                {previewUrl ? (
                                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                                ) : (
                                                    <ImageIcon className="text-slate-300" />
                                                )}
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <UploadCloud className="text-white" size={20} />
                                                </div>
                                                <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    onChange={handleImageSelect}
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                />
                                            </div>
                                            <div className="flex-1 text-xs text-slate-500">
                                                <p>Clique na imagem para enviar.</p>
                                                <p>Formatos: PNG, JPG.</p>
                                                {previewUrl && (
                                                    <button type="button" onClick={() => { setPreviewUrl(''); setImageFile(null); setImageUrl(''); }} className="text-red-500 hover:underline mt-1">Remover Imagem</button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                             </div>

                             {/* Allowed Sectors */}
                             <div className="bg-white p-4 rounded-xl border border-slate-200 mt-6 shadow-sm">
                                 <h3 className="font-bold text-slate-700 flex items-center gap-2 border-b border-slate-200 pb-2 mb-3">
                                     <Briefcase size={18} className="text-blue-500" /> Setores Permitidos
                                 </h3>
                                 <p className="text-xs text-slate-500 mb-4">
                                     Selecione os setores que este trabalho poderá passar. Se nenhum setor for selecionado, o trabalho poderá passar por qualquer setor.
                                 </p>
                                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                     {sectors.map(sector => (
                                         <label key={sector.id} className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer transition-colors ${allowedSectors.includes(sector.name) ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                                             <input 
                                                 type="checkbox" 
                                                 checked={allowedSectors.includes(sector.name)}
                                                 onChange={(e) => {
                                                     if (e.target.checked) setAllowedSectors([...allowedSectors, sector.name]);
                                                     else setAllowedSectors(allowedSectors.filter(s => s !== sector.name));
                                                 }}
                                                 className="rounded text-blue-600 focus:ring-blue-500"
                                             />
                                             <span className="text-sm font-medium text-slate-700 truncate">{sector.name}</span>
                                         </label>
                                     ))}
                                 </div>
                             </div>
                        </div>
                    )}
                    
                    {/* --- NEW VARIATIONS TAB --- */}
                    {activeTab === 'VARIATIONS' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold text-slate-800">Configurar Variações</h2>
                                <button type="button" onClick={addGroup} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-100 text-indigo-700 rounded-lg font-bold hover:bg-indigo-200">
                                    <Plus size={16} /> Novo Grupo
                                </button>
                            </div>
                            
                            {variationGroups.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                                    Clique em "Novo Grupo" para começar.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {variationGroups.map(group => (
                                        <div key={group.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                            {/* Group Header */}
                                            <div className="flex justify-between items-center mb-3 border-b border-slate-200 pb-3">
                                                <div className="flex items-center gap-2 flex-1">
                                                    <Folder size={18} className="text-indigo-500" />
                                                    <input 
                                                        value={group.name}
                                                        onChange={(e) => updateGroup(group.id, { name: e.target.value })}
                                                        className="font-bold text-lg text-slate-800 bg-transparent focus:bg-white rounded p-1 outline-none focus:ring-1 focus:ring-indigo-400 w-full"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-3">
                                                     <button 
                                                        type="button" 
                                                        onClick={() => updateGroup(group.id, { selectionType: cycleSelectionType(group.selectionType) })} 
                                                        className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors" 
                                                        title="Mudar tipo de seleção"
                                                     >
                                                        {group.selectionType === 'SINGLE' && <ToggleLeft size={16} />}
                                                        {group.selectionType === 'MULTIPLE' && <ToggleRight size={16} />}
                                                        {group.selectionType === 'TEXT' && <Type size={16} />}
                                                        {getSelectionTypeLabel(group.selectionType)}
                                                    </button>
                                                    <button type="button" onClick={() => deleteGroup(group.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                                                </div>
                                            </div>

                                            {/* Options within group */}
                                            <div className="space-y-3">
                                                {(group.options || []).map(option => (
                                                    <div key={option.id} className="bg-white p-3 rounded-lg border border-slate-200 space-y-3">
                                                        <div className="grid grid-cols-12 gap-2 items-end">
                                                            <div className="col-span-12 sm:col-span-6">
                                                                <label className="text-[10px] text-slate-500 font-bold block">
                                                                    {group.selectionType === 'TEXT' ? 'Rótulo do Campo (ex: Cor)' : 'Nome da Opção'}
                                                                </label>
                                                                <input value={option.name} onChange={e => updateOption(group.id, option.id, { name: e.target.value })} className="w-full p-2 text-sm rounded bg-slate-50 focus:bg-white outline-none focus:ring-1 ring-slate-200 focus:ring-indigo-400" placeholder={group.selectionType === 'TEXT' ? "Ex: Especifique a cor" : "Ex: Zircônia Translúcida"} />
                                                            </div>
                                                            <div className="col-span-6 sm:col-span-3">
                                                                <label className="text-[10px] text-slate-500 font-bold block">Acréscimo (R$)</label>
                                                                <div className="relative">
                                                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span>
                                                                    <input 
                                                                        type="number" 
                                                                        step="0.01" 
                                                                        value={option.priceModifier} 
                                                                        onChange={e => updateOption(group.id, option.id, { priceModifier: parseFloat(e.target.value) || 0 })} 
                                                                        className="w-full p-2 text-sm rounded bg-slate-50 focus:bg-white outline-none focus:ring-1 ring-slate-200 focus:ring-indigo-400 text-right pr-3 pl-8" 
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="col-span-4 sm:col-span-2 flex flex-col items-center">
                                                                <label className="text-[10px] text-slate-500 font-bold block mb-1">Isento de Desconto</label>
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => updateOption(group.id, option.id, { isDiscountExempt: !option.isDiscountExempt })}
                                                                    className={`p-2 rounded-lg border transition-all ${option.isDiscountExempt ? 'bg-orange-100 border-orange-400 text-orange-600 shadow-inner' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                                                                    title={option.isDiscountExempt ? 'Valor fixo (não aceita descontos)' : 'Valor descontável'}
                                                                >
                                                                    <PercentCircle size={18} />
                                                                </button>
                                                            </div>
                                                            <div className="col-span-2 sm:col-span-1 flex justify-end pb-2">
                                                                <button type="button" onClick={() => deleteOption(group.id, option.id)} className="text-slate-300 hover:text-red-500 p-2"><X size={16} /></button>
                                                            </div>
                                                        </div>
                                                        <div className="pl-1">
                                                            <label className="text-[10px] text-slate-500 font-bold block mb-1 flex items-center gap-1">
                                                                <AlertCircle size={10} className="text-orange-500" />
                                                                Se esta opção for escolhida, DESABILITAR as seguintes opções:
                                                            </label>
                                                            
                                                            <div className="w-full border rounded bg-slate-50 max-h-32 overflow-y-auto p-2">
                                                                {variationGroups.filter(g => g.id !== group.id).length === 0 && (
                                                                    <p className="text-[10px] text-slate-400 italic p-1">Crie outros grupos para condicionar.</p>
                                                                )}
                                                                {variationGroups.filter(g => g.id !== group.id).map(otherGroup => (
                                                                    <div key={otherGroup.id} className="mb-2">
                                                                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-1 sticky top-0 bg-slate-50">{otherGroup.name}</p>
                                                                        <div className="space-y-1 pl-1">
                                                                            {(otherGroup.options || []).map(otherOption => {
                                                                                const isChecked = (option.disablesOptions || []).includes(otherOption.id);
                                                                                return (
                                                                                    <label key={otherOption.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 rounded p-1">
                                                                                        <input 
                                                                                            type="checkbox" 
                                                                                            checked={isChecked}
                                                                                            onChange={() => {
                                                                                                const current = option.disablesOptions || [];
                                                                                                const newList = isChecked 
                                                                                                    ? current.filter(id => id !== otherOption.id) 
                                                                                                    : [...current, otherOption.id];
                                                                                                updateOption(group.id, option.id, { disablesOptions: newList });
                                                                                            }}
                                                                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3 h-3"
                                                                                        />
                                                                                        <span className="text-xs text-slate-700">{otherOption.name}</span>
                                                                                    </label>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                <button type="button" onClick={() => addOption(group.id)} className="w-full text-xs text-center py-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 font-bold">
                                                    + Adicionar {group.selectionType === 'TEXT' ? 'Campo' : 'Opção'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end gap-3">
                         {isEditing && (
                            <button 
                                type="button"
                                onClick={resetForm}
                                className="px-6 py-3 text-slate-500 hover:bg-slate-50 rounded-xl font-medium"
                            >
                                Cancelar
                            </button>
                        )}
                        <button 
                            type="submit"
                            disabled={isSaving || (isEditing ? !canEdit : !canCreate)}
                            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:shadow-lg shadow-blue-200 transition-all transform hover:scale-[1.02] flex items-center gap-2 disabled:opacity-50"
                        >
                            <Save size={20} />
                            {isSaving ? 'Salvando...' : (isEditing ? 'Atualizar' : 'Salvar')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      </div>
    </div>
  );
};
