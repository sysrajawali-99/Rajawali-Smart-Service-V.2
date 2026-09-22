import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  User,
  MapPin,
  Calendar,
  FileText,
  Eye,
  Filter,
  Search,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import { CleaningTask } from '../../types';
import { BeforeAfterModal } from '../modals/BeforeAfterModal';

export const ControllerApprovalSection: React.FC = () => {
  const { tasks, verifyTaskApproval, userRole } = useCleaning();

  const [activeFilter, setActiveFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewTask, setPreviewTask] = useState<CleaningTask | null>(null);

  // Rejection modal
  const [rejectingTask, setRejectingTask] = useState<CleaningTask | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');

  // Filter tasks that need or have controller review
  // Tasks eligible: completed, pending_qc, or with controllerApprovalStatus
  const approvalTasks = tasks.filter((t) => {
    // Matches status or controller review
    const isUnderReview =
      t.status === 'completed' ||
      t.status === 'pending_qc' ||
      !!t.controllerApprovalStatus;

    if (!isUnderReview) return false;

    const approvalStatus = t.controllerApprovalStatus || 'pending';
    if (activeFilter !== 'all' && approvalStatus !== activeFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchArea = (t.areaName || '').toLowerCase().includes(q);
      const matchCleaner = (t.cleanerName || '').toLowerCase().includes(q);
      const matchDesc = (t.workDescription || '').toLowerCase().includes(q);
      if (!matchArea && !matchCleaner && !matchDesc) return false;
    }

    return true;
  });

  const pendingCount = tasks.filter(
    (t) => (t.status === 'completed' || t.status === 'pending_qc') && (!t.controllerApprovalStatus || t.controllerApprovalStatus === 'pending')
  ).length;

  const handleApprove = (task: CleaningTask) => {
    verifyTaskApproval(task.id, 'approved', 'Pekerjaan telah diverifikasi dan memenuhi standar kebersihan.');
  };

  const handleOpenReject = (task: CleaningTask) => {
    setRejectingTask(task);
    setRejectionNotes('');
  };

  const handleConfirmReject = () => {
    if (!rejectingTask) return;
    verifyTaskApproval(
      rejectingTask.id,
      'rejected',
      rejectionNotes.trim() || 'Hasil pengerjaan belum memenuhi standar kebersihan atau checklist SOP belum lengkap.'
    );
    setRejectingTask(null);
  };

  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-sky-100 text-sky-700 rounded-lg">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              Verifikasi & Approval Berjenjang Controller
            </h3>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                {pendingCount} Menunggu Persetujuan
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Controller berwenang menyetujui atau menolak laporan pengerjaan petugas sebelum dianggap selesai secara resmi.
          </p>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveFilter('pending')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            Menunggu ({pendingCount})
          </button>
          <button
            onClick={() => setActiveFilter('approved')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === 'approved'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            Disetujui
          </button>
          <button
            onClick={() => setActiveFilter('rejected')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === 'rejected'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
            }`}
          >
            Ditolak / Revisi
          </button>
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === 'all'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Semua Laporan
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari area atau petugas..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Task List Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3">Area & Uraian Pekerjaan</th>
              <th className="py-2.5 px-3">Petugas</th>
              <th className="py-2.5 px-3 text-center">Waktu Selesai</th>
              <th className="py-2.5 px-3 text-center">Foto Bukti</th>
              <th className="py-2.5 px-3 text-center">Status Approval</th>
              <th className="py-2.5 px-3 text-center">Aksi Controller</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {approvalTasks.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  Tidak ada laporan pengerjaan pada kategori filter ini.
                </td>
              </tr>
            ) : (
              approvalTasks.map((task) => {
                const status = task.controllerApprovalStatus || 'pending';

                return (
                  <tr key={task.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-800">{task.areaName}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">
                        {task.workDescription || task.remarks || 'Pembersihan rutin area'}
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{task.cleanerName}</span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-center font-mono text-slate-600 whitespace-nowrap">
                      {task.completedAt || task.deadlineTime || '-'}
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      {task.photoProof || task.photoBefore ? (
                        <button
                          type="button"
                          onClick={() => setPreviewTask(task)}
                          className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 text-[11px] font-semibold inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Lihat Foto</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {status === 'approved' ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Disetujui Controller</span>
                        </span>
                      ) : status === 'rejected' ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          <span>Ditolak / Revisi</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Menunggu Approval</span>
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {status !== 'approved' && (
                          <button
                            type="button"
                            onClick={() => handleApprove(task)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                            title="Setujui laporan ini"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Setujui</span>
                          </button>
                        )}

                        {status !== 'rejected' && (
                          <button
                            type="button"
                            onClick={() => handleOpenReject(task)}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                            title="Tolak dan minta pengerjaan ulang"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Tolak</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Rejection Notes */}
      {rejectingTask && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center gap-2 text-rose-600 pb-2 border-b border-slate-100">
              <AlertTriangle className="w-5 h-5" />
              <h4 className="font-bold text-slate-900 text-sm">
                Tolak & Minta Pengerjaan Ulang (Revisi)
              </h4>
            </div>

            <p className="text-xs text-slate-600">
              Laporan untuk area <strong>{rejectingTask.areaName}</strong> oleh petugas{' '}
              <strong>{rejectingTask.cleanerName}</strong> akan ditolak. Berikan instruksi perbaikan:
            </p>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Alasan Penolakan / Catatan Perbaikan:
              </label>
              <textarea
                rows={3}
                value={rejectionNotes}
                onChange={(e) => setRejectionNotes(e.target.value)}
                placeholder="Contoh: Kaca wastafel masih berembun, lantai di bawah urinoir masih basah, dll..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectingTask(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
              >
                Konfirmasi Penolakan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Preview Modal */}
      {previewTask && (
        <BeforeAfterModal
          isOpen={!!previewTask}
          onClose={() => setPreviewTask(null)}
          title={`Bukti Kerja: ${previewTask.areaName}`}
          taskTitle={previewTask.areaName}
          locationName={previewTask.areaName}
          cleanerName={previewTask.cleanerName}
          date={previewTask.deadlineTime || 'Hari ini'}
          photoBefore={previewTask.photoBefore}
          photoProgress={previewTask.photoProgress}
          photoAfter={previewTask.photoProof || previewTask.photoAfter}
          beforeTimestamp={previewTask.photoBeforeTimestamp}
          progressTimestamp={previewTask.photoProgressTimestamp}
          afterTimestamp={previewTask.photoProofTimestamp}
        />
      )}
    </div>
  );
};
