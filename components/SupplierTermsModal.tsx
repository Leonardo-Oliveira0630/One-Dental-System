import React from 'react';
import { 
  X, Scale, ShieldCheck, RotateCcw, Truck, Award, PhoneCall, 
  ExternalLink, Printer, CheckCircle2, Lock 
} from 'lucide-react';

interface SupplierTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupplierTermsModal: React.FC<SupplierTermsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
              <Scale size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  LabProx Marketplace
                </span>
                <span className="text-[10px] font-mono text-slate-400">Versão 1.0 (2026)</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Termos e Diretrizes para Fornecedores
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open('#/supplier-terms', '_blank')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors border border-indigo-200"
              title="Abrir em nova aba"
            >
              <ExternalLink size={14} />
              <span>Página Completa</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body with Scrollable Terms */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-slate-700 text-xs sm:text-sm leading-relaxed">
          
          <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl flex items-start gap-3">
            <ShieldCheck size={20} className="text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900 text-xs sm:text-sm">Regulamento Operacional e de Conformidade</p>
              <p className="text-slate-600 text-xs mt-0.5">
                Este documento rege a comercialização de insumos, equipamentos e materiais odontológicos no Marketplace LabProx. O cumprimento destas diretrizes é obrigatório para manter sua loja ativa.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-indigo-100 text-indigo-700 text-[11px] font-black flex items-center justify-center">1</span>
                Objeto e Aceite
              </h4>
              <p className="text-slate-600">
                O Marketplace LabProx conecta fornecedores homologados a laboratórios de prótese, clínicas odontológicas e dentistas em todo o Brasil. Ao cadastrar produtos ou operar na plataforma, o fornecedor adere integralmente a estes Termos, à Política de Privacidade e às diretrizes sanitárias cabíveis.
              </p>
            </div>

            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-indigo-100 text-indigo-700 text-[11px] font-black flex items-center justify-center">2</span>
                Cadastro, Dados e Responsabilidade Legal
              </h4>
              <p className="text-slate-600">
                O fornecedor é integralmente responsável pela veracidade de sua Razão Social, CNPJ, dados de faturamento, responsável técnico ou legal, e pelo endereço de despacho informado para cotações de frete e logística reversa.
              </p>
            </div>

            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-indigo-100 text-indigo-700 text-[11px] font-black flex items-center justify-center">3</span>
                Produtos Regulados e Exigência ANVISA
              </h4>
              <p className="text-slate-600">
                Insumos, resinas, biomateriais, ligas metálicas, anestésicos e equipamentos odontológicos devem obrigatoriamente possuir registro ou cadastro válido na ANVISA. É terminantemente proibida a venda de produtos sem lote, com validade expirada ou reprocessados sem autorização sanitária.
              </p>
            </div>

            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-indigo-100 text-indigo-700 text-[11px] font-black flex items-center justify-center">4</span>
                Política de Envio e Rastreabilidade
              </h4>
              <p className="text-slate-600">
                Os pedidos devem ser despachados no prazo estipulado (padrão de 1 a 3 dias úteis), acompanhados de código de rastreamento inserido no painel para que o laboratório/dentista acompanhe a entrega em tempo real.
              </p>
            </div>

            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-indigo-100 text-indigo-700 text-[11px] font-black flex items-center justify-center">5</span>
                Devoluções, Direito de Arrependimento e Garantia (CDC)
              </h4>
              <p className="text-slate-600">
                É garantido ao comprador o prazo de 7 (sete) dias corridos para devolução por arrependimento nas compras não presenciais (Art. 49 do CDC), com frete de logística reversa custeado pelo fornecedor. Produtos duráveis contam com garantia legal de 90 dias contra vícios de fabricação.
              </p>
            </div>

            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-indigo-100 text-indigo-700 text-[11px] font-black flex items-center justify-center">6</span>
                SLA de Atendimento e Pós-Venda
              </h4>
              <p className="text-slate-600">
                O fornecedor se compromete a manter nível de serviço adequado, respondendo a dúvidas, solicitações e eventuais divergências de pedidos no prazo máximo de 24 horas úteis.
              </p>
            </div>

            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-indigo-100 text-indigo-700 text-[11px] font-black flex items-center justify-center">7</span>
                Políticas Globais vs. Políticas Customizadas
              </h4>
              <p className="text-slate-600">
                As políticas personalizadas da loja (como promoções, frete grátis por valor mínimo e canais de WhatsApp) complementam, mas nunca sobrepõem ou reduzem os direitos garantidos pelas Políticas Oficiais do Marketplace LabProx e pelo Código de Defesa do Consumidor.
              </p>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Lock size={14} className="text-indigo-600" />
            <span>Documento Oficial LabProx Marketplace</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
          >
            Entendido / Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
