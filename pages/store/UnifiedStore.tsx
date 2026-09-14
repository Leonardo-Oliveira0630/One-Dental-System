import React, { useState, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation } from 'react-router-dom';
import { Catalog } from './Catalog';
import { SupplierStore } from './SupplierStore';
import { useApp } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';

export function UnifiedStore() {
  const { t } = useTranslation();
  const location = useLocation();
  const { currentOrg } = useApp();
  const [activeStore, setActiveStore] = useState<'PROTESE' | 'FORNECEDOR'>(() => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.has('supplierId') ? 'FORNECEDOR' : 'PROTESE';
  });
  
  const isLab = currentOrg?.orgType === 'LAB' || currentOrg?.orgType === 'LAB_OUTSOURCED';

  const [headerPortalElement, setHeaderPortalElement] = useState<HTMLElement | null>(null);
  
  useEffect(() => {
    const el = document.getElementById('store-header-portal');
    if (el) setHeaderPortalElement(el);
  }, []);


  return (
    <div className="flex flex-col h-full w-full bg-slate-50 dark:bg-[#0B0F17] overflow-hidden relative">
      {headerPortalElement && createPortal(
        <div 
          className="relative flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-full w-full max-w-[380px] h-10 cursor-pointer shadow-inner mx-auto border border-slate-200/40 dark:border-slate-700/60"
          onClick={() => setActiveStore(prev => prev === 'PROTESE' ? 'FORNECEDOR' : 'PROTESE')}
        >
           <motion.div 
             className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-slate-900 rounded-full shadow-sm border border-slate-200/50 dark:border-slate-700"
             initial={false}
             animate={{ 
               left: activeStore === 'PROTESE' ? 4 : 'calc(50% + 4px)',
               x: activeStore === 'PROTESE' ? 0 : -4
             }}
             transition={{ type: "spring", stiffness: 400, damping: 30 }}
           />
           <div className={`flex-1 flex justify-center items-center z-10 text-[11px] md:text-sm font-black transition-colors duration-300 select-none ${activeStore === 'PROTESE' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
             {isLab ? t('store.outsourcing', 'Terceirização') : t('store.prosthesisStore', 'Loja de Prótese')}
           </div>
           <div className={`flex-1 flex justify-center items-center z-10 text-[11px] md:text-sm font-black transition-colors duration-300 select-none ${activeStore === 'FORNECEDOR' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
             {t('store.suppliers', 'Fornecedores')}
           </div>
        </div>,
        headerPortalElement
      )}

      <div className="flex-1 relative overflow-hidden bg-slate-50 dark:bg-[#0B0F17]">
        <AnimatePresence initial={false} custom={activeStore}>
          {activeStore === 'PROTESE' && (
            <motion.div
              key="PROTESE"
              custom={activeStore}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
              className="absolute inset-0 bg-slate-50 dark:bg-[#0B0F17] overflow-y-auto"
            >
              <Catalog />
            </motion.div>
          )}
          {activeStore === 'FORNECEDOR' && (
            <motion.div
              key="FORNECEDOR"
              custom={activeStore}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
              className="absolute inset-0 bg-white dark:bg-[#0B0F17] overflow-y-auto"
            >
              <SupplierStore />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
