import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Plus, Trash2, Box, Palette, X, Cpu, Key, HelpCircle, CheckCircle2, Loader2, Search } from 'lucide-react';
import { getContrastColor } from '../../services/mockData';
import { ActivationService, getNfcUidFormats } from '../../services/nfcServices';

export const BoxColorsTab = () => {
  const { boxColors, addBoxColor, deleteBoxColor, currentUser, currentOrg, nfcBoxes } = useApp();
  
  // Tab control: 'COLORS' (default) or 'NFC_KITS'
  const [activeTab, setActiveTab] = useState<'COLORS' | 'NFC_KITS'>('COLORS');

  // Colors Tab State
  const [name, setName] = useState('');
  const [hex, setHex] = useState('#3b82f6');
  const [isAddingColor, setIsAddingColor] = useState(false);

  // NFC Tab State
  const [kitCode, setKitCode] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [activationMessage, setActivationMessage] = useState<{ text: string; type: 'success' | 'error' | null }>({ text: '', type: null });
  const [nfcBoxSearch, setNfcBoxSearch] = useState('');
  const [selectedKitFilter, setSelectedKitFilter] = useState<string>('ALL');

  // Handle color submission
  const handleColorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !hex) return;
    await addBoxColor({ name, hex });
    setName('');
    setHex('#3b82f6');
    setIsAddingColor(false);
  };

  // Handle Kit Activation
  const handleActivateKit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kitCode.trim()) return;

    const orgId = currentOrg?.id;
    if (!orgId) {
      setActivationMessage({ text: 'Organização não encontrada.', type: 'error' });
      return;
    }

    const userName = currentUser?.name || currentUser?.email || 'Operador';

    try {
      setIsActivating(true);
      setActivationMessage({ text: '', type: null });

      const orgName = currentOrg?.name || 'Laboratório';

      await ActivationService.activateKit(
        kitCode.trim().toUpperCase(),
        orgId,
        orgName,
        userName
      );

      setActivationMessage({ 
        text: `Kit ${kitCode.toUpperCase()} ativado com sucesso! Suas caixas estão prontas para uso.`, 
        type: 'success' 
      });
      setKitCode('');
    } catch (err: any) {
      console.error(err);
      setActivationMessage({ text: 'Falha na ativação: ' + err.message, type: 'error' });
    } finally {
      setIsActivating(false);
    }
  };

  // Filtered NFC boxes
  const filteredNfcBoxes = nfcBoxes.filter(box => {
    const query = nfcBoxSearch.trim().toLowerCase().replace(/[:\s-]/g, '');
    if (!query) return selectedKitFilter === 'ALL' || box.kitCodigo === selectedKitFilter;

    const formats = getNfcUidFormats(box.uid || '');
    const candidates = [
      box.numeroCaixa,
      box.uid,
      box.uidHex,
      box.uidDecimal,
      box.textoGravado,
      ...formats.allCandidates
    ].filter(Boolean).map(s => String(s).toLowerCase());

    const matchesSearch = candidates.some(c => c.includes(query));
    const matchesKit = selectedKitFilter === 'ALL' || box.kitCodigo === selectedKitFilter;
    return matchesSearch && matchesKit;
  });

  const activeKits = Array.from(new Set(nfcBoxes.map(b => b.kitCodigo).filter(Boolean))) as string[];

  return (
    <div className="space-y-6 animate-in slide-in-from-left-4" id="box-colors-tab-container">
      
      {/* Tab Selector */}
      <div className="flex border-b border-slate-200" id="box-tab-selector">
        <button
          id="tab-btn-colors"
          onClick={() => setActiveTab('COLORS')}
          className={`pb-3 px-4 font-black text-sm tracking-tight border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'COLORS' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Palette size={16} />
          Cores das Caixas
        </button>
        <button
          id="tab-btn-nfc"
          onClick={() => setActiveTab('NFC_KITS')}
          className={`pb-3 px-4 font-black text-sm tracking-tight border-b-2 transition-all flex items-center gap-2 relative ${
            activeTab === 'NFC_KITS' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Cpu size={16} />
          Kits e Caixas NFC
          {nfcBoxes.length > 0 && (
            <span className="ml-1.5 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
              {nfcBoxes.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'COLORS' ? (
        /* TAB 1: CUSTOM BOX COLORS */
        <div className="space-y-6" id="box-colors-view">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Cores Disponíveis</h3>
              <p className="text-xs text-slate-400 mt-0.5">Defina as cores utilizadas na identificação física de caixas organizadoras.</p>
            </div>
            {!isAddingColor && (
              <button 
                id="btn-new-color"
                onClick={() => setIsAddingColor(true)} 
                className="px-4 py-2.5 bg-indigo-600 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-sm hover:bg-indigo-700 transition-all active:scale-98"
              >
                <Plus size={18}/> Nova Cor
              </button>
            )}
          </div>

          {isAddingColor && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in zoom-in duration-200" id="add-color-form-panel">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-slate-700 uppercase text-xs tracking-widest">Configurar Nova Cor</h4>
                <button onClick={() => setIsAddingColor(false)} className="text-slate-400 hover:text-red-500"><X size={18}/></button>
              </div>
              <form onSubmit={handleColorSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-6">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Nome da Cor (Ex: Azul Turquesa)</label>
                  <input 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="Nome da cor" 
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 text-sm" 
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Seletor Hexadecimal</label>
                  <div className="flex gap-2">
                    <input 
                      type="color"
                      value={hex}
                      onChange={e => setHex(e.target.value)}
                      className="w-12 h-11 border-0 p-0 rounded-lg cursor-pointer overflow-hidden shadow-sm"
                    />
                    <input 
                      value={hex} 
                      onChange={e => setHex(e.target.value)} 
                      placeholder="#000000" 
                      required
                      className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500" 
                    />
                  </div>
                </div>
                <button type="submit" className="md:col-span-3 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 active:scale-98 transition-all">
                  <Plus size={18}/> ADICIONAR
                </button>
              </form>
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="colors-list">
            {boxColors.map(color => (
              <div key={color.id} className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm group">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-inner border border-black/10"
                    style={{ backgroundColor: color.hex, color: getContrastColor(color.hex) }}
                  >
                    <Box size={20}/>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{color.name}</p>
                    <p className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">{color.hex}</p>
                  </div>
                </div>
                <button 
                  onClick={() => deleteBoxColor(color.id)}
                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={18}/>
                </button>
              </div>
            ))}
            {boxColors.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 italic text-sm">
                Nenhuma cor personalizada cadastrada.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* TAB 2: NFC KITS AND ACTIVATION */
        <div className="space-y-6 animate-in fade-in" id="nfc-kits-view">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Activation form */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4" id="activation-card">
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Ativar Lote de Caixas NFC</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Digite o código único do kit NFC impresso no encarte para ativar suas caixas neste laboratório.
                  </p>
                </div>

                <form onSubmit={handleActivateKit} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Código do Kit NFC</label>
                    <div className="relative">
                      <Key className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
                      <input
                        id="input-activation-code"
                        required
                        type="text"
                        value={kitCode}
                        onChange={e => setKitCode(e.target.value)}
                        placeholder="Ex: KIT-2026-000001"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 uppercase font-mono font-bold"
                      />
                    </div>
                  </div>

                  <button
                    id="btn-submit-activation"
                    type="submit"
                    disabled={isActivating}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isActivating ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Validando Kit...
                      </>
                    ) : (
                      'Ativar Kit NFC'
                    )}
                  </button>
                </form>

                {activationMessage.text && (
                  <div className={`p-4 rounded-xl flex items-start gap-2.5 text-xs ${
                    activationMessage.type === 'success' 
                      ? 'bg-emerald-50 border border-emerald-100 text-emerald-800' 
                      : 'bg-rose-50 border border-rose-100 text-rose-800'
                  }`}>
                    {activationMessage.type === 'success' ? (
                      <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                    ) : (
                      <X size={16} className="text-rose-600 mt-0.5 shrink-0" />
                    )}
                    <span className="font-medium">{activationMessage.text}</span>
                  </div>
                )}
              </div>

              {/* Informative tutorial */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3" id="activation-info-box">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <HelpCircle size={14} className="text-indigo-500" />
                  Como funciona?
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  A ativação do kit copia o mapeamento de UIDs físicos das caixas diretamente para o banco de dados do seu laboratório.
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Depois de ativado, basta aproximar qualquer uma das caixas do leitor durante o fluxo de entrada/saída de setores ou na busca de casos no painel de controle. O sistema identificará automaticamente o trabalho ativo!
                </p>
              </div>

              {/* Active Kits (Multiple kit support) */}
              {activeKits.length > 0 && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3" id="active-kits-summary-card">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Cpu size={14} className="text-indigo-500" />
                      Kits Vinculados ({activeKits.length})
                    </h4>
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[9px] font-bold uppercase tracking-tight">
                      Multi-Kit
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Você pode adquirir e ativar múltiplos lotes de caixas NFC no seu laboratório. Elas funcionam de forma cumulativa e simultânea!
                  </p>
                  <div className="space-y-2">
                    {activeKits.map(code => {
                      const count = nfcBoxes.filter(b => b.kitCodigo === code).length;
                      return (
                        <div key={code} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 font-mono text-xs">
                          <span className="font-bold text-slate-700">{code}</span>
                          <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">
                            {count} {count === 1 ? 'caixa' : 'caixas'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* List of active mapped boxes */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4" id="active-boxes-list-card">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">Caixas Ativas</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Relação de caixas físicas e UIDs reconhecidos por este laboratório.</p>
                  </div>
                  {nfcBoxes.length > 0 && (
                    <span className="self-start sm:self-center px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full font-bold text-[10px] uppercase">
                      {nfcBoxes.length} Caixas
                    </span>
                  )}
                </div>

                {nfcBoxes.length > 0 && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        id="input-search-nfc-boxes"
                        type="text"
                        value={nfcBoxSearch}
                        onChange={e => setNfcBoxSearch(e.target.value)}
                        placeholder="Pesquisar por Caixa, UID..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white"
                      />
                    </div>
                    {activeKits.length > 1 && (
                      <select
                        id="select-kit-filter"
                        value={selectedKitFilter}
                        onChange={e => setSelectedKitFilter(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white font-mono font-bold text-slate-700"
                      >
                        <option value="ALL">Todos os Kits</option>
                        {activeKits.map(code => (
                          <option key={code} value={code}>{code}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {nfcBoxes.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl">
                    <Cpu size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-bold text-slate-600">Nenhum Kit NFC Ativo</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                      Digite o código de ativação do kit enviado pelo suporte do LabProx para habilitar o rastreamento automatizado.
                    </p>
                  </div>
                ) : filteredNfcBoxes.length === 0 ? (
                  <p className="text-center py-8 text-slate-400 text-xs font-mono">Nenhuma caixa corresponde aos filtros.</p>
                ) : (
                  <div className="max-h-[350px] overflow-y-auto space-y-2 pr-1 font-mono text-xs">
                    {filteredNfcBoxes.map((box) => (
                      <div key={box.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-700">BOX-{box.numeroCaixa}</span>
                          <span className="text-[10px] text-slate-400">({box.textoGravado || 'Informativo'})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {box.kitCodigo}
                          </span>
                          {(() => {
                            const formats = getNfcUidFormats(box.uid || '');
                            const hexVal = box.uidHex || formats.uidHex;
                            const decVal = box.uidDecimal || formats.uidDecimal;
                            const hasBoth = hexVal && decVal && hexVal !== decVal;

                            if (hasBoth) {
                              return (
                                <div className="flex items-center gap-1">
                                  <span className="font-bold text-indigo-600 text-[10px] bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100/50">
                                    HEX: {hexVal}
                                  </span>
                                  <span className="font-bold text-emerald-600 text-[10px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100/50">
                                    DEC: {decVal}
                                  </span>
                                </div>
                              );
                            }

                            return (
                              <span className="font-bold text-indigo-600 text-[10px] bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100/50">
                                {box.uid}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
