import React, { useState, useEffect } from 'react';
import { X, Clock, AlertCircle, Plus, Send } from 'lucide-react';
import { Complaint } from '../../types';

interface RequestExtensionModalProps {
  isOpen: boolean;
  onClose: () => void;
  complaint: Complaint | null;
  onSubmitExtension: (complaintId: string, hours: number, reason: string) => void;
}

export const RequestExtensionModal: React.FC<RequestExtensionModalProps> = ({
  isOpen,
  onClose,
  complaint,
  onSubmitExtension,
}) => {
  const [hours, setHours] = useState<number>(1);
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setHours(1);
      setReason('');
      setErrorMsg('');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !complaint) return null;

  const quickHours = [1, 2, 3, 4, 6, 8, 12];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hours <= 0) {
      setErrorMsg('Pilih durasi tambahan waktu minimal 1 jam.');
      return;
    }
    if (!reason.trim() || reason.trim().length < 5) {
      setErrorMsg('Mohon isi alasan pengajuan perpanjangan waktu secara jelas (min. 5 karakter).');
      return;
    }

    onSubmitExtension(complaint.id, hours, reason.trim());
    onClose();
  };

  return (
    <div
      id="request-extension-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        id="request-extension-modal-card"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92dvh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-amber-50/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                Ajukan Tambahan Waktu Pengerjaan
              </h3>
              <p className="text-xs text-slate-600 truncate">
                Tiket {complaint.ticketNumber} • {complaint.areaName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="p-2 rounded-full text-slate-500 hover:text-slate-900 bg-amber-100/70 hover:bg-amber-200 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-600 space-y-1">
            <div className="font-semibold text-slate-800 text-xs">
              Kendala: {complaint.category}
            </div>
            <p className="text-[11px] text-slate-500 line-clamp-2">
              "{complaint.description}"
            </p>
            <div className="text-[11px] text-slate-500 pt-1">
              Pelapor: <strong className="text-slate-700">{complaint.reporterName}</strong> • SLA Awal:{' '}
              <strong className="text-slate-700">{complaint.slaHours || 1} Jam</strong> ({complaint.slaDeadline})
            </div>
          </div>

          {/* Hours Selection */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5 text-xs">
              Tambahan Durasi Pengerjaan (dalam hitungan jam) <span className="text-rose-600">*</span>
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 mb-2">
              {quickHours.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHours(h)}
                  className={`py-2 px-1 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center min-h-[46px] cursor-pointer ${
                    hours === h
                      ? 'bg-amber-500 border-amber-500 text-white shadow-xs'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>+{h}</span>
                  <span className="text-[10px] font-medium opacity-80">Jam</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] text-slate-500">Atau tentukan jam manual:</span>
              <div className="inline-flex items-center border border-slate-200 rounded-lg px-2 py-1 bg-white">
                <input
                  type="number"
                  min="1"
                  max="72"
                  value={hours}
                  onChange={(e) => setHours(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-12 font-bold text-slate-800 text-center outline-none"
                />
                <span className="text-slate-500 text-[11px] ml-1">Jam</span>
              </div>
            </div>
          </div>

          {/* Reason Input */}
          <div>
            <label className="block font-bold text-slate-800 mb-1 text-xs">
              Alasan Pengajuan Tambahan Waktu <span className="text-rose-600">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="Contoh: Memerlukan waktu pengeringan lantai secara intensif, atau peralatan khusus sedang diambil dari gudang pusat..."
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none text-xs"
              required
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Pengajuan ini akan dikirimkan langsung ke pembuat tiket untuk disetujui, direvisi, atau ditolak.
            </p>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold min-h-[44px] flex items-center justify-center cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold transition-colors shadow-xs min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Kirim Pengajuan Tambahan Waktu</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
