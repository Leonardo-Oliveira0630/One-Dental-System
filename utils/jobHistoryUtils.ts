import {
  Job,
  JobHistory,
  JobHistoryCategory,
  JobHistoryFieldDetail,
  JobHistorySection,
  JobItem,
  JobProduct,
  JobStatus,
  JobType,
  UrgencyLevel
} from '../types';

export const formatHistoryCurrency = (value?: number): string => {
  const num = Number(value) || 0;
  return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatHistoryDate = (d?: Date | string | any): string => {
  if (!d) return '-';
  try {
    const parsed = d instanceof Date ? d : (d?.toDate ? d.toDate() : new Date(d));
    if (isNaN(parsed.getTime())) return '-';
    return parsed.toLocaleDateString('pt-BR');
  } catch {
    return '-';
  }
};

export const formatHistoryDateTime = (d?: Date | string | any): string => {
  if (!d) return '-';
  try {
    const parsed = d instanceof Date ? d : (d?.toDate ? d.toDate() : new Date(d));
    if (isNaN(parsed.getTime())) return '-';
    return parsed.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '-';
  }
};

export const getNatureLabel = (nature?: string): string => {
  if (nature === 'REPETITION') return 'Repetição';
  if (nature === 'ADJUSTMENT') return 'Ajuste';
  return 'Normal';
};

export const getUrgencyLabel = (urgency?: UrgencyLevel | string): string => {
  if (urgency === UrgencyLevel.VIP || urgency === 'VIP') return 'VIP / Urgente';
  if (urgency === UrgencyLevel.HIGH || urgency === 'HIGH') return 'Alta';
  if (urgency === UrgencyLevel.LOW || urgency === 'LOW') return 'Baixa';
  return 'Normal';
};

export const getStatusLabelPt = (status?: JobStatus | string): string => {
  switch (status) {
    case JobStatus.WAITING_APPROVAL: return 'Aguardando';
    case JobStatus.PENDING: return 'Pendente';
    case JobStatus.IN_PROGRESS: return 'Produção';
    case JobStatus.COMPLETED: return 'Finalizado';
    case JobStatus.DELIVERED: return 'Entregue';
    case JobStatus.REJECTED: return 'Recusado';
    case JobStatus.CANCELED: return 'Cancelado';
    case JobStatus.RETURNED: return 'Devolvido';
    case JobStatus.SECTOR_TRANSITION: return 'Em Transição';
    default: return String(status || '-');
  }
};

const formatTeethList = (teeth?: string[]): string => {
  if (!teeth || teeth.length === 0) return 'Nenhum';
  return teeth.join(', ');
};

const buildDiscountOrSurchargeText = (item: Partial<JobItem>): string | null => {
  const isSur =
    item.priceAdjustmentType === 'SURCHARGE' ||
    Number(item.appliedSurcharge) > 0 ||
    Number(item.appliedSurchargeFixed) > 0;

  if (isSur) {
    if (Number(item.appliedSurchargeFixed) > 0) {
      return `Acréscimo de ${formatHistoryCurrency(item.appliedSurchargeFixed)}`;
    }
    if (Number(item.appliedSurcharge) > 0) {
      return `Acréscimo de ${Number(item.appliedSurcharge)}%`;
    }
  } else {
    if (Number(item.appliedDiscountFixed) > 0) {
      return `Desconto de ${formatHistoryCurrency(item.appliedDiscountFixed)}`;
    }
    if (Number(item.appliedDiscount) > 0) {
      return `Desconto de ${Number(item.appliedDiscount)}%`;
    }
  }
  return null;
};

const getNaturePrefixLocal = (nature?: string): string => {
  if (!nature) return '';
  const n = String(nature).toUpperCase();
  if (n === 'REPETITION' || n === 'REPETICAO' || n === 'REPETIÇÃO') return '(R) ';
  if (n === 'ADJUSTMENT' || n === 'AJUSTE') return '(A) ';
  return '';
};

const getVariationParts = (item: Partial<JobItem>, jobTypes: JobType[] = []): string[] => {
  const ids = item.selectedVariationIds || [];
  if (ids.length === 0) return [];
  const jt = jobTypes.find(t => t.id === item.jobTypeId);
  if (!jt) return [];
  const groups: any[] =
    jt.variationGroups && jt.variationGroups.length > 0
      ? jt.variationGroups
      : jt.variations && jt.variations.length > 0
        ? [{ id: 'default', name: 'Opções', options: jt.variations }]
        : [];

  const parts: string[] = [];
  ids.forEach(optId => {
    for (const group of groups) {
      const opt = (group.options || []).find((o: any) => o.id === optId);
      if (opt) {
        if (group.selectionType === 'TEXT' && item.variationValues?.[optId]) {
          parts.push(`${group.name}: ${item.variationValues[optId]}`);
        } else if (opt.name) {
          parts.push(opt.name);
        }
      }
    }
  });
  return parts;
};

export const formatHistoryServiceName = (
  item: Partial<JobItem> | undefined | null,
  jobTypes: JobType[] = []
): string => {
  if (!item) return 'Serviço';
  const jt = jobTypes.find(t => t.id === item.jobTypeId);
  let baseName = (item.name || jt?.name || 'Serviço').trim();

  if (jt?.name && jt.name.trim() && !baseName.toLowerCase().includes(jt.name.trim().toLowerCase())) {
    baseName = `${baseName} · ${jt.name.trim()}`;
  }

  const varParts = getVariationParts(item, jobTypes).filter(
    part => !baseName.toLowerCase().includes(part.toLowerCase())
  );
  let result = varParts.length > 0 ? `${baseName} - ${varParts.join(' - ')}` : baseName;

  const cat = jt?.category?.trim();
  if (cat && !result.toLowerCase().includes(cat.toLowerCase())) {
    result = `${result} (${cat})`;
  }

  return `${getNaturePrefixLocal(item.nature)}${result}`;
};

const getVariationNames = (item: Partial<JobItem>, jobTypes: JobType[] = []): string => {
  const parts = getVariationParts(item, jobTypes);
  if (parts.length > 0) return parts.join(', ');
  const ids = item.selectedVariationIds || [];
  return ids.length > 0 ? `${ids.length} variação(ões)` : 'Nenhuma';
};

export interface CreateCaseHistoryParams {
  userId: string;
  userName: string;
  sector: string;
  osNumber: string;
  patientName: string;
  dentistName: string;
  subDentistName?: string;
  dueDate: Date | string;
  dueTime?: string;
  boxNumber?: string;
  boxColorName?: string;
  urgency?: UrgencyLevel | string;
  entryType?: string;
  origin?: string;
  items: JobItem[];
  products?: JobProduct[];
  totalValue: number;
  notes?: string;
  createdAt?: Date;
  jobTypes?: JobType[];
  receivedMaterials?: string[];
  receivedMaterialQuantities?: Record<string, number>;
}

export const createCaseCreatedHistory = (params: CreateCaseHistoryParams): JobHistory => {
  const now = params.createdAt || new Date();
  const jobTypes = params.jobTypes || [];
  const itemsList = params.items || [];
  const productsList = params.products || [];

  let action = 'cadastrou o caso';
  if (params.origin === 'ONLINE_REQUISITION') {
    action = 'aceitou a requisição online e cadastrou o caso';
  } else if (params.origin === 'ONLINE_ORDER') {
    action = 'aprovou o pedido web e oficializou o caso';
  }

  const tipoLabel =
    params.entryType === 'CONTINUATION'
      ? 'Continuidade / Retorno'
      : params.origin === 'ONLINE_ORDER'
        ? 'Pedido Web'
        : params.origin === 'ONLINE_REQUISITION'
          ? 'Requisição Online'
          : 'Pedido';

  const servicesSummaryLines = itemsList.map((item) => {
    const qty = Number(item.quantity) || 1;
    const unitPrice = Number(item.price) || 0;
    const fullName = formatHistoryServiceName(item, jobTypes);
    const colorStr = item.color?.trim() || 'Nenhuma';
    const teethStr = formatTeethList(item.selectedTeeth);
    return `${qty}x ${fullName} · ${formatHistoryCurrency(unitPrice * qty)} · Cor: ${colorStr} · Dentes: ${teethStr}`;
  });

  const productsSummaryLines = productsList.map((prod) => {
    const qty = Number(prod.quantity) || 1;
    const unitPrice = Number(prod.unitPrice) || 0;
    return `${qty}x ${prod.name} · ${formatHistoryCurrency(unitPrice * qty)}`;
  });

  const materialsStr =
    params.receivedMaterials && params.receivedMaterials.length > 0
      ? params.receivedMaterials
          .map(m => `${params.receivedMaterialQuantities?.[m] ? `${params.receivedMaterialQuantities[m]}x ` : ''}${m}`)
          .join(', ')
      : '';

  const details: JobHistoryFieldDetail[] = [
    { label: 'Cadastrado por', value: params.userName },
    { label: 'Cliente / Dentista', value: params.dentistName || '-' },
    ...(params.subDentistName ? [{ label: 'Dentista executor', value: params.subDentistName }] : []),
    { label: 'Paciente', value: params.patientName || '-' },
    { label: 'Número da OS', value: params.osNumber || '-' },
    { label: 'Tipo', value: tipoLabel },
    { label: 'Status inicial', value: params.origin === 'ONLINE_ORDER' && params.sector === 'Loja Virtual' ? 'Aguardando' : 'Pendente' },
    { label: 'Data de entrada', value: formatHistoryDateTime(now) },
    { label: 'Data prevista', value: `${formatHistoryDate(params.dueDate)}${params.dueTime ? ` às ${params.dueTime}` : ''}` },
    { label: 'Caixa', value: params.boxNumber ? `${params.boxNumber}${params.boxColorName ? ` (${params.boxColorName})` : ''}` : 'Nenhuma' },
    { label: 'Prioridade', value: getUrgencyLabel(params.urgency) },
    { label: 'Setor inicial', value: params.sector || 'Recepção' },
    ...(materialsStr ? [{ label: 'Materiais recebidos', value: materialsStr }] : []),
    { label: 'Valor total do caso', value: formatHistoryCurrency(params.totalValue) },
    { label: 'Tipos de serviço', value: servicesSummaryLines.length > 0 ? servicesSummaryLines.join('\n') : 'Nenhum' },
    ...(productsSummaryLines.length > 0 ? [{ label: 'Produtos adicionais', value: productsSummaryLines.join('\n') }] : []),
    { label: 'Observações', value: params.notes?.trim() || 'Nenhuma' }
  ];

  const sections: JobHistorySection[] = [
    ...itemsList.map((item) => {
      const jt = jobTypes.find(t => t.id === item.jobTypeId);
      const fullName = formatHistoryServiceName(item, jobTypes);
      const varNames = getVariationNames(item, jobTypes);
      const qty = Number(item.quantity) || 1;
      const unitPrice = Number(item.price) || 0;
      const basePrice = item.basePriceBeforeDiscount !== undefined ? Number(item.basePriceBeforeDiscount) : unitPrice;
      const adj = buildDiscountOrSurchargeText(item);
      const fields: JobHistoryFieldDetail[] = [
        { label: 'Serviço / Item', value: fullName },
        ...(jt?.category ? [{ label: 'Categoria', value: jt.category }] : []),
        ...(varNames !== 'Nenhuma' ? [{ label: 'Variações', value: varNames }] : []),
        { label: 'Quantidade', value: String(qty) },
        { label: 'Preço unitário', value: formatHistoryCurrency(basePrice) },
        ...(adj ? [{ label: 'Ajuste de valor', value: adj }] : []),
        { label: 'Valor total', value: formatHistoryCurrency(unitPrice * qty) },
        { label: 'Cor', value: item.color?.trim() || 'Nenhuma' },
        { label: 'Dentes', value: formatTeethList(item.selectedTeeth) }
      ];
      return {
        title: `Serviço: ${fullName}`,
        subtitle: jt?.category ? `${jt.category} · ${getNatureLabel(item.nature)}` : getNatureLabel(item.nature),
        fields
      };
    }),
    ...productsList.map((prod) => {
      const qty = Number(prod.quantity) || 1;
      const unitPrice = Number(prod.unitPrice) || 0;
      return {
        title: `Produto: ${prod.name}`,
        subtitle: 'Produto adicional',
        fields: [
          { label: 'Produto / Item', value: prod.name },
          { label: 'Quantidade', value: String(qty) },
          { label: 'Preço unitário', value: formatHistoryCurrency(prod.basePriceBeforeDiscount ?? unitPrice) },
          { label: 'Valor total', value: formatHistoryCurrency(unitPrice * qty) }
        ]
      };
    })
  ];

  return {
    id: `hist_create_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: now,
    action,
    targetName: params.osNumber ? `OS #${params.osNumber}` : undefined,
    userId: params.userId,
    userName: params.userName,
    sector: params.sector,
    category: 'CREATED',
    details,
    sections: sections.length > 0 ? sections : undefined
  };
};

export const buildLegacyCreatedFallback = (
  job: Job,
  h: JobHistory,
  jobTypes: JobType[] = [],
  hasSubsequentEdits = false
): { details: JobHistoryFieldDetail[]; sections?: JobHistorySection[] } => {
  const generated = createCaseCreatedHistory({
    userId: h.userId || '',
    userName: h.userName || 'Sistema',
    sector: h.sector || job.currentSector || 'Recepção',
    osNumber: job.osNumber || '-',
    patientName: job.patientName || '-',
    dentistName: job.dentistName || '-',
    subDentistName: job.subDentistName,
    dueDate: job.dueDate,
    dueTime: job.dueTime,
    boxNumber: job.boxNumber,
    boxColorName: job.boxColor?.name,
    urgency: job.urgency,
    entryType: (job as any).entryType,
    origin: job.origin,
    items: job.items || [],
    products: job.products || [],
    totalValue: Number(job.totalValue) || 0,
    notes: job.notes,
    createdAt: h.timestamp ? new Date(h.timestamp) : (job.createdAt ? new Date(job.createdAt) : new Date()),
    jobTypes,
    receivedMaterials: job.receivedMaterials,
    receivedMaterialQuantities: job.receivedMaterialQuantities
  });
  const baseDetails = generated.details || [];
  return {
    details: hasSubsequentEdits
      ? [...baseDetails, { label: 'Nota do registro', value: 'Dados atuais do caso (registrado antes do histórico detalhado)' }]
      : baseDetails,
    sections: generated.sections
  };
};

export interface BuildCaseEditHistoryParams {
  oldJob: Job;
  userId: string;
  userName: string;
  sector?: string;
  newValues: {
    patientName: string;
    osNumber: string;
    dentistName: string;
    subDentistName?: string;
    boxNumber?: string;
    boxColorName?: string;
    dueDateStr: string;
    dueTime?: string;
    urgency: UrgencyLevel | string;
    notes: string;
    receivedMaterials: string[];
    receivedMaterialQuantities: Record<string, number>;
    items: JobItem[];
    products: JobProduct[];
  };
  jobTypes: JobType[];
}

export const buildCaseEditHistoryEntries = (params: BuildCaseEditHistoryParams): JobHistory[] => {
  const { oldJob, userId, userName, newValues, jobTypes } = params;
  const sector = params.sector || 'Gestão';
  const baseTs = Date.now();
  let seq = 0;
  const nextId = (prefix: string) => `${prefix}_${baseTs}_${seq++}`;
  const entries: JobHistory[] = [];

  const oldItems = oldJob.items || [];
  const newItems = newValues.items || [];

  // 1. Added services
  newItems.forEach((item) => {
    const exists = oldItems.some((old) => old.id === item.id);
    if (!exists) {
      const fullName = formatHistoryServiceName(item, jobTypes);
      const qty = Number(item.quantity) || 1;
      const unitPrice = Number(item.price) || 0;
      const basePrice = item.basePriceBeforeDiscount !== undefined ? Number(item.basePriceBeforeDiscount) : unitPrice;
      const adj = buildDiscountOrSurchargeText(item);
      const varNames = getVariationNames(item, jobTypes);

      const details: JobHistoryFieldDetail[] = [
        { label: 'Serviço / Item', value: fullName },
        { label: 'Preço unitário', value: formatHistoryCurrency(basePrice) },
        { label: 'Quantidade', value: String(qty) },
        ...(adj ? [{ label: 'Desconto / Acréscimo', value: adj }] : []),
        { label: 'Valor final', value: formatHistoryCurrency(unitPrice * qty) },
        { label: 'Natureza', value: getNatureLabel(item.nature) },
        ...(varNames !== 'Nenhuma' ? [{ label: 'Variações', value: varNames }] : []),
        { label: 'Dentes', value: formatTeethList(item.selectedTeeth) },
        { label: 'Cor', value: item.color || 'Nenhuma' }
      ];

      entries.push({
        id: nextId('hist_svc_add'),
        timestamp: new Date(baseTs + seq),
        action: 'adicionou o serviço',
        targetName: fullName,
        userId,
        userName,
        sector,
        category: 'SERVICE_ADDED',
        details
      });
    }
  });

  // 2. Removed services
  oldItems.forEach((oldItem) => {
    const stillExists = newItems.some((n) => n.id === oldItem.id);
    if (!stillExists) {
      const fullName = formatHistoryServiceName(oldItem, jobTypes);
      const qty = Number(oldItem.quantity) || 1;
      const total = (Number(oldItem.price) || 0) * qty;
      entries.push({
        id: nextId('hist_svc_rem'),
        timestamp: new Date(baseTs + seq),
        action: 'removeu o serviço',
        targetName: fullName,
        userId,
        userName,
        sector,
        category: 'SERVICE_REMOVED',
        details: [
          { label: 'Serviço / Item removido', value: fullName },
          { label: 'Quantidade', value: String(qty) },
          { label: 'Valor anterior', value: formatHistoryCurrency(total) },
          { label: 'Dentes', value: formatTeethList(oldItem.selectedTeeth) },
          { label: 'Cor', value: oldItem.color || 'Nenhuma' }
        ]
      });
    }
  });

  // 3. Edited services
  newItems.forEach((newItem) => {
    const oldItem = oldItems.find((o) => o.id === newItem.id);
    if (!oldItem) return;

    const oldFullName = formatHistoryServiceName(oldItem, jobTypes);
    const newFullName = formatHistoryServiceName(newItem, jobTypes);
    const itemDiffs: JobHistoryFieldDetail[] = [];

    if (oldItem.name !== newItem.name || oldItem.jobTypeId !== newItem.jobTypeId) {
      itemDiffs.push({
        label: 'Serviço / Item',
        oldValue: oldFullName,
        newValue: newFullName,
        isDiff: true
      });
    }

    const oldQty = Number(oldItem.quantity) || 1;
    const newQty = Number(newItem.quantity) || 1;
    if (oldQty !== newQty) {
      itemDiffs.push({
        label: 'Quantidade',
        oldValue: String(oldQty),
        newValue: String(newQty),
        isDiff: true
      });
    }

    const oldUnit = Number(oldItem.price) || 0;
    const newUnit = Number(newItem.price) || 0;
    const oldBase = oldItem.basePriceBeforeDiscount !== undefined ? Number(oldItem.basePriceBeforeDiscount) : oldUnit;
    const newBase = newItem.basePriceBeforeDiscount !== undefined ? Number(newItem.basePriceBeforeDiscount) : newUnit;

    if (Math.abs(oldBase - newBase) > 0.009) {
      itemDiffs.push({
        label: 'Valor unitário base',
        oldValue: formatHistoryCurrency(oldBase),
        newValue: formatHistoryCurrency(newBase),
        isDiff: true
      });
    }

    if (Math.abs(oldUnit * oldQty - newUnit * newQty) > 0.009 || Math.abs(oldUnit - newUnit) > 0.009) {
      itemDiffs.push({
        label: 'Valor total do serviço',
        oldValue: formatHistoryCurrency(oldUnit * oldQty),
        newValue: formatHistoryCurrency(newUnit * newQty),
        isDiff: true
      });
    }

    const oldAdj = buildDiscountOrSurchargeText(oldItem) || 'Nenhum';
    const newAdj = buildDiscountOrSurchargeText(newItem) || 'Nenhum';
    if (oldAdj !== newAdj) {
      itemDiffs.push({
        label: 'Desconto / Acréscimo',
        oldValue: oldAdj,
        newValue: newAdj,
        isDiff: true
      });
    }

    const oldColor = (oldItem.color || '').trim() || 'Nenhuma';
    const newColor = (newItem.color || '').trim() || 'Nenhuma';
    if (oldColor !== newColor) {
      itemDiffs.push({
        label: 'Cor',
        oldValue: oldColor,
        newValue: newColor,
        isDiff: true
      });
    }

    const oldTeeth = formatTeethList(oldItem.selectedTeeth);
    const newTeeth = formatTeethList(newItem.selectedTeeth);
    if (oldTeeth !== newTeeth) {
      itemDiffs.push({
        label: 'Dentes',
        oldValue: oldTeeth,
        newValue: newTeeth,
        isDiff: true
      });
    }

    const oldNature = getNatureLabel(oldItem.nature);
    const newNature = getNatureLabel(newItem.nature);
    if (oldNature !== newNature) {
      itemDiffs.push({
        label: 'Natureza',
        oldValue: oldNature,
        newValue: newNature,
        isDiff: true
      });
    }

    const oldVars = getVariationNames(oldItem, jobTypes);
    const newVars = getVariationNames(newItem, jobTypes);
    if (oldVars !== newVars) {
      itemDiffs.push({
        label: 'Variações',
        oldValue: oldVars,
        newValue: newVars,
        isDiff: true
      });
    }

    if (itemDiffs.length > 0) {
      const hasNameDiff = itemDiffs.some(d => d.label === 'Serviço / Item');
      const finalDetails = hasNameDiff
        ? itemDiffs
        : [{ label: 'Serviço / Item', value: newFullName }, ...itemDiffs];
      entries.push({
        id: nextId('hist_svc_edit'),
        timestamp: new Date(baseTs + seq),
        action: 'editou o serviço',
        targetName: newFullName,
        userId,
        userName,
        sector,
        category: 'SERVICE_EDITED',
        details: finalDetails
      });
    }
  });

  // 4. Products (Added / Removed / Edited)
  const oldProducts = oldJob.products || [];
  const newProducts = newValues.products || [];

  newProducts.forEach((p) => {
    if (!oldProducts.some((o) => o.id === p.id)) {
      const qty = Number(p.quantity) || 1;
      const unit = Number(p.unitPrice) || 0;
      entries.push({
        id: nextId('hist_prd_add'),
        timestamp: new Date(baseTs + seq),
        action: 'adicionou o produto',
        targetName: p.name,
        userId,
        userName,
        sector,
        category: 'PRODUCT_ADDED',
        details: [
          { label: 'Quantidade', value: String(qty) },
          { label: 'Valor unitário', value: formatHistoryCurrency(unit) },
          { label: 'Valor total', value: formatHistoryCurrency(unit * qty) }
        ]
      });
    }
  });

  oldProducts.forEach((oldP) => {
    if (!newProducts.some((n) => n.id === oldP.id)) {
      const qty = Number(oldP.quantity) || 1;
      const unit = Number(oldP.unitPrice) || 0;
      entries.push({
        id: nextId('hist_prd_rem'),
        timestamp: new Date(baseTs + seq),
        action: 'removeu o produto',
        targetName: oldP.name,
        userId,
        userName,
        sector,
        category: 'PRODUCT_REMOVED',
        details: [
          { label: 'Produto removido', value: oldP.name },
          { label: 'Quantidade anterior', value: String(qty) },
          { label: 'Valor anterior', value: formatHistoryCurrency(unit * qty) }
        ]
      });
    }
  });

  newProducts.forEach((newP) => {
    const oldP = oldProducts.find((o) => o.id === newP.id);
    if (!oldP) return;
    const pDiffs: JobHistoryFieldDetail[] = [];
    const oldQty = Number(oldP.quantity) || 1;
    const newQty = Number(newP.quantity) || 1;
    if (oldQty !== newQty) {
      pDiffs.push({ label: 'Quantidade', oldValue: String(oldQty), newValue: String(newQty), isDiff: true });
    }
    const oldUnit = Number(oldP.unitPrice) || 0;
    const newUnit = Number(newP.unitPrice) || 0;
    if (Math.abs(oldUnit - newUnit) > 0.009 || Math.abs(oldUnit * oldQty - newUnit * newQty) > 0.009) {
      pDiffs.push({
        label: 'Valor total',
        oldValue: formatHistoryCurrency(oldUnit * oldQty),
        newValue: formatHistoryCurrency(newUnit * newQty),
        isDiff: true
      });
    }
    if (pDiffs.length > 0) {
      entries.push({
        id: nextId('hist_prd_edit'),
        timestamp: new Date(baseTs + seq),
        action: 'editou o produto',
        targetName: newP.name,
        userId,
        userName,
        sector,
        category: 'PRODUCT_EDITED',
        details: pDiffs
      });
    }
  });

  // 5. Observations / Notes change
  const oldNotes = (oldJob.notes || '').trim();
  const newNotes = (newValues.notes || '').trim();
  if (oldNotes !== newNotes) {
    if (!oldNotes && newNotes) {
      entries.push({
        id: nextId('hist_notes_add'),
        timestamp: new Date(baseTs + seq),
        action: 'adicionou uma observação ao caso',
        userId,
        userName,
        sector,
        category: 'NOTES_ADDED',
        summaryText: newNotes
      });
    } else {
      entries.push({
        id: nextId('hist_notes_edit'),
        timestamp: new Date(baseTs + seq),
        action: 'alterou as observações do caso',
        userId,
        userName,
        sector,
        category: 'NOTES_EDITED',
        diffBlock: {
          oldText: oldNotes || '(Nenhuma)',
          newText: newNotes || '(Removida)'
        }
      });
    }
  }

  // 6. General Case Fields
  const generalDiffs: JobHistoryFieldDetail[] = [];
  if ((oldJob.patientName || '') !== (newValues.patientName || '')) {
    generalDiffs.push({ label: 'Paciente', oldValue: oldJob.patientName || '-', newValue: newValues.patientName || '-', isDiff: true });
  }
  if ((oldJob.osNumber || '') !== (newValues.osNumber || '')) {
    generalDiffs.push({ label: 'Número OS', oldValue: oldJob.osNumber || '-', newValue: newValues.osNumber || '-', isDiff: true });
  }
  if ((oldJob.dentistName || '') !== (newValues.dentistName || '')) {
    generalDiffs.push({ label: 'Cliente / Dentista', oldValue: oldJob.dentistName || '-', newValue: newValues.dentistName || '-', isDiff: true });
  }
  if ((oldJob.subDentistName || '') !== (newValues.subDentistName || '')) {
    generalDiffs.push({
      label: 'Dentista executor',
      oldValue: oldJob.subDentistName || 'Nenhum',
      newValue: newValues.subDentistName || 'Nenhum',
      isDiff: true
    });
  }
  if ((oldJob.boxNumber || '') !== (newValues.boxNumber || '')) {
    generalDiffs.push({
      label: 'Caixa',
      oldValue: oldJob.boxNumber || 'Nenhuma',
      newValue: newValues.boxNumber || 'Nenhuma',
      isDiff: true
    });
  }
  const oldBoxColor = oldJob.boxColor?.name || 'Sem cor';
  const newBoxColor = newValues.boxColorName || 'Sem cor';
  if (oldBoxColor !== newBoxColor) {
    generalDiffs.push({ label: 'Cor da Caixa', oldValue: oldBoxColor, newValue: newBoxColor, isDiff: true });
  }
  const oldDueStr = oldJob.dueDate ? new Date(oldJob.dueDate).toISOString().split('T')[0] : '';
  if (oldDueStr !== (newValues.dueDateStr || '')) {
    generalDiffs.push({
      label: 'Previsão de entrega',
      oldValue: formatHistoryDate(oldJob.dueDate),
      newValue: newValues.dueDateStr ? formatHistoryDate(new Date(`${newValues.dueDateStr}T12:00:00`)) : '-',
      isDiff: true
    });
  }
  if ((oldJob.dueTime || '') !== (newValues.dueTime || '')) {
    generalDiffs.push({
      label: 'Hora prevista',
      oldValue: oldJob.dueTime || 'Nenhuma',
      newValue: newValues.dueTime || 'Nenhuma',
      isDiff: true
    });
  }
  if ((oldJob.urgency || '') !== (newValues.urgency || '')) {
    generalDiffs.push({
      label: 'Prioridade',
      oldValue: getUrgencyLabel(oldJob.urgency),
      newValue: getUrgencyLabel(newValues.urgency),
      isDiff: true
    });
  }

  const formatMaterials = (mats: string[], qtys: Record<string, number>) => {
    if (!mats || mats.length === 0) return 'Nenhum';
    return mats.map(m => `${qtys?.[m] ? `${qtys[m]}x ` : ''}${m}`).join(', ');
  };
  const oldMatsStr = formatMaterials(oldJob.receivedMaterials || [], oldJob.receivedMaterialQuantities || {});
  const newMatsStr = formatMaterials(newValues.receivedMaterials || [], newValues.receivedMaterialQuantities || {});
  if (oldMatsStr !== newMatsStr) {
    generalDiffs.push({ label: 'Materiais recebidos', oldValue: oldMatsStr, newValue: newMatsStr, isDiff: true });
  }

  if (generalDiffs.length > 0) {
    entries.push({
      id: nextId('hist_edit'),
      timestamp: new Date(baseTs + seq),
      action: 'editou os dados da ficha',
      userId,
      userName,
      sector,
      category: 'EDITED',
      details: generalDiffs
    });
  }

  if (entries.length === 0) {
    entries.push({
      id: nextId('hist_edit'),
      timestamp: new Date(baseTs),
      action: 'salvou a ficha do caso sem alterações',
      userId,
      userName,
      sector,
      category: 'EDITED'
    });
  }

  return entries;
};

export interface BuildSingleItemEditParams {
  oldItem: JobItem;
  newItem: Partial<JobItem>;
  userId: string;
  userName: string;
  sector?: string;
  jobTypes: JobType[];
}

export const buildSingleItemEditHistory = (params: BuildSingleItemEditParams): JobHistory => {
  const { oldItem, newItem, userId, userName, jobTypes } = params;
  const diffs: JobHistoryFieldDetail[] = [];

  const oldQty = Number(oldItem.quantity) || 1;
  const newQty = Number(newItem.quantity) || 1;
  if (oldQty !== newQty) {
    diffs.push({ label: 'Quantidade', oldValue: String(oldQty), newValue: String(newQty), isDiff: true });
  }

  const oldUnit = Number(oldItem.price) || 0;
  const newUnit = Number(newItem.price) || 0;
  const oldBase = oldItem.basePriceBeforeDiscount !== undefined ? Number(oldItem.basePriceBeforeDiscount) : oldUnit;
  const newBase = newItem.basePriceBeforeDiscount !== undefined ? Number(newItem.basePriceBeforeDiscount) : newUnit;

  if (Math.abs(oldBase - newBase) > 0.009) {
    diffs.push({
      label: 'Valor unitário base',
      oldValue: formatHistoryCurrency(oldBase),
      newValue: formatHistoryCurrency(newBase),
      isDiff: true
    });
  }

  if (Math.abs(oldUnit * oldQty - newUnit * newQty) > 0.009 || Math.abs(oldUnit - newUnit) > 0.009) {
    diffs.push({
      label: 'Valor total do serviço',
      oldValue: formatHistoryCurrency(oldUnit * oldQty),
      newValue: formatHistoryCurrency(newUnit * newQty),
      isDiff: true
    });
  }

  const oldAdj = buildDiscountOrSurchargeText(oldItem) || 'Nenhum';
  const newAdj = buildDiscountOrSurchargeText(newItem) || 'Nenhum';
  if (oldAdj !== newAdj) {
    diffs.push({ label: 'Desconto / Acréscimo', oldValue: oldAdj, newValue: newAdj, isDiff: true });
  }

  const oldColor = (oldItem.color || '').trim() || 'Nenhuma';
  const newColor = (newItem.color || '').trim() || 'Nenhuma';
  if (oldColor !== newColor) {
    diffs.push({ label: 'Cor', oldValue: oldColor, newValue: newColor, isDiff: true });
  }

  const oldTeeth = formatTeethList(oldItem.selectedTeeth);
  const newTeeth = formatTeethList(newItem.selectedTeeth);
  if (oldTeeth !== newTeeth) {
    diffs.push({ label: 'Dentes', oldValue: oldTeeth, newValue: newTeeth, isDiff: true });
  }

  const oldNature = getNatureLabel(oldItem.nature);
  const newNature = getNatureLabel(newItem.nature);
  if (oldNature !== newNature) {
    diffs.push({ label: 'Natureza', oldValue: oldNature, newValue: newNature, isDiff: true });
  }

  const oldVars = getVariationNames(oldItem, jobTypes);
  const newVars = getVariationNames({ ...oldItem, ...newItem }, jobTypes);
  if (oldVars !== newVars) {
    diffs.push({ label: 'Variações', oldValue: oldVars, newValue: newVars, isDiff: true });
  }

  const fullName = formatHistoryServiceName({ ...oldItem, ...newItem }, jobTypes);
  const detailsList: JobHistoryFieldDetail[] = [
    { label: 'Serviço / Item', value: fullName },
    ...(diffs.length > 0
      ? diffs
      : [
          { label: 'Quantidade', value: String(newQty) },
          { label: 'Valor total', value: formatHistoryCurrency(newUnit * newQty) },
          { label: 'Cor', value: newColor }
        ])
  ];

  return {
    id: `hist_item_edit_${Date.now()}`,
    timestamp: new Date(),
    action: 'editou o serviço',
    targetName: fullName,
    userId,
    userName,
    sector: params.sector || 'Gestão',
    category: 'SERVICE_EDITED',
    details: detailsList
  };
};

export const createNotesHistory = (params: {
  userId: string;
  userName: string;
  sector?: string;
  noteType: 'CASE_NOTE' | 'OBSERVATION';
  oldText?: string;
  newText: string;
}): JobHistory => {
  const oldTrim = (params.oldText || '').trim();
  const newTrim = (params.newText || '').trim();
  const isInternal = params.noteType === 'CASE_NOTE';

  if (!oldTrim && newTrim) {
    return {
      id: `hist_notes_${Date.now()}`,
      timestamp: new Date(),
      action: isInternal ? 'adicionou uma nota interna do caso' : 'adicionou uma observação ao caso',
      userId: params.userId,
      userName: params.userName,
      sector: params.sector,
      category: 'NOTES_ADDED',
      summaryText: newTrim
    };
  }

  return {
    id: `hist_notes_${Date.now()}`,
    timestamp: new Date(),
    action: isInternal ? 'alterou a nota interna do caso' : 'alterou a observação do caso',
    userId: params.userId,
    userName: params.userName,
    sector: params.sector,
    category: 'NOTES_EDITED',
    diffBlock: {
      oldText: oldTrim || '(Vazio)',
      newText: newTrim || '(Removido)'
    }
  };
};

export const createMediaHistory = (params: {
  userId: string;
  userName: string;
  sector?: string;
  actionType: 'ADDED' | 'REMOVED' | 'COMMENT';
  files?: { name: string; size?: number; source?: string; mediaType?: string }[];
  fileName?: string;
  oldComment?: string;
  newComment?: string;
}): JobHistory => {
  if (params.actionType === 'REMOVED') {
    return {
      id: `hist_delatt_${Date.now()}`,
      timestamp: new Date(),
      action: 'removeu o arquivo',
      targetName: params.fileName || 'anexo',
      userId: params.userId,
      userName: params.userName,
      sector: params.sector,
      category: 'MEDIA_REMOVED',
      details: [
        { label: 'Arquivo removido', value: params.fileName || 'N/A' },
        ...(params.oldComment ? [{ label: 'Descrição anterior', value: params.oldComment }] : [])
      ]
    };
  }

  if (params.actionType === 'COMMENT') {
    const oldC = (params.oldComment || '').trim();
    const newC = (params.newComment || '').trim();
    return {
      id: `hist_comment_${Date.now()}`,
      timestamp: new Date(),
      action: 'atualizou a descrição do arquivo',
      targetName: params.fileName || 'anexo',
      userId: params.userId,
      userName: params.userName,
      sector: params.sector,
      category: 'MEDIA_COMMENT',
      ...(oldC
        ? { diffBlock: { oldText: oldC, newText: newC || '(Removida)' } }
        : { summaryText: newC || 'Descrição removida' })
    };
  }

  const files = params.files || [];
  if (files.length === 1) {
    const f = files[0];
    const ext = f.name.split('.').pop()?.toLowerCase() || '';
    const inferredType =
      f.mediaType ||
      (['mp4', 'webm', 'mov'].includes(ext)
        ? 'Vídeo'
        : ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)
          ? 'Imagem'
          : ext === 'stl' || ext === 'ply' || ext === 'obj'
            ? `Modelo 3D (.${ext.toUpperCase()})`
            : ext
              ? `Arquivo (.${ext.toUpperCase()})`
              : 'Arquivo');
    const sizeStr = f.size ? (f.size > 1024 * 1024 ? `${(f.size / 1024 / 1024).toFixed(2)} MB` : `${(f.size / 1024).toFixed(1)} KB`) : undefined;

    return {
      id: `hist_files_${Date.now()}`,
      timestamp: new Date(),
      action: 'cadastrou o arquivo',
      targetName: f.name,
      userId: params.userId,
      userName: params.userName,
      sector: params.sector,
      category: 'MEDIA_ADDED',
      details: [
        { label: 'Tipo de mídia', value: inferredType },
        { label: 'Origem', value: f.source === 'WEB' ? 'Web / Clínica' : 'Laboratório' },
        ...(sizeStr ? [{ label: 'Tamanho', value: sizeStr }] : [])
      ]
    };
  }

  return {
    id: `hist_files_${Date.now()}`,
    timestamp: new Date(),
    action: `cadastrou ${files.length} arquivos`,
    targetName: files.map(f => f.name).join(', '),
    userId: params.userId,
    userName: params.userName,
    sector: params.sector,
    category: 'MEDIA_ADDED',
    details: files.map((f, idx) => ({
      label: `Arquivo ${idx + 1}`,
      value: f.name
    }))
  };
};

export const createSectorMovementHistory = (params: {
  userId: string;
  userName: string;
  sector: string;
  movementType: 'ENTRY' | 'EXIT';
  itemName?: string;
  stageName?: string;
  quantity?: number;
  method?: string;
}): JobHistory => {
  const isEntry = params.movementType === 'ENTRY';
  const details: JobHistoryFieldDetail[] = [
    { label: 'Tipo de movimentação', value: isEntry ? 'Entrada no setor' : 'Saída do setor' },
    { label: 'Setor', value: params.sector },
    ...(params.itemName ? [{ label: 'Serviço / Item', value: params.itemName }] : []),
    ...(params.stageName ? [{ label: 'Etapa', value: params.stageName }] : [{ label: 'Etapa', value: 'Etapa Base' }]),
    ...(params.quantity !== undefined ? [{ label: 'Quantidade', value: String(params.quantity) }] : []),
    { label: 'Responsável', value: params.userName },
    ...(params.method ? [{ label: 'Registro via', value: params.method }] : [])
  ];

  return {
    id: `hist_mov_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date(),
    action: isEntry ? 'registrou entrada no setor' : 'registrou saída do setor',
    targetName: params.stageName ? `${params.sector} · ${params.stageName}` : params.sector,
    userId: params.userId,
    userName: params.userName,
    sector: params.sector,
    category: 'SECTOR_MOVEMENT',
    details
  };
};

export const createStatusChangeHistory = (params: {
  userId: string;
  userName: string;
  sector?: string;
  oldStatus?: JobStatus | string;
  newStatus: JobStatus | string;
  reason?: string;
  extraNote?: string;
}): JobHistory => {
  const oldLabel = getStatusLabelPt(params.oldStatus);
  const newLabel = getStatusLabelPt(params.newStatus);

  const details: JobHistoryFieldDetail[] = [
    ...(params.oldStatus ? [{ label: 'Status anterior', value: oldLabel }] : []),
    { label: 'Novo status', value: newLabel },
    ...(params.sector ? [{ label: 'Setor', value: params.sector }] : []),
    ...(params.reason ? [{ label: 'Motivo / Justificativa', value: params.reason }] : []),
    ...(params.extraNote ? [{ label: 'Detalhe', value: params.extraNote }] : [])
  ];

  return {
    id: `hist_stat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date(),
    action: params.oldStatus
      ? `alterou o status de ${oldLabel.toLowerCase()} para ${newLabel.toLowerCase()}`
      : `alterou o status para ${newLabel.toLowerCase()}`,
    targetName: newLabel,
    userId: params.userId,
    userName: params.userName,
    sector: params.sector || 'Gestão',
    category: 'STATUS_CHANGED',
    details
  };
};

export const getHistoryCategoryFilterGroup = (h: JobHistory): string => {
  if (h.category) {
    switch (h.category) {
      case 'CREATED': return 'CREATED';
      case 'EDITED': return 'EDITED';
      case 'SERVICE_ADDED':
      case 'SERVICE_EDITED':
      case 'SERVICE_REMOVED':
      case 'PRODUCT_ADDED':
      case 'PRODUCT_EDITED':
      case 'PRODUCT_REMOVED':
        return 'SERVICES';
      case 'SECTOR_MOVEMENT':
      case 'PRODUCTION':
        return 'MOVEMENT';
      case 'MEDIA_ADDED':
      case 'MEDIA_REMOVED':
      case 'MEDIA_COMMENT':
        return 'MEDIA';
      case 'NOTES_ADDED':
      case 'NOTES_EDITED':
        return 'NOTES';
      case 'STATUS_CHANGED':
        return 'STATUS';
    }
  }
  const act = (h.action || '').toLowerCase();
  if (act.includes('registrado') || act.includes('cadastrado') || act.includes('requisição online')) return 'CREATED';
  if (act.includes('edição') || act.includes('editado') || act.includes('editou')) return 'EDITED';
  if (act.includes('entrada') || act.includes('saída') || act.includes('produção') || act.includes('etapa')) return 'MOVEMENT';
  if (act.includes('arquivo') || act.includes('anexad') || act.includes('câmera') || act.includes('comentário atualizado')) return 'MEDIA';
  if (act.includes('nota') || act.includes('observação') || act.includes('comentário')) return 'NOTES';
  if (act.includes('finalizado') || act.includes('reaberto') || act.includes('cancelad') || act.includes('devolvid') || act.includes('status') || act.includes('recusado')) return 'STATUS';
  return 'OTHER';
};
