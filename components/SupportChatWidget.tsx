import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { db } from '../services/firebaseConfig';
import { 
  collection, doc, query, where, orderBy, onSnapshot, 
  addDoc, updateDoc, getDocs, limit, serverTimestamp 
} from 'firebase/firestore';
import { 
  MessageSquare, X, Send, HelpCircle, 
  CheckCircle, AlertCircle, Clock, Shield, Headphones, Star,
  Image, Mic, Trash2, Paperclip, Square
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

  // Rating feedback state
  const [ratingStars, setRatingStars] = useState<number>(5);
  const [ratingComment, setRatingComment] = useState<string>('');
  const [isSubmittingRating, setIsSubmittingRating] = useState<boolean>(false);

  // Attachment & Audio Recording State
  const [attachment, setAttachment] = useState<{ url: string; type: 'image' | 'audio'; name: string } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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

    // Convert file to Base64 and compress it
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
        console.error("Erro ao comprimir imagem:", err);
        setAttachment({
          url: base64String,
          type: 'image',
          name: file.name
        });
      }
    };
    reader.readAsDataURL(file);
    // Reset file input value
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
    // Reset file input value
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

        // Stop all tracks to release microphone
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
      mediaRecorderRef.current.onstop = null; // Ignore onstop to avoid saving
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      audioChunksRef.current = [];
      setAttachment(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, triageStep]);

  // Check for active tickets for the current user
  useEffect(() => {
    if (!currentUser) return;

    // Load active (PENDING or ACTIVE or RESOLVED but unrated) tickets
    const q = query(
      collection(db, 'support_tickets'),
      where('userId', '==', currentUser.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const sortedDocs = snapshot.docs.sort((a, b) => {
          const timeA = a.data().createdAt?.toMillis?.() || 0;
          const timeB = b.data().createdAt?.toMillis?.() || 0;
          return timeB - timeA;
        });
        const docSnap = sortedDocs[0];
        const data = docSnap.data();
        
        const isUnratedResolved = data.status === 'RESOLVED' && data.rating === undefined;

        // Keep active if not resolved, or if resolved but not rated yet
        if (data.status !== 'RESOLVED' || isUnratedResolved) {
          setActiveTicket({
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
          } as SupportTicket);
          setTriageStep(2); // Skip triage, go directly to chat/feedback
        } else {
          setActiveTicket(null);
          // If we had an active ticket and it got resolved and rated, clear it
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
    if (!activeTicket || !currentUser) return;
    if (!newMessage.trim() && !attachment) return;

    const messageText = newMessage.trim();
    const currentAttachment = attachment;

    setNewMessage('');
    setAttachment(null);

    try {
      const msgData: any = {
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderRole: 'CLIENT',
        text: messageText,
        createdAt: new Date(),
      };

      if (currentAttachment) {
        msgData.attachmentUrl = currentAttachment.url;
        msgData.attachmentType = currentAttachment.type;
      }

      await addDoc(collection(db, `support_tickets/${activeTicket.id}/messages`), msgData);

      // Update ticket updatedAt
      await updateDoc(doc(db, 'support_tickets', activeTicket.id), {
        updatedAt: new Date()
      });
    } catch (err) {
      console.error("Error sending user message:", err);
    }
  };

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket) return;
    setIsSubmittingRating(true);
    try {
      await updateDoc(doc(db, 'support_tickets', activeTicket.id), {
        rating: ratingStars,
        ratingComment: ratingComment.trim(),
        updatedAt: new Date()
      });
      // Reset feedback states
      setRatingStars(5);
      setRatingComment('');
    } catch (err) {
      console.error("Error submitting rating:", err);
    } finally {
      setIsSubmittingRating(false);
    }
  };

  // Skip rendering widget for SUPER_ADMIN or HELPDESK role since they use full screens
  if (currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'HELPDESK') {
    return null;
  }

  return (
    <div className={`fixed z-50 ${isOpen ? 'inset-0 sm:inset-auto sm:bottom-6 sm:right-6 sm:flex sm:flex-col sm:items-end' : 'bottom-6 right-6 flex flex-col items-end'}`}>
      {/* Expanded Chat Drawer */}
      {isOpen && (
        <div className="w-full sm:w-96 h-[100dvh] sm:h-[500px] max-h-screen bg-white sm:rounded-3xl rounded-none sm:shadow-2xl shadow-none border sm:border-slate-100 border-none flex flex-col overflow-hidden sm:mb-4 mb-0 animate-in slide-in-from-bottom duration-300">
          
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
                {activeTicket?.status === 'RESOLVED' ? (
                  <form onSubmit={handleSubmitRating} className="flex-1 flex flex-col justify-center items-center text-center p-4 space-y-4 animate-in fade-in duration-300">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-2">
                      <CheckCircle size={28} />
                    </div>
                    <h4 className="font-black text-slate-800 text-sm uppercase tracking-tight">Atendimento Concluído!</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Como foi sua experiência com o suporte técnico de <strong className="text-slate-800">{activeTicket.assignedAgentName || 'nosso agente'}</strong>? Avalie abaixo:
                    </p>

                    {/* Star selection buttons */}
                    <div className="flex gap-1.5 justify-center py-2">
                      {[1, 2, 3, 4, 5].map((starValue) => {
                        const isSelected = ratingStars >= starValue;
                        return (
                          <button
                            key={starValue}
                            type="button"
                            onClick={() => setRatingStars(starValue)}
                            className="p-1 transition-transform hover:scale-125 focus:outline-none"
                          >
                            <Star
                              size={28}
                              className={`transition-colors ${
                                isSelected ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>

                    <div className="w-full text-left">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Comentário / Sugestão</label>
                      <textarea
                        value={ratingComment}
                        onChange={(e) => setRatingComment(e.target.value)}
                        placeholder="Opcional: Conte-nos o que achou do atendimento..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingRating}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSubmittingRating ? 'Enviando...' : 'Enviar Avaliação'}
                    </button>
                  </form>
                ) : (
                  <>
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
                    <div className="flex-1 overflow-y-auto pr-1 no-scrollbar flex flex-col gap-5 py-2">
                      {messages.map((msg) => {
                        const isBot = msg.senderRole === 'BOT';
                        const isCurrentUser = msg.senderId === currentUser?.id;

                        return (
                          <div
                            key={msg.id}
                            className={`flex items-start gap-2 shrink-0 ${isCurrentUser ? 'justify-end' : ''}`}
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
                              {msg.text && <p className={msg.attachmentUrl ? 'mb-2' : ''}>{msg.text}</p>}
                              {msg.attachmentUrl && (
                                <div className="mt-1">
                                  {msg.attachmentType === 'image' ? (
                                    <img 
                                      src={msg.attachmentUrl} 
                                      alt="Anexo" 
                                      className="rounded-lg max-w-full max-h-40 object-cover cursor-pointer hover:opacity-90 transition-all border border-slate-200/50" 
                                      onClick={() => window.open(msg.attachmentUrl, '_blank')}
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : msg.attachmentType === 'audio' ? (
                                    <audio 
                                      src={msg.attachmentUrl} 
                                      controls 
                                      className="w-full max-w-[220px] h-9 text-xs outline-none" 
                                    />
                                  ) : null}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  </>
                )}
              </div>
            )}

          </div>

          {/* Chat Footer/Input */}
          {triageStep === 2 && activeTicket?.status !== 'RESOLVED' && (
            <div className="border-t border-slate-200 bg-white flex flex-col shrink-0">
              {/* Attachment Preview */}
              {attachment && (
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2 animate-in slide-in-from-bottom duration-200">
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
                <div className="p-3 bg-red-50/50 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping shrink-0" />
                    <span className="text-xs font-black text-rose-700">Gravando: {recordingTime}s</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button 
                      type="button"
                      onClick={cancelRecording}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="button"
                      onClick={stopRecording}
                      className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all"
                    >
                      <Square size={10} /> Parar e Anexar
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="p-3 flex items-center gap-1.5">
                  <input 
                    type="file" 
                    id="image-attach-input" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageSelect} 
                  />
                  <input 
                    type="file" 
                    id="audio-attach-input" 
                    accept="audio/*" 
                    className="hidden" 
                    onChange={handleAudioSelect} 
                  />

                  {/* Attachment triggers */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => document.getElementById('image-attach-input')?.click()}
                      className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                      title="Enviar foto"
                    >
                      <Image size={15} />
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => document.getElementById('audio-attach-input')?.click()}
                      className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                      title="Anexar arquivo de áudio"
                    >
                      <Paperclip size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={startRecording}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all animate-pulse"
                      title="Gravar áudio"
                    >
                      <Mic size={15} />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Escreva sua mensagem..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() && !attachment}
                    className="bg-slate-950 text-white p-2.5 rounded-2xl hover:bg-slate-800 transition-all disabled:opacity-50 shrink-0"
                  >
                    <Send size={14} />
                  </button>
                </form>
              )}
            </div>
          )}

        </div>
      )}

      {/* Launcher Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${isOpen ? 'hidden sm:flex' : 'flex'} w-14 h-14 bg-slate-900 text-white rounded-full items-center justify-center shadow-2xl hover:bg-slate-800 transition-all duration-300 transform hover:scale-105 active:scale-95 border-2 border-slate-800 hover:border-blue-500 relative`}
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
