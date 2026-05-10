
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Receipt, User, ManualDentist, PermissionKey } from '../../types';
import { 
  Plus, Search, FileText, Download, Printer, Trash2, Edit2, 
  ChevronLeft, ChevronRight, X, Save, AlertTriangle, User as UserIcon,
  Briefcase, DollarSign, MessageCircle, CreditCard, Landmark, Ticket,
  Stethoscope, Check
} from 'lucide-react';
import { db } from '../../services/firebaseConfig';
import { 
  collection, query, where, onSnapshot, addDoc, 
  updateDoc, deleteDoc, doc, Timestamp, orderBy,
  getDocFromServer
} from 'firebase/firestore';
import { auth } from '../../services/firebaseConfig';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const Receipts: React.FC = () => {
    const { currentUser, currentOrg, allUsers, manualDentists } = useApp();

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
                providerInfo: auth.currentUser?.providerData?.map(provider => ({
                    providerId: provider.providerId,
                    email: provider.email,
                })) || []
            },
            operationType,
            path
        };
        console.error('Firestore Error: ', JSON.stringify(errInfo));
        throw new Error(JSON.stringify(errInfo));
    };

    const [receipts, setReceipts] = useState<Receipt[]>([]);
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

    const dentists = useMemo(() => {
        const online = allUsers.filter(u => u.role === 'CLIENT').map(d => ({ ...d, type: 'ONLINE' }));
        const offline = (manualDentists || []).map(d => ({ ...d, type: 'OFFLINE' }));
        return [...online, ...offline];
    }, [allUsers, manualDentists]);

    const filteredDentistSuggestions = useMemo(() => {
        const querySearch = dentistSearch.toLowerCase();
        // If searching, filter results
        return dentists.filter(d => 
            d.name.toLowerCase().includes(querySearch) ||
            (d.cpfCnpj && d.cpfCnpj.includes(querySearch)) ||
            ((d as any).clinicName && (d as any).clinicName.toLowerCase().includes(querySearch))
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
            where('organizationId', '==', currentOrg.id),
            orderBy('createdAt', 'desc')
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
            setReceipts(list);
            setIsLoading(false);
            
            // Auto-generate next number if empty and recording new
            if (!formData.numero && list.length > 0 && !showForm) {
                const lastNum = parseInt(list[0].numero) || 0;
                setFormData(prev => ({ ...prev, numero: (lastNum + 1).toString().padStart(6, '0') }));
            } else if (!formData.numero && !showForm) {
                setFormData(prev => ({ ...prev, numero: '000001' }));
            }
        }, (error) => {
            handleFirestoreError(error, OperationType.GET, path);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [currentOrg?.id]);

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

        try {
            const dataToSave = {
                ...formData,
                organizationId: currentOrg.id,
                createdBy: currentUser.id,
                createdAt: Timestamp.now(),
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
        setFormData({
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
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Deseja realmente excluir este recibo?")) return;
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
            result += (mil === 1 ? "MIL" : getHundreds(mil) + " MIL");
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
        doc.text("Recibo", 190, 20, { align: 'right' });
        
        // Recibo Nº
        doc.setFontSize(12);
        doc.text(`Recibo N°: `, 20, 50);
        doc.text(`${receipt.numero}`, 45, 50);
        
        // Recebemos de
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text("Recebemos de ", 20, 65);
        doc.setFont("helvetica", "bold");
        doc.text(`${receipt.clienteName} CPF/CNPJ: ${receipt.cpfCnpj}`, 50, 65);
        
        // A quantia de
        doc.setFont("helvetica", "normal");
        doc.text("a quantia de ", 20, 72);
        doc.setFont("helvetica", "bold");
        const extenso = numberToWordsPortuguese(receipt.valorLiquido);
        doc.text(extenso, 45, 72, { maxWidth: 140 });
        
        // Referente a
        doc.setFont("helvetica", "normal");
        const referenteY = 72 + (extenso.length > 60 ? 10 : 7);
        doc.text("referente a ", 20, referenteY);
        doc.setFont("helvetica", "bold");
        doc.text(receipt.referente.toUpperCase(), 43, referenteY, { maxWidth: 140 });

        // Values Table (Right Aligned)
        const tableX = 145;
        const tableY = 60;
        doc.setFont("helvetica", "normal");
        doc.text("Bruto:", tableX, tableY);
        doc.text("Desconto:", tableX, tableY + 8);
        doc.text("Líquido:", tableX, tableY + 16);

        doc.setFont("helvetica", "bold");
        doc.text(receipt.valorBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), 190, tableY, { align: 'right' });
        doc.text(receipt.valorDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), 190, tableY + 8, { align: 'right' });
        doc.text(receipt.valorLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), 190, tableY + 16, { align: 'right' });
        
        // City and Date
        const city = currentOrg?.city || "Vitória";
        const dateStr = format(receipt.dtEmissao, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
        doc.setFont("helvetica", "bold");
        doc.text(`${city}, ${dateStr}`, 190, 110, { align: 'right' });
        
        // Signature Line
        doc.setDrawColor(200, 200, 200);
        doc.line(110, 135, 190, 135);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const issuerName = currentOrg?.name || currentUser?.name || "";
        const issuerDoc = currentOrg?.financialSettings?.businessData?.cnpj || currentOrg?.financialSettings?.businessData?.cpf || "";
        
        doc.text(issuerName, 190, 140, { align: 'right' });
        if (issuerDoc) {
            doc.text(issuerDoc, 190, 145, { align: 'right' });
        }
        
        doc.save(`Recibo_${receipt.numero}_${receipt.clienteName}.pdf`);
    };

    const filteredReceipts = receipts.filter(r => 
        r.clienteName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.numero?.includes(searchTerm) ||
        r.referente?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Recibos Financeiros</h1>
                    <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Gerenciamento e Emissão de Comprovantes</p>
                </div>
                <button 
                    onClick={() => { resetForm(); setEditingReceipt(null); setShowForm(true); }}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all"
                >
                    <Plus size={18} /> Novo Recibo
                </button>
            </div>

            {showForm ? (
                <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                        <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            <FileText size={18} className="text-blue-600" /> {editingReceipt ? 'Editar Recibo' : 'Dados do Recibo'}
                        </h2>
                        <button onClick={() => { setShowForm(false); setEditingReceipt(null); }} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24}/></button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-8">
                        {/* Seção Dados do Recibo */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                <UserIcon size={12}/> Identificação e Datas
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Dt. Emissão</label>
                                    <input 
                                        type="date" 
                                        value={format(formData.dtEmissao || new Date(), 'yyyy-MM-dd')}
                                        onChange={e => setFormData({...formData, dtEmissao: new Date(e.target.value)})}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Número</label>
                                    <input 
                                        type="text" 
                                        value={formData.numero}
                                        onChange={e => setFormData({...formData, numero: e.target.value})}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500"
                                        placeholder="000000"
                                    />
                                </div>
                                <div className="md:col-span-2 relative" ref={dropdownRef}>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Cliente (Dentista)</label>
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
                                            placeholder="Selecione ou digite o nome do dentista..."
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
                                                        <p className="text-xs font-bold text-slate-400">Nenhum dentista encontrado</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Tipo Pessoa</label>
                                    <select 
                                        value={formData.emitidoComo} 
                                        onChange={e => setFormData({...formData, emitidoComo: e.target.value as 'PF' | 'PJ'})}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="PF">Pessoa Física</option>
                                        <option value="PJ">Pessoa Jurídica</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">CPF/CNPJ</label>
                                    <input 
                                        type="text" 
                                        value={formData.cpfCnpj}
                                        onChange={e => setFormData({...formData, cpfCnpj: e.target.value})}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500"
                                        placeholder="000.000.000-00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Titular do Recibo</label>
                                    <select 
                                        value={formData.titularRecibo} 
                                        onChange={e => setFormData({...formData, titularRecibo: e.target.value})}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="CLIENTE">Próprio Cliente</option>
                                        <option value="OUTRO">Outro (Especificar)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Empresa</label>
                                    <input 
                                        type="text" 
                                        value={formData.nomeTitular}
                                        onChange={e => setFormData({...formData, nomeTitular: e.target.value})}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500"
                                        placeholder="Clínica / Nome Fantasia"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Seção Dados do Serviço */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Briefcase size={12}/> Informações do Serviço
                            </h3>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Referente a</label>
                                <input 
                                    type="text" 
                                    value={formData.referente}
                                    onChange={e => setFormData({...formData, referente: e.target.value})}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500"
                                    placeholder="Ex: Pagamento de fatura Abril/2024"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Descrição Detalhada</label>
                                <textarea 
                                    rows={3}
                                    value={formData.descricaoServico}
                                    onChange={e => setFormData({...formData, descricaoServico: e.target.value})}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-medium focus:ring-2 focus:ring-blue-500 resize-none"
                                    placeholder="Detalhes dos serviços realizados..."
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Mensagem / Observações</label>
                                <input 
                                    type="text" 
                                    value={formData.mensagem}
                                    onChange={e => setFormData({...formData, mensagem: e.target.value})}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-medium focus:ring-2 focus:ring-blue-500"
                                    placeholder="Ex: Agradecemos a preferência!"
                                />
                            </div>
                        </div>

                        {/* Seção Pagamento e Valores */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-teal-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                <DollarSign size={12}/> Financeiro e Pagamento
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Nº Cheque / Ref</label>
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
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Banco</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-3 text-slate-400"><Landmark size={16}/></div>
                                        <input 
                                            type="text" 
                                            value={formData.banco}
                                            onChange={e => setFormData({...formData, banco: e.target.value})}
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500"
                                            placeholder="Ex: Itaú"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Retenções / Impostos</label>
                                    <input 
                                        type="text" 
                                        value={formData.impostos}
                                        onChange={e => setFormData({...formData, impostos: e.target.value})}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500"
                                        placeholder="Ex: ISS 5%"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Valor Bruto</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-3 text-slate-400 text-xs font-bold">R$</div>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            value={formData.valorBruto}
                                            onChange={e => setFormData({...formData, valorBruto: parseFloat(e.target.value) || 0})}
                                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none text-sm font-black focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Valor Desconto</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-3 text-slate-400 text-xs font-bold">R$</div>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            value={formData.valorDesconto}
                                            onChange={e => setFormData({...formData, valorDesconto: parseFloat(e.target.value) || 0})}
                                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none text-sm font-black focus:ring-2 focus:ring-blue-500 shadow-inner"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Bruto C/ Desconto</label>
                                    <div className="w-full px-4 py-2.5 bg-white/50 border border-slate-200 rounded-xl text-sm font-black text-slate-500 underline decoration-blue-200 underline-offset-4">
                                        R$ {formData.valorBrutoComDesconto?.toFixed(2)}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-600 uppercase mb-1.5 ml-1">Valor Líquido</label>
                                    <div className="w-full px-4 py-2.5 bg-blue-600 border border-blue-700 rounded-xl text-lg font-black text-white shadow-lg shadow-blue-600/20">
                                        R$ {formData.valorLiquido?.toFixed(2)}
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
                                Cancelar
                            </button>
                            <button 
                                type="submit"
                                className="flex-1 flex items-center justify-center gap-2 py-4 bg-green-600 text-white font-black rounded-2xl hover:bg-green-700 transition-all uppercase tracking-widest text-xs shadow-lg shadow-green-600/30"
                            >
                                <Save size={18}/> {editingReceipt ? 'Atualizar e Gravar' : 'Gravar Recibo'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <>
                    <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <div className="absolute left-4 top-3.5 text-slate-400"><Search size={22}/></div>
                            <input 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Buscar por cliente, número ou referente..." 
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
                                        <button 
                                            onClick={() => { 
                                                setEditingReceipt(receipt); 
                                                setFormData(receipt); 
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
                                    </div>
                                </div>

                                <div className="space-y-3 mb-5">
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Cliente</label>
                                        <p className="text-sm font-black text-slate-800 truncate">{receipt.clienteName}</p>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Referente</label>
                                        <p className="text-xs font-bold text-slate-600 truncate">{receipt.referente}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor Líquido</span>
                                        <span className="text-lg font-black text-blue-600 leading-none">R$ {receipt.valorLiquido.toFixed(2)}</span>
                                    </div>
                                    <button 
                                        onClick={() => generatePDF(receipt)}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] hover:bg-slate-800 active:scale-95 transition-all shadow-lg shadow-slate-900/10"
                                    >
                                        <Printer size={14}/> Imprimir
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
                            <h3 className="text-xl font-black text-slate-800 mb-1">Nenhum recibo encontrado</h3>
                            <p className="text-slate-500 font-bold text-sm tracking-tight">Comece criando seu primeiro recibo financeiro.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
