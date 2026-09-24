import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '../src/i18n';
import { Check, Globe } from 'lucide-react';

interface LanguageSelectorProps {
  className?: string;
  variant?: 'compact' | 'standard';
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  className = '',
  variant = 'standard'
}) => {
  const { language, setLanguage } = useApp();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectLanguage = async (code: SupportedLanguage) => {
    try {
      await setLanguage(code);
    } catch (err) {
      console.error('Failed to change language:', err);
    } finally {
      setIsOpen(false);
    }
  };

  const buttonSizeClass = variant === 'compact'
    ? 'w-8 h-8 sm:w-9 sm:h-9 text-base'
    : 'w-9 h-9 sm:w-10 sm:h-10 text-lg';

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      {/* Flag-only trigger button */}
      <button
        type="button"
        id="btn-language-selector"
        onClick={() => setIsOpen(prev => !prev)}
        className={`relative ${buttonSizeClass} rounded-xl bg-slate-100 dark:bg-[#1A2234] border border-slate-200 dark:border-slate-700/80 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700/80 active:scale-95 transition-all shadow-sm cursor-pointer select-none`}
        title={`${t('settings.languageSection', 'Idioma')}: ${currentLangObj.name}`}
        aria-label={t('settings.languageSection', 'Alterar Idioma')}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="leading-none filter drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)] pointer-events-none">
          {currentLangObj.flag}
        </span>
      </button>

      {/* Language dropdown menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-2 w-56 sm:w-64 rounded-2xl bg-white dark:bg-[#131B2A] border border-slate-200 dark:border-slate-800 shadow-2xl z-[120] overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-top-right focus:outline-none"
        >
          {/* Header */}
          <div className="px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Globe size={14} className="text-blue-500" />
              <span>{t('settings.languageSection', 'Idioma do Sistema')}</span>
            </div>
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
              {currentLangObj.code}
            </span>
          </div>

          {/* Scrollable list of languages */}
          <div className="p-1.5 max-h-60 overflow-y-auto overscroll-contain divide-y divide-slate-100 dark:divide-slate-800/50">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = language === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  role="menuitem"
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-cyan-300 font-bold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl leading-none shrink-0 filter drop-shadow-[0_1px_1px_rgba(0,0,0,0.1)]">
                      {lang.flag}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs truncate">{lang.name}</span>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold leading-tight">
                        {lang.code}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-blue-600 dark:bg-cyan-500 text-white dark:text-slate-950 flex items-center justify-center shrink-0 shadow-sm">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
