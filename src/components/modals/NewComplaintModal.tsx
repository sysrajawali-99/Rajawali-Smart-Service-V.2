import React, { useState, useEffect, useRef } from 'react';
import { X, AlertCircle, Camera, Upload, Trash2, Clock, User, Plus } from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import { uploadPhoto } from '../../services/apiService';

interface NewComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewComplaintModal: React.FC<NewComplaintModalProps> = ({ isOpen, onClose }) => {
  const { submitNewComplaint, userRole, currentUser, activeProject } = useCleaning();

  const [areaLocation, setAreaLocation] = useState('');
  const [description, setDescription] = useState('');
  const [photoBefore, setPhotoBefore] = useState('');
  const [photoMeta, setPhotoMeta] = useState<{ timestamp: string; userName: string } | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const processPhotoWithTimestamp = (
    file: File,
    locationLabel?: string
  ): Promise<{ dataUrl: string; timestamp: string; userName: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Gagal membaca file foto.'));
      reader.onload = () => {
        const baseDataUrl = reader.result as string;
        const img = new Image();
        img.onload = () => {
          const now = new Date();
          const dateFormatted = now.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          });
          const timeFormatted =
            now.toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }) + ' WIB';
          const fullTimestamp = `${dateFormatted} • ${timeFormatted}`;
          const loggedInUser = currentUser?.name || 'User Login';

          const canvas = document.createElement('canvas');
          const maxDim = 1280;
          let targetW = img.width || 800;
          let targetH = img.height || 600;
          if (targetW > maxDim || targetH > maxDim) {
            if (targetW >= targetH) {
              targetH = Math.round((targetH * maxDim) / targetW);
              targetW = maxDim;
            } else {
              targetW = Math.round((targetW * maxDim) / targetH);
              targetH = maxDim;
            }
          }

          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({ dataUrl: baseDataUrl, timestamp: fullTimestamp, userName: loggedInUser });
            return;
          }

          ctx.drawImage(img, 0, 0, targetW, targetH);

          const bannerHeight = Math.max(76, Math.floor(targetH * 0.16));
          const bannerY = targetH - bannerHeight;

          const gradient = ctx.createLinearGradient(0, bannerY, 0, targetH);
          gradient.addColorStop(0, 'rgba(15, 23, 42, 0.55)');
          gradient.addColorStop(0.35, 'rgba(15, 23, 42, 0.88)');
          gradient.addColorStop(1, 'rgba(15, 23, 42, 0.96)');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, bannerY, targetW, bannerHeight);

          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(0, bannerY, targetW, Math.max(2, Math.floor(targetH * 0.004)));

          const padX = Math.max(14, Math.floor(targetW * 0.025));
          const fontSizePrimary = Math.max(13, Math.floor(targetW * 0.024));
          const fontSizeSecondary = Math.max(11, Math.floor(targetW * 0.019));

          let textY = bannerY + Math.floor(bannerHeight * 0.36);
          ctx.font = `bold ${fontSizePrimary}px monospace`;
          ctx.fillStyle = '#fde047';
          ctx.fillText(`🕒 ${fullTimestamp}`, padX, textY);

          textY += Math.floor(bannerHeight * 0.32);
          ctx.font = `bold ${fontSizeSecondary}px sans-serif`;
          ctx.fillStyle = '#ffffff';
          ctx.fillText(`👤 User: ${loggedInUser}`, padX, textY);

          textY += Math.floor(bannerHeight * 0.24);
          ctx.font = `normal ${Math.max(10, fontSizeSecondary - 2)}px sans-serif`;
          ctx.fillStyle = '#cbd5e1';
          const locInfo = locationLabel
            ? `${activeProject?.name || 'Gedung'} • ${locationLabel}`
            : activeProject?.name || 'Gedung';
          ctx.fillText(`📍 ${locInfo}`, padX, textY);

          const stampedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
          resolve({
            dataUrl: stampedDataUrl,
            timestamp: fullTimestamp,
            userName: loggedInUser,
          });
        };
        img.onerror = () => reject(new Error('Format gambar tidak dapat diproses.'));
        img.src = baseDataUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingPhoto(true);
    setErrorMsg(null);
    try {
      const result = await processPhotoWithTimestamp(file, areaLocation.trim() || undefined);
      const uploadedUrl = await uploadPhoto(result.dataUrl);
      setPhotoBefore(uploadedUrl || result.dataUrl);
      setPhotoMeta({ timestamp: result.timestamp, userName: result.userName });
    } catch {
      setErrorMsg('Gagal memproses foto. Silakan pilih file gambar lain.');
    } finally {
      setIsProcessingPhoto(false);
      e.target.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!areaLocation.trim()) {
      setErrorMsg('Lokasi / Area wajib diisi secara manual.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Isian Keluhan wajib diisi secara manual.');
      return;
    }

    submitNewComplaint({
      reporterName: currentUser?.name || 'Klien Gedung',
      reporterRole: userRole === 'klien' ? 'Tenant Gedung' : 'Pengawas Internal',
      areaName: areaLocation.trim(),
      floor: activeProject?.name || 'Area Operasional',
      category: 'Keluhan Operasional',
      priority: 'high',
      slaHours: 2,
      description: description.trim(),
      photoBefore: photoBefore.trim() || undefined,
    });

    setAreaLocation('');
    setDescription('');
    setPhotoBefore('');
    setPhotoMeta(null);
    setErrorMsg(null);
    onClose();
  };

  return (
    <div
      id="complaint-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        id="complaint-modal-card"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[94dvh]"
      >
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-amber-50/70 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                Ajukan Keluhan Baru
              </h3>
              <p className="text-xs text-slate-500 truncate">
                Tiket langsung masuk antrian prioritas operasional
              </p>
            </div>
          </div>
          <button
            id="close-complaint-modal-btn"
            type="button"
            onClick={onClose}
            aria-label="Tutup Tiket Komplain"
            className="p-2 rounded-full text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto overscroll-contain flex-1">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Lokasi / Area *</label>
            <input
              type="text"
              required
              placeholder="Ketik manual lokasi / area (contoh: Toilet Pria Lt. 1, Lobby Utama...)"
              value={areaLocation}
              onChange={(e) => setAreaLocation(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-xs"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Keluhan *</label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ketik manual rincian keluhan yang perlu segera ditangani..."
              className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none text-xs"
            />
          </div>

          {/* Ambil Foto / Upload Foto */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-slate-700">
                Ambil Foto / Upload Foto
              </label>
              <span className="text-[10.5px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Otomatis Timestamp &amp; User: {currentUser?.name || 'User Login'}
              </span>
            </div>

            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />
            <input
              type="file"
              ref={galleryInputRef}
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={isProcessingPhoto}
                onClick={() => cameraInputRef.current?.click()}
                className="py-2.5 px-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4 shrink-0" />
                <span>{isProcessingPhoto ? 'Memproses...' : 'Ambil Foto Kamera'}</span>
              </button>

              <button
                type="button"
                disabled={isProcessingPhoto}
                onClick={() => galleryInputRef.current?.click()}
                className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 border border-slate-200 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4 shrink-0" />
                <span>Upload Foto / Galeri</span>
              </button>
            </div>

            {errorMsg && (
              <p className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200">
                {errorMsg}
              </p>
            )}

            {photoBefore && (
              <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="relative h-44 rounded-xl overflow-hidden bg-slate-900 border border-slate-200">
                  <img
                    src={photoBefore}
                    alt="Pratinjau Foto Bukti Keluhan"
                    className="w-full h-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoBefore('');
                      setPhotoMeta(null);
                    }}
                    title="Hapus Foto"
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-rose-600/90 hover:bg-rose-700 text-white shadow-md cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {photoMeta && (
                  <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900">
                    <span className="font-bold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{photoMeta.timestamp}</span>
                    </span>
                    <span className="font-bold flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>User: {photoMeta.userName}</span>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-800">
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Durasi penanganan otomatis berjalan saat keluhan tiket dikirim.</span>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              id="cancel-complaint-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
            >
              Batal
            </button>
            <button
              id="submit-complaint-btn"
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Kirim Tiket Keluhan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
