// Unified Page & Tab Caching System for Labprox
// Provides instant in-memory + sessionStorage caching for page filters, search states, pagination, and scroll positions.

import { useState, useEffect, useRef, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  scrollY?: number;
}

const memoryStore = new Map<string, CacheEntry<any>>();
const computationCache = new Map<string, { value: any; keyFingerprint: string; timestamp: number }>();

const STORAGE_PREFIX = 'labprox_page_cache_';

/**
 * Retrieves cached page state from memory or sessionStorage
 */
export function getPageCache<T>(cacheKey: string, fallback: T): T {
  // 1. Check in-memory store first (0ms latency)
  if (memoryStore.has(cacheKey)) {
    const entry = memoryStore.get(cacheKey)!;
    return entry.data as T;
  }

  // 2. Fallback to sessionStorage
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const stored = window.sessionStorage.getItem(`${STORAGE_PREFIX}${cacheKey}`);
      if (stored) {
        const parsed: CacheEntry<T> = JSON.parse(stored);
        memoryStore.set(cacheKey, parsed);
        return parsed.data;
      }
    }
  } catch (err) {
    console.warn(`[pageCache] Failed to load cache for "${cacheKey}":`, err);
  }

  return fallback;
}

/**
 * Stores page state in both memory and sessionStorage
 */
export function setPageCache<T>(cacheKey: string, data: T, scrollY?: number): void {
  const currentScroll = scrollY !== undefined ? scrollY : (typeof window !== 'undefined' ? (window.scrollY || document.documentElement.scrollTop || 0) : 0);
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    scrollY: currentScroll
  };

  memoryStore.set(cacheKey, entry);

  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(`${STORAGE_PREFIX}${cacheKey}`, JSON.stringify(entry));
    }
  } catch (err) {
    console.warn(`[pageCache] Failed to save cache for "${cacheKey}":`, err);
  }
}

/**
 * Removes cached page state
 */
export function clearPageCache(cacheKey: string): void {
  memoryStore.delete(cacheKey);
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(`${STORAGE_PREFIX}${cacheKey}`);
    }
  } catch (_) {}
}

/**
 * Clears all cached page states
 */
export function clearAllPageCaches(): void {
  memoryStore.clear();
  computationCache.clear();
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => window.sessionStorage.removeItem(k));
    }
  } catch (_) {}
}

/**
 * Records the current scroll position for a page key
 */
export function savePageScroll(cacheKey: string, scrollY?: number): void {
  if (typeof window === 'undefined') return;
  const currentScroll = scrollY !== undefined ? scrollY : (window.scrollY || document.documentElement.scrollTop || 0);
  
  if (memoryStore.has(cacheKey)) {
    const entry = memoryStore.get(cacheKey)!;
    entry.scrollY = currentScroll;
  } else {
    memoryStore.set(cacheKey, { data: {}, timestamp: Date.now(), scrollY: currentScroll });
  }

  try {
    const raw = window.sessionStorage.getItem(`${STORAGE_PREFIX}${cacheKey}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed.scrollY = currentScroll;
      window.sessionStorage.setItem(`${STORAGE_PREFIX}${cacheKey}`, JSON.stringify(parsed));
    }
  } catch (_) {}
}

/**
 * Restores the saved scroll position for a page key smoothly
 */
export function restorePageScroll(cacheKey: string): void {
  if (typeof window === 'undefined') return;
  const entry = memoryStore.get(cacheKey);
  let targetY = entry?.scrollY;

  if (targetY === undefined) {
    try {
      const stored = window.sessionStorage.getItem(`${STORAGE_PREFIX}${cacheKey}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        targetY = parsed.scrollY;
      }
    } catch (_) {}
  }

  if (typeof targetY === 'number' && targetY > 0) {
    requestAnimationFrame(() => {
      window.scrollTo({ top: targetY, behavior: 'instant' as any });
      setTimeout(() => {
        if (Math.abs(window.scrollY - targetY!) > 40) {
          window.scrollTo({ top: targetY, behavior: 'auto' });
        }
      }, 60);
    });
  }
}

/**
 * Fast cached string normalizer to avoid repeated regex and NFD decompositions on huge lists
 */
const normalizedTextCache = new Map<string, string>();
const MAX_TEXT_CACHE_SIZE = 2500;

export function cachedNormalizeText(text: string): string {
  if (!text) return '';
  if (normalizedTextCache.has(text)) {
    return normalizedTextCache.get(text)!;
  }
  const result = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  if (normalizedTextCache.size > MAX_TEXT_CACHE_SIZE) {
    normalizedTextCache.clear();
  }
  normalizedTextCache.set(text, result);
  return result;
}

/**
 * High performance memoized computation cache for heavy list filtering/sorting
 */
export function getCachedComputation<T>(
  computationKey: string,
  keyFingerprint: string,
  computeFn: () => T,
  ttlMs: number = 30000
): T {
  const cached = computationCache.get(computationKey);
  const now = Date.now();

  if (cached && cached.keyFingerprint === keyFingerprint && (now - cached.timestamp < ttlMs)) {
    return cached.value as T;
  }

  const newValue = computeFn();
  computationCache.set(computationKey, {
    value: newValue,
    keyFingerprint,
    timestamp: now
  });
  return newValue;
}

/**
 * Custom React hook for seamless page filter caching
 */
export function usePageFilterCache<T extends Record<string, any>>(
  cacheKey: string,
  defaultValues: T
) {
  const [filters, setFiltersState] = useState<T>(() => {
    return getPageCache<T>(cacheKey, defaultValues);
  });

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  // Persist whenever filters change
  useEffect(() => {
    setPageCache(cacheKey, filters);
  }, [cacheKey, filters]);

  const setFilter = useCallback(<K extends keyof T>(key: K, valueOrFn: T[K] | ((prev: T[K]) => T[K])) => {
    setFiltersState(prev => {
      const nextVal = typeof valueOrFn === 'function' ? (valueOrFn as any)(prev[key]) : valueOrFn;
      const updated = { ...prev, [key]: nextVal };
      setPageCache(cacheKey, updated);
      return updated;
    });
  }, [cacheKey]);

  const setFilters = useCallback((updates: Partial<T> | ((prev: T) => T)) => {
    setFiltersState(prev => {
      const updated = typeof updates === 'function' ? updates(prev) : { ...prev, ...updates };
      setPageCache(cacheKey, updated);
      return updated;
    });
  }, [cacheKey]);

  const resetFilters = useCallback(() => {
    setFiltersState(defaultValues);
    setPageCache(cacheKey, defaultValues);
  }, [cacheKey, defaultValues]);

  // Determine if any filter is active (differs from defaultValues)
  const hasActiveFilters = Object.keys(defaultValues).some(k => {
    const current = filters[k];
    const def = defaultValues[k];
    if (Array.isArray(def)) {
      return Array.isArray(current) && current.length > 0;
    }
    if (typeof def === 'boolean') {
      return current !== def;
    }
    return current !== def && current !== '' && current !== 'ALL';
  });

  const saveScroll = useCallback((scrollY?: number) => {
    savePageScroll(cacheKey, scrollY);
  }, [cacheKey]);

  const restoreScroll = useCallback(() => {
    restorePageScroll(cacheKey);
  }, [cacheKey]);

  return {
    filters,
    setFilter,
    setFilters,
    resetFilters,
    hasActiveFilters,
    saveScroll,
    restoreScroll
  };
}
