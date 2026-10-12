/**
 * Utility untuk otomatis mengubah ukuran (resize & compress) file gambar apa pun
 * Pengguna dapat mengunggah file dengan ukuran/resolusi berapa pun (kamera HP, foto 4K, 10MB+),
 * dan sistem akan secara otomatis mengecilkan (resize) proporsional ke ukuran optimal (maks 512x512)
 * dengan bobot berkas yang sangat ringan (sekitar 30-100 KB) dan kualitas tajam.
 */

export interface ResizeOptions {
  maxDimension?: number; // Lebar/tinggi maksimum (default 512px)
  quality?: number; // Kualitas kompresi 0-1 (default 0.85)
  format?: 'image/jpeg' | 'image/png' | 'image/webp';
}

export async function resizeImageForLogo(
  file: File | Blob,
  options: ResizeOptions = {}
): Promise<{ file: File; dataUrl: string; width: number; height: number; sizeBytes: number }> {
  const maxDim = options.maxDimension || 512;
  const quality = options.quality ?? 0.85;
  const targetFormat = options.format || (file.type === 'image/png' ? 'image/png' : 'image/jpeg');

  return new Promise((resolve, reject) => {
    // 1. Baca berkas menjadi Object URL atau Data URL
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let origWidth = img.naturalWidth || img.width;
      let origHeight = img.naturalHeight || img.height;

      if (!origWidth || !origHeight) {
        origWidth = 512;
        origHeight = 512;
      }

      // 2. Hitung dimensi proporsional agar tidak melebihi maxDim
      let targetWidth = origWidth;
      let targetHeight = origHeight;

      if (origWidth > maxDim || origHeight > maxDim) {
        if (origWidth > origHeight) {
          targetWidth = maxDim;
          targetHeight = Math.round((origHeight / origWidth) * maxDim);
        } else {
          targetHeight = maxDim;
          targetWidth = Math.round((origWidth / origHeight) * maxDim);
        }
      }

      // Minimal dimensi 32px
      targetWidth = Math.max(32, targetWidth);
      targetHeight = Math.max(32, targetHeight);

      // 3. Render ke Canvas tersembunyi
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context tidak tersedia di browser.'));
        return;
      }

      // Smoothing tajam
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Jika format JPEG dan ada transparansi, beri background putih
      if (targetFormat === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
      }

      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // 4. Buat data URL dan Blob
      const dataUrl = canvas.toDataURL(targetFormat, quality);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Gagal mengompresi gambar ke Blob'));
            return;
          }

          const ext = targetFormat === 'image/png' ? '.png' : targetFormat === 'image/webp' ? '.webp' : '.jpg';
          const originalName = (file as File).name || 'company-logo';
          const baseName = originalName.replace(/\.[^/.]+$/, '');
          const resizedFile = new File([blob], `${baseName}-opt${ext}`, { type: targetFormat });

          resolve({
            file: resizedFile,
            dataUrl,
            width: targetWidth,
            height: targetHeight,
            sizeBytes: blob.size,
          });
        },
        targetFormat,
        quality
      );
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Gagal memproses file gambar. Pastikan file berupa format gambar yang valid.'));
    };

    img.src = objectUrl;
  });
}
