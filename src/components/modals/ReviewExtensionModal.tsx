import React, { useState, useEffect } from 'react';
import { X, Clock, CheckCircle2, XCircle, Edit3, AlertCircle, Send } from 'lucide-react';
import { Complaint } from '../../types';

interface ReviewExtensionModalProps {
  isOpen: boolean;
  onClose: () => void;
  complaint: Complaint | null;
  onRespondExtension: (
    complaintId: string,
    action: 'approve' | 'revise' | 'reject',
    revisedHours?: number,
    reviewNotes?: string
  ) => void;
}

export const ReviewExtensionModal: React.FC<ReviewExtensionModalProps> = ({
  isOpen,
  onClose,
  complaint,
  onRespondExtension,
}) => {
  const [activeTab, setActiveTab] = useState<'approve' | 'revise' | 'reject'>('approve');
  const [revisedHours, setRevisedHours] = useState<number>(1);
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    if (isOpen && complaint?.extensionRequest) {
      setRevisedHours(Math.max(1, Math.floor(complaint.extensionRequest.requestedHours / 2) || 1));
      setReviewNotes('');
      setActiveTab('approve');
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
  }, [isOpen, complaint, onClose]);

  if (!isOpen || !complaint || !complaint.extensionRequest) return null;

  const ext = complaint.extensionRequest;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'approve') {
      onRespondExtension(complaint.id, 'approve', undefined, reviewNotes.trim() || undefined);
    } else if (activeTab === 'revise') {
      onRespondExtension(complaint.id, 'revise', Math.max(1, revisedHours), reviewNotes.trim() || undefined);
    } else if (activeTab === 'reject') {
      onRespondExtension(complaint.id, 'reject', undefined, reviewNotes.trim() || undefined);
    }
    onClose();
  };

  return (
    <div
      id="review-extension-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        id="review-extension-modal-card"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92dvh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-amber-50/90 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                Verifikasi Pengajuan Tambahan Waktu
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

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
          {/* Extension details banner */}
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2 text-slate-700">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                Permintaan Petugas: +{ext.requestedHours} Jam
              </span>
              <span className="text-[10px] text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded-md font-semibold">
                {ext.requestedAt}
              </span>
            </div>
            <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/80 text-xs">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Alasan Petugas:</span>
              <p className="text-slate-800 font-medium italic mt-0.5">"{ext.reason}"</p>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between">
              <span>Diajukan oleh: <strong className="text-slate-700">{ext.requestedBy}</strong></span>
              <span>SLA Awal: <strong className="text-slate-700">{complaint.slaHours || 1} Jam</strong></span>
            </div>
          </div>

          {/* Action Choice Tabs */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              Tindakan Pembuat Tiket / Pengawas:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('approve')}
                className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 min-h-[54px] cursor-pointer ${
                  activeTab === 'approve'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-400'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Setujui Penuh (+{ext.requestedHours}j)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('revise')}
                className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 min-h-[54px] cursor-pointer ${
                  activeTab === 'revise'
                    ? 'bg-sky-50 border-sky-500 text-sky-800 ring-2 ring-sky-400'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Edit3 className="w-4 h-4 text-sky-600" />
                <span>Revisi Durasi Jam</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('reject')}
                className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 min-h-[54px] cursor-pointer ${
                  activeTab === 'reject'
                    ? 'bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-400'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Tolak Pengajuan</span>
              </button>
            </div>
          </div>

          {/* If Revise is selected */}
          {activeTab === 'revise' && (
            <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-2 animate-in fade-in duration-150">
              <label className="block font-bold text-sky-900 text-xs">
                Tentukan Revisi Durasi yang Disetujui (dalam hitungan jam):
              </label>
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center bg-white border border-sky-300 rounded-xl px-3 py-1.5 shadow-2xs">
                  <input
                    type="number"
                    min="1"
                    max={Math.max(12, ext.requestedHours * 2)}
                    value={revisedHours}
                    onChange={(e) => setRevisedHours(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 font-bold text-sky-900 text-center text-sm outline-none"
                  />
                  <span className="text-xs font-semibold text-slate-600 ml-1">Jam</span>
                </div>
                <div className="text-[11px] text-slate-600">
                  Diajukan <strong className="text-amber-700">+{ext.requestedHours} Jam</strong> ➔ Anda setujui{' '}
                  <strong className="text-sky-700">+{revisedHours} Jam</strong>
                </div>
              </div>
            </div>
          )}

          {/* Feedback Notes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Catatan untuk Petugas Lapangan (Opsional)
            </label>
            <textarea
              rows={2}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder={
                activeTab === 'approve'
                  ? 'Catatan: Permohonan disetujui, harap selesaikan area dengan teliti...'
                  : activeTab === 'revise'
                  ? 'Catatan: Mengingat area ramai, durasi tambahan dibatasi...'
                  : 'Catatan: Mohon prioritaskan penyelesaian segera tanpa penundaan...'
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none text-xs"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Pemberitahuan keputusan ini akan langsung dikirimkan kepada tim/petugas yang bersangkutan.
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

            {activeTab === 'approve' && (
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold transition-colors shadow-xs min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Konfirmasi Setujui (+{ext.requestedHours} Jam)</span>
              </button>
            )}

            {activeTab === 'revise' && (
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold transition-colors shadow-xs min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Kirim Revisi Durasi (+{revisedHours} Jam)</span>
              </button>
            )}

            {activeTab === 'reject' && (
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold transition-colors shadow-xs min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>Konfirmasi Tolak Pengajuan</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
