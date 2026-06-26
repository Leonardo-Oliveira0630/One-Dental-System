import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Plus, Trash2, Save, Loader2, Image as ImageIcon, Upload } from 'lucide-react';
import { MarketplaceBannerConfig } from '../../types';
import { uploadBannerImage } from '../../services/firebaseService';

export const MarketplaceBannersAdmin = () => {
    const { globalSettings, updateGlobalSettings, allSuppliers } = useApp();
    const [banners, setBanners] = useState<MarketplaceBannerConfig[]>([]);
    const [officialStoresIds, setOfficialStoresIds] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [uploadingId, setUploadingId] = useState<string | null>(null);

    useEffect(() => {
        if (globalSettings?.marketplaceBanners) {
            setBanners(globalSettings.marketplaceBanners);
        }
        if (globalSettings?.officialStoresIds) {
            setOfficialStoresIds(globalSettings.officialStoresIds);
        }
    }, [globalSettings]);

    const handleAddBanner = () => {
        setBanners([...banners, { 
            id: Date.now().toString(), 
            imageUrl: '', 
            text: '', 
            button: { show: false, text: 'Comprar', link: '#', color: '#EE4D2D', size: 'md' } 
        }]);
    };

    const handleRemoveBanner = (id: string) => {
        setBanners(banners.filter(b => b.id !== id));
    };

    const handleUpdateBanner = (id: string, field: string, value: any) => {
        setBanners(banners.map(b => {
            if (b.id === id) {
                if (field.includes('.')) {
                    const [obj, key] = field.split('.');
                    return { ...b, [obj]: { ...(b as any)[obj], [key]: value } };
                }
                return { ...b, [field]: value };
            }
            return b;
        }));
    };

    const handleFileUpload = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingId(id);
        try {
            const url = await uploadBannerImage(file);
            handleUpdateBanner(id, 'imageUrl', url);
        } catch (error) {
            console.error("Erro ao fazer upload da imagem:", error);
            alert("Erro ao fazer upload da imagem. Tente novamente.");
        } finally {
            setUploadingId(null);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateGlobalSettings({ 
                marketplaceBanners: banners,
                officialStoresIds: officialStoresIds 
            });
            alert("Configurações do marketplace atualizadas com sucesso!");
        } catch (err) {
            alert("Erro ao salvar.");
        } finally {
            setIsSaving(false);
        }
    };

    const toggleOfficialStore = (id: string) => {
        setOfficialStoresIds(prev => 
            prev.includes(id) ? prev.filter(storeId => storeId !== id) : [...prev, id]
        );
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mb-8">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <ImageIcon className="text-slate-600" />
                    <h2 className="font-black text-slate-800 text-lg uppercase tracking-tight">Banners e Lojas Oficiais (Marketplace)</h2>
                </div>
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2"
                >
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Salvar Configurações
                </button>
            </div>
            
            <div className="p-6 space-y-12">
                {/* Lojas Oficiais Section */}
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-2">Lojas Oficiais (Destaque)</h3>
                    <p className="text-xs text-slate-500">Selecione quais fornecedores devem aparecer na seção "Lojas Oficiais" do Marketplace.</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {allSuppliers.map(supplier => (
                            <label key={supplier.id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                                <input 
                                    type="checkbox" 
                                    checked={officialStoresIds.includes(supplier.id)}
                                    onChange={() => toggleOfficialStore(supplier.id)}
                                    className="w-4 h-4 text-blue-600 rounded"
                                />
                                <div className="flex items-center gap-2">
                                    {supplier.logoUrl ? (
                                        <img src={supplier.logoUrl} alt={supplier.name} className="w-6 h-6 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold">
                                            {supplier.name.slice(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                    <span className="text-sm font-semibold text-slate-700 truncate" title={supplier.name}>{supplier.name}</span>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Banners Section */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                        <h3 className="font-bold text-slate-800">Banners Rotativos</h3>
                        <button onClick={handleAddBanner} className="flex items-center gap-1 text-sm text-blue-600 font-bold hover:text-blue-700">
                            <Plus size={16} /> Adicionar Banner
                        </button>
                    </div>
                    {banners.map((banner, index) => (
                    <div key={banner.id} className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <h4 className="font-bold text-slate-700">Banner #{index + 1}</h4>
                            <button onClick={() => handleRemoveBanner(banner.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg">
                                <Trash2 size={16} />
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">URL da Imagem ou Upload</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={banner.imageUrl} 
                                        onChange={e => handleUpdateBanner(banner.id, 'imageUrl', e.target.value)}
                                        className="flex-1 p-3 bg-white border border-slate-200 rounded-xl outline-none text-sm"
                                        placeholder="https://..."
                                    />
                                    <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl flex items-center justify-center transition-colors border border-slate-200">
                                        {uploadingId === banner.id ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            className="hidden" 
                                            onChange={(e) => handleFileUpload(banner.id, e)}
                                            disabled={uploadingId === banner.id}
                                        />
                                    </label>
                                </div>
                                {banner.imageUrl && (
                                    <div className="mt-2 w-full h-32 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                                        <img src={banner.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Texto Central (Opcional)</label>
                                <input 
                                    type="text" 
                                    value={banner.text || ''} 
                                    onChange={e => handleUpdateBanner(banner.id, 'text', e.target.value)}
                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none text-sm"
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-200">
                            <div className="flex items-center gap-2 mb-4">
                                <input 
                                    type="checkbox" 
                                    id={`show-btn-${banner.id}`}
                                    checked={banner.button?.show || false} 
                                    onChange={e => handleUpdateBanner(banner.id, 'button.show', e.target.checked)}
                                    className="w-4 h-4"
                                />
                                <label htmlFor={`show-btn-${banner.id}`} className="text-sm font-bold text-slate-700">Adicionar Botão de Ação</label>
                            </div>
                            
                            {banner.button?.show && (
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Texto do Botão</label>
                                        <input 
                                            type="text" 
                                            value={banner.button?.text} 
                                            onChange={e => handleUpdateBanner(banner.id, 'button.text', e.target.value)}
                                            className="w-full p-2 bg-white border border-slate-200 rounded-xl outline-none text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Link do Botão</label>
                                        <input 
                                            type="text" 
                                            value={banner.button?.link} 
                                            onChange={e => handleUpdateBanner(banner.id, 'button.link', e.target.value)}
                                            className="w-full p-2 bg-white border border-slate-200 rounded-xl outline-none text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cor do Botão (HEX)</label>
                                        <input 
                                            type="text" 
                                            value={banner.button?.color} 
                                            onChange={e => handleUpdateBanner(banner.id, 'button.color', e.target.value)}
                                            className="w-full p-2 bg-white border border-slate-200 rounded-xl outline-none text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tamanho</label>
                                        <select 
                                            value={banner.button?.size} 
                                            onChange={e => handleUpdateBanner(banner.id, 'button.size', e.target.value)}
                                            className="w-full p-2 bg-white border border-slate-200 rounded-xl outline-none text-sm"
                                        >
                                            <option value="sm">Pequeno</option>
                                            <option value="md">Médio</option>
                                            <option value="lg">Grande</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                
                <button 
                    onClick={handleAddBanner}
                    className="w-full py-4 border-2 border-dashed border-slate-300 text-slate-500 font-bold rounded-2xl hover:bg-slate-50 hover:text-blue-600 transition-all flex items-center justify-center gap-2"
                >
                    <Plus /> Adicionar Novo Banner
                </button>
                </div>
            </div>
        </div>
    );
};
