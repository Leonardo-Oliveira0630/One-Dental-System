import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

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
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  selectedValues,
  onChange,
  placeholder = 'Selecione...',
  label
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  return (
    <div className="relative" ref={containerRef}>
      {label && <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{label}</label>}
      <div
        className="w-full min-h-[42px] px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-[#0B0F17] text-slate-800 dark:text-slate-100 cursor-pointer flex items-center justify-between hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex flex-wrap gap-1.5">
          {selectedValues.length === 0 ? (
            <span className="text-slate-400 dark:text-slate-500 text-xs font-bold">{placeholder}</span>
          ) : (
            selectedValues.map(value => {
              const option = options.find(o => o.value === value);
              return (
                <span key={value} className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1 border border-blue-200 dark:border-blue-800">
                  {option?.label || value}
                  <X size={12} className="cursor-pointer hover:text-blue-900 dark:hover:text-blue-100" onClick={(e) => handleRemove(value, e)} />
                </span>
              );
            })
          )}
        </div>
        <ChevronDown size={16} className={`text-slate-400 dark:text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#131B2A] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
          {options.length === 0 ? (
            <div className="p-3 text-xs text-slate-400 dark:text-slate-500 text-center">Nenhuma opção disponível</div>
          ) : (
            options.map(option => (
              <div
                key={option.value}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                onClick={() => handleSelect(option.value)}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedValues.includes(option.value) ? 'bg-blue-600 border-blue-600 dark:bg-blue-500 dark:border-blue-500' : 'border-slate-300 dark:border-slate-700'}`}>
                  {selectedValues.includes(option.value) && <Check size={12} className="text-white" />}
                </div>
                <span className={`text-xs font-bold ${selectedValues.includes(option.value) ? 'text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'}`}>
                  {option.label}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
