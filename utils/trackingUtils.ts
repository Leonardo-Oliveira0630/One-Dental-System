/**
 * Tracking & Carrier Utilities for Supplier Orders and Customer Order Tracking
 */

export interface TrackingCarrierOption {
  id: string;
  name: string;
  serviceCode?: string;
  defaultUrlTemplate?: (code: string) => string;
}

export const COMMON_CARRIERS: TrackingCarrierOption[] = [
  {
    id: 'CORREIOS',
    name: 'Correios (SEDEX / PAC)',
    defaultUrlTemplate: (code) => `https://rastreamento.correios.com.br/app/index.php?codigo=${encodeURIComponent(code)}`
  },
  {
    id: 'FRENET',
    name: 'Frenet (Gateway Logístico)',
    defaultUrlTemplate: (code) => `https://linkcorreios.com.br/?id=${encodeURIComponent(code)}`
  },
  {
    id: 'JADLOG',
    name: 'Jadlog',
    defaultUrlTemplate: (code) => `https://www.jadlog.com.br/siteInstitucional/tracking.jad?cte=${encodeURIComponent(code)}`
  },
  {
    id: 'TOTAL_EXPRESS',
    name: 'Total Express',
    defaultUrlTemplate: (_code) => `https://totalexpress.com.br/rastreio/`
  },
  {
    id: 'LOGGI',
    name: 'Loggi',
    defaultUrlTemplate: (code) => `https://www.loggi.com/rastreador/${encodeURIComponent(code)}`
  },
  {
    id: 'AZUL_CARGO',
    name: 'Azul Cargo Express',
    defaultUrlTemplate: (code) => `https://www.azulcargoexpress.com.br/Rastreio/Rastreio?Awb=${encodeURIComponent(code)}`
  },
  {
    id: 'MOTOBOY',
    name: 'Entrega Expressa / Motoboy Próprio',
    defaultUrlTemplate: () => ''
  },
  {
    id: 'OTHER',
    name: 'Outra Transportadora',
    defaultUrlTemplate: (code) => `https://linkcorreios.com.br/?id=${encodeURIComponent(code)}`
  }
];

/**
 * Returns a direct URL for tracking the package on the carrier's portal
 */
export function getCarrierTrackingUrl(
  trackingCode?: string,
  carrierName?: string,
  customUrl?: string
): string {
  if (customUrl && customUrl.trim().startsWith('http')) {
    return customUrl.trim();
  }

  if (!trackingCode || !trackingCode.trim()) {
    return '';
  }

  const code = trackingCode.trim().toUpperCase();
  const carrier = (carrierName || '').toUpperCase();

  // 1. If explicit carrier is matched
  if (carrier.includes('JADLOG')) {
    return `https://www.jadlog.com.br/siteInstitucional/tracking.jad?cte=${encodeURIComponent(code)}`;
  }
  if (carrier.includes('LOGGI')) {
    return `https://www.loggi.com/rastreador/${encodeURIComponent(code)}`;
  }
  if (carrier.includes('AZUL')) {
    return `https://www.azulcargoexpress.com.br/Rastreio/Rastreio?Awb=${encodeURIComponent(code)}`;
  }
  if (carrier.includes('TOTAL')) {
    return `https://totalexpress.com.br/rastreio/`;
  }

  // 2. Standard Correios format check (e.g. AA123456789BR)
  const isCorreiosFormat = /^[A-Z]{2}[0-9]{9}[A-Z]{2}$/.test(code);
  if (isCorreiosFormat || carrier.includes('CORREIOS') || carrier.includes('SEDEX') || carrier.includes('PAC')) {
    return `https://rastreamento.correios.com.br/app/index.php?codigo=${encodeURIComponent(code)}`;
  }

  // 3. Fallback to universal Brazilian logistics tracking aggregator
  return `https://linkcorreios.com.br/?id=${encodeURIComponent(code)}`;
}

/**
 * Pretty-formats carrier display title
 */
export function formatCarrierName(carrierName?: string, shippingMethod?: string): string {
  if (carrierName && carrierName.trim()) {
    return carrierName.trim();
  }
  if (shippingMethod === 'SEDEX') return 'Correios SEDEX';
  if (shippingMethod === 'PAC') return 'Correios PAC';
  if (shippingMethod === 'FRENET') return 'Frenet';
  if (shippingMethod === 'MOTOBOY') return 'Motoboy / Próprio';
  if (shippingMethod === 'PICKUP') return 'Retirada no Local';
  return 'Transportadora';
}
