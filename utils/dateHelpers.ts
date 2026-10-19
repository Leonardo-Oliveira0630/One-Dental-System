// Centralized robust date helpers to avoid timezone offset discrepancies (e.g. UTC midnight vs Brazil UTC-3)

export const getTodayDateStr = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const normalizeRouteDate = (val: any): string => {
  if (!val) return '';
  if (typeof val === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val.substring(0, 10);
  }
  const d = val instanceof Date ? val : (val?.toDate ? val.toDate() : new Date(val));
  if (isNaN(d.getTime())) return '';
  
  // Format based on ISO split to handle stored UTC midnights consistently
  return d.toISOString().split('T')[0];
};

export const createMiddayDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const cleanStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  return new Date(`${cleanStr}T12:00:00`);
};

export const isAfter12PM = (): boolean => {
  return new Date().getHours() >= 12;
};
