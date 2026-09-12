import React from 'react';
import { SupplierOrder } from '../../../types';
import { X, Printer, Package, Building2, MapPin, Phone, Mail, Calendar, CheckSquare, Truck, ShieldCheck } from 'lucide-react';

interface SupplierOrderPackingSlipModalProps {
  order: SupplierOrder | null;
  onClose: () => void;
  supplierName?: string;
  supplierAddress?: string;
  supplierPhone?: string;
}

export const SupplierOrderPackingSlipModal: React.FC<SupplierOrderPackingSlipModalProps> = ({
  order,
  onClose,
  supplierName,
  supplierAddress,
  supplierPhone,
}) => {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = order.createdAt 
    ? new Date(order.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '-';

  const orderShortId = order.id ? order.id.replace('order_sup_', '').substring(0, 10).toUpperCase() : '---';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white text-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Action Bar (Hidden on print) */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base">Ficha de Separação & Espelho do Pedido</h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Printer size={15} />
              <span>Imprimir Ficha / Etiqueta</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              title="Fechar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Packing Slip Area */}
        <div id="printable-packing-slip" className="p-8 overflow-y-auto space-y-6 print:p-0 print:m-0 text-slate-900 text-xs">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
            <div>
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block mb-0.5">
                Labprox Marketplace Oficial
              </span>
              <h1 className="text-xl font-black text-slate-900">FICHA DE EXPEDIÇÃO E PICKING</h1>
              <p className="text-slate-500 text-xs mt-0.5">
                Fornecedor: <strong className="text-slate-800">{supplierName || order.supplierName}</strong>
                {supplierPhone ? ` • Tel: ${supplierPhone}` : ''}
              </p>
            </div>

            <div className="text-right">
              <div className="inline-block px-3 py-1.5 bg-slate-900 text-white font-mono font-black text-sm rounded-lg">
                PEDIDO #{orderShortId}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Data: {formattedDate}</p>
            </div>
          </div>

          {/* Grid Comprador & Destino */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-slate-300 rounded-xl p-4 bg-slate-50/50 print:bg-transparent">
            <div className="space-y-1.5">
              <h4 className="text-[11px] font-black uppercase text-slate-600 flex items-center gap-1.5">
                <Building2 size={13} className="text-slate-500" />
                Dados do Destinatário / Comprador
              </h4>
              <p className="font-bold text-sm text-slate-900">{order.buyerOrgName || order.buyerName}</p>
              {order.buyerCpfCnpj && (
                <p className="text-slate-600">CNPJ/CPF: <strong className="font-mono">{order.buyerCpfCnpj}</strong></p>
              )}
              <p className="text-slate-600">Contato: {order.buyerName}</p>
              <p className="text-slate-600">E-mail: {order.buyerEmail}</p>
              {order.buyerPhone && <p className="text-slate-600">Telefone/WhatsApp: {order.buyerPhone}</p>}
            </div>

            <div className="space-y-1.5 border-t md:border-t-0 md:border-l border-slate-200 md:pl-4 pt-2 md:pt-0">
              <h4 className="text-[11px] font-black uppercase text-slate-600 flex items-center gap-1.5">
                <MapPin size={13} className="text-slate-500" />
                Endereço de Entrega
              </h4>
              {order.buyerAddress ? (
                <div className="text-slate-800 leading-relaxed font-medium">
                  <p>{order.buyerAddress.street || 'Endereço'}, Nº {order.buyerAddress.number || 'S/N'}</p>
                  {order.buyerAddress.complement && <p className="text-slate-600">Compl: {order.buyerAddress.complement}</p>}
                  <p>Bairro: {order.buyerAddress.neighborhood || '-'}</p>
                  <p className="font-bold">{order.buyerAddress.city || '-'} - {order.buyerAddress.state || '-'} • CEP: {order.buyerAddress.zipCode || '-'}</p>
                </div>
              ) : (
                <p className="text-slate-400 italic">Endereço não informado / Entrega a combinar</p>
              )}

              <div className="mt-2 pt-2 border-t border-slate-200 text-slate-700">
                <p>
                  Modalidade de Frete: <strong>{order.shippingMethod || 'Padrão'}</strong>
                  {order.shippingCost ? ` (R$ ${order.shippingCost.toFixed(2)})` : ' (Grátis)'}
                </p>
                {order.trackingCode && (
                  <p className="font-mono text-xs font-bold text-indigo-700 mt-0.5">
                    Rastreio: {order.trackingCode}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Tabela de Separação / Itens */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-xs uppercase text-slate-700 flex items-center gap-1.5">
                <CheckSquare size={14} className="text-indigo-600" />
                Conferência de Itens (Picking List)
              </h4>
              <span className="text-[11px] text-slate-500">Total de {order.items?.length || 0} item(ns)</span>
            </div>

            <table className="w-full border-collapse border border-slate-300 rounded-lg overflow-hidden text-left">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-[11px]">
                  <th className="p-2.5 border-r border-slate-300 w-10 text-center">OK</th>
                  <th className="p-2.5 border-r border-slate-300">Produto & Especificação</th>
                  <th className="p-2.5 border-r border-slate-300 w-20 text-center">Qtd</th>
                  <th className="p-2.5 border-r border-slate-300 w-28 text-right">Unitário</th>
                  <th className="p-2.5 w-28 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {order.items?.map((item, idx) => {
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-2.5 border-r border-slate-300 text-center">
                        <div className="w-4 h-4 border-2 border-slate-400 rounded-sm mx-auto"></div>
                      </td>
                      <td className="p-2.5 border-r border-slate-300">
                        <p className="font-bold text-slate-900">{item.name}</p>
                        {item.variationName && (
                          <p className="text-[10px] text-slate-500">Opção: {item.variationName}</p>
                        )}
                        {item.selectedOptions && item.selectedOptions.length > 0 && (
                          <p className="text-[10px] text-slate-500">
                            Detalhes: {item.selectedOptions.map(o => `${o.groupName}: ${o.optionName}`).join(' | ')}
                          </p>
                        )}
                      </td>
                      <td className="p-2.5 border-r border-slate-300 text-center font-mono font-bold text-sm text-slate-900">
                        {item.quantity}
                      </td>
                      <td className="p-2.5 border-r border-slate-300 text-right font-mono text-slate-700">
                        R$ {item.price.toFixed(2)}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                        R$ {(item.price * item.quantity).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totais & Observações */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 text-[11px] space-y-1">
              <p className="font-bold text-slate-700">Observações do Pedido / Notas do Cliente:</p>
              <p className="text-slate-600 italic">
                {order.notes ? order.notes : 'Nenhuma observação especial informada.'}
              </p>
              {order.internalNotes && (
                <div className="mt-2 pt-2 border-t border-slate-200">
                  <span className="font-bold text-amber-900">Nota Interna da Expedição:</span>
                  <p className="text-slate-700">{order.internalNotes}</p>
                </div>
              )}
            </div>

            <div className="p-3 border border-slate-300 rounded-xl space-y-1.5 font-mono text-xs text-right">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal Produtos:</span>
                <span>R$ {(order.subtotalProducts || (order.totalValue - (order.shippingCost || 0) + (order.discountValue || 0))).toFixed(2)}</span>
              </div>
              {order.shippingCost ? (
                <div className="flex justify-between text-slate-600">
                  <span>Frete ({order.shippingMethod || 'Logística'}):</span>
                  <span>R$ {order.shippingCost.toFixed(2)}</span>
                </div>
              ) : null}
              {order.discountValue ? (
                <div className="flex justify-between text-emerald-600">
                  <span>Desconto Aplicado {order.couponCode ? `(${order.couponCode})` : ''}:</span>
                  <span>- R$ {order.discountValue.toFixed(2)}</span>
                </div>
              ) : null}
              <div className="flex justify-between font-black text-sm text-slate-900 pt-2 border-t border-slate-300">
                <span>TOTAL DO PEDIDO:</span>
                <span>R$ {order.totalValue.toFixed(2)}</span>
              </div>
              <div className="text-[10px] text-slate-500 font-sans mt-1">
                Pagamento: <strong>{order.paymentMethod === 'PIX' ? 'PIX' : order.paymentMethod === 'CREDIT_CARD' ? 'Cartão de Crédito' : 'Boleto Bancário'}</strong> • Status: <strong className="text-emerald-700">{order.paymentStatus === 'PAID' ? 'PAGO / CONFIRMADO' : order.paymentStatus || 'PAGO'}</strong>
              </div>
            </div>
          </div>

          {/* Assinatura de Conferência */}
          <div className="border-t border-slate-300 pt-6 grid grid-cols-2 gap-8 text-center text-[10px] text-slate-500">
            <div>
              <div className="border-b border-slate-400 pb-1 mb-1"></div>
              <p>Conferido e Separado por (Nome e Visto)</p>
            </div>
            <div>
              <div className="border-b border-slate-400 pb-1 mb-1"></div>
              <p>Embalado e Despachado por (Data e Hora)</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 print:hidden">
          <span>Dica: Use a tecla Ctrl+P para imprimir diretamente ou salvar em PDF.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
