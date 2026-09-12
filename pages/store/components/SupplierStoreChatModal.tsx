import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../../context/AppContext';
import { 
  SupplierConversation, 
  SupplierChatMessage, 
  Organization, 
  InventoryItem, 
  SupplierOrder 
} from '../../../types';
import { 
  subscribeSupplierConversations, 
  subscribeSupplierChatMessages, 
  apiSendSupplierChatMessage, 
  apiMarkSupplierConversationAsRead,
  apiGetOrCreateSupplierConversation 
} from '../../../services/firebaseService';
import { 
  MessageSquare, Send, X, Building2, User, Clock, 
  ShieldCheck, Package, ShoppingBag, Search, ChevronRight, 
  Check, CheckCheck, Paperclip, Sparkles, AlertCircle, Phone, Mail
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SupplierStoreChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Optional preselected targets:
  initialSupplierId?: string;
  initialSupplierName?: string;
  initialOrderId?: string;
  initialProduct?: InventoryItem;
}

export const SupplierStoreChatModal: React.FC<SupplierStoreChatModalProps> = ({
  isOpen,
  onClose,
  initialSupplierId,
  initialSupplierName,
  initialOrderId,
  initialProduct
}) => {
  const { currentOrg, currentUser, allSuppliers } = useApp();

  const isSupplierOrg = currentOrg?.orgType === 'SUPPLIER';

  const [conversations, setConversations] = useState<SupplierConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupplierChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [mobileView, setMobileView] = useState<'LIST' | 'CHAT'>('LIST');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Subscribe to all conversations for currentOrg
  useEffect(() => {
    if (!currentOrg?.id || !isOpen) return;

    const unsub = subscribeSupplierConversations(
      currentOrg.id,
      isSupplierOrg,
      (loadedConvs) => {
        setConversations(loadedConvs);
      }
    );

    return () => unsub();
  }, [currentOrg?.id, isSupplierOrg, isOpen]);

  // Handle initialization of targeted conversation (from order or product page)
  useEffect(() => {
    if (!isOpen || !currentOrg?.id || !initialSupplierId) return;

    const initTargetConversation = async () => {
      try {
        const supplierObj = allSuppliers.find((s) => s.id === initialSupplierId);
        const supplierName = supplierObj?.name || initialSupplierName || 'Fornecedor';

        const convId = await apiGetOrCreateSupplierConversation({
          buyerOrgId: isSupplierOrg ? 'client' : currentOrg.id,
          buyerOrgName: isSupplierOrg ? 'Cliente' : currentOrg.name || 'Cliente',
          buyerUserId: currentUser?.id || '',
          buyerUserName: currentUser?.name || 'Usuário',
          buyerUserEmail: currentUser?.email || '',
          buyerRole: currentOrg.orgType || 'LAB',
          supplierOrgId: initialSupplierId,
          supplierOrgName: supplierName,
          orderId: initialOrderId,
          productId: initialProduct?.id,
          productName: initialProduct?.name,
          productImageUrl: initialProduct?.imageUrl
        });

        setActiveConversationId(convId);
        setMobileView('CHAT');
      } catch (err) {
        console.error('Erro ao inicializar conversa com fornecedor:', err);
      }
    };

    initTargetConversation();
  }, [
    isOpen, 
    initialSupplierId, 
    initialSupplierName, 
    initialOrderId, 
    initialProduct, 
    currentOrg?.id, 
    currentUser?.id, 
    allSuppliers, 
    isSupplierOrg
  ]);

  // Auto-select first conversation if none selected on desktop
  useEffect(() => {
    if (!activeConversationId && conversations.length > 0 && !initialSupplierId) {
      setActiveConversationId(conversations[0].id);
    }
  }, [conversations, activeConversationId, initialSupplierId]);

  // Subscribe to messages of active conversation
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    // Mark as read
    apiMarkSupplierConversationAsRead(activeConversationId, isSupplierOrg);

    const unsub = subscribeSupplierChatMessages(activeConversationId, (loadedMsgs) => {
      setMessages(loadedMsgs);
    });

    return () => unsub();
  }, [activeConversationId, isSupplierOrg]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const activeConv = conversations.find((c) => c.id === activeConversationId);

  // Filter conversations
  const filteredConversations = conversations.filter((conv) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const targetName = isSupplierOrg ? conv.buyerOrgName : conv.supplierOrgName;
    const prodName = conv.productName || '';
    const orderId = conv.orderId || '';
    return (
      targetName.toLowerCase().includes(query) ||
      prodName.toLowerCase().includes(query) ||
      orderId.toLowerCase().includes(query)
    );
  });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!messageText.trim() && !imageUrlInput.trim()) || !activeConversationId || !currentOrg || !currentUser) {
      return;
    }

    setSending(true);
    try {
      const newMsg: Omit<SupplierChatMessage, 'id'> = {
        conversationId: activeConversationId,
        senderId: currentUser.id,
        senderName: currentUser.name || currentOrg.name || 'Usuário',
        senderRole: isSupplierOrg ? 'SUPPLIER' : 'BUYER',
        senderOrgId: currentOrg.id,
        senderOrgName: currentOrg.name || '',
        text: messageText.trim(),
        imageUrl: imageUrlInput.trim() ? imageUrlInput.trim() : undefined,
        createdAt: new Date(),
        read: false
      };

      await apiSendSupplierChatMessage(activeConversationId, newMsg);
      setMessageText('');
      setImageUrlInput('');
      setShowImageInput(false);
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
    } finally {
      setSending(false);
    }
  };

  // Find supplier info to show SLA & Policies
  const targetSupplierId = activeConv ? (isSupplierOrg ? activeConv.buyerOrgId : activeConv.supplierOrgId) : null;
  const targetSupplierOrg = allSuppliers.find((s) => s.id === targetSupplierId);
  const supportPolicy = targetSupplierOrg?.storeSettings?.policies?.customerServicePolicy;

  return (
    <div 
      className="fixed inset-0 z-[160] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-5xl h-[92vh] max-h-[850px] bg-white rounded-3xl border border-zinc-200 shadow-2xl overflow-hidden flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Sidebar: Conversations List */}
        <div className={`w-full md:w-80 lg:w-96 border-r border-zinc-200 flex flex-col bg-zinc-50/70 h-full ${
          mobileView === 'CHAT' ? 'hidden md:flex' : 'flex'
        }`}>
          {/* Header */}
          <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-white">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-zinc-950 text-white flex items-center justify-center shrink-0">
                <MessageSquare size={18} />
              </div>
              <div className="truncate">
                <h3 className="font-black text-sm text-zinc-950 truncate">
                  {isSupplierOrg ? 'Mensagens de Clientes' : 'Chat com Fornecedores'}
                </h3>
                <p className="text-[11px] text-zinc-500 font-medium truncate">
                  {isSupplierOrg ? 'Atendimento a Labs & Clínicas' : 'Dúvidas, Pedidos & Pós-Venda'}
                </p>
              </div>
            </div>

            {/* Exit/Close button on left side header */}
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-red-50 text-zinc-600 hover:text-red-600 border border-zinc-200 hover:border-red-200 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs"
              title="Sair do Chat"
            >
              <X size={16} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="p-3 border-b border-zinc-200/60 bg-white/50">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar conversa ou fornecedor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-900"
              />
            </div>
          </div>

          {/* Conversations Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto">
                  <MessageSquare size={20} />
                </div>
                <p className="text-xs font-bold text-zinc-800">Nenhuma conversa ativa</p>
                <p className="text-[11px] text-zinc-500">
                  {isSupplierOrg
                    ? 'As dúvidas e contatos de clientes aparecerão aqui assim que iniciados na loja.'
                    : 'Inicie uma conversa clicando em "Falar com Fornecedor" nos produtos ou em seus pedidos.'}
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = conv.id === activeConversationId;
                const unreadCount = isSupplierOrg ? (conv.unreadCountSupplier || 0) : (conv.unreadCountBuyer || 0);
                const otherPartyName = isSupplierOrg ? conv.buyerOrgName : conv.supplierOrgName;

                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => {
                      setActiveConversationId(conv.id);
                      setMobileView('CHAT');
                    }}
                    className={`w-full text-left p-3.5 transition-all flex items-start gap-3 hover:bg-white cursor-pointer ${
                      isActive ? 'bg-white border-l-4 border-l-zinc-950 shadow-xs' : ''
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-zinc-200/80 text-zinc-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {isSupplierOrg ? <User size={18} /> : <Building2 size={18} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-extrabold text-xs text-zinc-950 truncate">
                          {otherPartyName}
                        </span>
                        {conv.lastMessageTimestamp && (
                          <span className="text-[10px] text-zinc-400 shrink-0 font-mono">
                            {format(new Date(conv.lastMessageTimestamp), 'HH:mm')}
                          </span>
                        )}
                      </div>

                      {/* Product or Order Tag */}
                      {conv.orderId && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 mt-0.5">
                          <Package size={10} />
                          <span>Pedido #{conv.orderId.substring(0, 8).toUpperCase()}</span>
                        </div>
                      )}
                      {conv.productName && !conv.orderId && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 mt-0.5 truncate">
                          <ShoppingBag size={10} />
                          <span className="truncate">{conv.productName}</span>
                        </div>
                      )}

                      {/* Last Message Snippet */}
                      <p className="text-[11px] text-zinc-500 truncate mt-1">
                        {conv.lastMessageText || 'Conversa iniciada'}
                      </p>
                    </div>

                    {unreadCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Area: Active Chat Conversation */}
        <div className={`flex-1 flex-col h-full bg-white ${
          mobileView === 'LIST' ? 'hidden md:flex' : 'flex'
        }`}>
          {activeConv ? (
            <>
              {/* Active Header */}
              <div className="px-4 sm:px-6 py-3.5 border-b border-zinc-200 bg-zinc-50/70 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button to list */}
                  <button
                    type="button"
                    onClick={() => setMobileView('LIST')}
                    className="md:hidden p-2 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/70 rounded-xl transition-all"
                    title="Voltar para conversas"
                  >
                    <ChevronRight size={18} className="rotate-180" />
                  </button>

                  <div className="w-10 h-10 rounded-2xl bg-zinc-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {isSupplierOrg ? (
                      <User size={20} />
                    ) : (
                      <Building2 size={20} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-sm text-zinc-950 truncate">
                        {isSupplierOrg ? activeConv.buyerOrgName : activeConv.supplierOrgName}
                      </h4>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-bold flex items-center gap-1 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Online
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 font-medium truncate">
                      {isSupplierOrg ? (
                        <>Contato: {activeConv.buyerUserName} • {activeConv.buyerRole === 'CLINIC' ? 'Clínica / Dentista' : 'Laboratório'}</>
                      ) : (
                        <>Loja Oficial • SLA de resposta: {supportPolicy?.maxResponseTimeHours ? `${supportPolicy.maxResponseTimeHours}h úteis` : '24h úteis'}</>
                      )}
                    </p>
                  </div>
                </div>

                {/* Prominent Sair do Chat Button */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 border border-red-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                    title="Sair do Chat"
                  >
                    <X size={16} />
                    <span>Sair do Chat</span>
                  </button>
                </div>
              </div>

              {/* Context Banner: Order or Product Preview */}
              {(activeConv.orderId || activeConv.productName) && (
                <div className="px-4 sm:px-6 py-2.5 bg-zinc-100/80 border-b border-zinc-200/70 flex items-center justify-between text-xs text-zinc-700">
                  <div className="flex items-center gap-2 truncate">
                    {activeConv.orderId ? (
                      <>
                        <Package size={14} className="text-zinc-600 shrink-0" />
                        <span className="truncate">Conversando sobre o <strong>Pedido #{activeConv.orderId.substring(0, 8).toUpperCase()}</strong></span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag size={14} className="text-zinc-600 shrink-0" />
                        <span className="truncate">Produto de Referência: <strong>{activeConv.productName}</strong></span>
                      </>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-zinc-500 bg-white px-2 py-0.5 rounded-md border border-zinc-200 shrink-0 ml-2">
                    Contexto Anexado
                  </span>
                </div>
              )}

              {/* Messages Thread Container */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-zinc-50/30">
                {/* Security and Compliance Pill */}
                <div className="text-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-100 text-zinc-600 rounded-full text-[11px] font-medium border border-zinc-200/80">
                    <ShieldCheck size={13} className="text-emerald-600" />
                    Atendimento protegido pelas Diretrizes Oficiais do Marketplace LabProx
                  </span>
                </div>

                {messages.length === 0 ? (
                  <div className="text-center py-12 space-y-2">
                    <p className="text-xs font-bold text-zinc-600">Nenhuma mensagem ainda.</p>
                    <p className="text-[11px] text-zinc-400 max-w-sm mx-auto">
                      Envie uma mensagem abaixo para tirar dúvidas técnicas sobre materiais, solicitar orçamento especial ou acompanhar pedidos.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMyMessage = msg.senderId === currentUser?.id || msg.senderOrgId === currentOrg?.id;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMyMessage ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                          <span className="text-[10px] font-bold text-zinc-500">
                            {msg.senderName}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {format(new Date(msg.createdAt), 'HH:mm')}
                          </span>
                        </div>

                        <div
                          className={`max-w-[85%] sm:max-w-md rounded-2xl p-3.5 text-xs leading-relaxed space-y-2 shadow-xs ${
                            isMyMessage
                              ? 'bg-zinc-950 text-white rounded-tr-xs'
                              : 'bg-white border border-zinc-200 text-zinc-900 rounded-tl-xs'
                          }`}
                        >
                          {msg.imageUrl && (
                            <img
                              src={msg.imageUrl}
                              alt="Anexo"
                              className="w-full max-h-48 object-cover rounded-xl border border-white/20"
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

              {/* Message Input Box */}
              <div className="p-3 sm:p-4 border-t border-zinc-200 bg-white">
                {showImageInput && (
                  <div className="mb-3 p-2 bg-zinc-50 rounded-xl border border-zinc-200 flex gap-2 animate-in fade-in">
                    <input
                      type="url"
                      placeholder="Cole a URL da imagem/anexo..."
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      className="flex-1 bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-zinc-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowImageInput(false)}
                      className="px-2 text-zinc-400 hover:text-zinc-900 text-xs font-bold cursor-pointer"
                    >
                      Fechar
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowImageInput(!showImageInput)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                      showImageInput
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100 border-zinc-200'
                    }`}
                    title="Anexar Imagem"
                  >
                    <Paperclip size={16} />
                  </button>

                  <input
                    type="text"
                    placeholder="Digite sua mensagem para o fornecedor..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="flex-1 bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-xs text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-900 focus:bg-white transition-all font-medium"
                  />

                  <button
                    type="submit"
                    disabled={sending || (!messageText.trim() && !imageUrlInput.trim())}
                    className="p-3 bg-zinc-950 hover:bg-zinc-800 disabled:opacity-40 text-white rounded-2xl transition-all shadow-xs shrink-0 flex items-center justify-center cursor-pointer"
                  >
                    <Send size={16} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-zinc-50/50">
              <div className="absolute top-4 right-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 border border-red-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                  title="Sair do Chat"
                >
                  <X size={16} />
                  <span>Sair do Chat</span>
                </button>
              </div>
              <div className="w-16 h-16 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center">
                <MessageSquare size={28} />
              </div>
              <h4 className="font-bold text-zinc-900 text-sm">Selecione uma conversa ao lado</h4>
              <p className="text-xs text-zinc-500 max-w-sm">
                Acompanhe o histórico de mensagens, tire dúvidas com os fornecedores e resolva solicitações rapidamente.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Fechar e Sair do Chat
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

