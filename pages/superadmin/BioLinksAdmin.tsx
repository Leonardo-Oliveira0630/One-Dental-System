import React, { useState, useEffect } from 'react';
import { BioSettings, BioLink } from '../../types';
import { getBioSettings, updateBioSettings } from '../../services/bioSettings';
import { Layout } from '../../components/Layout';
import { Shield, Plus, Save, Trash2, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react';


export const BioLinksAdmin = () => {
  const [settings, setSettings] = useState<BioSettings>({ links: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await getBioSettings();
      // Ensure links are sorted by order
      data.links.sort((a, b) => a.order - b.order);
      setSettings(data);
    } catch (error) {
      alert('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateBioSettings(settings);
      alert('Configurações salvas com sucesso!');
    } catch (error) {
      alert('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const addLink = () => {
    const newLink: BioLink = {
      id: Math.random().toString(36).substr(2, 9),
      label: 'Novo Link',
      url: '',
      type: 'custom',
      isActive: true,
      order: settings.links.length > 0 ? Math.max(...settings.links.map(l => l.order)) + 1 : 1
    };
    setSettings({ ...settings, links: [...settings.links, newLink] });
  };

  const updateLink = (id: string, field: keyof BioLink, value: any) => {
    const updatedLinks = settings.links.map(link => 
      link.id === id ? { ...link, [field]: value } : link
    );
    setSettings({ ...settings, links: updatedLinks });
  };

  const removeLink = (id: string) => {
    const updatedLinks = settings.links.filter(link => link.id !== id);
    setSettings({ ...settings, links: updatedLinks });
  };

  const moveLink = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === settings.links.length - 1)) {
      return;
    }

    const newLinks = [...settings.links];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap the elements
    const temp = newLinks[index];
    newLinks[index] = newLinks[targetIndex];
    newLinks[targetIndex] = temp;

    // Update orders to reflect new index
    newLinks.forEach((link, i) => {
      link.order = i + 1;
    });

    setSettings({ ...settings, links: newLinks });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
              <Shield size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Página da Bio (Links)</h1>
              <p className="text-slate-500">Gerencie os links que aparecem em labprox.com.br/bio</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a 
              href="/bio" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <ExternalLink size={18} />
              <span className="hidden sm:inline">Visualizar</span>
            </a>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save size={18} />
              <span className="hidden sm:inline">{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-800">Links Configurados</h2>
            <button
              onClick={addLink}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors"
            >
              <Plus size={18} />
              <span>Adicionar Link</span>
            </button>
          </div>

          <div className="space-y-4">
            {settings.links.map((link, index) => (
              <div key={link.id} className="flex flex-col sm:flex-row gap-4 p-4 border border-slate-200 rounded-xl bg-slate-50 items-start sm:items-center">
                
                <div className="flex flex-col gap-1">
                  <button 
                    onClick={() => moveLink(index, 'up')}
                    disabled={index === 0}
                    className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-30"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button 
                    onClick={() => moveLink(index, 'down')}
                    disabled={index === settings.links.length - 1}
                    className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-30"
                  >
                    <ArrowDown size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 flex-1 w-full">
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Tipo de Ícone/Ação</label>
                    <select
                      value={link.type}
                      onChange={(e) => updateLink(link.id, 'type', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                    >
                      <option value="web">Web App</option>
                      <option value="playstore">Play Store</option>
                      <option value="appstore">App Store</option>
                      <option value="youtube">YouTube</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="instagram">Instagram</option>
                      <option value="custom">Personalizado</option>
                    </select>
                  </div>
                  
                  <div className="sm:col-span-4">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Título do Botão</label>
                    <input
                      type="text"
                      value={link.label}
                      onChange={(e) => updateLink(link.id, 'label', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                      placeholder="Ex: Acessar Web App"
                    />
                  </div>
                  
                  <div className="sm:col-span-5">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">URL (Link de destino)</label>
                    <input
                      type="text"
                      value={link.url}
                      onChange={(e) => updateLink(link.id, 'url', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-2 sm:mt-0 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={link.isActive}
                      onChange={(e) => updateLink(link.id, 'isActive', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-600">Ativo</span>
                  </label>

                  <button
                    onClick={() => removeLink(link.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remover Link"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

              </div>
            ))}

            {settings.links.length === 0 && (
              <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">
                Nenhum link configurado ainda.
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};
