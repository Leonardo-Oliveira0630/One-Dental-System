import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Job, UserRole, CaseApprovalItem, CaseApprovalReply, CaseApprovalFile, Attachment } from '../types';
import * as api from '../services/firebaseService';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';
import { 
  Check, X, ThumbsUp, ThumbsDown, MessageSquare, CornerDownRight, 
  Paperclip, File, Image as ImageIcon, Video, Box, Globe, 
  Clock, Send, User, Trash2, Plus, ArrowUpRight, HelpCircle, Loader2,
  FileCheck, FileX, Sparkles, CheckSquare, ChevronDown, Download, Eye, ExternalLink
} from 'lucide-react';

interface CaseApprovalSystemProps {
  job: Job;
  orgId: string;
}

export const CaseApprovalSystem: React.FC<CaseApprovalSystemProps> = ({ job, orgId }) => {
  const { currentUser, uploadFile, updateJob } = useApp();
  const [items, setItems] = useState<CaseApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);

  // New item posting form state
  const [messageText, setMessageText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  // Replies states indexed by itemId
  const [replyTexts, setReplyTexts] = useState<{ [itemId: string]: string }>({});
  const [replyingToId, setReplyingToId] = useState<string | null>(null);

  // Adjustment requested modal state
  const [rejectingItemId, setRejectingItemId] = useState<string | null>(null);
  const [adjustmentReason, setAdjustmentReason] = useState('');

  // Attachment preview states
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);
  const [allAttachmentsForPreview, setAllAttachmentsForPreview] = useState<Attachment[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to case approval subcollection
  useEffect(() => {
    const unsub = api.subscribeCaseApprovals(orgId, job.id, (fetchedItems) => {
      setItems(fetchedItems);
      setLoading(false);
    });
    return () => unsub();
  }, [orgId, job.id]);

  const isLabStaff = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER || currentUser?.role === UserRole.COLLABORATOR;
  const isDentist = currentUser?.role === UserRole.CLIENT;

  const detectFileType = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) return 'photo';
    if (['mp4', 'mov', 'webm', 'ogg', 'avi', 'mkv'].includes(ext)) return 'video';
    if (['html', 'htm'].includes(ext)) return 'html';
    if (['stl', 'obj', 'ply', '3ds'].includes(ext)) return 'stl';
    return 'other';
  };

  const handlePreviewFile = (clickedFile: CaseApprovalFile, allItemFiles: CaseApprovalFile[]) => {
    const mappedActive: Attachment = {
      id: clickedFile.url,
      name: clickedFile.name,
      url: clickedFile.url,
      uploadedAt: new Date()
    };
    const mappedAll: Attachment[] = allItemFiles.map(f => ({
      id: f.url,
      name: f.name,
      url: f.url,
      uploadedAt: new Date()
    }));
    setSelectedAttachment(mappedActive);
    setAllAttachmentsForPreview(mappedAll);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeSelectedFile = (idx: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handlePostApprovalItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!messageText.trim() && selectedFiles.length === 0) {
      alert('Por favor, adicione uma descrição ou anexe algum arquivo.');
      return;
    }

    setIsPosting(true);
    setUploadProgress('Enviando mídias para o servidor...');

    try {
      const uploadedFiles: CaseApprovalFile[] = [];

      for (const file of selectedFiles) {
        setUploadProgress(`Enviando ${file.name}...`);
        const downloadUrl = await uploadFile(file);
        uploadedFiles.push({
          name: file.name,
          url: downloadUrl,
          type: detectFileType(file.name)
        });
      }

      const newItem: Omit<CaseApprovalItem, 'id'> = {
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderRole: currentUser.role,
        message: messageText,
        files: uploadedFiles,
        createdAt: new Date(),
        replies: [],
        status: 'PENDING'
      };

      await api.apiSendCaseApproval(orgId, job.id, newItem);
      
      // Clean up form
      setMessageText('');
      setSelectedFiles([]);
      setUploadProgress(null);
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar o arquivo para aprovação.');
    } finally {
      setIsPosting(false);
    }
  };

  const handleSendReply = async (itemId: string) => {
    const replyText = replyTexts[itemId];
    if (!currentUser || !replyText || !replyText.trim()) return;

    try {
      const targetItem = items.find(i => i.id === itemId);
      if (!targetItem) return;

      const newReply: CaseApprovalReply = {
        id: `reply_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderRole: currentUser.role,
        text: replyText,
        createdAt: new Date()
      };

      const updatedReplies = [...(targetItem.replies || []), newReply];
      await api.apiUpdateCaseApproval(orgId, job.id, itemId, { replies: updatedReplies });

      setReplyTexts(prev => ({ ...prev, [itemId]: '' }));
      setReplyingToId(null);
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar a resposta.');
    }
  };

  const handleApproveItem = async (itemId: string) => {
    if (!window.confirm('Confirmar aprovação deste envio do caso?')) return;
    try {
      await api.apiUpdateCaseApproval(orgId, job.id, itemId, {
        status: 'APPROVED',
        resolvedAt: new Date()
      });

      // Update overall job approval status to APPROVED
      await updateJob(job.id, { approvalStatus: 'APPROVED' });
    } catch (err) {
      console.error(err);
      alert('Erro ao aprovar o envio.');
    }
  };

  const handleRejectItemClick = (itemId: string) => {
    setRejectingItemId(itemId);
    setAdjustmentReason('');
  };

  const handleConfirmRejectItem = async () => {
    if (!rejectingItemId) return;
    if (!adjustmentReason.trim()) {
      alert('Por favor, informe o motivo do ajuste necessário.');
      return;
    }

    try {
      await api.apiUpdateCaseApproval(orgId, job.id, rejectingItemId, {
        status: 'REJECTED',
        statusFeedback: adjustmentReason,
        resolvedAt: new Date()
      });

      // Update overall job approval status to REJECTED
      await updateJob(job.id, { approvalStatus: 'REJECTED' });

      setRejectingItemId(null);
    } catch (err) {
      console.error(err);
      alert('Erro ao solicitar ajuste.');
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'photo': return <ImageIcon className="text-emerald-500" size={18} />;
      case 'video': return <Video className="text-indigo-500" size={18} />;
      case 'html': return <Globe className="text-teal-500" size={18} />;
      case 'stl': return <Box className="text-orange-500 animate-pulse" size={18} />;
      default: return <File className="text-slate-400" size={18} />;
    }
  };

  return (
    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden p-6 md:p-8 space-y-6 md:space-y-8 animate-in fade-in duration-300">
      
      {/* Header section with overall status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl">
            <CheckSquare size={24} />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-black text-slate-800 uppercase tracking-tighter">Aprovação de Caso</h3>
            <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase mt-1">Interação clínica com o laboratório para aprovação de modelos, planejamentos e fotos</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Status Geral:</span>
          {job.approvalStatus === 'APPROVED' ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-xs font-black uppercase tracking-wide shadow-sm">
              <FileCheck size={14} /> Caso Aprovado
            </span>
          ) : job.approvalStatus === 'REJECTED' ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-red-50 border border-red-200 text-red-700 rounded-full text-xs font-black uppercase tracking-wide shadow-sm">
              <FileX size={14} /> Ajuste Solicitado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-xs font-black uppercase tracking-wide shadow-sm">
              <Clock size={14} /> Análise Pendente
            </span>
          )}
        </div>
      </div>

      {/* Main Chronological Timeline */}
      <div className="space-y-6">
        <h4 className="text-xs md:text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <Clock size={16} className="text-slate-400" /> Histórico de Encomendas & Anexos
        </h4>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="animate-spin text-indigo-500 mb-2" size={32} />
            <span className="text-xs font-bold uppercase tracking-wider">Carregando mídias do caso...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="border border-dashed border-slate-200 rounded-[24px] py-16 px-4 text-center">
            <HelpCircle size={40} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-extrabold text-sm uppercase">Nenhum arquivo ou modelo enviado para aprovação.</p>
            <p className="text-slate-400 text-xs mt-1">Envie planejamentos virtuais, fotos STL, PDFs ou HTML abaixo para validação imediata.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {items.map((item) => {
              const itemDate = item.createdAt instanceof Date ? item.createdAt : new Date(item.createdAt);
              const isItemSenderLab = item.senderRole === 'ADMIN' || item.senderRole === 'COLLABORATOR';
              const senderDisplayName = isItemSenderLab ? `LAB • ${item.senderName}` : `DR(A). • ${item.senderName}`;

              return (
                <div key={item.id} className="bg-slate-50/50 hover:bg-slate-50/80 transition-colors border border-slate-100 rounded-[24px] p-5 md:p-6 space-y-4 shadow-sm relative overflow-hidden">
                  
                  {/* Badge indicating resolved status for this item */}
                  {item.status === 'APPROVED' && (
                    <div className="absolute top-0 right-0 bg-emerald-600 text-white font-black text-[9px] uppercase tracking-wider px-4 py-1 rounded-bl-xl flex items-center gap-1">
                      <Check size={12} /> Aprovado
                    </div>
                  )}
                  {item.status === 'REJECTED' && (
                    <div className="absolute top-0 right-0 bg-red-600 text-white font-black text-[9px] uppercase tracking-wider px-4 py-1 rounded-bl-xl flex items-center gap-1">
                      <X size={12} /> Ajuste Solicitado
                    </div>
                  )}

                  {/* Sender & Timestamp */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg text-white font-black text-xs ${isItemSenderLab ? 'bg-indigo-600' : 'bg-blue-600'}`}>
                        {isItemSenderLab ? 'LAB' : 'DR'}
                      </div>
                      <div>
                        <p className="font-black text-slate-700 text-xs uppercase">{senderDisplayName}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{itemDate.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Message */}
                  {item.message && (
                    <p className="text-slate-600 text-xs md:text-sm font-semibold whitespace-pre-wrap leading-relaxed">
                      {item.message}
                    </p>
                  )}

                  {/* Files Grid */}
                  {item.files && item.files.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                      {item.files.map((file, fileIdx) => (
                        <div key={fileIdx} className="bg-white border border-slate-200/60 hover:border-slate-300 transition-colors rounded-xl p-3 flex flex-col justify-between gap-3 shadow-sm min-w-0">
                          
                          {/* File Preview */}
                          <div 
                            onClick={() => handlePreviewFile(file, item.files)}
                            className="cursor-pointer group relative shrink-0"
                          >
                            {file.type === 'photo' ? (
                              <div className="relative rounded-lg overflow-hidden bg-slate-100 aspect-video flex items-center justify-center border border-slate-100">
                                <img 
                                  src={file.url} 
                                  alt={file.name} 
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <Eye size={20} className="scale-90 group-hover:scale-100 transition-transform" />
                                </div>
                              </div>
                            ) : file.type === 'video' ? (
                              <div className="relative rounded-lg overflow-hidden bg-slate-950 aspect-video flex items-center justify-center">
                                <video src={file.url} className="w-full h-full max-h-[160px] object-cover" />
                                <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center text-white">
                                  <Eye size={20} className="scale-90 group-hover:scale-100 transition-transform" />
                                </div>
                              </div>
                            ) : (
                              <div className="aspect-video bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100 relative overflow-hidden">
                                {getFileIcon(file.type)}
                                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <Eye size={20} className="scale-90 group-hover:scale-100 transition-transform" />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Info & Download button */}
                          <div className="flex justify-between items-center min-w-0 gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-black text-slate-700 truncate uppercase" title={file.name}>
                                {file.name}
                              </p>
                              <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">
                                {file.type}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handlePreviewFile(file, item.files)}
                                className="p-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-slate-500 transition-colors"
                                title="Visualizar Arquivo"
                              >
                                <Eye size={14} />
                              </button>
                              {file.type === 'html' ? (
                                <a 
                                  href={file.url} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="p-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-600 rounded-lg text-slate-500 transition-colors"
                                  title="Abrir Planejamento Interativo"
                                >
                                  <ExternalLink size={14} />
                                </a>
                              ) : (
                                <a 
                                  href={file.url} 
                                  download={file.name}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-500 transition-colors"
                                  title="Baixar Arquivo"
                                >
                                  <Download size={14} />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Feedback rejection message if exists */}
                  {item.status === 'REJECTED' && item.statusFeedback && (
                    <div className="bg-red-50/50 border border-red-100 rounded-xl p-3 mt-2">
                      <p className="text-[10px] text-red-700 font-black uppercase flex items-center gap-1">
                        <FileX size={12} /> Motivo do ajuste solicitado:
                      </p>
                      <p className="text-red-600 text-xs font-bold mt-1 leading-relaxed">
                        {item.statusFeedback}
                      </p>
                    </div>
                  )}

                  {/* Action buttons for Dentist on pending items */}
                  {isDentist && item.status === 'PENDING' && (
                    <div className="flex items-center gap-3 pt-2">
                      <button 
                        type="button"
                        onClick={() => handleApproveItem(item.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-md shadow-emerald-100 flex items-center gap-1.5 active:scale-95"
                      >
                        <ThumbsUp size={12} /> Aprovar Envio
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleRejectItemClick(item.id)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-md shadow-red-100 flex items-center gap-1.5 active:scale-95"
                      >
                        <ThumbsDown size={12} /> Solicitar Ajuste
                      </button>
                    </div>
                  )}

                  {/* Thread Replies / Comments section */}
                  <div className="border-t border-slate-100 pt-4 space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <MessageSquare size={12} /> Respostas ({item.replies?.length || 0})
                    </p>

                    {item.replies && item.replies.length > 0 && (
                      <div className="space-y-3 pl-2 md:pl-4 border-l-2 border-indigo-100/50 py-1">
                        {item.replies.map((reply) => {
                          const replyDate = reply.createdAt instanceof Date ? reply.createdAt : new Date(reply.createdAt);
                          const isReplySenderLab = reply.senderRole === 'ADMIN' || reply.senderRole === 'COLLABORATOR';
                          const rSenderDisplayName = isReplySenderLab ? `LAB • ${reply.senderName}` : `DR(A). • ${reply.senderName}`;

                          return (
                            <div key={reply.id} className="text-xs space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`font-black uppercase text-[10px] ${isReplySenderLab ? 'text-indigo-600' : 'text-blue-600'}`}>
                                  {rSenderDisplayName}
                                </span>
                                <span className="text-[8px] text-slate-400 font-bold">
                                  {replyDate.toLocaleString()}
                                </span>
                              </div>
                              <p className="text-slate-600 font-medium bg-white p-2.5 rounded-xl border border-slate-100 w-fit max-w-full">
                                {reply.text}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Reply input field */}
                    <div className="flex items-center gap-2 pl-2">
                      <CornerDownRight size={16} className="text-slate-300" />
                      <input 
                        type="text"
                        placeholder="Escreva uma resposta..."
                        value={replyTexts[item.id] || ''}
                        onChange={e => setReplyTexts(prev => ({ ...prev, [item.id]: e.target.value }))}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSendReply(item.id);
                        }}
                        className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 focus:border-indigo-400 focus:ring-0 rounded-xl outline-none"
                      />
                      <button 
                        type="button"
                        onClick={() => handleSendReply(item.id)}
                        className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl active:scale-95 transition-all shadow-md"
                        title="Enviar Resposta"
                      >
                        <Send size={12} />
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Post New Case Approval Item Form */}
      <form onSubmit={handlePostApprovalItem} className="bg-slate-50 rounded-[24px] p-5 md:p-6 border border-slate-100 space-y-4">
        <h4 className="text-xs md:text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <Plus size={16} className="text-indigo-500" /> Enviar Novo Arquivo para Aprovação / Verificação
        </h4>

        <div className="space-y-3">
          <textarea 
            placeholder="Descreva o que está enviando e adicione instruções (ex: fotos do modelo, planejamento STL para sua aprovação antes de fresar)..."
            value={messageText}
            onChange={e => setMessageText(e.target.value)}
            className="w-full p-4 text-xs md:text-sm font-medium bg-white border border-slate-200 focus:border-indigo-400 focus:ring-0 rounded-2xl outline-none resize-none min-h-[100px]"
          />

          {/* Files select list */}
          {selectedFiles.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/70 p-3 space-y-1.5">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Arquivos Selecionados:</p>
              <div className="max-h-28 overflow-y-auto space-y-1 pr-1 scrollbar-hide">
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs bg-slate-50 hover:bg-slate-100 p-2 rounded-lg border border-slate-100">
                    <span className="truncate flex-1 font-bold text-slate-600 mr-2 uppercase text-[10px]">
                      📁 {file.name}
                    </span>
                    <button 
                      type="button"
                      onClick={() => removeSelectedFile(idx)} 
                      className="p-1 text-slate-400 hover:text-red-500 rounded"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* File select buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <input 
              type="file" 
              multiple 
              onChange={handleFileChange}
              ref={fileInputRef}
              className="hidden"
              accept=".stl,.obj,.ply,.html,.png,.jpg,.jpeg,.gif,.pdf,.mp4,.mov,.webm"
            />
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-colors"
            >
              <Paperclip size={16} className="text-indigo-500" /> Anexar Arquivos (fotos, vídeos, html, stl...)
            </button>

            <button 
              type="submit"
              disabled={isPosting}
              className="ml-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center gap-2 disabled:opacity-50"
            >
              {isPosting ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
              {isPosting ? 'Enviando...' : 'Enviar para Aprovação'}
            </button>
          </div>

          {uploadProgress && (
            <p className="text-[10px] text-indigo-600 font-extrabold uppercase animate-pulse text-center mt-2">
              {uploadProgress}
            </p>
          )}
        </div>
      </form>

      {/* Rejection / Adjustment Requested Reason Dialog Modal */}
      {rejectingItemId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] max-w-md w-full border border-slate-100 shadow-2xl p-6 md:p-8 space-y-4 animate-in zoom-in-95 duration-250">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                  <FileX size={20} />
                </div>
                <h3 className="font-black text-slate-800 uppercase tracking-tighter text-sm md:text-base">Solicitar Ajuste do Caso</h3>
              </div>
              <button 
                onClick={() => setRejectingItemId(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed font-bold uppercase">
              Descreva abaixo os ajustes ou correções necessárias neste planejamento/envio. O laboratório será notificado imediatamente para corrigir o caso.
            </p>

            <textarea 
              placeholder="Ex: Por favor, ajuste o término cervical no dente 21 que ficou muito subgengival, e reduza a bossa vestibular..."
              value={adjustmentReason}
              onChange={e => setAdjustmentReason(e.target.value)}
              className="w-full p-4 border border-slate-200 focus:border-red-400 focus:ring-0 rounded-2xl outline-none resize-none min-h-[120px] text-xs md:text-sm font-semibold"
            />

            <div className="flex items-center gap-3 justify-end pt-2">
              <button 
                type="button"
                onClick={() => setRejectingItemId(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={handleConfirmRejectItem}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-red-100 flex items-center gap-1.5"
              >
                Solicitar Ajuste
              </button>
            </div>
          </div>
        </div>
      )}

      {/* High-quality Attachment Preview Modal */}
      {selectedAttachment && (
        <AttachmentPreviewModal 
          file={selectedAttachment}
          allAttachments={allAttachmentsForPreview}
          onClose={() => {
            setSelectedAttachment(null);
            setAllAttachmentsForPreview([]);
          }}
        />
      )}

    </div>
  );
};
