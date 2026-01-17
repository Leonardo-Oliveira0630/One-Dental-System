import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ChatMessage, Job, UserRole, Attachment } from '../types';
import * as api from '../services/firebaseService';
import { 
  Send, Paperclip, X, Loader2, Edit3, Trash2, 
  Search, File, Image as ImageIcon, Video, 
  Box, Maximize2, MoreVertical, Check, CheckCheck,
  ChevronDown, SearchIcon, Layers
} from 'lucide-react';

interface ChatSystemProps {
  job: Job;
  orgId: string;
}

export const ChatSystem: React.FC<ChatSystemProps> = ({ job, orgId }) => {
  const { currentUser, uploadFile } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [editingMsg, setEditingMsg] = useState<ChatMessage | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showMediaOnly, setShowMediaOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = api.subscribeChatMessages(orgId, job.id, (msgs) => {
        setMessages(msgs);
        setLoading(false);
    });
    return () => unsub();
  }, [orgId, job.id]);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const filteredMessages = useMemo(() => {
    let result = messages;
    if (searchTerm) {
        result = result.filter(m => m.text?.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (showMediaOnly) {
        result = result.filter(m => m.attachments && m.attachments.length > 0);
    }
    return result;
  }, [messages, searchTerm, showMediaOnly]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || (!inputText.trim() && selectedFiles.length === 0)) return;

    setIsUploading(true);
    const attachments: Attachment[] = [];

    try {
        for (const file of selectedFiles) {
            const url = await uploadFile(file);
            attachments.push({
                id: Math.random().toString(),
                name: file.name,
                url: url,
                uploadedAt: new Date()
            });
        }

        if (editingMsg) {
            await api.apiUpdateChatMessage(orgId, job.id, editingMsg.id, { 
                text: inputText, 
                attachments: [...(editingMsg.attachments || []), ...attachments] 
            });
            setEditingMsg(null);
        } else {
            const newMsg: Omit<ChatMessage, 'id'> = {
                senderId: currentUser.id,
                senderName: currentUser.name,
                senderRole: currentUser.role,
                text: inputText,
                attachments: attachments,
                createdAt: new Date()
            };
            await api.apiSendChatMessage(orgId, job.id, newMsg);
        }

        setInputText('');
        setSelectedFiles([]);
    } catch (error) {
        alert("Erro ao enviar mensagem.");
    } finally {
        setIsUploading(false);
    }
  };

  const handleEdit = (msg: ChatMessage) => {
    if (msg.senderId !== currentUser?.id) return;
    setEditingMsg(msg);
    setInputText(msg.text || '');
  };

  const handleDelete = async (msgId: string) => {
    if (!window.confirm("Apagar esta mensagem permanentemente?")) return;
    await api.apiDeleteChatMessage(orgId, job.id, msgId);
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext!)) return <ImageIcon size={20} className="text-blue-500" />;
    if (['mp4', 'mov', 'webm'].includes(ext!)) return <Video size={20} className="text-purple-500" />;
    if (ext === 'stl') return <Box size={20} className="text-orange-500" />;
    return <File size={20} className="text-slate-500" />;
  };

  return (
    <div className="flex flex-col h-[600px] bg-slate-50 rounded-2xl overflow-hidden border border-slate-200 shadow-xl animate-in fade-in duration-300">
      {/* HEADER DO CHAT */}
      <div className="bg-white p-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                <Send size={20} />
            </div>
            <div>
                <h3 className="font-bold text-slate-800 leading-none">Chat do Trabalho</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase mt-1">OS #{job.osNumber} • Paciente: {job.patientName}</p>
            </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-2 text-slate-400" size={16} />
                <input 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Pesquisar..."
                    className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
            <button 
                onClick={() => setShowMediaOnly(!showMediaOnly)}
                className={`p-2 rounded-lg border transition-all ${showMediaOnly ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200'}`}
                title="Ver Mídias"
            >
                <ImageIcon size={18} />
            </button>
        </div>
      </div>

      {/* ÁREA DE MENSAGENS */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed"
      >
        {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Loader2 className="animate-spin mb-2" />
                <p className="text-xs font-bold uppercase">Carregando Conversa...</p>
            </div>
        ) : filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <div className="p-4 bg-white rounded-full mb-4 shadow-sm">
                    <Send size={32} className="opacity-20" />
                </div>
                <p className="text-sm font-medium">Nenhuma mensagem encontrada.</p>
            </div>
        ) : (
            filteredMessages.map((msg) => {
                const isMe = msg.senderId === currentUser?.id;
                const isLab = msg.senderRole !== UserRole.CLIENT;
                
                return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2`}>
                        <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-3 shadow-sm relative group ${
                            msg.deleted ? 'bg-slate-100 border border-slate-200 italic text-slate-400' :
                            isMe ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-800'
                        }`}>
                            {!msg.deleted && (
                                <div className="flex justify-between items-center gap-4 mb-1">
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
                                        {msg.senderName} {isLab ? '(Lab)' : '(Clínica)'}
                                    </span>
                                    {isMe && (
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleEdit(msg)} className="p-1 hover:bg-blue-700 rounded"><Edit3 size={10}/></button>
                                            <button onClick={() => handleDelete(msg.id)} className="p-1 hover:bg-red-500 rounded"><Trash2 size={10}/></button>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="text-sm whitespace-pre-wrap leading-relaxed">
                                {msg.text}
                            </div>

                            {msg.attachments && msg.attachments.length > 0 && !msg.deleted && (
                                <div className="mt-3 space-y-2">
                                    {msg.attachments.map(att => (
                                        <a key={att.id} href={att.url} target="_blank" rel="noreferrer" className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${isMe ? 'bg-white/10 border-white/20 hover:bg-white/20' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                                            {getFileIcon(att.name)}
                                            <span className="text-[10px] font-bold truncate max-w-[150px]">{att.name}</span>
                                        </a>
                                    ))}
                                </div>
                            )}

                            <div className={`text-[8px] mt-1 flex items-center justify-end gap-1 ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
                                {msg.updatedAt && <span>(editada) •</span>}
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {isMe && <CheckCheck size={10} />}
                            </div>
                        </div>
                    </div>
                );
            })
        )}
      </div>

      {/* INPUT E ANEXOS */}
      <div className="bg-white p-4 border-t border-slate-200">
        {editingMsg && (
            <div className="flex items-center justify-between bg-blue-50 p-2 mb-3 rounded-lg border border-blue-100 text-xs font-bold text-blue-700">
                <div className="flex items-center gap-2"><Edit3 size={14}/> Editando mensagem...</div>
                <button onClick={() => { setEditingMsg(null); setInputText(''); }}><X size={14}/></button>
            </div>
        )}

        {selectedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
                {selectedFiles.map((f, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-100 px-2 py-1 rounded-full text-[10px] font-bold text-slate-600 border border-slate-200">
                        {f.name}
                        <button onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}><X size={12}/></button>
                    </div>
                ))}
            </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
            >
                <Paperclip size={20} />
            </button>
            <input 
                type="file" 
                multiple 
                hidden 
                ref={fileInputRef} 
                onChange={e => setSelectedFiles(prev => [...prev, ...Array.from(e.target.files || [])])} 
            />
            
            <input 
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="Escreva sua mensagem..."
                className="flex-1 py-3 px-4 bg-slate-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />

            <button 
                type="submit"
                disabled={isUploading || (!inputText.trim() && selectedFiles.length === 0)}
                className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 disabled:grayscale transition-all active:scale-95"
            >
                {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
        </form>
        <p className="text-[9px] text-slate-400 mt-2 text-center uppercase font-black tracking-tighter">
            Suporta STL, Imagens, Vídeos e PDF. Mantenha a comunicação técnica e profissional.
        </p>
      </div>
    </div>
  );
};