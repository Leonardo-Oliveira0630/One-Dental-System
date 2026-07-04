import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation } from 'react-router-dom';
import { Catalog } from './Catalog';
import { SupplierStore } from './SupplierStore';
import { useApp } from '../../context/AppContext';

export function UnifiedStore() {
  const location = useLocation();
  const { currentOrg } = useApp();
  const [activeStore, setActiveStore] = useState<'PROTESE' | 'FORNECEDOR'>(() => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.has('supplierId') ? 'FORNECEDOR' : 'PROTESE';
  });
  
  const isLab = currentOrg?.orgType === 'LAB';

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 overflow-hidden relative">
      <div className="flex justify-center items-center py-4 bg-white border-b border-slate-200 z-50 shrink-0">
        <div 
          className="relative flex items-center bg-slate-100 p-1.5 rounded-full w-full max-w-[380px] mx-4 h-14 cursor-pointer shadow-inner"
          onClick={() => setActiveStore(prev => prev === 'PROTESE' ? 'FORNECEDOR' : 'PROTESE')}
        >
           <motion.div 
             className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-full shadow-sm border border-slate-200/50"
             initial={false}
             animate={{ 
               left: activeStore === 'PROTESE' ? 6 : 'calc(50% + 6px)',
               x: activeStore === 'PROTESE' ? 0 : -6
             }}
             transition={{ type: "spring", stiffness: 400, damping: 30 }}
           />
           <div className={`flex-1 flex justify-center items-center z-10 text-sm font-black transition-colors duration-300 select-none ${activeStore === 'PROTESE' ? 'text-slate-900' : 'text-slate-500'}`}>
             {isLab ? 'Terceirização' : 'Loja de Prótese'}
           </div>
           <div className={`flex-1 flex justify-center items-center z-10 text-sm font-black transition-colors duration-300 select-none ${activeStore === 'FORNECEDOR' ? 'text-slate-900' : 'text-slate-500'}`}>
             Loja Fornecedores
           </div>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden bg-slate-50">
        <AnimatePresence initial={false} custom={activeStore}>
          {activeStore === 'PROTESE' && (
            <motion.div
              key="PROTESE"
              custom={activeStore}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
              className="absolute inset-0 bg-slate-50"
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
              className="absolute inset-0 bg-white"
            >
              <SupplierStore />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
