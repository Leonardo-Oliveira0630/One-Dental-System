
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Logo } from '../components/Logo';
import { UserRole } from '../types';
import { ShieldCheck, Lock, Mail, Loader2, ArrowLeft, Send, CheckCircle } from 'lucide-react';
import * as api from '../services/firebaseService';

export const Login = () => {
  const { login, currentUser, isLoadingAuth } = useApp();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'LOGIN' | 'FORGOT_PASSWORD'>('LOGIN');

  // Login Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Forgot Password Fields
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  
  // --- AUTO-REDIRECT LOGIC ---
  useEffect(() => {
    if (!isLoadingAuth && currentUser) {
        if (currentUser.role === UserRole.CLIENT) {
            navigate('/store');
        } else if (currentUser.role === UserRole.SUPER_ADMIN) {
            navigate('/superadmin');
        } else {
            navigate('/dashboard');
        }
    }
  }, [currentUser, isLoadingAuth, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
        await login(email, password);
    } catch (err: any) {
        console.error(err);
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
            setError("Email ou senha incorretos.");
        } else {
            setError(err.message || "Erro ao autenticar.");
        }
        setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!resetEmail) return;
      setLoading(true);
      setError(null);
      try {
          await api.apiResetPassword(resetEmail);
          setResetSent(true);
      } catch (err: any) {
          setError("Erro ao enviar e-mail. Verifique se o endereço está correto.");
      } finally {
          setLoading(false);
      }
  };

  // --- FORGOT PASSWORD VIEW ---
  if (view === 'FORGOT_PASSWORD') {
      return (
        <div className="min-h-screen bg-[#131A23] flex flex-col items-center justify-center p-4">
            <div className="bg-[#1E293B] w-full max-w-md p-8 rounded-card shadow-premium border border-slate-700/30 animate-in fade-in zoom-in duration-300">
                <button onClick={() => { setView('LOGIN'); setResetSent(false); setError(null); }} className="flex items-center gap-2 text-slate-400 hover:text-[#00B8D9] mb-8 font-semibold text-sm transition-colors">
                    <ArrowLeft size={16} /> Voltar para o Login
                </button>

                {resetSent ? (
                    <div className="text-center space-y-4 py-4">
                        <div className="w-16 h-16 bg-[#10B981]/15 rounded-full flex items-center justify-center mx-auto text-[#10B981]">
                            <CheckCircle size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-white">E-mail Enviado!</h2>
                        <p className="text-slate-400 text-sm">
                            Enviamos um link de recuperação para <strong className="text-[#00B8D9]">{resetEmail}</strong>. Verifique sua caixa de entrada e spam.
                        </p>
                        <button onClick={() => setView('LOGIN')} className="w-full py-3.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-input transition-all">
                            Ir para o Login
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="text-left mb-6">
                            <h1 className="text-2xl font-bold text-white mb-2">Recuperar Senha</h1>
                            <p className="text-slate-400 text-xs font-medium">Informe seu e-mail cadastrado para receber as instruções de troca de senha.</p>
                        </div>

                        <form onSubmit={handleResetPassword} className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">E-mail Cadastrado</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3.5 text-slate-500" size={18} />
                                    <input 
                                        type="email" 
                                        required
                                        value={resetEmail}
                                        onChange={(e) => setResetEmail(e.target.value)}
                                        placeholder="seu@email.com"
                                        className="w-full bg-[#131A23] border border-slate-700/40 rounded-input pl-10 pr-4 py-3 text-white focus:border-[#00B8D9] focus:ring-1 focus:ring-[#00B8D9] outline-none transition-all text-sm"
                                    />
                                </div>
                            </div>
                            {error && <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-lg text-[#EF4444] text-xs text-center font-medium">{error}</div>}
                            <button 
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-[#0F4C81] hover:bg-[#0F4C81]/90 text-white font-semibold rounded-input shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-all duration-300 transform hover:scale-[1.01]"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <><Send size={16}/> Enviar Recuperação</>}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
      );
  }

  // --- LOGIN VIEW (Default) ---
  return (
    <div className="min-h-screen bg-[#131A23] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic graphic accents */}
      <div className="absolute top-1/4 -left-1/4 w-[500px] h-[500px] rounded-full bg-[#0F4C81]/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-1/4 w-[500px] h-[500px] rounded-full bg-[#00B8D9]/10 blur-[120px] pointer-events-none" />

      <div className="bg-[#1E293B] w-full max-w-md p-8 md:p-10 rounded-card shadow-premium border border-slate-800/80 relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center text-center mb-8">
            <Logo size="xl" variant="light" className="mb-2" />
            <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold mt-1">Ecossistema Digital Prótese & Odonto</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">E-mail</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-3.5 text-slate-500" size={18} />
                    <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="w-full bg-[#131A23] border border-slate-700/50 rounded-input pl-10 pr-4 py-3 text-white focus:border-[#00B8D9] focus:ring-1 focus:ring-[#00B8D9] outline-none transition-all text-sm"
                    />
                </div>
            </div>

            <div>
                <div className="flex justify-between items-center mb-1.5 ml-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Senha</label>
                    <button 
                        type="button" 
                        onClick={() => setView('FORGOT_PASSWORD')}
                        className="text-[10px] font-semibold text-[#00B8D9] hover:text-[#00B8D9]/80 transition-colors"
                    >
                        Esqueceu a senha?
                    </button>
                </div>
                <div className="relative">
                    <Lock className="absolute left-3 top-3.5 text-slate-500" size={18} />
                    <input 
                        type="password" 
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#131A23] border border-slate-700/50 rounded-input pl-10 pr-4 py-3 text-white focus:border-[#00B8D9] focus:ring-1 focus:ring-[#00B8D9] outline-none transition-all text-sm"
                    />
                </div>
            </div>

            {error && (
                <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-lg text-[#EF4444] text-xs font-semibold text-center">
                    {error}
                </div>
            )}
            
            <button 
                type="submit"
                disabled={loading}
                className={`w-full py-3.5 rounded-input font-bold text-sm tracking-wide shadow-lg transition-all duration-300 transform hover:scale-[1.01] flex items-center justify-center gap-2 bg-[#0F4C81] hover:bg-[#00B8D9] hover:shadow-[#00B8D9]/25 text-white ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
                {loading ? <Loader2 className="animate-spin text-white" /> : 'Acessar Ecossistema'}
            </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-800/80 pt-6">
            <p className="text-slate-400 text-xs font-normal">
                Não possui uma conta ainda?
                <br />
                <Link to="/register-lab" className="font-bold text-[#00B8D9] hover:text-white inline-flex items-center gap-1 mt-2 uppercase tracking-wide text-[10px] transition-colors">
                    Criar nova conta (Lab ou Clínica) →
                </Link>
            </p>
        </div>
      </div>
    </div>
  );
};
