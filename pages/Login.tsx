
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { ShieldCheck, Lock, Mail, Loader2 } from 'lucide-react';

export const Login = () => {
  const { login, currentUser, isLoadingAuth } = useApp();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Common Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
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
        if (err.code === 'auth/invalid-credential') {
            setError("Email ou senha incorretos.");
        } else {
            setError(err.message || "Erro ao autenticar.");
        }
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 w-full max-w-md p-8 rounded-3xl shadow-2xl border border-slate-700 animate-in fade-in zoom-in duration-300">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">ONE DENTAL</h1>
            <p className="text-slate-400">Acesse sua conta para continuar.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
            
            <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-3.5 text-slate-500" size={18} />
                    <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Senha</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3.5 text-slate-500" size={18} />
                    <input 
                        type="password" 
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
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
                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/50 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
                {loading ? <Loader2 className="animate-spin" /> : 'Entrar na Plataforma'}
            </button>
        </form>

        <div className="mt-6 text-center border-t border-slate-700 pt-6">
            <p className="text-slate-400 text-sm">
                Não tem uma conta ainda?
                <br />
                <Link to="/register-lab" className="font-bold text-blue-400 hover:underline inline-flex items-center gap-1 mt-2">
                    Criar nova conta (Lab ou Dentista)
                </Link>
            </p>
        </div>
      </div>
    </div>
  );
};
