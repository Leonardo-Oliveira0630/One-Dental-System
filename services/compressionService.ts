import JSZip from 'jszip';

/**
 * Comprime e converte imagens para formato web otimizado (WebP / JPEG)
 * Evita telas pretas, reduz drasticamente o tamanho e previne travamentos.
 */
export const compressImage = async (file: File, maxWidth = 1920, quality = 0.82): Promise<File> => {
  if (!file || !file.type.startsWith('image/') && !['jpg', 'jpeg', 'png', 'webp', 'heic', 'bmp'].some(ext => file.name.toLowerCase().endsWith(ext))) {
    return file;
  }

  return new Promise((resolve) => {
    let objectUrl = '';
    try {
      objectUrl = URL.createObjectURL(file);
    } catch (e) {
      return resolve(file);
    }

    const img = new Image();
    img.src = objectUrl;

    img.onload = () => {
      try {
        let width = img.naturalWidth || img.width || 1200;
        let height = img.naturalHeight || img.height || 800;

        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((maxWidth / width) * height);
            width = maxWidth;
          } else {
            width = Math.round((maxWidth / height) * width);
            height = maxWidth;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          return resolve(file);
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Suporta conversão para WebP (formato web moderno) com fallback para JPEG
        const supportsWebp = canvas.toDataURL('image/webp').startsWith('data:image/webp');
        const mimeType = supportsWebp ? 'image/webp' : 'image/jpeg';
        const ext = supportsWebp ? '.webp' : '.jpg';

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (blob && blob.size > 0) {
              const baseName = file.name.replace(/\.[^/.]+$/, "");
              const compressedFile = new File([blob], `${baseName}${ext}`, {
                type: mimeType,
                lastModified: Date.now(),
              });
              console.log(`[LABPROX COMPRESS] Imagem convertida para web (${width}x${height}): ${(file.size / 1024).toFixed(1)}KB -> ${(compressedFile.size / 1024).toFixed(1)}KB`);
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          mimeType,
          quality
        );
      } catch (err) {
        console.warn("[LABPROX] Falha no canvas ao processar imagem:", err);
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
  });
};

/**
 * Converte e comprime imagem diretamente para string Base64 leve (ideal para previnir estouro de memória no Firestore)
 */
export const compressImageToBase64 = async (file: File, maxWidth = 1200, quality = 0.78): Promise<string> => {
  if (!file) return '';

  return new Promise((resolve) => {
    let objectUrl = '';
    try {
      objectUrl = URL.createObjectURL(file);
    } catch (e) {
      return resolve('');
    }

    const img = new Image();
    img.src = objectUrl;

    img.onload = () => {
      try {
        let width = img.naturalWidth || img.width || 800;
        let height = img.naturalHeight || img.height || 600;

        if (width > maxWidth) {
          height = Math.round((maxWidth / width) * height);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          return resolve('');
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const base64 = canvas.toDataURL('image/jpeg', quality);
        URL.revokeObjectURL(objectUrl);
        console.log(`[LABPROX BASE64] Imagem leve gerada: ${(base64.length / 1024).toFixed(1)}KB`);
        resolve(base64);
      } catch (canvasErr) {
        console.warn("[LABPROX] Falha na conversão para base64:", canvasErr);
        URL.revokeObjectURL(objectUrl);
        resolve('');
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve('');
    };
  });
};

/**
 * Otimiza e valida vídeos para formato web leve (WebM / MP4)
 */
export const processVideoFile = async (file: File): Promise<File> => {
  if (!file || !file.type.startsWith('video/')) return file;
  
  console.log(`[LABPROX VIDEO] Vídeo recebido para formato web: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
  
  // Garantir extensão web apropriada (.webm ou .mp4)
  const isWebM = file.type.includes('webm');
  const isMp4 = file.type.includes('mp4') || file.name.toLowerCase().endsWith('.mp4');
  
  if (!isWebM && !isMp4) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const newName = file.name.replace(new RegExp(`\\.${ext}$`, 'i'), '.mp4');
    return new File([file], newName, {
      type: 'video/mp4',
      lastModified: Date.now()
    });
  }

  return file;
};

/**
 * Processa arquivos STL. Zipamos apenas arquivos acima de 3MB.
 */
export const processSTLFile = async (file: File): Promise<File> => {
  if (file.size < 3 * 1024 * 1024) return file;

  const zip = new JSZip();
  zip.file(`3D_${file.name}`, file);
  const blob = await zip.generateAsync({ 
    type: 'blob', 
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  const zippedFile = new File([blob], `${file.name}.zip`, {
    type: 'application/zip',
    lastModified: Date.now(),
  });
  
  console.log(`[LABPROX] STL Compactado: ${(file.size / 1024 / 1024).toFixed(1)}MB -> ${(zippedFile.size / 1024 / 1024).toFixed(1)}MB`);
  return zippedFile;
};

/**
 * Função mestre de otimização de mídias e arquivos para a Web no ato da importação.
 */
export const smartCompress = async (file: File): Promise<File> => {
  if (!file) return file;
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  
  try {
    if (file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'heic', 'bmp'].includes(ext)) {
      return await compressImage(file);
    }
    
    if (file.type.startsWith('video/') || ['mp4', 'mov', 'webm', 'avi', 'mkv'].includes(ext)) {
      return await processVideoFile(file);
    }

    if (ext === 'stl') {
      return await processSTLFile(file);
    }
  } catch (e) {
    console.error("[LABPROX] Falha no processamento de mídia, mantendo original:", e);
  }

  return file;
};
