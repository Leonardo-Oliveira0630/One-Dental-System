
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
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
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-slate-800 w-full max-w-md p-8 rounded-3xl shadow-2xl border border-slate-700 animate-in fade-in zoom-in duration-300">
                <button onClick={() => { setView('LOGIN'); setResetSent(false); setError(null); }} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 font-bold text-sm transition-colors">
                    <ArrowLeft size={16} /> Voltar para o Login
                </button>

                {resetSent ? (
                    <div className="text-center space-y-4 py-4">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto text-green-500">
                            <CheckCircle size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-white">E-mail Enviado!</h2>
                        <p className="text-slate-400">
                            Enviamos um link de recuperação para <strong>{resetEmail}</strong>. Verifique sua caixa de entrada e spam.
                        </p>
                        <button onClick={() => setView('LOGIN')} className="w-full py-4 bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-600 transition-all">
                            Ir para o Login
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="text-left mb-8">
                            <h1 className="text-2xl font-bold text-white mb-2">Recuperar Senha</h1>
                            <p className="text-slate-400 text-sm">Informe seu e-mail cadastrado para receber as instruções de troca de senha.</p>
                        </div>

                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail Cadastrado</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3.5 text-slate-500" size={18} />
                                    <input 
                                        type="email" 
                                        required
                                        value={resetEmail}
                                        onChange={(e) => setResetEmail(e.target.value)}
                                        placeholder="seu@email.com"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                            {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs text-center">{error}</div>}
                            <button 
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <><Send size={18}/> Enviar Link de Recuperação</>}
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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 w-full max-w-md p-8 rounded-3xl shadow-2xl border border-slate-700 animate-in fade-in zoom-in duration-300">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tighter">MY TOOTH</h1>
            <p className="text-slate-400 text-sm">Ecossistema Digital para Prótese Dentária</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
            
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-3.5 text-slate-500" size={18} />
                    <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                </div>
            </div>

            <div>
                <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase">Senha</label>
                    <button 
                        type="button" 
                        onClick={() => setView('FORGOT_PASSWORD')}
                        className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
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
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                    {error}
                </div>
            )}
            
            <button 
                type="submit"
                disabled={loading}
                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform hover:scale-[1.01] flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
                {loading ? <Loader2 className="animate-spin" /> : 'Entrar na Plataforma'}
            </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-700/50 pt-6">
            <p className="text-slate-400 text-sm">
                Não tem uma conta ainda?
                <br />
                <Link to="/register-lab" className="font-black text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 mt-2 uppercase tracking-tight">
                    Criar nova conta (Lab ou Clínica)
                </Link>
            </p>
        </div>
      </div>
    </div>
  );
};
