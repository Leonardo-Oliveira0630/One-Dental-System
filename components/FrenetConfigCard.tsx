import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Package, 
  Clock, 
  Sparkles,
  Zap,
  Building2,
  MapPin,
  Mail,
  Phone,
  FileText,
  RefreshCw,
  Info,
  Sliders,
  Check
} from 'lucide-react';
import { Organization } from '../types';
import { formatCep, cleanCep, getCarrierBadgeConfig } from '../services/frenetService';
import { apiOnboardFrenetPartner, apiCalculateFrenetShipping, apiGetFrenetLogisticsStatus } from '../services/firebaseService';

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
  title = "Frenet • Logística Oficial Integrada",
  description = "Calcule fretes, gere etiquetas e acompanhe seus envios diretamente pelo LabProx como plataforma parceira.",
  isSupplier = true
}) => {
  const [logisticsStatus, setLogisticsStatus] = useState<'unconfigured' | 'pending' | 'active' | 'error'>(
    organization.logistics?.status || (organization.frenetToken || organization.logistics?.frenetCustomerToken ? 'active' : 'unconfigured')
  );
  
  const [originCep, setOriginCep] = useState(
    organization.logistics?.originCep || organization.frenetOriginCep || organization.cep || ''
  );
  const [handlingDays, setHandlingDays] = useState<number>(organization.frenetHandlingDays ?? 1);
  const [extraPercentage, setExtraPercentage] = useState<number>(organization.frenetExtraPercentage ?? 0);
  const [extraFixed, setExtraFixed] = useState<number>(organization.frenetExtraFixed ?? 0);
  const [freeShippingEnabled, setFreeShippingEnabled] = useState<boolean>(organization.frenetFreeShippingEnabled ?? false);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number>(organization.frenetFreeShippingThreshold ?? 300);

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

  const [isActivating, setIsActivating] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [activationSuccess, setActivationSuccess] = useState(false);

  const [showManualToken, setShowManualToken] = useState(false);
  const [manualToken, setManualToken] = useState(organization.frenetToken || organization.logistics?.frenetCustomerToken || '');
  const [isSavingManualToken, setIsSavingManualToken] = useState(false);

  const [isSavingOptions, setIsSavingOptions] = useState(false);
  const [optionsSaveSuccess, setOptionsSaveSuccess] = useState(false);

  // Modal de Validação / Complemento de Cadastro
  const [showDataModal, setShowDataModal] = useState(false);
  const [merchantForm, setMerchantForm] = useState({
    name: organization.name || '',
    email: organization.email || '',
    cpfCnpj: organization.cpfCnpj || '',
    phone: organization.phone || organization.whatsapp || '',
    cep: organization.cep || organization.frenetOriginCep || '',
    address: organization.address || '',
    number: organization.number || '',
    complement: organization.complement || '',
    neighborhood: organization.neighborhood || '',
    city: organization.city || '',
    state: organization.state || ''
  });

  // Teste de Cotação em Tempo Real
  const [testCep, setTestCep] = useState('01001-000'); // Praça da Sé, SP
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    servicesFound: number;
    availableCarriers: string[];
    quotes: any[];
  } | null>(null);

  // Sincroniza status inicial se houver ID
  useEffect(() => {
    if (organization.id) {
      apiGetFrenetLogisticsStatus(organization.id)
        .then((res: any) => {
          if (res?.status) {
            setLogisticsStatus(res.status);
            if (res.originCep && !originCep) {
              setOriginCep(res.originCep);
            }
          }
        })
        .catch(() => {
          // Mantém estado baseado em props se falhar
        });
    }
  }, [organization.id]);

  const isAccountActive = logisticsStatus === 'active';

  // Verifica se todos os campos obrigatórios estão presentes no cadastro
  const checkMissingFields = () => {
    const missing: string[] = [];
    if (!merchantForm.name.trim()) missing.push('Razão Social / Nome');
    if (!merchantForm.email.trim()) missing.push('E-mail');
    if (!merchantForm.cpfCnpj.trim()) missing.push('CPF / CNPJ');
    if (!merchantForm.phone.trim()) missing.push('Telefone / WhatsApp');
    if (!cleanCep(merchantForm.cep) || cleanCep(merchantForm.cep).length !== 8) missing.push('CEP de Expedição');
    if (!merchantForm.address.trim()) missing.push('Logradouro / Rua');
    if (!merchantForm.number.trim()) missing.push('Número do Endereço');
    if (!merchantForm.neighborhood.trim()) missing.push('Bairro');
    if (!merchantForm.city.trim()) missing.push('Cidade');
    if (!merchantForm.state.trim() || merchantForm.state.trim().length !== 2) missing.push('Estado (UF)');
    return missing;
  };

  const handleStartActivation = () => {
    setActivationError(null);
    const missing = checkMissingFields();
    if (missing.length > 0) {
      // Abre modal para que o usuário complete os campos faltantes
      setShowDataModal(true);
    } else {
      executeActivation(merchantForm);
    }
  };

  const executeActivation = async (dataToSend: typeof merchantForm) => {
    if (!organization.id) {
      alert('Identificador da organização não encontrado.');
      return;
    }
    setIsActivating(true);
    setActivationError(null);
    setActivationSuccess(false);

    try {
      const res = await apiOnboardFrenetPartner(organization.id, {
        name: dataToSend.name.trim(),
        email: dataToSend.email.trim(),
        cpfCnpj: dataToSend.cpfCnpj.trim(),
        phone: dataToSend.phone.trim(),
        cep: cleanCep(dataToSend.cep),
        address: dataToSend.address.trim(),
        number: dataToSend.number.trim(),
        complement: dataToSend.complement.trim(),
        neighborhood: dataToSend.neighborhood.trim(),
        city: dataToSend.city.trim(),
        state: dataToSend.state.trim().toUpperCase()
      });

      if (res?.success) {
        setLogisticsStatus('active');
        setActivationSuccess(true);
        setShowDataModal(false);
        setOriginCep(dataToSend.cep);
        
        // Atualiza o estado da organização no componente pai
        await onSave({
          frenetOriginCep: cleanCep(dataToSend.cep),
          frenetEnabled: true,
          logistics: {
            provider: 'frenet',
            enabled: true,
            status: 'active',
            originCep: cleanCep(dataToSend.cep),
            isPartnerManaged: true,
            updatedAt: new Date()
          },
          cep: cleanCep(dataToSend.cep),
          address: dataToSend.address.trim(),
          number: dataToSend.number.trim(),
          complement: dataToSend.complement.trim(),
          neighborhood: dataToSend.neighborhood.trim(),
          city: dataToSend.city.trim(),
          state: dataToSend.state.trim().toUpperCase()
        });

        setTimeout(() => setActivationSuccess(false), 5000);
      } else {
        throw new Error(res?.message || 'Não foi possível ativar a conta Frenet.');
      }
    } catch (err: any) {
      console.error('[Frenet Activation Error]', err);
      const errMsg = err?.details || err?.message || 'Erro ao conectar à Frenet. Verifique os dados cadastrais.';
      setActivationError(errMsg);
      setLogisticsStatus('error');
    } finally {
      setIsActivating(false);
    }
  };

  const handleSaveManualToken = async () => {
    if (!manualToken.trim()) {
      alert('Informe um Token Frenet válido.');
      return;
    }
    if (!originCep || cleanCep(originCep).length !== 8) {
      alert('Informe o CEP de Origem da expedição.');
      return;
    }

    setIsSavingManualToken(true);
    try {
      await onSave({
        frenetToken: manualToken.trim(),
        frenetOriginCep: cleanCep(originCep),
        frenetEnabled: true,
        logistics: {
          provider: 'frenet',
          enabled: true,
          status: 'active',
          frenetCustomerToken: manualToken.trim(),
          originCep: cleanCep(originCep),
          isPartnerManaged: false,
          updatedAt: new Date()
        }
      });
      setLogisticsStatus('active');
      setShowManualToken(false);
      alert('Token Frenet vinculado com sucesso!');
    } catch (err: any) {
      console.error(err);
      alert('Erro ao salvar token Frenet: ' + (err.message || err));
    } finally {
      setIsSavingManualToken(false);
    }
  };

  const handleSaveOperationalRules = async () => {
    setIsSavingOptions(true);
    setOptionsSaveSuccess(false);
    try {
      const updates: Partial<Organization> = {
        frenetOriginCep: cleanCep(originCep),
        frenetHandlingDays: Number(handlingDays) || 0,
        frenetExtraPercentage: Number(extraPercentage) || 0,
        frenetExtraFixed: Number(extraFixed) || 0,
        frenetEnabled: isAccountActive,
        frenetFreeShippingEnabled: Boolean(freeShippingEnabled),
        frenetFreeShippingThreshold: Number(freeShippingThreshold) || 0,
        frenetDefaultPackage: {
          weightKg: Number(pkgWeight) || 0.3,
          heightCm: Number(pkgHeight) || 8,
          widthCm: Number(pkgWidth) || 12,
          lengthCm: Number(pkgLength) || 16
        },
        logistics: {
          ...(organization.logistics || {
            provider: 'frenet',
            isPartnerManaged: true
          }),
          enabled: isAccountActive,
          status: isAccountActive ? 'active' : 'unconfigured',
          originCep: cleanCep(originCep),
          updatedAt: new Date()
        }
      };

      await onSave(updates);
      setOptionsSaveSuccess(true);
      setTimeout(() => setOptionsSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao salvar opções operacionais: ' + (err.message || err));
    } finally {
      setIsSavingOptions(false);
    }
  };

  const handleTestQuote = async () => {
    const destCep = cleanCep(testCep);
    if (!destCep || destCep.length !== 8) {
      alert('Informe um CEP de destino válido com 8 dígitos.');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const sampleItem = {
        id: 'TEST-ITEM-1',
        name: 'Item de Teste Logístico',
        price: 150.00,
        quantity: 1,
        weight: Number(pkgWeight) || 0.5,
        height: Number(pkgHeight) || 10,
        width: Number(pkgWidth) || 15,
        length: Number(pkgLength) || 20
      };

      const res = await apiCalculateFrenetShipping({
        orgId: organization.id,
        originCep: cleanCep(originCep),
        destinationCep: destCep,
        items: [sampleItem],
        handlingDays: Number(handlingDays) || 0,
        extraPercentage: Number(extraPercentage) || 0,
        extraFixed: Number(extraFixed) || 0,
        freeShippingEnabled: freeShippingEnabled,
        freeShippingThreshold: freeShippingThreshold
      });

      if (res?.services && Array.isArray(res.services) && res.services.length > 0) {
        const availableCarriers = Array.from(new Set(res.services.map((s: any) => s.Carrier || s.ServiceDescription))) as string[];
        setTestResult({
          success: true,
          message: `Conexão bem-sucedida! ${res.services.length} modalidade(s) de frete calculada(s).`,
          servicesFound: res.services.length,
          availableCarriers,
          quotes: res.services
        });
      } else {
        setTestResult({
          success: false,
          message: res?.error || 'Nenhum serviço de entrega retornado para este trecho.',
          servicesFound: 0,
          availableCarriers: [],
          quotes: []
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Erro ao simular cotação.',
        servicesFound: 0,
        availableCarriers: [],
        quotes: []
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div id="frenet-logistics-config-card" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
      
      {/* Header com Branding Oficial e Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
            <Truck size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {title}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                Plataforma Parceira
              </span>
              {isAccountActive ? (
                <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 size={13} /> Ativo &amp; Vinculado
                </span>
              ) : logisticsStatus === 'error' ? (
                <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                  <AlertCircle size={13} /> Falha na Ativação
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  Não Ativado
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              {description}
            </p>
          </div>
        </div>
      </div>

      {/* Hero de Ativação Automática (Se não estiver ativo) */}
      {!isAccountActive ? (
        <div className="p-6 bg-gradient-to-br from-amber-50/70 via-orange-50/40 to-slate-50 dark:from-amber-950/25 dark:via-orange-950/15 dark:to-slate-900 border border-amber-200/80 dark:border-amber-900/50 rounded-2xl space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500 text-white rounded-xl shadow-xs shrink-0">
              <Sparkles size={24} />
            </div>
            <div className="space-y-1.5 flex-1">
              <h4 className="text-base font-black text-slate-900 dark:text-white">
                Ativação em 1 Clique sem burocracia
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
                Como parceiro oficial Frenet, o LabProx cria e associa automaticamente sua conta individual de logística. Você não precisa se cadastrar no site da Frenet nem copiar e colar chaves secretas.
              </p>
            </div>
          </div>

          {activationError && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Não foi possível ativar sua conta automaticamente:</p>
                <p className="mt-0.5 text-[11.5px]">{activationError}</p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              id="btn-activate-frenet"
              disabled={isActivating}
              onClick={handleStartActivation}
              className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-orange-500/20 active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isActivating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Vinculando Conta Frenet...</span>
                </>
              ) : (
                <>
                  <Zap size={16} />
                  <span>Ativar Frenet</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowDataModal(true)}
              className="px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileText size={15} />
              <span>Verificar / Editar Dados Cadastrais</span>
            </button>

            <button
              type="button"
              onClick={() => setShowManualToken(!showManualToken)}
              className="px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>{showManualToken ? 'Ocultar Token Manual' : 'Já possui Token Frenet?'}</span>
            </button>
          </div>

          {showManualToken && (
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 mt-3 animate-in fade-in duration-150">
              <h5 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Inserir Token Frenet Manualmente
              </h5>
              <p className="text-[11px] text-slate-500">
                Caso sua empresa já possua conta na Frenet, cole aqui o Token de Acesso gerado no painel Frenet (Dados Cadastrais).
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="password"
                  placeholder="Cole seu Token Frenet aqui..."
                  value={manualToken}
                  onChange={e => setManualToken(e.target.value)}
                  className="w-full sm:flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200"
                />
                <button
                  type="button"
                  disabled={isSavingManualToken || !manualToken.trim()}
                  onClick={handleSaveManualToken}
                  className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors shrink-0 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isSavingManualToken ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>Salvar Token</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Painel Conectado com Sucesso */
        <div className="p-4 sm:p-5 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Check size={22} />
            </div>
            <div>
              <p className="text-xs font-black text-emerald-950 dark:text-emerald-200 uppercase tracking-wider">
                Conta Frenet Individual Homologada
              </p>
              <p className="text-xs text-emerald-800 dark:text-emerald-300/90 mt-0.5">
                Sua loja está habilitada para cotação e emissão de etiquetas via Correios e transportadoras parceiras.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowDataModal(true)}
            className="self-start sm:self-center px-3.5 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <RefreshCw size={13} />
            <span>Atualizar Dados</span>
          </button>
        </div>
      )}

      {/* Seção Operacional: Regras Comerciais, Prazos & Embalagem */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* Coluna 1: Origem & Prazos */}
        <div className="space-y-4">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Sliders size={14} className="text-amber-500" />
            Origem e Prazos de Expedição
          </h4>

          {/* CEP de Origem */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <MapPin size={13} className="text-amber-500" />
              CEP de Origem / Expedição <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="00000-000"
              maxLength={9}
              value={originCep}
              onChange={e => setOriginCep(formatCep(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
              Endereço de partida dos pacotes para cálculo da rota e valor do frete.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Handling Days */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Clock size={13} className="text-amber-500" />
                Dias de Manuseio
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="15"
                  value={handlingDays}
                  onChange={e => setHandlingDays(Math.max(0, parseInt(e.target.value || '0', 10)))}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-bold">
                  dias
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                Prazo adicional de separação/embalagem somado ao prazo de trânsito.
              </p>
            </div>

            {/* Extra Percentage */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                Acréscimo Embalagem (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="0.5"
                  value={extraPercentage}
                  onChange={e => setExtraPercentage(Math.max(0, parseFloat(e.target.value || '0')))}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-bold">
                  %
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                Margem percentual sobre o custo real da transportadora.
              </p>
            </div>
          </div>
        </div>

        {/* Coluna 2: Frete Grátis & Dimensões */}
        <div className="space-y-4">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Package size={14} className="text-amber-500" />
            Promoção &amp; Dimensões Padrão
          </h4>

          {/* Frete Grátis */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-black text-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={freeShippingEnabled}
                  onChange={e => setFreeShippingEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 dark:border-slate-700"
                />
                <span className="flex items-center gap-1">
                  <Sparkles size={13} className="text-amber-500" />
                  Oferecer Frete Grátis
                </span>
              </label>
            </div>

            {freeShippingEnabled && (
              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  Frete Grátis para compras acima de:
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    R$
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="10"
                    value={freeShippingThreshold}
                    onChange={e => setFreeShippingThreshold(Math.max(0, parseFloat(e.target.value || '0')))}
                    className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Dimensões Padrão do Pacote */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              Dimensões Padrão da Caixa / Embalagem
            </label>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="block text-[9.5px] font-bold text-slate-500 uppercase">Peso (kg)</label>
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
                <label className="block text-[9.5px] font-bold text-slate-500 uppercase">Alt (cm)</label>
                <input
                  type="number"
                  min="2"
                  value={pkgHeight}
                  onChange={e => setPkgHeight(parseInt(e.target.value || '8', 10))}
                  className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-center"
                />
              </div>
              <div>
                <label className="block text-[9.5px] font-bold text-slate-500 uppercase">Larg (cm)</label>
                <input
                  type="number"
                  min="5"
                  value={pkgWidth}
                  onChange={e => setPkgWidth(parseInt(e.target.value || '12', 10))}
                  className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-center"
                />
              </div>
              <div>
                <label className="block text-[9.5px] font-bold text-slate-500 uppercase">Comp (cm)</label>
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

      {/* Salvar Regras Operacionais */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {optionsSaveSuccess && (
            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
              <CheckCircle2 size={14} /> Opções operacionais salvas com sucesso!
            </span>
          )}
        </div>

        <button
          type="button"
          disabled={isSavingOptions}
          onClick={handleSaveOperationalRules}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs uppercase tracking-wider rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          {isSavingOptions ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>Salvando...</span>
            </>
          ) : (
            <>
              <Truck size={14} />
              <span>Salvar Regras de Frete</span>
            </>
          )}
        </button>
      </div>

      {/* Ferramenta de Teste de Cotação em Tempo Real */}
      <div className="p-4 sm:p-5 bg-gradient-to-br from-amber-50/60 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10 border border-amber-200/80 dark:border-amber-900/40 rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h5 className="text-xs font-black text-amber-950 dark:text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
              <Zap size={14} className="text-amber-600 dark:text-amber-400" />
              Simular Cotação de Frete em Tempo Real
            </h5>
            <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
              Informe um CEP de destino para simular os valores e prazos retornados pela sua conta da Frenet.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-28 sm:w-32">
              <input
                id="frenet-test-cep-input"
                type="text"
                maxLength={9}
                placeholder="00000-000"
                value={testCep}
                onChange={e => setTestCep(formatCep(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-xl text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
              />
            </div>
            <button
              type="button"
              disabled={isTesting}
              onClick={handleTestQuote}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-black rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              {isTesting ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
              <span>{isTesting ? 'Calculando...' : 'Simular Frete'}</span>
            </button>
          </div>
        </div>

        {/* Resultados do Teste */}
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
                  Opções Disponíveis para o CEP {formatCep(testCep)}:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {testResult.quotes.map((q: any, idx: number) => {
                    const badge = getCarrierBadgeConfig(q.Carrier);
                    return (
                      <div
                        key={idx}
                        className="p-2.5 bg-white/90 dark:bg-slate-900/90 rounded-xl border border-emerald-100 dark:border-slate-800 shadow-xs space-y-1"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-black text-slate-800 dark:text-white text-xs">{q.ServiceDescription}</span>
                          <span className="font-mono font-black text-xs text-amber-700 dark:text-amber-400">
                            {Number(q.ShippingPrice) === 0 ? 'Grátis' : `R$ ${Number(q.ShippingPrice).toFixed(2)}`}
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

      {/* MODAL DE COMPLEMENTO / CONFIRMAÇÃO DE DADOS CADASTRAIS */}
      {showDataModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                  <Building2 size={20} />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900 dark:text-white">
                    Dados Cadastrais do Lojista
                  </h4>
                  <p className="text-xs text-slate-500">
                    Confirme as informações que serão sincronizadas com a Frenet.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDataModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] mb-1">
                    Razão Social / Nome da Empresa <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={merchantForm.name}
                    onChange={e => setMerchantForm({ ...merchantForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] mb-1">
                    CPF ou CNPJ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="00.000.000/0000-00"
                    value={merchantForm.cpfCnpj}
                    onChange={e => setMerchantForm({ ...merchantForm, cpfCnpj: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] mb-1">
                    E-mail do Lojista <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={merchantForm.email}
                    onChange={e => setMerchantForm({ ...merchantForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] mb-1">
                    Telefone / WhatsApp com DDD <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="(00) 00000-0000"
                    value={merchantForm.phone}
                    onChange={e => setMerchantForm({ ...merchantForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <h5 className="font-black text-slate-800 dark:text-slate-200 uppercase text-[11px] mb-3 flex items-center gap-1.5">
                  <MapPin size={13} className="text-amber-500" />
                  Endereço Físico de Expedição
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] mb-1">
                      CEP de Origem <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="00000-000"
                      maxLength={9}
                      value={merchantForm.cep}
                      onChange={e => setMerchantForm({ ...merchantForm, cep: formatCep(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] mb-1">
                      Rua / Logradouro <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Av. Paulista"
                      value={merchantForm.address}
                      onChange={e => setMerchantForm({ ...merchantForm, address: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] mb-1">
                      Número <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 1000"
                      value={merchantForm.number}
                      onChange={e => setMerchantForm({ ...merchantForm, number: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] mb-1">
                      Complemento (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Sala 42"
                      value={merchantForm.complement}
                      onChange={e => setMerchantForm({ ...merchantForm, complement: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] mb-1">
                      Bairro <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Bela Vista"
                      value={merchantForm.neighborhood}
                      onChange={e => setMerchantForm({ ...merchantForm, neighborhood: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] mb-1">
                      Cidade <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: São Paulo"
                      value={merchantForm.city}
                      onChange={e => setMerchantForm({ ...merchantForm, city: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] mb-1">
                      Estado (UF) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="SP"
                      maxLength={2}
                      value={merchantForm.state}
                      onChange={e => setMerchantForm({ ...merchantForm, state: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white uppercase font-bold text-center"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowDataModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isActivating}
                onClick={() => executeActivation(merchantForm)}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isActivating ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Processando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Confirmar e Ativar Frenet</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
