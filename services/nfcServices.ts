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
 * Utilitário para converter e gerenciar formatos de UID NFC entre leitores:
 * 1. LEITOR NOVO: UID hexadecimal canônico completo (ex: 0427DE7DC32A81 ou 5383CEB9950001)
 * 2. LEITOR ANTIGO: Decimal baseado nos primeiros 4 bytes com bytes invertidos (ex: 2111710980 ou 3117318995)
 */

/**
 * Converte o UID Hexadecimal canônico (Leitor Novo) para o formato Decimal (Leitor Antigo).
 * Pega os primeiros 4 bytes (8 caracteres hex), inverte a ordem dos bytes (Little-Endian)
 * e converte o resultado hexadecimal para decimal.
 * 
 * Exemplo:
 * 0427DE7DC32A81 -> 04 27 DE 7D -> 7D DE 27 04 -> 7DDE2704 -> 2111710980
 * 5383CEB9950001 -> 53 83 CE B9 -> B9 CE 83 53 -> B9CE8353 -> 3117318995
 */
export function convertCanonicalHexToOldReaderDecimal(hexStr: string): string {
  const clean = (hexStr || '').trim().toUpperCase().replace(/[^0-9A-F]/g, '');
  if (clean.length < 8) return '';
  const first4BytesHex = clean.substring(0, 8); // ex: "0427DE7D"
  const bytes = [
    first4BytesHex.substring(0, 2),
    first4BytesHex.substring(2, 4),
    first4BytesHex.substring(4, 6),
    first4BytesHex.substring(6, 8)
  ];
  const invertedHex = bytes.reverse().join(''); // ex: "7DDE2704"
  try {
    const bigVal = BigInt('0x' + invertedHex);
    return bigVal.toString(10); // ex: "2111710980"
  } catch {
    return '';
  }
}

/**
 * Converte o formato Decimal (Leitor Antigo) para o UID Hexadecimal (primeiros 4 bytes canônicos).
 * Converte o decimal em hex de 32 bits (8 chars), inverte os 4 bytes para obter o prefixo canônico.
 * 
 * Exemplo:
 * 2111710980 -> 7DDE2704 -> Inverte bytes: 04 27 DE 7D -> "0427DE7D"
 * 3117318995 -> B9CE8353 -> Inverte bytes: 53 83 CE B9 -> "5383CEB9"
 */
export function convertOldReaderDecimalToHex(decimalStr: string): {
  hex4Bytes: string;
  invertedHex: string;
  directHex: string;
} {
  const clean = (decimalStr || '').trim().replace(/[^0-9]/g, '');
  if (!clean) return { hex4Bytes: '', invertedHex: '', directHex: '' };
  try {
    const bigVal = BigInt(clean);
    // Converte para 8 caracteres hexadecimais (32 bits unsigned)
    const invertedHex = bigVal.toString(16).padStart(8, '0').toUpperCase(); // ex: "7DDE2704"
    const directHex = invertedHex; // para uso direto se não tiver sido invertido
    const bytes = [
      invertedHex.substring(0, 2),
      invertedHex.substring(2, 4),
      invertedHex.substring(4, 6),
      invertedHex.substring(6, 8)
    ];
    const hex4Bytes = bytes.reverse().join(''); // ex: "0427DE7D"
    return { hex4Bytes, invertedHex, directHex };
  } catch {
    return { hex4Bytes: '', invertedHex: '', directHex: '' };
  }
}

/**
 * Normaliza qualquer entrada de UID (do Leitor Novo ou do Leitor Antigo)
 * e gera todas as representações possíveis para armazenamento e busca.
 */
export function getNfcUidFormats(uidInput: string): {
  uid: string;
  uidHex: string;
  uidDecimal: string;
  uid4ByteHex: string;
  invertedHex: string;
  isOldReaderFormat: boolean;
  allCandidates: string[];
} {
  const raw = (uidInput || '').trim().toUpperCase().replace(/[:\s-]/g, '');
  if (!raw) {
    return {
      uid: '',
      uidHex: '',
      uidDecimal: '',
      uid4ByteHex: '',
      invertedHex: '',
      isOldReaderFormat: false,
      allCandidates: []
    };
  }

  const candidates = new Set<string>();
  candidates.add(raw);
  candidates.add(uidInput.trim().toUpperCase());
  
  // Adiciona a versão sem zeros à esquerda para tolerância
  const rawNoZeros = raw.replace(/^0+/, '');
  if (rawNoZeros) candidates.add(rawNoZeros);

  let uidHex = '';
  let uidDecimal = '';
  let uid4ByteHex = '';
  let invertedHex = '';
  let isOldReaderFormat = false;

  const isNumericOnly = /^\d+$/.test(raw);
  const isHexOnly = /^[0-9A-F]+$/i.test(raw);

  if (isNumericOnly) {
    try {
      const bigVal = BigInt(raw);
      candidates.add(bigVal.toString(10));
      
      // Se for um decimal de até 32 bits (<= 4294967295), é o formato do leitor antigo
      if (bigVal <= 4294967295n) {
        isOldReaderFormat = true;
        uidDecimal = raw;
        const converted = convertOldReaderDecimalToHex(raw);
        uid4ByteHex = converted.hex4Bytes;
        invertedHex = converted.invertedHex;
        uidHex = converted.hex4Bytes; // Prefixo canônico em hexadecimal

        candidates.add(uidDecimal);
        if (uid4ByteHex) candidates.add(uid4ByteHex);
        if (invertedHex) candidates.add(invertedHex);
        if (converted.directHex) candidates.add(converted.directHex);

        const pairs = uid4ByteHex.match(/.{1,2}/g) || [];
        if (pairs.length > 1) {
          candidates.add(pairs.join(':'));
        }
      } else {
        // Fallback para números decimais maiores
        uidDecimal = raw;
        let hex = bigVal.toString(16).toUpperCase();
        if (hex.length % 2 !== 0) hex = '0' + hex;
        uidHex = hex;
        candidates.add(hex);
        
        // Inverte os bytes se possível
        const pairs = hex.match(/.{1,2}/g) || [];
        if (pairs.length > 0) {
          candidates.add([...pairs].reverse().join(''));
        }
      }
    } catch {}
  } else if (isHexOnly) {
    uidHex = raw;
    candidates.add(uidHex);

    if (raw.length >= 8) {
      uid4ByteHex = raw.substring(0, 8);
      candidates.add(uid4ByteHex);
      uidDecimal = convertCanonicalHexToOldReaderDecimal(raw);
      if (uidDecimal) {
        candidates.add(uidDecimal);
      }
      
      // Tentativa direta
      try {
        const directDec = BigInt('0x' + uid4ByteHex).toString(10);
        candidates.add(directDec);
      } catch {}

      const bytes = [
        uid4ByteHex.substring(0, 2),
        uid4ByteHex.substring(2, 4),
        uid4ByteHex.substring(4, 6),
        uid4ByteHex.substring(6, 8)
      ];
      invertedHex = [...bytes].reverse().join('');
      if (invertedHex) {
        candidates.add(invertedHex);
      }
    }

    const pairs = raw.match(/.{1,2}/g) || [];
    if (pairs.length > 1) {
      candidates.add(pairs.join(':'));
    }
  }

  const canonicalUid = uidHex || raw;

  return {
    uid: canonicalUid,
    uidHex: canonicalUid,
    uidDecimal: uidDecimal || raw,
    uid4ByteHex: uid4ByteHex || canonicalUid.substring(0, 8),
    invertedHex: invertedHex,
    isOldReaderFormat,
    allCandidates: Array.from(candidates).filter(Boolean)
  };
}

/**
 * Função utilitária centralizada para encontrar uma caixa NFC a partir de qualquer entrada
 * (Leitor Novo Hexadecimal, Leitor Antigo Decimal, Número da Caixa ou Texto Gravado).
 */
export function findMatchingNfcBox(scannedCode: string, boxes: NfcBox[]): NfcBox | undefined {
  if (!scannedCode || !boxes || boxes.length === 0) return undefined;

  const rawUpper = scannedCode.trim().toUpperCase();
  const cleanInput = rawUpper.replace(/[:\s-]/g, '');
  const formats = getNfcUidFormats(cleanInput);

  // 1. Busca por correspondência exata de candidatos de UID
  for (const box of boxes) {
    const boxFormats = getNfcUidFormats(box.uid || '');
    const boxCandidates = new Set([
      box.uid,
      box.uidHex,
      box.uidDecimal,
      box.uid4ByteHex,
      ...boxFormats.allCandidates
    ].filter(Boolean).map(s => String(s).trim().toUpperCase().replace(/[:\s-]/g, '')));

    if (formats.allCandidates.some(c => boxCandidates.has(c))) {
      return box;
    }

    // 2. Busca por prefixo de 4 bytes (quando o leitor antigo envia os primeiros 4 bytes de uma tag de 7 bytes canônica)
    if (formats.uid4ByteHex && boxFormats.uidHex) {
      if (boxFormats.uidHex.startsWith(formats.uid4ByteHex) || formats.uidHex.startsWith(boxFormats.uid4ByteHex)) {
        return box;
      }
    }
    
    // 2.1 Verifica inversão
    if (formats.invertedHex && boxFormats.uidHex && boxFormats.uidHex.startsWith(formats.invertedHex)) {
      return box;
    }
  }

  // 3. Busca por número de caixa (ex: "001", "1", ou número direto)
  const cleanNumInput = cleanInput.replace(/^0+/, '');
  for (const box of boxes) {
    const cleanBoxNum = String(box.numeroCaixa || '').trim().toUpperCase().replace(/^0+/, '');
    if (cleanBoxNum && cleanBoxNum === cleanNumInput) {
      return box;
    }
    
    // 4. Busca por textoNfc amigável (ignorando traços e formatação)
    const cleanText = (box.textoGravado || '').trim().toUpperCase().replace(/[:\s-]/g, '');
    if (cleanText && (cleanText === cleanInput || cleanInput.includes(cleanText) || cleanText.includes(cleanInput))) {
      return box;
    }
    
    // Tratamento para digitar apenas o prefixo BOX
    if (cleanText.startsWith('BOX')) {
      const bNum = cleanText.replace('BOX', '').replace(/^0+/, '');
      if (bNum === cleanNumInput) {
         return box;
      }
    }
  }

  return undefined;
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
        
        await Nfc.startScanning();
        
        const handleNativeTag = (event: any) => {
          const tag = event.tag || event;
          let textValue = '';
          let uid = '';
          if (tag.id && Array.isArray(tag.id)) {
            uid = tag.id.map((b: number) => (b & 0xFF).toString(16).padStart(2, '0')).join('').toUpperCase();
          } else if (typeof tag.id === 'string') {
            uid = tag.id.replace(/:/g, '').toUpperCase();
          }
          
          const messages = tag.ndefMessage || tag.messages || [];
          if (Array.isArray(messages) && messages.length > 0) {
            for (const record of messages) {
              if (record.payload && Array.isArray(record.payload)) {
                try {
                  const bytes = record.payload;
                  const langLen = (bytes[0] || 0) & 0x3F;
                  if (bytes.length > 1 + langLen) {
                    textValue = String.fromCharCode(...bytes.slice(1 + langLen));
                  } else {
                    textValue = String.fromCharCode(...bytes);
                  }
                  if (textValue) break;
                } catch(e) {}
              }
            }
          }
          onScan(uid, textValue);
        };

        (Nfc as any).addListener('nfcEvent', handleNativeTag);
        (Nfc as any).addListener('tagDiscovered', handleNativeTag);
        (Nfc as any).addListener('ndefDiscovered', handleNativeTag);
        
        if (signal) {
          signal.addEventListener('abort', () => {
             try {
               Nfc.stopScanning();
               (Nfc as any).removeAllListeners();
             } catch(e){}
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
    const canonicalUid = formats.uidHex || box.uid;
    const boxRef = doc(db, 'nfc_kits', kitId, 'boxes', String(box.numeroCaixa));

    const kitRef = doc(db, 'nfc_kits', kitId);
    const kitSnap = await getDoc(kitRef);
    if (!kitSnap.exists()) {
        throw new Error('Kit não encontrado');
    }
    const kitData = kitSnap.data() as NfcKit;

    const oldBoxSnap = await getDoc(boxRef);
    const oldBoxData = oldBoxSnap.exists() ? oldBoxSnap.data() as NfcBox : null;

    const boxData = {
      ...box,
      uid: canonicalUid,
      uidHex: canonicalUid,
      uidDecimal: formats.uidDecimal || box.uidDecimal || '',
      uid4ByteHex: formats.uid4ByteHex || '',
      updatedAt: new Date().toISOString()
    };
    
    const batch = writeBatch(db);
    batch.set(boxRef, boxData, { merge: true });
    
    batch.update(kitRef, {
      updatedAt: new Date().toISOString()
    });

    if (kitData.status === 'Ativado' && kitData.activatedByOrgId) {
       const orgId = kitData.activatedByOrgId;
       
       if (oldBoxData && oldBoxData.uid && oldBoxData.uid !== canonicalUid) {
           const oldLabBoxRef = doc(db, 'organizations', orgId, 'nfcBoxes', oldBoxData.uid);
           batch.delete(oldLabBoxRef);
       }
       
       if (canonicalUid) {
           const newLabBoxRef = doc(db, 'organizations', orgId, 'nfcBoxes', canonicalUid);
           batch.set(newLabBoxRef, {
              uid: canonicalUid,
              uidHex: canonicalUid,
              uidDecimal: formats.uidDecimal || box.uidDecimal || '',
              uid4ByteHex: formats.uid4ByteHex || '',
              numeroCaixa: box.numeroCaixa,
              textoGravado: box.textoGravado || `BOX-${box.numeroCaixa}`,
              status: 'Associada',
              activatedAt: new Date().toISOString(),
              kitCodigo: kitData.codigoKit || '',
              kitId: kitId
           }, { merge: true });
       }
    }
    
    await batch.commit();
  },

  clearKitBox: async (kitId: string, boxNumber: string | number): Promise<void> => {
    const boxRef = doc(db, 'nfc_kits', kitId, 'boxes', String(boxNumber));
    const kitRef = doc(db, 'nfc_kits', kitId);
    
    const kitSnap = await getDoc(kitRef);
    if (!kitSnap.exists()) {
        throw new Error('Kit não encontrado');
    }
    const kitData = kitSnap.data() as NfcKit;
    
    const oldBoxSnap = await getDoc(boxRef);
    const oldBoxData = oldBoxSnap.exists() ? oldBoxSnap.data() as NfcBox : null;

    const batch = writeBatch(db);
    
    // Zera os dados NFC da caixa
    batch.update(boxRef, {
      uid: '',
      uidHex: '',
      uidDecimal: '',
      uid4ByteHex: '',
      updatedAt: new Date().toISOString()
    });
    
    batch.update(kitRef, {
      updatedAt: new Date().toISOString()
    });

    // Se o kit estiver ativado, também deleta a caixa do inventário do laboratório
    if (kitData.status === 'Ativado' && kitData.activatedByOrgId) {
       const orgId = kitData.activatedByOrgId;
       if (oldBoxData && oldBoxData.uid) {
           const oldLabBoxRef = doc(db, 'organizations', orgId, 'nfcBoxes', oldBoxData.uid);
           batch.delete(oldLabBoxRef);
       }
    }
    
    await batch.commit();
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
      const canonicalUid = formats.uidHex || box.uid;
      const labBoxRef = doc(db, 'organizations', organizationId, 'nfcBoxes', canonicalUid);
      batch.set(labBoxRef, {
        uid: canonicalUid,
        uidHex: canonicalUid,
        uidDecimal: formats.uidDecimal || box.uidDecimal || '',
        uid4ByteHex: formats.uid4ByteHex || '',
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
  },

  removeLabKit: async (codigoKit: string, organizationId: string): Promise<void> => {
    const cleanCode = codigoKit.trim().toUpperCase();
    if (!cleanCode) {
      throw new Error('Código do kit não informado.');
    }

    const kitQuery = query(collection(db, 'nfc_kits'), where('codigoKit', '==', cleanCode), limit(1));
    const kitSnap = await getDocs(kitQuery);
    
    if (kitSnap.empty) {
      throw new Error('Kit não encontrado no banco de dados central.');
    }

    const kitDoc = kitSnap.docs[0];
    const kitData = kitDoc.data() as NfcKit;

    if (kitData.activatedByOrgId !== organizationId) {
      throw new Error('Este kit não está ativado no seu laboratório.');
    }

    const batch = writeBatch(db);

    // 1. Delete all boxes mapped to this kit in the organization's nfcBoxes
    const orgBoxesQuery = query(
        collection(db, 'organizations', organizationId, 'nfcBoxes'),
        where('kitCodigo', '==', cleanCode)
    );
    const orgBoxesSnap = await getDocs(orgBoxesQuery);
    orgBoxesSnap.forEach(docSnap => {
        batch.delete(docSnap.ref);
    });

    // 2. Update the kit in global nfc_kits to be available again
    const kitRef = doc(db, 'nfc_kits', kitDoc.id);
    batch.update(kitRef, {
        status: 'Disponível', // Or 'Vendido' - changing to Disponível so it can be re-sold or reused
        empresaDestino: null,
        activatedAt: null,
        activatedBy: null,
        activatedByOrgId: null,
        updatedAt: new Date().toISOString()
    });

    await batch.commit();
  }
};
