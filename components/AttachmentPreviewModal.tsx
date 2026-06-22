import React from 'react';
import { 
  X, Download, FileText, Image as ImageIcon, Video as VideoIcon, 
  AlertTriangle, ExternalLink, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw 
} from 'lucide-react';
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
    if (url.startsWith('data:')) {
      const arr = url.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      FileSaver.saveAs(blob, name);
      return;
    }
    const response = await fetch(url);
    const blob = await response.blob();
    FileSaver.saveAs(blob, name);
  } catch (error) {
    console.error("CORS ou erro de rede ao obter Blob. Baixando pelo link direto...", error);
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

  const [currentIndex, setCurrentIndex] = React.useState(() => {
    if (allAttachments && allAttachments.length > 0) {
      const idx = allAttachments.findIndex(a => a.url === file.url || a.name === file.name);
      return idx !== -1 ? idx : 0;
    }
    return 0;
  });

  const activeFile = allAttachments && allAttachments.length > 0 ? allAttachments[currentIndex] : file;
  const fileType = getFileType(activeFile.name);

  // Zoom & Pan for Images
  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [startPan, setStartPan] = React.useState({ x: 0, y: 0 });

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 4));
  const handleZoomOut = () => {
    setZoom(z => {
      const nextZs = Math.max(z - 0.25, 1);
      if (nextZs === 1) setPan({ x: 0, y: 0 });
      return nextZs;
    });
  };
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoom === 1) return;
    setIsDragging(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || zoom === 1) return;
    setPan({
      x: e.clientX - startPan.x,
      y: e.clientY - startPan.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (zoom === 1 || e.touches.length !== 1) return;
    setIsDragging(true);
    setStartPan({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || zoom === 1 || e.touches.length !== 1) return;
    setPan({
      x: e.touches[0].clientX - startPan.x,
      y: e.touches[0].clientY - startPan.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Switch handlers
  const handlePrev = () => {
    if (!allAttachments || allAttachments.length <= 1) return;
    setCurrentIndex(prev => (prev - 1 + allAttachments.length) % allAttachments.length);
  };

  const handleNext = () => {
    if (!allAttachments || allAttachments.length <= 1) return;
    setCurrentIndex(prev => (prev + 1) % allAttachments.length);
  };

  // Keyboard Shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (allAttachments && allAttachments.length > 1) {
        if (e.key === 'ArrowLeft') {
          handlePrev();
        } else if (e.key === 'ArrowRight') {
          handleNext();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [allAttachments, currentIndex]);

  // Reset zoom & pan when file changes
  React.useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [currentIndex]);

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col text-white select-none animate-in fade-in duration-200">
      
      {/* Sleek top status header bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-col md:flex-row justify-between items-center z-50 shrink-0 gap-4">
        
        {/* Left: Thumbnail format and name */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="p-2 bg-slate-800 rounded-xl shrink-0">
            {fileType === 'stl' && <FileText size={20} className="text-blue-400" />}
            {fileType === 'image' && <ImageIcon size={20} className="text-violet-400" />}
            {fileType === 'video' && <VideoIcon size={20} className="text-indigo-400" />}
            {fileType === 'other' && <FileText size={20} className="text-slate-400" />}
          </div>
          <div className="min-w-0 flex-1 md:flex-none">
            <h4 className="text-sm font-black text-slate-100 truncate max-w-[250px] sm:max-w-md md:max-w-xs leading-tight" title={activeFile.name}>
              {activeFile.name}
            </h4>
            <div className="flex items-center gap-2 mt-0.5">
              {allAttachments.length > 1 && (
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                  Foto {currentIndex + 1} de {allAttachments.length}
                </span>
              )}
              {activeFile.uploadedAt && (
                <span className="text-[10px] text-slate-500 font-bold">
                  {new Date(activeFile.uploadedAt).toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Image Zoom Controls */}
        {fileType === 'image' && (
          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-2xl border border-slate-750 shrink-0">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoom === 1}
              className="p-1 px-2 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition"
              title="Afastar (-)"
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-xs font-mono font-black text-slate-300 min-w-[50px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoom === 4}
              className="p-1 px-2 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition"
              title="Aproximar (+)"
            >
              <ZoomIn size={16} />
            </button>
            <div className="w-[1px] h-4 bg-slate-700 mx-1" />
            <button
              type="button"
              onClick={handleResetZoom}
              disabled={zoom === 1 && pan.x === 0 && pan.y === 0}
              className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition"
              title="Resetar Zoom"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        )}

        {/* Right: Direct Download and Actions */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <a
            href={activeFile.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 font-black text-xs text-slate-300 rounded-xl flex items-center gap-1.5 transition"
          >
            Link Direto <ExternalLink size={12} />
          </a>
          <button
            type="button"
            onClick={() => handleDownloadFile(activeFile.url, activeFile.name)}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-lg shadow-indigo-950/40"
            title="Fazer download"
          >
            <Download size={14} /> Baixar
          </button>
          <div className="w-[1px] h-6 bg-slate-800 hidden md:block" />
          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-slate-800 hover:bg-red-500 hover:text-white rounded-xl transition-colors text-slate-400"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Primary Display viewport area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-slate-950">
        
        {/* Prev Arrow Overlay */}
        {allAttachments.length > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-6 z-50 p-4 bg-slate-900/75 hover:bg-slate-800 border border-slate-800 rounded-full text-slate-200 hover:text-white transition shadow-2xl focus:outline-none flex items-center justify-center shrink-0 active:scale-95"
            title="Anterior (Seta Esquerda)"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        {/* Interactive content core handler */}
        <div 
          className="w-full h-full flex items-center justify-center relative overscroll-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {fileType === 'stl' && (
            <div className="w-full h-full relative">
              <STLViewer files={[activeFile]} onClose={onClose} />
            </div>
          )}

          {fileType === 'image' && (
            <div className="relative overflow-hidden w-full h-full flex items-center justify-center">
              <img
                src={activeFile.url}
                alt={activeFile.name}
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                  maxWidth: '92%',
                  maxHeight: '90%'
                }}
                className="rounded-2xl object-contain shadow-2xl select-none"
                draggable={false}
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          {fileType === 'video' && (
            <div className="max-w-[85%] max-h-[85%] flex items-center justify-center">
              <video
                src={activeFile.url}
                controls
                autoPlay
                className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl"
              />
            </div>
          )}

          {fileType === 'other' && (
            <div className="text-center py-16 max-w-md bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl mx-4">
              <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-slate-700/50">
                <FileText size={40} className="text-slate-400" />
              </div>
              <h3 className="font-extrabold text-white text-base mb-2 truncate px-4" title={activeFile.name}>
                {activeFile.name}
              </h3>
              <p className="text-xs text-slate-400 mb-8 font-medium max-w-xs mx-auto">
                Este formato de arquivo não possui pré-visualização instantânea no navegador. Favor baixar para visualizá-lo.
              </p>
              <button
                type="button"
                onClick={() => handleDownloadFile(activeFile.url, activeFile.name)}
                className="inline-flex items-center gap-2 px-8 py-3 bg-white text-slate-950 font-black rounded-2xl text-xs hover:bg-slate-100 transition shadow-lg shrink-0 uppercase tracking-widest font-extrabold"
              >
                <Download size={14} /> Fazer Download
              </button>
            </div>
          )}
        </div>

        {/* Next Arrow Overlay */}
        {allAttachments.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-6 z-50 p-4 bg-slate-900/75 hover:bg-slate-800 border border-slate-800 rounded-full text-slate-200 hover:text-white transition shadow-2xl focus:outline-none flex items-center justify-center shrink-0 active:scale-95"
            title="Próxima (Seta Direita)"
          >
            <ChevronRight size={24} />
          </button>
        )}

      </div>

      {/* Multiple attachment carousel grid selection */}
      {allAttachments.length > 1 && (
        <div className="bg-slate-900/90 border-t border-slate-800 px-6 py-4 flex items-center justify-start md:justify-center z-50 shrink-0 gap-2 overflow-x-auto">
          {allAttachments.map((att, index) => {
            const isSelected = index === currentIndex;
            const attType = getFileType(att.name);
            return (
              <button
                key={index}
                type="button"
                onClick={() => setCurrentIndex(index)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 border ${
                  isSelected 
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md' 
                    : 'bg-slate-800/80 hover:bg-slate-855 text-slate-400 border-slate-750'
                }`}
              >
                {attType === 'image' && <ImageIcon size={12} />}
                {attType === 'video' && <VideoIcon size={12} />}
                {attType === 'stl' && <FileText size={12} />}
                {attType === 'other' && <FileText size={12} />}
                <span className="max-w-[120px] truncate">{att.name}</span>
              </button>
            );
          })}
        </div>
      )}

    </div>
  );
};
