import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Camera,
  Upload,
  Image as ImageIcon,
  Trash2,
  Clock,
  MapPin,
  AlertTriangle,
  Info,
  Sparkles,
} from 'lucide-react';
import { Complaint } from '../../types';

interface ResolveComplaintModalProps {
  complaint: Complaint | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmResolve: (
    complaintId: string,
    notes: string,
    photoProgress: string,
    photoResolved: string
  ) => void;
}

export const ResolveComplaintModal: React.FC<ResolveComplaintModalProps> = ({
  complaint,
  isOpen,
  onClose,
  onConfirmResolve,
}) => {
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [photoProgress, setPhotoProgress] = useState('');
  const [photoResolved, setPhotoResolved] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const progressFileInputRef = useRef<HTMLInputElement>(null);
  const resolvedFileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens or complaint changes
  useEffect(() => {
    if (isOpen && complaint) {
      setResolutionNotes('');
      setPhotoProgress('');
      setPhotoResolved('');
      setErrorMessage(null);
      setAttemptedSubmit(false);
    }
  }, [isOpen, complaint]);

  // Handle escape key
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

  if (!isOpen || !complaint) return null;

  // File upload handlers
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'progress' | 'resolved'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to DataURL base64 for reliable instant preview and storage
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (type === 'progress') {
        setPhotoProgress(result);
      } else {
        setPhotoResolved(result);
      }
      setErrorMessage(null);
    };
    reader.readAsDataURL(file);
    // Reset file input value to allow re-uploading same file if desired
    e.target.value = '';
  };

  // Quick preset sample photos for fast testing
  const sampleProgressPhotos = [
    {
      label: 'Petugas Sedang Mengepel',
      url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop&q=80',
    },
    {
      label: 'Pembersihan Sanitasi',
      url: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=600&auto=format&fit=crop&q=80',
    },
    {
      label: 'Pengangkutan Sampah',
      url: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=600&auto=format&fit=crop&q=80',
    },
  ];

  const sampleResolvedPhotos = [
    {
      label: 'Lantai Bersih Kering',
      url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80',
    },
    {
      label: 'Area Rapi & Mengkilap',
      url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&auto=format&fit=crop&q=80',
    },
    {
      label: 'Sanitasi Steril Higienis',
      url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=80',
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);

    const hasNotes = resolutionNotes.trim().length > 0;
    const hasProgressPhoto = Boolean(photoProgress);
    const hasResolvedPhoto = Boolean(photoResolved);

    // Strict validation: All 3 fields are mandatory
    if (!hasNotes || !hasProgressPhoto || !hasResolvedPhoto) {
      setErrorMessage('lengkapi data penanganan terlebih dahulu');
      return;
    }

    // All requirements met
    setErrorMessage(null);
    onConfirmResolve(
      complaint.id,
      resolutionNotes.trim(),
      photoProgress,
      photoResolved
    );
    onClose();
  };

  const isNotesMissing = attemptedSubmit && !resolutionNotes.trim();
  const isProgressPhotoMissing = attemptedSubmit && !photoProgress;
  const isResolvedPhotoMissing = attemptedSubmit && !photoResolved;

  return (
    <div
      id="resolve-complaint-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        id="resolve-complaint-card"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[94vh]"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                  Selesaikan Penanganan Komplain
                </h3>
                <span className="font-mono text-[11px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {complaint.ticketNumber}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5 truncate">
                Lengkapi keterangan, foto progres pengerjaan, dan foto hasil akhir area
              </p>
            </div>
          </div>
          <button
            id="close-resolve-modal-btn"
            type="button"
            onClick={onClose}
            aria-label="Tutup Dialog Penanganan"
            className="p-2 rounded-full text-slate-500 hover:text-slate-900 bg-emerald-100/70 hover:bg-emerald-200 active:bg-emerald-300 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Ticket Information Overview */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900">{complaint.category}</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-600 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {complaint.areaName} ({complaint.floor})
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Batas SLA: <strong>{complaint.slaDeadline}</strong></span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-white border border-slate-200/70 text-slate-700">
              <span className="font-semibold text-slate-500 text-[10px] block uppercase tracking-wider mb-0.5">
                Keluhan Pelapor ({complaint.reporterName} - {complaint.reporterRole}):
              </span>
              "{complaint.description}"
            </div>

            {complaint.photoBefore && (
              <div className="flex items-center gap-2 text-[11px] text-slate-600 pt-1">
                <span className="font-medium text-slate-500">Foto Bukti Awal:</span>
                <a
                  href={complaint.photoBefore}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-600 hover:text-sky-800 underline font-medium flex items-center gap-1"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  Lihat Foto Keluhan Pelapor
                </a>
              </div>
            )}
          </div>

          {/* Validation Warning Alert - Triggered when user attempts to submit without completing mandatory data */}
          {errorMessage && (
            <div
              id="resolve-validation-alert"
              className="p-3.5 rounded-xl bg-rose-50 border-2 border-rose-400 text-rose-800 flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200 shadow-sm"
            >
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-rose-900 text-xs sm:text-sm uppercase tracking-wide">
                  {errorMessage}
                </p>
                <p className="text-rose-700 mt-0.5">
                  Untuk mengonfirmasi selesai, Anda wajib melengkapi:
                  <strong> (1) Keterangan Penanganan</strong>, 
                  <strong> (2) Foto Progres Pengerjaan</strong>, dan 
                  <strong> (3) Foto Hasil Akhir (After)</strong>.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 1. Keterangan Penanganan (Wajib) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>1. Keterangan Penanganan</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                    Wajib
                  </span>
                </label>
                <span className="text-[11px] text-slate-400">
                  Uraikan tindakan yang telah dilaksanakan
                </span>
              </div>
              <textarea
                id="complaint-resolution-notes"
                rows={3}
                value={resolutionNotes}
                onChange={(e) => {
                  setResolutionNotes(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Contoh: Pembersihan darurat dan pel lantai telah selesai dilakukan menggunakan disinfektan. Area sudah kering, bersih, dan harum..."
                className={`w-full p-3 text-xs rounded-xl border transition-colors bg-white focus:outline-none focus:ring-2 ${
                  isNotesMissing
                    ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-500/20 focus:border-rose-500'
                    : 'border-slate-300 focus:ring-emerald-500/20 focus:border-emerald-500'
                }`}
              />
              {isNotesMissing && (
                <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Keterangan penanganan wajib diisi.
                </p>
              )}
            </div>

            {/* Two-Column Photo Upload: Progres & Hasil Akhir */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 2. Foto Progres Penanganan (Wajib) */}
              <div
                className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                  isProgressPhotoMissing
                    ? 'border-rose-300 bg-rose-50/30'
                    : photoProgress
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>2. Foto Progres Pengerjaan</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                      Wajib
                    </span>
                  </span>
                  {photoProgress && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                      ✓ Terisi
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Foto saat petugas sedang melakukan penanganan/pembersihan di lokasi
                </p>

                {/* Hidden File Input */}
                <input
                  ref={progressFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'progress')}
                  className="hidden"
                />

                {/* Image Preview or Upload Placeholder */}
                {photoProgress ? (
                  <div className="relative rounded-xl overflow-hidden border border-emerald-300 bg-black aspect-video group">
                    <img
                      src={photoProgress}
                      alt="Foto Progres Penanganan"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => progressFileInputRef.current?.click()}
                        className="p-1.5 rounded-lg bg-white/90 text-slate-800 hover:bg-white text-xs font-semibold flex items-center gap-1 shadow"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Ganti
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhotoProgress('')}
                        className="p-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 text-xs font-semibold flex items-center gap-1 shadow"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Hapus
                      </button>
                    </div>
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] font-medium backdrop-blur-xs">
                      Foto Progres Terunggah
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div
                      onClick={() => progressFileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                        isProgressPhotoMissing
                          ? 'border-rose-400 bg-rose-50 hover:bg-rose-100/70'
                          : 'border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/40'
                      }`}
                    >
                      <Camera className="w-6 h-6 text-slate-400 mb-1" />
                      <span className="text-xs font-semibold text-slate-700">
                        Unggah / Ambil Foto Progres
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        Klik untuk memilih file foto dari perangkat
                      </span>
                    </div>

                    {/* Quick Demo Photo Helpers */}
                    <div className="pt-1">
                      <span className="text-[10px] text-slate-400 font-medium block mb-1">
                        Atau pilih contoh foto cepat:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {sampleProgressPhotos.map((s, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setPhotoProgress(s.url);
                              setErrorMessage(null);
                            }}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-medium text-slate-700 transition-colors"
                          >
                            + {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {isProgressPhotoMissing && (
                  <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Foto progres penanganan wajib diunggah.
                  </p>
                )}
              </div>

              {/* 3. Foto Hasil Akhir (After) (Wajib) */}
              <div
                className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                  isResolvedPhotoMissing
                    ? 'border-rose-300 bg-rose-50/30'
                    : photoResolved
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>3. Foto Hasil Akhir (After)</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                      Wajib
                    </span>
                  </span>
                  {photoResolved && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                      ✓ Terisi
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Foto kondisi akhir area yang telah bersih rapi dan bebas keluhan
                </p>

                {/* Hidden File Input */}
                <input
                  ref={resolvedFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'resolved')}
                  className="hidden"
                />

                {/* Image Preview or Upload Placeholder */}
                {photoResolved ? (
                  <div className="relative rounded-xl overflow-hidden border border-emerald-300 bg-black aspect-video group">
                    <img
                      src={photoResolved}
                      alt="Foto Hasil Akhir"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => resolvedFileInputRef.current?.click()}
                        className="p-1.5 rounded-lg bg-white/90 text-slate-800 hover:bg-white text-xs font-semibold flex items-center gap-1 shadow"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Ganti
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhotoResolved('')}
                        className="p-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 text-xs font-semibold flex items-center gap-1 shadow"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Hapus
                      </button>
                    </div>
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] font-medium backdrop-blur-xs">
                      Foto Hasil Akhir Terunggah
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div
                      onClick={() => resolvedFileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                        isResolvedPhotoMissing
                          ? 'border-rose-400 bg-rose-50 hover:bg-rose-100/70'
                          : 'border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/40'
                      }`}
                    >
                      <Camera className="w-6 h-6 text-slate-400 mb-1" />
                      <span className="text-xs font-semibold text-slate-700">
                        Unggah / Ambil Foto Hasil Akhir
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        Klik untuk memilih file foto dari perangkat
                      </span>
                    </div>

                    {/* Quick Demo Photo Helpers */}
                    <div className="pt-1">
                      <span className="text-[10px] text-slate-400 font-medium block mb-1">
                        Atau pilih contoh foto cepat:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {sampleResolvedPhotos.map((s, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setPhotoResolved(s.url);
                              setErrorMessage(null);
                            }}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-medium text-slate-700 transition-colors"
                          >
                            + {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {isResolvedPhotoMissing && (
                  <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Foto hasil akhir wajib diunggah.
                  </p>
                )}
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-[11px] text-slate-500">
                * Konfirmasi penyelesaian hanya dapat dilakukan bila semua data terisi lengkap.
              </p>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>

                <button
                  id="submit-resolve-complaint-btn"
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs shadow-md shadow-emerald-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Konfirmasi Selesai Ditangani</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
