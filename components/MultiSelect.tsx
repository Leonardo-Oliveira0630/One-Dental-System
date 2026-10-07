import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, X, Search } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  label?: string;
  searchPlaceholder?: string;
  searchable?: boolean;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  selectedValues,
  onChange,
  placeholder = 'Selecione...',
  label,
  searchPlaceholder,
  searchable = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  const normalize = (text: string) => {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  };

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = normalize(searchTerm);
    return options.filter(option => normalize(option.label).includes(term));
  }, [options, searchTerm]);

  const handleSelect = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(v => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const handleRemove = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedValues.filter(v => v !== value));
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const handleSelectAllFiltered = (e: React.MouseEvent) => {
    e.stopPropagation();
    const allFilteredValues = filteredOptions.map(o => o.value);
    const newSelected = Array.from(new Set([...selectedValues, ...allFilteredValues]));
    onChange(newSelected);
  };

  return (
    <div className="relative" ref={containerRef}>
      {label && <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{label}</label>}
      <div
        className="w-full min-h-[42px] px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-[#0B0F17] text-slate-800 dark:text-slate-100 cursor-pointer flex items-center justify-between hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex flex-wrap gap-1.5 flex-1 mr-2 min-w-0">
          {selectedValues.length === 0 ? (
            <span className="text-slate-400 dark:text-slate-500 text-xs font-bold">{placeholder}</span>
          ) : (
            selectedValues.map(value => {
              const option = options.find(o => o.value === value);
              return (
                <span key={value} className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1 border border-blue-200 dark:border-blue-800 max-w-full">
                  <span className="truncate">{option?.label || value}</span>
                  <X size={12} className="cursor-pointer hover:text-blue-900 dark:hover:text-blue-100 shrink-0" onClick={(e) => handleRemove(value, e)} />
                </span>
              );
            })
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {selectedValues.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[10px] font-black uppercase text-slate-400 hover:text-red-500 mr-1 transition-colors px-1"
              title="Limpar seleção"
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown size={16} className={`text-slate-400 dark:text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#131B2A] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 max-h-72 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
          {searchable && (
            <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-[#0B0F17]/80 shrink-0">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder={searchPlaceholder || `Pesquisar...`}
                  className="w-full pl-8 pr-7 py-1.5 bg-white dark:bg-[#1A2234] border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold outline-none focus:border-blue-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSearchTerm(''); searchInputRef.current?.focus(); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between mt-1.5 px-1 text-[10px] font-black uppercase text-slate-400">
                <span>{filteredOptions.length} {filteredOptions.length === 1 ? 'opção' : 'opções'}</span>
                {filteredOptions.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Selecionar todas
                    </button>
                    {selectedValues.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAll}
                        className="text-slate-400 hover:text-red-500"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="overflow-y-auto max-h-56 divide-y divide-slate-100 dark:divide-slate-800/50">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-xs font-medium text-slate-400 dark:text-slate-500 text-center">
                {searchTerm ? `Nenhum resultado para "${searchTerm}"` : 'Nenhuma opção disponível'}
              </div>
            ) : (
              filteredOptions.map(option => {
                const isSelected = selectedValues.includes(option.value);
                return (
                  <div
                    key={option.value}
                    className={`flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                    }`}
                    onClick={() => handleSelect(option.value)}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600 dark:bg-blue-500 dark:border-blue-500'
                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1A2234]'
                    }`}>
                      {isSelected && <Check size={12} className="text-white" />}
                    </div>
                    <span className={`text-xs font-bold truncate ${
                      isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'
                    }`}>
                      {option.label}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
