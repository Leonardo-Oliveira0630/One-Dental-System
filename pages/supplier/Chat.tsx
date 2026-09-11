import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { 
  SupplierConversation, 
  SupplierChatMessage, 
  SupplierOrder, 
  InventoryItem 
} from '../../types';
import { 
  subscribeSupplierConversations, 
  subscribeSupplierChatMessages, 
  apiSendSupplierChatMessage, 
  apiMarkSupplierConversationAsRead,
  apiGetOrCreateSupplierConversation,
  subscribeBuyerSupplierOrders
} from '../../services/firebaseService';
import { 
  MessageSquare, Send, Search, User, Building2, Package, 
  ShoppingBag, Check, CheckCheck, Paperclip, Sparkles, 
  Clock, ShieldCheck, Phone, Mail, ExternalLink, ChevronRight,
  Filter, AlertCircle, HelpCircle, ArrowLeft, RefreshCw, X
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const SupplierChat: React.FC = () => {
  const { currentOrg, currentUser, inventoryItems, allSuppliers } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<SupplierConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupplierChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'UNREAD' | 'ORDERS' | 'PRODUCTS'>('ALL');
  const [mobilePane, setMobilePane] = useState<'LIST' | 'CHAT'>('LIST');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to all conversations for this supplier organization
  useEffect(() => {
    if (!currentOrg?.id) return;
    const unsub = subscribeSupplierConversations(currentOrg.id, true, (loaded) => {
      setConversations(loaded);
    });
    return () => unsub();
  }, [currentOrg?.id]);

  // Handle URL parameters to open or create specific conversation (e.g. from Order details)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const orderIdParam = params.get('orderId');
    const buyerOrgIdParam = params.get('buyerOrgId');
    const buyerOrgNameParam = params.get('buyerOrgName');
    const buyerUserIdParam = params.get('buyerUserId');
    const buyerUserNameParam = params.get('buyerUserName');

    if (currentOrg?.id && buyerOrgIdParam) {
      const initConversation = async () => {
        try {
          const convId = await apiGetOrCreateSupplierConversation({
            buyerOrgId: buyerOrgIdParam,
            buyerOrgName: buyerOrgNameParam || 'Cliente',
            buyerUserId: buyerUserIdParam || 'user',
            buyerUserName: buyerUserNameParam || 'Cliente',
            supplierOrgId: currentOrg.id,
            supplierOrgName: currentOrg.name || 'Fornecedor',
            orderId: orderIdParam || undefined
          });
          setActiveConversationId(convId);
          setMobilePane('CHAT');
        } catch (err) {
          console.error('Erro ao abrir conversa direcionada:', err);
        }
      };
      initConversation();
    }
  }, [location.search, currentOrg?.id]);

  // Auto-select first conversation on desktop if none selected
  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      const params = new URLSearchParams(location.search);
      if (!params.get('buyerOrgId')) {
        setActiveConversationId(conversations[0].id);
      }
    }
  }, [conversations, activeConversationId, location.search]);

  // Subscribe to messages of selected active conversation
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    // Mark as read for the supplier
    apiMarkSupplierConversationAsRead(activeConversationId, true);

    const unsub = subscribeSupplierChatMessages(activeConversationId, (msgs) => {
      setMessages(msgs);
    });

    return () => unsub();
  }, [activeConversationId]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeConv = useMemo(() => {
    return conversations.find((c) => c.id === activeConversationId) || null;
  }, [conversations, activeConversationId]);

  // Quick canned reply templates
  const cannedReplies = [
    'Olá! Como posso ajudar você hoje?',
    'Seu pedido já está em separação e será despachado em breve.',
    'Produto disponível em estoque para pronta entrega!',
    'Código de rastreio atualizado com sucesso.',
    'Restou alguma dúvida técnica sobre este material?'
  ];

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      if (filterTab === 'UNREAD' && !(conv.unreadCountSupplier && conv.unreadCountSupplier > 0)) {
        return false;
      }
      if (filterTab === 'ORDERS' && !conv.orderId) {
        return false;
      }
      if (filterTab === 'PRODUCTS' && !conv.productName) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = conv.buyerOrgName?.toLowerCase().includes(q) || conv.buyerUserName?.toLowerCase().includes(q);
        const orderMatch = conv.orderId?.toLowerCase().includes(q);
        const prodMatch = conv.productName?.toLowerCase().includes(q);
        const textMatch = conv.lastMessageText?.toLowerCase().includes(q);
        if (!nameMatch && !orderMatch && !prodMatch && !textMatch) return false;
      }

      return true;
    });
  }, [conversations, filterTab, searchQuery]);

  const totalUnreadCount = useMemo(() => {
    return conversations.reduce((acc, c) => acc + (c.unreadCountSupplier || 0), 0);
  }, [conversations]);

  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = customText || messageText;

    if ((!textToSend.trim() && !imageUrlInput.trim()) || !activeConversationId || !currentOrg || !currentUser) {
      return;
    }

    setSending(true);
    try {
      const newMsg: Omit<SupplierChatMessage, 'id'> = {
        conversationId: activeConversationId,
        senderId: currentUser.id,
        senderName: currentUser.name || currentOrg.name || 'Fornecedor',
        senderRole: 'SUPPLIER',
        senderOrgId: currentOrg.id,
        senderOrgName: currentOrg.name || 'Fornecedor',
        text: textToSend.trim(),
        imageUrl: imageUrlInput.trim() || undefined,
        createdAt: new Date(),
        read: false
      };

      await apiSendSupplierChatMessage(activeConversationId, newMsg);
      if (!customText) {
        setMessageText('');
      }
      setImageUrlInput('');
      setShowImageInput(false);
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 mb-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
            <MessageSquare size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-900 tracking-tight">
                Central de Atendimento & Chat
              </h1>
              {totalUnreadCount > 0 && (
                <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-700 font-bold text-xs rounded-full animate-pulse">
                  {totalUnreadCount} {totalUnreadCount === 1 ? 'não lida' : 'não lidas'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Responda diretamente a dúvidas técnicas de laboratórios e dentistas, suporte a pedidos e pós-venda.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => navigate('/supplier/dashboard')}
            className="flex-1 sm:flex-initial px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all border border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Package size={14} />
            <span>Painel de Pedidos</span>
          </button>
        </div>
      </div>

      {/* Main Chat Workspace Grid */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs flex flex-col md:flex-row min-h-0">
        {/* LEFT COLUMN: Conversations List */}
        <div className={`w-full md:w-80 lg:w-96 border-r border-slate-200 flex flex-col bg-slate-50/50 h-full ${
          mobilePane === 'CHAT' ? 'hidden md:flex' : 'flex'
        }`}>
          {/* Search Box */}
          <div className="p-3 border-b border-slate-200 bg-white">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar cliente, pedido ou produto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-600 focus:bg-white transition-all font-medium"
              />
            </div>
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1 p-2 border-b border-slate-200 bg-white/70 overflow-x-auto text-[11px] font-bold">
            <button
              onClick={() => setFilterTab('ALL')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                filterTab === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Todas ({conversations.length})
            </button>
            <button
              onClick={() => setFilterTab('UNREAD')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                filterTab === 'UNREAD'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Não lidas {totalUnreadCount > 0 && `(${totalUnreadCount})`}
            </button>
            <button
              onClick={() => setFilterTab('ORDERS')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                filterTab === 'ORDERS'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Pedidos
            </button>
            <button
              onClick={() => setFilterTab('PRODUCTS')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                filterTab === 'PRODUCTS'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Dúvidas
            </button>
          </div>

          {/* Conversations Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <MessageSquare size={22} />
                </div>
                <p className="text-xs font-bold text-slate-800">Nenhuma conversa encontrada</p>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  {conversations.length === 0
                    ? 'Quando clientes iniciarem conversas na loja oficial, elas aparecerão aqui instantaneamente.'
                    : 'Nenhum resultado para os filtros e busca aplicados.'}
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = conv.id === activeConversationId;
                const unread = conv.unreadCountSupplier || 0;

                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => {
                      setActiveConversationId(conv.id);
                      setMobilePane('CHAT');
                    }}
                    className={`w-full text-left p-3.5 transition-all flex items-start gap-3 hover:bg-white cursor-pointer ${
                      isActive ? 'bg-white border-l-4 border-l-indigo-600 shadow-xs' : ''
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      <User size={18} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-extrabold text-xs text-slate-900 truncate">
                          {conv.buyerOrgName || conv.buyerUserName || 'Cliente'}
                        </span>
                        {conv.lastMessageTimestamp && (
                          <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                            {format(new Date(conv.lastMessageTimestamp), 'HH:mm')}
                          </span>
                        )}
                      </div>

                      {/* Contact subtitle */}
                      <p className="text-[10px] text-slate-500 truncate">
                        {conv.buyerUserName} • {conv.buyerRole === 'CLINIC' ? 'Clínica' : 'Laboratório'}
                      </p>

                      {/* Attached Context Badge */}
                      {conv.orderId && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-md mt-1 w-fit">
                          <Package size={10} />
                          <span>Pedido #{conv.orderId.substring(0, 8).toUpperCase()}</span>
                        </div>
                      )}
                      {conv.productName && !conv.orderId && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md mt-1 truncate max-w-[200px]">
                          <ShoppingBag size={10} />
                          <span className="truncate">{conv.productName}</span>
                        </div>
                      )}

                      {/* Last message text */}
                      <p className="text-[11px] text-slate-500 truncate mt-1">
                        {conv.lastMessageText || 'Nova conversa iniciada'}
                      </p>
                    </div>

                    {unread > 0 && (
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center shrink-0 shadow-xs">
                        {unread}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Chat Thread */}
        <div className={`flex-1 flex-col h-full bg-white ${
          mobilePane === 'LIST' ? 'hidden md:flex' : 'flex'
        }`}>
          {activeConv ? (
            <>
              {/* Active Conversation Header */}
              <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    type="button"
                    onClick={() => setMobilePane('LIST')}
                    className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-xl transition-all"
                  >
                    <ArrowLeft size={18} />
                  </button>

                  <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    <User size={20} />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-sm text-slate-900 truncate">
                        {activeConv.buyerOrgName || activeConv.buyerUserName}
                      </h3>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-bold flex items-center gap-1 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Cliente Conectado
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      Contato: <strong>{activeConv.buyerUserName}</strong> ({activeConv.buyerUserEmail || 'Email não informado'}) • {activeConv.buyerRole === 'CLINIC' ? 'Clínica Odontológica' : 'Laboratório de Prótese'}
                    </p>
                  </div>
                </div>

                {/* Quick actions for active conversation */}
                {activeConv.orderId && (
                  <div className="shrink-0">
                    <button
                      onClick={() => navigate(`/supplier/dashboard?orderId=${activeConv.orderId}`)}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Package size={13} />
                      <span className="hidden sm:inline">Ver Pedido</span>
                      <span>#{activeConv.orderId.substring(0, 6).toUpperCase()}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Context bar if order or product attached */}
              {(activeConv.orderId || activeConv.productName) && (
                <div className="px-4 sm:px-6 py-2.5 bg-indigo-50/50 border-b border-indigo-100 flex items-center justify-between text-xs text-indigo-950">
                  <div className="flex items-center gap-2 truncate">
                    {activeConv.orderId ? (
                      <>
                        <Package size={15} className="text-indigo-600 shrink-0" />
                        <span className="truncate">
                          Atendimento vinculado ao <strong>Pedido #{activeConv.orderId.substring(0, 8).toUpperCase()}</strong>
                        </span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag size={15} className="text-indigo-600 shrink-0" />
                        <span className="truncate">
                          Dúvida sobre o produto: <strong>{activeConv.productName}</strong>
                        </span>
                      </>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200 shrink-0 ml-2">
                    Origem Loja Online
                  </span>
                </div>
              )}

              {/* Messages Thread Container */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/40">
                {/* Security Tag */}
                <div className="text-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-slate-500 rounded-full text-[11px] font-medium border border-slate-200 shadow-2xs">
                    <ShieldCheck size={13} className="text-emerald-600" />
                    Canal oficial de atendimento direto Fornecedor - Cliente LabProx
                  </span>
                </div>

                {messages.length === 0 ? (
                  <div className="text-center py-12 space-y-2">
                    <p className="text-xs font-bold text-slate-700">Nenhuma mensagem nesta conversa.</p>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      Envie uma mensagem abaixo ou use uma resposta rápida para iniciar o atendimento.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMyMessage = msg.senderRole === 'SUPPLIER' || msg.senderOrgId === currentOrg?.id;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMyMessage ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                          <span className="text-[10px] font-bold text-slate-500">
                            {msg.senderName} {isMyMessage && '(Você)'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {format(new Date(msg.createdAt), 'HH:mm')}
                          </span>
                        </div>

                        <div
                          className={`max-w-[85%] sm:max-w-md rounded-2xl p-3.5 text-xs leading-relaxed space-y-2 shadow-xs ${
                            isMyMessage
                              ? 'bg-indigo-600 text-white rounded-tr-xs'
                              : 'bg-white border border-slate-200 text-slate-900 rounded-tl-xs'
                          }`}
                        >
                          {msg.imageUrl && (
                            <img
                              src={msg.imageUrl}
                              alt="Anexo de Imagem"
                              className="w-full max-h-52 object-cover rounded-xl border border-white/20"
                            />
                          )}
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Canned Replies Bar */}
              <div className="px-4 py-2 border-t border-slate-100 bg-white flex items-center gap-1.5 overflow-x-auto">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                  <Sparkles size={11} className="text-indigo-500" />
                  Respostas Rápidas:
                </span>
                {cannedReplies.map((reply, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSendMessage(undefined, reply)}
                    className="px-2.5 py-1 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 rounded-lg text-[11px] whitespace-nowrap transition-all shrink-0 cursor-pointer font-medium"
                  >
                    {reply}
                  </button>
                ))}
              </div>

              {/* Message Input Box */}
              <div className="p-3 sm:p-4 border-t border-slate-200 bg-white">
                {showImageInput && (
                  <div className="mb-3 p-2 bg-slate-50 rounded-xl border border-slate-200 flex gap-2 animate-in fade-in">
                    <input
                      type="url"
                      placeholder="Cole o link/URL da imagem ou comprovante..."
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-indigo-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowImageInput(false)}
                      className="px-2 text-slate-400 hover:text-slate-900 text-xs font-bold cursor-pointer"
                    >
                      ✕ Fechar
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowImageInput(!showImageInput)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                      showImageInput
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                    }`}
                    title="Anexar Imagem"
                  >
                    <Paperclip size={16} />
                  </button>

                  <input
                    type="text"
                    placeholder="Digite sua resposta para o cliente... (Pressione Enter para enviar)"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-600 focus:bg-white transition-all font-medium"
                  />

                  <button
                    type="submit"
                    disabled={sending || (!messageText.trim() && !imageUrlInput.trim())}
                    className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-2xl transition-all shadow-xs shrink-0 flex items-center justify-center cursor-pointer"
                    title="Enviar Mensagem"
                  >
                    <Send size={16} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 bg-slate-50/50">
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                <MessageSquare size={28} />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Selecione uma conversa para atender</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Escolha uma conversa na lista ao lado para visualizar o histórico de mensagens, detalhes do pedido e responder ao cliente.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
