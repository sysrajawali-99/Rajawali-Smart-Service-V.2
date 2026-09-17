import React, { useState } from 'react';
import {
  AlertCircle,
  Plus,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  User,
  Layers,
  Play,
  Check,
  Search,
  Hourglass,
  Edit3,
  XCircle,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import { Complaint, PriorityLevel } from '../../types';
import { NewComplaintModal } from '../modals/NewComplaintModal';
import { ResolveComplaintModal } from '../modals/ResolveComplaintModal';
import { BeforeAfterModal } from '../modals/BeforeAfterModal';
import { ComplaintCountdown } from '../common/ComplaintCountdown';
import { RequestExtensionModal } from '../modals/RequestExtensionModal';
import { ReviewExtensionModal } from '../modals/ReviewExtensionModal';

export const ComplaintView: React.FC = () => {
  const {
    complaints,
    startHandlingComplaint,
    requestComplaintExtension,
    respondToComplaintExtension,
    resolveComplaint,
    userRole,
  } = useCleaning();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);

  // Modals state
  const [selectedForResolve, setSelectedForResolve] = useState<Complaint | null>(null);
  const [showResolveModal, setShowResolveModal] = useState(false);

  const [selectedForExtension, setSelectedForExtension] = useState<Complaint | null>(null);
  const [showExtensionModal, setShowExtensionModal] = useState(false);

  const [selectedForReviewExt, setSelectedForReviewExt] = useState<Complaint | null>(null);
  const [showReviewExtModal, setShowReviewExtModal] = useState(false);

  const [viewingDocumentation, setViewingDocumentation] = useState<Complaint | null>(null);

  const filtered = complaints.filter((c) => {
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchSearch =
      c.ticketNumber.toLowerCase().includes(search.toLowerCase()) ||
      c.reporterName.toLowerCase().includes(search.toLowerCase()) ||
      c.areaName.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const getPriorityBadge = (priority: PriorityLevel, slaHours?: number) => {
    const hoursText = slaHours ? `${slaHours}j` : '';
    switch (priority) {
      case 'urgent':
        return { label: `Darurat (SLA ${hoursText || '1j'})`, bg: 'bg-rose-100 text-rose-800 border-rose-300' };
      case 'high':
        return { label: `Tinggi (SLA ${hoursText || '2j'})`, bg: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'medium':
        return { label: `Sedang (SLA ${hoursText || '4j'})`, bg: 'bg-blue-100 text-blue-800 border-blue-300' };
      case 'low':
      default:
        return { label: `Standar (SLA ${hoursText || '8j'})`, bg: 'bg-slate-100 text-slate-700 border-slate-300' };
    }
  };

  const handleConfirmResolve = (
    complaintId: string,
    notes: string,
    photoProgress: string,
    photoResolved: string
  ) => {
    resolveComplaint(complaintId, notes, photoProgress, photoResolved);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Pusat Penanganan Komplain & Keluhan Kebersihan
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan tiket pengguna gedung, timer countdown batas SLA waktu nyata, alur penanganan petugas, serta pengajuan & revisi durasi tambahan pengerjaan.
          </p>
        </div>

        <button
          id="btn-create-complaint-ticket"
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Tiket Komplain</span>
        </button>
      </div>

      {/* Filter & Search */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nomor tiket, nama pelapor, lokasi area, atau masalah..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto bg-slate-100 p-1 rounded-xl text-xs w-full sm:w-auto">
          {[
            { id: 'all', label: 'Semua Tiket' },
            { id: 'open', label: 'Menunggu' },
            { id: 'in_progress', label: 'Sedang Ditangani' },
            { id: 'resolved', label: 'Selesai' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Complaint Tickets List */}
      <div className="space-y-4">
        {filtered.map((ticket) => {
          const prio = getPriorityBadge(ticket.priority, ticket.slaHours);
          const hasPendingExt = ticket.extensionRequest && ticket.extensionRequest.status === 'pending';

          return (
            <div
              key={ticket.id}
              id={`complaint-ticket-${ticket.id}`}
              className={`p-4 sm:p-5 rounded-2xl bg-white border transition-all shadow-xs space-y-3.5 ${
                ticket.status === 'open'
                  ? 'border-rose-200 bg-rose-50/20'
                  : ticket.status === 'in_progress'
                  ? 'border-amber-200 bg-amber-50/20'
                  : 'border-slate-200'
              }`}
            >
              {/* Ticket Top Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                    {ticket.ticketNumber}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${prio.bg}`}>
                    {prio.label}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      ticket.status === 'resolved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : ticket.status === 'in_progress'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {ticket.status === 'resolved'
                      ? '✓ Selesai Ditangani'
                      : ticket.status === 'in_progress'
                      ? '⚙️ Sedang Ditangani'
                      : '⏳ Menunggu Penanganan'}
                  </span>

                  {/* Countdown Timer Component */}
                  <ComplaintCountdown
                    deadlineTimestamp={ticket.deadlineTimestamp}
                    slaHours={ticket.slaHours}
                    status={ticket.status}
                    resolvedAt={ticket.resolvedAt}
                    size="sm"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Dibuat: {ticket.createdAt}
                  </span>
                  {ticket.startedAt && (
                    <>
                      <span className="hidden sm:inline">•</span>
                      <span className="text-amber-700 font-medium">
                        Mulai: {ticket.startedAt}
                      </span>
                    </>
                  )}
                  <span className="hidden sm:inline">•</span>
                  <span className="text-slate-700 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    Batas SLA: {ticket.slaDeadline} ({ticket.slaHours || 1} Jam)
                  </span>
                </div>
              </div>

              {/* Main Content Info */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs">
                {/* Left / Middle: Complaint Details (7 cols) */}
                <div className="lg:col-span-7 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-800 text-sm">{ticket.category}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-600 font-medium flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {ticket.areaName} ({ticket.floor})
                    </span>
                  </div>

                  <p className="text-slate-700 text-xs leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                    "{ticket.description}"
                  </p>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-slate-500 text-[11px]">
                    <span>
                      Pelapor: <strong className="text-slate-800">{ticket.reporterName}</strong> ({ticket.reporterRole})
                    </span>
                    <span className="hidden sm:inline">•</span>
                    <span>
                      Petugas Ditugaskan: <strong className="text-sky-700">{ticket.assignedCleanerName || 'Tim Kebersihan'}</strong>
                    </span>
                  </div>

                  {ticket.photoBefore && (
                    <div className="pt-1">
                      <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Foto Bukti Keluhan Awal:
                      </span>
                      <div className="relative inline-block rounded-lg overflow-hidden border border-slate-200 bg-slate-100 max-w-[150px]">
                        <img
                          src={ticket.photoBefore}
                          alt="Foto Awal Keluhan"
                          className="w-36 h-22 object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>
                  )}

                  {/* Extension Status history badge if approved/rejected */}
                  {ticket.extensionRequest && ticket.extensionRequest.status !== 'pending' && (
                    <div className="p-2.5 rounded-xl border text-[11px] flex items-center justify-between gap-2 bg-slate-50 border-slate-200">
                      <div className="flex items-center gap-1.5">
                        {ticket.extensionRequest.status === 'approved' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>
                          Tambahan waktu{' '}
                          <strong>
                            +{ticket.extensionRequest.revisedHours || ticket.extensionRequest.requestedHours} Jam
                          </strong>{' '}
                          {ticket.extensionRequest.status === 'approved' ? 'disetujui' : 'ditolak'} oleh{' '}
                          <strong>{ticket.extensionRequest.reviewedBy}</strong> ({ticket.extensionRequest.reviewedAt})
                        </span>
                      </div>
                      {ticket.extensionRequest.reviewNotes && (
                        <span className="text-slate-500 italic truncate max-w-xs">
                          "{ticket.extensionRequest.reviewNotes}"
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: Resolution Status & Action (5 cols) */}
                <div className="lg:col-span-5 flex flex-col justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 gap-3">
                  {ticket.status === 'resolved' ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2 border-b border-emerald-200/80 pb-2">
                        <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Terselesaikan ({ticket.resolvedAt || 'Selesai'})</span>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Terverifikasi
                        </span>
                      </div>

                      {/* Resolution Notes */}
                      <div className="p-2.5 rounded-lg bg-white border border-emerald-200 text-slate-700 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Keterangan Penanganan:
                        </span>
                        <p className="text-xs italic text-slate-700 leading-snug">
                          "{ticket.resolutionNotes || 'Pembersihan telah selesai dilakukan dengan baik.'}"
                        </p>
                      </div>

                      {/* Photo Evidence Gallery (Before - Progress - After) */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-700 block">
                          Dokumentasi Bukti Lengkap (3 Tahap):
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                          {/* Before */}
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                              1. Awal
                            </span>
                            <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-100 aspect-4/3 relative">
                              {ticket.photoBefore ? (
                                <img
                                  src={ticket.photoBefore}
                                  alt="Foto Sebelum"
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px]">
                                  -
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Progress */}
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-amber-700 uppercase tracking-wider block">
                              2. Progres
                            </span>
                            <div className="rounded-lg overflow-hidden border border-amber-300 bg-slate-100 aspect-4/3 relative">
                              {ticket.photoProgress ? (
                                <img
                                  src={ticket.photoProgress}
                                  alt="Foto Progres"
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px]">
                                  Tersedia
                                </div>
                              )}
                            </div>
                          </div>

                          {/* After */}
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider block">
                              3. Hasil Akhir
                            </span>
                            <div className="rounded-lg overflow-hidden border border-emerald-300 bg-slate-100 aspect-4/3 relative">
                              {ticket.photoResolved ? (
                                <img
                                  src={ticket.photoResolved}
                                  alt="Foto Hasil Akhir"
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px]">
                                  Selesai
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Interactive Viewer Button */}
                      <button
                        type="button"
                        onClick={() => setViewingDocumentation(ticket)}
                        className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <Layers className="w-3.5 h-3.5 text-sky-600" />
                        <span>Buka Komparasi Foto Detail</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 flex flex-col justify-between h-full">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 font-semibold text-xs">
                          {ticket.status === 'open' ? (
                            <span className="text-rose-600 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Tiket Baru: Menunggu Ditangani Petugas
                            </span>
                          ) : (
                            <span className="text-amber-700 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              Sedang Ditangani oleh {ticket.assignedCleanerName || 'Petugas'}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          {ticket.status === 'open'
                            ? 'Petugas yang bertugas dapat menekan "Sedang Ditangani" untuk memulai pengerjaan.'
                            : 'Kirim konfirmasi saat pengerjaan rampung dengan melampirkan keterangan dan foto progres & foto hasil akhir.'}
                        </p>
                      </div>

                      {/* Action buttons depending on state */}
                      <div className="space-y-2 pt-1">
                        {ticket.status === 'open' && (
                          <button
                            id={`btn-start-${ticket.id}`}
                            type="button"
                            onClick={() => startHandlingComplaint(ticket.id)}
                            className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Play className="w-4 h-4 fill-white" />
                            <span>Sedang Ditangani (Mulai Pengerjaan)</span>
                          </button>
                        )}

                        {ticket.status === 'in_progress' && (
                          <button
                            id={`btn-resolve-${ticket.id}`}
                            type="button"
                            onClick={() => {
                              setSelectedForResolve(ticket);
                              setShowResolveModal(true);
                            }}
                            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs transition-all shadow-sm shadow-emerald-200 flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>Tandai Selesai Ditangani & Konfirmasi</span>
                          </button>
                        )}

                        {/* Button for requesting SLA extension */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedForExtension(ticket);
                              setShowExtensionModal(true);
                            }}
                            className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Hourglass className="w-3.5 h-3.5 text-amber-600" />
                            <span>Ajukan Tambahan Waktu (+Jam)</span>
                          </button>

                          {ticket.status === 'open' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedForResolve(ticket);
                                setShowResolveModal(true);
                              }}
                              className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 border border-slate-200 font-semibold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                              title="Tandai langsung selesai jika pekerjaan sudah rampung"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Selesai</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* INTERACTIVE PENDING EXTENSION BANNER FOR COMPLAINT REPORTER / SUPERVISOR */}
              {hasPendingExt && ticket.extensionRequest && (
                <div className="mt-2 p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-300/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-md bg-amber-200 text-amber-800">
                        <Clock className="w-3.5 h-3.5" />
                      </span>
                      <span className="font-bold text-amber-950 text-xs">
                        Pengajuan Tambahan Waktu (+{ticket.extensionRequest.requestedHours} Jam)
                      </span>
                      <span className="text-[10px] text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-full font-medium">
                        Perlu Konfirmasi Pembuat Tiket
                      </span>
                    </div>
                    <p className="text-xs text-amber-900 leading-snug">
                      Petugas ({ticket.extensionRequest.requestedBy}) mengajukan tambahan waktu. Alasan:{' '}
                      <strong className="font-semibold italic">"{ticket.extensionRequest.reason}"</strong>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        respondToComplaintExtension(ticket.id, 'approve')
                      }
                      className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs transition-colors shadow-2xs flex items-center justify-center gap-1 cursor-pointer min-h-[36px]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Setujui (+{ticket.extensionRequest.requestedHours}j)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedForReviewExt(ticket);
                        setShowReviewExtModal(true);
                      }}
                      className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold text-xs transition-colors shadow-2xs flex items-center justify-center gap-1 cursor-pointer min-h-[36px]"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Revisi Durasi / Tolak...</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="font-bold text-sm text-slate-800">Tidak ada tiket komplain</p>
            <p className="text-xs text-slate-500">
              {search ? 'Tidak ditemukan tiket yang cocok dengan pencarian Anda.' : 'Semua komplain telah ditangani dengan baik.'}
            </p>
          </div>
        )}
      </div>

      {/* Modal New Complaint */}
      <NewComplaintModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
      />

      {/* Modal Resolve Complaint with Strict Validation for Notes, Progress Photo, and Resolved Photo */}
      <ResolveComplaintModal
        complaint={selectedForResolve}
        isOpen={showResolveModal}
        onClose={() => {
          setShowResolveModal(false);
          setSelectedForResolve(null);
        }}
        onConfirmResolve={handleConfirmResolve}
      />

      {/* Modal Request Extension (Cleaner/Petugas) */}
      <RequestExtensionModal
        isOpen={showExtensionModal}
        onClose={() => {
          setShowExtensionModal(false);
          setSelectedForExtension(null);
        }}
        complaint={selectedForExtension}
        onSubmitExtension={(complaintId, hours, reason) => {
          requestComplaintExtension(complaintId, hours, reason);
        }}
      />

      {/* Modal Review Extension (Reporter/Pengawas: Approve, Revise Duration, Reject) */}
      <ReviewExtensionModal
        isOpen={showReviewExtModal}
        onClose={() => {
          setShowReviewExtModal(false);
          setSelectedForReviewExt(null);
        }}
        complaint={selectedForReviewExt}
        onRespondExtension={(complaintId, action, revisedHours, reviewNotes) => {
          respondToComplaintExtension(complaintId, action, revisedHours, reviewNotes);
        }}
      />

      {/* Full Photo Documentation Modal */}
      {viewingDocumentation && (
        <BeforeAfterModal
          isOpen={Boolean(viewingDocumentation)}
          onClose={() => setViewingDocumentation(null)}
          title={`Dokumentasi Komplain ${viewingDocumentation.ticketNumber}`}
          areaName={`${viewingDocumentation.areaName} (${viewingDocumentation.floor})`}
          cleanerName={viewingDocumentation.assignedCleanerName || 'Petugas'}
          photoBefore={viewingDocumentation.photoBefore}
          photoProgress={viewingDocumentation.photoProgress}
          photoAfter={viewingDocumentation.photoResolved}
          completedTime={viewingDocumentation.resolvedAt}
          remarks={viewingDocumentation.resolutionNotes}
        />
      )}
    </div>
  );
};
