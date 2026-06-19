import React from 'react';
import { X, Download, FileText, Image as ImageIcon, Video as VideoIcon, AlertTriangle, ExternalLink } from 'lucide-react';
import { STLViewer } from './STLViewer';
import { Attachment } from '../types';
import FileSaver from 'file-saver';

interface AttachmentPreviewModalProps {
  file: Attachment;
  allAttachments?: Attachment[];
  onClose: () => void;
}

export const handleDownloadFile = async (url: string, name: string) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    FileSaver.saveAs(blob, name);
  } catch (error) {
    console.error("CORS ou erro de rede ao obter Blob. Baixando pelo link direto...", error);
    // Fallback para download direto via tag 'a' ou file-saver
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', name);
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
};

export const AttachmentPreviewModal: React.FC<AttachmentPreviewModalProps> = ({ file, allAttachments = [], onClose }) => {
  const getFileType = (fileName: string): 'stl' | 'image' | 'video' | 'other' => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'stl') return 'stl';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext || '')) return 'image';
    if (['mp4', 'webm', 'ogg', 'mov'].includes(ext || '')) return 'video';
    return 'other';
  };

  const fileType = getFileType(file.name);

  // Se for STL, renderiza diretamente o STLViewer do sistema com o arquivo (ou todos os arquivos STL anexados neste caso)
  if (fileType === 'stl') {
    // Pegar todos os arquivos STL no mesmo grupo se fornecido
    const stlFiles = allAttachments.length > 0 
      ? allAttachments.filter(f => getFileType(f.name) === 'stl')
      : [file];

    return (
      <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col">
        {/* Barra superior fina com o botão de download do arquivo focado e fechar */}
        <div className="bg-slate-900 border-b border-white/10 px-6 py-3 flex justify-between items-center z-55 shrink-0 text-white">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"></span>
            <p className="text-sm font-bold truncate max-w-[280px] sm:max-w-md" title={file.name}>
              Visualizando 3D: {file.name}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleDownloadFile(file.url, file.name)}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-lg shadow-blue-900/30"
              title="Baixar modelo STL original"
            >
              <Download size={14} /> Baixar STL
            </button>
            <button
              onClick={onClose}
              className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-slate-300 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Corpo principal utilizando o componente de visualização 3D */}
        <div className="flex-1 relative">
          <STLViewer 
            files={stlFiles} 
            onClose={onClose} 
          />
        </div>
      </div>
    );
  }

  // Visualizadores para Imagens, Vídeos e outros arquivos
  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header da Modal */}
        <div className="px-6 py-4 border-b border-slate-150 flex items-center justify-between shrink-0 bg-slate-50">
          <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
            {fileType === 'image' && <ImageIcon size={18} className="text-violet-600" />}
            {fileType === 'video' && <VideoIcon size={18} className="text-indigo-600" />}
            {fileType === 'other' && <FileText size={18} className="text-slate-600" />}
            Pré-visualização de Arquivo
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Conteúdo Central */}
        <div className="flex-1 overflow-auto p-8 flex items-center justify-center bg-slate-900 min-h-[300px]">
          {fileType === 'image' && (
            <img 
              src={file.url} 
              alt={file.name} 
              className="max-w-full max-h-[50vh] rounded-xl object-contain shadow-md"
              referrerPolicy="no-referrer"
            />
          )}

          {fileType === 'video' && (
            <video 
              src={file.url} 
              controls 
              autoPlay
              className="max-w-full max-h-[50vh] rounded-xl shadow-md cursor-pointer"
            />
          )}

          {fileType === 'other' && (
            <div className="text-center py-10 max-w-sm text-white">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
                <FileText size={32} className="text-slate-350" />
              </div>
              <p className="font-extrabold text-white text-sm mb-1 truncate" title={file.name}>
                {file.name}
              </p>
              <p className="text-xs text-slate-400 mb-6 font-medium">
                Este formato de arquivo não possui pré-visualização instantânea do navegador. 
              </p>
              <button
                onClick={() => handleDownloadFile(file.url, file.name)}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-slate-950 font-bold rounded-xl text-xs hover:bg-slate-100 transition shadow-lg"
              >
                <Download size={14} /> Fazer Download Completo
              </button>
            </div>
          )}
        </div>

        {/* Footer com Metadados e Ações */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div className="text-left w-full sm:w-auto">
            <p className="text-xs font-black text-slate-700 truncate max-w-[280px] sm:max-w-md" title={file.name}>
              {file.name}
            </p>
            {file.uploadedAt && (
              <p className="text-[10px] text-slate-400 font-medium">
                Enviado em: {new Date(file.uploadedAt).toLocaleString('pt-BR')}
              </p>
            )}
          </div>

          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <a 
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-75 *0 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition whitespace-nowrap"
            >
              Link Direto <ExternalLink size={12} />
            </a>
            {fileType !== 'other' && (
              <button
                onClick={() => handleDownloadFile(file.url, file.name)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition whitespace-nowrap shadow-md shadow-slate-950/20"
              >
                <Download size={14} /> Download Direto
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
