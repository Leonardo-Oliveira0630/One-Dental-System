import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  writeBatch,
  collectionGroup
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { NfcKit, NfcBox } from '../types';

/**
 * Utilitário para converter e gerenciar formatos de UID NFC (Hexadecimal <-> Decimal e byte swapping)
 */
export function getNfcUidFormats(uidInput: string): {
  uid: string;
  uidHex: string;
  uidDecimal: string;
  allCandidates: string[];
} {
  const raw = (uidInput || '').trim().toUpperCase().replace(/[:\s-]/g, '');
  if (!raw) {
    return { uid: '', uidHex: '', uidDecimal: '', allCandidates: [] };
  }

  const candidates = new Set<string>();
  candidates.add(raw);
  candidates.add(uidInput.trim().toUpperCase());

  let uidHex = '';
  let uidDecimal = '';

  const isNumericOnly = /^\d+$/.test(raw);
  const isHexOnly = /^[0-9A-F]+$/i.test(raw);

  if (isNumericOnly) {
    uidDecimal = raw;
    try {
      const bigVal = BigInt(raw);
      let hex = bigVal.toString(16).toUpperCase();
      if (hex.length % 2 !== 0) hex = '0' + hex;
      uidHex = hex;
      candidates.add(hex);

      // Inversão de ordem de bytes (Little-Endian <-> Big-Endian)
      const pairs = hex.match(/.{1,2}/g) || [];
      const reversedHex = [...pairs].reverse().join('');
      if (reversedHex) {
        candidates.add(reversedHex);
        try {
          const revBig = BigInt('0x' + reversedHex);
          candidates.add(revBig.toString(10));
        } catch {}
      }

      // Variações com zeros à esquerda
      if (hex.length < 8) candidates.add(hex.padStart(8, '0'));
      if (hex.length < 14) candidates.add(hex.padStart(14, '0'));
    } catch {
      // Fallback
    }
  } else if (isHexOnly) {
    uidHex = raw;
    try {
      let paddedHex = raw;
      if (paddedHex.length % 2 !== 0) paddedHex = '0' + paddedHex;

      const bigVal = BigInt('0x' + paddedHex);
      uidDecimal = bigVal.toString(10);
      candidates.add(uidDecimal);

      // Inversão de ordem de bytes (Little-Endian <-> Big-Endian)
      const pairs = paddedHex.match(/.{1,2}/g) || [];
      const reversedHex = [...pairs].reverse().join('');
      if (reversedHex && reversedHex !== raw) {
        candidates.add(reversedHex);
        try {
          const revBigVal = BigInt('0x' + reversedHex);
          const revDec = revBigVal.toString(10);
          candidates.add(revDec);
          if (!uidDecimal) uidDecimal = revDec;
        } catch {}
      }

      // Formato com dois pontos
      if (pairs.length > 1) {
        candidates.add(pairs.join(':'));
      }

      // Se for uma tag de 7 bytes (14 caracteres HEX, comum em NTAG213/215/216 e MIFARE)
      if (raw.length >= 14) {
        // Leitores USB de 4 bytes recortam os primeiros 4 bytes (8 caracteres HEX)
        const first4Hex = raw.slice(0, 8); // ex: "0427DE7D"
        candidates.add(first4Hex);

        const first4Pairs = first4Hex.match(/.{1,2}/g) || [];
        const reversedFirst4 = [...first4Pairs].reverse().join(''); // ex: "7DDE2704"
        if (reversedFirst4) {
          candidates.add(reversedFirst4);
          try {
            const decReversedFirst4 = BigInt('0x' + reversedFirst4).toString(10); // ex: "2111710980"
            candidates.add(decReversedFirst4);
            if (!uidDecimal || uidDecimal === raw) {
              uidDecimal = decReversedFirst4;
            }
          } catch {}
        }

        try {
          const decFirst4 = BigInt('0x' + first4Hex).toString(10);
          candidates.add(decFirst4);
        } catch {}
      }
    } catch {
      // Fallback
    }
  }

  return {
    uid: raw,
    uidHex: uidHex || raw,
    uidDecimal: uidDecimal || raw,
    allCandidates: Array.from(candidates).filter(Boolean)
  };
}

/**
 * Service 1: NfcReaderService
 * Abstração para leitura de tags NFC via Web NFC e simulação de leitores USB HID (teclado).
 */
export const NfcReaderService = {
  /**
   * Inicia o escaneamento de Web NFC
   */
  startWebNfcScan: async (
    onScan: (uid: string, text?: string) => void,
    onError?: (err: any) => void,
    signal?: AbortSignal
  ): Promise<void> => {
    if (!('NDEFReader' in window)) {
      throw new Error('Web NFC não é suportado neste dispositivo/navegador.');
    }

    try {
      const ndef = new (window as any).NDEFReader();
      await ndef.scan({ signal });

      ndef.addEventListener("reading", ({ message, serialNumber }: any) => {
        // Decodificar conteúdo NDEF se houver
        let textValue = '';
        try {
          for (const record of message.records) {
            if (record.recordType === "text" || (record.recordType === "mime" && record.mediaType === "text/plain")) {
              const textDecoder = new TextDecoder(record.encoding || 'utf-8');
              textValue = textDecoder.decode(record.data);
              break;
            } else if (record.recordType === "url") {
              const textDecoder = new TextDecoder(record.encoding || 'utf-8');
              const url = textDecoder.decode(record.data);
              const parts = url.split('/');
              textValue = parts[parts.length - 1] || '';
              break;
            } else {
              const textDecoder = new TextDecoder('utf-8');
              const text = textDecoder.decode(record.data);
              if (text && text.length > 0 && text.length < 50) {
                textValue = text;
                break;
              }
            }
          }
        } catch (err) {
          console.error("Erro ao decodificar registro NDEF:", err);
        }

        // Sanitizar e normalizar o serialNumber (remover dois-pontos e espaços, ex: "04:A1:B2:C3" -> "04A1B2C3")
        const cleanSerialNumber = serialNumber ? String(serialNumber).replace(/[:\s-]/g, '').toUpperCase() : '';
        const cleanText = textValue ? textValue.trim() : '';

        onScan(cleanSerialNumber, cleanText);
      });
    } catch (err) {
      if (onError) onError(err);
      throw err;
    }
  },

  /**
   * Configura um listener global de teclado para simular leitores USB HID
   * (leitores que emulam teclado digitando o UID seguido de Enter).
   */
  setupKeyboardScanner: (onScan: (code: string) => void): (() => void) => {
    let buffer = '';
    let lastKeyTime = Date.now();
    const SCANNER_TIMEOUT = 30; // ms

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar teclas modificadoras
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      // Tratamento para Enter ou Tab (terminadores comuns de leitores)
      if (e.key === 'Enter' || e.key === 'Tab') {
        if (buffer.length >= 3) {
          e.preventDefault();
          e.stopPropagation();
          onScan(buffer.trim());
        }
        buffer = '';
        return;
      }

      // Se o tempo entre teclas for muito longo, provavelmente é digitação manual,
      // a menos que o target seja um input comum, onde não queremos interceptar.
      if (timeDiff > 200) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          buffer = '';
        }
      }

      // Capturar apenas caracteres individuais
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        buffer += e.key;
        
        // Se for um input rápido de scanner, evitar que "vaze" para campos focados
        const isScannerInput = timeDiff < SCANNER_TIMEOUT;
        if (isScannerInput) {
          const target = e.target as HTMLElement;
          if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }
};

/**
 * Service 2: KitService
 * Gerenciamento de Kits NFC (Super Admin)
 */
export const KitService = {
  /**
   * Retorna todos os kits cadastrados
   */
  getKits: async (): Promise<NfcKit[]> => {
    const q = query(collection(db, 'nfc_kits'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as NfcKit[];
  },

  /**
   * Cria um novo kit com código sequencial automático único
   */
  createKit: async (kitData: {
    nome: string;
    descricao?: string;
    caixaInicial: number;
    caixaFinal: number;
  }): Promise<NfcKit> => {
    // 1. Obter contagem de kits existentes para calcular código sequencial
    const allKits = await KitService.getKits();
    const nextSeq = allKits.length + 1;
    const codigoKit = `KIT-2026-${String(nextSeq).padStart(6, '0')}`;

    const quantidadeCaixas = kitData.caixaFinal - kitData.caixaInicial + 1;

    const newKit: Omit<NfcKit, 'id'> = {
      codigoKit,
      nome: kitData.nome,
      descricao: kitData.descricao || '',
      quantidadeCaixas,
      caixaInicial: kitData.caixaInicial,
      caixaFinal: kitData.caixaFinal,
      status: 'Disponível',
      empresaDestino: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, 'nfc_kits'), newKit);
    
    // Inicializar as caixas na subcoleção como 'Disponível' e sem UID
    const batch = writeBatch(db);
    for (let num = kitData.caixaInicial; num <= kitData.caixaFinal; num++) {
      const padNum = String(num).padStart(3, '0');
      const boxRef = doc(db, 'nfc_kits', docRef.id, 'boxes', padNum);
      const boxData: NfcBox = {
        id: padNum,
        numeroCaixa: padNum,
        uid: '',
        textoGravado: `BOX-${padNum}`,
        status: 'Disponível'
      };
      batch.set(boxRef, boxData);
    }
    await batch.commit();

    return {
      id: docRef.id,
      ...newKit
    } as NfcKit;
  },

  /**
   * Busca as caixas de um kit específico
   */
  getKitBoxes: async (kitId: string): Promise<NfcBox[]> => {
    const q = query(collection(db, 'nfc_kits', kitId, 'boxes'), orderBy('numeroCaixa', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as NfcBox[];
  },

  /**
   * Salva a associação de uma caixa em um kit (calculando automaticamente uidHex e uidDecimal)
   */
  saveKitBox: async (kitId: string, box: NfcBox): Promise<void> => {
    const formats = getNfcUidFormats(box.uid || '');
    const boxRef = doc(db, 'nfc_kits', kitId, 'boxes', box.numeroCaixa);
    const boxData = {
      ...box,
      uidHex: box.uidHex || formats.uidHex || box.uid,
      uidDecimal: box.uidDecimal || formats.uidDecimal || box.uid,
      updatedAt: new Date().toISOString()
    };
    await setDoc(boxRef, boxData, { merge: true });

    // Atualizar updatedAt do kit
    const kitRef = doc(db, 'nfc_kits', kitId);
    await updateDoc(kitRef, {
      updatedAt: new Date().toISOString()
    });
  },

  /**
   * Exclui um kit se nunca foi vendido ou ativado (Status: Disponível)
   */
  deleteKit: async (kitId: string): Promise<void> => {
    const kitRef = doc(db, 'nfc_kits', kitId);
    const kitSnap = await getDoc(kitRef);
    if (!kitSnap.exists()) {
      throw new Error('Kit não encontrado.');
    }

    const kit = kitSnap.data() as NfcKit;
    if (kit.status !== 'Disponível') {
      throw new Error('Somente kits com status "Disponível" podem ser excluídos.');
    }

    // Excluir subcoleção de boxes primeiro
    const boxesSnap = await getDocs(collection(db, 'nfc_kits', kitId, 'boxes'));
    const batch = writeBatch(db);
    boxesSnap.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    batch.delete(kitRef);
    await batch.commit();
  },

  /**
   * Edita os dados de cabeçalho de um kit
   */
  updateKitHeader: async (kitId: string, data: { nome: string; descricao?: string; status?: 'Disponível' | 'Vendido' | 'Ativado'; empresaDestino?: string | null }): Promise<void> => {
    const kitRef = doc(db, 'nfc_kits', kitId);
    await updateDoc(kitRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  },

  /**
   * Duplica um kit, gerando um novo com a mesma faixa numérica mas com UIDs zerados
   */
  duplicateKit: async (kitId: string): Promise<NfcKit> => {
    const kitRef = doc(db, 'nfc_kits', kitId);
    const kitSnap = await getDoc(kitRef);
    if (!kitSnap.exists()) {
      throw new Error('Kit de origem não encontrado.');
    }

    const sourceKit = kitSnap.data() as NfcKit;
    
    // Criar o novo kit usando os dados numéricos do original
    const newKit = await KitService.createKit({
      nome: `${sourceKit.nome} (Cópia)`,
      descricao: sourceKit.descricao,
      caixaInicial: sourceKit.caixaInicial,
      caixaFinal: sourceKit.caixaFinal
    });

    return newKit;
  }
};

/**
 * Service 3: UidMappingService
 * Relacionamento e validação de UID x Caixa
 */
export const UidMappingService = {
  /**
   * Verifica se o UID já está cadastrado em algum kit ou em algum laboratório
   */
  checkUidDuplicate: async (uid: string, currentKitId?: string): Promise<{ duplicated: boolean; message?: string }> => {
    const formats = getNfcUidFormats(uid);
    if (!formats.uid) return { duplicated: false };

    const candidates = formats.allCandidates;

    // 1. Verificar em todos os kits cadastrados (Subcoleção 'boxes')
    try {
      for (const cand of candidates) {
        const kitsBoxesQuery = query(
          collectionGroup(db, 'boxes'),
          where('uid', '==', cand)
        );
        const kitsBoxesSnap = await getDocs(kitsBoxesQuery);
        
        const activeKitDupes = kitsBoxesSnap.docs.filter(docSnap => {
          if (!currentKitId) return true;
          const pathParts = docSnap.ref.path.split('/');
          const docKitId = pathParts[1]; // nfc_kits é index 0, kitId é index 1
          return docKitId !== currentKitId;
        });

        if (activeKitDupes.length > 0) {
          const dupeDoc = activeKitDupes[0];
          const pathParts = dupeDoc.ref.path.split('/');
          const docKitId = pathParts[1];
          
          const parentKitRef = doc(db, 'nfc_kits', docKitId);
          const parentKitSnap = await getDoc(parentKitRef);
          const parentKit = parentKitSnap.exists() ? (parentKitSnap.data() as NfcKit) : null;
          const kitCodeMsg = parentKit ? ` (no Kit ${parentKit.codigoKit})` : '';

          return {
            duplicated: true,
            message: `Este UID/SerialNumber (${cand}) já está associado à Caixa ${dupeDoc.data().numeroCaixa}${kitCodeMsg}.`
          };
        }
      }
    } catch (err: any) {
      console.warn("Aviso: Consulta de grupo de coleções em 'boxes' sem índice ou falhou:", err?.message || err);
    }

    // 2. Verificar em todos os laboratórios cadastrados (Subcoleção 'nfcBoxes')
    try {
      for (const cand of candidates) {
        const labsBoxesQuery = query(
          collectionGroup(db, 'nfcBoxes'),
          where('uid', '==', cand)
        );
        const labsBoxesSnap = await getDocs(labsBoxesQuery);
        if (!labsBoxesSnap.empty) {
          const dupeDoc = labsBoxesSnap.docs[0];
          return {
            duplicated: true,
            message: `Este UID/SerialNumber (${cand}) já está ativado em um laboratório (Caixa ${dupeDoc.data().numeroCaixa}).`
          };
        }
      }
    } catch (err: any) {
      console.warn("Aviso: Consulta de grupo de coleções em 'nfcBoxes' sem índice ou falhou:", err?.message || err);
    }

    return { duplicated: false };
  }
};

/**
 * Service 4: ActivationService
 * Ativação dos kits pelos laboratórios
 */
export const ActivationService = {
  /**
   * Ativa um kit de caixas no banco de dados do laboratório logado
   */
  activateKit: async (
    codigoKit: string,
    organizationId: string,
    organizationName: string,
    userName: string
  ): Promise<void> => {
    const cleanCode = codigoKit.trim().toUpperCase();
    if (!cleanCode) {
      throw new Error('Informe o código do kit.');
    }

    // 1. Localizar o kit correspondente pelo código
    const kitQuery = query(collection(db, 'nfc_kits'), where('codigoKit', '==', cleanCode), limit(1));
    const kitSnap = await getDocs(kitQuery);
    
    if (kitSnap.empty) {
      throw new Error('Código de kit inválido ou não encontrado.');
    }

    const kitDoc = kitSnap.docs[0];
    const kitData = kitDoc.data() as NfcKit;

    // 2. Verificar se o kit já está ativado
    if (kitData.status === 'Ativado') {
      throw new Error(`Este kit já foi ativado anteriormente pela empresa: ${kitData.empresaDestino || 'Outro laboratório'}.`);
    }

    // 3. Buscar todas as caixas associadas a esse kit
    const boxes = await KitService.getKitBoxes(kitDoc.id);
    const registeredBoxes = boxes.filter(b => b.uid);

    if (registeredBoxes.length === 0) {
      throw new Error('Este kit não possui nenhuma caixa com UID cadastrado e não pode ser ativado.');
    }

    // 4. Copiar as caixas registradas com UID para a subcoleção do laboratório
    // O caminho será: /organizations/{orgId}/nfcBoxes/{uid}
    const batch = writeBatch(db);
    
    registeredBoxes.forEach(box => {
      const formats = getNfcUidFormats(box.uid || '');
      const labBoxRef = doc(db, 'organizations', organizationId, 'nfcBoxes', box.uid);
      batch.set(labBoxRef, {
        uid: box.uid,
        uidHex: box.uidHex || formats.uidHex || box.uid,
        uidDecimal: box.uidDecimal || formats.uidDecimal || box.uid,
        numeroCaixa: box.numeroCaixa,
        textoGravado: box.textoGravado || `BOX-${box.numeroCaixa}`,
        status: 'Associada',
        activatedAt: new Date().toISOString(),
        kitCodigo: cleanCode,
        kitId: kitDoc.id
      });
    });

    // 5. Marcar o kit como Ativado no painel global
    const kitRef = doc(db, 'nfc_kits', kitDoc.id);
    batch.update(kitRef, {
      status: 'Ativado',
      empresaDestino: organizationName,
      updatedAt: new Date().toISOString(),
      activatedAt: new Date().toISOString(),
      activatedBy: userName,
      activatedByOrgId: organizationId
    });

    // Executar todas as gravações atômicas
    await batch.commit();
  }
};
