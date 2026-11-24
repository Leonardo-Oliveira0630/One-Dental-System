import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Plus, FileText, Search, Printer, Trash2, Edit2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const Receipts = () => {
    const { t } = useTranslation();
    const { currentUser, manualDentists, allUsers, currentOrg } = useApp();

    const [receipts, setReceipts] = useState<any[]>(() => {
        try {
            const saved = localStorage.getItem('labprox_receipts');
            if (saved) return JSON.parse(saved);
        } catch (e) {}
        return [];
    });

    useEffect(() => {
        try {
            localStorage.setItem('labprox_receipts', JSON.stringify(receipts));
        } catch (e) {}
    }, [receipts]);

    const hasPerm = (perm: string) => {
        if (currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'MANAGER') return true;
        return (currentUser?.permissions as string[])?.includes(perm) || false;
    };

    const canView = hasPerm('finance:view') || hasPerm('receipts:view');
    const canCreate = hasPerm('finance:create') || hasPerm('receipts:create');
    const canEdit = hasPerm('finance:edit') || hasPerm('receipts:edit');
    const canDelete = hasPerm('finance:delete') || hasPerm('receipts:delete');

    if (!canView) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
                <FileText size={48} className="mb-4 opacity-20" />
                <h2 className="text-xl font-black uppercase tracking-widest">{t('common.accessDenied', 'Acesso Negado')}</h2>
                <p className="text-sm">{t('receipts.accessDeniedMsg', 'Você não tem permissão para visualizar recibos.')}</p>
            </div>
        );
    }

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingReceipt, setEditingReceipt] = useState<any | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        clienteId: '',
        clienteName: '',
        referente: '',
        valorBruto: 0,
        valorDesconto: 0,
        dtEmissao: new Date().toISOString().split('T')[0],
        observacoes: ''
    });

    const clientsList = useMemo(() => {
        const list: any[] = [];
        allUsers.filter((u: any) => u.role === 'DENTIST' || u.role === 'CLIENT' || u.role === 'CLINIC').forEach((u: any) => {
            list.push({ id: u.id, name: u.name, clinic: u.clinicName || '' });
        });
        manualDentists.forEach((d: any) => {
            if (!list.some(x => x.name.toLowerCase() === d.name.toLowerCase())) {
                list.push({ id: d.id, name: d.name, clinic: d.clinicName || '' });
            }
        });
        return list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    }, [allUsers, manualDentists]);

    const formatCurrencyBRL = (val: number) => {
        return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const parseBrazilianCurrency = (str: string) => {
        if (!str) return 0;
        const clean = str.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
        const num = parseFloat(clean);
        return isNaN(num) ? 0 : num;
    };

    const numberToWordsPortuguese = (num: number): string => {
        if (num === 0) return 'zero reais';
        
        const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
        const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
        const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

        function convertGroup(n: number): string {
            if (n === 0) return '';
            if (n === 100) return 'cem';
            if (n < 20) return unidades[n];
            const c = Math.floor(n / 100);
            const d = Math.floor((n % 100) / 10);
            const u = n % 10;
            let res = '';
            if (c > 0) res += centenas[c];
            const rest = n % 100;
            if (rest > 0) {
                if (res) res += ' e ';
                if (rest < 20) {
                    res += unidades[rest];
                } else {
                    res += dezenas[d];
                    if (u > 0) res += ' e ' + unidades[u];
                }
            }
            return res;
        }

        const reais = Math.floor(num);
        const centavos = Math.round((num - reais) * 100);

        let parts: string[] = [];

        const milhoes = Math.floor(reais / 1000000);
        const milhares = Math.floor((reais % 1000000) / 1000);
        const resto = reais % 1000;

        if (milhoes > 0) {
            parts.push(milhoes === 1 ? 'um milhão' : convertGroup(milhoes) + ' milhões');
        }
        if (milhares > 0) {
            if (milhares === 1) {
                parts.push('um mil');
            } else {
                parts.push(convertGroup(milhares) + ' mil');
            }
        }
        if (resto > 0) {
            if ((milhares > 0 || milhoes > 0) && resto < 100) {
                parts.push('e ' + convertGroup(resto));
            } else {
                parts.push(convertGroup(resto));
            }
        }

        let result = parts.join(' ');
        if (reais === 1) result += ' real';
        else if (reais > 1) result += ' reais';

        if (centavos > 0) {
            if (reais > 0) result += ' e ';
            result += convertGroup(centavos) + (centavos === 1 ? ' centavo' : ' centavos');
        }

        return result.toUpperCase();
    };

    const handleOpenCreate = () => {
        setEditingReceipt(null);
        setFormData({
            clienteId: '',
            clienteName: '',
            referente: '',
            valorBruto: 0,
            valorDesconto: 0,
            dtEmissao: new Date().toISOString().split('T')[0],
            observacoes: ''
        });
        setIsFormOpen(true);
    };

    const handleOpenEdit = (r: any) => {
        setEditingReceipt(r);
        let dtStr = new Date().toISOString().split('T')[0];
        if (r.dtEmissao) {
            const d = r.dtEmissao instanceof Date ? r.dtEmissao : new Date(r.dtEmissao);
            if (!isNaN(d.getTime())) {
                dtStr = d.toISOString().split('T')[0];
            }
        }
        setFormData({
            clienteId: r.clienteId || '',
            clienteName: r.clienteName || '',
            referente: r.referente || '',
            valorBruto: r.valorBruto || 0,
            valorDesconto: r.valorDesconto || 0,
            dtEmissao: dtStr,
            observacoes: r.observacoes || ''
        });
        setIsFormOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.clienteName.trim()) {
            alert('Por favor, informe o cliente.');
            return;
        }
        const bruto = Number(formData.valorBruto) || 0;
        const desc = Number(formData.valorDesconto) || 0;
        const liquido = Math.max(0, bruto - desc);

        // Parse date safely avoiding local timezone offset shift
        let parsedDate = new Date();
        if (formData.dtEmissao) {
            const parts = formData.dtEmissao.split('-');
            if (parts.length === 3) {
                parsedDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
            }
        }

        const payload = {
            id: editingReceipt ? editingReceipt.id : `rcp_${Date.now()}`,
            clienteId: formData.clienteId,
            clienteName: formData.clienteName.trim(),
            referente: formData.referente.trim(),
            valorBruto: bruto,
            valorDesconto: desc,
            valorLiquido: liquido,
            dtEmissao: parsedDate.toISOString(),
            observacoes: formData.observacoes.trim()
        };

        if (editingReceipt) {
            setReceipts(receipts.map((r: any) => r.id === editingReceipt.id ? payload : r));
        } else {
            setReceipts([payload, ...receipts]);
        }
        setIsFormOpen(false);
    };

    const handleDelete = (id: string) => {
        if (!window.confirm('Tem certeza que deseja excluir este recibo?')) return;
        setReceipts(receipts.filter((r: any) => r.id !== id));
    };

    const generatePDF = (receipt: any) => {
        const doc = new jsPDF();
        const labName = currentOrg?.name || 'Laboratório Protético';
        const labCNPJ = (currentOrg as any)?.cnpj || '';
        const labAddress = currentOrg?.address || '';

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(labName.toUpperCase(), 105, 20, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        if (labCNPJ) doc.text(`CNPJ: ${labCNPJ}`, 105, 26, { align: 'center' });
        if (labAddress) doc.text(labAddress, 105, 32, { align: 'center' });

        doc.setLineWidth(0.5);
        doc.line(14, 38, 196, 38);

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`RECIBO FINANCEIRO Nº ${receipt.id.substring(receipt.id.length - 6).toUpperCase()}`, 105, 48, { align: 'center' });

        doc.setFontSize(12);
        doc.text(`VALOR: ${formatCurrencyBRL(receipt.valorLiquido)}`, 14, 60);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        const rDate = new Date(receipt.dtEmissao || Date.now());
        const dateStr = !isNaN(rDate.getTime()) ? rDate.toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');

        doc.text(`Data de Emissão: ${dateStr}`, 14, 70);
        doc.text(`Recebemos de: ${receipt.clienteName}`, 14, 78);
        doc.text(`A quantia de: ${numberToWordsPortuguese(receipt.valorLiquido)}`, 14, 86);
        doc.text(`Referente a: ${receipt.referente || 'Serviços protéticos prestados'}`, 14, 94);

        if (receipt.observacoes) {
            doc.text(`Observações: ${receipt.observacoes}`, 14, 102);
        }

        doc.line(50, 140, 160, 140);
        doc.setFont('helvetica', 'bold');
        doc.text(labName, 105, 146, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('Assinatura / Carimbo do Laboratório', 105, 152, { align: 'center' });

        doc.save(`Recibo_${receipt.clienteName.replace(/\s+/g, '_')}_${dateStr.replace(/\//g, '-')}.pdf`);
    };

    const filteredReceipts = useMemo(() => {
        if (!searchTerm.trim()) return receipts;
        const q = searchTerm.toLowerCase();
        return receipts.filter((r: any) => 
            (r.clienteName || '').toLowerCase().includes(q) ||
            (r.referente || '').toLowerCase().includes(q) ||
            String(r.valorLiquido || '').includes(q)
        );
    }, [receipts, searchTerm]);

    return (
        <div className="space-y-6 pb-12 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[32px] border border-slate-100 shadow-xs">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
                        <FileText className="text-blue-600" size={28} />
                        {t('receipts.title', 'Recibos Financeiros')}
                    </h1>
                    <p className="text-xs font-bold text-slate-400 mt-0.5">Emissão e controle de recibos para clientes e dentistas</p>
                </div>
                {canCreate && (
                    <button
                        onClick={handleOpenCreate}
                        className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-xs transition-all shadow-lg shadow-blue-600/20 active:scale-95 cursor-pointer"
                    >
                        <Plus size={16} /> {t('receipts.newReceipt', 'Novo Recibo')}
                    </button>
                )}
            </div>

            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Buscar por cliente, referente ou valor..."
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500 shadow-xs"
                    />
                </div>
            </div>

            {isFormOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                        <div className="p-6 bg-slate-50 border-b flex justify-between items-center shrink-0">
                            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                <FileText className="text-blue-600" />
                                {editingReceipt ? 'Editar Recibo' : 'Emitir Novo Recibo'}
                            </h3>
                            <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5 flex-1">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Cliente / Dentista</label>
                                <select
                                    value={formData.clienteId}
                                    onChange={e => {
                                        const sel = clientsList.find(c => c.id === e.target.value);
                                        setFormData({
                                            ...formData,
                                            clienteId: e.target.value,
                                            clienteName: sel ? sel.name : ''
                                        });
                                    }}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="">Selecione o cliente...</option>
                                    {clientsList.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} {c.clinic ? `(${c.clinic})` : ''}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Nome do Cliente (Personalizado ou Selecionado)</label>
                                <input 
                                    type="text"
                                    value={formData.clienteName}
                                    onChange={e => setFormData({...formData, clienteName: e.target.value})}
                                    placeholder="Ex: Dr. João Silva"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Referente a</label>
                                <input 
                                    type="text"
                                    value={formData.referente}
                                    onChange={e => setFormData({...formData, referente: e.target.value})}
                                    placeholder="Ex: Prótese Total Superior e Inferior - OS #1024"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Valor Bruto (R$)</label>
                                    <input 
                                        type="text"
                                        value={formData.valorBruto === 0 ? '' : formData.valorBruto}
                                        onWheel={e => (e.target as HTMLInputElement).blur()}
                                        onFocus={e => e.target.select()}
                                        onChange={e => {
                                            const val = parseBrazilianCurrency(e.target.value);
                                            setFormData({...formData, valorBruto: isNaN(val) ? 0 : val});
                                        }}
                                        placeholder="0,00"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-black text-sm focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Desconto (R$)</label>
                                    <input 
                                        type="text"
                                        value={formData.valorDesconto === 0 ? '' : formData.valorDesconto}
                                        onWheel={e => (e.target as HTMLInputElement).blur()}
                                        onFocus={e => e.target.select()}
                                        onChange={e => {
                                            const val = parseBrazilianCurrency(e.target.value);
                                            setFormData({...formData, valorDesconto: isNaN(val) ? 0 : val});
                                        }}
                                        placeholder="0,00"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-black text-sm focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Dt. Emissão</label>
                                    <input 
                                        type="date"
                                        value={formData.dtEmissao}
                                        onWheel={e => (e.target as HTMLInputElement).blur()}
                                        onChange={e => setFormData({...formData, dtEmissao: e.target.value})}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Observações (Opcional)</label>
                                <textarea 
                                    value={formData.observacoes}
                                    onChange={e => setFormData({...formData, observacoes: e.target.value})}
                                    placeholder="Informações adicionais para o recibo..."
                                    rows={3}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium text-sm focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="pt-4 border-t flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsFormOpen(false)}
                                    className="px-6 py-3 font-black text-xs text-slate-400 uppercase tracking-widest hover:bg-slate-100 rounded-2xl transition-colors cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-xs transition-all shadow-lg shadow-blue-600/20 active:scale-95 cursor-pointer"
                                >
                                    Salvar Recibo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredReceipts.map((receipt: any) => {
                    const rDate = new Date(receipt.dtEmissao || Date.now());
                    const dateStr = !isNaN(rDate.getTime()) ? rDate.toLocaleDateString('pt-BR') : '-';

                    return (
                        <div key={receipt.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-xs font-black">
                                            <FileText size={22} />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                                {dateStr}
                                            </span>
                                            <h4 className="font-black text-slate-800 text-base mt-1">{receipt.clienteName}</h4>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {canEdit && (
                                            <button onClick={() => handleOpenEdit(receipt)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all cursor-pointer" title="Editar">
                                                <Edit2 size={16} />
                                            </button>
                                        )}
                                        {canDelete && (
                                            <button onClick={() => handleDelete(receipt.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer" title="Excluir">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2 mb-4 bg-slate-50 p-4 rounded-2xl">
                                    <p className="text-xs font-bold text-slate-600">
                                        <span className="text-slate-400 uppercase text-[9px] block">Referente:</span>
                                        {receipt.referente}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                <div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Valor Líquido</span>
                                    <span className="text-lg font-black text-blue-600">{formatCurrencyBRL(receipt.valorLiquido)}</span>
                                </div>
                                <button
                                    onClick={() => generatePDF(receipt)}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black uppercase text-[10px] shadow-md transition-all active:scale-95 cursor-pointer"
                                >
                                    <Printer size={14} /> Imprimir / PDF
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredReceipts.length === 0 && (
                <div className="text-center py-20 bg-white rounded-[40px] border border-slate-200 border-dashed">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                        <FileText size={40} />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 mb-1">Nenhum recibo encontrado</h3>
                    <p className="text-slate-500 font-bold text-sm">Comece emitindo seu primeiro recibo financeiro.</p>
                </div>
            )}
        </div>
    );
};