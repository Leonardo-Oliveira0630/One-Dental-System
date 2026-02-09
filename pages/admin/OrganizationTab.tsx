
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Save, Image as ImageIcon, UploadCloud, Loader2, Building2, Trash2 } from 'lucide-react';

export const OrganizationTab = () => {
  const { currentOrg, updateOrganization, uploadFile } = useApp();
  const [name, setName] = useState(currentOrg?.name || '');
  const [logoPreview, setLogoPreview] = useState(currentOrg?.logoUrl || '');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
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
        logoUrl: finalLogoUrl
      });
      alert("Marca atualizada com sucesso!");
    } catch (err) {
      alert("Erro ao salvar marca.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl animate-in slide-in-from-left-4">
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
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">Este nome aparecerá para seus clientes na Loja Virtual e em todos os documentos impressos.</p>
          </div>

          <div className="space-y-4">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Logomarca Personalizada</label>
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
              <div className="relative group shrink-0">
                <div className="w-32 h-32 md:w-40 md:h-40 bg-slate-100 rounded-3xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden transition-all group-hover:border-blue-400 group-hover:bg-blue-50 shadow-inner">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                  ) : (
                    <div className="flex flex-col items-center text-slate-300">
                        <ImageIcon size={40} />
                        <span className="text-[10px] font-bold mt-2">Sem Logo</span>
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleLogoSelect}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white pointer-events-none">
                    <UploadCloud size={24} />
                    <span className="text-[10px] font-bold">Alterar</span>
                  </div>
                </div>
                {logoPreview && (
                  <button 
                    type="button" 
                    onClick={() => { setLogoPreview(''); setLogoFile(null); }}
                    className="absolute -top-2 -right-2 p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 shadow-md border border-red-200 z-20"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              
              <div className="flex-1 space-y-3 w-full">
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                  <h4 className="text-xs font-bold text-blue-800 mb-2">Destaque sua Marca:</h4>
                  <ul className="text-[11px] text-blue-700 space-y-1.5 font-medium">
                    <li className="flex items-start gap-2">•<span>Aparece no topo do sistema para seus técnicos.</span></li>
                    <li className="flex items-start gap-2">•<span>Personaliza o catálogo visto pelos dentistas.</span></li>
                    <li className="flex items-start gap-2">•<span>Incluída automaticamente em todas as etiquetas.</span></li>
                  </ul>
                </div>
                <p className="text-[9px] text-slate-400 italic text-center md:text-left">Use preferencialmente arquivos PNG com fundo transparente.</p>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100">
            <button 
              type="submit" 
              disabled={isSaving}
              className="w-full md:w-auto md:px-10 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-70"
            >
              {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
              SALVAR CONFIGURAÇÕES
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
