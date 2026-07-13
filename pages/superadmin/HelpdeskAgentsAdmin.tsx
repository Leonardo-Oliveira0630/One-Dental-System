import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebaseConfig';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { 
  Shield, User, Mail, Lock, Phone, Trash2, 
  Plus, Loader2, CheckCircle, ShieldCheck, RefreshCw, Star, BarChart3, MessageSquareText 
} from 'lucide-react';
import { User as UserType, UserRole, SupportTicket } from '../../types';

// Web Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBqvqRSt06s2Dh09fYiFsw4zTA598bmwlU",
  authDomain: "one-dental-system.firebaseapp.com",
  projectId: "one-dental-system",
  storageBucket: "one-dental-system.firebasestorage.app",
  messagingSenderId: "963023434254",
  appId: "1:963023434254:web:5e5513ea9de1676aa7825f",
  measurementId: "G-MK756FXZ9N"
};

export const HelpdeskAgentsAdmin = () => {
  const [agents, setAgents] = useState<UserType[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load Support Tickets for metrics computation
  useEffect(() => {
    const q = query(collection(db, 'support_tickets'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedTickets: SupportTicket[] = [];
      snapshot.forEach((docSnap) => {
        loadedTickets.push({
          id: docSnap.id,
          ...docSnap.data()
        } as SupportTicket);
      });
      setTickets(loadedTickets);
    }, (err) => {
      console.error("Error loading tickets for admin metrics:", err);
    });
    return unsubscribe;
  }, []);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load Helpdesk Agents
  useEffect(() => {
    const q = query(
      collection(db, 'users'),
      where('role', '==', UserRole.HELPDESK)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedAgents: UserType[] = [];
      snapshot.forEach((docSnap) => {
        loadedAgents.push({
          id: docSnap.id,
          ...docSnap.data()
        } as UserType);
      });
      setAgents(loadedAgents);
      setIsLoading(false);
    }, (err) => {
      console.error("Error loading helpdesk agents:", err);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleRegisterAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    const appName = `secondary-auth-${Date.now()}`;
    let tempApp: any = null;

    try {
      // 1. Initialize secondary app to avoid logging out the current admin
      tempApp = initializeApp(firebaseConfig, appName);
      const tempAuth = getAuth(tempApp);

      // 2. Create the user in Firebase Authentication
      const userCred = await createUserWithEmailAndPassword(tempAuth, email.trim(), password);
      const uid = userCred.user.uid;

      // 3. Save the profile document in Firestore 'users' collection
      const agentProfile: UserType = {
        id: uid,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role: UserRole.HELPDESK,
        createdAt: new Date(),
      };

      await setDoc(doc(db, 'users', uid), agentProfile);

      // 4. Clean up secondary auth session
      await signOut(tempAuth);

      setSuccess(`Agente de atendimento "${name}" cadastrado com sucesso!`);
      setName('');
      setEmail('');
      setPassword('');
      setPhone('');
    } catch (err: any) {
      console.error("Error registering helpdesk agent:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError("Este e-mail já está em uso.");
      } else if (err.code === 'auth/weak-password') {
        setError("A senha deve conter no mínimo 6 caracteres.");
      } else {
        setError(err.message || "Erro desconhecido ao cadastrar o agente.");
      }
    } finally {
      if (tempApp) {
        try {
          await deleteApp(tempApp);
        } catch (cleanupErr) {
          console.warn("Failed to delete temp Firebase app:", cleanupErr);
        }
      }
      setIsSubmitting(false);
    }
  };

  const handleDeleteAgent = async (agentId: string, agentName: string) => {
    if (!window.confirm(`Tem certeza que deseja remover o agente "${agentName}"? O cadastro dele no banco de dados será excluído.`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', agentId));
      alert("Agente removido do banco de dados de usuários.");
    } catch (err) {
      console.error("Error deleting agent profile:", err);
      alert("Erro ao remover o agente.");
    }
  };

  const generateRandomPassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
    let newPass = '';
    for (let i = 0; i < 10; i++) {
      newPass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(newPass);
  };

  const getAgentMetrics = (agentId: string) => {
    const agentTickets = tickets.filter(t => t.assignedAgentId === agentId);
    const resolved = agentTickets.filter(t => t.status === 'RESOLVED');
    const active = agentTickets.filter(t => t.status === 'ACTIVE');
    
    // Calculate average rating
    const ratedTickets = resolved.filter(t => t.rating !== undefined && t.rating !== null);
    const totalRating = ratedTickets.reduce((sum, t) => sum + (t.rating || 0), 0);
    const avgRating = ratedTickets.length > 0 ? (totalRating / ratedTickets.length).toFixed(1) : null;
    
    return {
      total: agentTickets.length,
      resolvedCount: resolved.length,
      activeCount: active.length,
      avgRating,
      ratingCount: ratedTickets.length,
      recentFeedbacks: resolved
        .filter(t => t.rating !== undefined && t.rating !== null && t.ratingComment)
        .slice(0, 3) // get 3 most recent feedbacks with comments
    };
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Shield className="text-blue-600" size={32} />
          Agentes de Atendimento Técnico
        </h1>
        <p className="text-slate-500">Gerencie os atendentes e operadores de helpdesk do ecossistema.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Register Form */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-6 h-fit">
          <div>
            <h3 className="font-bold text-slate-800 text-lg uppercase tracking-tight">Cadastrar Novo Agente</h3>
            <p className="text-xs text-slate-400 mt-1">Insira os dados do atendente. Ele poderá logar no sistema utilizando estes dados e será redirecionado para a mesa de suporte completo.</p>
          </div>

          <form onSubmit={handleRegisterAgent} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nome Completo</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do atendente"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">E-mail Corporativo</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="suporte@labprox.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Telefone (Opcional)</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Senha de Acesso</label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="text-[9px] font-black text-blue-600 hover:underline uppercase"
                >
                  Gerar Senha
                </button>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 caracteres"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-[11px] font-medium leading-relaxed">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700 text-[11px] font-medium leading-relaxed flex items-start gap-2">
                <CheckCircle size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Cadastrando Agente...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Cadastrar Agente
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Agents List */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-6 lg:col-span-2">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-800 text-lg uppercase tracking-tight">Agentes Ativos</h3>
              <p className="text-xs text-slate-400">Total de atendentes registrados que possuem acesso à fila de helpdesk.</p>
            </div>
            <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
              {agents.length} Agentes
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="p-4">Agente</th>
                  <th className="p-4">E-mail</th>
                  <th className="p-4">Contato</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-600 text-xs">
                          {agent.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm flex items-center gap-1">
                            {agent.name}
                            <ShieldCheck size={14} className="text-blue-500" />
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">ID: {agent.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-xs font-semibold text-slate-600">{agent.email}</td>
                    <td className="p-4 text-xs font-semibold text-slate-600">{agent.phone || 'Sem telefone'}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDeleteAgent(agent.id, agent.name)}
                        className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        title="Remover Agente"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}

                {agents.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-slate-400 italic">
                      Nenhum agente cadastrado até o momento.
                    </td>
                  </tr>
                )}

                {isLoading && (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-slate-400">
                      <Loader2 className="animate-spin mx-auto text-slate-400" />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Metrics Section */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2 uppercase">
            <BarChart3 className="text-blue-600" size={22} />
            Métricas de Atendimento & Performance
          </h2>
          <p className="text-slate-500 text-xs">Acompanhe as notas de avaliação, chamados concluídos e feedbacks enviados pelos clientes para cada agente de helpdesk.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {agents.map((agent) => {
            const metrics = getAgentMetrics(agent.id);
            return (
              <div key={agent.id} className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 flex flex-col justify-between gap-4">
                <div className="space-y-3">
                  {/* Agent Card Header */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{agent.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">ID: {agent.id.slice(0, 8)}</p>
                    </div>
                    {metrics.avgRating ? (
                      <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full border border-amber-200 text-xs font-bold shadow-sm">
                        <Star size={12} className="fill-amber-500 text-amber-500" />
                        <span>{metrics.avgRating} / 5</span>
                      </div>
                    ) : (
                      <span className="text-[9px] text-slate-400 bg-slate-100 px-2 py-1 rounded-full font-bold">Sem avaliações</span>
                    )}
                  </div>

                  {/* Rating Stats info */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white p-2 rounded-xl border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase">Resolvidos</p>
                      <p className="text-sm font-black text-slate-800">{metrics.resolvedCount}</p>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase">Ativos</p>
                      <p className="text-sm font-black text-blue-600">{metrics.activeCount}</p>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase">Total</p>
                      <p className="text-sm font-black text-slate-800">{metrics.total}</p>
                    </div>
                  </div>

                  {/* Rating distribution indicator */}
                  {metrics.avgRating && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400">
                        <span>Índice de Aprovação</span>
                        <span>{((Number(metrics.avgRating) / 5) * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full" 
                          style={{ width: `${(Number(metrics.avgRating) / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Customer Feedbacks */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <MessageSquareText size={12} />
                    Avaliações Recentes
                  </h5>
                  <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar">
                    {metrics.recentFeedbacks.map((ticket) => (
                      <div key={ticket.id} className="bg-white p-2.5 rounded-xl border border-slate-100 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-bold text-slate-700 truncate max-w-[120px]">{ticket.userName}</span>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star 
                                key={s} 
                                size={9} 
                                className={(ticket.rating || 0) >= s ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} 
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-500 italic line-clamp-2">
                          "{ticket.ratingComment}"
                        </p>
                      </div>
                    ))}

                    {metrics.recentFeedbacks.length === 0 && (
                      <p className="text-[10px] text-slate-400 italic text-center py-2">
                        Nenhum feedback com comentário ainda.
                      </p>
                    )}
                  </div>
                </div>

              </div>
            );
          })}

          {agents.length === 0 && (
            <div className="col-span-full p-8 text-center text-slate-400 italic bg-slate-50 rounded-2xl border border-slate-100">
              Cadastre agentes de atendimento acima para começar a monitorar as métricas de performance.
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
