import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Plus, Trash2, Save, Loader2, Image as ImageIcon } from 'lucide-react';
import { MarketplaceBannerConfig } from '../../types';

export const MarketplaceBannersAdmin = () => {
    const { globalSettings, updateGlobalSettings } = useApp();
    const [banners, setBanners] = useState<MarketplaceBannerConfig[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (globalSettings?.marketplaceBanners) {
            setBanners(globalSettings.marketplaceBanners);
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

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateGlobalSettings({ marketplaceBanners: banners });
            alert("Banners do marketplace atualizados com sucesso!");
        } catch (err) {
            alert("Erro ao salvar.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mb-8">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <ImageIcon className="text-slate-600" />
                    <h2 className="font-black text-slate-800 text-lg uppercase tracking-tight">Banners do Marketplace (Fornecedores)</h2>
                </div>
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2"
                >
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Salvar Banners
                </button>
            </div>
            
            <div className="p-6 space-y-6">
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
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">URL da Imagem</label>
                                <input 
                                    type="text" 
                                    value={banner.imageUrl} 
                                    onChange={e => handleUpdateBanner(banner.id, 'imageUrl', e.target.value)}
                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none text-sm"
                                    placeholder="https://..."
                                />
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
    );
};
