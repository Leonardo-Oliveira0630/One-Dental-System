import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { db } from '../services/firebaseConfig';
import { collection, doc, query, where, orderBy, onSnapshot, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { 
  MessageSquare, User, Clock, CheckCircle, AlertCircle, 
  HelpCircle, ArrowRight, Shield, Send, Users, Activity, 
  ChevronRight, Phone, Mail, Building, Landmark, LogOut, Star,
  Image, Mic, Trash2, Paperclip, Square, X
} from 'lucide-react';
import { SupportTicket, SupportMessage, UserRole } from '../types';
import { useNavigate } from 'react-router-dom';

const CATEGORY_LABELS: Record<string, string> = {
  finance: 'Financeiro e Cobrança',
  bug: 'Problema no Sistema / Erros',
  hardware: 'Suporte de Hardware ou Scanner',
  usage: 'Dúvidas de Uso ou Treinamento',
  other: 'Outros Assuntos'
};

const CATEGORY_COLORS: Record<string, string> = {
  finance: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  bug: 'bg-rose-50 text-rose-700 border-rose-100',
  hardware: 'bg-amber-50 text-amber-700 border-amber-100',
  usage: 'bg-blue-50 text-blue-700 border-blue-100',
  other: 'bg-slate-50 text-slate-700 border-slate-100'
};

export const HelpdeskWorkspace = () => {
  const { currentUser, logout } = useApp();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [activeTab, setActiveTab] = useState<'open' | 'mine' | 'resolved'>('open');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [resolutionNote, setResolutionNote] = useState('');
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showDetailsMobile, setShowDetailsMobile] = useState(false);

  // Attachment & Voice Recording state
  const [attachment, setAttachment] = useState<{ url: string; type: 'image' | 'audio'; name: string } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        } else {
          resolve(base64Str);
        }
      };
      img.onerror = () => {
        resolve(base64Str);
      };
    });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        const compressedBase64 = await compressImage(base64String);
        setAttachment({
          url: compressedBase64,
          type: 'image',
          name: file.name
        });
      } catch (err) {
        console.error("Erro ao comprimir imagem de suporte:", err);
        setAttachment({
          url: base64String,
          type: 'image',
          name: file.name
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
      alert("O arquivo de áudio é muito grande. Para anexar, selecione um arquivo de até 800KB ou grave uma mensagem de voz diretamente pelo chat.");
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setAttachment({
        url: base64String,
        type: 'audio',
        name: file.name
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          setAttachment({
            url: base64String,
            type: 'audio',
            name: `Áudio gravado (${recordingTime}s)`
          });
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Erro ao acessar microfone:", err);
      alert("Não foi possível acessar o microfone. Verifique suas permissões de áudio.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      audioChunksRef.current = [];
      setAttachment(null);
    }
  };

  // Auto scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load support tickets
  useEffect(() => {
    const q = query(
      collection(db, 'support_tickets'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedTickets: SupportTicket[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        loadedTickets.push({
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
          closedAt: data.closedAt?.toDate ? data.closedAt.toDate() : data.closedAt ? new Date(data.closedAt) : null,
        } as SupportTicket);
      });
      setTickets(loadedTickets);

      // Keep selected ticket in sync with latest state
      if (selectedTicket) {
        const updated = loadedTickets.find(t => t.id === selectedTicket.id);
        if (updated) {
          setSelectedTicket(updated);
        }
      }
    }, (error) => {
      console.error("Error loading tickets in Helpdesk:", error);
    });

    return unsubscribe;
  }, [selectedTicket?.id]);

  // Load chat messages when a ticket is selected
  useEffect(() => {
    if (!selectedTicket) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, `support_tickets/${selectedTicket.id}/messages`),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedMessages: SupportMessage[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        loadedMessages.push({
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        } as SupportMessage);
      });
      setMessages(loadedMessages);
    }, (error) => {
      console.error("Error loading messages in Helpdesk:", error);
    });

    return unsubscribe;
  }, [selectedTicket?.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !currentUser) return;
    if (!newMessageText.trim() && !attachment) return;

    const messageText = newMessageText.trim();
    const currentAttachment = attachment;

    setNewMessageText('');
    setAttachment(null);

    try {
      const messageDoc: any = {
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderRole: 'AGENT',
        text: messageText,
        createdAt: new Date(),
      };

      if (currentAttachment) {
        messageDoc.attachmentUrl = currentAttachment.url;
        messageDoc.attachmentType = currentAttachment.type;
      }

      // 1. Add message to subcollection
      await addDoc(collection(db, `support_tickets/${selectedTicket.id}/messages`), messageDoc);

      // 2. Update ticket status and assigned agent if unassigned
      const ticketRef = doc(db, 'support_tickets', selectedTicket.id);
      const updates: Partial<SupportTicket> = {
        updatedAt: new Date(),
      };

      if (selectedTicket.status === 'PENDING') {
        updates.status = 'ACTIVE';
      }

      if (!selectedTicket.assignedAgentId) {
        updates.assignedAgentId = currentUser.id;
        updates.assignedAgentName = currentUser.name;
      }

      await updateDoc(ticketRef, updates);
    } catch (err) {
      console.error("Error sending message from Helpdesk:", err);
    }
  };

  const handleClaimTicket = async () => {
    if (!selectedTicket || !currentUser) return;

    try {
      const ticketRef = doc(db, 'support_tickets', selectedTicket.id);
      await updateDoc(ticketRef, {
        assignedAgentId: currentUser.id,
        assignedAgentName: currentUser.name,
        status: selectedTicket.status === 'PENDING' ? 'ACTIVE' : selectedTicket.status,
        updatedAt: new Date()
      });
    } catch (err) {
      console.error("Error claiming ticket:", err);
    }
  };

  const handleResolveTicket = async () => {
    if (!selectedTicket || !currentUser) return;

    try {
      const ticketRef = doc(db, 'support_tickets', selectedTicket.id);
      await updateDoc(ticketRef, {
        status: 'RESOLVED',
        resolutionNote: resolutionNote.trim() || 'Chamado resolvido pelo suporte técnico.',
        closedAt: new Date(),
        updatedAt: new Date()
      });

      // Add a system bot closure message
      await addDoc(collection(db, `support_tickets/${selectedTicket.id}/messages`), {
        senderId: 'system_bot',
        senderName: 'Assistente Virtual',
        senderRole: 'BOT',
        text: `Este atendimento foi finalizado pelo agente ${currentUser.name}. Resolução: ${resolutionNote.trim() || 'Chamado encerrado.'}`,
        createdAt: new Date(),
      });

      setShowResolveModal(false);
      setResolutionNote('');
    } catch (err) {
      console.error("Error resolving ticket:", err);
    }
  };

  // Stats calculation
  const totalOpen = tickets.filter(t => !t.assignedAgentId && t.status !== 'RESOLVED').length;
  const totalMine = tickets.filter(t => t.assignedAgentId === currentUser?.id && t.status === 'ACTIVE').length;
  const totalActiveGlobal = tickets.filter(t => t.status === 'ACTIVE').length;
  const totalResolved = tickets.filter(t => t.status === 'RESOLVED').length;

  // Filtered tickets
  const filteredTickets = tickets.filter(t => {
    let matchesTab = false;
    if (activeTab === 'open') {
      matchesTab = !t.assignedAgentId && t.status !== 'RESOLVED';
    } else if (activeTab === 'mine') {
      matchesTab = t.assignedAgentId === currentUser?.id && t.status === 'ACTIVE';
    } else if (activeTab === 'resolved') {
      matchesTab = t.status === 'RESOLVED';
    }
    const matchesCategory = selectedCategoryFilter === 'all' || t.category === selectedCategoryFilter;
    return matchesTab && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Professional Banner / Header */}
      <header className="bg-slate-900 text-white px-4 sm:px-8 py-3 sm:py-4 shadow-md flex justify-between items-center border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-600 rounded-xl text-white shrink-0">
            <Shield size={18} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-sm sm:text-xl font-black tracking-tight">SALA DE HELP DESIGN</h1>
              <span className="bg-blue-500/20 text-blue-300 text-[8px] sm:text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-blue-500/30">
                Agent
              </span>
            </div>
            <p className="text-slate-400 text-[10px] sm:text-xs font-semibold">
              Logado como <strong className="text-white">{currentUser?.name?.split(' ')[0]}</strong> • Central de Suporte
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => { logout(); navigate('/login'); }}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white px-3 py-1.5 hover:bg-slate-800 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-wider transition-all border border-transparent hover:border-slate-700"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </header>

      {/* KPI Stats Panel */}
      <div className="hidden md:block bg-white border-b border-slate-200 px-8 py-4 shrink-0 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <AlertCircle size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Aguardando Atendimento</p>
              <h3 className="text-2xl font-black text-slate-800">{totalOpen}</h3>
            </div>
          </div>

          <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Activity size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Atendimentos Ativos</p>
              <h3 className="text-2xl font-black text-slate-800">{totalActiveGlobal}</h3>
            </div>
          </div>

          <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Meus Ativos / Total Resolvido</p>
              <h3 className="text-2xl font-black text-slate-800">{totalMine} / {totalResolved}</h3>
            </div>
          </div>

          <div className="flex items-center gap-4 p-3 bg-slate-900 text-white rounded-2xl shadow-lg">
            <div className="p-3 bg-slate-800 text-blue-400 rounded-xl">
              <Users size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Capacidade Total</p>
              <h3 className="text-xl font-bold">100% Operacional</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace Grid */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        
        {/* Left Column: Tickets Queue List */}
        <div className={`${selectedTicket ? 'hidden md:flex' : 'flex'} w-full md:w-96 border-r border-slate-200 bg-white flex flex-col shrink-0 min-h-0`}>
          
          {/* Tabs for Ticket Status */}
          <div className="flex border-b border-slate-200 p-2 gap-1 shrink-0 bg-slate-50">
            <button
              onClick={() => { setActiveTab('open'); setSelectedTicket(null); setShowDetailsMobile(false); }}
              className={`flex-1 py-2 text-center text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                activeTab === 'open' 
                  ? 'bg-slate-900 text-white shadow-md' 
                  : 'text-slate-500 hover:text-slate-800 bg-white border border-slate-100 hover:border-slate-200 shadow-sm'
              }`}
            >
              Abertos ({totalOpen})
            </button>
            <button
              onClick={() => { setActiveTab('mine'); setSelectedTicket(null); setShowDetailsMobile(false); }}
              className={`flex-1 py-2 text-center text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                activeTab === 'mine' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-500 hover:text-slate-800 bg-white border border-slate-100 hover:border-slate-200 shadow-sm'
              }`}
            >
              Meus ({totalMine})
            </button>
            <button
              onClick={() => { setActiveTab('resolved'); setSelectedTicket(null); setShowDetailsMobile(false); }}
              className={`flex-1 py-2 text-center text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                activeTab === 'resolved' 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'text-slate-500 hover:text-slate-800 bg-white border border-slate-100 hover:border-slate-200 shadow-sm'
              }`}
            >
              Fechados ({totalResolved})
            </button>
          </div>

          {/* Category Filters */}
          <div className="p-3 border-b border-slate-100 shrink-0">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Filtrar Categoria</label>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
            >
              <option value="all">Todas as Categorias</option>
              <option value="finance">Financeiro e Cobrança</option>
              <option value="bug">Problema no Sistema / Erros</option>
              <option value="hardware">Suporte de Hardware ou Scanner</option>
              <option value="usage">Dúvidas de Uso ou Treinamento</option>
              <option value="other">Outros Assuntos</option>
            </select>
          </div>

          {/* Ticket Cards List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 no-scrollbar min-h-0">
            {filteredTickets.map((ticket) => {
              const isSelected = selectedTicket?.id === ticket.id;
              return (
                <div
                  key={ticket.id}
                  onClick={() => {
                    setSelectedTicket(ticket);
                    setShowDetailsMobile(false);
                  }}
                  className={`p-4 cursor-pointer transition-all border-l-4 hover:bg-slate-50 flex flex-col gap-2 ${
                    isSelected 
                      ? 'bg-blue-50/50 border-blue-600' 
                      : ticket.status === 'PENDING' 
                        ? 'border-rose-500' 
                        : ticket.status === 'ACTIVE' 
                          ? 'border-blue-400' 
                          : 'border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${CATEGORY_COLORS[ticket.category] || 'bg-slate-50'}`}>
                      {CATEGORY_LABELS[ticket.category] || 'Suporte'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                      <Clock size={12} />
                      {ticket.createdAt ? ticket.createdAt.toLocaleDateString() : ''}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-800 text-sm truncate">{ticket.userName}</h4>
                    <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                      <Building size={10} />
                      {ticket.organizationName || 'Sem organização'} ({ticket.userRole === 'CLIENT' ? 'Dentista' : 'Laboratório'})
                    </p>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 bg-slate-50 p-2 rounded-lg italic">
                    "{ticket.description}"
                  </p>

                  <div className="flex justify-between items-center mt-1">
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                      ticket.status === 'PENDING' 
                        ? 'bg-rose-100 text-rose-700' 
                        : ticket.status === 'ACTIVE' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {ticket.status === 'PENDING' ? 'AGUARDANDO' : ticket.status === 'ACTIVE' ? 'EM ATENDIMENTO' : 'RESOLVIDO'}
                    </span>

                    {ticket.status === 'RESOLVED' && ticket.rating !== undefined ? (
                      <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-200" title={`Comentário: ${ticket.ratingComment || 'Nenhum'}`}>
                        <Star size={11} className="fill-amber-500 text-amber-500" />
                        {ticket.rating} / 5
                      </span>
                    ) : ticket.status === 'RESOLVED' ? (
                      <span className="text-[9px] text-slate-400 font-bold bg-slate-50 px-2 py-0.5 rounded-full italic border border-slate-200">
                        Sem avaliação
                      </span>
                    ) : ticket.assignedAgentName ? (
                      <span className="text-[9px] text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                        Agente: {ticket.assignedAgentName.split(' ')[0]}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}

            {filteredTickets.length === 0 && (
              <div className="p-12 text-center text-slate-400 italic">
                <HelpCircle size={32} className="mx-auto text-slate-300 mb-2" />
                Nenhum chamado encontrado.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Chat & Information details */}
        <div className={`${selectedTicket ? 'flex' : 'hidden md:flex'} flex-1 bg-[#F8FAFC] flex flex-col overflow-hidden min-h-0`}>
          
          {selectedTicket ? (
            <div className="flex-1 flex overflow-hidden min-h-0">
              
              {/* Central Chat Interface */}
              <div className="flex-1 flex flex-col bg-white border-r border-slate-200 min-h-0">
                
                {/* Chat Header Info */}
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center gap-2 shrink-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Mobile Back Button */}
                    <button
                      onClick={() => setSelectedTicket(null)}
                      className="md:hidden p-2 hover:bg-slate-200/70 rounded-xl text-slate-600 transition-colors shrink-0"
                      title="Voltar"
                    >
                      <ChevronRight className="rotate-180" size={18} />
                    </button>

                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold shrink-0 text-sm">
                      {selectedTicket.userName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-800 text-xs sm:text-sm leading-tight truncate">{selectedTicket.userName}</h3>
                      <p className="text-[9px] sm:text-[10px] text-slate-500 font-medium truncate">
                        {CATEGORY_LABELS[selectedTicket.category]} • Cód: #{selectedTicket.id.slice(0, 6)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Mobile Client Info Toggle */}
                    <button
                      onClick={() => setShowDetailsMobile(true)}
                      className="lg:hidden p-2 hover:bg-slate-200/70 rounded-xl text-slate-600 transition-colors shrink-0"
                      title="Ver detalhes do cliente"
                    >
                      <HelpCircle size={18} />
                    </button>

                    {selectedTicket.status !== 'RESOLVED' ? (
                      <>
                        {!selectedTicket.assignedAgentId || selectedTicket.assignedAgentId !== currentUser?.id ? (
                          <button
                            onClick={handleClaimTicket}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] sm:text-xs font-black uppercase px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl flex items-center gap-1 shadow-md shadow-blue-100 transition-all shrink-0"
                          >
                            <User size={12} />
                            <span className="hidden sm:inline">Assumir</span>
                            <span className="sm:hidden">Pegar</span>
                          </button>
                        ) : null}

                        <button
                          onClick={() => setShowResolveModal(true)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] sm:text-xs font-black uppercase px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl flex items-center gap-1 shadow-md shadow-emerald-100 transition-all shrink-0"
                        >
                          <CheckCircle size={12} />
                          <span>Encerrar</span>
                        </button>
                      </>
                    ) : (
                      <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] sm:text-xs font-black px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl uppercase flex items-center gap-1 shrink-0">
                        <CheckCircle size={12} />
                        Resolvido
                      </span>
                    )}
                  </div>
                </div>

                {/* Triage summary sticky panel */}
                <div className="bg-amber-50/75 border-b border-amber-100 p-4 shrink-0 flex items-start gap-2.5">
                  <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900 leading-relaxed">
                    <strong>Informação de Triagem:</strong> {selectedTicket.description}
                  </div>
                </div>

                {/* Chat Message Logs */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 bg-slate-50/50 no-scrollbar min-h-0">
                  {messages.map((msg) => {
                    const isBot = msg.senderRole === 'BOT';
                    const isClient = msg.senderRole === 'CLIENT';
                    const isCurrentUserMsg = msg.senderId === currentUser?.id;

                    return (
                      <div
                        key={msg.id}
                        className={`flex items-start gap-2.5 shrink-0 ${isCurrentUserMsg ? 'justify-end' : ''}`}
                      >
                        {!isCurrentUserMsg && (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            isBot 
                              ? 'bg-slate-800 text-blue-400' 
                              : 'bg-indigo-600 text-white'
                          }`}>
                            {isBot ? 'IA' : msg.senderName.charAt(0)}
                          </div>
                        )}

                        <div className={`max-w-[70%] p-3.5 rounded-2xl ${
                          isCurrentUserMsg
                            ? 'bg-slate-900 text-white rounded-tr-none shadow-md'
                            : isBot
                              ? 'bg-slate-800 text-slate-100 rounded-tl-none shadow-md'
                              : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-sm'
                        }`}>
                          <div className="flex justify-between items-center gap-4 mb-1">
                            <span className="text-[9px] font-black uppercase tracking-wider opacity-75">
                              {isBot ? 'Assistente de Triagem' : msg.senderName}
                            </span>
                            <span className="text-[8px] opacity-50 font-mono">
                              {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                          {msg.text && <p className={`text-xs leading-relaxed whitespace-pre-wrap ${msg.attachmentUrl ? 'mb-2' : ''}`}>{msg.text}</p>}
                          {msg.attachmentUrl && (
                            <div className="mt-1">
                              {msg.attachmentType === 'image' ? (
                                <img 
                                  src={msg.attachmentUrl} 
                                  alt="Anexo" 
                                  className="rounded-lg max-w-full max-h-60 object-cover cursor-pointer hover:opacity-90 transition-all border border-slate-200/50" 
                                  onClick={() => window.open(msg.attachmentUrl, '_blank')}
                                  referrerPolicy="no-referrer"
                                />
                              ) : msg.attachmentType === 'audio' ? (
                                <audio 
                                  src={msg.attachmentUrl} 
                                  controls 
                                  className="w-full max-w-[260px] h-9 text-xs outline-none" 
                                />
                              ) : null}
                            </div>
                          )}
                        </div>

                        {isCurrentUserMsg && (
                          <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                            {msg.senderName.charAt(0)}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div ref={messagesEndRef} />
                </div>

                {/* Live Message Input area */}
                {selectedTicket.status !== 'RESOLVED' ? (
                  <div className="border-t border-slate-200 bg-white flex flex-col shrink-0">
                    {/* Attachment Preview */}
                    {attachment && (
                      <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2 animate-in slide-in-from-bottom duration-200">
                        <div className="flex items-center gap-2 text-[10px] text-slate-600 font-bold max-w-[80%] truncate">
                          {attachment.type === 'image' ? (
                            <div className="w-8 h-8 rounded bg-slate-100 overflow-hidden flex items-center justify-center border border-slate-200 shrink-0">
                              <img src={attachment.url} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                              <Mic size={14} />
                            </div>
                          )}
                          <span className="truncate">{attachment.name}</span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setAttachment(null)}
                          className="p-1.5 hover:bg-slate-200 text-rose-500 rounded-full transition-all"
                          title="Remover anexo"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}

                    {/* Input Area or Recording State */}
                    {isRecording ? (
                      <div className="p-4 bg-red-50/50 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping shrink-0" />
                          <span className="text-xs font-black text-rose-700">Gravando: {recordingTime}s</span>
                        </div>
                        <div className="flex gap-1.5">
                          <button 
                            type="button"
                            onClick={cancelRecording}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                          >
                            Cancelar
                          </button>
                          <button 
                            type="button"
                            onClick={stopRecording}
                            className="bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 transition-all"
                          >
                            <Square size={12} /> Parar e Anexar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleSendMessage} className="p-4 flex items-center gap-2">
                        <input 
                          type="file" 
                          id="agent-image-attach" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleImageSelect} 
                        />
                        <input 
                          type="file" 
                          id="agent-audio-attach" 
                          accept="audio/*" 
                          className="hidden" 
                          onChange={handleAudioSelect} 
                        />

                        {/* Attachment triggers */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => document.getElementById('agent-image-attach')?.click()}
                            className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                            title="Enviar foto"
                          >
                            <Image size={18} />
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => document.getElementById('agent-audio-attach')?.click()}
                            className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                            title="Anexar arquivo de áudio"
                          >
                            <Paperclip size={18} />
                          </button>

                          <button
                            type="button"
                            onClick={startRecording}
                            className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all animate-pulse"
                            title="Gravar áudio"
                          >
                            <Mic size={18} />
                          </button>
                        </div>

                        <input
                          type="text"
                          value={newMessageText}
                          onChange={(e) => setNewMessageText(e.target.value)}
                          placeholder="Escreva sua resposta de suporte técnico..."
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="submit"
                          disabled={!newMessageText.trim() && !attachment}
                          className="bg-slate-900 text-white p-3.5 rounded-2xl hover:bg-slate-800 transition-all shadow-md disabled:opacity-50 shrink-0"
                        >
                          <Send size={16} />
                        </button>
                      </form>
                    )}
                  </div>
                ) : (
                  <div className="p-4 border-t border-slate-200 bg-emerald-50 text-emerald-800 text-xs font-bold text-center shrink-0">
                    Atendimento encerrado. Este histórico está congelado para auditoria de helpdesk.
                  </div>
                )}
              </div>

              {/* Backdrop for details drawer on mobile */}
              {showDetailsMobile && (
                <div 
                  className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden animate-in fade-in duration-200"
                  onClick={() => setShowDetailsMobile(false)}
                />
              )}

              {/* Sidebar with Patient & Context Detail logs */}
              <div className={`${
                showDetailsMobile 
                  ? 'fixed inset-y-0 right-0 z-50 w-80 bg-white shadow-2xl border-l border-slate-200 flex flex-col p-6 space-y-6 overflow-y-auto shrink-0 animate-in slide-in-from-right duration-300' 
                  : 'hidden lg:flex lg:w-80 lg:border-l lg:border-slate-200 lg:bg-white lg:p-6 lg:flex-col lg:space-y-6 lg:overflow-y-auto lg:shrink-0 lg:no-scrollbar'
              }`}>
                {/* Mobile Details Close Header */}
                <div className="flex lg:hidden justify-between items-center border-b border-slate-100 pb-3 shrink-0">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Detalhes do Chamado</h4>
                  <button 
                    onClick={() => setShowDetailsMobile(false)}
                    className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">Informações do Cliente</h4>
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <User className="text-slate-400 shrink-0" size={16} />
                      <div>
                        <p className="text-xs font-bold text-slate-800">{selectedTicket.userName}</p>
                        <p className="text-[10px] text-slate-400">Nome do Solicitante</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Mail className="text-slate-400 shrink-0" size={16} />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{selectedTicket.userEmail}</p>
                        <p className="text-[10px] text-slate-400">E-mail Cadastrado</p>
                      </div>
                    </div>

                    {selectedTicket.userPhone && (
                      <div className="flex gap-3">
                        <Phone className="text-slate-400 shrink-0" size={16} />
                        <div>
                          <p className="text-xs font-bold text-slate-800">{selectedTicket.userPhone}</p>
                          <p className="text-[10px] text-slate-400">Telefone para Contato</p>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Building className="text-slate-400 shrink-0" size={16} />
                      <div>
                        <p className="text-xs font-bold text-slate-800">{selectedTicket.organizationName || 'Não Informado'}</p>
                        <p className="text-[10px] text-slate-400">Organização</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Shield className="text-slate-400 shrink-0" size={16} />
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          {selectedTicket.userRole === 'CLIENT' ? 'Clínica / Dentista' : 'Laboratório'}
                        </p>
                        <p className="text-[10px] text-slate-400">Perfil do Usuário</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">Detalhamento do Registro</h4>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Criação do Chamado</p>
                      <p className="text-xs font-bold text-slate-700">
                        {selectedTicket.createdAt ? selectedTicket.createdAt.toLocaleString() : ''}
                      </p>
                    </div>

                    {selectedTicket.closedAt && (
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Encerramento</p>
                        <p className="text-xs font-bold text-slate-700">
                          {selectedTicket.closedAt.toLocaleString()}
                        </p>
                      </div>
                    )}

                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Agente Responsável</p>
                      <p className="text-xs font-bold text-slate-700">
                        {selectedTicket.assignedAgentName || 'Aguardando Atendimento'}
                      </p>
                    </div>

                    {selectedTicket.resolutionNote && (
                      <div>
                        <p className="text-[9px] font-bold text-emerald-600 uppercase">Nota de Resolução</p>
                        <p className="text-xs font-medium text-slate-600 italic bg-white p-2.5 rounded-lg border border-slate-200 mt-1">
                          "{selectedTicket.resolutionNote}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {selectedTicket.status === 'RESOLVED' && (
                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">Avaliação do Cliente</h4>
                    {selectedTicket.rating !== undefined ? (
                      <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 space-y-2">
                        <div className="flex gap-1 justify-center">
                          {[1, 2, 3, 4, 5].map((starVal) => {
                            const isLit = (selectedTicket.rating || 0) >= starVal;
                            return (
                              <Star
                                key={starVal}
                                size={16}
                                className={isLit ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
                              />
                            );
                          })}
                        </div>
                        <p className="text-xs font-black text-slate-800 text-center">{selectedTicket.rating} / 5 Estrelas</p>
                        {selectedTicket.ratingComment ? (
                          <p className="text-xs font-medium text-slate-600 italic bg-white p-2.5 rounded-xl border border-slate-200">
                            "{selectedTicket.ratingComment}"
                          </p>
                        ) : (
                          <p className="text-[10px] text-slate-400 italic text-center">O cliente não deixou comentários.</p>
                        )}
                      </div>
                    ) : (
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                        <p className="text-[10px] text-slate-400 italic">Este chamado ainda não foi avaliado pelo cliente.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-4">
                <MessageSquare size={32} className="animate-bounce" />
              </div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Central de Atendimento Técnico</h3>
              <p className="text-slate-400 text-xs font-medium max-w-sm mt-1 leading-relaxed">
                Selecione um chamado da fila na lateral esquerda para visualizar o histórico de triagem, claims de suporte e mensagens de chat.
              </p>
            </div>
          )}

        </div>
      </div>

      {/* Resolution Confirmation Dialog */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">Encerrar Chamado Técnico</h3>
            <p className="text-slate-500 text-xs mb-4">
              Ao encerrar este chamado, o cliente será notificado. Insira uma descrição da resolução abaixo para controle e auditoria do Helpdesk.
            </p>

            <textarea
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="Ex: O problema no faturamento foi resolvido. A fatura foi estornada com sucesso..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] mb-4"
            />

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowResolveModal(false); setResolutionNote(''); }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleResolveTicket}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase rounded-xl transition-all shadow-md shadow-emerald-100"
              >
                Confirmar Resolução
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
