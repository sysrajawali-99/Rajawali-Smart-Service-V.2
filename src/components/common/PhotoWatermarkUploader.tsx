import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  RefreshCw,
  Eye,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { analyzePhotoWatermark, createWatermarkedPhoto } from '../../utils/watermarkAnalyzer';

interface PhotoWatermarkUploaderProps {
  label: string;
  sublabel?: string;
  stage: 'before' | 'progress' | 'after';
  currentPhoto: string;
  onPhotoAccepted: (photoUrl: string) => void;
  areaName?: string;
  cleanerName?: string;
}

export const PhotoWatermarkUploader: React.FC<PhotoWatermarkUploaderProps> = ({
  label,
  sublabel,
  stage,
  currentPhoto,
  onPhotoAccepted,
  areaName = 'Menara Mandiri Lt. 2',
  cleanerName = 'Petugas Lapangan',
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisSuccess, setAnalysisSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stock base photos used for simulation
  const stockImages = {
    before: [
      'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=700&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=700&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=700&auto=format&fit=crop&q=80',
    ],
    progress: [
      'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=700&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=700&auto=format&fit=crop&q=80',
    ],
    after: [
      'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=700&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=700&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=700&auto=format&fit=crop&q=80',
    ],
  };

  const processAndValidateImage = async (
    imageSrc: string | File,
    explicitDateTag?: string
  ) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisSuccess(null);

    try {
      // Analisa otomatis watermark tanggal/bulan/tahun
      const analysis = await analyzePhotoWatermark(imageSrc, explicitDateTag);

      if (!analysis.isValid) {
        // Foto ditolak karena tidak ada watermark tanggal/bulan/tahun!
        setAnalysisError(
          analysis.reason ||
            'Upload Ditolak: Foto tidak terdeteksi memiliki watermark tanggal/bulan/tahun (contoh: 13/09/2026). Pastikan foto diambil dengan Timestamp Camera.'
        );
        setIsAnalyzing(false);
        return false;
      }

      // Validasi berhasil!
      const finalUrl =
        typeof imageSrc === 'string'
          ? imageSrc
          : await new Promise<string>((res) => {
              const r = new FileReader();
              r.onload = () => res(r.result as string);
              r.readAsDataURL(imageSrc);
            });

      setAnalysisSuccess(
        `✓ Watermark Terverifikasi: Tanggal ${analysis.detectedDate || '13/09/2026'}`
      );
      onPhotoAccepted(finalUrl);
      setIsAnalyzing(false);
      setTimeout(() => setShowModal(false), 1200);
      return true;
    } catch {
      setAnalysisError('Terjadi kesalahan saat memproses gambar.');
      setIsAnalyzing(false);
      return false;
    }
  };

  // Handler: Ambil foto kamera dengan auto watermark tanggal GPS
  const handleCaptureWithGPSWatermark = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    const basePhoto = stockImages[stage][0];

    const todayDate = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    // Buat foto dengan watermark canvas resmi
    const watermarkedData = await createWatermarkedPhoto(basePhoto, {
      location: `${areaName}`,
      cleanerName,
      customDate: todayDate,
    });

    // Validasi otomatis melalui analyzer
    await processAndValidateImage(watermarkedData, todayDate);
  };

  // Handler: Simulasi upload foto tanpa watermark (UJI COBA PENOLAKAN)
  const handleSimulateUnwatermarkedPhoto = async () => {
    const plainPhotoWithoutWatermark =
      'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=500&auto=format&fit=crop&q=80';
    // Gambar ini tidak berwatermark dan tidak memiliki tag tanggal
    await processAndValidateImage(plainPhotoWithoutWatermark);
  };

  // Handler: Upload file dari disk
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAndValidateImage(file);
    }
    // reset input
    if (e.target) e.target.value = '';
  };

  const getStageBadge = () => {
    switch (stage) {
      case 'before':
        return { label: 'BEFORE', bg: 'bg-rose-500 text-white' };
      case 'progress':
        return { label: 'PROGRESS', bg: 'bg-amber-500 text-white' };
      case 'after':
        return { label: 'AFTER', bg: 'bg-emerald-500 text-white' };
    }
  };

  const badge = getStageBadge();

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${badge.bg}`}>
            {badge.label}
          </span>
          {label}
        </span>
        {sublabel && <span className="text-[10px] text-slate-400">{sublabel}</span>}
      </div>

      {/* Photo Frame Container */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 h-32 flex flex-col justify-between group shadow-xs">
        {currentPhoto ? (
          <>
            <img
              src={currentPhoto}
              alt={label}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {/* Watermark verified overlay indicator */}
            <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white px-2 py-0.5 rounded-md text-[9px] font-mono flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Watermark Tanggal: Valid</span>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-slate-400">
            <Camera className="w-8 h-8 text-slate-300" />
            <span className="text-[11px] font-medium mt-1">Belum ada foto</span>
            <span className="text-[9px] text-slate-400">Wajib watermark tanggal</span>
          </div>
        )}

        {/* Action button bar */}
        <div className="absolute bottom-2 inset-x-2 flex gap-1.5">
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex-1 py-1.5 px-2.5 rounded-xl bg-slate-900/90 hover:bg-black text-white text-[11px] font-semibold flex items-center justify-center gap-1 backdrop-blur-xs transition-colors shadow-sm"
          >
            <Camera className="w-3.5 h-3.5 text-sky-400" />
            <span>{currentPhoto ? 'Ganti Foto' : 'Ambil / Upload Foto'}</span>
          </button>
        </div>
      </div>

      {/* Upload & Watermark Verification Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-sky-600" />
                  Upload & Analisa Watermark
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {label} • {areaName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setAnalysisError(null);
                  setAnalysisSuccess(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Analysis State Indicators */}
            {isAnalyzing && (
              <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 flex items-center gap-3 text-xs text-sky-800">
                <RefreshCw className="w-5 h-5 text-sky-600 animate-spin shrink-0" />
                <div>
                  <strong className="block font-bold">Menganalisa Watermark Foto...</strong>
                  <span className="text-[11px] text-sky-600">
                    Memeriksa stempel tanggal/bulan/tahun (DD/MM/YYYY)
                  </span>
                </div>
              </div>
            )}

            {analysisError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1.5 animate-shake">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-xs font-bold block">❌ Upload Foto GAGAL!</strong>
                    <p className="text-[11px] leading-relaxed text-rose-700">
                      {analysisError}
                    </p>
                  </div>
                </div>
                <p className="text-[10px] text-rose-600 font-medium pt-1 border-t border-rose-200/60">
                  💡 Gunakan tombol kamera ber-timestamp di bawah untuk menyertakan tanggal otomatis.
                </p>
              </div>
            )}

            {analysisSuccess && (
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{analysisSuccess}</span>
              </div>
            )}

            {/* Action Options */}
            <div className="space-y-2.5 pt-1">
              {/* Option 1: Kamera GPS Resmi (Pasti Lolos) */}
              <button
                type="button"
                disabled={isAnalyzing}
                onClick={handleCaptureWithGPSWatermark}
                className="w-full p-3 rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center justify-between shadow-md transition-all active:scale-[0.99] disabled:opacity-50"
              >
                <div className="flex items-center gap-2.5 text-left">
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                    <Camera className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold leading-tight">
                      Ambil Foto GPS & Timestamp
                    </span>
                    <span className="block text-[10px] text-sky-100 font-normal">
                      Otomatis stempel tanggal (13/09/2026) & lokasi
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
                  Lolos ✓
                </span>
              </button>

              {/* Option 2: Upload File Lokal */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelected}
              />
              <button
                type="button"
                disabled={isAnalyzing}
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-between transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-2.5 text-left">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
                    <Upload className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold">Upload File dari Perangkat</span>
                    <span className="block text-[10px] text-slate-500 font-normal">
                      Sistem akan menganalisa watermark tanggal
                    </span>
                  </div>
                </div>
              </button>

              {/* Option 3: Test Penolakan (Simulasi Foto Polos Tanpa Watermark) */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1.5">
                  Uji Coba Validasi Watermark:
                </span>
                <button
                  type="button"
                  disabled={isAnalyzing}
                  onClick={handleSimulateUnwatermarkedPhoto}
                  className="w-full py-2 px-3 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                    Uji Upload Foto Tanpa Watermark
                  </span>
                  <span className="text-[10px] bg-rose-200 text-rose-800 px-1.5 py-0.5 rounded font-bold">
                    Test Penolakan ✕
                  </span>
                </button>
              </div>
            </div>

            <div className="pt-2 text-center">
              <span className="text-[10px] text-slate-400">
                Aturan SOP: Foto tanpa watermark tanggal/bulan/tahun ditolak otomatis oleh sistem.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
