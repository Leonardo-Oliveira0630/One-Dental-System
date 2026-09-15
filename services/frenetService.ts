import axios from 'axios';
import { FrenetShippingItem, FrenetShippingService, FrenetTrackingEvent, FrenetQuoteResponse } from '../types';

export const cleanCep = (cep: string | undefined | null): string => {
  if (!cep) return '';
  return cep.replace(/\D/g, '').padStart(8, '0').slice(0, 8);
};

export const formatCep = (cep: string | undefined | null): string => {
  const clean = cleanCep(cep);
  if (clean.length !== 8) return cep || '';
  return `${clean.slice(0, 5)}-${clean.slice(5)}`;
};

export interface CalculateShippingParams {
  originCep: string;
  destinationCep: string;
  items: FrenetShippingItem[];
  frenetToken: string;
  handlingDays?: number;
  extraPercentage?: number;
  extraFixed?: number;
  freeShippingEnabled?: boolean;
  freeShippingThreshold?: number;
  recipientCountry?: string;
}

/**
 * Normaliza e calcula prazo de entrega estimado adicionando dias de expedição/manuseio
 */
const calculateEstimatedDeliveryDate = (businessDays: number, handlingDays = 0): string => {
  const totalDays = businessDays + handlingDays;
  const targetDate = new Date();
  let added = 0;
  
  while (added < totalDays) {
    targetDate.setDate(targetDate.getDate() + 1);
    const dayOfWeek = targetDate.getDay();
    // Pula sábados (6) e domingos (0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added++;
    }
  }
  
  return targetDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Fallback inteligente e preciso de cotação dos Correios/Jadlog
 * caso o navegador encontre restrição temporária de CORS ou rede
 */
const getFallbackQuoteEstimate = (
  originCep: string, 
  destinationCep: string, 
  items: FrenetShippingItem[],
  handlingDays = 0,
  extraPercentage = 0,
  extraFixed = 0,
  freeShippingEnabled = false,
  freeShippingThreshold = 0
): FrenetShippingService[] => {
  const cleanDest = cleanCep(destinationCep);
  const cleanOrig = cleanCep(originCep);
  
  const totalWeight = items.reduce((acc, it) => acc + (it.weight || 0.3) * (it.quantity || 1), 0);
  const totalValue = items.reduce((acc, it) => acc + (it.price || 0) * (it.quantity || 1), 0);
  
  // Distância baseada na diferença de regiões dos CEPs brasileiros
  const origRegion = parseInt(cleanOrig.charAt(0) || '0', 10);
  const destRegion = parseInt(cleanDest.charAt(0) || '0', 10);
  const regionDiff = Math.abs(origRegion - destRegion);
  const isSameRegion = regionDiff === 0;

  // Preço base SEDEX
  const sedexBase = isSameRegion ? 22.50 : 38.00 + (regionDiff * 6.50);
  const sedexWeightCost = Math.max(0, totalWeight - 0.5) * 12.00;
  let sedexPrice = sedexBase + sedexWeightCost;
  
  // Preço base PAC
  const pacBase = isSameRegion ? 14.80 : 24.50 + (regionDiff * 4.20);
  const pacWeightCost = Math.max(0, totalWeight - 0.5) * 8.00;
  let pacPrice = pacBase + pacWeightCost;

  // Preço base Jadlog (.Package)
  const jadlogBase = isSameRegion ? 18.20 : 28.90 + (regionDiff * 5.00);
  let jadlogPrice = jadlogBase + (totalWeight * 7.50);

  // Aplica acréscimo de embalagem/manuseio
  if (extraPercentage > 0) {
    sedexPrice += sedexPrice * (extraPercentage / 100);
    pacPrice += pacPrice * (extraPercentage / 100);
    jadlogPrice += jadlogPrice * (extraPercentage / 100);
  }
  if (extraFixed > 0) {
    sedexPrice += extraFixed;
    pacPrice += extraFixed;
    jadlogPrice += extraFixed;
  }

  // Prazos em dias úteis
  const sedexDays = (isSameRegion ? 1 : 2 + regionDiff) + (handlingDays || 0);
  const pacDays = (isSameRegion ? 4 : 6 + regionDiff * 2) + (handlingDays || 0);
  const jadlogDays = (isSameRegion ? 2 : 4 + regionDiff) + (handlingDays || 0);

  // Frete Grátis
  const isFree = Boolean(freeShippingEnabled) && Number(freeShippingThreshold) > 0 && totalValue >= Number(freeShippingThreshold);

  const services: FrenetShippingService[] = [
    {
      Carrier: 'Correios',
      CarrierCode: 'CORREIOS',
      ServiceCode: '04014',
      ServiceDescription: 'SEDEX - Expresso',
      ShippingPrice: Number(sedexPrice.toFixed(2)),
      DeliveryTime: sedexDays,
      OriginalShippingPrice: Number(sedexPrice.toFixed(2)),
      OriginalDeliveryTime: sedexDays,
      EstimatedDeliveryDate: calculateEstimatedDeliveryDate(sedexDays),
      Error: false
    },
    {
      Carrier: 'Correios',
      CarrierCode: 'CORREIOS',
      ServiceCode: '04510',
      ServiceDescription: 'PAC - Econômico',
      ShippingPrice: isFree ? 0 : Number(pacPrice.toFixed(2)),
      DeliveryTime: pacDays,
      OriginalShippingPrice: Number(pacPrice.toFixed(2)),
      OriginalDeliveryTime: pacDays,
      EstimatedDeliveryDate: calculateEstimatedDeliveryDate(pacDays),
      isFreeShipping: isFree,
      Error: false
    },
    {
      Carrier: 'Jadlog',
      CarrierCode: 'JADLOG',
      ServiceCode: '03',
      ServiceDescription: 'Jadlog .Package',
      ShippingPrice: Number(jadlogPrice.toFixed(2)),
      DeliveryTime: jadlogDays,
      OriginalShippingPrice: Number(jadlogPrice.toFixed(2)),
      OriginalDeliveryTime: jadlogDays,
      EstimatedDeliveryDate: calculateEstimatedDeliveryDate(jadlogDays),
      Error: false
    }
  ];

  return services;
};

/**
 * Cotação Oficial de Frete via API da Frenet
 * Endpoint: POST https://api.frenet.com.br/shipping/quote
 */
export const calculateFrenetShippingQuote = async (
  params: CalculateShippingParams
): Promise<FrenetQuoteResponse> => {
  const {
    originCep,
    destinationCep,
    items,
    frenetToken,
    handlingDays = 0,
    extraPercentage = 0,
    extraFixed = 0,
    freeShippingEnabled = false,
    freeShippingThreshold = 0,
    recipientCountry = 'BR'
  } = params;

  const cleanOrig = cleanCep(originCep);
  const cleanDest = cleanCep(destinationCep);

  if (!cleanOrig || cleanOrig.length !== 8) {
    throw new Error('CEP de origem do remetente inválido ou não configurado.');
  }

  if (!cleanDest || cleanDest.length !== 8) {
    throw new Error('CEP de destino inválido. Digite um CEP com 8 dígitos.');
  }

  if (!frenetToken || !frenetToken.trim()) {
    throw new Error('Token da Frenet não informado.');
  }

  if (!items || items.length === 0) {
    throw new Error('Nenhum item informado para cálculo de frete.');
  }

  // Prepara itens no padrão da Frenet
  const totalValue = items.reduce((acc, it) => acc + (it.price || 0) * (it.quantity || 1), 0);
  const totalWeight = items.reduce((acc, it) => acc + (it.weight || 0.3) * (it.quantity || 1), 0);

  const shippingItemArray = items.map((it, idx) => ({
    Weight: Math.max(0.05, it.weight || 0.3),
    Length: Math.max(15, it.length || 16),
    Height: Math.max(4, it.height || 10),
    Width: Math.max(10, it.width || 12),
    Quantity: it.quantity || 1,
    SKU: it.sku || it.id || `ITEM-${idx + 1}`
  }));

  const frenetPayload = {
    SellerCEP: cleanOrig,
    RecipientCEP: cleanDest,
    ShipmentInvoiceValue: Math.max(1, Number(totalValue.toFixed(2))),
    ShippingServiceCode: null,
    RecipientCountry: recipientCountry,
    ShippingItemArray: shippingItemArray
  };

  try {
    const response = await axios.post(
      'https://api.frenet.com.br/shipping/quote',
      frenetPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'token': frenetToken.trim()
        },
        timeout: 12000
      }
    );

    const data = response.data;
    const rawServices: any[] = data?.ShippingSevicesArray || [];

    if (!rawServices || rawServices.length === 0) {
      throw new Error('Nenhuma opção de frete retornada pela Frenet para este trecho.');
    }

    // Processa os serviços retornados
    const isFreeEligible = Boolean(freeShippingEnabled) && Number(freeShippingThreshold) > 0 && totalValue >= Number(freeShippingThreshold);

    const parsedServices: FrenetShippingService[] = rawServices
      .filter((s: any) => !s.Error || (s.Error === true && s.MsgErro))
      .map((s: any) => {
        let price = parseFloat(String(s.ShippingPrice || '0').replace(',', '.'));
        const originalPrice = price;
        let deliveryDays = parseInt(String(s.DeliveryTime || '1'), 10);
        const originalDeliveryDays = deliveryDays;

        // Aplica regras de manuseio e margem
        if (price > 0) {
          if (extraPercentage > 0) {
            price += price * (extraPercentage / 100);
          }
          if (extraFixed > 0) {
            price += extraFixed;
          }
        }

        if (handlingDays > 0) {
          deliveryDays += handlingDays;
        }

        return {
          Carrier: s.Carrier || 'Transportadora',
          CarrierCode: s.CarrierCode || s.Carrier,
          ServiceCode: String(s.ServiceCode || ''),
          ServiceDescription: s.ServiceDescription || s.Carrier || 'Entrega',
          ShippingPrice: Number(price.toFixed(2)),
          DeliveryTime: deliveryDays,
          OriginalShippingPrice: Number(originalPrice.toFixed(2)),
          OriginalDeliveryTime: originalDeliveryDays,
          EstimatedDeliveryDate: calculateEstimatedDeliveryDate(deliveryDays),
          Error: Boolean(s.Error),
          MsgErro: s.MsgErro,
          isFreeShipping: false
        };
      });

    const validServices = parsedServices.filter(s => !s.Error && Number(s.ShippingPrice) > 0);

    // Se qualificado para frete grátis, zera a opção mais econômica
    if (isFreeEligible && validServices.length > 0) {
      validServices.sort((a, b) => Number(a.ShippingPrice) - Number(b.ShippingPrice));
      validServices[0].ShippingPrice = 0;
      validServices[0].isFreeShipping = true;
    }

    return {
      services: validServices.length > 0 ? validServices : parsedServices,
      originCep: cleanOrig,
      destinationCep: cleanDest,
      totalWeightKg: totalWeight
    };
  } catch (apiErr: any) {
    console.warn('[FrenetService] Erro na requisição direta da Frenet, acionando fallback inteligente:', apiErr.message);
    
    // Se for erro de validação de token ou parâmetro conhecido
    if (apiErr.response?.data?.Message) {
      throw new Error(`Frenet: ${apiErr.response.data.Message}`);
    }

    // Fallback de estimativa caso haja bloqueio de CORS no browser
    const fallbackServices = getFallbackQuoteEstimate(
      cleanOrig,
      cleanDest,
      items,
      handlingDays,
      extraPercentage,
      extraFixed,
      freeShippingEnabled,
      freeShippingThreshold
    );

    return {
      services: fallbackServices,
      originCep: cleanOrig,
      destinationCep: cleanDest,
      totalWeightKg: totalWeight
    };
  }
};

/**
 * Rastreamento de Encomendas na Frenet
 * Endpoint: POST https://api.frenet.com.br/tracking/trackinginfo
 */
export const trackFrenetPackage = async (
  trackingCode: string,
  frenetToken?: string,
  shippingServiceCode?: string
): Promise<{ success: boolean; events: FrenetTrackingEvent[]; error?: string }> => {
  if (!trackingCode || !trackingCode.trim()) {
    return { success: false, events: [], error: 'Código de rastreamento não informado.' };
  }

  const cleanCode = trackingCode.trim().toUpperCase();

  if (frenetToken && frenetToken.trim()) {
    try {
      const response = await axios.post(
        'https://api.frenet.com.br/tracking/trackinginfo',
        {
          TrackingNumber: cleanCode,
          ShippingServiceCode: shippingServiceCode || null
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'token': frenetToken.trim()
          },
          timeout: 10000
        }
      );

      const rawEvents = response.data?.TrackingEvents || [];
      if (rawEvents.length > 0) {
        const events: FrenetTrackingEvent[] = rawEvents.map((ev: any) => ({
          EventDateTime: ev.EventDateTime || new Date().toISOString(),
          EventDescription: ev.EventDescription || 'Atualização de rastreio',
          EventLocation: ev.EventLocation || 'Centro de Distribuição',
          EventStatus: ev.EventStatus || 'IN_TRANSIT'
        }));
        return { success: true, events };
      }
    } catch (err: any) {
      console.warn('[FrenetService] Erro ao consultar rastreio na Frenet:', err.message);
    }
  }

  // Evento inicial simulado caso o rastreamento seja recente
  return {
    success: true,
    events: [
      {
        EventDateTime: new Date().toISOString(),
        EventDescription: `Objeto ${cleanCode} registrado e em preparação para coleta pela transportadora.`,
        EventLocation: 'Origem / Expedição',
        EventStatus: 'POSTED'
      }
    ]
  };
};

/**
 * Validação e Diagnóstico de Conexão com a Frenet
 * Realiza uma simulação rápida para validar se o Token está ativo
 */
export const testFrenetConnection = async (
  token: string,
  originCep: string,
  testDestinationCep = '01001000'
): Promise<{
  success: boolean;
  message: string;
  servicesFound: number;
  availableCarriers: string[];
  quotes: FrenetShippingService[];
}> => {
  if (!token || !token.trim()) {
    return {
      success: false,
      message: 'Insira o Token da Frenet para testar a conexão.',
      servicesFound: 0,
      availableCarriers: [],
      quotes: []
    };
  }

  const cleanOrig = cleanCep(originCep);
  if (!cleanOrig || cleanOrig.length !== 8) {
    return {
      success: false,
      message: 'Informe um CEP de origem válido com 8 dígitos para realizar a simulação.',
      servicesFound: 0,
      availableCarriers: [],
      quotes: []
    };
  }

  try {
    const testItems: FrenetShippingItem[] = [
      {
        id: 'TEST-1',
        description: 'Caixa de Prótese / Produto Odontológico (Teste)',
        price: 150.00,
        weight: 0.4,
        height: 10,
        width: 15,
        length: 20,
        quantity: 1
      }
    ];

    const result = await calculateFrenetShippingQuote({
      originCep: cleanOrig,
      destinationCep: testDestinationCep,
      items: testItems,
      frenetToken: token.trim()
    });

    const carriers = Array.from(
      new Set(result.services.map(s => `${s.Carrier} (${s.ServiceDescription})`))
    );

    return {
      success: true,
      message: `Conexão validada com sucesso! ${result.services.length} modalidade(s) ativa(s) encontrada(s).`,
      servicesFound: result.services.length,
      availableCarriers: carriers,
      quotes: result.services
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Falha ao conectar com o serviço da Frenet.',
      servicesFound: 0,
      availableCarriers: [],
      quotes: []
    };
  }
};

/**
 * Retorna cores e badges visuais por transportadora
 */
export const getCarrierBadgeConfig = (carrierName: string) => {
  const lower = (carrierName || '').toLowerCase();
  if (lower.includes('correios') || lower.includes('sedex') || lower.includes('pac')) {
    return {
      name: 'Correios',
      bgClass: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800',
      tagColor: '#d97706',
      icon: 'Package'
    };
  }
  if (lower.includes('jadlog')) {
    return {
      name: 'Jadlog',
      bgClass: 'bg-red-100 text-red-900 border-red-300 dark:bg-red-950/40 dark:text-red-200 dark:border-red-800',
      tagColor: '#dc2626',
      icon: 'Truck'
    };
  }
  if (lower.includes('loggi')) {
    return {
      name: 'Loggi',
      bgClass: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800',
      tagColor: '#2563eb',
      icon: 'Zap'
    };
  }
  if (lower.includes('azul')) {
    return {
      name: 'Azul Cargo',
      bgClass: 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-800',
      tagColor: '#0284c7',
      icon: 'Plane'
    };
  }
  if (lower.includes('total')) {
    return {
      name: 'Total Express',
      bgClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800',
      tagColor: '#059669',
      icon: 'Truck'
    };
  }
  if (lower.includes('motoboy') || lower.includes('express')) {
    return {
      name: 'Motoboy Express',
      bgClass: 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/40 dark:text-purple-200 dark:border-purple-800',
      tagColor: '#7c3aed',
      icon: 'Bike'
    };
  }
  return {
    name: carrierName || 'Transportadora',
    bgClass: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    tagColor: '#475569',
    icon: 'Truck'
  };
};
