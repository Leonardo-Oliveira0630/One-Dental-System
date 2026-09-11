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

export function formatCurrency(amount: number, currency: string = 'BRL', lang: SupportedLanguage = 'pt-BR'): string {
  try {
    return new Intl.NumberFormat(lang, {
      style: 'currency',
      currency: currency || 'BRL',
    }).format(amount);
  } catch {
    return `R$ ${amount.toFixed(2)}`;
  }
}

export function formatNumber(num: number, lang: SupportedLanguage = 'pt-BR', decimals: number = 2): string {
  try {
    return new Intl.NumberFormat(lang, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  } catch {
    return num.toFixed(decimals);
  }
}
