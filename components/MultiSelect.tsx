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
      {label && <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{label}</label>}
      <div
        className="w-full min-h-[42px] px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 cursor-pointer flex items-center justify-between hover:border-blue-300 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex flex-wrap gap-1.5">
          {selectedValues.length === 0 ? (
            <span className="text-slate-400 text-xs font-bold">{placeholder}</span>
          ) : (
            selectedValues.map(value => {
              const option = options.find(o => o.value === value);
              return (
                <span key={value} className="bg-blue-100 text-blue-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1">
                  {option?.label || value}
                  <X size={12} className="cursor-pointer hover:text-blue-900" onClick={(e) => handleRemove(value, e)} />
                </span>
              );
            })
          )}
        </div>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
          {options.length === 0 ? (
            <div className="p-3 text-xs text-slate-400 text-center">Nenhuma opção disponível</div>
          ) : (
            options.map(option => (
              <div
                key={option.value}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => handleSelect(option.value)}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedValues.includes(option.value) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                  {selectedValues.includes(option.value) && <Check size={12} className="text-white" />}
                </div>
                <span className={`text-xs font-bold ${selectedValues.includes(option.value) ? 'text-blue-700' : 'text-slate-600'}`}>
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
