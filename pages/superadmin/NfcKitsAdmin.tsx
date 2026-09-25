import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Cpu, Plus, Search, RotateCcw, Copy, Trash2, ArrowRight, Play, Eye, X, CheckCircle, 
  AlertTriangle, ArrowLeft, Loader2, RefreshCw, Layers, Shield, Check, HelpCircle, Zap, Tag
} from 'lucide-react';
import { KitService, NfcReaderService, UidMappingService, getNfcUidFormats } from '../../services/nfcServices';
import { NfcKit, NfcBox } from '../../types';
import { useApp } from '../../context/AppContext';

export const NfcKitsAdmin: React.FC = () => {
  const { currentUser } = useApp();
  const { t } = useTranslation();
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
  const [kitFormType, setKitFormType] = useState<'RANGE' | 'CUSTOM'>('RANGE');
  const [kitForm, setKitForm] = useState({
    nome: '',
    descricao: '',
    caixaInicial: 1,
    caixaFinal: 50,
    prefixo: '',
    sufixo: '',
    customBoxesText: ''
  });
  const [isSubmittingKit, setIsSubmittingKit] = useState<boolean>(false);

  // Add custom box to selected kit
  const [newCustomBoxName, setNewCustomBoxName] = useState<string>('');
  const [isAddingCustomBox, setIsAddingCustomBox] = useState<boolean>(false);

  // Scan Mode state
  const [scanModeActive, setScanModeActive] = useState<boolean>(false);
  const [activeScanKit, setActiveScanKit] = useState<NfcKit | null>(null);
  const [scanMethod, setScanMethod] = useState<'MANUAL_SEQUENTIAL' | 'SEQUENTIAL' | 'MANUAL'>('MANUAL_SEQUENTIAL');
  const [currentScanBox, setCurrentScanBox] = useState<number>(1);
  const [manualBoxInput, setManualBoxInput] = useState<string>('');

  // Manual Sequential specific state
  const [manualSeqBoxInput, setManualSeqBoxInput] = useState<string>('');
  const [manualSeqTargetBox, setManualSeqTargetBox] = useState<string | null>(null);
  const manualSeqInputRef = useRef<HTMLInputElement>(null);

  const [webNfcActive, setWebNfcActive] = useState<boolean>(false);
  const [webNfcSupported, setWebNfcSupported] = useState<boolean>('NDEFReader' in window);
  
  // Status message in scanning screen
  const [scanMessage, setScanMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' | null }>({ text: '', type: null });

  // Direct USB / Manual tag input state
  const [directTagInput, setDirectTagInput] = useState<string>('');
  const instantInputRef = useRef<HTMLInputElement>(null);

  // History of recent scans during the fabrication session
  const [recentScans, setRecentScans] = useState<Array<{
    id: string;
    boxNumber: string;
    inputRaw: string;
    canonicalHex: string;
    decFormat: string;
    formatLabel: string;
    timestamp: string;
  }>>([]);

  // Box search filter in kit details view
  const [boxSearchQuery, setBoxSearchQuery] = useState<string>('');

  // Setup refs to read live state inside continuous listener callbacks
  const scanMethodRef = useRef(scanMethod);
  const currentScanBoxRef = useRef(currentScanBox);
  const manualBoxInputRef = useRef(manualBoxInput);
  const manualSeqBoxInputRef = useRef(manualSeqBoxInput);
  const manualSeqTargetBoxRef = useRef(manualSeqTargetBox);
  const activeScanKitRef = useRef(activeScanKit);
  const selectedKitBoxesRef = useRef(selectedKitBoxes);

  useEffect(() => {
    scanMethodRef.current = scanMethod;
    currentScanBoxRef.current = currentScanBox;
    manualBoxInputRef.current = manualBoxInput;
    manualSeqBoxInputRef.current = manualSeqBoxInput;
    manualSeqTargetBoxRef.current = manualSeqTargetBox;
    activeScanKitRef.current = activeScanKit;
    selectedKitBoxesRef.current = selectedKitBoxes;
  }, [scanMethod, currentScanBox, manualBoxInput, manualSeqBoxInput, manualSeqTargetBox, activeScanKit, selectedKitBoxes]);

  // Auto-focus the input depending on mode
  useEffect(() => {
    if (scanModeActive) {
      const timer = setTimeout(() => {
        if (scanMethod === 'MANUAL_SEQUENTIAL') {
          if (!manualSeqTargetBox) {
            manualSeqInputRef.current?.focus();
          } else {
            instantInputRef.current?.focus();
          }
        } else {
          instantInputRef.current?.focus();
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [scanModeActive, currentScanBox, scanMethod, manualSeqTargetBox]);

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
    if (!kitForm.nome.trim()) {
      alert("Informe o nome do kit.");
      return;
    }

    try {
      setIsSubmittingKit(true);
      let newKit: NfcKit;

      if (kitFormType === 'CUSTOM') {
        const customBoxes = kitForm.customBoxesText
          .split(/[\n,;]+/)
          .map(b => b.trim())
          .filter(Boolean);

        if (customBoxes.length === 0) {
          alert("Digite ao menos uma caixa personalizada para o kit.");
          setIsSubmittingKit(false);
          return;
        }

        newKit = await KitService.createKit({
          nome: kitForm.nome.trim(),
          descricao: kitForm.descricao.trim(),
          customBoxes
        });
      } else {
        if (Number(kitForm.caixaFinal) < Number(kitForm.caixaInicial)) {
          alert("A caixa final não pode ser menor que a inicial.");
          setIsSubmittingKit(false);
          return;
        }

        newKit = await KitService.createKit({
          nome: kitForm.nome.trim(),
          descricao: kitForm.descricao.trim(),
          caixaInicial: Number(kitForm.caixaInicial),
          caixaFinal: Number(kitForm.caixaFinal),
          prefixo: kitForm.prefixo.trim(),
          sufixo: kitForm.sufixo.trim()
        });
      }

      await loadKits();
      setShowCreateModal(false);
      setKitForm({
        nome: '',
        descricao: '',
        caixaInicial: 1,
        caixaFinal: 50,
        prefixo: '',
        sufixo: '',
        customBoxesText: ''
      });
      handleSelectKit(newKit);
    } catch (err: any) {
      alert("Erro ao criar kit: " + err.message);
    } finally {
      setIsSubmittingKit(false);
    }
  };

  // Add individual custom box to selected kit
  const handleAddCustomBox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKit || !newCustomBoxName.trim()) return;

    const boxName = newCustomBoxName.trim().toUpperCase();
    const existing = selectedKitBoxes.find(b => String(b.numeroCaixa).toUpperCase() === boxName);
    if (existing) {
      alert(`A caixa ${boxName} já existe neste kit.`);
      return;
    }

    try {
      setIsAddingCustomBox(true);
      const newBox: NfcBox = {
        id: boxName.replace(/\//g, '_'),
        numeroCaixa: boxName,
        uid: '',
        textoGravado: `BOX-${boxName}`,
        status: 'Pendente'
      };

      await KitService.saveKitBox(selectedKit.id, newBox);
      const updatedBoxes = await KitService.getKitBoxes(selectedKit.id);
      setSelectedKitBoxes(updatedBoxes);
      setNewCustomBoxName('');
      alert(`Caixa ${boxName} adicionada com sucesso ao kit!`);
    } catch (err: any) {
      alert("Erro ao adicionar caixa: " + err.message);
    } finally {
      setIsAddingCustomBox(false);
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

  const handleClearBox = async (boxNumber: string | number) => {
    if (!selectedKit) return;
    if (!window.confirm(`Deseja realmente limpar a tag NFC da caixa ${boxNumber}?`)) return;
    
    try {
       await KitService.clearKitBox(selectedKit.id, boxNumber);
       // Atualiza a lista local
       const newBoxesList = selectedKitBoxes.map(b => {
           if (b.numeroCaixa === boxNumber || String(b.numeroCaixa) === String(boxNumber)) {
               return { ...b, uid: '', uidHex: '', uidDecimal: '', uid4ByteHex: '' };
           }
           return b;
       });
       setSelectedKitBoxes(newBoxesList);
       
       // Se o kit que está no readerMode for o mesmo que estamos editando
       if (activeScanKit && activeScanKit.id === selectedKit.id) {
          const newRefList = selectedKitBoxesRef.current.map(b => {
             if (b.numeroCaixa === boxNumber || String(b.numeroCaixa) === String(boxNumber)) {
                 return { ...b, uid: '', uidHex: '', uidDecimal: '', uid4ByteHex: '' };
             }
             return b;
          });
          selectedKitBoxesRef.current = newRefList;
       }
       
       alert("Caixa limpa com sucesso!");
    } catch (err: any) {
       alert("Erro ao limpar caixa: " + err.message);
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

      // 2. Determinar o número da caixa que estamos gravando (suporta letras e caracteres especiais: 25L, *509, etc.)
      let targetBoxNumber = '';
      if (scanMethodRef.current === 'SEQUENTIAL') {
        targetBoxNumber = String(currentScanBoxRef.current).padStart(3, '0');
      } else if (scanMethodRef.current === 'MANUAL_SEQUENTIAL') {
        const rawTarget = (manualSeqTargetBoxRef.current || manualSeqBoxInputRef.current || '').trim().toUpperCase();
        if (!rawTarget) {
          setScanMessage({ text: 'Digite o número da caixa (ex: 25L, *509) e pressione ENTER antes de aproximar a tag.', type: 'error' });
          playBeep(false);
          manualSeqInputRef.current?.focus();
          return;
        }
        targetBoxNumber = rawTarget;
      } else {
        const rawManual = (manualBoxInputRef.current || '').trim().toUpperCase();
        if (!rawManual) {
          setScanMessage({ text: 'Informe o número da caixa a ser gravada.', type: 'error' });
          playBeep(false);
          return;
        }
        targetBoxNumber = rawManual;
      }

      // 3. Verificar se o mesmo número de caixa já existe com outro UID nesse kit
      const existingBox = selectedKitBoxesRef.current.find(b => String(b.numeroCaixa).toUpperCase() === targetBoxNumber);
      if (existingBox && existingBox.uid && existingBox.uid !== cleanUid) {
        if (!window.confirm(`A caixa ${targetBoxNumber} já possui o UID ${existingBox.uid}. Deseja substituí-lo?`)) {
          setScanMessage({ text: 'Operação cancelada pelo operador.', type: 'info' });
          return;
        }
      }

      // 4. Salvar na Firestore com UID canônico hexadecimal
      const formats = getNfcUidFormats(cleanUid);
      const canonicalUid = formats.uidHex || cleanUid;
      const updatedBox: NfcBox = {
        id: targetBoxNumber.replace(/\//g, '_'),
        numeroCaixa: targetBoxNumber,
        uid: canonicalUid,
        uidHex: canonicalUid,
        uidDecimal: formats.uidDecimal || '',
        uid4ByteHex: formats.uid4ByteHex || '',
        textoGravado: nfcText || `BOX-${targetBoxNumber}`,
        status: 'Associada'
      };

      await KitService.saveKitBox(kit.id, updatedBox);

      // 5. Atualizar estado local de boxes do kit selecionado
      const existsInList = selectedKitBoxesRef.current.some(b => String(b.numeroCaixa).toUpperCase() === targetBoxNumber);
      let newBoxesList: NfcBox[] = [];
      if (existsInList) {
        newBoxesList = selectedKitBoxesRef.current.map(b => 
          String(b.numeroCaixa).toUpperCase() === targetBoxNumber ? updatedBox : b
        );
      } else {
        newBoxesList = [...selectedKitBoxesRef.current, updatedBox].sort((a, b) => {
          const aNum = parseInt(String(a.numeroCaixa).replace(/\D/g, ''), 10);
          const bNum = parseInt(String(b.numeroCaixa).replace(/\D/g, ''), 10);
          if (!isNaN(aNum) && !isNaN(bNum) && aNum !== bNum) return aNum - bNum;
          return String(a.numeroCaixa).localeCompare(String(b.numeroCaixa), 'pt-BR', { numeric: true });
        });
      }
      setSelectedKitBoxes(newBoxesList);

      const isOldDec = formats.isOldReaderFormat || (/^\d+$/.test(cleanUid) && cleanUid.length >= 6);
      const formatLabel = isOldDec
        ? `Leitor Antigo (DEC ${cleanUid} ➔ HEX ${canonicalUid})`
        : `Leitor Novo (HEX ${canonicalUid})`;

      // Registrar no histórico da sessão
      setRecentScans(prev => [
        {
          id: `${Date.now()}-${Math.random()}`,
          boxNumber: targetBoxNumber,
          inputRaw: cleanUid,
          canonicalHex: canonicalUid,
          decFormat: formats.uidDecimal || cleanUid,
          formatLabel,
          timestamp: new Date().toLocaleTimeString('pt-BR')
        },
        ...prev.slice(0, 5)
      ]);

      setDirectTagInput('');

      const msgText = isOldDec
        ? `✅ Caixa #${targetBoxNumber} associada! [Leitor Antigo: ${cleanUid} ➔ Hex: ${canonicalUid}]`
        : `✅ Caixa #${targetBoxNumber} associada com sucesso! [Hex Canônico: ${canonicalUid}]`;

      setScanMessage({ 
        text: msgText, 
        type: 'success' 
      });
      playBeep(true);

      // 6. Fluxo de Avanço Automático
      if (scanMethodRef.current === 'SEQUENTIAL') {
        const nextBox = currentScanBoxRef.current + 1;
        if (typeof kit.caixaFinal === 'number' && nextBox <= kit.caixaFinal) {
          setCurrentScanBox(nextBox);
        } else {
          setScanMessage({ text: '🎉 Parabéns! Todas as caixas deste kit foram associadas com sucesso!', type: 'success' });
        }
        setTimeout(() => {
          instantInputRef.current?.focus();
        }, 100);
      } else if (scanMethodRef.current === 'MANUAL_SEQUENTIAL') {
        // Limpa o alvo atual e o input de digitação para a próxima caixa pronta para digitação rápida
        setManualSeqBoxInput('');
        setManualSeqTargetBox(null);
        setTimeout(() => {
          manualSeqInputRef.current?.focus();
        }, 120);
      } else {
        // Se for leitura manual avulsa, limpa o campo
        setManualBoxInput('');
        setTimeout(() => {
          instantInputRef.current?.focus();
        }, 100);
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

    const cleanup = NfcReaderService.setupUsbHidListener((code: string) => {
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
    const finalBox = typeof activeScanKit.caixaFinal === 'number' 
      ? activeScanKit.caixaFinal 
      : parseInt(String(activeScanKit.caixaFinal), 10) || 50;
    const nextBox = currentScanBox + 1;
    if (nextBox <= finalBox) {
      setCurrentScanBox(nextBox);
      setScanMessage({ text: `Caixa ${String(currentScanBox).padStart(3, '0')} pulada.`, type: 'info' });
    } else {
      setScanMessage({ text: 'Você chegou ao final do limite de caixas deste kit.', type: 'info' });
    }
  };

  const handleBackBox = () => {
    if (!activeScanKit) return;
    const initBox = typeof activeScanKit.caixaInicial === 'number' 
      ? activeScanKit.caixaInicial 
      : parseInt(String(activeScanKit.caixaInicial), 10) || 1;
    const prevBox = currentScanBox - 1;
    if (prevBox >= initBox) {
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
    const initBox = typeof kit.caixaInicial === 'number' 
      ? kit.caixaInicial 
      : parseInt(String(kit.caixaInicial), 10) || 1;
    setCurrentScanBox(initBox);
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200" id="nfc-header-panel">
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:p-6" id="scanning-dashboard">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-4 pb-4 sm:px-6 sm:pb-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
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
              <div className="flex flex-wrap border-b border-slate-200 bg-slate-50 p-2 gap-2">
                <button
                  id="btn-mode-manual-seq"
                  onClick={() => {
                    setScanMethod('MANUAL_SEQUENTIAL');
                    setManualSeqTargetBox(null);
                    setManualSeqBoxInput('');
                  }}
                  className={`flex-1 min-w-[170px] py-3 px-4 font-black text-xs uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${
                    scanMethod === 'MANUAL_SEQUENTIAL' 
                      ? 'bg-white text-indigo-600 shadow-sm border border-slate-200 ring-1 ring-indigo-500/20' 
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <Zap size={15} className="text-amber-500" />
                  Gravação Sequencial Manual
                </button>
                <button
                  id="btn-mode-seq"
                  onClick={() => setScanMethod('SEQUENTIAL')}
                  className={`flex-1 min-w-[150px] py-3 px-4 font-black text-xs uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${
                    scanMethod === 'SEQUENTIAL' 
                      ? 'bg-white text-indigo-600 shadow-sm border border-slate-200 ring-1 ring-indigo-500/20' 
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <Layers size={15} />
                  Sequencial Numérica (#001...)
                </button>
                <button
                  id="btn-mode-manual"
                  onClick={() => setScanMethod('MANUAL')}
                  className={`flex-1 min-w-[130px] py-3 px-4 font-black text-xs uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${
                    scanMethod === 'MANUAL' 
                      ? 'bg-white text-indigo-600 shadow-sm border border-slate-200 ring-1 ring-indigo-500/20' 
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <Cpu size={15} />
                  Gravação Avulsa
                </button>
              </div>

              {/* Central Dynamic Screen */}
              <div className="p-4 sm:p-8 flex flex-col items-center justify-center min-h-[350px] text-center border-b border-slate-100">
                {scanMethod === 'MANUAL_SEQUENTIAL' ? (
                  /* MODO GRAVAÇÃO SEQUENCIAL MANUAL (DIGITAÇÃO RÁPIDA DE CAIXA + SCAN DE TAG) */
                  <div className="space-y-6 w-full max-w-md animate-in fade-in duration-150">
                    {!manualSeqTargetBox ? (
                      /* ETAPA 1: DIGITAR NÚMERO DA CAIXA */
                      <div className="space-y-5">
                        <div>
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-[11px] font-black uppercase tracking-wider mb-2 border border-amber-200/60">
                            <Zap size={13} className="text-amber-500" /> Etapa 1: Defina a Caixa
                          </div>
                          <h3 className="text-2xl font-black text-slate-800">
                            Número da Caixa
                          </h3>
                          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                            Aceita <strong>letras e caracteres especiais</strong> (ex: <span className="font-mono font-bold text-indigo-600 bg-slate-100 px-1.5 py-0.5 rounded">25L</span>, <span className="font-mono font-bold text-indigo-600 bg-slate-100 px-1.5 py-0.5 rounded">*509</span>, <span className="font-mono font-bold text-indigo-600 bg-slate-100 px-1.5 py-0.5 rounded">CX-01</span>).
                          </p>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 shadow-2xs">
                          <div className="relative">
                            <input 
                              id="input-manual-seq-box"
                              ref={manualSeqInputRef}
                              type="text"
                              value={manualSeqBoxInput}
                              onChange={(e) => setManualSeqBoxInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const trimmed = manualSeqBoxInput.trim().toUpperCase();
                                  if (trimmed) {
                                    setManualSeqTargetBox(trimmed);
                                    setScanMessage({ text: `Caixa "${trimmed}" selecionada. Aproxime a tag NFC para gravar...`, type: 'info' });
                                    setTimeout(() => {
                                      instantInputRef.current?.focus();
                                    }, 80);
                                  }
                                }
                              }}
                              placeholder="Ex: 25L ou *509"
                              autoFocus
                              className="w-full p-4 rounded-xl border-2 border-indigo-200 bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 font-black text-3xl text-center outline-none uppercase font-mono tracking-wider text-slate-800 transition-all shadow-sm"
                            />
                          </div>

                          <button
                            type="button"
                            id="btn-confirm-seq-box-number"
                            disabled={!manualSeqBoxInput.trim()}
                            onClick={() => {
                              const trimmed = manualSeqBoxInput.trim().toUpperCase();
                              if (trimmed) {
                                setManualSeqTargetBox(trimmed);
                                setScanMessage({ text: `Caixa "${trimmed}" selecionada. Aproxime a tag NFC para gravar...`, type: 'info' });
                                setTimeout(() => {
                                  instantInputRef.current?.focus();
                                }, 80);
                              }
                            }}
                            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-xl transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer active:scale-98"
                          >
                            <span>Gravar Tag para esta Caixa</span>
                            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-mono">ENTER ➔</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ETAPA 2: AGUARDANDO APROXIMAR A TAG NFC */
                      <div className="space-y-5 animate-in zoom-in-95 duration-150">
                        <div>
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[11px] font-black uppercase tracking-wider mb-2 border border-emerald-200/60">
                            <Check size={13} /> Etapa 2: Aproxime a Tag NFC
                          </div>
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Caixa Selecionada</p>
                          <div className="inline-block bg-indigo-50 border-2 border-indigo-500 text-indigo-900 font-mono font-black text-4xl px-6 py-2 rounded-2xl mt-1 shadow-sm">
                            BOX-{manualSeqTargetBox}
                          </div>
                        </div>

                        <div className="bg-gradient-to-b from-indigo-50/80 to-white border-2 border-dashed border-indigo-300 rounded-2xl p-6 relative overflow-hidden flex flex-col items-center justify-center shadow-sm">
                          <div className="w-14 h-14 rounded-full bg-indigo-600 text-white flex items-center justify-center mb-3 shadow-lg shadow-indigo-600/30 animate-pulse">
                            <Cpu size={28} />
                          </div>
                          <h4 className="text-base font-black text-slate-800">Aproxime a Tag NFC no Leitor</h4>
                          <p className="text-xs text-slate-500 mt-1 max-w-xs">
                            Ao aproximar a tag, a caixa será gravada e o sistema avançará <strong>automaticamente</strong> para a digitação da próxima caixa!
                          </p>

                          {/* Instant input field for USB HID reader or manual typing */}
                          <div className="mt-5 w-full max-w-sm flex items-center gap-2">
                            <div className="relative flex-1">
                              <input 
                                id="input-tag-reader-manual-seq"
                                ref={instantInputRef}
                                type="text"
                                value={directTagInput}
                                onChange={e => setDirectTagInput(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && directTagInput.trim()) {
                                    e.preventDefault();
                                    processTagScanned(directTagInput);
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setManualSeqTargetBox(null);
                                    setTimeout(() => manualSeqInputRef.current?.focus(), 80);
                                  }
                                }}
                                placeholder="Aproxime no leitor USB ou digite..."
                                className="w-full px-3.5 py-2.5 bg-white border border-indigo-300 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                              />
                            </div>
                            <button 
                              id="btn-confirm-tag-manual-seq"
                              type="button"
                              disabled={!directTagInput.trim()}
                              onClick={() => {
                                if (directTagInput.trim()) processTagScanned(directTagInput);
                              }}
                              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl disabled:opacity-40 transition-all shrink-0 flex items-center gap-1 cursor-pointer"
                            >
                              <Check size={14} /> Gravar
                            </button>
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="flex justify-center">
                          <button
                            type="button"
                            id="btn-cancel-target-box"
                            onClick={() => {
                              setManualSeqTargetBox(null);
                              setTimeout(() => manualSeqInputRef.current?.focus(), 80);
                            }}
                            className="px-4 py-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <ArrowLeft size={14} /> Trocar / Corrigir Número da Caixa (ESC)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : scanMethod === 'SEQUENTIAL' ? (
                  <div className="space-y-6 w-full max-w-md">
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Próxima Caixa</p>
                      <h3 className="text-7xl font-black text-slate-800 mt-2 font-mono">
                        {String(currentScanBox).padStart(3, '0')}
                      </h3>
                    </div>

                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 sm:p-6 relative overflow-hidden flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3">
                        <Cpu size={24} className="animate-spin" />
                      </div>
                      <h4 className="text-base font-bold text-indigo-900">Aproxime uma Tag NFC</h4>
                      <p className="text-xs text-indigo-600 mt-1 max-w-xs">
                        Compatível com <strong>Leitor Antigo (Decimal)</strong>, <strong>Leitor Novo (Hexadecimal)</strong> ou digitação manual.
                      </p>

                      {/* Instant input field for USB HID reader or manual typing */}
                      <div className="mt-4 w-full max-w-sm flex items-center gap-2">
                        <div className="relative flex-1">
                          <input 
                            id="input-tag-reader"
                            ref={instantInputRef}
                            type="text"
                            value={directTagInput}
                            onChange={e => setDirectTagInput(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && directTagInput.trim()) {
                                e.preventDefault();
                                processTagScanned(directTagInput);
                              }
                            }}
                            placeholder="Aproxime no leitor USB ou digite..."
                            className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                          />
                        </div>
                        <button 
                          id="btn-confirm-tag-manual"
                          type="button"
                          disabled={!directTagInput.trim()}
                          onClick={() => {
                            if (directTagInput.trim()) processTagScanned(directTagInput);
                          }}
                          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl disabled:opacity-40 transition-all shrink-0 flex items-center gap-1"
                        >
                          <Check size={14} /> Gravar
                        </button>
                      </div>
                    </div>

                    {/* Sequential control buttons */}
                    <div className="flex flex-wrap gap-3 justify-center pt-2">
                      <button
                        id="btn-back-box"
                        onClick={handleBackBox}
                        disabled={typeof activeScanKit.caixaInicial === 'number' && currentScanBox <= activeScanKit.caixaInicial}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1.5"
                      >
                        <ArrowLeft size={14} /> Voltar
                      </button>
                      <button
                        id="btn-skip-box"
                        onClick={handleSkipBox}
                        disabled={typeof activeScanKit.caixaFinal === 'number' && currentScanBox >= activeScanKit.caixaFinal}
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
                        type="text"
                        value={manualBoxInput}
                        onChange={(e) => setManualBoxInput(e.target.value)}
                        placeholder="Ex: 25L ou *509"
                        className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-black text-2xl text-center outline-none uppercase font-mono"
                      />
                      <p className="text-[10px] text-slate-400 mt-2">
                        Digite qualquer identificador (letras, números ou caracteres especiais).
                      </p>
                    </div>

                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-2">
                        <Cpu size={20} />
                      </div>
                      <h4 className="text-sm font-bold text-indigo-900">NFC Ativo</h4>
                      <p className="text-[11px] text-indigo-600 mt-0.5">
                        Defina o número acima e aproxime a tag no leitor ou digite abaixo.
                      </p>

                      {/* Manual mode instant input */}
                      <div className="mt-4 w-full max-w-sm flex items-center gap-2">
                        <input 
                          id="input-tag-reader-manual"
                          type="text"
                          value={directTagInput}
                          onChange={e => setDirectTagInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && directTagInput.trim()) {
                              e.preventDefault();
                              processTagScanned(directTagInput);
                            }
                          }}
                          placeholder="Código do leitor ou UID..."
                          className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                        />
                        <button 
                          id="btn-confirm-tag-manual-mode"
                          type="button"
                          disabled={!directTagInput.trim() || !manualBoxInput.trim()}
                          onClick={() => {
                            if (directTagInput.trim()) processTagScanned(directTagInput);
                          }}
                          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl disabled:opacity-40 transition-all shrink-0 flex items-center gap-1"
                        >
                          <Check size={14} /> Gravar
                        </button>
                      </div>
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

              {/* Session Recent Scans History */}
              {recentScans.length > 0 && (
                <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2" id="recent-scans-panel">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle size={12} className="text-emerald-600" />
                    Histórico Recente de Gravações na Sessão
                  </p>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {recentScans.map(scan => (
                      <div key={scan.id} className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200 text-xs font-mono shadow-2xs">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md text-[11px]">
                            BOX #{scan.boxNumber}
                          </span>
                          <span className="text-slate-700 text-[11px]">{scan.formatLabel}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-sans">{scan.timestamp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Hardware capabilities warning */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield size={14} className="text-slate-500" />
                  Suporte a Leitores NFC (Novo Hexadecimal & Antigo Decimal)
                </h4>
                <p className="text-xs text-slate-500 max-w-xl">
                  Suporta <strong>Leitores Novos (UID Hexadecimal completo)</strong> e <strong>Leitores Antigos (Decimal com bytes invertidos)</strong>. A conversão para o identificador canônico no banco é feita automaticamente. Compatível também com celulares Android (NFC nativo) e leitores USB HID.
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-black uppercase border border-indigo-200/60">
                  Dual Reader Ativo
                </span>
                {webNfcSupported ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black uppercase">
                    <Check size={12} /> Web NFC
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-[10px] font-black uppercase">
                    USB HID
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick List of Kit status on the right */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 space-y-4 shadow-sm" id="quick-view-boxes">
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:p-6" id="kits-admin-main-hub">
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
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-6" id="kit-details-panel">
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
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-slate-800 text-sm">Relação de Caixas</h4>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      {selectedKitBoxes.length} {selectedKitBoxes.length === 1 ? 'caixa' : 'caixas'}
                    </span>
                  </div>

                  {/* Add Custom Alphanumeric Box Form */}
                  <form onSubmit={handleAddCustomBox} className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100/80 space-y-2">
                    <label className="block text-[10px] font-black text-indigo-900 uppercase tracking-wider">
                      Adicionar Caixa Avulsa (Letras / Caracteres Especiais)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCustomBoxName}
                        onChange={(e) => setNewCustomBoxName(e.target.value)}
                        placeholder="Ex: 25L ou *509"
                        className="flex-1 px-3 py-2 bg-white border border-indigo-200 rounded-lg text-xs font-mono font-bold uppercase outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="submit"
                        disabled={isAddingCustomBox || !newCustomBoxName.trim()}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-all shadow-xs flex items-center gap-1 shrink-0 disabled:opacity-40 cursor-pointer"
                      >
                        {isAddingCustomBox ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                        <span>Adicionar</span>
                      </button>
                    </div>
                  </form>
                  
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
                          <div className="flex items-center gap-2">
                            {box.uid ? (() => {
                              const formats = getNfcUidFormats(box.uid);
                              const hexVal = box.uidHex || formats.uidHex;
                              const decVal = box.uidDecimal || formats.uidDecimal;
                              const hasBoth = hexVal && decVal && hexVal !== decVal;

                              return (
                                <div className="flex items-center gap-2">
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
                                  <button
                                    onClick={() => handleClearBox(box.numeroCaixa)}
                                    title="Limpar Tag desta Caixa"
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              );
                            })() : (
                              <span className="text-[10px] font-medium text-slate-400 italic">Pendente</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4 sm:p-8 text-center flex flex-col items-center justify-center min-h-[350px]">
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4" id="create-kit-modal">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="px-6 py-5 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-black text-lg">Criar Novo Kit Comercial</h3>
                <p className="text-xs text-slate-400">Gere caixas sequenciais ou com caracteres especiais</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white transition-all cursor-pointer">
                <X size={20} />
              </button>
            </div>

            {/* Type selector */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setKitFormType('RANGE')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  kitFormType === 'RANGE' 
                    ? 'bg-white text-indigo-600 shadow-xs border border-slate-200' 
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <Layers size={14} />
                Faixa Numérica
              </button>
              <button
                type="button"
                onClick={() => setKitFormType('CUSTOM')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  kitFormType === 'CUSTOM' 
                    ? 'bg-white text-indigo-600 shadow-xs border border-slate-200' 
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <Tag size={14} />
                Lista Personalizada (Letras / Caracteres Especiais)
              </button>
            </div>

            <form onSubmit={handleCreateKit} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nome do Kit</label>
                <input
                  required
                  type="text"
                  value={kitForm.nome}
                  onChange={(e) => setKitForm({ ...kitForm, nome: e.target.value })}
                  placeholder="Ex: Kit Especial Laboratório #10"
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 text-sm outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Descrição (Opcional)</label>
                <textarea
                  value={kitForm.descricao}
                  onChange={(e) => setKitForm({ ...kitForm, descricao: e.target.value })}
                  placeholder="Ex: Caixas especiais com identificação mista (25L, *509, etc.)."
                  rows={2}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 text-sm outline-none resize-none font-medium"
                />
              </div>

              {kitFormType === 'RANGE' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Caixa Inicial</label>
                      <input
                        required
                        type="number"
                        min={1}
                        value={kitForm.caixaInicial}
                        onChange={(e) => setKitForm({ ...kitForm, caixaInicial: Number(e.target.value) })}
                        className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 text-sm outline-none font-mono font-bold"
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
                        className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 text-sm outline-none font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Prefixo Opcional</label>
                      <input
                        type="text"
                        value={kitForm.prefixo}
                        onChange={(e) => setKitForm({ ...kitForm, prefixo: e.target.value })}
                        placeholder="Ex: * ou CX-"
                        className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 text-sm outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Sufixo Opcional</label>
                      <input
                        type="text"
                        value={kitForm.sufixo}
                        onChange={(e) => setKitForm({ ...kitForm, sufixo: e.target.value })}
                        placeholder="Ex: L ou -A"
                        className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 text-sm outline-none font-mono"
                      />
                    </div>
                  </div>

                  {/* Prediction banner */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center text-xs">
                    <span className="text-slate-500">Quantidade de caixas:</span>
                    <span className="font-mono text-sm font-black text-slate-800">
                      {kitForm.caixaFinal >= kitForm.caixaInicial ? kitForm.caixaFinal - kitForm.caixaInicial + 1 : 0}
                    </span>
                  </div>
                </>
              ) : (
                /* CUSTOM BOXES LIST (LETRAS E CARACTERES ESPECIAIS) */
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Lista de Caixas (Alfanuméricas & Caracteres Especiais)
                    </label>
                    <p className="text-xs text-slate-400 mb-2">
                      Digite ou cole os números das caixas separados por <strong>vírgula</strong>, <strong>espaço</strong> ou <strong>linhas</strong>.
                    </p>
                    <textarea
                      required
                      value={kitForm.customBoxesText}
                      onChange={(e) => setKitForm({ ...kitForm, customBoxesText: e.target.value })}
                      placeholder="Ex: 25L, *509, A-01, BOX-99, #300, 100, 101"
                      rows={4}
                      className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 text-sm outline-none font-mono"
                    />
                  </div>

                  {/* Parsed boxes chips preview */}
                  {(() => {
                    const parsed = kitForm.customBoxesText
                      .split(/[\n,;]+/)
                      .map(b => b.trim())
                      .filter(Boolean);

                    return (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-600">Caixas identificadas:</span>
                          <span className="font-mono font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                            {parsed.length} caixas
                          </span>
                        </div>
                        {parsed.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                            {parsed.map((bx, idx) => (
                              <span key={idx} className="font-mono font-bold text-[11px] bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded shadow-2xs">
                                {bx}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingKit}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingKit ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Criando Kit...
                    </>
                  ) : (
                    'Confirmar e Criar Kit'
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
