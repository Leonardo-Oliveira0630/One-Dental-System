import React from 'react';
import { Lock, Crown, ArrowLeft, ArrowUpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';

interface FeatureLockedProps {
  title?: string;
  message?: string;
  requiredFeature?: 'STORE' | 'CLINIC';
}

export const FeatureLocked: React.FC<FeatureLockedProps> = ({ 
  title = "Funcionalidade Bloqueada", 
  message = "Esta funcionalidade não está disponível no plano atual.",
  requiredFeature
}) => {
  const navigate = useNavigate();
  const { currentUser, currentOrg } = useApp();

  const isLabAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPER_ADMIN;

  return (
    <div className="flex flex-col items-center justify-center h-[70vh] p-6 text-center animate-in fade-in zoom-in duration-300">
      <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6 relative">
        <Lock size={48} className="text-slate-400" />
        <div className="absolute -top-1 -right-1 bg-orange-500 text-white p-2 rounded-full shadow-lg border-4 border-white">
            <Crown size={20} fill="currentColor" />
        </div>
      </div>
      
      <h2 className="text-2xl font-bold text-slate-800 mb-2">{title}</h2>
      <p className="text-slate-500 max-w-md mb-8 leading-relaxed">
        {message}
        <br />
        {isLabAdmin 
          ? "Faça um upgrade no seu plano para desbloquear este módulo." 
          : "Entre em contato com seu laboratório parceiro para verificar a disponibilidade deste recurso."}
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeft size={18} /> Voltar
        </button>

        {isLabAdmin && (
          <button 
            onClick={() => navigate('/admin')} // Redireciona para admin onde tem a aba de assinatura
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-orange-200 transition-all flex items-center justify-center gap-2"
          >
            <ArrowUpCircle size={18} /> Fazer Upgrade Agora
          </button>
        )}
      </div>
    </div>
  );
};