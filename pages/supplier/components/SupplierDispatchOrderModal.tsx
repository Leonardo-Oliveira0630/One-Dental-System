import React, { useState, useEffect } from 'react';
import { SupplierOrder } from '../../../types';
import { 
  Package, Truck, X, ExternalLink, Check, AlertCircle, 
  Calendar, FileText, Send, Building2, MapPin, Hash, Sparkles
} from 'lucide-react';
import { COMMON_CARRIERS, getCarrierTrackingUrl, formatCarrierName } from '../../../utils/trackingUtils';

interface SupplierDispatchOrderModalProps {
  order: SupplierOrder;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDispatch: (orderId: string, dispatchData: {
    trackingCode: string;
    carrierName: string;
    shippingService: string;
    trackingUrl: string;
    trackingInfo: string;
    estimatedDeliveryDate?: string;
    invoiceNumber?: string;
    notes?: string;
  }) => Promise<void>;
  onSetReadyToShipOnly?: (orderId: string) => Promise<void>;
}

export const SupplierDispatchOrderModal: React.FC<SupplierDispatchOrderModalProps> = ({
  order,
  isOpen,
  onClose,
  onConfirmDispatch,
  onSetReadyToShipOnly
}) => {
  const [selectedCarrierId, setSelectedCarrierId] = useState<string>('CORREIOS');
  const [customCarrierName, setCustomCarrierName] = useState<string>('');
  const [trackingCode, setTrackingCode] = useState<string>(order.trackingCode || '');
  const [trackingUrl, setTrackingUrl] = useState<string>(order.trackingUrl || '');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState<string>(
    order.estimatedDeliveryDate ? new Date(order.estimatedDeliveryDate).toISOString().split('T')[0] : ''
  );
  const [invoiceNumber, setInvoiceNumber] = useState<string>(order.invoiceNumber || '');
  const [shippingNotes, setShippingNotes] = useState<string>(order.trackingInfo || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize carrier based on order shipping method
  useEffect(() => {
    if (order.shippingMethod === 'SEDEX' || order.shippingMethod === 'PAC') {
      setSelectedCarrierId('CORREIOS');
    } else if (order.shippingMethod === 'FRENET') {
      setSelectedCarrierId('FRENET');
    } else if (order.shippingMethod === 'MOTOBOY') {
      setSelectedCarrierId('MOTOBOY');
    } else if (order.carrierName) {
      const match = COMMON_CARRIERS.find(c => c.name.toLowerCase() === order.carrierName?.toLowerCase());
      if (match) setSelectedCarrierId(match.id);
      else {
        setSelectedCarrierId('OTHER');
        setCustomCarrierName(order.carrierName);
      }
    }
  }, [order]);

  // Recalculate tracking URL when tracking code or carrier changes
  useEffect(() => {
    const currentCarrier = selectedCarrierId === 'OTHER' 
      ? customCarrierName 
      : (COMMON_CARRIERS.find(c => c.id === selectedCarrierId)?.name || 'Correios');
    
    const autoUrl = getCarrierTrackingUrl(trackingCode, currentCarrier);
    if (autoUrl && !trackingUrl.startsWith('http://custom')) {
      setTrackingUrl(autoUrl);
    }
  }, [trackingCode, selectedCarrierId, customCarrierName]);

  if (!isOpen) return null;

  const handleSaveAndShip = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const carrierDisplayName = selectedCarrierId === 'OTHER'
        ? (customCarrierName.trim() || 'Transportadora')
        : (COMMON_CARRIERS.find(c => c.id === selectedCarrierId)?.name || 'Correios');

      await onConfirmDispatch(order.id, {
        trackingCode: trackingCode.trim(),
        carrierName: carrierDisplayName,
        shippingService: selectedCarrierId,
        trackingUrl: trackingUrl.trim(),
        trackingInfo: shippingNotes.trim(),
        estimatedDeliveryDate: estimatedDeliveryDate || undefined,
        invoiceNumber: invoiceNumber.trim() || undefined,
        notes: shippingNotes.trim() || undefined
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao despachar pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAsReadyToShip = async () => {
    if (!onSetReadyToShipOnly) return;
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await onSetReadyToShipOnly(order.id);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao atualizar status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const orderShortId = order.id.replace('order_sup_', '').substring(0, 10).toUpperCase();

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-[#131B2A] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-[#0E1626]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shadow-md">
              <Truck size={20} />
            </div>
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>Despachar & Enviar Pedido</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  #{orderShortId}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cliente: <strong>{order.buyerOrgName || order.buyerName}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-2.5 text-xs text-rose-800 dark:text-rose-200">
              <AlertCircle size={16} className="shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Destination & Order Summary Box */}
          <div className="bg-slate-50 dark:bg-[#0E1626] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <MapPin size={12} /> Destino da Entrega
              </span>
              <p className="font-bold text-slate-900 dark:text-white">
                {order.buyerAddress ? `${order.buyerAddress.city || ''} / ${order.buyerAddress.state || ''}` : 'Endereço a combinar'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {order.buyerAddress ? `${order.buyerAddress.street || ''}, ${order.buyerAddress.number || ''} ${order.buyerAddress.neighborhood ? `- ${order.buyerAddress.neighborhood}` : ''} • CEP ${order.buyerAddress.zipCode || ''}` : ''}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Package size={12} /> Itens ({order.items.length})
              </span>
              <p className="font-bold text-slate-900 dark:text-white truncate">
                {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                Valor Total: <strong>R$ {order.totalValue.toFixed(2)}</strong> ({order.shippingMethod || 'Frete padrão'})
              </p>
            </div>
          </div>

          {/* Step 1: Carrier Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Truck size={14} className="text-indigo-600 dark:text-indigo-400" />
              <span>Transportadora / Forma de Envio</span>
              <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {COMMON_CARRIERS.map((carrier) => (
                <button
                  key={carrier.id}
                  type="button"
                  onClick={() => setSelectedCarrierId(carrier.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all text-xs font-bold cursor-pointer ${
                    selectedCarrierId === carrier.id
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0E1626] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="truncate">{carrier.name}</div>
                </button>
              ))}
            </div>

            {selectedCarrierId === 'OTHER' && (
              <div className="pt-2">
                <input
                  type="text"
                  placeholder="Digite o nome da transportadora..."
                  value={customCarrierName}
                  onChange={(e) => setCustomCarrierName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#0E1626] border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-600"
                />
              </div>
            )}
          </div>

          {/* Step 2: Tracking Code Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Hash size={14} className="text-indigo-600 dark:text-indigo-400" />
                <span>Código de Rastreamento (Correios / Frenet / Transportadora)</span>
              </span>
              <span className="text-[11px] text-slate-400 font-normal">Disponibilizado ao cliente</span>
            </label>
            <input
              type="text"
              placeholder="Ex: BR123456789BR, 10082910293, ou código Frenet..."
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
              className="w-full bg-slate-50 dark:bg-[#0E1626] border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono font-bold tracking-wider outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-[#0B0F17] transition-all uppercase placeholder:normal-case placeholder:font-sans placeholder:tracking-normal placeholder:font-normal"
            />
          </div>

          {/* Step 3: Tracking URL */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ExternalLink size={14} className="text-indigo-600 dark:text-indigo-400" />
                <span>Link Direto de Rastreamento</span>
              </span>
              <span className="text-[11px] text-slate-400 font-normal">Gerado automaticamente</span>
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://rastreamento..."
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                className="flex-1 bg-slate-50 dark:bg-[#0E1626] border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white font-mono outline-none focus:border-indigo-600"
              />
              {trackingUrl && (
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 transition-all border border-slate-300 dark:border-slate-700"
                  title="Testar Link de Rastreio"
                >
                  <ExternalLink size={14} />
                  <span>Testar</span>
                </a>
              )}
            </div>
          </div>

          {/* Step 4: Invoice & Estimated Date (2 Columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <FileText size={14} className="text-slate-500" />
                <span>Número da Nota Fiscal (DANFE)</span>
              </label>
              <input
                type="text"
                placeholder="Ex: NF-e 001.293.847"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#0E1626] border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-600 font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Calendar size={14} className="text-slate-500" />
                <span>Previsão de Entrega</span>
              </label>
              <input
                type="date"
                value={estimatedDeliveryDate}
                onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#0E1626] border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Step 5: Shipping Notes / Observations */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Observações / Instruções de Envio (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Pacote lacrado, despachado na agência central. Entrega estimada em dias úteis..."
              value={shippingNotes}
              onChange={(e) => setShippingNotes(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#0E1626] border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-600 resize-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-[#0E1626] flex flex-col sm:flex-row items-center justify-between gap-3">
          {onSetReadyToShipOnly && (
            <button
              type="button"
              onClick={handleMarkAsReadyToShip}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-4 py-2.5 bg-purple-100 hover:bg-purple-200 dark:bg-purple-950 dark:hover:bg-purple-900 text-purple-900 dark:text-purple-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-purple-300 dark:border-purple-800 cursor-pointer disabled:opacity-50"
            >
              <Package size={14} />
              <span>Salvar apenas como "A Despachar"</span>
            </button>
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 transition-all cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSaveAndShip}
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send size={14} />
              <span>{isSubmitting ? 'Salvando & Despachando...' : 'Confirmar Envio & Notificar Cliente'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
