
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getCircularReplacer } from '../../utils/logger';
import { useApp } from '../../context/AppContext';
import { Receipt, User, ManualDentist, PermissionKey, UserRole } from '../../types';
import { 
  Plus, Search, FileText, Download, Printer, Trash2, Edit2, 
  ChevronLeft, ChevronRight, X, Save, AlertTriangle, User as UserIcon,
  Briefcase, DollarSign, MessageCircle, CreditCard, Landmark, Ticket,
  Stethoscope, Check, Settings, Sliders, BarChart3, Calendar
} from 'lucide-react';
import { db } from '../../services/firebaseConfig';
import { 
  collection, query, where, onSnapshot, addDoc, 
  updateDoc, deleteDoc, doc, Timestamp, orderBy,
  getDocFromServer, serverTimestamp
} from 'firebase/firestore';
import { auth } from '../../services/firebaseConfig';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { matchesSearchQuery, formatCurrencyBRL, formatNumberBRL, parseBrazilianCurrency, formatCurrencyInputMask } from '../../utils/stringUtils';

export const Receipts: React.FC = () => {
    const { t } = useTranslation();
    const { currentUser, currentOrg, allUsers, manualDentists, updateOrganization } = useApp();

    enum OperationType {
        CREATE = 'create',
        UPDATE = 'update',
        DELETE = 'delete',
        LIST = 'list',
        GET = 'get',
        WRITE = 'write',
    }

    interface FirestoreErrorInfo {
        error: string;
        operationType: OperationType;
        path: string | null;
        authInfo: {
            userId?: string | null;
            email?: string | null;
            emailVerified?: boolean | null;
            isAnonymous?: boolean | null;
            tenantId?: string | null;
            providerInfo?: {
                providerId?: string | null;
                email?: string | null;
            }[];
        }
    }

    const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
        const errInfo: FirestoreErrorInfo = {
            error: error instanceof Error ? error.message : String(error),
            authInfo: {
                userId: auth.currentUser?.uid,
                email: auth.currentUser?.email,
                emailVerified: auth.currentUser?.emailVerified,
                isAnonymous: auth.currentUser?.isAnonymous,
                tenantId: auth.currentUser?.tenantId,
                providerInfo: auth.currentUser?.providerData?.map((provider: any) => ({
                    providerId: provider.providerId,
                    email: provider.email,
                })) || []
            },
            operationType,
            path
        };
        console.error('Firestore Error: ', JSON.stringify(errInfo, getCircularReplacer()));
        throw new Error(JSON.stringify(errInfo, getCircularReplacer()));
    };

    const [receipts, setReceipts] = useState<Receipt[]>([]);
    
    const defaultReferentePresets = useMemo(() => [
        'Tratamento Ortodôntico',
        'Confecção de Prótese Dentária',
        'Alinhadores Estéticos',
        'Serviços de Laboratório de Prótese',
        'Tratamentos de Reabilitação Oral',
        'Coroas e Facetas em Dissilicato de Lítio (Emax)',
        'Protocolo de Brånemark sobre Implantes'
    ], []);

    const defaultMensagemPresets = useMemo(() => [
        'Agradecemos a parceria de sempre. Qualquer dúvida estamos à disposição.',
        'Recibo emitido referente aos trabalhos protéticos concluídos no período.',
        'Trabalhos confeccionados sob rígidos padrões de qualidade biocompatível.',
        'Garantia de 1 ano para falhas estruturais de laboratório.'
    ], []);

    const referentePresets = useMemo(() => {
        return currentOrg?.receiptSettings?.referentePresets && currentOrg.receiptSettings.referentePresets.length > 0
            ? currentOrg.receiptSettings.referentePresets
            : defaultReferentePresets;
    }, [currentOrg?.receiptSettings?.referentePresets, defaultReferentePresets]);

    const mensagemPresets = useMemo(() => {
        return currentOrg?.receiptSettings?.mensagemPresets && currentOrg.receiptSettings.mensagemPresets.length > 0
            ? currentOrg.receiptSettings.mensagemPresets
            : defaultMensagemPresets;
    }, [currentOrg?.receiptSettings?.mensagemPresets, defaultMensagemPresets]);

    const [showSettings, setShowSettings] = useState(false);
    const [newReferentePreset, setNewReferentePreset] = useState('');
    const [newMensagemPreset, setNewMensagemPreset] = useState('');
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    const handleAddReferentePreset = async () => {
        if (!newReferentePreset.trim() || !currentOrg) return;
        setIsSavingSettings(true);
        try {
            const currentList = currentOrg.receiptSettings?.referentePresets || defaultReferentePresets;
            const updated = [...currentList, newReferentePreset.trim()];
            await updateOrganization(currentOrg.id, {
                receiptSettings: {
                    ...currentOrg.receiptSettings,
                    referentePresets: updated
                }
            });
            setNewReferentePreset('');
        } catch (error) {
            console.error('Error adding referente preset:', error);
        } finally {
            setIsSavingSettings(false);
        }
    };

    const handleRemoveReferentePreset = async (index: number) => {
        if (!currentOrg) return;
        setIsSavingSettings(true);
        try {
            const currentList = currentOrg.receiptSettings?.referentePresets || defaultReferentePresets;
            const updated = currentList.filter((_, i) => i !== index);
            await updateOrganization(currentOrg.id, {
                receiptSettings: {
                    ...currentOrg.receiptSettings,
                    referentePresets: updated
                }
            });
        } catch (error) {
            console.error('Error removing referente preset:', error);
        } finally {
            setIsSavingSettings(false);
        }
    };

    const handleAddMensagemPreset = async () => {
        if (!newMensagemPreset.trim() || !currentOrg) return;
        setIsSavingSettings(true);
        try {
            const currentList = currentOrg.receiptSettings?.mensagemPresets || defaultMensagemPresets;
            const updated = [...currentList, newMensagemPreset.trim()];
            await updateOrganization(currentOrg.id, {
                receiptSettings: {
                    ...currentOrg.receiptSettings,
                    mensagemPresets: updated
                }
            });
            setNewMensagemPreset('');
        } catch (error) {
            console.error('Error adding mensagem preset:', error);
        } finally {
            setIsSavingSettings(false);
        }
    };

    const handleRemoveMensagemPreset = async (index: number) => {
        if (!currentOrg) return;
        setIsSavingSettings(true);
        try {
            const currentList = currentOrg.receiptSettings?.mensagemPresets || defaultMensagemPresets;
            const updated = currentList.filter((_, i) => i !== index);
            await updateOrganization(currentOrg.id, {
                receiptSettings: {
                    ...currentOrg.receiptSettings,
                    mensagemPresets: updated
                }
            });
        } catch (error) {
            console.error('Error removing mensagem preset:', error);
        } finally {
            setIsSavingSettings(false);
        }
    };

    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
    const [dentistSearch, setDentistSearch] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    // Form State
    const [formData, setFormData] = useState<Partial<Receipt>>({
        dtEmissao: new Date(),
        numero: '',
        clienteId: '',
        clienteName: '',
        cpfCnpj: '',
        emitidoComo: 'PF',
        titularRecibo: 'CLIENTE',
        nomeTitular: '',
        cpfCnpjTitular: '',
        referente: '',
        descricaoServico: '',
        mensagem: '',
        cheque: '',
        banco: '',
        impostos: '',
        valorBruto: 0,
        valorDesconto: 0,
        valorBrutoComDesconto: 0,
        valorLiquido: 0
    });
    const [valorBrutoStr, setValorBrutoStr] = useState('');
    const [valorDescontoStr, setValorDescontoStr] = useState('');
    const [showNumberConflictPopup, setShowNumberConflictPopup] = useState(false);
    const [suggestedReceiptNumber, setSuggestedReceiptNumber] = useState('');
    const [showReports, setShowReports] = useState(false);
    const [reportStartDate, setReportStartDate] = useState(() => {
        const now = new Date();
        return format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
    });
    const [reportEndDate, setReportEndDate] = useState(() => {
        const now = new Date();
        return format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd');
    });
    const [reportClientFilter, setReportClientFilter] = useState('');

    const dentists = useMemo(() => {
        const online = allUsers.filter(u => u.role === 'CLIENT').map(d => ({ ...d, type: 'ONLINE' }));
        const offline = (manualDentists || []).map(d => ({ ...d, type: 'OFFLINE' }));
        return [...online, ...offline];
    }, [allUsers, manualDentists]);

    const filteredDentistSuggestions = useMemo(() => {
        return dentists.filter(d => 
            matchesSearchQuery(
                dentistSearch,
                d.name,
                d.cpfCnpj,
                (d as any).clinicName,
                (d as any).email,
                (d as any).phone,
                (d as any).whatsapp
            )
        ).slice(0, 15);
    }, [dentists, dentistSearch]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const testConnection = async () => {
            try {
                await getDocFromServer(doc(db, 'test', 'connection'));
            } catch (error) {
                if (error instanceof Error && error.message.includes('the client is offline')) {
                    console.error("Please check your Firebase configuration.");
                }
            }
        };
        testConnection();
    }, []);

    useEffect(() => {
        if (!currentOrg?.id) return;

        const path = 'receipts';
        const q = query(
            collection(db, path),
            where('organizationId', '==', currentOrg.id)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(d => {
                const data = d.data();
                return {
                    ...data,
                    id: d.id,
                    dtEmissao: data.dtEmissao?.toDate(),
                    createdAt: data.createdAt?.toDate()
                } as Receipt;
            });
            
            // Sort locally by createdAt desc
            list.sort((a, b) => {
                const timeA = a.createdAt?.getTime() || 0;
                const timeB = b.createdAt?.getTime() || 0;
                return timeB - timeA;
            });

            setReceipts(list);
            setIsLoading(false);
            
            // Auto-generate next number if empty and recording new
            if (!formData.numero && !showForm) {
                setFormData(prev => ({ ...prev, numero: generateNextReceiptNumber(list) }));
            }
        }, (error) => {
            handleFirestoreError(error, OperationType.GET, path);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [currentOrg?.id]);

    const generateNextReceiptNumber = (list: Receipt[] = receipts) => {
        let max = 0;
        for (let i = 0; i < list.length; i++) {
            const numStr = String(list[i].numero || '').trim();
            if (!numStr) continue;
            const digits = numStr.replace(/\D/g, '');
            const num = parseInt(digits, 10);
            if (!isNaN(num) && num > max) {
                max = num;
            }
        }
        return (max + 1).toString().padStart(5, '0');
    };

    const findDuplicateReceipt = (candidate: string, list: Receipt[] = receipts) => {
        const cleanCandidate = String(candidate || '').trim();
        if (!cleanCandidate) return undefined;
        const isCandidateDigits = /^\d+$/.test(cleanCandidate);
        const candidateNum = isCandidateDigits ? parseInt(cleanCandidate, 10) : NaN;

        return list.find(r => {
            if (editingReceipt && r.id === editingReceipt.id) return false;
            const rNumStr = String(r.numero || '').trim();
            if (!rNumStr) return false;
            if (rNumStr.toLowerCase() === cleanCandidate.toLowerCase()) return true;
            if (isCandidateDigits && /^\d+$/.test(rNumStr)) {
                return parseInt(rNumStr, 10) === candidateNum;
            }
            return false;
        });
    };

    const handleReceiptNumberBlur = () => {
        const cleanNum = String(formData.numero || '').trim();
        if (!cleanNum) {
            setFormData(prev => ({ ...prev, numero: generateNextReceiptNumber() }));
            return;
        }
        const duplicate = findDuplicateReceipt(cleanNum);
        if (duplicate) {
            setSuggestedReceiptNumber(generateNextReceiptNumber());
            setShowNumberConflictPopup(true);
        }
    };

    const handleSelectDentist = (dentist: any) => {
        const isPJ = (dentist.cpfCnpj?.replace(/\D/g, '').length || 0) > 11;
        setFormData(prev => ({
            ...prev,
            clienteId: dentist.id,
            clienteName: dentist.name,
            cpfCnpj: dentist.cpfCnpj || '',
            nomeTitular: dentist.name,
            cpfCnpjTitular: dentist.cpfCnpj || '',
            emitidoComo: isPJ ? 'PJ' : 'PF'
        }));
        setDentistSearch(dentist.name);
        setShowSuggestions(false);
    };

    const calculateTotals = () => {
        const bruto = Number(formData.valorBruto) || 0;
        const desc = Number(formData.valorDesconto) || 0;
        const brutoComDesc = bruto - desc;
        const liq = brutoComDesc; // Simplistic, could include taxes logic if mapping impostos
        
        setFormData(prev => ({
            ...prev,
            valorBrutoComDesconto: brutoComDesc,
            valorLiquido: liq
        }));
    };

    useEffect(() => {
        calculateTotals();
    }, [formData.valorBruto, formData.valorDesconto]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentOrg?.id || !currentUser?.id) return;

        let finalNumero = String(formData.numero || '').trim();
        if (!finalNumero) {
            finalNumero = generateNextReceiptNumber();
            setFormData(prev => ({ ...prev, numero: finalNumero }));
        } else {
            const duplicate = findDuplicateReceipt(finalNumero);
            if (duplicate) {
                setSuggestedReceiptNumber(generateNextReceiptNumber());
                setShowNumberConflictPopup(true);
                return;
            }
        }

        try {
            const dataToSave = {
                ...formData,
                numero: finalNumero,
                organizationId: currentOrg.id,
                createdBy: currentUser.id,
                createdAt: editingReceipt ? editingReceipt.createdAt : serverTimestamp(),
                dtEmissao: Timestamp.fromDate(formData.dtEmissao || new Date())
            };

            const path = 'receipts';
            if (editingReceipt) {
                await updateDoc(doc(db, path, editingReceipt.id), dataToSave);
            } else {
                await addDoc(collection(db, path), dataToSave);
            }

            setShowForm(false);
            setEditingReceipt(null);
            setDentistSearch('');
            resetForm();
        } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, 'receipts');
        }
    };

    const resetForm = () => {
        setDentistSearch('');
        setValorBrutoStr('');
        setValorDescontoStr('');
        const nextNum = generateNextReceiptNumber();
        setFormData({
            dtEmissao: new Date(),
            numero: nextNum,
            clienteId: '',
            clienteName: '',
            cpfCnpj: '',
            emitidoComo: 'PF',
            titularRecibo: 'CLIENTE',
            nomeTitular: '',
            cpfCnpjTitular: '',
            referente: '',
            descricaoServico: '',
            mensagem: '',
            cheque: '',
            banco: '',
            impostos: '',
            valorBruto: 0,
            valorDesconto: 0,
            valorBrutoComDesconto: 0,
            valorLiquido: 0
        });
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm(t('receipts.confirmDelete', "Deseja realmente excluir este recibo?"))) return;
        const path = 'receipts';
        try {
            await deleteDoc(doc(db, path, id));
        } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, path);
        }
    };

    const numberToWordsPortuguese = (n: number) => {
        const units = ["", "UM", "DOIS", "TRÊS", "QUATRO", "CINCO", "SEIS", "SETE", "OITO", "NOVE"];
        const teens = ["DEZ", "ONZE", "DOZE", "TREZE", "QUATORZE", "QUINZE", "DEZESSEIS", "DEZESSETE", "DEZOITO", "DEZENOVE"];
        const tens = ["", "", "VINTE", "TRINTA", "QUARENTA", "CINQUENTA", "SESSENTA", "SETENTA", "OITENTA", "NOVENTA"];
        const hundredsLabels = ["", "CEM", "DUZENTOS", "TREZENTOS", "QUATROCENTOS", "QUINHENTOS", "SEISCENTOS", "SETECENTOS", "OITOCENTOS", "NOVECENTOS"];

        const getHundreds = (num: number) => {
            if (num === 0) return "";
            if (num === 100) return "CEM";
            let res = "";
            const h = Math.floor(num / 100);
            const remainder = num % 100;
            if (h > 0) {
                res += (h === 1 && remainder > 0 ? "CENTO" : hundredsLabels[h]);
            }
            if (remainder > 0) {
                if (res !== "") res += " E ";
                if (remainder < 10) res += units[remainder];
                else if (remainder < 20) res += teens[remainder - 10];
                else {
                    res += tens[Math.floor(remainder / 10)];
                    if (remainder % 10 > 0) res += " E " + units[remainder % 10];
                }
            }
            return res;
        };

        if (n === 0) return "ZERO REAIS";
        
        let integerPart = Math.floor(n);
        const decimalPart = Math.round((n - integerPart) * 100);
        
        let result = "";
        
        if (integerPart >= 1000000) {
            const milhoes = Math.floor(integerPart / 1000000);
            result += getHundreds(milhoes) + (milhoes === 1 ? " MILHÃO" : " MILHÕES");
            integerPart %= 1000000;
            if (integerPart > 0) result += " E ";
        }
        
        if (integerPart >= 1000) {
            const mil = Math.floor(integerPart / 1000);
            result += (mil === 1 ? "UM MIL" : getHundreds(mil) + " MIL");
            integerPart %= 1000;
            if (integerPart > 0) result += " E ";
        }
        
        if (integerPart > 0) {
            result += getHundreds(integerPart);
        }

        if (Math.floor(n) > 0) {
            result += (Math.floor(n) === 1 ? " REAL" : " REAIS");
        }

        if (decimalPart > 0) {
            if (result !== "") result += " E ";
            if (decimalPart < 10) result += units[decimalPart];
            else if (decimalPart < 20) result += teens[decimalPart - 10];
            else {
                result += tens[Math.floor(decimalPart / 10)];
                if (decimalPart % 10 > 0) result += " E " + units[decimalPart % 10];
            }
            result += (decimalPart === 1 ? " CENTAVO" : " CENTAVOS");
        }

        return result;
    };

    const generatePDF = (receipt: Receipt) => {
        const doc = new jsPDF();
        
        // Header "Recibo" at top right
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.text("Recibo", 190, 25, { align: 'right' });
        
        // Recibo Nº
        doc.setFontSize(12);
        doc.text(`Recibo N°: `, 20, 50);
        doc.text(`${receipt.numero}`, 45, 50);
        
        // Values Table (Right Aligned) - Moved slightly to avoid overlap
        const tableX = 150;
        const tableY = 60;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text("Bruto:", tableX, tableY);
        doc.text("Desconto:", tableX, tableY + 8);
        doc.setFont("helvetica", "bold");
        doc.text("Líquido:", tableX, tableY + 18); // Added more space for liquid value

        doc.setFont("helvetica", "bold");
        doc.text(formatNumberBRL(receipt.valorBruto), 190, tableY, { align: 'right' });
        doc.text(formatNumberBRL(receipt.valorDesconto), 190, tableY + 8, { align: 'right' });
        doc.setFontSize(12);
        doc.text(formatCurrencyBRL(receipt.valorLiquido), 190, tableY + 18, { align: 'right' });
        
        // Recibo body content with safe maxWidth
        const safeMaxWidth = 120; // Reduced to avoid hitting the values table
        
        // Recebemos de
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text("Recebemos de ", 20, 65);
        doc.setFont("helvetica", "bold");
        doc.text(`${receipt.clienteName} CPF/CNPJ: ${receipt.cpfCnpj}`, 50, 65, { maxWidth: safeMaxWidth - 30 });
        
        // A quantia de
        doc.setFont("helvetica", "normal");
        doc.text("a quantia de ", 20, 80); // Increased spacing from previous line
        doc.setFont("helvetica", "bold");
        const extenso = numberToWordsPortuguese(receipt.valorLiquido);
        doc.text(extenso, 45, 80, { maxWidth: safeMaxWidth - 25 });
        
        // Referente a
        doc.setFont("helvetica", "normal");
        // Calculate dynamic spacing based on length of amount in words
        const extensoLines = doc.splitTextToSize(extenso, safeMaxWidth - 25).length;
        const referenteY = 80 + (extensoLines * 6);
        const referenteText = (receipt.referente || '').toUpperCase();
        
        doc.text("referente a ", 20, referenteY);
        doc.setFont("helvetica", "bold");
        doc.text(referenteText, 43, referenteY, { maxWidth: safeMaxWidth - 23 });

        const referenteLines = Math.max(1, doc.splitTextToSize(referenteText, safeMaxWidth - 23).length);
        const referenteEndY = referenteY + ((referenteLines - 1) * 5);

        // City and Date (15 units below "Referente a")
        const city = currentOrg?.city || "Vitória";
        const dateStr = format(receipt.dtEmissao || new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
        const cityDateY = referenteEndY + 15;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(`${city}, ${dateStr}`, 190, cityDateY, { align: 'right' });
        
        // Signature Line (15 units below City/Date)
        const signatureLineY = cityDateY + 15;
        doc.setDrawColor(200, 200, 200);
        doc.line(110, signatureLineY, 190, signatureLineY);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        
        // Use Technical Responsible if available
        const signatureName = currentOrg?.financialSettings?.techResponsibleName || currentOrg?.name || currentUser?.name || "";
        const signatureDoc = currentOrg?.financialSettings?.techResponsibleCpf || currentOrg?.financialSettings?.businessData?.cnpj || currentOrg?.financialSettings?.businessData?.cpf || "";
        const isRT = !!currentOrg?.financialSettings?.techResponsibleName;
        
        doc.text(signatureName, 150, signatureLineY + 5, { align: 'center' });
        if (signatureDoc) {
            doc.text(`${isRT ? 'CPF:' : ''} ${signatureDoc}`, 150, signatureLineY + 10, { align: 'center' });
        }
        
        doc.save(`Recibo_${receipt.numero}_${receipt.clienteName}.pdf`);
    };

    const getClientPersonType = (receipt: Receipt): 'Física' | 'Jurídica' => {
        const digits = (receipt.cpfCnpj || '').replace(/\D/g, '');
        if (digits.length > 11) return 'Jurídica';
        if (digits.length > 0 && digits.length <= 11) return 'Física';
        return receipt.emitidoComo === 'PJ' ? 'Jurídica' : 'Física';
    };

    const getEmitterPersonType = (receipt: Receipt): 'Física' | 'Jurídica' => {
        if (receipt.emitidoComo === 'PJ') return 'Jurídica';
        if (receipt.emitidoComo === 'PF') return 'Física';
        const orgDocDigits = (
            currentOrg?.financialSettings?.techResponsibleCpf ||
            currentOrg?.financialSettings?.businessData?.cpf ||
            currentOrg?.financialSettings?.businessData?.cnpj ||
            currentOrg?.cpfCnpj ||
            ''
        ).replace(/\D/g, '');
        return orgDocDigits.length > 11 ? 'Jurídica' : 'Física';
    };

    const reportClientOptions = useMemo(() => {
        const map = new Map<string, string>();
        receipts.forEach(r => {
            const name = (r.clienteName || '').trim();
            if (!name) return;
            const key = (r.clienteId || name).trim();
            if (!map.has(key)) map.set(key, name);
        });
        dentists.forEach(d => {
            const name = (d.name || '').trim();
            if (!name) return;
            const key = (d.id || name).trim();
            if (!map.has(key)) map.set(key, name);
        });
        return Array.from(map.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    }, [receipts, dentists]);

    const reportReceipts = useMemo(() => {
        let startBound: Date | null = null;
        let endBound: Date | null = null;

        if (reportStartDate) {
            const [y, m, d] = reportStartDate.split('-').map(Number);
            if (y && m && d) startBound = new Date(y, m - 1, d, 0, 0, 0, 0);
        }
        if (reportEndDate) {
            const [y, m, d] = reportEndDate.split('-').map(Number);
            if (y && m && d) endBound = new Date(y, m - 1, d, 23, 59, 59, 999);
        }

        const selectedOption = reportClientOptions.find(opt => opt.id === reportClientFilter);

        return receipts
            .filter(r => {
                const emission = r.dtEmissao ? new Date(r.dtEmissao) : null;
                if (startBound && (!emission || emission < startBound)) return false;
                if (endBound && (!emission || emission > endBound)) return false;

                if (reportClientFilter) {
                    const matchId = r.clienteId && r.clienteId === reportClientFilter;
                    const matchName = selectedOption && (r.clienteName || '').trim().toLowerCase() === selectedOption.name.toLowerCase();
                    if (!matchId && !matchName) return false;
                }
                return true;
            })
            .sort((a, b) => String(a.numero || '').localeCompare(String(b.numero || ''), undefined, { numeric: true }));
    }, [receipts, reportStartDate, reportEndDate, reportClientFilter, reportClientOptions]);

    const reportTotals = useMemo(() => {
        return reportReceipts.reduce((acc, r) => {
            const bruto = Number(r.valorBruto) || 0;
            const liquido = Number(r.valorLiquido) || 0;
            const personType = getClientPersonType(r);
            acc.totalBruto += bruto;
            acc.totalLiquido += liquido;
            if (personType === 'Física') {
                acc.totalPessoaFisica += liquido;
            } else {
                acc.totalPessoaJuridica += liquido;
            }
            return acc;
        }, {
            totalBruto: 0,
            totalLiquido: 0,
            totalPessoaFisica: 0,
            totalPessoaJuridica: 0
        });
    }, [reportReceipts, currentOrg]);

    const generateReportPDF = () => {
        const doc = new jsPDF();

        // Title at top right (matching reference report)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text("Recibos", 196, 20, { align: 'right' });

        // Period subtitle at right
        const formatInputDate = (val: string) => {
            if (!val) return '';
            const [y, m, d] = val.split('-').map(Number);
            if (!y || !m || !d) return val;
            return format(new Date(y, m - 1, d, 12, 0, 0), 'dd/MM/yyyy');
        };
        const periodLabel = reportStartDate && reportEndDate
            ? `${formatInputDate(reportStartDate)} a ${formatInputDate(reportEndDate)}`
            : reportStartDate
                ? `A partir de ${formatInputDate(reportStartDate)}`
                : reportEndDate
                    ? `Até ${formatInputDate(reportEndDate)}`
                    : 'Todos os períodos';

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        doc.text(periodLabel, 196, 33, { align: 'right' });

        if (reportClientFilter) {
            const clientObj = reportClientOptions.find(c => c.id === reportClientFilter);
            if (clientObj) {
                doc.text(`Cliente: ${clientObj.name}`, 14, 33);
            }
        }

        doc.setDrawColor(180, 180, 180);
        doc.line(14, 37, 196, 37);

        const bodyRows = reportReceipts.map(r => [
            r.numero || '',
            r.clienteName || '',
            r.cpfCnpj || '',
            r.dtEmissao ? format(new Date(r.dtEmissao), 'dd/MM/yyyy') : '',
            formatNumberBRL(r.valorBruto),
            formatNumberBRL(r.valorLiquido),
            getClientPersonType(r)
        ]);

        autoTable(doc, {
            startY: 41,
            margin: { left: 14, right: 14 },
            head: [['Número', 'Cliente', 'CPF/CNPJ', 'Emissão', 'Bruto', 'Líquido', 'Tipo']],
            body: bodyRows,
            theme: 'striped',
            headStyles: {
                fillColor: [229, 231, 235],
                textColor: [17, 24, 39],
                fontStyle: 'bold',
                fontSize: 8,
                cellPadding: 2.5,
                lineWidth: 0
            },
            bodyStyles: {
                fontSize: 8,
                textColor: [31, 41, 55],
                cellPadding: 2.2
            },
            alternateRowStyles: {
                fillColor: [243, 244, 246]
            },
            columnStyles: {
                0: { cellWidth: 16 },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 28 },
                3: { cellWidth: 22, halign: 'center' },
                4: { cellWidth: 22, halign: 'right' },
                5: { cellWidth: 22, halign: 'right' },
                6: { cellWidth: 18, halign: 'center' }
            }
        });

        let finalY = ((doc as any).lastAutoTable?.finalY || 45) + 4;
        doc.setDrawColor(180, 180, 180);
        doc.line(14, finalY, 196, finalY);

        if (finalY + 32 > 285) {
            doc.addPage();
            finalY = 20;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(17, 24, 39);
        doc.text(`Total Líquido: ${formatNumberBRL(reportTotals.totalLiquido)}`, 196, finalY + 8, { align: 'right' });
        doc.text(`Total geral bruto: ${formatNumberBRL(reportTotals.totalBruto)}`, 196, finalY + 14, { align: 'right' });
        doc.text(`Total pessoa física (F): ${formatNumberBRL(reportTotals.totalPessoaFisica)}`, 196, finalY + 20, { align: 'right' });
        doc.text(`Total pessoa jurídica (J): ${formatNumberBRL(reportTotals.totalPessoaJuridica)}`, 196, finalY + 26, { align: 'right' });

        doc.save(`Relatorio_Recibos_${reportStartDate || 'inicio'}_a_${reportEndDate || 'fim'}.pdf`);
    };

    const filteredReceipts = receipts.filter(r => 
        r.clienteName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.numero?.includes(searchTerm) ||
        r.referente?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const canView = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN' || currentUser?.permissions?.includes('receipts:view') || currentUser?.permissions?.includes('receipts:edit');
    const canManage = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN' || currentUser?.permissions?.includes('receipts:edit');

    if (!canView && !isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="p-4 bg-red-50 text-red-600 rounded-3xl mb-4">
                    <AlertTriangle size={48} />
                </div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{t('common.accessDenied', 'Acesso Negado')}</h2>
                <p className="text-slate-500 font-bold max-w-md mx-auto mt-2">{t('common.noPermission', 'Você não tem permissão para visualizar os recibos financeiros. Entre em contato com o administrador.')}</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
            {showNumberConflictPopup && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle size={32} className="text-red-600" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 text-center mb-2">
                            {t('receipts.numberInUse', 'Número de Recibo em uso')}
                        </h2>
                        <p className="text-sm font-bold text-slate-500 text-center mb-6">
                            {t('receipts.numberConflictMessage', {
                                defaultValue: 'Já existe um recibo cadastrado com o número {{numero}}. Deseja prosseguir com o próximo número válido ({{suggested}})?',
                                numero: formData.numero,
                                suggested: suggestedReceiptNumber
                            })}
                        </p>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowNumberConflictPopup(false)}
                                className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors uppercase tracking-widest text-xs"
                            >
                                {t('common.cancel', 'Cancelar')}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setFormData(prev => ({ ...prev, numero: suggestedReceiptNumber }));
                                    setShowNumberConflictPopup(false);
                                }}
                                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors uppercase tracking-widest text-xs"
                            >
                                {t('receipts.useSuggested', { defaultValue: 'Usar {{number}}', number: suggestedReceiptNumber })}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{t('receipts.title', 'Recibos Financeiros')}</h1>
                    <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">{t('receipts.subtitle', 'Gerenciamento e Emissão de Comprovantes')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => { setShowReports(!showReports); setShowForm(false); setShowSettings(false); }}
                        className={`flex items-center gap-2 px-5 py-3 border rounded-2xl font-black uppercase text-xs transition-all cursor-pointer ${
                            showReports
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                        }`}
                    >
                        <BarChart3 size={16} className={showReports ? 'text-white' : 'text-slate-500'} /> {t('receipts.reports', 'Relatórios')}
                    </button>
                    {canManage && (
                        <>
                            <button 
                                onClick={() => { setShowSettings(!showSettings); setShowForm(false); setShowReports(false); }}
                                className="flex items-center gap-2 px-5 py-3 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 rounded-2xl font-black uppercase text-xs transition-all cursor-pointer"
                            >
                                <Sliders size={16} className="text-slate-500" /> {t('receipts.settings', 'Configurar Pré-setados')}
                            </button>
                            <button 
                                onClick={() => { resetForm(); setEditingReceipt(null); setShowForm(true); setShowSettings(false); setShowReports(false); }}
                                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all cursor-pointer"
                            >
                                <Plus size={18} /> {t('receipts.newReceipt', 'Novo Recibo')}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {showSettings && (
                <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden animate-in slide-in-from-top-4 p-4 sm:p-6 space-y-6">
                    <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                        <div>
                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <Settings size={18} className="text-blue-600" /> {t('receipts.settings', 'Configuração de Mensagens Pré-setadas')}
                            </h2>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">{t('receipts.presetsSubtitle', 'Cadastre frases frequentes para agilizar o preenchimento')}</p>
                        </div>
                        <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"><X size={24}/></button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:p-6">
                        {/* Referente a Presets */}
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                            <h3 className="text-xs font-black text-blue-600 uppercase tracking-wider flex items-center gap-2">
                                <FileText size={14} /> {t('receipts.presetsReferente', 'Campo "Referente a"')}
                            </h3>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={newReferentePreset}
                                    onChange={e => setNewReferentePreset(e.target.value)}
                                    placeholder={t('receipts.presetPlaceholderReferente', 'Ex: Confecção de Prótese Total Superior')}
                                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500"
                                />
                                <button 
                                    onClick={handleAddReferentePreset}
                                    disabled={isSavingSettings || !newReferentePreset.trim()}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                                >
                                    {t('receipts.save', 'Salvar')}
                                </button>
                            </div>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                {referentePresets.map((preset, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-2 bg-white border border-slate-100 rounded-xl hover:bg-slate-100/50 transition-colors group">
                                        <span className="text-xs text-slate-700 font-medium truncate max-w-[85%]">{preset}</span>
                                        <button 
                                            onClick={() => handleRemoveReferentePreset(idx)}
                                            disabled={isSavingSettings}
                                            className="p-1 text-slate-300 hover:text-red-500 disabled:opacity-50 transition-colors cursor-pointer"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Mensagem Presets */}
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                            <h3 className="text-xs font-black text-indigo-600 uppercase tracking-wider flex items-center gap-2">
                                <MessageCircle size={14} /> {t('receipts.presetsMensagem', 'Campo "Mensagem / Observações"')}
                            </h3>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={newMensagemPreset}
                                    onChange={e => setNewMensagemPreset(e.target.value)}
                                    placeholder={t('receipts.presetPlaceholderMensagem', 'Ex: Agradecemos a preferência e parceria!')}
                                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500"
                                />
                                <button 
                                    onClick={handleAddMensagemPreset}
                                    disabled={isSavingSettings || !newMensagemPreset.trim()}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                                >
                                    {t('receipts.save', 'Salvar')}
                                </button>
                            </div>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                {mensagemPresets.map((preset, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-2 bg-white border border-slate-100 rounded-xl hover:bg-slate-100/50 transition-colors group">
                                        <span className="text-xs text-slate-700 font-medium truncate max-w-[85%]">{preset}</span>
                                        <button 
                                            onClick={() => handleRemoveMensagemPreset(idx)}
                                            disabled={isSavingSettings}
                                            className="p-1 text-slate-300 hover:text-red-500 disabled:opacity-50 transition-colors cursor-pointer"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showForm ? (
                <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                        <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            <FileText size={18} className="text-blue-600" /> {editingReceipt ? t('receipts.editReceipt', 'Editar Recibo') : t('receipts.newReceipt', 'Dados do Recibo')}
                        </h2>
                        <button onClick={() => { setShowForm(false); setEditingReceipt(null); }} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24}/></button>
                    </div>

                    <form onSubmit={handleSubmit} className="px-4 pb-4 sm:px-6 sm:pb-6 space-y-8">
                        {/* Seção Dados do Recibo */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                <UserIcon size={12}/> {t('receipts.identificationAndDates', 'Identificação e Datas')}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">{t('receipts.date', 'Dt. Emissão')}</label>
                                    <input 
                                        type="date" 
                                        value={formData.dtEmissao && !isNaN(new Date(formData.dtEmissao).getTime()) ? format(new Date(formData.dtEmissao), 'yyyy-MM-dd') : ''}
                                        onChange={e => {
                                            if (!e.target.value) return;
                                            const [year, month, day] = e.target.value.split('-').map(Number);
                                            if (year && month && day) {
                                                setFormData(prev => ({...prev, dtEmissao: new Date(year, month - 1, day, 12, 0, 0)}));
                                            }
                                        }}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">{t('receipts.receiptNumber', 'Número')}</label>
                                    <input 
                                        type="text" 
                                        value={formData.numero}
                                        onChange={e => setFormData({...formData, numero: e.target.value})}
                                        onBlur={handleReceiptNumberBlur}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500"
                                        placeholder="000000"
                                    />
                                </div>
                                <div className="md:col-span-2 relative" ref={dropdownRef}>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">{t('receipts.client', 'Cliente (Dentista)')}</label>
                                    <div className="relative group/dentist">
                                        <div className="absolute left-3 top-3.5 text-slate-400 group-focus-within/dentist:text-blue-500 transition-colors pointer-events-none">
                                            <Search size={16}/>
                                        </div>
                                        <input 
                                            type="text" 
                                            value={dentistSearch}
                                            onChange={e => {
                                                setDentistSearch(e.target.value);
                                                setShowSuggestions(true);
                                            }}
                                            onFocus={() => setShowSuggestions(true)}
                                            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500 transition-all"
                                            placeholder={t('receipts.searchDentistPlaceholder', 'Selecione ou digite o nome do dentista...')}
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setShowSuggestions(!showSuggestions)}
                                            className="absolute right-3 top-3 text-slate-400 hover:text-blue-500 transition-colors"
                                        >
                                            <ChevronLeft size={18} className={`transform transition-transform ${showSuggestions ? 'rotate-90' : '-rotate-90'}`} />
                                        </button>
                                        
                                        {showSuggestions && (
                                            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                                                {filteredDentistSuggestions.length > 0 ? (
                                                    filteredDentistSuggestions.map(d => (
                                                        <button
                                                            key={d.id}
                                                            type="button"
                                                            onClick={() => handleSelectDentist(d)}
                                                            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0 group/item"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className={`p-2 ${d.type === 'ONLINE' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'} rounded-lg group-hover/item:scale-110 transition-transform`}>
                                                                    <Stethoscope size={14}/>
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <p className="text-xs font-black text-slate-800 uppercase">{d.name}</p>
                                                                        {d.type === 'OFFLINE' && <span className="text-[8px] font-black bg-emerald-50 text-emerald-600 px-1 rounded">OFFLINE</span>}
                                                                    </div>
                                                                    <p className="text-[10px] text-slate-400 font-bold">
                                                                        {d.cpfCnpj || (d as any).clinicName || 'Sem documento'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            {formData.clienteId === d.id && <Check size={16} className="text-blue-600" />}
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="px-4 py-6 text-center">
                                                        <p className="text-xs font-bold text-slate-400">{t('receipts.noDentistFound', 'Nenhum dentista encontrado')}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">{t('receipts.personType', 'Tipo Pessoa')}</label>
                                    <select 
                                        value={formData.emitidoComo} 
                                        onChange={e => setFormData({...formData, emitidoComo: e.target.value as 'PF' | 'PJ'})}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="PF">{t('receipts.pf', 'Pessoa Física')}</option>
                                        <option value="PJ">{t('receipts.pj', 'Pessoa Jurídica')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">{t('receipts.cpfCnpj', 'CPF/CNPJ')}</label>
                                    <input 
                                        type="text" 
                                        value={formData.cpfCnpj} 
                                        onChange={e => setFormData({...formData, cpfCnpj: e.target.value})}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500"
                                        placeholder="000.000.000-00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">{t('receipts.holder', 'Titular do Recibo')}</label>
                                    <select 
                                        value={formData.titularRecibo} 
                                        onChange={e => setFormData({...formData, titularRecibo: e.target.value})}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="CLIENTE">{t('receipts.ownClient', 'Próprio Cliente')}</option>
                                        <option value="OUTRO">{t('receipts.otherSpecify', 'Outro (Especificar)')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">{t('receipts.company', 'Empresa')}</label>
                                    <input 
                                        type="text" 
                                        value={formData.nomeTitular}
                                        onChange={e => setFormData({...formData, nomeTitular: e.target.value})}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500"
                                        placeholder={t('receipts.companyPlaceholder', 'Clínica / Nome Fantasia')}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Seção Dados do Serviço */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Briefcase size={12}/> {t('receipts.serviceInfo', 'Informações do Serviço')}
                            </h3>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1 flex justify-between items-center">
                                    <span>{t('receipts.referringTo', 'Referente a')}</span>
                                    {referentePresets.length > 0 && (
                                        <select 
                                            onChange={e => {
                                                if (e.target.value) {
                                                    setFormData(prev => ({ ...prev, referente: e.target.value }));
                                                    e.target.value = ''; // Reset select
                                                }
                                            }}
                                            className="text-[9px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 outline-none max-w-[200px]"
                                        >
                                            <option value="">{t('receipts.usePreset', 'Usar Pré-setado...')}</option>
                                            {referentePresets.map((preset, idx) => (
                                                <option key={idx} value={preset}>{preset}</option>
                                            ))}
                                        </select>
                                    )}
                                </label>
                                <input 
                                    type="text" 
                                    value={formData.referente}
                                    onChange={e => setFormData({...formData, referente: e.target.value})}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500"
                                    placeholder={t('receipts.referringToPlaceholder', 'Ex: Pagamento de fatura Abril/2024')}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">{t('receipts.detailedDescription', 'Descrição Detalhada')}</label>
                                <textarea 
                                    rows={3}
                                    value={formData.descricaoServico}
                                    onChange={e => setFormData({...formData, descricaoServico: e.target.value})}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-medium focus:ring-2 focus:ring-blue-500 resize-none"
                                    placeholder={t('receipts.detailedDescriptionPlaceholder', 'Detalhes dos serviços realizados...')}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1 flex justify-between items-center">
                                    <span>{t('receipts.message', 'Mensagem / Observações')}</span>
                                    {mensagemPresets.length > 0 && (
                                        <select 
                                            onChange={e => {
                                                if (e.target.value) {
                                                    setFormData(prev => ({ ...prev, mensagem: e.target.value }));
                                                    e.target.value = ''; // Reset select
                                                }
                                            }}
                                            className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 outline-none max-w-[200px]"
                                        >
                                            <option value="">{t('receipts.usePreset', 'Usar Pré-setado...')}</option>
                                            {mensagemPresets.map((preset, idx) => (
                                                <option key={idx} value={preset}>{preset}</option>
                                            ))}
                                        </select>
                                    )}
                                </label>
                                <input 
                                    type="text" 
                                    value={formData.mensagem}
                                    onChange={e => setFormData({...formData, mensagem: e.target.value})}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-medium focus:ring-2 focus:ring-blue-500"
                                    placeholder={t('receipts.messagePlaceholder', 'Ex: Agradecemos a preferência!')}
                                />
                            </div>
                        </div>

                        {/* Seção Pagamento e Valores */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-teal-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                <DollarSign size={12}/> {t('receipts.financialAndPayment', 'Financeiro e Pagamento')}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">{t('receipts.checkNumber', 'Nº Cheque / Ref')}</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-3 text-slate-400"><Ticket size={16}/></div>
                                        <input 
                                            type="text" 
                                            value={formData.cheque}
                                            onChange={e => setFormData({...formData, cheque: e.target.value})}
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500"
                                            placeholder="000000"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">{t('receipts.bank', 'Banco')}</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-3 text-slate-400"><Landmark size={16}/></div>
                                        <input 
                                            type="text" 
                                            value={formData.banco}
                                            onChange={e => setFormData({...formData, banco: e.target.value})}
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500"
                                            placeholder={t('receipts.bankPlaceholder', 'Ex: Itaú')}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">{t('receipts.taxes', 'Retenções / Impostos')}</label>
                                    <input 
                                        type="text" 
                                        value={formData.impostos}
                                        onChange={e => setFormData({...formData, impostos: e.target.value})}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500"
                                        placeholder={t('receipts.taxesPlaceholder', 'Ex: ISS 5%')}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">{t('receipts.grossValue', 'Valor Bruto')}</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-3 text-slate-400 text-xs font-bold">R$</div>
                                        <input 
                                            type="text"
                                            inputMode="numeric"
                                            value={valorBrutoStr}
                                            onWheel={e => e.currentTarget.blur()}
                                            onFocus={e => e.target.select()}
                                            onChange={e => {
                                                const masked = formatCurrencyInputMask(e.target.value);
                                                setValorBrutoStr(masked);
                                                const val = parseBrazilianCurrency(masked);
                                                setFormData(prev => ({...prev, valorBruto: isNaN(val) ? 0 : val}));
                                            }}
                                            placeholder="0,00"
                                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none text-sm font-black focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">{t('receipts.discountValue', 'Valor Desconto')}</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-3 text-slate-400 text-xs font-bold">R$</div>
                                        <input 
                                            type="text"
                                            inputMode="numeric"
                                            value={valorDescontoStr}
                                            onWheel={e => e.currentTarget.blur()}
                                            onFocus={e => e.target.select()}
                                            onChange={e => {
                                                const masked = formatCurrencyInputMask(e.target.value);
                                                setValorDescontoStr(masked);
                                                const val = parseBrazilianCurrency(masked);
                                                setFormData(prev => ({...prev, valorDesconto: isNaN(val) ? 0 : val}));
                                            }}
                                            placeholder="0,00"
                                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none text-sm font-black focus:ring-2 focus:ring-blue-500 shadow-inner"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">{t('receipts.grossWithDiscount', 'Bruto C/ Desconto')}</label>
                                    <div className="w-full px-4 py-2.5 bg-white/50 border border-slate-200 rounded-xl text-sm font-black text-slate-500 underline decoration-blue-200 underline-offset-4">
                                        {formatCurrencyBRL(formData.valorBrutoComDesconto)}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-600 uppercase mb-1.5 ml-1">{t('receipts.netValue', 'Valor Líquido')}</label>
                                    <div className="w-full px-4 py-2.5 bg-blue-600 border border-blue-700 rounded-xl text-lg font-black text-white shadow-lg shadow-blue-600/20">
                                        {formatCurrencyBRL(formData.valorLiquido)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-3 pt-4 border-t border-slate-100">
                            <button 
                                type="button" 
                                onClick={() => { setShowForm(false); setEditingReceipt(null); }}
                                className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all uppercase tracking-widest text-xs"
                            >
                                {t('common.cancel', 'Cancelar')}
                            </button>
                            <button 
                                type="submit" 
                                className="flex-1 flex items-center justify-center gap-2 py-4 bg-green-600 text-white font-black rounded-2xl hover:bg-green-700 transition-all uppercase tracking-widest text-xs shadow-lg shadow-green-600/30"
                            >
                                <Save size={18}/> {editingReceipt ? t('receipts.updateAndSave', 'Atualizar e Gravar') : t('receipts.saveReceipt', 'Gravar Recibo')}
                            </button>
                        </div>
                    </form>
                </div>
            ) : showReports ? (
                <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                        <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            <BarChart3 size={18} className="text-indigo-600" /> {t('receipts.reportsTitle', 'Relatório de Recibos')}
                        </h2>
                        <button onClick={() => setShowReports(false)} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"><X size={24}/></button>
                    </div>

                    <div className="p-4 sm:p-6 space-y-6">
                        {/* Filtros de Data e Cliente */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 items-end">
                            <div className="md:col-span-3">
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1 flex items-center gap-1">
                                    <Calendar size={12} /> {t('receipts.startDate', 'Data Inicial')}
                                </label>
                                <input
                                    type="date"
                                    value={reportStartDate}
                                    onChange={e => setReportStartDate(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1 flex items-center gap-1">
                                    <Calendar size={12} /> {t('receipts.endDate', 'Data Final')}
                                </label>
                                <input
                                    type="date"
                                    value={reportEndDate}
                                    onChange={e => setReportEndDate(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div className="md:col-span-4">
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">
                                    {t('receipts.client', 'Cliente (Dentista)')}
                                </label>
                                <select
                                    value={reportClientFilter}
                                    onChange={e => setReportClientFilter(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="">{t('receipts.allClients', 'Todos os Clientes')}</option>
                                    {reportClientOptions.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:col-span-2 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setReportStartDate('');
                                        setReportEndDate('');
                                        setReportClientFilter('');
                                    }}
                                    className="px-3 py-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl font-black uppercase text-[10px] transition-colors cursor-pointer"
                                >
                                    {t('common.clear', 'Limpar')}
                                </button>
                                <button
                                    type="button"
                                    onClick={generateReportPDF}
                                    disabled={reportReceipts.length === 0}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl font-black uppercase text-[10px] shadow-md transition-all cursor-pointer"
                                >
                                    <Printer size={14} /> {t('receipts.generatePdf', 'Gerar PDF')}
                                </button>
                            </div>
                        </div>

                        {/* Lista do Relatório */}
                        {reportReceipts.length > 0 ? (
                            <div className="space-y-4">
                                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-200/80 text-slate-800 text-[10px] font-black uppercase tracking-wider border-b border-slate-300">
                                                <th className="px-4 py-3">{t('receipts.code', 'Número')}</th>
                                                <th className="px-4 py-3">{t('receipts.clientCol', 'Cliente')}</th>
                                                <th className="px-4 py-3">{t('receipts.cpfCnpj', 'CPF/CNPJ')}</th>
                                                <th className="px-4 py-3 text-center">{t('receipts.emissionCol', 'Emissão')}</th>
                                                <th className="px-4 py-3 text-right">{t('receipts.grossCol', 'Valor Bruto')}</th>
                                                <th className="px-4 py-3 text-right">{t('receipts.netCol', 'Valor Líquido')}</th>
                                                <th className="px-4 py-3 text-center">{t('receipts.personTypeCol', 'Tipo Pessoa')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-xs">
                                            {reportReceipts.map((r, idx) => (
                                                <tr key={r.id} className={idx % 2 === 1 ? 'bg-slate-50/90' : 'bg-white'}>
                                                    <td className="px-4 py-2.5 font-mono font-bold text-slate-700 whitespace-nowrap">{r.numero}</td>
                                                    <td className="px-4 py-2.5 font-bold text-slate-800">{r.clienteName}</td>
                                                    <td className="px-4 py-2.5 font-medium text-slate-600 whitespace-nowrap">{r.cpfCnpj || '-'}</td>
                                                    <td className="px-4 py-2.5 text-center font-medium text-slate-600 whitespace-nowrap">
                                                        {r.dtEmissao ? format(new Date(r.dtEmissao), 'dd/MM/yyyy') : '-'}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right font-bold text-slate-700 whitespace-nowrap">
                                                        {formatNumberBRL(r.valorBruto)}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right font-black text-blue-700 whitespace-nowrap">
                                                        {formatNumberBRL(r.valorLiquido)}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-center font-bold text-slate-600 whitespace-nowrap">
                                                        {getClientPersonType(r)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Totais seguindo o modelo */}
                                <div className="flex justify-end pt-2 border-t border-slate-200">
                                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 min-w-[280px] space-y-1.5 text-right">
                                        <div className="flex justify-between gap-6 text-xs font-black text-slate-800">
                                            <span>Total Líquido:</span>
                                            <span>{formatNumberBRL(reportTotals.totalLiquido)}</span>
                                        </div>
                                        <div className="flex justify-between gap-6 text-xs font-black text-slate-700">
                                            <span>Total geral bruto:</span>
                                            <span>{formatNumberBRL(reportTotals.totalBruto)}</span>
                                        </div>
                                        <div className="flex justify-between gap-6 text-xs font-bold text-slate-600">
                                            <span>Total pessoa física (F):</span>
                                            <span>{formatNumberBRL(reportTotals.totalPessoaFisica)}</span>
                                        </div>
                                        <div className="flex justify-between gap-6 text-xs font-bold text-slate-600">
                                            <span>Total pessoa jurídica (J):</span>
                                            <span>{formatNumberBRL(reportTotals.totalPessoaJuridica)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-16 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                                <BarChart3 size={36} className="mx-auto text-slate-300 mb-3" />
                                <p className="text-sm font-black text-slate-700">{t('receipts.noReportResults', 'Nenhum recibo encontrado para os filtros selecionados')}</p>
                                <p className="text-xs font-bold text-slate-400 mt-1">{t('receipts.adjustFiltersHint', 'Ajuste o período ou selecione outro cliente para gerar o relatório.')}</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    <div className="bg-white p-4 md:p-4 sm:p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <div className="absolute left-4 top-3.5 text-slate-400"><Search size={22}/></div>
                            <input 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder={t('receipts.searchPlaceholder', 'Buscar por cliente, número ou referente...')}
                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold transition-all"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredReceipts.map(receipt => (
                            <div key={receipt.id} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-full -mr-12 -mt-12 transition-all group-hover:bg-blue-100/50" />
                                
                                <div className="flex items-start justify-between mb-4 relative">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl"><FileText size={20}/></div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nº {receipt.numero}</p>
                                            <p className="text-xs font-black text-slate-800 uppercase truncate">{format(receipt.dtEmissao, "dd 'de' MMM, yyyy", { locale: ptBR })}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {canManage && (
                                            <>
                                                <button 
                                                    onClick={() => { 
                                                        setEditingReceipt(receipt); 
                                                        setFormData(receipt); 
                                                        setValorBrutoStr(receipt.valorBruto ? formatNumberBRL(receipt.valorBruto) : '');
                                                        setValorDescontoStr(receipt.valorDesconto ? formatNumberBRL(receipt.valorDesconto) : '');
                                                        setDentistSearch(receipt.clienteName);
                                                        setShowForm(true); 
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                >
                                                    <Edit2 size={16}/>
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(receipt.id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                >
                                                    <Trash2 size={16}/>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-3 mb-5">
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">{t('receipts.client', 'Cliente')}</label>
                                        <p className="text-sm font-black text-slate-800 truncate">{receipt.clienteName}</p>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">{t('receipts.referringTo', 'Referente')}</label>
                                        <p className="text-xs font-bold text-slate-600 truncate">{receipt.referente}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('receipts.netValue', 'Valor Líquido')}</span>
                                        <span className="text-lg font-black text-blue-600 leading-none">{formatCurrencyBRL(receipt.valorLiquido)}</span>
                                    </div>
                                    <button 
                                        onClick={() => generatePDF(receipt)}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] hover:bg-slate-800 active:scale-95 transition-all shadow-lg shadow-slate-900/10"
                                    >
                                        <Printer size={14}/> {t('receipts.print', 'Imprimir')}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredReceipts.length === 0 && !isLoading && (
                        <div className="text-center py-20 bg-white rounded-[40px] border border-slate-200 border-dashed">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                <FileText size={40} />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 mb-1">{t('receipts.noReceiptsFound', 'Nenhum recibo encontrado')}</h3>
                            <p className="text-slate-500 font-bold text-sm tracking-tight">{t('receipts.createFirstReceipt', 'Comece criando seu primeiro recibo financeiro.')}</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

