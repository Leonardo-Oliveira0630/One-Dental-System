
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Save, Image as ImageIcon, UploadCloud, Loader2, Building2, Trash2, Plus, LayoutGrid, List, X, ExternalLink, MessageSquare, Star, Info, Copy, Check, Shield, MapPin, Phone, Mail } from 'lucide-react';
import { StoreSettings, BannerConfig } from '../../types';

export const OrganizationTab = () => {
  const { currentOrg, updateOrganization, uploadFile } = useApp();
  const [name, setName] = useState(currentOrg?.name || '');
  const [techResponsibleName, setTechResponsibleName] = useState(currentOrg?.financialSettings?.techResponsibleName || '');
  const [techResponsibleCpf, setTechResponsibleCpf] = useState(currentOrg?.financialSettings?.techResponsibleCpf || '');
  const [logoPreview, setLogoPreview] = useState(currentOrg?.logoUrl || '');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [storeSlug, setStoreSlug] = useState(currentOrg?.storeSlug || currentOrg?.name?.toLowerCase().trim().replace(/[^a-z0-9]/g, '-') || '');
  const [storeVisibility, setStoreVisibility] = useState<'PUBLIC' | 'PRIVATE'>(currentOrg?.storeVisibility || 'PUBLIC');
  const [copied, setCopied] = useState(false);

  const [address, setAddress] = useState(currentOrg?.address || '');
  const [number, setNumber] = useState(currentOrg?.number || '');
  const [complement, setComplement] = useState(currentOrg?.complement || '');
  const [neighborhood, setNeighborhood] = useState(currentOrg?.neighborhood || '');
  const [city, setCity] = useState(currentOrg?.city || '');
  const [stateName, setStateName] = useState(currentOrg?.state || '');
  const [cep, setCep] = useState(currentOrg?.cep || '');
  const [phone, setPhone] = useState(currentOrg?.phone || '');
  const [email, setEmail] = useState(currentOrg?.email || '');
  const [croNumero, setCroNumero] = useState(currentOrg?.croNumero || '');
  const [croUf, setCroUf] = useState(currentOrg?.croUf || '');
  const [revealJobStatusToDentist, setRevealJobStatusToDentist] = useState(currentOrg?.revealJobStatusToDentist || false);
  
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(currentOrg?.storeSettings || {
    banners: [],
    layoutType: 'CARDS',
    portfolio: [],
    menuOptions: ['PRODUCTS', 'PORTFOLIO', 'REVIEWS']
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isUploadingPortfolio, setIsUploadingPortfolio] = useState(false);

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleAddBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploadingBanner(true);
      try {
        const url = await uploadFile(e.target.files[0]);
        setStoreSettings(prev => ({
          ...prev,
          banners: [...(prev.banners || []), { imageUrl: url }]
        }));
      } catch (error) {
        alert("Erro ao enviar banner.");
      } finally {
        setIsUploadingBanner(false);
      }
    }
  };

  const removeBanner = (index: number) => {
    setStoreSettings(prev => ({
      ...prev,
      banners: (prev.banners || []).filter((_, i) => i !== index)
    }));
  };

  const addPortfolioItem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploadingPortfolio(true);
      try {
        const url = await uploadFile(e.target.files[0]);
        const newItem = {
          id: `port_${Date.now()}`,
          title: "Novo Serviço",
          imageUrl: url,
          description: "Descreva este trabalho..."
        };
        setStoreSettings(prev => ({
          ...prev,
          portfolio: [...(prev.portfolio || []), newItem]
        }));
      } catch (error) {
        alert("Erro ao enviar foto para o portfólio.");
      } finally {
        setIsUploadingPortfolio(false);
      }
    }
  };

  const updatePortfolioItem = (id: string, updates: Partial<{title: string, description: string}>) => {
    setStoreSettings(prev => ({
      ...prev,
      portfolio: (prev.portfolio || []).map(item => item.id === id ? { ...item, ...updates } : item)
    }));
  };

  const removePortfolioItem = (id: string) => {
    setStoreSettings(prev => ({
      ...prev,
      portfolio: (prev.portfolio || []).filter(item => item.id !== id)
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;
    setIsSaving(true);
    
    try {
      let finalLogoUrl = currentOrg.logoUrl;
      if (logoFile) {
        finalLogoUrl = await uploadFile(logoFile);
      } else if (!logoPreview) {
        finalLogoUrl = ""; // Remove logo if cleared
      }

      await updateOrganization(currentOrg.id, {
        name: name.trim(),
        logoUrl: finalLogoUrl,
        storeSlug: storeSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, ''),
        storeVisibility: storeVisibility,
        address: address.trim(),
        number: number.trim(),
        complement: complement.trim(),
        neighborhood: neighborhood.trim(),
        city: city.trim(),
        state: stateName.trim(),
        cep: cep.trim(),
        phone: phone.trim(),
        email: email.trim(),
        croNumero: croNumero.trim(),
        croUf: croUf.trim(),
        revealJobStatusToDentist: revealJobStatusToDentist,
        financialSettings: {
          ...currentOrg.financialSettings,
          techResponsibleName: techResponsibleName.trim(),
          techResponsibleCpf: techResponsibleCpf.trim()
        },
        storeSettings: storeSettings
      });
      alert("Configurações atualizadas com sucesso!");
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar configurações.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8 animate-in slide-in-from-left-4 pb-20">
      {/* IDENTIDADE VISUAL */}
      <div className="bg-white p-5 md:p-8 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="text-lg md:text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
          <Building2 className="text-blue-600" size={24} /> Identidade Visual
        </h3>
        
        <form onSubmit={handleSave} className="space-y-6 md:space-y-8">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Nome do Laboratório / Empresa</label>
            <input 
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 md:px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-base md:text-lg"
              placeholder="Ex: Laboratório Digital Smile"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Responsável Técnico</label>
              <input 
                value={techResponsibleName}
                onChange={e => setTechResponsibleName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                placeholder="Ex: Dr. João Silva"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">CPF do Responsável</label>
              <input 
                value={techResponsibleCpf}
                onChange={e => setTechResponsibleCpf(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                placeholder="000.000.000-00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">CRO Número</label>
              <input 
                value={croNumero}
                onChange={e => setCroNumero(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                placeholder="Ex: 12345"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">CRO Estado (UF)</label>
              <input 
                value={croUf}
                onChange={e => setCroUf(e.target.value.toUpperCase().slice(0, 2))}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                placeholder="Ex: ES"
              />
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Logomarca Personalizada</label>
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
              <div className="relative group shrink-0">
                <div className="w-32 h-32 md:w-36 md:h-36 bg-slate-100 rounded-3xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden transition-all group-hover:border-blue-400 group-hover:bg-blue-50 shadow-inner">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                  ) : (
                    <div className="flex flex-col items-center text-slate-300">
                        <ImageIcon size={40} />
                        <span className="text-[10px] font-bold mt-2">Sem Logo</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleLogoSelect} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white pointer-events-none">
                    <UploadCloud size={24} />
                    <span className="text-[10px] font-bold">Alterar</span>
                  </div>
                </div>
                {logoPreview && (
                  <button type="button" onClick={() => { setLogoPreview(''); setLogoFile(null); }} className="absolute -top-2 -right-2 p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <div className="flex-1 space-y-3 bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                <p className="text-[11px] text-blue-700 font-medium leading-relaxed">Pressione a imagem para carregar um novo arquivo PNG ou JPG.</p>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* CONTATO E LOCALIZAÇÃO */}
      <div className="bg-white p-5 md:p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
        <h3 className="text-lg md:text-xl font-black text-slate-800 flex items-center gap-2">
          <MapPin className="text-teal-600" size={24} /> Contato e Localização
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Telefone de Contato</label>
            <input 
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold"
              placeholder="Ex: (11) 99999-9999"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">E-mail de Contato</label>
            <input 
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold"
              placeholder="Ex: contato@labsmile.com"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">CEP</label>
            <input 
              value={cep}
              onChange={e => setCep(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold"
              placeholder="00000-000"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Endereço (Rua/Avenida)</label>
            <input 
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold"
              placeholder="Ex: Av. Paulista"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Número</label>
            <input 
              value={number}
              onChange={e => setNumber(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold"
              placeholder="Ex: 1000"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Complemento</label>
            <input 
              value={complement}
              onChange={e => setComplement(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold"
              placeholder="Ex: Sala 42"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Bairro</label>
            <input 
              value={neighborhood}
              onChange={e => setNeighborhood(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold"
              placeholder="Ex: Centro"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Cidade</label>
              <input 
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-xs"
                placeholder="Ex: Vitória"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Estado</label>
              <input 
                value={stateName}
                onChange={e => setStateName(e.target.value.toUpperCase().slice(0, 2))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-xs"
                placeholder="Ex: ES"
              />
            </div>
          </div>
        </div>
      </div>

      {/* CONFIGURAÇÕES DE ACESSO E LINK DA LOJA */}
      <div className="bg-white p-5 md:p-8 rounded-3xl shadow-sm border border-slate-100 hover:border-indigo-100 transition-all space-y-6">
        <h3 className="text-lg md:text-xl font-black text-slate-800 flex items-center gap-2">
          <ExternalLink className="text-indigo-600" size={24} /> Link e Privacidade da Loja
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">URL Personalizada (Slug)</label>
            <div className="flex bg-slate-50 border border-slate-200 rounded-2xl p-1 focus-within:ring-2 focus-within:ring-indigo-500">
              <span className="text-slate-400 font-bold px-3 py-2 text-sm select-none break-all hidden sm:inline">.../store/</span>
              <input 
                required
                value={storeSlug}
                onChange={e => setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="flex-1 bg-transparent border-0 outline-none px-3 py-2 font-bold text-slate-800 text-sm"
                placeholder="nome-do-seu-lab"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-2 ml-1">Use apenas letras minúsculas, números e hífens.</p>
          </div>

          <div>
             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Visibilidade de Preço do Catálogo</label>
             <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl">
                <button
                   type="button"
                   onClick={() => setStoreVisibility('PUBLIC')}
                   className={`px-4 py-2 text-xs font-black rounded-xl transition-all uppercase ${storeVisibility === 'PUBLIC' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                   Pública
                </button>
                <button
                   type="button"
                   onClick={() => setStoreVisibility('PRIVATE')}
                   className={`px-4 py-2 text-xs font-black rounded-xl transition-all uppercase ${storeVisibility === 'PRIVATE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                   Privada
                </button>
             </div>
          </div>
        </div>

        {/* Informative banners about selections */}
        <div className="bg-slate-50 rounded-3xl p-5 border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium leading-relaxed">
           <div className={`p-4 rounded-2xl border ${storeVisibility === 'PUBLIC' ? 'bg-white border-green-100 text-slate-700' : 'bg-slate-50/50 border-transparent text-slate-400'}`}>
              <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                 <span className={`w-2 h-2 rounded-full ${storeVisibility === 'PUBLIC' ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                 Modo Loja Pública
              </h4>
              <p>Qualquer visitante (mesmo sem estar logado) poderá ver os produtos e seus respectivos preços. Para poder validar orçamentos e enviar trabalhos (comprar), eles serão solicitados a se cadastrar/fazer login.</p>
           </div>
           <div className={`p-4 rounded-2xl border ${storeVisibility === 'PRIVATE' ? 'bg-white border-amber-100 text-slate-700' : 'bg-slate-50/50 border-transparent text-slate-400'}`}>
              <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                 <span className={`w-2 h-2 rounded-full ${storeVisibility === 'PRIVATE' ? 'bg-amber-500' : 'bg-slate-300'}`}></span>
                 Modo Loja Privada
              </h4>
              <p>O catálogo de produtos do laboratório é visível a todos os visitantes, mas para visualizar os preços os dentistas precisam se cadastrar e estar logados no sistema.</p>
           </div>
        </div>

        {/* Copy trigger */}
        {storeSlug && (
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 pt-4 gap-4">
             <div className="text-left">
                <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Seu link de compartilhamento</span>
                <p className="text-sm font-bold text-slate-800 select-all break-all">{`${window.location.origin}/store/${storeSlug}`}</p>
             </div>
             <div className="flex gap-2 w-full sm:w-auto">
                <button
                   type="button"
                   onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/store/${storeSlug}`);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                   }}
                   className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-800 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition-all active:scale-95"
                >
                   {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                   {copied ? 'Copiado!' : 'Copiar Link'}
                </button>
                <a
                   href={`/store/${storeSlug}`}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-700 font-bold rounded-xl text-xs hover:bg-indigo-100 transition-all"
                >
                   <ExternalLink size={14} />
                   Ver Loja
                </a>
             </div>
          </div>
        )}
      </div>

      {/* PORTAL DO CLIENTE */}
      <div className="bg-white p-5 md:p-8 rounded-3xl shadow-sm border border-slate-100 hover:border-blue-100 transition-all space-y-6">
        <h3 className="text-lg md:text-xl font-black text-slate-800 flex items-center gap-2">
          <Shield className="text-blue-600" size={24} /> Portal do Cliente (Dentista)
        </h3>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl gap-4">
          <div className="flex-1">
             <h4 className="font-bold text-slate-800 mb-1">Acompanhamento de Status pelo Dentista</h4>
             <p className="text-xs text-slate-500 leading-relaxed">
               Permitir que os dentistas acompanhem as etapas e o status atualizado dos pedidos/trabalhos diretamente no portal "Meus Pedidos". Caso desativado, as informações de status do trabalho aparecerão como indisponíveis para os clientes.
             </p>
          </div>
          <div>
             <button
                type="button"
                onClick={() => setRevealJobStatusToDentist(!revealJobStatusToDentist)}
                className={`px-5 py-2.5 text-xs font-black rounded-xl transition-all uppercase whitespace-nowrap shadow-sm border ${
                  revealJobStatusToDentist 
                    ? 'bg-blue-600 border-blue-500 text-white hover:bg-blue-700' 
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
             >
                {revealJobStatusToDentist ? 'Ativado (Visualização Liberada)' : 'Desativado (Ocultação)'}
             </button>
          </div>
        </div>
      </div>

      {/* CONFIGURAÇÕES DA LOJA VIRTUAL */}
      <div className="bg-white p-5 md:p-8 rounded-3xl shadow-sm border border-slate-100 space-y-8">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <h3 className="text-lg md:text-xl font-black text-slate-800 flex items-center gap-2">
            <ImageIcon className="text-indigo-600" size={24} /> Store Designer
          </h3>
          <div className="flex bg-slate-100 p-1 rounded-xl">
             <button 
                onClick={() => setStoreSettings(prev => ({ ...prev, layoutType: 'CARDS' }))}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${storeSettings.layoutType === 'CARDS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
             >
                <LayoutGrid size={14} /> Cards
             </button>
             <button 
                onClick={() => setStoreSettings(prev => ({ ...prev, layoutType: 'LIST' }))}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${storeSettings.layoutType === 'LIST' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
             >
                <List size={14} /> Lista
             </button>
          </div>
        </div>

        {/* Frase de Efeito */}
        <div className="space-y-2">
          <label className="block text-xs font-black text-slate-800 uppercase tracking-widest pl-1">Frase de Efeito (Aparece no Card da Loja/Explorar)</label>
          <input 
            type="text"
            value={storeSettings.catchphrase || ''}
            onChange={e => setStoreSettings(prev => ({ ...prev, catchphrase: e.target.value }))}
            maxLength={100}
            placeholder='Ex: "Referência em reabilitação oral e tecnologia 3D avançada."'
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700"
          />
          <p className="text-[10px] text-slate-400 pl-1">Aparece para os dentistas na aba de busca de parceiros e no catálogo da sua loja.</p>
        </div>

        {/* Banners */}
        <div className="space-y-4">
          <div className="flex flex-col mb-2">
            <label className="block text-xs font-black text-slate-800 uppercase tracking-widest pl-1 mb-1">Banners do Topo (Carrossel)</label>
            <p className="text-xs bg-indigo-50 text-indigo-700 py-1.5 px-3 rounded-lg font-bold border border-indigo-100 flex items-center gap-2">
                <Info size={14}/> Resolução exigida: 1920 x 822 pixels (Formato Paisagem 21:9)
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(storeSettings.banners || []).map((banner, i) => (
              <div key={i} className="group relative aspect-[21/9] bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                 <img src={banner.imageUrl} className="w-full h-full object-cover" />
                 <button 
                    onClick={() => removeBanner(i)}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                 >
                    <X size={14} />
                 </button>
              </div>
            ))}
            <label className={`aspect-[21/9] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 hover:border-indigo-400 text-slate-300 hover:text-indigo-500 transition-all ${isUploadingBanner ? 'animate-pulse pointer-events-none' : ''}`}>
               {isUploadingBanner ? <Loader2 className="animate-spin" /> : <Plus size={24} />}
               <span className="text-[10px] font-bold mt-1 text-center px-2">Adicionar Banner</span>
               <input type="file" accept="image/*" onChange={handleAddBanner} className="hidden" />
            </label>
          </div>
        </div>

        {/* Portfólio */}
        <div className="space-y-4">
          <div className="flex flex-col mb-2">
            <label className="block text-xs font-black text-slate-800 uppercase tracking-widest pl-1 mb-1">Portfólio de Casos Reais</label>
            <p className="text-xs bg-indigo-50 text-indigo-700 py-1.5 px-3 rounded-lg font-bold border border-indigo-100 flex items-center gap-2">
                <Info size={14}/> Resolução exigida: 1080 x 1080 pixels (Formato Quadrado 1:1)
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             {(storeSettings.portfolio || []).map((item) => (
               <div key={item.id} className="flex gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-200 relative group">
                  <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-white">
                    <img src={item.imageUrl} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <input 
                      value={item.title}
                      onChange={e => updatePortfolioItem(item.id, { title: e.target.value })}
                      placeholder="Título do trabalho"
                      className="w-full bg-transparent font-bold text-sm outline-none border-b border-transparent focus:border-indigo-300" 
                    />
                    <textarea 
                      value={item.description}
                      onChange={e => updatePortfolioItem(item.id, { description: e.target.value })}
                      placeholder="Pequena descrição..."
                      className="w-full bg-transparent text-xs text-slate-500 outline-none h-12 resize-none"
                    />
                  </div>
                  <button 
                    onClick={() => removePortfolioItem(item.id)}
                    className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
               </div>
             ))}
             <label className={`h-24 flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 hover:border-indigo-400 text-slate-400 hover:text-indigo-500 transition-all ${isUploadingPortfolio ? 'animate-pulse pointer-events-none' : ''}`}>
                {isUploadingPortfolio ? <Loader2 className="animate-spin" /> : <Plus size={20} />}
                <span className="font-bold text-xs">Adicionar ao Portfólio</span>
                <input type="file" accept="image/*" onChange={addPortfolioItem} className="hidden" />
             </label>
          </div>
        </div>

        {/* Menu Selections */}
        <div className="pt-6 border-t border-slate-100 flex flex-wrap gap-4">
           {['PRODUCTS', 'PORTFOLIO', 'REVIEWS'].map((opt) => {
             const labels: Record<string, any> = {
                PRODUCTS: { label: 'Produtos', icon: Building2 },
                PORTFOLIO: { label: 'Portfólio', icon: ImageIcon },
                REVIEWS: { label: 'Avaliações', icon: Star }
             };
             const info = labels[opt];
             const isSelected = (storeSettings.menuOptions || []).includes(opt);
             return (
                <button 
                  key={opt}
                  onClick={() => {
                    const current = storeSettings.menuOptions || [];
                    const next = current.includes(opt) ? current.filter(x => x !== opt) : [...current, opt];
                    setStoreSettings(prev => ({ ...prev, menuOptions: next }));
                  }}
                  className={`flex items-center gap-3 px-5 py-3 rounded-2xl border-2 transition-all ${isSelected ? 'bg-indigo-50 border-indigo-600 text-indigo-700 font-bold' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}
                >
                  <info.icon size={18} />
                  <span className="text-sm uppercase tracking-wider">{info.label}</span>
                </button>
             );
           })}
        </div>
      </div>

      <div className="fixed bottom-6 right-6 z-50">
        <button 
          onClick={handleSave} 
          disabled={isSaving}
          className="px-10 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-70"
        >
          {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
          SALVAR TUDO
        </button>
      </div>
    </div>
  );
};
