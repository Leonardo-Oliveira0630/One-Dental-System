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
import { Capacitor } from '@capacitor/core';
import { CapacitorNfc as Nfc } from '@capgo/capacitor-nfc';

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
    } catch {}
  }

  return {
    uid: raw,
    uidHex: uidHex || raw,
    uidDecimal: uidDecimal || raw,
    allCandidates: Array.from(candidates).filter(Boolean)
  };
}

export const NfcReaderService = {
  startWebNfcScan: async (
    onScan: (uid: string, text?: string) => void,
    onError?: (err: any) => void,
    signal?: AbortSignal
  ): Promise<void> => {
    try {
      if (Capacitor.isNativePlatform()) {
        const isSupported = await Nfc.isSupported();
        if (!isSupported.supported) throw new Error('NFC não suportado.');
        
        await (Nfc as any).startScanSession();
        
        (Nfc as any).addListener('nfcTagScanned', (event: any) => {
          let textValue = '';
          const uid = event.id ? event.id.map((b: number) => b.toString(16).padStart(2, '0')).join('').toUpperCase() : '';
          
          if (event.messages && event.messages.length > 0) {
            for (const record of event.messages[0].records) {
              if (record.type && String.fromCharCode(...record.type) === 'T' && record.payload) {
                 textValue = String.fromCharCode(...record.payload).substring(3);
                 break;
              }
            }
          }
          onScan(uid, textValue);
        });
        
        if (signal) {
          signal.addEventListener('abort', () => {
             (Nfc as any).stopScanSession();
             (Nfc as any).removeAllListeners();
          });
        }
      } else {
        if (!('NDEFReader' in window)) {
          throw new Error('Web NFC não suportado.');
        }
        const ndef = new (window as any).NDEFReader();
        await ndef.scan({ signal });
        ndef.addEventListener("reading", ({ message, serialNumber }: any) => {
          let textValue = '';
          try {
            if (message && message.records) {
              for (const record of message.records) {
                if (record.recordType === "text" || (record.recordType === "mime" && record.mediaType === "text/plain")) {
                  const textDecoder = new TextDecoder(record.encoding || 'utf-8');
                  textValue = textDecoder.decode(record.data);
                  break;
                }
              }
            }
          } catch(e) {}
          onScan(serialNumber, textValue);
        });
      }
    } catch (err: any) {
      if (onError) onError(err);
      else throw err;
    }
  },
  setupUsbHidListener: (onScan: (uid: string) => void) => {
    let buffer = '';
    let lastKeyTime = Date.now();
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 50) buffer = '';
      lastKeyTime = currentTime;
      if (e.key === 'Enter' && buffer.length >= 4) {
        onScan(buffer.trim());
        buffer = '';
      } else if (e.key.length === 1) buffer += e.key;
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }
};

/**
 * Service 2: KitService
 * Gerenciamento de Kits NFC (Super Admin)
 */
export const KitService = {

  getKits: async (): Promise<NfcKit[]> => {
    const snapshot = await getDocs(collection(db, 'nfc_kits'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as NfcKit[];
  },

  createKit: async (data: { nome: string; descricao?: string; caixaInicial: number; caixaFinal: number }): Promise<NfcKit> => {
    const totalCaixas = (data.caixaFinal - data.caixaInicial) + 1;
    
    // Gerar código único de 6 caracteres (letras e números)
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let codigoKit = '';
    for (let i = 0; i < 6; i++) {
      codigoKit += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    const newKit: Partial<NfcKit> = {
      nome: data.nome,
      descricao: data.descricao || '',
      caixaInicial: data.caixaInicial,
      caixaFinal: data.caixaFinal,
      // removed: any,
      status: 'Disponível',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      codigoKit: codigoKit,
      empresaDestino: null
    };

    const docRef = await addDoc(collection(db, 'nfc_kits'), newKit);
    
    // Criar as subcoleções (as caixas)
    const batch = writeBatch(db);
    for (let i = data.caixaInicial; i <= data.caixaFinal; i++) {
      const boxRef = doc(db, 'nfc_kits', docRef.id, 'boxes', String(i));
      batch.set(boxRef, {
        numeroCaixa: i,
        uid: '',
        uidHex: '',
        uidDecimal: '',
        textoGravado: `BOX-${i}`,
        status: 'Pendente',
        updatedAt: new Date().toISOString()
      });
    }
    
    await batch.commit();

    return {
      id: docRef.id,
      ...newKit
    } as NfcKit;
  },

  getKitBoxes: async (kitId: string): Promise<NfcBox[]> => {
    const q = query(collection(db, 'nfc_kits', kitId, 'boxes'), orderBy('numeroCaixa', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as NfcBox[];
  },

  saveKitBox: async (kitId: string, box: NfcBox): Promise<void> => {
    const formats = getNfcUidFormats(box.uid || '');
    const boxRef = doc(db, 'nfc_kits', kitId, 'boxes', String(box.numeroCaixa));
    const boxData = {
      ...box,
      uidHex: box.uidHex || formats.uidHex || box.uid,
      uidDecimal: box.uidDecimal || formats.uidDecimal || box.uid,
      updatedAt: new Date().toISOString()
    };
    await setDoc(boxRef, boxData, { merge: true });

    const kitRef = doc(db, 'nfc_kits', kitId);
    await updateDoc(kitRef, {
      updatedAt: new Date().toISOString()
    });
  },

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

    const boxesSnap = await getDocs(collection(db, 'nfc_kits', kitId, 'boxes'));
    const batch = writeBatch(db);
    boxesSnap.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    batch.delete(kitRef);
    await batch.commit();
  },

  updateKitHeader: async (kitId: string, data: { nome: string; descricao?: string; status?: 'Disponível' | 'Vendido' | 'Ativado'; empresaDestino?: string | null }): Promise<void> => {
    const kitRef = doc(db, 'nfc_kits', kitId);
    await updateDoc(kitRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  },

  duplicateKit: async (kitId: string): Promise<NfcKit> => {
    const kitRef = doc(db, 'nfc_kits', kitId);
    const kitSnap = await getDoc(kitRef);
    if (!kitSnap.exists()) {
      throw new Error('Kit de origem não encontrado.');
    }
    const sourceKit = kitSnap.data() as NfcKit;
    
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
  checkUidDuplicate: async (uid: string, currentKitId?: string): Promise<{ duplicated: boolean; message?: string }> => {
    const formats = getNfcUidFormats(uid);
    if (!formats.uid) return { duplicated: false };
    const candidates = formats.allCandidates;

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
          const docKitId = pathParts[1];
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

    const kitQuery = query(collection(db, 'nfc_kits'), where('codigoKit', '==', cleanCode), limit(1));
    const kitSnap = await getDocs(kitQuery);
    
    if (kitSnap.empty) {
      throw new Error('Código de kit inválido ou não encontrado.');
    }

    const kitDoc = kitSnap.docs[0];
    const kitData = kitDoc.data() as NfcKit;

    if (kitData.status === 'Ativado') {
      throw new Error(`Este kit já foi ativado anteriormente pela empresa: ${kitData.empresaDestino || 'Outro laboratório'}.`);
    }

    const boxes = await KitService.getKitBoxes(kitDoc.id);
    const registeredBoxes = boxes.filter(b => b.uid);
    if (registeredBoxes.length === 0) {
      throw new Error('Este kit não possui nenhuma caixa com UID cadastrado e não pode ser ativado.');
    }

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

    const kitRef = doc(db, 'nfc_kits', kitDoc.id);
    batch.update(kitRef, {
      status: 'Ativado',
      empresaDestino: organizationName,
      updatedAt: new Date().toISOString(),
      activatedAt: new Date().toISOString(),
      activatedBy: userName,
      activatedByOrgId: organizationId
    });

    await batch.commit();
  }
};
