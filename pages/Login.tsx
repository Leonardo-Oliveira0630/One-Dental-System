import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { ShieldCheck, Stethoscope, Lock, Mail, User, Building, Loader2 } from 'lucide-react';

export const Login = () => {
  const { login, register, currentUser, isLoadingAuth } = useApp();
  const navigate = useNavigate();
  
  // Mode: LOGIN vs REGISTER
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Common Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Register Fields
  const [name, setName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.ADMIN); // Default role selection for UX

  // --- AUTO-REDIRECT LOGIC (Fixes Double Login Issue) ---
  useEffect(() => {
    if (!isLoadingAuth && currentUser) {
        if (currentUser.role === UserRole.CLIENT) {
            navigate('/store');
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
        if (isRegistering) {
            // Register Logic
            if (password.length < 6) {
                throw new Error("A senha deve ter pelo menos 6 caracteres.");
            }
            await register(email, password, name, role, role === UserRole.CLIENT ? clinicName : undefined);
            // After register, wait for useEffect to redirect
        } else {
            // Login Logic
            await login(email, password);
            // Wait for useEffect to redirect
        }

    } catch (err: any) {
        console.error(err);
        if (err.code === 'auth/invalid-credential') {
            setError("Email ou senha incorretos.");
        } else if (err.code === 'auth/email-already-in-use') {
            setError("Este email já está cadastrado.");
        } else if (err.code === 'auth/weak-password') {
            setError("Senha muito fraca.");
        } else {
            setError(err.message || "Erro ao autenticar. Tente novamente.");
        }
        setLoading(false); // Only stop loading on error. On success, keep loading until redirect.
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 w-full max-w-md p-8 rounded-3xl shadow-2xl border border-slate-700 animate-in fade-in zoom-in duration-300">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">ONE DENTAL</h1>
            <p className="text-slate-400">
                {isRegistering ? 'Crie sua conta para acessar' : 'Bem-vindo de volta'}
            </p>
        </div>

        {/* Role Toggle - Visible mostly during Register to set expectation, or Login to show distinct visual themes */}
        <div className="flex bg-slate-900 p-1 rounded-xl mb-6">
            <button 
                type="button"
                onClick={() => setRole(UserRole.ADMIN)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${
                    role !== UserRole.CLIENT ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                }`}
            >
                <ShieldCheck size={18} />
                Laboratório
            </button>
            <button 
                type="button"
                onClick={() => setRole(UserRole.CLIENT)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${
                    role === UserRole.CLIENT ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                }`}
            >
                <Stethoscope size={18} />
                Dentista
            </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* REGISTER: Name Field */}
            {isRegistering && (
                <div className="animate-in slide-in-from-top-2">
                    <label className="block text-sm font-medium text-slate-400 mb-1">Nome Completo</label>
                    <div className="relative">
                        <User className="absolute left-3 top-3.5 text-slate-500" size={18} />
                        <input 
                            type="text" 
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: João Silva"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>
            )}

            {/* REGISTER: Clinic Name (Only for Dentists) */}
            {isRegistering && role === UserRole.CLIENT && (
                <div className="animate-in slide-in-from-top-2">
                    <label className="block text-sm font-medium text-slate-400 mb-1">Nome da Clínica</label>
                    <div className="relative">
                        <Building className="absolute left-3 top-3.5 text-slate-500" size={18} />
                        <input 
                            type="text" 
                            required
                            value={clinicName}
                            onChange={(e) => setClinicName(e.target.value)}
                            placeholder="Ex: Clínica Sorriso"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                </div>
            )}

            {/* Email Field */}
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

            {/* Password Field */}
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
                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 ${
                    role === UserRole.CLIENT 
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/50' 
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/50'
                } ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
                {loading ? <Loader2 className="animate-spin" /> : (isRegistering ? 'Criar Conta' : 'Acessar Sistema')}
            </button>
        </form>

        <div className="mt-6 text-center">
            <p className="text-slate-400 text-sm">
                {isRegistering ? 'Já tem uma conta?' : 'Ainda não tem acesso?'}
                <button 
                    onClick={() => {
                        setIsRegistering(!isRegistering);
                        setError(null);
                        setPassword('');
                    }}
                    className={`font-bold ml-2 hover:underline ${role === UserRole.CLIENT ? 'text-indigo-400' : 'text-blue-400'}`}
                >
                    {isRegistering ? 'Fazer Login' : 'Cadastre-se'}
                </button>
            </p>
        </div>
      </div>
    </div>
  );
};