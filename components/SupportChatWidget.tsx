import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { db } from '../services/firebaseConfig';
import { 
  collection, doc, query, where, orderBy, onSnapshot, 
  addDoc, updateDoc, getDocs, limit, serverTimestamp 
} from 'firebase/firestore';
import { 
  MessageSquare, X, Send, HelpCircle, 
  CheckCircle, AlertCircle, Clock, Shield, Headphones 
} from 'lucide-react';
import { SupportTicket, SupportMessage } from '../types';

const CATEGORIES = [
  { id: 'finance', label: 'Financeiro e Cobrança' },
  { id: 'bug', label: 'Problema no Sistema / Erros' },
  { id: 'hardware', label: 'Suporte de Hardware ou Scanner' },
  { id: 'usage', label: 'Dúvidas de Uso ou Treinamento' },
  { id: 'other', label: 'Outros Assuntos' }
];

export const SupportChatWidget = () => {
  const { currentUser, currentOrg } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');

  // Triage state
  const [triageStep, setTriageStep] = useState<number>(0); // 0: select category, 1: describe issue, 2: submitted
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, triageStep]);

  // Check for active tickets for the current user
  useEffect(() => {
    if (!currentUser) return;

    // Load active (PENDING or ACTIVE) tickets
    const q = query(
      collection(db, 'support_tickets'),
      where('userId', '==', currentUser.id),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        const data = docSnap.data();
        
        // Only set as active if not resolved
        if (data.status !== 'RESOLVED') {
          setActiveTicket({
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
          } as SupportTicket);
          setTriageStep(2); // Skip triage, go directly to chat
        } else {
          setActiveTicket(null);
          // If we had an active ticket and it got resolved, clear it
          if (triageStep === 2) {
            setTriageStep(0);
          }
        }
      } else {
        setActiveTicket(null);
      }
    }, (error) => {
      console.warn("Silent ignore support tickets snapshot error:", error);
    });

    return unsubscribe;
  }, [currentUser, triageStep]);

  // Load messages if active ticket exists
  useEffect(() => {
    if (!activeTicket) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, `support_tickets/${activeTicket.id}/messages`),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded: SupportMessage[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        loaded.push({
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        } as SupportMessage);
      });
      setMessages(loaded);
    }, (error) => {
      console.error("Error loading chat widget messages:", error);
    });

    return unsubscribe;
  }, [activeTicket]);

  const handleSelectCategory = (catId: string) => {
    setSelectedCategory(catId);
    setTriageStep(1);
  };

  const handleStartTriage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !description.trim() || !currentUser) return;

    const descText = description.trim();
    setDescription('');

    try {
      // 1. Create ticket
      const ticketData = {
        userId: currentUser.id,
        userName: currentUser.name,
        userEmail: currentUser.email,
        userPhone: currentUser.phone || '',
        userRole: currentUser.role,
        organizationId: currentUser.organizationId || '',
        organizationName: currentOrg?.name || '',
        category: selectedCategory,
        description: descText,
        status: 'PENDING',
        assignedAgentId: null,
        assignedAgentName: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const ticketRef = await addDoc(collection(db, 'support_tickets'), ticketData);

      // 2. Add triage chat messages to subcollection
      const messagesRef = collection(db, `support_tickets/${ticketRef.id}/messages`);
      
      // Welcome message from BOT
      await addDoc(messagesRef, {
        senderId: 'bot_triage',
        senderName: 'Assistente Virtual',
        senderRole: 'BOT',
        text: "Olá! Seja bem-vindo ao suporte técnico LabProx. Qual é a natureza do seu atendimento hoje?",
        createdAt: new Date(),
      });

      // User selection
      const categoryLabel = CATEGORIES.find(c => c.id === selectedCategory)?.label || selectedCategory;
      await addDoc(messagesRef, {
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderRole: 'CLIENT',
        text: `Categoria selecionada: ${categoryLabel}`,
        createdAt: new Date(),
      });

      // Bot request for description
      await addDoc(messagesRef, {
        senderId: 'bot_triage',
        senderName: 'Assistente Virtual',
        senderRole: 'BOT',
        text: "Por favor, descreva em poucas palavras o seu problema ou dúvida.",
        createdAt: new Date(),
      });

      // User description
      await addDoc(messagesRef, {
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderRole: 'CLIENT',
        text: descText,
        createdAt: new Date(),
      });

      // Bot confirmation message
      await addDoc(messagesRef, {
        senderId: 'bot_triage',
        senderName: 'Assistente Virtual',
        senderRole: 'BOT',
        text: "Obrigado! Seus dados foram triados com sucesso. Um atendente de suporte técnico foi notificado e logo entrará em contato aqui neste chat. Por favor, aguarde.",
        createdAt: new Date(),
      });

      setTriageStep(2);
    } catch (err) {
      console.error("Error creating ticket:", err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !newMessage.trim() || !currentUser) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      await addDoc(collection(db, `support_tickets/${activeTicket.id}/messages`), {
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderRole: 'CLIENT',
        text: messageText,
        createdAt: new Date(),
      });

      // Update ticket updatedAt
      await updateDoc(doc(db, 'support_tickets', activeTicket.id), {
        updatedAt: new Date()
      });
    } catch (err) {
      console.error("Error sending user message:", err);
    }
  };

  // Skip rendering widget for SUPER_ADMIN or HELPDESK role since they use full screens
  if (currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'HELPDESK') {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Expanded Chat Drawer */}
      {isOpen && (
        <div className="w-96 h-[500px] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden mb-4 animate-in slide-in-from-bottom duration-300">
          
          {/* Header */}
          <div className="bg-slate-950 text-white p-4 flex justify-between items-center border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-600 rounded-xl">
                <Headphones size={18} />
              </div>
              <div>
                <h4 className="text-sm font-black tracking-tight uppercase">Suporte Técnico</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Atendimento LabProx</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Chat / Triage Container */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-slate-50/50 no-scrollbar">
            
            {/* Step 0: Select Category */}
            {triageStep === 0 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 bg-slate-900 text-blue-400 rounded-full flex items-center justify-center text-xs font-black">
                    IA
                  </div>
                  <div className="bg-slate-900 text-slate-100 p-3 rounded-2xl rounded-tl-none max-w-[80%] text-xs leading-relaxed shadow-md">
                    Olá! Seja bem-vindo ao suporte técnico. Como podemos te ajudar hoje? Selecione a natureza do atendimento para realizarmos a triagem:
                  </div>
                </div>

                <div className="pl-10 space-y-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleSelectCategory(cat.id)}
                      className="w-full text-left px-4 py-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-500 rounded-2xl text-xs font-bold text-slate-700 transition-all shadow-sm flex justify-between items-center group"
                    >
                      {cat.label}
                      <span className="text-slate-300 group-hover:text-blue-500 transition-colors">→</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 1: Describe Issue */}
            {triageStep === 1 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 bg-slate-900 text-blue-400 rounded-full flex items-center justify-center text-xs font-black">
                    IA
                  </div>
                  <div className="bg-slate-900 text-slate-100 p-3 rounded-2xl rounded-tl-none max-w-[80%] text-xs leading-relaxed shadow-md">
                    Perfeito! Por favor, descreva brevemente seu problema ou solicitação abaixo. Assim que enviar, conectaremos você a um atendente.
                  </div>
                </div>

                <form onSubmit={handleStartTriage} className="pl-10 space-y-3">
                  <textarea
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Escreva detalhadamente qual é sua dúvida ou problema..."
                    className="w-full bg-white border border-slate-200 rounded-2xl p-3 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] shadow-sm resize-none"
                  />

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTriageStep(0)}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black uppercase rounded-xl transition-all"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase rounded-xl transition-all shadow-md shadow-blue-100"
                    >
                      Iniciar Suporte
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Step 2: Ongoing Triage / Chat */}
            {triageStep === 2 && (
              <div className="flex-1 flex flex-col gap-3 min-h-0">
                {/* Agent Assignment Warning Banner */}
                {activeTicket && !activeTicket.assignedAgentId && (
                  <div className="bg-amber-50 border border-amber-100 text-amber-800 text-[10px] font-bold p-2.5 rounded-xl flex items-center gap-1.5 shrink-0">
                    <Clock size={12} className="text-amber-600 shrink-0" />
                    Aguardando conexão com atendente...
                  </div>
                )}

                {activeTicket && activeTicket.assignedAgentId && (
                  <div className="bg-blue-50 border border-blue-100 text-blue-800 text-[10px] font-bold p-2.5 rounded-xl flex items-center gap-1.5 shrink-0">
                    <CheckCircle size={12} className="text-blue-600 shrink-0" />
                    Conectado com agente {activeTicket.assignedAgentName}
                  </div>
                )}

                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 no-scrollbar flex flex-col">
                  {messages.map((msg) => {
                    const isBot = msg.senderRole === 'BOT';
                    const isCurrentUser = msg.senderId === currentUser?.id;

                    return (
                      <div
                        key={msg.id}
                        className={`flex items-start gap-2 ${isCurrentUser ? 'justify-end' : ''}`}
                      >
                        {!isCurrentUser && (
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                            isBot ? 'bg-slate-900 text-blue-400' : 'bg-indigo-600 text-white'
                          }`}>
                            {isBot ? 'IA' : msg.senderName.charAt(0)}
                          </div>
                        )}

                        <div className={`p-3 rounded-2xl text-xs max-w-[80%] leading-relaxed ${
                          isCurrentUser
                            ? 'bg-slate-950 text-white rounded-tr-none shadow-sm'
                            : isBot
                              ? 'bg-slate-900 text-slate-100 rounded-tl-none shadow-md border border-slate-800'
                              : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-sm'
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            )}

          </div>

          {/* Chat Footer/Input */}
          {triageStep === 2 && (
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-white flex gap-2 shrink-0">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escreva sua mensagem..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="bg-slate-950 text-white p-2.5 rounded-2xl hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                <Send size={14} />
              </button>
            </form>
          )}

        </div>
      )}

      {/* Launcher Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-slate-800 transition-all duration-300 transform hover:scale-105 active:scale-95 border-2 border-slate-800 hover:border-blue-500 relative"
      >
        {isOpen ? <X size={24} /> : <Headphones size={24} />}
        
        {/* Real-time Triage / Support active notifier dot */}
        {activeTicket && !isOpen && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-rose-500 border-2 border-white rounded-full animate-ping" />
        )}
      </button>

    </div>
  );
};
