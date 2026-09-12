import { SubscriptionPlan } from '../types';

export interface PlanFeatureItem {
  text: string;
  included: boolean;
  highlight?: boolean;
}

/**
 * Returns a comprehensive list of feature items (included and not included)
 * mapped to the specific capabilities of Labprox for each plan tier and target audience.
 */
export const getDetailedPlanFeatures = (
  plan: SubscriptionPlan,
  regType?: string
): PlanFeatureItem[] => {
  const audience = regType || plan.targetAudience || 'LAB';
  const isFreeLab = audience === 'LAB' && (plan.id === 'free_lab' || plan.features?.isLabFreeStoreOnly === true);

  if (isFreeLab) {
    return [
      { text: 'Loja Online e Catálogo de Serviços ativo', included: true, highlight: true },
      { text: 'Recebimento de pedidos online de dentistas via link', included: true },
      { text: 'Cadastro de produtos e serviços ilimitados na loja', included: true },
      { text: 'Histórico e acompanhamento de pedidos web', included: true },
      { text: 'Financeiro simplificado de vendas online', included: true },
      { text: 'Acesso dos dentistas ao portal de pedidos', included: true },
      { text: 'Sem Kanban de produção e controle de bancada', included: false },
      { text: 'Sem compatibilidade com sistema NFC / QR Code', included: false },
      { text: 'Sem controle de estoque físico e insumos', included: false },
      { text: 'Sem roteirizador de entregas e motoboy', included: false },
    ];
  }

  if (audience === 'CLINIC') {
    const isProClinic = plan.price >= 150 || plan.features.maxUsers === -1;
    return [
      { text: 'Controle financeiro completo (Fluxo de caixa, DRE, conciliação)', included: true, highlight: true },
      { text: 'Agenda inteligente de consultas por salas, cadeiras e dentistas', included: true },
      { text: 'Prontuário eletrônico completo com odontograma digital', included: true },
      { text: 'Envio direto de pedidos para laboratórios parceiros em 1 clique', included: true, highlight: true },
      { text: 'Compatibilidade com sistema NFC & QR Code para identificação', included: true },
      { text: 'Cadastro de pacientes e dentistas ilimitados', included: true },
      { text: 'Catálogo de procedimentos e tabelas de preço personalizadas', included: true },
      { text: 'Controle de estoque de insumos clínicos', included: true },
      { text: 'Acesso direto à Loja de Fornecedores com cotação de frete e chat', included: true },
      { 
        text: plan.features.maxUsers === -1 || plan.features.maxUsers >= 9999 
          ? 'Usuários e dentistas ilimitados' 
          : `Até ${plan.features.maxUsers} usuários simultâneos`, 
        included: true 
      },
      { text: `${plan.features.maxStorageGB} GB de armazenamento seguro para exames e fotos`, included: true },
      ...(isProClinic ? [
        { text: 'Relatórios avançados de faturamento por dentista e procedimento', included: true },
        { text: 'Suporte prioritário e backup diário em nuvem', included: true }
      ] : []),
      ...(plan.whatsappModulePrice !== undefined ? [
        { text: `Módulo WhatsApp Integrado (+R$ ${plan.whatsappModulePrice.toFixed(2)}/mês)`, included: true }
      ] : [])
    ];
  }

  if (audience === 'SUPPLIER') {
    return [
      { text: 'Painel de e-commerce B2B integrado com laboratórios e clínicas', included: true, highlight: true },
      { text: 'Gestão de pedidos em 4 etapas (A Separar, Despacho, Enviados, Concluídos)', included: true },
      { text: 'Módulo financeiro completo com faturamento e filtros por período', included: true, highlight: true },
      { text: 'Emissão de romaneio e guias de separação para expedição', included: true },
      { text: 'Integração de frete Frenet + opções de Retirada em Mãos e Motoboy', included: true },
      { text: 'Chat direto em tempo real com compradores por produto/pedido', included: true },
      { text: 'Cadastro de produtos ilimitados com fotos em alta definição', included: true },
      { text: 'Controle de estoque e relatórios de vendas', included: true },
      { text: 'Cobranças automatizadas via Asaas (Pix e Boleto)', included: true },
      { text: 'Suporte técnico prioritário', included: true }
    ];
  }

  // Default: LAB (Laboratórios de Prótese Dentária)
  const isHighTier = plan.price >= 180 || plan.features.maxUsers === -1;
  const isEnterprise = plan.price >= 350;

  return [
    { text: 'Controle financeiro completo (DRE, Contas a Pagar/Receber, Faturamento)', included: true, highlight: true },
    { text: 'Kanban de produção em tempo real com controle de etapas e prazos', included: true, highlight: true },
    { text: 'Compatibilidade com sistema NFC & QR Code (rastreabilidade de caixas)', included: true, highlight: true },
    { text: 'Cadastro de serviços e tabelas de preços ilimitados', included: true },
    { text: 'Cadastro de clientes, dentistas e clínicas ilimitados', included: true },
    { text: 'Ordens de Serviço (OS) digitais com fotos, anexos e histórico clínico', included: true },
    { text: 'Controle de estoque e catálogo de insumos com alerta de reposição', included: true },
    { text: 'Roteirizador inteligente de entregas e motoboy com rotas por turno', included: true },
    { text: 'Acesso integrado à Loja de Fornecedores com cotação de frete e chat', included: true },
    { 
      text: plan.features.maxUsers === -1 || plan.features.maxUsers >= 9999 
        ? 'Usuários e técnicos ilimitados' 
        : `Até ${plan.features.maxUsers} usuários simultâneos`, 
      included: true 
    },
    { 
      text: plan.features.maxStorageGB === -1 || plan.features.maxStorageGB >= 9999 
        ? 'Armazenamento em nuvem ilimitado para arquivos 3D/STL' 
        : `${plan.features.maxStorageGB} GB de armazenamento seguro em nuvem`, 
      included: true 
    },
    { 
      text: plan.features.maxJobsPerMonth === -1 || plan.features.maxJobsPerMonth >= 9999 
        ? 'Casos e produções mensais ilimitados' 
        : `Até ${plan.features.maxJobsPerMonth} ordens de serviço por mês`, 
      included: true 
    },
    ...(plan.features.hasStoreModule ? [
      { text: 'Módulo de Loja Virtual própria integrada para dentistas', included: true }
    ] : []),
    ...(isHighTier ? [
      { text: 'Gestão de equipe e cálculo automático de comissões de técnicos', included: true },
      { text: 'Relatórios avançados de produtividade por setor e lucratividade', included: true },
    ] : []),
    ...(isEnterprise ? [
      { text: 'Módulo WhatsApp integrado para avisos automáticos aos dentistas', included: true, highlight: true },
      { text: 'Suporte VIP com atendimento prioritário e backup diário em nuvem', included: true }
    ] : [
      { text: 'Backup automático em nuvem e suporte técnico', included: true }
    ]),
    ...(plan.whatsappModulePrice !== undefined && !isEnterprise ? [
      { text: `Módulo WhatsApp Opcional (+R$ ${plan.whatsappModulePrice.toFixed(2)}/mês)`, included: true }
    ] : [])
  ];
};

/**
 * Returns just the string array of feature texts (for simple bullet points).
 */
export const getPlanFeaturesSimpleList = (
  plan: SubscriptionPlan,
  regType?: string
): string[] => {
  return getDetailedPlanFeatures(plan, regType)
    .filter(f => f.included)
    .map(f => f.text);
};

/**
 * Checks if a plan is private/exclusive (not publicly open to everyone).
 */
export const isPlanPrivate = (plan: SubscriptionPlan): boolean => {
  return (
    plan.isPrivate === true ||
    plan.isPublic === false ||
    (Array.isArray(plan.allowedEmails) && plan.allowedEmails.length > 0)
  );
};

/**
 * Evaluates whether a plan should be visible/selectable for an organization or user.
 * 
 * Rules:
 * 1. Plan must be active.
 * 2. Target audience must match the org's type (or fallback criteria).
 * 3. If it's the organization's currently active plan, it is always visible to them.
 * 4. If the plan is public (isPublic=true and no allowedEmails restriction), it is visible.
 * 5. If the plan is private (isPrivate=true, isPublic=false or has allowedEmails),
 *    it is ONLY visible if the user email or organization email is listed in plan.allowedEmails.
 */
export const isPlanAccessible = ({
  plan,
  userEmail,
  orgEmail,
  currentOrgPlanId,
  targetAudience
}: {
  plan: SubscriptionPlan;
  userEmail?: string;
  orgEmail?: string;
  currentOrgPlanId?: string;
  targetAudience?: string;
}): boolean => {
  if (!plan.active) return false;

  // Target audience matching
  if (targetAudience) {
    const planAudience = plan.targetAudience || 'LAB';
    if (planAudience !== targetAudience) {
      return false;
    }
  }

  // Always show current plan to the subscriber
  if (currentOrgPlanId && plan.id === currentOrgPlanId) {
    return true;
  }

  const isPrivate = isPlanPrivate(plan);

  // If public and unrestricted, everyone can see it
  if (!isPrivate) {
    return true;
  }

  // If private, verify against allowed emails
  const emailsToCheck = [userEmail, orgEmail]
    .filter(Boolean)
    .map(e => e!.toLowerCase().trim());

  if (emailsToCheck.length === 0 || !plan.allowedEmails || plan.allowedEmails.length === 0) {
    return false;
  }

  return plan.allowedEmails.some(allowed => 
    emailsToCheck.includes(allowed.toLowerCase().trim())
  );
};

