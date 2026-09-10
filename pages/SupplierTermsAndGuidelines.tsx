import React from 'react';
import { 
  FileText, ArrowLeft, ShieldCheck, CheckCircle2, AlertTriangle, 
  Scale, Truck, RotateCcw, Award, PhoneCall, Building2, Printer, 
  HelpCircle, ExternalLink, Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SupplierTermsAndGuidelines = () => {
  const navigate = useNavigate();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10 font-sans text-slate-900">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Navigation Bar */}
        <div className="flex items-center justify-between no-print">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-bold text-xs uppercase tracking-wider bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-xs"
          >
            <ArrowLeft size={16} />
            <span>Voltar</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl border border-indigo-200 transition-colors font-bold text-xs shadow-xs"
          >
            <Printer size={16} />
            <span>Imprimir / Salvar PDF</span>
          </button>
        </div>

        {/* Main Document Card */}
        <div className="bg-white p-6 sm:p-10 md:p-12 rounded-3xl shadow-sm border border-slate-200 space-y-8">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-6 border-b border-slate-100">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 border border-indigo-100 shadow-xs">
              <Scale size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100">
                  Regulamento Oficial Marketplace LabProx
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Versão 1.0 (2026)
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 tracking-tight">
                Termos e Diretrizes para Fornecedores
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Regras de homologação, compliance regulatório ANVISA/CRO, políticas de frete, devolução e níveis de serviço (SLA).
              </p>
            </div>
          </div>

          {/* Quick Summary Pill Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex items-start gap-2.5 p-2 bg-white rounded-xl border border-slate-200/80">
              <ShieldCheck className="text-emerald-600 shrink-0 mt-0.5" size={16} />
              <div>
                <p className="font-bold text-slate-800">Conformidade Regulatória</p>
                <p className="text-slate-500 text-[11px]">Registro ANVISA obrigatório em materiais e insumos dentais.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-2 bg-white rounded-xl border border-slate-200/80">
              <RotateCcw className="text-indigo-600 shrink-0 mt-0.5" size={16} />
              <div>
                <p className="font-bold text-slate-800">Direito de Arrependimento</p>
                <p className="text-slate-500 text-[11px]">Prazo mínimo legal de 7 dias com logística reversa garantida.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-2 bg-white rounded-xl border border-slate-200/80">
              <PhoneCall className="text-blue-600 shrink-0 mt-0.5" size={16} />
              <div>
                <p className="font-bold text-slate-800">SLA de Atendimento</p>
                <p className="text-slate-500 text-[11px]">Resposta em até 24h úteis a dúvidas e chamados de compradores.</p>
              </div>
            </div>
          </div>

          {/* Document Content */}
          <div className="prose prose-slate max-w-none prose-headings:font-black prose-headings:text-slate-900 prose-p:text-slate-600 prose-p:text-sm sm:prose-p:text-base prose-p:leading-relaxed space-y-8">
            
            <section className="space-y-3">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                OBJETO E ACEITE
              </h2>
              <p>
                1.1. Estes Termos e Diretrizes para Fornecedores ("Termos") estabelecem as regras aplicáveis aos fornecedores que desejarem cadastrar, administrar e comercializar produtos e serviços por meio do Marketplace LabProx ("Marketplace").
              </p>
              <p>
                1.2. O Marketplace LabProx integra o ecossistema LabProx e tem como finalidade conectar fornecedores homologados a laboratórios de prótese odontológica, clínicas, consultórios, cirurgiões-dentistas e demais compradores profissionais autorizados a utilizar a plataforma.
              </p>
              <p>
                1.3. Ao solicitar a criação de uma loja, cadastrar produtos, publicar ofertas ou realizar qualquer operação comercial por meio do Marketplace, o fornecedor declara que leu, compreendeu e concorda integralmente com estes Termos, com os Termos de Uso do LabProx, com a Política de Privacidade e com as demais políticas aplicáveis à plataforma.
              </p>
              <p>
                1.4. O fornecedor declara possuir capacidade legal, registros societários regulares e plenos poderes para assumir as obrigações aqui dispostas.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                CADASTRO, HOMOLOGAÇÃO E RESPONSABILIDADE DA LOJA
              </h2>
              <p>
                2.1. Para comercializar no Marketplace LabProx, o fornecedor deverá fornecer informações verídicas, completas e atualizadas, incluindo:
              </p>
              <ul className="list-disc pl-6 space-y-1.5 text-sm text-slate-600">
                <li>Razão Social, Nome Fantasia, CNPJ ativo e Inscrição Estadual/Municipal;</li>
                <li>Endereço físico de expedição para cálculo de frete e devoluções;</li>
                <li>Dados de contato comercial, e-mail de suporte e canais de atendimento;</li>
                <li>Nome e CPF do Representante Legal e/ou Responsável Técnico quando aplicável;</li>
                <li>Dados bancários e carteira digital de recebimentos (Asaas Wallet ID) para processamento de splits financeiros.</li>
              </ul>
              <p>
                2.2. O fornecedor é o único e exclusivo responsável pela exatidão, idoneidade e veracidade dos dados cadastrais fornecidos, respondendo cível, penal e administrativamente por qualquer divergência ou fraude.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">3</span>
                PRODUTOS REGULADOS, ANVISA E CONFORMIDADE ODONTOLÓGICA
              </h2>
              <p>
                3.1. Tratando-se de mercado de saúde e odontologia, todo e qualquer produto anunciado que seja classificado como insumo de uso odontológico, implante, biomaterial, resina, anestésico ou equipamento médico-hospitalar <strong>deve possuir registro ou cadastro válido perante a Agência Nacional de Vigilância Sanitária (ANVISA)</strong>, nos termos da legislação federal vigente.
              </p>
              <p>
                3.2. É expressamente <strong>vedado</strong> no Marketplace LabProx:
              </p>
              <ul className="list-disc pl-6 space-y-1.5 text-sm text-slate-600">
                <li>A comercialização de produtos clandestinos, recondicionados ou reprocessados sem expressa autorização sanitária;</li>
                <li>A venda de produtos com data de validade vencida ou próxima do vencimento sem aviso explícito e consentimento prévio;</li>
                <li>A omissão de número de lote, número de registro ANVISA e instruções obrigatórias do fabricante;</li>
                <li>A comercialização de produtos sem a devida emissão de Nota Fiscal Eletrônica (NF-e).</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">4</span>
                POLÍTICA DE ENVIO, PRAZOS E RASTREAMENTO
              </h2>
              <p>
                4.1. <strong>Prazo de Despacho:</strong> O fornecedor se compromete a despachar as mercadorias dentro do prazo declarado em sua política de loja (máximo padrão de 1 a 3 dias úteis após a confirmação do pagamento).
              </p>
              <p>
                4.2. <strong>Rastreabilidade:</strong> Todo pedido despachado por transportadora, Correios ou motoboy deve conter o respectivo código de rastreio ou comprovante de entrega inserido diretamente no painel do fornecedor para atualização do status em tempo real para o comprador.
              </p>
              <p>
                4.3. <strong>Embalagem e Integridade:</strong> O fornecedor é responsável pelo acondicionamento seguro dos produtos, utilizando embalagens adequadas que protejam itens frágeis, líquidos e matérias-primas sensíveis a temperatura e impacto.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">5</span>
                POLÍTICA DE DEVOLUÇÃO, ARREPENDIMENTO E TROCA (CDC)
              </h2>
              <p>
                5.1. <strong>Direito de Arrependimento (Art. 49 do CDC):</strong> O comprador tem o direito de solicitar a devolução ou desistência da compra no prazo de <strong>7 (sete) dias corridos</strong> a contar do recebimento do produto, nas compras não presenciais.
              </p>
              <p>
                5.2. <strong>Logística Reversa:</strong> Nos casos de arrependimento tempestivo ou produto entregue com avaria/vício/divergência, os custos de frete da devolução (logística reversa) serão integralmente arcados pelo fornecedor.
              </p>
              <p>
                5.3. <strong>Restituição de Valores:</strong> Após o recebimento do item devolvido e a conferência de suas condições originais, o reembolso ou estorno do pagamento será formalizado pelo intermediador financeiro.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">6</span>
                GARANTIA LEGAL E DO FABRICANTE
              </h2>
              <p>
                6.1. Todos os produtos duráveis contam com garantia legal mínima de <strong>90 (noventa) dias</strong> contra defeitos de fabricação ou vícios ocultos, em consonância com o Código de Defesa do Consumidor.
              </p>
              <p>
                6.2. Equipamentos odontológicos e periféricos que possuam garantia contratual estendida do fabricante devem conter no anúncio a especificação clara do período de cobertura e os canais de assistência técnica autorizada.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">7</span>
                NÍVEIS DE SERVIÇO (SLA) E ATENDIMENTO AO COMPRADOR
              </h2>
              <p>
                7.1. O fornecedor compromete-se a prestar suporte claro, prestativo e cordial, respondendo às dúvidas, solicitações de pós-venda e chamados de suporte dos clientes no prazo máximo de <strong>24 (vinte e quatro) horas úteis</strong>.
              </p>
              <p>
                7.2. A plataforma LabProx reserva-se o direito de intermediar contatos em caso de reclamações reiteradas ou falta de retorno do fornecedor, podendo aplicar sanções temporárias em caso de descumprimento injustificado de SLA.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">8</span>
                DISTINÇÃO ENTRE POLÍTICA DO MARKETPLACE E POLÍTICA DA LOJA
              </h2>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs sm:text-sm">
                <p>
                  <strong>Políticas Obrigatórias do Marketplace LabProx:</strong> São normas universais inegociáveis de conformidade legal, segurança, proteção ao consumidor, certificação ANVISA, emissão de nota fiscal e prazos mínimos legais.
                </p>
                <p>
                  <strong>Políticas Personalizadas da Loja:</strong> São os termos customizados pelo fornecedor dentro do painel, tais como: regras de frete grátis por faixa de valor, prazos reduzidos de expedição (ex: mesmo dia), opções de retirada local, políticas de combos promocionais e detalhes específicos de atendimento de sua marca. As políticas da loja jamais poderão contrariar ou reduzir as garantias das Políticas do Marketplace.
                </p>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">9</span>
                PROCESSAMENTO FINANCEIRO, SPLIT E LIQUIDAÇÃO
              </h2>
              <p>
                9.1. As transações financeiras geradas pelas compras no Marketplace são processadas de forma automatizada através do gateway Asaas. O fornecedor receberá os créditos de suas vendas deduzidas as eventuais taxas de intermediação da plataforma, em sua respectiva subconta ou carteira autorizada.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">10</span>
                FORO E LEGISLAÇÃO APLICÁVEL
              </h2>
              <p>
                10.1. Estes Termos são regidos pelas leis da República Federativa do Brasil. Para dirimir quaisquer litígios oriundos deste instrumento, as partes elegem o foro da Comarca de domicílio da sede da plataforma LabProx, com expressa renúncia a qualquer outro.
              </p>
            </section>

          </div>

          {/* Footer Info */}
          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <div className="flex items-center gap-2">
              <Lock size={14} className="text-indigo-600" />
              <span>LabProx Marketplace • Sistema de Gestão Odontológica e Protética</span>
            </div>
            <p className="font-mono">Versão 1.0 (2026) • Documento Homologado</p>
          </div>

        </div>

      </div>
    </div>
  );
};
