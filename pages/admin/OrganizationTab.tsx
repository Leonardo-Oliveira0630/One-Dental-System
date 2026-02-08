
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Save, Image as ImageIcon, UploadCloud, Loader2, Building2, Trash2, FileText } from 'lucide-react';

export const OrganizationTab = () => {
  const { currentOrg, updateOrganization, uploadFile } = useApp();
  const [name, setName] = useState(currentOrg?.name || '');
  const [description, setDescription] = useState(currentOrg?.description || '');
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
        finalLogoUrl = ""; 
      }

      await updateOrganization(currentOrg.id, {
        name: name.trim(),
        description: description.trim(),
        logoUrl: finalLogoUrl
      });
      alert("Configurações atualizadas!");
    } catch (err) {
      alert("Erro ao salvar.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl animate-in slide-in-from-left-4 pb-20">
      <div className="bg-white p-5 md:p-8 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="text-lg md:text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
          <Building2 className="text-blue-600" size={24} /> Identidade do Laboratório
        </h3>
        
        <form onSubmit={handleSave} className="space-y-6 md:space-y-8">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Nome de Exibição (Público)</label>
            <input 
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 md:px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-base md:text-lg"
              placeholder="Ex: Laboratório Digital Smile"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Sobre o Laboratório (Marketplace)</label>
            <textarea 
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 md:px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium resize-none"
              placeholder="Descreva suas especialidades, prazos médios e diferenciais..."
            />
            <p className="text-[9px] text-slate-400 mt-2">Este texto aparecerá na aba 'Sobre' da sua vitrine para novos dentistas.</p>
          </div>

          <div className="space-y-4">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Logomarca</label>
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
              <div className="relative group shrink-0">
                <div className="w-32 h-32 md:w-40 md:h-40 bg-slate-100 rounded-3xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden transition-all group-hover:border-blue-400 group-hover:bg-blue-50 shadow-inner">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-2" />
                  ) : (
                    <div className="flex flex-col items-center text-slate-300">
                        <ImageIcon size={40} />
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleLogoSelect} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                </div>
                {logoPreview && (
                  <button type="button" onClick={() => { setLogoPreview(''); setLogoFile(null); }} className="absolute -top-2 -right-2 p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 shadow-md border border-red-200 z-20"><Trash2 size={14} /></button>
                )}
              </div>
              
              <div className="flex-1 bg-blue-50 p-4 rounded-2xl border border-blue-100">
                  <h4 className="text-xs font-bold text-blue-800 mb-2">Visibilidade:</h4>
                  <ul className="text-[11px] text-blue-700 space-y-1.5 font-medium">
                    <li>• Sua logo atrai novos clientes no marketplace.</li>
                    <li>• Aparece nas ordens de serviço impressas.</li>
                  </ul>
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
              SALVAR VITRINE
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
