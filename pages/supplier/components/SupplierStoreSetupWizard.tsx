import React, { useState, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import { 
  Building2, Truck, RotateCcw, Award, ShieldCheck, 
  PhoneCall, CheckCircle2, FileText, ChevronRight, ChevronLeft, 
  Save, AlertCircle, ExternalLink, Check, Scale, Info, Sparkles, Lock
} from 'lucide-react';
import { SupplierStorePolicies, SupplierTermsAcceptance } from '../../../types';
import { SupplierTermsModal } from '../../../components/SupplierTermsModal';

interface SupplierStoreSetupWizardProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

const WIZARD_STEPS = [
  { id: 'data_entry', label: '1. Identificação', icon: Building2, desc: 'Dados da Empresa' },
  { id: 'delivery', label: '2. Envio & Prazos', icon: Truck, desc: 'Política de Entrega' },
  { id: 'return', label: '3. Devolução', icon: RotateCcw, desc: 'Arrependimento & Trocas' },
  { id: 'warranty', label: '4. Garantia', icon: Award, desc: 'Garantia Legal & Fabricante' },
  { id: 'regulated', label: '5. ANVISA / CRO', icon: ShieldCheck, desc: 'Produtos Regulados' },
  { id: 'attendance', label: '6. Atendimento', icon: PhoneCall, desc: 'SLA e Suporte' },
  { id: 'review', label: '7. Revisão', icon: Scale, desc: 'Marketplace vs Loja' },
  { id: 'acceptance', label: '8. Aceite Formal', icon: CheckCircle2, desc: 'Termos e Adesão' },
];

export const SupplierStoreSetupWizard: React.FC<SupplierStoreSetupWizardProps> = ({ onComplete, onCancel }) => {
  const { currentOrg, currentUser, updateOrganization } = useApp();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

  // Form State initialized from existing storeSettings.policies or currentOrg
  const existingPolicies = currentOrg?.storeSettings?.policies;

  // Step 1: Data Entry
  const [companyName, setCompanyName] = useState(currentOrg?.name || '');
  const [cpfCnpj, setCpfCnpj] = useState(currentOrg?.cpfCnpj || '');
  const [phone, setPhone] = useState(currentOrg?.phone || '');
  const [email, setEmail] = useState(currentOrg?.email || currentUser?.email || '');
  const [repName, setRepName] = useState(
    existingPolicies?.termsAcceptance?.legalRepresentativeName || 
    currentOrg?.financialSettings?.techResponsibleName || 
    currentUser?.name || ''
  );
  const [repCpf, setRepCpf] = useState(
    existingPolicies?.termsAcceptance?.legalRepresentativeCpf || 
    currentOrg?.financialSettings?.techResponsibleCpf || ''
  );
  const [originAddress, setOriginAddress] = useState({
    cep: currentOrg?.cep || '',
    street: currentOrg?.address || '',
    number: currentOrg?.number || '',
    complement: currentOrg?.complement || '',
    neighborhood: currentOrg?.neighborhood || '',
    city: currentOrg?.city || '',
    state: currentOrg?.state || '',
  });

  // Step 2: Delivery Policy
  const [dispatchDays, setDispatchDays] = useState<number>(
    existingPolicies?.deliveryPolicy?.defaultDispatchDays || 2
  );
  const [shippingModes, setShippingModes] = useState<('FRENET' | 'CORREIOS' | 'CARRIER' | 'PICKUP' | 'LOCAL_EXPRESS')[]>(
    existingPolicies?.deliveryPolicy?.shippingModes || ['FRENET', 'CORREIOS', 'CARRIER']
  );
  const [freeShippingEnabled, setFreeShippingEnabled] = useState<boolean>(
    existingPolicies?.deliveryPolicy?.freeShippingEnabled || false
  );
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number>(
    existingPolicies?.deliveryPolicy?.freeShippingThreshold || 500
  );
  const [deliveryNotes, setDeliveryNotes] = useState<string>(
    existingPolicies?.deliveryPolicy?.deliveryNotes || 'Despachamos em embalagens reforçadas para produtos odontológicos e insumos de prótese.'
  );

  // Step 3: Return Policy
  const [legalReturnDays, setLegalReturnDays] = useState<number>(
    existingPolicies?.returnPolicy?.legalReturnPeriodDays || 7
  );
  const [returnConditions, setReturnConditions] = useState<string>(
    existingPolicies?.returnPolicy?.returnConditions || 'O produto deve estar na embalagem original, lacrado, sem indícios de uso ou violação do lacre do fabricante.'
  );
  const [reverseLogisticsCoverage, setReverseLogisticsCoverage] = useState<'SELLER_PAYS_DEFECT_AND_REPENTANCE' | 'SELLER_PAYS_ALL'>(
    existingPolicies?.returnPolicy?.reverseLogisticsCoverage || 'SELLER_PAYS_DEFECT_AND_REPENTANCE'
  );
  const [exchangeProcessingDays, setExchangeProcessingDays] = useState<number>(
    existingPolicies?.returnPolicy?.exchangeProcessingDays || 3
  );

  // Step 4: Warranty Policy
  const [legalWarrantyDays, setLegalWarrantyDays] = useState<number>(
    existingPolicies?.warrantyPolicy?.legalWarrantyDays || 90
  );
  const [manufacturerWarrantyMonths, setManufacturerWarrantyMonths] = useState<number>(
    existingPolicies?.warrantyPolicy?.manufacturerWarrantyMonths || 12
  );
  const [warrantyProcedure, setWarrantyProcedure] = useState<string>(
    existingPolicies?.warrantyPolicy?.warrantyCoverageDetails || 'Garantia legal de 90 dias contra defeitos de fabricação. Para maquinários e periféricos, suporte técnico direto com rede autorizada.'
  );
  const [technicalAssistanceInfo, setTechnicalAssistanceInfo] = useState<string>(
    existingPolicies?.warrantyPolicy?.technicalAssistanceInfo || 'Assistência técnica autorizada disponível com suporte remoto e presencial.'
  );

  // Step 5: Regulated Products Policy (ANVISA / CRO)
  const [anvisaComplianceConfirmed, setAnvisaComplianceConfirmed] = useState<boolean>(
    existingPolicies?.regulatedProductsPolicy?.anvisaComplianceConfirmed ?? true
  );
  const [techRespName, setTechRespName] = useState<string>(
    existingPolicies?.regulatedProductsPolicy?.technicalResponsibleName || ''
  );
  const [techRespDocType, setTechRespDocType] = useState<'CRF' | 'CRO' | 'CREA' | 'CRQ' | 'OTHER'>(
    existingPolicies?.regulatedProductsPolicy?.technicalResponsibleDocType || 'CRO'
  );
  const [techRespDocNumber, setTechRespDocNumber] = useState<string>(
    existingPolicies?.regulatedProductsPolicy?.technicalResponsibleDocNumber || ''
  );
  const [afeNumber, setAfeNumber] = useState<string>(
    existingPolicies?.regulatedProductsPolicy?.afeOrAnvisaAuthorizationNumber || ''
  );
  const [requiresBatchAndExpiry, setRequiresBatchAndExpiry] = useState<boolean>(
    existingPolicies?.regulatedProductsPolicy?.requiresBatchAndExpiryTracking ?? true
  );
  const [prohibitsUnauthorizedReprocessing, setProhibitsUnauthorizedReprocessing] = useState<boolean>(
    existingPolicies?.regulatedProductsPolicy?.prohibitsUnauthorizedReprocessing ?? true
  );

  // Step 6: Attendance Policy (SLA)
  const [maxResponseHours, setMaxResponseHours] = useState<number>(
    existingPolicies?.customerServicePolicy?.maxResponseTimeHours || 24
  );
  const [supportChannels, setSupportChannels] = useState<('PLATFORM_CHAT' | 'WHATSAPP' | 'EMAIL' | 'PHONE')[]>(
    existingPolicies?.customerServicePolicy?.supportChannels || ['PLATFORM_CHAT', 'WHATSAPP', 'EMAIL']
  );
  const [supportEmail, setSupportEmail] = useState<string>(
    existingPolicies?.customerServicePolicy?.supportEmail || currentOrg?.email || ''
  );
  const [supportPhone, setSupportPhone] = useState<string>(
    existingPolicies?.customerServicePolicy?.supportPhone || currentOrg?.whatsapp || currentOrg?.phone || ''
  );
  const [businessHours, setBusinessHours] = useState<string>(
    existingPolicies?.customerServicePolicy?.businessHours || 'Segunda a Sexta, das 08h às 18h'
  );

  // Step 8: Acceptance
  const [termsAgreed, setTermsAgreed] = useState<boolean>(
    existingPolicies?.termsAcceptance?.accepted || false
  );
  const [qualityCommitmentAgreed, setQualityCommitmentAgreed] = useState<boolean>(
    existingPolicies?.termsAcceptance?.accepted || false
  );

  const toggleShippingMode = (mode: 'FRENET' | 'CORREIOS' | 'CARRIER' | 'PICKUP' | 'LOCAL_EXPRESS') => {
    if (shippingModes.includes(mode)) {
      if (shippingModes.length > 1) {
        setShippingModes(shippingModes.filter(m => m !== mode));
      }
    } else {
      setShippingModes([...shippingModes, mode]);
    }
  };

  const toggleSupportChannel = (channel: 'PLATFORM_CHAT' | 'WHATSAPP' | 'EMAIL' | 'PHONE') => {
    if (supportChannels.includes(channel)) {
      if (supportChannels.length > 1) {
        setSupportChannels(supportChannels.filter(c => c !== channel));
      }
    } else {
      setSupportChannels([...supportChannels, channel]);
    }
  };

  const handleNext = () => {
    if (currentStepIndex < WIZARD_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSaveAndAccept = async () => {
    if (!currentOrg || !currentUser) return;
    if (!termsAgreed || !qualityCommitmentAgreed) {
      alert('Por favor, marque o aceite dos Termos e Diretrizes do Marketplace para prosseguir.');
      return;
    }

    setIsSaving(true);
    try {
      const compiledPolicies: SupplierStorePolicies = {
        deliveryPolicy: {
          defaultDispatchDays: Number(dispatchDays),
          shippingModes,
          freeShippingEnabled,
          freeShippingThreshold: freeShippingEnabled ? Number(freeShippingThreshold) : undefined,
          deliveryNotes,
        },
        returnPolicy: {
          legalReturnPeriodDays: Math.max(7, Number(legalReturnDays)),
          returnConditions,
          reverseLogisticsCoverage,
          exchangeProcessingDays: Number(exchangeProcessingDays),
        },
        warrantyPolicy: {
          legalWarrantyDays: Math.max(90, Number(legalWarrantyDays)),
          manufacturerWarrantyMonths: Number(manufacturerWarrantyMonths),
          warrantyCoverageDetails: warrantyProcedure,
          technicalAssistanceInfo,
        },
        regulatedProductsPolicy: {
          anvisaComplianceConfirmed,
          technicalResponsibleName: techRespName,
          technicalResponsibleDocType: techRespDocType,
          technicalResponsibleDocNumber: techRespDocNumber,
          afeOrAnvisaAuthorizationNumber: afeNumber,
          requiresBatchAndExpiryTracking: requiresBatchAndExpiry,
          prohibitsUnauthorizedReprocessing: prohibitsUnauthorizedReprocessing,
        },
        customerServicePolicy: {
          maxResponseTimeHours: Number(maxResponseHours),
          supportChannels,
          supportEmail,
          supportPhone,
          businessHours,
        },
        termsAcceptance: {
          accepted: true,
          version: 'v1.0-2026',
          acceptedAt: new Date().toISOString(),
          acceptedByUserId: currentUser.id,
          acceptedByUserName: currentUser.name || currentUser.email || 'Usuário Responsável',
          acceptedByUserEmail: currentUser.email || '',
          acceptedOrgId: currentOrg.id,
          acceptedOrgName: companyName || currentOrg.name,
          legalRepresentativeName: repName,
          legalRepresentativeCpf: repCpf,
          userAgent: navigator.userAgent,
        },
        lastUpdated: new Date().toISOString(),
      };

      const updatedStoreSettings = {
        ...(currentOrg.storeSettings || {}),
        policies: compiledPolicies,
      };

      await updateOrganization(currentOrg.id, {
        name: companyName,
        cpfCnpj,
        phone,
        email,
        cep: originAddress.cep,
        address: originAddress.street,
        number: originAddress.number,
        complement: originAddress.complement,
        neighborhood: originAddress.neighborhood,
        city: originAddress.city,
        state: originAddress.state,
        storeSettings: updatedStoreSettings,
        financialSettings: {
          ...(currentOrg.financialSettings || {}),
          techResponsibleName: techRespName || repName,
          techResponsibleCpf: repCpf,
        }
      });

      alert('Políticas da Loja e Termos do Marketplace salvos e homologados com sucesso!');
      if (onComplete) onComplete();
    } catch (err) {
      console.error('Error saving supplier policies:', err);
      alert('Erro ao salvar as políticas. Verifique sua conexão e tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const currentStep = WIZARD_STEPS[currentStepIndex];

  return (
    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
      
      {/* Wizard Header Bar */}
      <div className="bg-slate-900 text-white p-5 sm:p-6 border-b border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-md">
                Onboarding & Homologação de Fornecedor
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Passo {currentStepIndex + 1} de {WIZARD_STEPS.length}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1 tracking-tight">
              Configuração de Políticas & Termos de Marketplace
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Estruture as diretrizes de atendimento, envio, devolução, conformidade ANVISA e homologue sua loja oficial.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsTermsModalOpen(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-700"
            >
              <FileText size={14} className="text-indigo-400" />
              <span>Ver Termos na Íntegra</span>
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-2 text-slate-400 hover:text-white text-xs font-bold"
              >
                Fechar
              </button>
            )}
          </div>
        </div>

        {/* Step Progression Indicators */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mt-6 pt-5 border-t border-slate-800">
          {WIZARD_STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isActive = idx === currentStepIndex;
            const isCompleted = idx < currentStepIndex;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setCurrentStepIndex(idx)}
                className={`flex flex-col items-center text-center p-2 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : isCompleted 
                    ? 'bg-slate-800/90 text-emerald-400 hover:bg-slate-800' 
                    : 'bg-slate-800/40 text-slate-500 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-center mb-1">
                  {isCompleted ? <Check size={14} className="text-emerald-400 stroke-[3]" /> : <Icon size={14} />}
                </div>
                <span className="text-[10px] font-bold tracking-tight truncate max-w-full leading-tight">
                  {step.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Wizard Form Container */}
      <div className="p-5 sm:p-8 space-y-6 min-h-[420px]">
        
        {/* STEP 1: DATA ENTRY */}
        {currentStepIndex === 0 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Building2 size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">1. Identificação e Dados da Empresa Fornecedora</h3>
                <p className="text-slate-500 text-xs">Informe os dados cadastrais da pessoa jurídica e do representante responsável.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Razão Social / Nome Fantasia *</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="Ex: Dental Prime Distribuidora Ltda"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">CNPJ ou CPF do Fornecedor *</label>
                <input
                  type="text"
                  required
                  value={cpfCnpj}
                  onChange={e => setCpfCnpj(e.target.value)}
                  placeholder="00.000.000/0001-00"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">E-mail Comercial / Faturamento *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="contato@fornecedor.com.br"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Telefone / WhatsApp Comercial *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nome do Representante Legal / Gestor *</label>
                <input
                  type="text"
                  value={repName}
                  onChange={e => setRepName(e.target.value)}
                  placeholder="Ex: Carlos Eduardo Silveira"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">CPF do Representante Legal</label>
                <input
                  type="text"
                  value={repCpf}
                  onChange={e => setRepCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>

            {/* Origin Address */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Endereço de Expedição & Despacho de Mercadorias</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">CEP de Origem</label>
                  <input
                    type="text"
                    value={originAddress.cep}
                    onChange={e => setOriginAddress({ ...originAddress, cep: e.target.value })}
                    placeholder="00000-000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Rua / Logradouro</label>
                  <input
                    type="text"
                    value={originAddress.street}
                    onChange={e => setOriginAddress({ ...originAddress, street: e.target.value })}
                    placeholder="Av. Paulista"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Número</label>
                  <input
                    type="text"
                    value={originAddress.number}
                    onChange={e => setOriginAddress({ ...originAddress, number: e.target.value })}
                    placeholder="1000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Bairro</label>
                  <input
                    type="text"
                    value={originAddress.neighborhood}
                    onChange={e => setOriginAddress({ ...originAddress, neighborhood: e.target.value })}
                    placeholder="Bela Vista"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={originAddress.city}
                    onChange={e => setOriginAddress({ ...originAddress, city: e.target.value })}
                    placeholder="São Paulo"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Estado (UF)</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={originAddress.state}
                    onChange={e => setOriginAddress({ ...originAddress, state: e.target.value.toUpperCase() })}
                    placeholder="SP"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 uppercase font-mono text-center"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: DELIVERY POLICY */}
        {currentStepIndex === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Truck size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">2. Política de Envio, Expedição e Prazos de Postagem</h3>
                <p className="text-slate-500 text-xs">Defina o tempo padrão de despacho e as modalidades de frete atendidas.</p>
              </div>
            </div>

            {/* Mandatory marketplace rule box */}
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex items-start gap-3 text-xs text-indigo-950">
              <Info size={18} className="text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Regra Obrigatória do Marketplace:</span> Todos os pedidos devem ser despachados acompanhados de código de rastreio ou comprovante de entrega, garantindo a visualização em tempo real pelo comprador no painel "Meus Pedidos".
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Prazo Padrão de Despacho (Dias Úteis) *</label>
                <select
                  value={dispatchDays}
                  onChange={e => setDispatchDays(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                >
                  <option value={1}>1 dia útil (Envio Super Rápido / Mesmo Dia ou Dia Seguinte)</option>
                  <option value={2}>2 dias úteis (Padrão Recomendado)</option>
                  <option value={3}>3 dias úteis</option>
                  <option value={5}>5 dias úteis (Para itens sob encomenda/montagem)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">Tempo entre a confirmação do pagamento e a entrega à transportadora/Correios.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Modalidades de Envio Aceitas</label>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {[
                    { id: 'FRENET', label: 'Frenet (Cotação Automática)' },
                    { id: 'CORREIOS', label: 'Correios (SEDEX / PAC)' },
                    { id: 'CARRIER', label: 'Transportadora Dedicada' },
                    { id: 'LOCAL_EXPRESS', label: 'Motoboy / Express Local' },
                    { id: 'PICKUP', label: 'Retirada no Balcão' },
                  ].map((mode: any) => (
                    <label 
                      key={mode.id} 
                      className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs transition-colors ${
                        shippingModes.includes(mode.id) ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={shippingModes.includes(mode.id)}
                        onChange={() => toggleShippingMode(mode.id)}
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      <span className="truncate">{mode.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Free Shipping Custom Policy */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-800">Frete Grátis Promocional da Sua Loja</h4>
                  <p className="text-[11px] text-slate-500">Ofereça frete gratuito para compras acima de um valor mínimo.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={freeShippingEnabled} 
                    onChange={e => setFreeShippingEnabled(e.target.checked)} 
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {freeShippingEnabled && (
                <div className="pt-2 border-t border-slate-200 flex items-center gap-3">
                  <span className="text-xs text-slate-600 font-medium whitespace-nowrap">Valor Mínimo do Pedido:</span>
                  <div className="relative w-48">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">R$</span>
                    <input
                      type="number"
                      min={0}
                      value={freeShippingThreshold}
                      onChange={e => setFreeShippingThreshold(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Orientações de Embalagem e Despacho</label>
              <textarea
                rows={2}
                value={deliveryNotes}
                onChange={e => setDeliveryNotes(e.target.value)}
                placeholder="Descreva cuidados especiais no envio de resinas, gessos, metais ou brocas..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        {/* STEP 3: RETURN POLICY */}
        {currentStepIndex === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <RotateCcw size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">3. Política de Devolução, Arrependimento e Troca (CDC)</h3>
                <p className="text-slate-500 text-xs">Regulamente os prazos e as condições de logística reversa para compradores odontológicos.</p>
              </div>
            </div>

            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-xs text-emerald-950">
              <ShieldCheck size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Garantia Legal do Código de Defesa do Consumidor (Art. 49):</span> Todo comprador do marketplace tem garantido o prazo de <strong>7 dias corridos</strong> a partir do recebimento para solicitar devolução por arrependimento nas compras online.
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Prazo de Arrependimento (Dias Corridos) *</label>
                <input
                  type="number"
                  min={7}
                  value={legalReturnDays}
                  onChange={e => setLegalReturnDays(Math.max(7, Number(e.target.value)))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                />
                <p className="text-[11px] text-slate-400 mt-1">Mínimo legal obrigatório: 7 dias corridos.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Prazo de Resolução de Troca (Dias Úteis) *</label>
                <select
                  value={exchangeProcessingDays}
                  onChange={e => setExchangeProcessingDays(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                >
                  <option value={2}>Até 2 dias úteis após receber a devolução</option>
                  <option value={3}>Até 3 dias úteis (Padrão Recomendado)</option>
                  <option value={5}>Até 5 dias úteis</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">Tempo para envio do novo item ou estorno financeiro.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Custos de Frete na Logística Reversa</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className={`p-3 rounded-xl border cursor-pointer text-xs transition-colors flex items-start gap-2.5 ${
                  reverseLogisticsCoverage === 'SELLER_PAYS_DEFECT_AND_REPENTANCE' ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <input
                    type="radio"
                    name="logisticsCoverage"
                    checked={reverseLogisticsCoverage === 'SELLER_PAYS_DEFECT_AND_REPENTANCE'}
                    onChange={() => setReverseLogisticsCoverage('SELLER_PAYS_DEFECT_AND_REPENTANCE')}
                    className="mt-0.5 text-indigo-600"
                  />
                  <div>
                    <p className="font-bold">Padrão Legal (Recomendado)</p>
                    <p className="text-[11px] font-normal text-slate-500 mt-0.5">Fornecedor arca com frete nos casos de vício/defeito ou arrependimento dentro do prazo legal de 7 dias.</p>
                  </div>
                </label>

                <label className={`p-3 rounded-xl border cursor-pointer text-xs transition-colors flex items-start gap-2.5 ${
                  reverseLogisticsCoverage === 'SELLER_PAYS_ALL' ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <input
                    type="radio"
                    name="logisticsCoverage"
                    checked={reverseLogisticsCoverage === 'SELLER_PAYS_ALL'}
                    onChange={() => setReverseLogisticsCoverage('SELLER_PAYS_ALL')}
                    className="mt-0.5 text-indigo-600"
                  />
                  <div>
                    <p className="font-bold">Frete Grátis Total na Devolução</p>
                    <p className="text-[11px] font-normal text-slate-500 mt-0.5">Sua loja arca com o frete em qualquer hipótese de troca ou devolução do comprador.</p>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Condições para Aceite da Devolução *</label>
              <textarea
                rows={3}
                required
                value={returnConditions}
                onChange={e => setReturnConditions(e.target.value)}
                placeholder="Descreva as condições: embalagem intacta, lacres de segurança, frascos não violados..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        {/* STEP 4: WARRANTY POLICY */}
        {currentStepIndex === 3 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Award size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">4. Política de Garantia Legal e do Fabricante</h3>
                <p className="text-slate-500 text-xs">Especifique as garantias de equipamentos, motores, articuladores e insumos duráveis.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Garantia Legal Mínima (Dias) *</label>
                <input
                  type="number"
                  min={90}
                  value={legalWarrantyDays}
                  onChange={e => setLegalWarrantyDays(Math.max(90, Number(e.target.value)))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                />
                <p className="text-[11px] text-slate-400 mt-1">Mínimo legal de 90 dias para produtos duráveis (CDC).</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Garantia Estendida de Fabricante (Meses)</label>
                <select
                  value={manufacturerWarrantyMonths}
                  onChange={e => setManufacturerWarrantyMonths(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                >
                  <option value={3}>3 meses (Garantia Padrão Legal)</option>
                  <option value={6}>6 meses</option>
                  <option value={12}>12 meses (1 Ano - Recomendado para Equipamentos)</option>
                  <option value={24}>24 meses (2 Anos)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Procedimento de Acionamento da Garantia *</label>
              <textarea
                rows={3}
                value={warrantyProcedure}
                onChange={e => setWarrantyProcedure(e.target.value)}
                placeholder="Como o comprador aciona a garantia em caso de falha técnica ou defeito de fábrica..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Informações de Assistência Técnica Autorizada</label>
              <input
                type="text"
                value={technicalAssistanceInfo}
                onChange={e => setTechnicalAssistanceInfo(e.target.value)}
                placeholder="Ex: Suporte técnico próprio via WhatsApp ou rede de oficinas credenciadas no Brasil"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        {/* STEP 5: REGULATED PRODUCTS POLICY (ANVISA / CRO) */}
        {currentStepIndex === 4 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">5. Produtos Regulados, ANVISA e Responsabilidade Técnica</h3>
                <p className="text-slate-500 text-xs">Declaração de conformidade sanitária para comercialização de produtos odontológicos.</p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-950">
              <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Regulamentação Sanitária Obrigatória (ANVISA e Conselho Federal):</p>
                <p className="text-amber-900">
                  Todo material odontológico, resina 3D, implante, biomaterial, anestésico ou equipamento comercializado no Marketplace LabProx deve possuir registro ativo na ANVISA. A venda de produtos sem lote, vencidos ou não autorizados enseja suspensão imediata da loja e responsabilização legal.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={anvisaComplianceConfirmed}
                  onChange={e => setAnvisaComplianceConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 h-4 w-4"
                />
                <div className="text-xs">
                  <p className="font-bold text-slate-800">Declaração de Conformidade Sanitária ANVISA *</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Declaro formalmente que todos os insumos, materiais e equipamentos odontológicos comercializados por nossa loja possuem registro ou notificação válida perante a ANVISA.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={requiresBatchAndExpiry}
                  onChange={e => setRequiresBatchAndExpiry(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 h-4 w-4"
                />
                <div className="text-xs">
                  <p className="font-bold text-slate-800">Rastreabilidade de Lote e Data de Validade *</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Compromisso de fornecer número de lote, data de fabricação e validade legíveis em todos os despachos físicos aos laboratórios e dentistas.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={prohibitsUnauthorizedReprocessing}
                  onChange={e => setProhibitsUnauthorizedReprocessing(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 h-4 w-4"
                />
                <div className="text-xs">
                  <p className="font-bold text-slate-800">Proibição de Produtos Reprocessados ou Clandestinos *</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Garantia de que nenhum produto comercializado é recondicionado, reprocessado ou fracionado sem autorização sanitária expressa do fabricante.
                  </p>
                </div>
              </label>
            </div>

            {/* Technical Responsible Details */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Responsável Técnico / Farmacêutico / Químico / Odontológico (Opcional)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Nome do Responsável</label>
                  <input
                    type="text"
                    value={techRespName}
                    onChange={e => setTechRespName(e.target.value)}
                    placeholder="Dra. Juliana Mendes"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Conselho de Classe</label>
                  <select
                    value={techRespDocType}
                    onChange={e => setTechRespDocType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                  >
                    <option value="CRO">CRO (Odontologia)</option>
                    <option value="CRF">CRF (Farmácia)</option>
                    <option value="CRQ">CRQ (Química)</option>
                    <option value="CREA">CREA (Engenharia Biomédica)</option>
                    <option value="OTHER">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Número do Registro / UF</label>
                  <input
                    type="text"
                    value={techRespDocNumber}
                    onChange={e => setTechRespDocNumber(e.target.value)}
                    placeholder="12345/SP"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: ATTENDANCE & SLA */}
        {currentStepIndex === 5 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <PhoneCall size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">6. Atendimento, Suporte e Níveis de Serviço (SLA)</h3>
                <p className="text-slate-500 text-xs">Defina os canais de contato e o tempo de resposta aos compradores da plataforma.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Tempo Máximo de Resposta (SLA) *</label>
                <select
                  value={maxResponseHours}
                  onChange={e => setMaxResponseHours(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                >
                  <option value={4}>Em até 4 horas úteis (Atendimento Express VIP)</option>
                  <option value={12}>Em até 12 horas úteis</option>
                  <option value={24}>Em até 24 horas úteis (Padrão Oficial do Marketplace)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">Limite máximo estabelecido pelo Marketplace: 24h úteis.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Horário de Funcionamento Comercial *</label>
                <input
                  type="text"
                  value={businessHours}
                  onChange={e => setBusinessHours(e.target.value)}
                  placeholder="Segunda a Sexta, das 08h às 18h"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Canais de Atendimento Ativos na Loja</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {[
                  { id: 'PLATFORM_CHAT', label: 'Chat Interno LabProx' },
                  { id: 'WHATSAPP', label: 'WhatsApp Comercial' },
                  { id: 'EMAIL', label: 'E-mail de Suporte' },
                  { id: 'PHONE', label: 'Telefone Direto' },
                ].map((ch: any) => (
                  <label 
                    key={ch.id} 
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs transition-colors ${
                      supportChannels.includes(ch.id) ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={supportChannels.includes(ch.id)}
                      onChange={() => toggleSupportChannel(ch.id)}
                      className="rounded border-slate-300 text-indigo-600"
                    />
                    <span className="truncate">{ch.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">E-mail para Atendimento de Compradores</label>
                <input
                  type="email"
                  value={supportEmail}
                  onChange={e => setSupportEmail(e.target.value)}
                  placeholder="suporte@fornecedor.com.br"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">WhatsApp / Telefone de Pós-Venda</label>
                <input
                  type="text"
                  value={supportPhone}
                  onChange={e => setSupportPhone(e.target.value)}
                  placeholder="(11) 98888-8888"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 7: REVIEW (MARKETPLACE POLICY VS STORE POLICY) */}
        {currentStepIndex === 6 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Scale size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">7. Revisão: Política do Marketplace vs. Política da Loja</h3>
                <p className="text-slate-500 text-xs">Comparativo entre as regras inegociáveis do LabProx e os termos customizados da sua marca.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Mandatory Marketplace Policies */}
              <div className="bg-slate-50 border-2 border-indigo-200/80 rounded-2xl p-5 space-y-4 shadow-xs">
                <div className="flex items-center gap-2 border-b border-indigo-100 pb-2">
                  <Lock size={16} className="text-indigo-600" />
                  <h4 className="font-bold text-sm text-indigo-950">Políticas Oficiais do Marketplace LabProx (Obrigatórias)</h4>
                </div>
                
                <div className="space-y-3 text-xs text-slate-700">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-900">Conformidade ANVISA / CRO</p>
                      <p className="text-slate-500 text-[11px]">Proibição absoluta de produtos clandestinos, vencidos ou sem lote e registro válido.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-900">Direito de Arrependimento de 7 Dias</p>
                      <p className="text-slate-500 text-[11px]">Cumprimento estrito do Art. 49 do CDC com frete de logística reversa coberto pelo fornecedor.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-900">Garantia Legal de 90 Dias</p>
                      <p className="text-slate-500 text-[11px]">Cobertura contra defeitos de fabricação e vícios ocultos em produtos duráveis.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-900">SLA Máximo de Atendimento de 24h</p>
                      <p className="text-slate-500 text-[11px]">Obrigação de retorno a dúvidas e solicitações no chat ou canais cadastrados.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-900">Rastreabilidade Obrigatória</p>
                      <p className="text-slate-500 text-[11px]">Inserção do código de rastreamento no painel para acompanhamento do comprador.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customized Store Policies */}
              <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Sparkles size={16} className="text-amber-500" />
                  <h4 className="font-bold text-sm text-slate-900">Políticas Personalizadas da Sua Loja (Customizadas)</h4>
                </div>

                <div className="space-y-3 text-xs text-slate-700">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="font-bold text-slate-900">Prazo de Expedição Declarado:</p>
                    <p className="text-slate-600 text-[11px]">
                      Despacho em até <strong>{dispatchDays} dia(s) útil(eis)</strong> após a confirmação.
                    </p>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="font-bold text-slate-900">Modalidades de Envio e Frete Grátis:</p>
                    <p className="text-slate-600 text-[11px]">
                      {shippingModes.join(', ')} • {freeShippingEnabled ? `Frete Grátis a partir de R$ ${freeShippingThreshold}` : 'Frete calculado por CEP via Frenet/Correios'}
                    </p>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="font-bold text-slate-900">Garantia Comercial do Fabricante:</p>
                    <p className="text-slate-600 text-[11px]">
                      Garantia de <strong>{manufacturerWarrantyMonths} meses</strong> com assistência autorizada.
                    </p>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="font-bold text-slate-900">Horário e Canais de Atendimento:</p>
                    <p className="text-slate-600 text-[11px]">
                      {businessHours} • Canais: {supportChannels.join(', ')} • SLA de resposta: até {maxResponseHours}h.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* STEP 8: ACCEPTANCE & LEGAL COMMITMENT */}
        {currentStepIndex === 7 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">8. Termo de Adesão e Aceite Formal do Fornecedor</h3>
                <p className="text-slate-500 text-xs">Conclua o processo de homologação aceitando as diretrizes contratuais do Marketplace.</p>
              </div>
            </div>

            {/* Terms Acceptance Card */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 text-xs text-slate-700 leading-relaxed">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-indigo-600" />
                  <span className="font-bold text-slate-900 text-sm">Contrato de Adesão de Fornecedor • Versão 1.0 (2026)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTermsModalOpen(true)}
                  className="px-3 py-1.5 bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <ExternalLink size={13} />
                  <span>Visualizar Termos na Íntegra</span>
                </button>
              </div>

              <p>
                Ao assinar digitalmente este termo, a empresa <strong>{companyName || currentOrg?.name}</strong> (CNPJ/CPF: {cpfCnpj || currentOrg?.cpfCnpj || 'Pendente'}), por intermédio de seu representante <strong>{repName || currentUser?.name}</strong> ({currentUser?.email}), declara que:
              </p>

              <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                <li>Leu, compreendeu e aceita integralmente os Termos e Diretrizes para Fornecedores do Marketplace LabProx;</li>
                <li>Compromete-se a cumprir os prazos de postagem, as garantias legais e o direito de arrependimento (Art. 49 CDC);</li>
                <li>Garante que todos os produtos comercializados possuem procedência legal, registro ANVISA regular e emissão de NF-e;</li>
                <li>Concorda com o processamento financeiro e split de pagamentos via gateway integrado Asaas.</li>
              </ul>

              <div className="p-3 bg-white rounded-xl border border-slate-200 text-[11px] font-mono text-slate-500 flex flex-wrap gap-4">
                <span>Data do Registro: {new Date().toLocaleDateString('pt-BR')}</span>
                <span>Responsável: {currentUser?.name} ({currentUser?.email})</span>
                <span>Versão do Termo: v1.0-2026</span>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-3 p-4 bg-indigo-50/50 border-2 border-indigo-200 rounded-2xl cursor-pointer hover:bg-indigo-50 transition-colors">
                <input
                  type="checkbox"
                  required
                  checked={termsAgreed}
                  onChange={e => setTermsAgreed(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 h-5 w-5"
                />
                <div className="text-xs">
                  <p className="font-bold text-slate-900 text-sm">
                    Li, compreendi e concordo integralmente com os Termos e Diretrizes para Fornecedores do Marketplace LabProx *
                  </p>
                  <p className="text-slate-600 text-xs mt-0.5">
                    Declaro estar ciente de todas as regras operacionais, sanções por descumprimento de SLA e responsabilidades sanitárias e fiscais.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 bg-emerald-50/40 border-2 border-emerald-200 rounded-2xl cursor-pointer hover:bg-emerald-50 transition-colors">
                <input
                  type="checkbox"
                  required
                  checked={qualityCommitmentAgreed}
                  onChange={e => setQualityCommitmentAgreed(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-emerald-600 h-5 w-5"
                />
                <div className="text-xs">
                  <p className="font-bold text-slate-900 text-sm">
                    Compromisso de Excelência, Autenticidade e Pós-Venda Odontológico *
                  </p>
                  <p className="text-slate-600 text-xs mt-0.5">
                    Garantimos a idoneidade das mercadorias, conformidade com os conselhos de classe (CRO/CFO/ANVISA) e suporte contínuo aos clientes.
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}

      </div>

      {/* Wizard Footer Navigation Controls */}
      <div className="p-5 sm:p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          {currentStepIndex > 0 ? (
            <button
              type="button"
              onClick={handlePrev}
              className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <ChevronLeft size={16} />
              <span>Voltar: {WIZARD_STEPS[currentStepIndex - 1].label}</span>
            </button>
          ) : (
            <span className="text-xs text-slate-400 font-medium">Início do Fluxo</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {currentStepIndex < WIZARD_STEPS.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-md"
            >
              <span>Avançar: {WIZARD_STEPS[currentStepIndex + 1].label}</span>
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSaveAndAccept}
              disabled={isSaving || !termsAgreed || !qualityCommitmentAgreed}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/20"
            >
              <Save size={16} />
              <span>{isSaving ? 'Gravando Homologação...' : 'Salvar Políticas e Homologar Loja'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Supplier Terms Modal */}
      <SupplierTermsModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
      />

    </div>
  );
};
