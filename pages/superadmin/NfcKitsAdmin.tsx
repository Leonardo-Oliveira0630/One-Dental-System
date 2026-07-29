import React, { useState, useEffect, useRef } from 'react';
import { 
  Cpu, Plus, Search, RotateCcw, Copy, Trash2, ArrowRight, Play, Eye, X, CheckCircle, 
  AlertTriangle, ArrowLeft, Loader2, RefreshCw, Layers, Shield, Check, HelpCircle
} from 'lucide-react';
import { KitService, NfcReaderService, UidMappingService, getNfcUidFormats } from '../../services/nfcServices';
import { NfcKit, NfcBox } from '../../types';
import { useApp } from '../../context/AppContext';

export const NfcKitsAdmin: React.FC = () => {
  const { currentUser } = useApp();
  const [kits, setKits] = useState<NfcKit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedKit, setSelectedKit] = useState<NfcKit | null>(null);
  const [selectedKitBoxes, setSelectedKitBoxes] = useState<NfcBox[]>([]);
  const [loadingBoxes, setLoadingBoxes] = useState<boolean>(false);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // New Kit Form state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [kitForm, setKitForm] = useState({
    nome: '',
    descricao: '',
    caixaInicial: 1,
    caixaFinal: 50
  });
  const [isSubmittingKit, setIsSubmittingKit] = useState<boolean>(false);

  // Scan Mode state
  const [scanModeActive, setScanModeActive] = useState<boolean>(false);
  const [activeScanKit, setActiveScanKit] = useState<NfcKit | null>(null);
  const [scanMethod, setScanMethod] = useState<'SEQUENTIAL' | 'MANUAL'>('SEQUENTIAL');
  const [currentScanBox, setCurrentScanBox] = useState<number>(1);
  const [manualBoxInput, setManualBoxInput] = useState<string>('');
  const [webNfcActive, setWebNfcActive] = useState<boolean>(false);
  const [webNfcSupported, setWebNfcSupported] = useState<boolean>('NDEFReader' in window);
  
  // Status message in scanning screen
  const [scanMessage, setScanMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' | null }>({ text: '', type: null });

  // Box search filter in kit details view
  const [boxSearchQuery, setBoxSearchQuery] = useState<string>('');

  // Setup refs to read live state inside continuous listener callbacks
  const scanMethodRef = useRef(scanMethod);
  const currentScanBoxRef = useRef(currentScanBox);
  const manualBoxInputRef = useRef(manualBoxInput);
  const activeScanKitRef = useRef(activeScanKit);
  const selectedKitBoxesRef = useRef(selectedKitBoxes);

  useEffect(() => {
    scanMethodRef.current = scanMethod;
    currentScanBoxRef.current = currentScanBox;
    manualBoxInputRef.current = manualBoxInput;
    activeScanKitRef.current = activeScanKit;
    selectedKitBoxesRef.current = selectedKitBoxes;
  }, [scanMethod, currentScanBox, manualBoxInput, activeScanKit, selectedKitBoxes]);

  // Load all kits
  const loadKits = async () => {
    try {
      setLoading(true);
      const data = await KitService.getKits();
      setKits(data);
    } catch (err) {
      console.error("Erro ao carregar kits:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKits();
  }, []);

  // Handle Kit View Selection
  const handleSelectKit = async (kit: NfcKit) => {
    setSelectedKit(kit);
    setLoadingBoxes(true);
    try {
      const boxes = await KitService.getKitBoxes(kit.id);
      setSelectedKitBoxes(boxes);
    } catch (err) {
      console.error("Erro ao obter caixas do kit:", err);
    } finally {
      setLoadingBoxes(false);
    }
  };

  // Create Kit
  const handleCreateKit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (kitForm.caixaFinal < kitForm.caixaInicial) {
      alert("A caixa final não pode ser menor que a inicial.");
      return;
    }
    try {
      setIsSubmittingKit(true);
      const newKit = await KitService.createKit({
        nome: kitForm.nome,
        descricao: kitForm.descricao,
        caixaInicial: Number(kitForm.caixaInicial),
        caixaFinal: Number(kitForm.caixaFinal)
      });
      await loadKits();
      setShowCreateModal(false);
      setKitForm({ nome: '', descricao: '', caixaInicial: 1, caixaFinal: 50 });
      handleSelectKit(newKit);
    } catch (err: any) {
      alert("Erro ao criar kit: " + err.message);
    } finally {
      setIsSubmittingKit(false);
    }
  };

  // Duplicate Kit
  const handleDuplicateKit = async (kitId: string) => {
    if (!window.confirm("Deseja realmente duplicar este modelo de kit? Um novo kit será gerado com o status Disponível.")) return;
    try {
      setLoading(true);
      const duplicated = await KitService.duplicateKit(kitId);
      await loadKits();
      handleSelectKit(duplicated);
      alert("Kit duplicado com sucesso! Carregando novo kit.");
    } catch (err: any) {
      alert("Erro ao duplicar kit: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete Kit
  const handleDeleteKit = async (kitId: string) => {
    if (!window.confirm("Deseja realmente excluir este kit? Esta ação é irreversível.")) return;
    try {
      setLoading(true);
      await KitService.deleteKit(kitId);
      setSelectedKit(null);
      setSelectedKitBoxes([]);
      await loadKits();
      alert("Kit excluído com sucesso.");
    } catch (err: any) {
      alert("Erro ao excluir kit: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Core Processing of Tag Scanned (for both Web NFC and Keyboard USB HID reader)
  const processTagScanned = async (uid: string, nfcText?: string) => {
    // No celular, se o hardware UID vier bloqueado/vazio pelo browser, utiliza o texto NDEF gravado na memória
    const rawUid = uid || nfcText || '';
    const cleanUid = rawUid.trim().toUpperCase().replace(/[:\s-]/g, '');
    if (!cleanUid) {
      setScanMessage({ text: 'Nenhum UID ou texto NDEF detectado na leitura da tag.', type: 'error' });
      playBeep(false);
      return;
    }

    const kit = activeScanKitRef.current;
    if (!kit) return;

    setScanMessage({ text: 'Processando tag...', type: 'info' });

    try {
      // 1. Validar se o UID já está cadastrado em outro kit/lab
      const validation = await UidMappingService.checkUidDuplicate(cleanUid, kit.id);
      if (validation.duplicated) {
        setScanMessage({ text: validation.message || 'UID duplicado detectado.', type: 'error' });
        // Som sonoro de erro
        playBeep(false);
        return;
      }

      // 2. Determinar o número da caixa que estamos gravando
      let targetBoxNumber = '';
      if (scanMethodRef.current === 'SEQUENTIAL') {
        targetBoxNumber = String(currentScanBoxRef.current).padStart(3, '0');
      } else {
        const manualNum = Number(manualBoxInputRef.current);
        if (isNaN(manualNum) || manualNum < kit.caixaInicial || manualNum > kit.caixaFinal) {
          setScanMessage({ text: `Número de caixa inválido. Deve estar entre ${kit.caixaInicial} e ${kit.caixaFinal}.`, type: 'error' });
          playBeep(false);
          return;
        }
        targetBoxNumber = String(manualNum).padStart(3, '0');
      }

      // 3. Verificar se o mesmo número de caixa já existe com outro UID nesse kit
      const existingBox = selectedKitBoxesRef.current.find(b => b.numeroCaixa === targetBoxNumber);
      if (existingBox && existingBox.uid && existingBox.uid !== cleanUid) {
        if (!window.confirm(`A caixa ${targetBoxNumber} já possui o UID ${existingBox.uid}. Deseja substituí-lo?`)) {
          setScanMessage({ text: 'Operação cancelada pelo operador.', type: 'info' });
          return;
        }
      }

      // 4. Salvar na Firestore
      const formats = getNfcUidFormats(cleanUid);
      const updatedBox: NfcBox = {
        id: targetBoxNumber,
        numeroCaixa: targetBoxNumber,
        uid: cleanUid,
        uidHex: formats.uidHex,
        uidDecimal: formats.uidDecimal,
        textoGravado: nfcText || `BOX-${targetBoxNumber}`,
        status: 'Associada'
      };

      await KitService.saveKitBox(kit.id, updatedBox);

      // 5. Atualizar estado local de boxes do kit selecionado
      const newBoxesList = selectedKitBoxesRef.current.map(b => 
        b.numeroCaixa === targetBoxNumber ? updatedBox : b
      );
      setSelectedKitBoxes(newBoxesList);

      const msgText = (formats.uidHex && formats.uidDecimal && formats.uidHex !== formats.uidDecimal)
        ? `Caixa ${targetBoxNumber} associada com sucesso! (HEX: ${formats.uidHex} | DEC: ${formats.uidDecimal})`
        : `Caixa ${targetBoxNumber} associada com sucesso ao UID ${cleanUid}!`;

      setScanMessage({ 
        text: msgText, 
        type: 'success' 
      });
      playBeep(true);

      // 6. Avançar automaticamente se for Leitura Sequencial
      if (scanMethodRef.current === 'SEQUENTIAL') {
        const nextBox = currentScanBoxRef.current + 1;
        if (nextBox <= kit.caixaFinal) {
          setCurrentScanBox(nextBox);
        } else {
          setScanMessage({ text: 'Parabéns! Todas as caixas deste kit foram associadas com sucesso!', type: 'success' });
        }
      } else {
        // Se for leitura manual, limpa o campo
        setManualBoxInput('');
      }

    } catch (err: any) {
      console.error(err);
      setScanMessage({ text: 'Erro ao associar tag: ' + err.message, type: 'error' });
      playBeep(false);
    }
  };

  // Play audio feedbacks (beep success or error)
  const playBeep = (success: boolean) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(success ? 880 : 330, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + (success ? 0.15 : 0.4));
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + (success ? 0.15 : 0.4));
    } catch (e) {}
  };

  // Keyboard USB HID Listener hook
  useEffect(() => {
    if (!scanModeActive || !activeScanKit) return;

    const cleanup = NfcReaderService.setupKeyboardScanner((code) => {
      console.log("[NFC Kits Admin] USB HID Leitor detectou código:", code);
      processTagScanned(code);
    });

    return () => {
      cleanup();
    };
  }, [scanModeActive, activeScanKit]);

  // Web NFC Trigger setup
  const startWebNfc = async () => {
    if (!('NDEFReader' in window)) return;
    try {
      setWebNfcActive(true);
      await NfcReaderService.startWebNfcScan(
        (uid, text) => {
          console.log("[NFC Kits Admin] Web NFC detectou:", uid, text);
          processTagScanned(uid, text);
        },
        (err) => {
          console.error("[Web NFC Error]", err);
          setWebNfcActive(false);
          setScanMessage({ text: 'Falha no Web NFC: ' + err.message, type: 'error' });
        }
      );
    } catch (err: any) {
      setWebNfcActive(false);
      console.warn("NFC não iniciado:", err.message);
    }
  };

  const stopWebNfc = () => {
    setWebNfcActive(false);
  };

  // Navigation handlers inside Sequencial screen
  const handleSkipBox = () => {
    if (!activeScanKit) return;
    const nextBox = currentScanBox + 1;
    if (nextBox <= activeScanKit.caixaFinal) {
      setCurrentScanBox(nextBox);
      setScanMessage({ text: `Caixa ${String(currentScanBox).padStart(3, '0')} pulada.`, type: 'info' });
    } else {
      setScanMessage({ text: 'Você chegou ao final do limite de caixas deste kit.', type: 'info' });
    }
  };

  const handleBackBox = () => {
    if (!activeScanKit) return;
    const prevBox = currentScanBox - 1;
    if (prevBox >= activeScanKit.caixaInicial) {
      setCurrentScanBox(prevBox);
      setScanMessage({ text: `Voltando para Caixa ${String(prevBox).padStart(3, '0')}.`, type: 'info' });
    } else {
      setScanMessage({ text: 'Esta já é a primeira caixa do kit.', type: 'info' });
    }
  };

  const handleRegraveBox = () => {
    setScanMessage({ text: 'Aproxime a nova tag NFC para re-gravar a caixa atual.', type: 'info' });
  };

  // Launch Scanning Dashboard
  const handleOpenScanDashboard = (kit: NfcKit) => {
    setActiveScanKit(kit);
    setCurrentScanBox(kit.caixaInicial);
    setScanModeActive(true);
    setScanMessage({ text: 'Sistema pronto para leitura contínua de tags.', type: 'info' });
    if (webNfcSupported) {
      startWebNfc();
    }
  };

  // Close Scanning Dashboard
  const handleCloseScanDashboard = () => {
    setScanModeActive(false);
    setActiveScanKit(null);
    stopWebNfc();
    loadKits();
  };

  // Computations
  const getRegisteredBoxesCount = (boxes: NfcBox[]) => boxes.filter(b => b.uid).length;

  // Filtered kits list
  const filteredKits = kits.filter(k => {
    const queryMatch = k.codigoKit.toLowerCase().includes(searchQuery.toLowerCase()) || 
                       k.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       (k.empresaDestino && k.empresaDestino.toLowerCase().includes(searchQuery.toLowerCase()));
    const statusMatch = statusFilter === 'ALL' || k.status === statusFilter;
    return queryMatch && statusMatch;
  });

  // Filtered boxes inside Details view
  const filteredBoxes = selectedKitBoxes.filter(b => {
    const query = boxSearchQuery.trim().toLowerCase().replace(/[:\s-]/g, '');
    if (!query) return true;
    const formats = getNfcUidFormats(b.uid || '');
    const candidates = [
      b.numeroCaixa,
      b.uid,
      b.uidHex,
      b.uidDecimal,
      b.textoGravado,
      ...formats.allCandidates
    ].filter(Boolean).map(s => String(s).toLowerCase());

    return candidates.some(c => c.includes(query));
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24" id="nfc-kits-admin-page">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200" id="nfc-header-panel">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Cpu size={24} />
            </span>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Kits NFC</h1>
          </div>
          <p className="text-sm text-slate-500">
            Fabricação, associação de UIDs e distribuição comercial de kits de caixas organizadoras para o LabProx.
          </p>
        </div>
        <button
          id="btn-create-kit-modal"
          onClick={() => setShowCreateModal(true)}
          className="w-full md:w-auto px-5 py-3 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 active:scale-98 transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Criar Novo Kit
        </button>
      </div>

      {scanModeActive && activeScanKit ? (
        /* SCREEN 2: SCANNING / READING MODE SCREEN (CONTINUOUS FABRICATION) */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="scanning-dashboard">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                <div>
                  <span className="text-[10px] bg-indigo-500/30 text-indigo-300 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Modo Fabricação Ativo
                  </span>
                  <h2 className="text-lg font-black mt-1">
                    {activeScanKit.nome} ({activeScanKit.codigoKit})
                  </h2>
                </div>
                <button 
                  id="btn-close-scan"
                  onClick={handleCloseScanDashboard}
                  className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Mode Selectors */}
              <div className="flex border-b border-slate-200 bg-slate-50 p-2 gap-2">
                <button
                  id="btn-mode-seq"
                  onClick={() => setScanMethod('SEQUENTIAL')}
                  className={`flex-1 py-3 px-4 font-bold text-xs uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${
                    scanMethod === 'SEQUENTIAL' 
                      ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' 
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <Layers size={14} />
                  Leitura Sequencial
                </button>
                <button
                  id="btn-mode-manual"
                  onClick={() => setScanMethod('MANUAL')}
                  className={`flex-1 py-3 px-4 font-bold text-xs uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${
                    scanMethod === 'MANUAL' 
                      ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' 
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <Cpu size={14} />
                  Leitura Manual
                </button>
              </div>

              {/* Central Dynamic Screen */}
              <div className="p-8 flex flex-col items-center justify-center min-h-[350px] text-center border-b border-slate-100">
                {scanMethod === 'SEQUENTIAL' ? (
                  <div className="space-y-6 w-full max-w-md">
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Próxima Caixa</p>
                      <h3 className="text-7xl font-black text-slate-800 mt-2 font-mono">
                        {String(currentScanBox).padStart(3, '0')}
                      </h3>
                    </div>

                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 relative overflow-hidden flex flex-col items-center justify-center animate-pulse">
                      <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3">
                        <Cpu size={24} className="animate-spin" />
                      </div>
                      <h4 className="text-base font-bold text-indigo-900">Aproxime uma Tag NFC</h4>
                      <p className="text-xs text-indigo-600 mt-1 max-w-xs">
                        Ao aproximar, o UID será lido, associado automaticamente à caixa #{String(currentScanBox).padStart(3, '0')} e avançará para o próximo número.
                      </p>
                    </div>

                    {/* Sequential control buttons */}
                    <div className="flex flex-wrap gap-3 justify-center pt-2">
                      <button
                        id="btn-back-box"
                        onClick={handleBackBox}
                        disabled={currentScanBox <= activeScanKit.caixaInicial}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1.5"
                      >
                        <ArrowLeft size={14} /> Voltar
                      </button>
                      <button
                        id="btn-skip-box"
                        onClick={handleSkipBox}
                        disabled={currentScanBox >= activeScanKit.caixaFinal}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1.5"
                      >
                        Pular Caixa <ArrowRight size={14} />
                      </button>
                      <button
                        id="btn-regrave-box"
                        onClick={handleRegraveBox}
                        className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold rounded-xl active:scale-95 transition-all flex items-center gap-1.5"
                      >
                        <RotateCcw size={14} /> Regravar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 w-full max-w-md">
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Leitura Manual de Caixa</p>
                      <p className="text-xs text-slate-400 mb-4">Escolha a caixa e aproxime o leitor.</p>
                      <input 
                        id="input-manual-box"
                        type="number"
                        min={activeScanKit.caixaInicial}
                        max={activeScanKit.caixaFinal}
                        value={manualBoxInput}
                        onChange={(e) => setManualBoxInput(e.target.value)}
                        placeholder="Ex: 175"
                        className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-black text-2xl text-center outline-none"
                      />
                      <p className="text-[10px] text-slate-400 mt-2">
                        Faixa numérica do kit: {activeScanKit.caixaInicial} até {activeScanKit.caixaFinal}
                      </p>
                    </div>

                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 flex flex-col items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-2">
                        <Cpu size={20} />
                      </div>
                      <h4 className="text-sm font-bold text-indigo-900">NFC Ativo</h4>
                      <p className="text-[11px] text-indigo-600 mt-0.5">
                        Defina o número acima e posicione a tag para relacionar instantaneamente.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Messages Logger / Feedback */}
              {scanMessage.text && (
                <div className={`p-4 flex items-start gap-3 ${
                  scanMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800' :
                  scanMessage.type === 'error' ? 'bg-rose-50 text-rose-800' :
                  'bg-indigo-50 text-indigo-800'
                }`}>
                  <div className="mt-0.5 shrink-0">
                    {scanMessage.type === 'success' && <CheckCircle size={18} className="text-emerald-600" />}
                    {scanMessage.type === 'error' && <AlertTriangle size={18} className="text-rose-600" />}
                    {scanMessage.type === 'info' && <Layers size={18} className="text-indigo-600" />}
                  </div>
                  <div className="text-xs font-medium">{scanMessage.text}</div>
                </div>
              )}
            </div>

            {/* Hardware capabilities warning */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield size={14} className="text-slate-500" />
                  Método de Integração de Leitores
                </h4>
                <p className="text-xs text-slate-500 max-w-xl">
                  Compatível com celulares Android (NFC nativo), leitores USB HID do tipo teclado (basta aproximar, sem focar em nenhum campo), e leitores profissionais.
                </p>
              </div>
              <div className="shrink-0">
                {webNfcSupported ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black uppercase">
                    <Check size={12} /> Web NFC Ativo
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-[10px] font-black uppercase">
                    Leitor USB Ativo
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick List of Kit status on the right */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm" id="quick-view-boxes">
            <h3 className="font-black text-slate-800 text-base">Progresso das Caixas</h3>
            <p className="text-xs text-slate-500">Abaixo listamos a situação das caixas vinculadas neste kit.</p>
            
            <div className="grid grid-cols-2 gap-2 text-center bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div>
                <p className="text-lg font-mono font-black text-slate-700">
                  {getRegisteredBoxesCount(selectedKitBoxes)}
                </p>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Associadas</p>
              </div>
              <div>
                <p className="text-lg font-mono font-black text-slate-400">
                  {selectedKitBoxes.length - getRegisteredBoxesCount(selectedKitBoxes)}
                </p>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Pendentes</p>
              </div>
            </div>

            <div className="max-h-[380px] overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
              {selectedKitBoxes.map((box) => (
                <div key={box.id} className={`flex items-center justify-between p-2.5 rounded-lg border ${
                  box.uid 
                    ? 'bg-emerald-50/55 border-emerald-100 text-emerald-900' 
                    : 'bg-slate-50 border-slate-100 text-slate-400'
                }`}>
                  <span className="font-bold">BOX-{box.numeroCaixa}</span>
                  {box.uid ? (
                    <span className="text-[10px] font-medium bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded uppercase">
                      OK ({box.uid.substring(0, 6)}...)
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-400 italic">Pendente</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* SCREEN 1: KITS MAIN HUB & LISTING */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="kits-admin-main-hub">
          {/* Left panel: Kits list */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between mb-4">
                {/* Search Bar */}
                <div className="relative w-full">
                  <Search size={18} className="absolute left-4 top-3.5 text-slate-400" />
                  <input
                    id="input-search-kit"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pesquisar por código, nome ou laboratório..."
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* Filter Selector */}
                <select
                  id="select-status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full sm:w-auto p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="ALL">Todos os status</option>
                  <option value="Disponível">Disponível</option>
                  <option value="Vendido">Vendido</option>
                  <option value="Ativado">Ativado</option>
                </select>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <Loader2 size={36} className="animate-spin mb-2 text-indigo-500" />
                  <p className="text-sm">Buscando kits no banco de dados...</p>
                </div>
              ) : filteredKits.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl">
                  <Cpu size={40} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-sm font-bold text-slate-600">Nenhum kit encontrado</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    Crie um novo kit clicando no botão para começar a mapear tags físicas e vendê-las aos clientes.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredKits.map((kit) => {
                    const isSelected = selectedKit?.id === kit.id;
                    return (
                      <div
                        key={kit.id}
                        id={`kit-card-${kit.id}`}
                        onClick={() => handleSelectKit(kit)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-3 ${
                          isSelected 
                            ? 'bg-indigo-50/40 border-indigo-200 ring-2 ring-indigo-500/10' 
                            : 'bg-white hover:bg-slate-50/50 border-slate-200'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black text-indigo-600 uppercase">
                              {kit.codigoKit}
                            </span>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                              kit.status === 'Ativado' ? 'bg-emerald-100 text-emerald-800' :
                              kit.status === 'Vendido' ? 'bg-blue-100 text-blue-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {kit.status}
                            </span>
                          </div>
                          <h4 className="text-sm font-black text-slate-700">{kit.nome}</h4>
                          <p className="text-xs text-slate-400">
                            Faixa: #{kit.caixaInicial} a #{kit.caixaFinal} ({kit.quantidadeCaixas} caixas)
                          </p>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-2.5 md:pt-0 border-slate-100">
                          {kit.status === 'Ativado' && kit.empresaDestino && (
                            <div className="text-right">
                              <p className="text-[10px] text-slate-400 font-bold uppercase leading-none">Vinculado a</p>
                              <p className="text-xs font-black text-slate-700 mt-1">{kit.empresaDestino}</p>
                            </div>
                          )}
                          <ArrowRight size={16} className={`text-slate-400 shrink-0 ${isSelected ? 'text-indigo-500 translate-x-1' : ''} transition-transform`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Details of selected kit */}
          <div className="lg:col-span-5 space-y-4">
            {selectedKit ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6" id="kit-details-panel">
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                  <div>
                    <span className="font-mono text-xs font-black text-indigo-600 block mb-0.5">{selectedKit.codigoKit}</span>
                    <h3 className="font-black text-slate-800 text-lg leading-tight">{selectedKit.nome}</h3>
                    <p className="text-xs text-slate-400 mt-1">{selectedKit.descricao || 'Sem descrição'}</p>
                  </div>
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded uppercase tracking-widest shrink-0 ${
                    selectedKit.status === 'Ativado' ? 'bg-emerald-100 text-emerald-800' :
                    selectedKit.status === 'Vendido' ? 'bg-blue-100 text-blue-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedKit.status}
                  </span>
                </div>

                {/* Operations */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" id="kit-operations">
                  <button
                    id="btn-start-scanning"
                    onClick={() => handleOpenScanDashboard(selectedKit)}
                    className="p-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl active:scale-98 transition-all flex items-center justify-center gap-2"
                  >
                    <Play size={14} /> Mapear Tags (NFC)
                  </button>
                  <button
                    id="btn-duplicate-kit"
                    onClick={() => handleDuplicateKit(selectedKit.id)}
                    className="p-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl active:scale-98 transition-all flex items-center justify-center gap-2"
                  >
                    <Copy size={14} /> Duplicar Kit
                  </button>
                  {selectedKit.status === 'Disponível' && (
                    <button
                      id="btn-delete-kit"
                      onClick={() => handleDeleteKit(selectedKit.id)}
                      className="p-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl active:scale-98 transition-all flex items-center justify-center gap-2 sm:col-span-2"
                    >
                      <Trash2 size={14} /> Excluir Kit
                    </button>
                  )}
                </div>

                {/* Details Statistics */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Total de caixas:</span>
                    <span className="font-bold text-slate-700 font-mono">{selectedKit.quantidadeCaixas}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Caixas cadastradas (UID):</span>
                    <span className="font-bold text-emerald-600 font-mono">
                      {loadingBoxes ? 'Carregando...' : getRegisteredBoxesCount(selectedKitBoxes)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Caixas pendentes:</span>
                    <span className="font-bold text-amber-600 font-mono">
                      {loadingBoxes ? 'Carregando...' : selectedKit.quantidadeCaixas - getRegisteredBoxesCount(selectedKitBoxes)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Criado em:</span>
                    <span className="font-mono text-slate-500">
                      {new Date(selectedKit.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  {selectedKit.status === 'Ativado' && selectedKit.activatedAt && (
                    <div className="border-t border-slate-200/50 pt-2.5 mt-2.5 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Ativado em:</span>
                        <span className="font-mono text-slate-500">
                          {new Date(selectedKit.activatedAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Usuário ativador:</span>
                        <span className="font-bold text-slate-700">{selectedKit.activatedBy || 'N/A'}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Box list in the kit */}
                <div className="space-y-3">
                  <h4 className="font-black text-slate-800 text-sm">Relação de Caixas</h4>
                  
                  {/* Search inside box table */}
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      id="input-search-box-detail"
                      type="text"
                      value={boxSearchQuery}
                      onChange={(e) => setBoxSearchQuery(e.target.value)}
                      placeholder="Filtrar por UID, Caixa ou Texto..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white outline-none"
                    />
                  </div>

                  {loadingBoxes ? (
                    <div className="text-center py-8 text-slate-400">
                      <Loader2 size={24} className="animate-spin mx-auto mb-2 text-indigo-500" />
                      <span className="text-xs">Buscando caixas...</span>
                    </div>
                  ) : filteredBoxes.length === 0 ? (
                    <p className="text-center py-6 text-slate-400 text-xs">Nenhuma caixa correspondente.</p>
                  ) : (
                    <div className="max-h-[250px] overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
                      {filteredBoxes.map((box) => (
                        <div key={box.id} className="flex items-center justify-between p-2 rounded-lg border border-slate-100 bg-slate-50/40">
                          <div>
                            <span className="font-bold text-slate-700">BOX-{box.numeroCaixa}</span>
                            {box.textoGravado && box.textoGravado !== `BOX-${box.numeroCaixa}` && (
                              <span className="text-[10px] text-slate-400 block font-normal">({box.textoGravado})</span>
                            )}
                          </div>
                          {box.uid ? (() => {
                            const formats = getNfcUidFormats(box.uid);
                            const hexVal = box.uidHex || formats.uidHex;
                            const decVal = box.uidDecimal || formats.uidDecimal;
                            const hasBoth = hexVal && decVal && hexVal !== decVal;

                            return (
                              <div className="flex flex-col items-end gap-0.5">
                                {hasBoth ? (
                                  <>
                                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded border border-indigo-100/60 font-mono">
                                      HEX: {hexVal}
                                    </span>
                                    <span className="text-[9px] text-slate-500 font-mono font-medium">
                                      DEC: {decVal}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-[10px] font-medium bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-100 font-mono">
                                    {box.uid}
                                  </span>
                                )}
                              </div>
                            );
                          })() : (
                            <span className="text-[10px] text-slate-400 italic">Pendente</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[350px]">
                <Cpu size={32} className="text-slate-300 mb-2" />
                <h4 className="font-bold text-slate-600 text-sm">Nenhum Kit Selecionado</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Selecione um kit da lista para visualizar suas caixas associadas, métricas de fabricação e ações.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE KIT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="create-kit-modal">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-black text-lg">Criar Novo Kit Comercial</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white transition-all">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateKit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nome do Kit</label>
                <input
                  required
                  type="text"
                  value={kitForm.nome}
                  onChange={(e) => setKitForm({ ...kitForm, nome: e.target.value })}
                  placeholder="Ex: Kit NFC Comercial #10"
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Descrição (Opcional)</label>
                <textarea
                  value={kitForm.descricao}
                  onChange={(e) => setKitForm({ ...kitForm, descricao: e.target.value })}
                  placeholder="Ex: Lote fabricado em Julho com tags NTAG213."
                  rows={2}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 text-sm outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Caixa Inicial</label>
                  <input
                    required
                    type="number"
                    min={1}
                    value={kitForm.caixaInicial}
                    onChange={(e) => setKitForm({ ...kitForm, caixaInicial: Number(e.target.value) })}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Caixa Final</label>
                  <input
                    required
                    type="number"
                    min={kitForm.caixaInicial}
                    value={kitForm.caixaFinal}
                    onChange={(e) => setKitForm({ ...kitForm, caixaFinal: Number(e.target.value) })}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 text-sm outline-none"
                  />
                </div>
              </div>

              {/* Automatic quantity prediction banner */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                <span className="text-xs text-slate-500">Quantidade de caixas estimadas:</span>
                <span className="font-mono text-sm font-black text-slate-800">
                  {kitForm.caixaFinal >= kitForm.caixaInicial ? kitForm.caixaFinal - kitForm.caixaInicial + 1 : 0}
                </span>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingKit}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1.5"
                >
                  {isSubmittingKit ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Criando...
                    </>
                  ) : (
                    'Confirmar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
