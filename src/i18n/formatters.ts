import { SupportedLanguage } from './index';

/**
 * Localized formatters using native Intl APIs.
 * Preserves independent currency and number logic.
 */

export function formatDate(date: Date | string | number, lang: SupportedLanguage = 'pt-BR', options?: Intl.DateTimeFormatOptions): string {
  try {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat(lang, options || { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
  } catch {
    return String(date);
  }
}

export function formatDateTime(date: Date | string | number, lang: SupportedLanguage = 'pt-BR'): string {
  return formatDate(date, lang, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCurrency(amount: any, currency: string = 'BRL', lang: SupportedLanguage = 'pt-BR'): string {
  try {
    const num = Number(amount);
    if (isNaN(num)) return 'R$ 0,00';
    return new Intl.NumberFormat(lang, {
      style: 'currency',
      currency: currency || 'BRL',
    }).format(num);
  } catch {
    const num = Number(amount);
    return `R$ ${isNaN(num) ? '0,00' : num.toFixed(2)}`;
  }
}

export function formatNumber(num: any, lang: SupportedLanguage = 'pt-BR', decimals: number = 2): string {
  try {
    const n = Number(num);
    if (isNaN(n)) return (0).toFixed(decimals);
    return new Intl.NumberFormat(lang, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n);
  } catch {
    const n = Number(num);
    return isNaN(n) ? (0).toFixed(decimals) : n.toFixed(decimals);
  }
}
