import React, { useState } from 'react';
import { X, ArrowLeftRight, CheckCircle2, Clock, MapPin, User } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
              <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Terverifikasi
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {areaName}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                {cleanerName}
              </span>
              {completedTime && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {completedTime}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-200/70 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setViewMode('3-stage')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  viewMode === '3-stage' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                3 Tahap (B-P-A)
              </button>
              <button
                onClick={() => setViewMode('slider')}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                  viewMode === 'slider' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                Slider Before/After
              </button>
              <button
                onClick={() => setViewMode('side-by-side')}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                  viewMode === 'side-by-side' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                Side by Side
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Image Viewer */}
        <div className="p-4">
          {viewMode === '3-stage' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* 1. Before */}
              <div className="space-y-1.5">
                <div className="relative h-56 sm:h-64 rounded-xl overflow-hidden bg-slate-900 border border-slate-200">
                  <img
                    src={defaultBefore}
                    alt="Sebelum (Before)"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 left-2 bg-rose-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                    1. BEFORE (SEBELUM)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 text-center font-medium">Kondisi awal sebelum dibersihkan</p>
              </div>

              {/* 2. Progress */}
              <div className="space-y-1.5">
                <div className="relative h-56 sm:h-64 rounded-xl overflow-hidden bg-slate-900 border border-slate-200">
                  <img
                    src={defaultProgress}
                    alt="Saat Pengerjaan (Progress)"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 left-2 bg-amber-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                    2. PROGRESS (PROSES)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 text-center font-medium">Proses pengerjaan kebersihan berjalan</p>
              </div>

              {/* 3. After */}
              <div className="space-y-1.5">
                <div className="relative h-56 sm:h-64 rounded-xl overflow-hidden bg-slate-900 border border-slate-200">
                  <img
                    src={defaultAfter}
                    alt="Sesudah (After)"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 right-2 bg-emerald-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                    3. AFTER (SESUDAH)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 text-center font-medium">Hasil akhir bersih & terstandarisasi</p>
              </div>
            </div>
          ) : viewMode === 'slider' ? (
            <div className="space-y-2">
              <div className="relative w-full h-80 sm:h-96 rounded-xl overflow-hidden select-none bg-slate-900">
                {/* After Image (Background) */}
                <img
                  src={defaultAfter}
                  alt="Sesudah (After)"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3 bg-emerald-600/90 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow-sm">
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
                  />
                  <div className="absolute top-3 left-3 bg-rose-600/90 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow-sm">
                    SEBELUM (BEFORE)
                  </div>
                </div>

                {/* Divider Line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none"
                  style={{ left: `${sliderPos}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white text-slate-800 shadow-xl flex items-center justify-center">
                    <ArrowLeftRight className="w-4 h-4 text-sky-600" />
                  </div>
                </div>
              </div>

              {/* Slider Control */}
              <div className="flex items-center gap-3 px-2">
                <span className="text-xs font-semibold text-rose-600">Sebelum (Before)</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sliderPos}
                  onChange={(e) => setSliderPos(Number(e.target.value))}
                  className="flex-1 accent-sky-600 cursor-pointer"
                />
                <span className="text-xs font-semibold text-emerald-600">Sesudah (After)</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="relative h-64 sm:h-80 rounded-xl overflow-hidden bg-slate-900 border border-slate-200">
                  <img
                    src={defaultBefore}
                    alt="Sebelum (Before)"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 left-2 bg-rose-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                    KONDISI AWAL (BEFORE)
                  </span>
                </div>
                <p className="text-xs text-slate-500 text-center">Foto saat petugas memulai tugas</p>
              </div>

              <div className="space-y-1.5">
                <div className="relative h-64 sm:h-80 rounded-xl overflow-hidden bg-slate-900 border border-slate-200">
                  <img
                    src={defaultAfter}
                    alt="Sesudah (After)"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 right-2 bg-emerald-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                    KONDISI AKHIR (AFTER)
                  </span>
                </div>
                <p className="text-xs text-slate-500 text-center">Hasil pengerjaan sesuai standar kebersihan</p>
              </div>
            </div>
          )}

          {remarks && (
            <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="font-bold text-slate-700 block mb-0.5">
                Catatan Petugas (Remark):
              </span>
              <p className="text-slate-600 italic">"{remarks}"</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
          >
            Tutup Pratinjau
          </button>
        </div>
      </div>
    </div>
  );
};
