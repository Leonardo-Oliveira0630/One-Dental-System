import React, { useState } from 'react';
import { 
  Truck, 
  Key, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  Package, 
  Clock, 
  Percent, 
  DollarSign, 
  MapPin, 
  HelpCircle,
  Sparkles,
  Zap
} from 'lucide-react';
import { Organization } from '../types';
import { testFrenetConnection, formatCep, cleanCep, getCarrierBadgeConfig } from '../services/frenetService';

interface FrenetConfigCardProps {
  organization: Partial<Organization>;
  onSave: (updates: Partial<Organization>) => Promise<void>;
  title?: string;
  description?: string;
  isSupplier?: boolean;
}

export const FrenetConfigCard: React.FC<FrenetConfigCardProps> = ({
  organization,
  onSave,
  title = "Integração Logística Frenet",
  description = "Conecte sua conta da Frenet para calcular cotações automáticas de frete (Correios, Jadlog, Loggi, etc.) no checkout da sua loja e rastrear encomendas em tempo real.",
  isSupplier = false
}) => {
  const [frenetToken, setFrenetToken] = useState(organization.frenetToken || '');
  const [frenetKey, setFrenetKey] = useState(organization.frenetKey || '');
  const [frenetOriginCep, setFrenetOriginCep] = useState(organization.frenetOriginCep || organization.cep || '');
  const [frenetHandlingDays, setFrenetHandlingDays] = useState<number>(organization.frenetHandlingDays ?? 1);
  const [frenetExtraPercentage, setFrenetExtraPercentage] = useState<number>(organization.frenetExtraPercentage ?? 0);
  const [frenetExtraFixed, setFrenetExtraFixed] = useState<number>(organization.frenetExtraFixed ?? 0);
  const [frenetEnabled, setFrenetEnabled] = useState<boolean>(organization.frenetEnabled ?? Boolean(organization.frenetToken));
  const [frenetFreeShippingEnabled, setFrenetFreeShippingEnabled] = useState<boolean>(organization.frenetFreeShippingEnabled ?? false);
  const [frenetFreeShippingThreshold, setFrenetFreeShippingThreshold] = useState<number>(organization.frenetFreeShippingThreshold ?? 300);
  
  // Dimensões Padrão da Embalagem
  const defaultPkg = organization.frenetDefaultPackage || {
    weightKg: isSupplier ? 0.5 : 0.3,
    heightCm: isSupplier ? 12 : 8,
    widthCm: isSupplier ? 15 : 12,
    lengthCm: isSupplier ? 20 : 16
  };
  const [pkgWeight, setPkgWeight] = useState<number>(defaultPkg.weightKg);
  const [pkgHeight, setPkgHeight] = useState<number>(defaultPkg.heightCm);
  const [pkgWidth, setPkgWidth] = useState<number>(defaultPkg.widthCm);
  const [pkgLength, setPkgLength] = useState<number>(defaultPkg.lengthCm);

  const [showToken, setShowToken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Teste de Conexão
  const [testCep, setTestCep] = useState('01001000'); // Praça da Sé, SP
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    servicesFound: number;
    availableCarriers: string[];
    quotes: any[];
  } | null>(null);

  const handleTestConnection = async () => {
    if (!frenetToken.trim()) {
      alert('Por favor, informe o Token da Frenet antes de testar.');
      return;
    }
    const origCep = frenetOriginCep.trim() || organization.cep || '';
    if (!cleanCep(origCep) || cleanCep(origCep).length !== 8) {
      alert('Por favor, informe um CEP de origem válido com 8 dígitos.');
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testFrenetConnection(frenetToken, origCep, testCep);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Erro ao testar conexão com a Frenet.',
        servicesFound: 0,
        availableCarriers: [],
        quotes: []
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const updates: Partial<Organization> = {
        frenetToken: frenetToken.trim(),
        frenetKey: frenetKey.trim(),
        frenetOriginCep: cleanCep(frenetOriginCep),
        frenetHandlingDays: Number(frenetHandlingDays) || 0,
        frenetExtraPercentage: Number(frenetExtraPercentage) || 0,
        frenetExtraFixed: Number(frenetExtraFixed) || 0,
        frenetEnabled: Boolean(frenetEnabled),
        frenetFreeShippingEnabled: Boolean(frenetFreeShippingEnabled),
        frenetFreeShippingThreshold: Number(frenetFreeShippingThreshold) || 0,
        frenetDefaultPackage: {
          weightKg: Number(pkgWeight) || 0.3,
          heightCm: Number(pkgHeight) || 8,
          widthCm: Number(pkgWidth) || 12,
          lengthCm: Number(pkgLength) || 16
        }
      };

      await onSave(updates);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao salvar configurações da Frenet: ' + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  const isConfigured = Boolean(frenetToken && frenetToken.trim().length > 5);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
            <Truck size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{title}</h3>
              {isConfigured ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 size={11} /> Conectado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  Não Configurado
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <a
            href="https://painel.frenet.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200/80 dark:border-amber-800 rounded-xl transition-all"
          >
            <ExternalLink size={13} />
            <span>Painel Frenet</span>
          </a>
        </div>
      </div>

      {/* Main Settings Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: API Keys & Origin */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Key size={14} className="text-amber-500" />
              Chaves de Acesso da API
            </h4>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                checked={frenetEnabled}
                onChange={e => setFrenetEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 dark:border-slate-700"
              />
              Habilitar Cálculo Frenet
            </label>
          </div>

          {/* Token Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                Token Frenet (Obrigatório) <span className="text-red-500">*</span>
              </label>
              <a
                href="https://painel.frenet.com.br/configuracoes/dados-de-acesso"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
              >
                Como obter meu token? <ExternalLink size={10} />
              </a>
            </div>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                placeholder="Cole o Token da Frenet aqui (ex: 8A29F4...)"
                value={frenetToken}
                onChange={e => setFrenetToken(e.target.value)}
                className="w-full pr-10 pl-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
              No painel da Frenet, acesse <strong>Configurações &gt; Dados de Acesso</strong> e copie o Token gerado.
            </p>
          </div>

          {/* Key / Secret Adicional (Opcional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Chave Adicional / Chave de Acesso (Opcional)
            </label>
            <input
              type="text"
              placeholder="Chave pública ou usuário complementar se houver"
              value={frenetKey}
              onChange={e => setFrenetKey(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          {/* CEP de Origem */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <MapPin size={13} className="text-amber-500" />
                CEP de Origem / Expedição <span className="text-red-500">*</span>
              </label>
              {organization.cep && organization.cep !== frenetOriginCep && (
                <button
                  type="button"
                  onClick={() => setFrenetOriginCep(organization.cep || '')}
                  className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-bold"
                >
                  Usar CEP da Empresa ({formatCep(organization.cep)})
                </button>
              )}
            </div>
            <input
              type="text"
              placeholder="00000-000"
              maxLength={9}
              value={formatCep(frenetOriginCep)}
              onChange={e => setFrenetOriginCep(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
              CEP de onde as encomendas são despachadas para cálculo preciso da distância.
            </p>
          </div>
        </div>

        {/* Right Column: Operational Rules & Packaging */}
        <div className="space-y-4">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Clock size={14} className="text-amber-500" />
            Prazos &amp; Regras Comerciais
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Handling Days */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                Dias de Manuseio / Expedição
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="15"
                  value={frenetHandlingDays}
                  onChange={e => setFrenetHandlingDays(Math.max(0, parseInt(e.target.value || '0', 10)))}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-bold">
                  dia(s) útil(eis)
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                Prazo interno de fabricação/separação adicionado ao prazo dos Correios.
              </p>
            </div>

            {/* Extra Percentage */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                Acréscimo de Embalagem (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="0.5"
                  value={frenetExtraPercentage}
                  onChange={e => setFrenetExtraPercentage(Math.max(0, parseFloat(e.target.value || '0')))}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-bold">
                  %
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                Margem percentual extra sobre a cotação da transportadora.
              </p>
            </div>
          </div>

          {/* Frete Grátis */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-black text-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={frenetFreeShippingEnabled}
                  onChange={e => setFrenetFreeShippingEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 dark:border-slate-700"
                />
                <span className="flex items-center gap-1">
                  <Sparkles size={13} className="text-amber-500" />
                  Oferecer Frete Grátis
                </span>
              </label>
            </div>

            {frenetFreeShippingEnabled && (
              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  Frete Grátis para pedidos acima de (R$):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    R$
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="10"
                    value={frenetFreeShippingThreshold}
                    onChange={e => setFrenetFreeShippingThreshold(Math.max(0, parseFloat(e.target.value || '0')))}
                    className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Dimensões Padrão */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Package size={13} className="text-amber-500" />
              Dimensões Padrão da Embalagem ({isSupplier ? 'Produtos' : 'Caixa de Prótese'})
            </label>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="block text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase">Peso (kg)</label>
                <input
                  type="number"
                  step="0.05"
                  min="0.05"
                  value={pkgWeight}
                  onChange={e => setPkgWeight(parseFloat(e.target.value || '0.3'))}
                  className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-center"
                />
              </div>
              <div>
                <label className="block text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase">Alt (cm)</label>
                <input
                  type="number"
                  min="2"
                  value={pkgHeight}
                  onChange={e => setPkgHeight(parseInt(e.target.value || '8', 10))}
                  className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-center"
                />
              </div>
              <div>
                <label className="block text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase">Larg (cm)</label>
                <input
                  type="number"
                  min="5"
                  value={pkgWidth}
                  onChange={e => setPkgWidth(parseInt(e.target.value || '12', 10))}
                  className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-center"
                />
              </div>
              <div>
                <label className="block text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase">Comp (cm)</label>
                <input
                  type="number"
                  min="10"
                  value={pkgLength}
                  onChange={e => setPkgLength(parseInt(e.target.value || '16', 10))}
                  className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-center"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Diagnostic / Live Test Box */}
      <div className="p-4 sm:p-5 bg-gradient-to-br from-amber-50/60 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10 border border-amber-200/80 dark:border-amber-900/40 rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h5 className="text-xs font-black text-amber-950 dark:text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
              <Zap size={14} className="text-amber-600 dark:text-amber-400" />
              Testar Conexão e Simular Cotação em Tempo Real
            </h5>
            <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
              Valide se suas chaves estão ativas e confira as transportadoras que respondem à sua conta da Frenet.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-28 sm:w-32">
              <input
                type="text"
                maxLength={9}
                placeholder="CEP Destino"
                value={formatCep(testCep)}
                onChange={e => setTestCep(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-xl text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <button
              type="button"
              disabled={isTesting || !frenetToken.trim()}
              onClick={handleTestConnection}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-black rounded-xl transition-all shadow-xs active:scale-95"
            >
              {isTesting ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
              <span>{isTesting ? 'Testando...' : 'Testar Conexão'}</span>
            </button>
          </div>
        </div>

        {/* Test Results Display */}
        {testResult && (
          <div className={`p-3.5 rounded-xl border text-xs space-y-2.5 transition-all ${
            testResult.success
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
          }`}>
            <div className="flex items-center gap-2 font-bold">
              {testResult.success ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>

            {testResult.success && testResult.quotes.length > 0 && (
              <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60">
                <div className="text-[11px] font-black uppercase text-emerald-800 dark:text-emerald-300 mb-2">
                  Opções Retornadas pela Frenet para o CEP {formatCep(testCep)}:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {testResult.quotes.map((q, idx) => {
                    const badge = getCarrierBadgeConfig(q.Carrier);
                    return (
                      <div
                        key={idx}
                        className="p-2.5 bg-white/90 dark:bg-slate-900/90 rounded-xl border border-emerald-100 dark:border-slate-800 shadow-xs space-y-1"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-black text-slate-800 dark:text-white text-xs">{q.ServiceDescription}</span>
                          <span className="font-mono font-black text-xs text-amber-700 dark:text-amber-400">
                            {q.isFreeShipping ? 'Grátis' : `R$ ${Number(q.ShippingPrice).toFixed(2)}`}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10.5px] text-slate-500 dark:text-slate-400">
                          <span>{q.Carrier}</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">{q.DeliveryTime} dias úteis</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {saveSuccess && (
            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
              <CheckCircle2 size={14} /> Configurações da Frenet salvas com sucesso!
            </span>
          )}
        </div>

        <button
          type="button"
          disabled={isSaving}
          onClick={handleSaveConfig}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs uppercase tracking-wider rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-md active:scale-95 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>Salvando...</span>
            </>
          ) : (
            <>
              <Truck size={14} />
              <span>Salvar Configurações de Frete</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
