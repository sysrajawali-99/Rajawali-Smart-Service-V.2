import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  MapPin,
  User,
  ShieldCheck,
  Maximize2,
  Columns3,
  Layers,
  Split,
  ZoomIn,
} from 'lucide-react';

interface BeforeAfterModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  areaName: string;
  cleanerName: string;
  photoBefore?: string;
  photoProgress?: string;
  photoAfter?: string;
  completedTime?: string;
  remarks?: string;
}

export const BeforeAfterModal: React.FC<BeforeAfterModalProps> = ({
  isOpen,
  onClose,
  title,
  areaName,
  cleanerName,
  photoBefore,
  photoProgress,
  photoAfter,
  completedTime,
  remarks,
}) => {
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [viewMode, setViewMode] = useState<'3-stage' | 'slider' | 'side-by-side'>('3-stage');
  const [zoomedPhoto, setZoomedPhoto] = useState<{ url: string; title: string; stage: string } | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (zoomedPhoto) {
          setZoomedPhoto(null);
        } else {
          onClose();
        }
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
  }, [isOpen, onClose, zoomedPhoto]);

  if (!isOpen) return null;

  const defaultBefore =
    photoBefore ||
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&auto=format&fit=crop&q=80';
  const defaultProgress =
    photoProgress ||
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop&q=80';
  const defaultAfter =
    photoAfter ||
    'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=800&auto=format&fit=crop&q=80';

  return (
    <div
      id="before-after-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-2 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        id="before-after-modal-card"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-4xl w-full max-h-[95dvh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header: Optimized for Mobile & Desktop */}
        <div className="p-3.5 sm:p-5 border-b border-slate-200 bg-slate-50/90 flex flex-col gap-3 shrink-0">
          {/* Top Row: Title, Status Badge, and Prominent Close Button */}
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                <span className="bg-emerald-100 text-emerald-800 text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Terverifikasi
                </span>
                <span className="text-[10px] sm:text-[11px] font-mono text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-md shrink-0">
                  SOP-QC-2026
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug break-words">
                {title}
              </h3>
            </div>

            {/* Prominent, touch-friendly close button */}
            <button
              id="close-before-after-modal-btn"
              type="button"
              onClick={onClose}
              aria-label="Tutup Jendela Verifikasi"
              className="p-2 sm:p-2.5 rounded-full text-slate-500 hover:text-slate-900 bg-slate-200/80 hover:bg-slate-300 active:bg-slate-400 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 cursor-pointer shadow-2xs"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Metadata Row: Location, Cleaner, Time */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-600">
            <span className="flex items-center gap-1 font-medium">
              <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <strong className="text-slate-800">{areaName}</strong>
            </span>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Petugas: <strong className="text-slate-700">{cleanerName}</strong></span>
            </span>
            {completedTime && (
              <>
                <span className="text-slate-300 hidden sm:inline">•</span>
                <span className="flex items-center gap-1 text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{completedTime}</span>
                </span>
              </>
            )}
            <span className="text-slate-300 hidden sm:inline">•</span>
            <span className="inline-flex items-center gap-1 text-[11px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md font-medium border border-teal-200">
              <ShieldCheck className="w-3 h-3 text-teal-600" />
              <span>Watermark Valid</span>
            </span>
          </div>

          {/* Mode Selector: Mobile-Friendly Segmented Control */}
          <div className="grid grid-cols-3 gap-1 bg-slate-200/80 p-1 rounded-xl text-xs font-semibold select-none">
            <button
              id="view-mode-3stage-btn"
              type="button"
              onClick={() => setViewMode('3-stage')}
              className={`py-2 px-1.5 sm:px-3 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[38px] ${
                viewMode === '3-stage'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-900/5'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns3 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate">3 Tahap (B-P-A)</span>
            </button>
            <button
              id="view-mode-slider-btn"
              type="button"
              onClick={() => setViewMode('slider')}
              className={`py-2 px-1.5 sm:px-3 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[38px] ${
                viewMode === 'slider'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-900/5'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="truncate">Slider Geser</span>
            </button>
            <button
              id="view-mode-sidebyside-btn"
              type="button"
              onClick={() => setViewMode('side-by-side')}
              className={`py-2 px-1.5 sm:px-3 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[38px] ${
                viewMode === 'side-by-side'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-900/5'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Split className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">Side by Side</span>
            </button>
          </div>
        </div>

        {/* Modal Body / Image Viewer (Scrollable on small phones) */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 overscroll-contain bg-slate-100/40">
          {viewMode === '3-stage' ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* 1. Before */}
              <div className="space-y-1.5 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] sm:text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    1. SEBELUM (BEFORE)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Kondisi Awal</span>
                </div>
                <div
                  onClick={() => setZoomedPhoto({ url: defaultBefore, title: areaName, stage: '1. Kondisi Sebelum (Before)' })}
                  className="relative aspect-4/3 sm:aspect-square md:aspect-4/3 rounded-xl overflow-hidden bg-slate-950 border border-slate-200 shadow-2xs group cursor-pointer"
                >
                  <img
                    src={defaultBefore}
                    alt="Sebelum (Before)"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span className="px-2.5 py-1 bg-black/75 text-white text-[11px] font-semibold rounded-lg flex items-center gap-1 shadow-sm">
                      <ZoomIn className="w-3.5 h-3.5" /> Perbesar
                    </span>
                  </div>
                  <span className="absolute bottom-1.5 left-1.5 bg-slate-950/80 backdrop-blur-xs text-white text-[9px] font-mono px-2 py-0.5 rounded">
                    Timestamp: Terverifikasi
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 text-center font-medium px-1">
                  Kondisi fisik area sebelum dilakukan tindakan pembersihan
                </p>
              </div>

              {/* 2. Progress */}
              <div className="space-y-1.5 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] sm:text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    2. PROSES (PROGRESS)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Pengerjaan</span>
                </div>
                <div
                  onClick={() => setZoomedPhoto({ url: defaultProgress, title: areaName, stage: '2. Proses Pengerjaan (Progress)' })}
                  className="relative aspect-4/3 sm:aspect-square md:aspect-4/3 rounded-xl overflow-hidden bg-slate-950 border border-slate-200 shadow-2xs group cursor-pointer"
                >
                  <img
                    src={defaultProgress}
                    alt="Saat Pengerjaan (Progress)"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span className="px-2.5 py-1 bg-black/75 text-white text-[11px] font-semibold rounded-lg flex items-center gap-1 shadow-sm">
                      <ZoomIn className="w-3.5 h-3.5" /> Perbesar
                    </span>
                  </div>
                  <span className="absolute bottom-1.5 left-1.5 bg-slate-950/80 backdrop-blur-xs text-white text-[9px] font-mono px-2 py-0.5 rounded">
                    SOP & Chemical: Sesuai
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 text-center font-medium px-1">
                  Petugas mengeksekusi sanitasi, scrubbing, dan refill supplies
                </p>
              </div>

              {/* 3. After */}
              <div className="space-y-1.5 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    3. SESUDAH (AFTER)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Hasil Akhir</span>
                </div>
                <div
                  onClick={() => setZoomedPhoto({ url: defaultAfter, title: areaName, stage: '3. Hasil Akhir (After)' })}
                  className="relative aspect-4/3 sm:aspect-square md:aspect-4/3 rounded-xl overflow-hidden bg-slate-950 border border-slate-200 shadow-2xs group cursor-pointer"
                >
                  <img
                    src={defaultAfter}
                    alt="Sesudah (After)"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span className="px-2.5 py-1 bg-black/75 text-white text-[11px] font-semibold rounded-lg flex items-center gap-1 shadow-sm">
                      <ZoomIn className="w-3.5 h-3.5" /> Perbesar
                    </span>
                  </div>
                  <span className="absolute bottom-1.5 left-1.5 bg-slate-950/80 backdrop-blur-xs text-white text-[9px] font-mono px-2 py-0.5 rounded">
                    Standar Mutu: Terpenuhi
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 text-center font-medium px-1">
                  Area telah higienis, kering, rapi, harum, dan siap inspeksi
                </p>
              </div>
            </div>
          ) : viewMode === 'slider' ? (
            <div className="space-y-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="relative w-full aspect-4/3 sm:aspect-16/10 md:h-[380px] rounded-xl overflow-hidden select-none bg-slate-950 border border-slate-200">
                {/* After Image (Background) */}
                <img
                  src={defaultAfter}
                  alt="Sesudah (After)"
                  className="absolute inset-0 w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-2.5 right-2.5 bg-emerald-700/90 backdrop-blur-xs text-white text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-md shadow-sm">
                  SESUDAH (AFTER)
                </div>

                {/* Before Image (Clipped) */}
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${sliderPos}%` }}
                >
                  <img
                    src={defaultBefore}
                    alt="Sebelum (Before)"
                    className="absolute inset-0 w-full h-full object-cover max-w-none"
                    style={{ width: '100%', minWidth: '100%' }}
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2.5 left-2.5 bg-rose-700/90 backdrop-blur-xs text-white text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-md shadow-sm">
                    SEBELUM (BEFORE)
                  </div>
                </div>

                {/* Divider Line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white shadow-xl pointer-events-none"
                  style={{ left: `${sliderPos}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white text-slate-900 shadow-2xl flex items-center justify-center border border-slate-300">
                    <ArrowLeftRight className="w-4 h-4 text-sky-600" />
                  </div>
                </div>
              </div>

              {/* Slider Control with labels */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold px-1">
                  <span className="text-rose-600">SEBELUM ({100 - sliderPos}%)</span>
                  <span className="text-slate-400 font-normal text-[11px]">Geser untuk membandingkan</span>
                  <span className="text-emerald-600">SESUDAH ({sliderPos}%)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sliderPos}
                  onChange={(e) => setSliderPos(Number(e.target.value))}
                  className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600 min-h-[32px]"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] sm:text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded border border-rose-200">
                    KONDISI AWAL (BEFORE)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">13/09/2026</span>
                </div>
                <div
                  onClick={() => setZoomedPhoto({ url: defaultBefore, title: areaName, stage: 'Kondisi Awal (Before)' })}
                  className="relative aspect-4/3 sm:aspect-square md:aspect-4/3 rounded-xl overflow-hidden bg-slate-950 border border-slate-200 cursor-pointer group"
                >
                  <img
                    src={defaultBefore}
                    alt="Sebelum (Before)"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span className="px-2.5 py-1 bg-black/75 text-white text-[11px] font-semibold rounded-lg flex items-center gap-1 shadow-sm">
                      <ZoomIn className="w-3.5 h-3.5" /> Perbesar
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 text-center font-medium">Foto saat petugas memulai tugas kebersihan</p>
              </div>

              <div className="space-y-1.5 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                    KONDISI AKHIR (AFTER)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">13/09/2026</span>
                </div>
                <div
                  onClick={() => setZoomedPhoto({ url: defaultAfter, title: areaName, stage: 'Kondisi Akhir (After)' })}
                  className="relative aspect-4/3 sm:aspect-square md:aspect-4/3 rounded-xl overflow-hidden bg-slate-950 border border-slate-200 cursor-pointer group"
                >
                  <img
                    src={defaultAfter}
                    alt="Sesudah (After)"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span className="px-2.5 py-1 bg-black/75 text-white text-[11px] font-semibold rounded-lg flex items-center gap-1 shadow-sm">
                      <ZoomIn className="w-3.5 h-3.5" /> Perbesar
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 text-center font-medium">Hasil pengerjaan sesuai standar kebersihan dan sanitasi</p>
              </div>
            </div>
          )}

          {remarks && (
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900">
              <span className="font-bold block mb-1 flex items-center gap-1">
                💬 Catatan Lapangan / Temuan Petugas:
              </span>
              <p className="italic text-slate-700">"{remarks}"</p>
            </div>
          )}
        </div>

        {/* Modal Footer: Guaranteed reachable on phone, large touch targets */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px] sm:text-xs text-center sm:text-left">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mx-auto sm:mx-0" />
            <span>Dokumentasi 3-Tahap resmi tersinkronisasi ke laporan bulanan klien</span>
          </div>

          <button
            id="dismiss-before-after-modal-btn"
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-black active:bg-slate-800 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
          >
            <span>Tutup Pratinjau</span>
          </button>
        </div>
      </div>

      {/* Fullscreen Photo Zoom Lightbox */}
      {zoomedPhoto && (
        <div
          id="photo-zoom-lightbox"
          onClick={() => setZoomedPhoto(null)}
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-6 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-4xl flex items-center justify-between text-white pb-3">
            <div>
              <span className="text-xs font-bold text-sky-400 block">{zoomedPhoto.stage}</span>
              <h4 className="text-sm sm:text-base font-bold text-white">{zoomedPhoto.title}</h4>
            </div>
            <button
              id="close-zoom-lightbox-btn"
              type="button"
              onClick={() => setZoomedPhoto(null)}
              className="p-2.5 rounded-full bg-white/20 hover:bg-white/30 text-white min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer transition-colors"
              aria-label="Tutup Perbesaran"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            className="flex-1 max-w-4xl w-full flex items-center justify-center overflow-hidden p-2"
          >
            <img
              src={zoomedPhoto.url}
              alt={zoomedPhoto.stage}
              className="max-w-full max-h-[80dvh] object-contain rounded-xl shadow-2xl"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="w-full max-w-4xl pt-3 flex items-center justify-between text-slate-400 text-xs">
            <span>Klik di luar gambar atau tombol Tutup untuk kembali</span>
            <button
              type="button"
              onClick={() => setZoomedPhoto(null)}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-lg min-h-[40px]"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

