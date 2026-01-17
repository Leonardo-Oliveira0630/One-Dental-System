
import JSZip from 'jszip';

/**
 * Comprime imagens usando Canvas.
 * Qualidade de 0.85 é o "sweet spot" para fotos odontológicas (mantém detalhes de textura e cor).
 */
export const compressImage = async (file: File, maxWidth = 2048, quality = 0.85): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error("Canvas context failed"));
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              console.log(`[My Tooth] Imagem otimizada: ${(file.size / 1024).toFixed(1)}KB -> ${(compressedFile.size / 1024).toFixed(1)}KB`);
              resolve(compressedFile);
            } else {
              reject(new Error("Compression failed"));
            }
          },
          'image/jpeg',
          quality
        );
      };
    };
    reader.onerror = (err) => reject(err);
  });
};

/**
 * Processa arquivos STL. Zipamos apenas arquivos acima de 3MB.
 */
export const processSTLFile = async (file: File): Promise<File> => {
  if (file.size < 3 * 1024 * 1024) return file;

  const zip = new JSZip();
  // Padronização My Tooth: prefixo 3D_ para fácil identificação
  zip.file(`3D_${file.name}`, file);
  const blob = await zip.generateAsync({ 
    type: 'blob', 
    compression: 'DEFLATE',
    compressionOptions: { level: 6 } // Nível 6 é o melhor equilíbrio entre CPU e ganho de compressão
  });

  const zippedFile = new File([blob], `${file.name}.zip`, {
    type: 'application/zip',
    lastModified: Date.now(),
  });
  
  console.log(`[My Tooth] STL Compactado: ${(file.size / 1024 / 1024).toFixed(1)}MB -> ${(zippedFile.size / 1024 / 1024).toFixed(1)}MB`);
  return zippedFile;
};

/**
 * Função mestre que decide a estratégia de compressão baseada na extensão.
 */
export const smartCompress = async (file: File): Promise<File> => {
  const ext = file.name.split('.').pop()?.toLowerCase();
  
  try {
    if (['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext || '')) {
      return await compressImage(file);
    }
    
    if (ext === 'stl') {
      return await processSTLFile(file);
    }
  } catch (e) {
    console.error("[My Tooth] Falha na compressão, usando original:", e);
  }

  return file;
};
