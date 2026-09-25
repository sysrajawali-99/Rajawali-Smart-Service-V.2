import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  Plus,
  Search,
  Filter,
  Eye,
  Camera,
  Layers,
  Building2,
  User,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  X,
  Play,
  Check,
  Calendar,
  Hourglass,
  HelpCircle,
} from 'lucide-react';
import { useCleaning } from '../../../context/CleaningContext';
import { Complaint, PriorityLevel } from '../../../types';
import { ComplaintCountdown } from '../../common/ComplaintCountdown';

export const KlienComplaintSection: React.FC = () => {
  const {
    complaints,
    submitNewComplaint,
    startHandlingComplaint,
    respondToComplaintExtension,
    resolveComplaint,
    activeProject,
    areas,
    currentUser,
    userRole,
  } = useCleaning();

  // Active Tab Filter: 'all' | 'open' ('Di Buat') | 'in_progress' ('Di Kerjakan') | 'resolved' ('Di Selesaikan')
  const [pipelineTab, setPipelineTab] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Complaint for Detail View
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  // Modal: Buat Keluhan Baru
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAreaId, setNewAreaId] = useState(areas[0]?.id || 'area-1');
  const [newCategory, setNewCategory] = useState('Kebersihan Lantai & Noda');
  const [newPriority, setNewPriority] = useState<PriorityLevel>('high');
  const [newDescription, setNewDescription] = useState('');
  const [newSlaHours, setNewSlaHours] = useState(2);
  const [newPhotoBefore, setNewPhotoBefore] = useState('');

  // Modal: Selesaikan Keluhan
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolvingComplaint, setResolvingComplaint] = useState<Complaint | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionPhotoAfter, setResolutionPhotoAfter] = useState('');

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Filtered by project (context provides project-filtered complaints)
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      const matchTab = pipelineTab === 'all' || c.status === pipelineTab;
      const q = searchQuery.toLowerCase().trim();
      const matchQ =
        !q ||
        c.ticketNumber.toLowerCase().includes(q) ||
        c.areaName.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.reporterName.toLowerCase().includes(q);

      return matchTab && matchQ;
    });
  }, [complaints, pipelineTab, searchQuery]);

  // Stage Groups
  const diBuatList = useMemo(() => complaints.filter((c) => c.status === 'open'), [complaints]);
  const diKerjakanList = useMemo(() => complaints.filter((c) => c.status === 'in_progress'), [complaints]);
  const diSelesaikanList = useMemo(() => complaints.filter((c) => c.status === 'resolved'), [complaints]);

  // Submit New Complaint
  const handleCreateComplaint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDescription.trim()) {
      alert('Deskripsi keluhan wajib diisi.');
      return;
    }

    submitNewComplaint({
      reporterName: currentUser?.name || 'Klien Gedung',
      reporterRole: userRole === 'klien' ? 'Klien Gedung' : 'Pengawas Operasional',
      areaId: newAreaId,
      category: newCategory,
      description: newDescription,
      priority: newPriority,
      slaHours: Number(newSlaHours) || 2,
      photoBefore:
        newPhotoBefore ||
        'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80',
    });

    showToast(`Tiket keluhan berhasil dibuat dengan SLA ${newSlaHours} Jam.`);
    setShowCreateModal(false);

    // Reset Form
    setNewDescription('');
    setNewPhotoBefore('');
  };

  // Confirm Resolve
  const handleConfirmResolve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingComplaint) return;

    resolveComplaint(
      resolvingComplaint.id,
      resolutionNotes || 'Penanganan keluhan telah tuntas dibersihkan dan disterilkan.',
      undefined,
      resolutionPhotoAfter ||
        'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=600&auto=format&fit=crop&q=80'
    );

    showToast(`Keluhan ${resolvingComplaint.ticketNumber} telah diselesaikan.`);
    setShowResolveModal(false);
    setResolvingComplaint(null);
    if (selectedComplaint?.id === resolvingComplaint.id) {
      setSelectedComplaint(null);
    }
  };

  const getPriorityBadge = (p: PriorityLevel) => {
    switch (p) {
      case 'urgent':
        return <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-rose-100 text-rose-800">Urgent</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-amber-100 text-amber-800">Tinggi</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-[10.5px] font-medium bg-sky-100 text-sky-800">Sedang</span>;
      case 'low':
        return <span className="px-2 py-0.5 rounded text-[10.5px] font-medium bg-slate-100 text-slate-700">Rendah</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2.5 text-xs animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{toastMsg}</span>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <span>Pusat Keluhan & Komplain (SLA Tracking)</span>
          </h3>
          <p className="text-xs text-slate-500">
            Pipeline penanganan tiket keluhan dari pembuatan, proses pengerjaan, hingga penyelesaian di {activeProject.name}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Keluhan Baru</span>
        </button>
      </div>

      {/* PIPELINE STAGE CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Stage 1: Di Buat */}
        <div
          onClick={() => setPipelineTab(pipelineTab === 'open' ? 'all' : 'open')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            pipelineTab === 'open'
              ? 'bg-rose-50/90 border-rose-300 ring-2 ring-rose-500/20 shadow-sm'
              : 'bg-white hover:bg-rose-50/40 border-slate-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 block">1. Di Buat</span>
                <span className="text-[10.5px] text-slate-500">Tiket baru / antrian</span>
              </div>
            </div>
            <span className="text-xl font-extrabold text-rose-600 tabular-nums">{diBuatList.length}</span>
          </div>
          <p className="text-[11px] text-slate-500">Menunggu personil memulai tindakan di lokasi.</p>
        </div>

        {/* Stage 2: Di Kerjakan */}
        <div
          onClick={() => setPipelineTab(pipelineTab === 'in_progress' ? 'all' : 'in_progress')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            pipelineTab === 'in_progress'
              ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-500/20 shadow-sm'
              : 'bg-white hover:bg-amber-50/40 border-slate-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Hourglass className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 block">2. Di Kerjakan</span>
                <span className="text-[10.5px] text-slate-500">Dalam proses SLA</span>
              </div>
            </div>
            <span className="text-xl font-extrabold text-amber-600 tabular-nums">{diKerjakanList.length}</span>
          </div>
          <p className="text-[11px] text-slate-500">Petugas sedang berada di lokasi membersihkan.</p>
        </div>

        {/* Stage 3: Di Selesaikan */}
        <div
          onClick={() => setPipelineTab(pipelineTab === 'resolved' ? 'all' : 'resolved')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            pipelineTab === 'resolved'
              ? 'bg-emerald-50/90 border-emerald-300 ring-2 ring-emerald-500/20 shadow-sm'
              : 'bg-white hover:bg-emerald-50/40 border-slate-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 block">3. Di Selesaikan</span>
                <span className="text-[10.5px] text-slate-500">Tuntas & tervalidasi</span>
              </div>
            </div>
            <span className="text-xl font-extrabold text-emerald-600 tabular-nums">{diSelesaikanList.length}</span>
          </div>
          <p className="text-[11px] text-slate-500">Pekerjaan selesai disertai foto hasil akhir.</p>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari tiket, area, kategori keluhan..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs w-full sm:w-auto justify-center">
          <button
            type="button"
            onClick={() => setPipelineTab('all')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              pipelineTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Semua ({complaints.length})
          </button>
          <button
            type="button"
            onClick={() => setPipelineTab('open')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              pipelineTab === 'open' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            Di Buat ({diBuatList.length})
          </button>
          <button
            type="button"
            onClick={() => setPipelineTab('in_progress')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              pipelineTab === 'in_progress' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            Di Kerjakan ({diKerjakanList.length})
          </button>
          <button
            type="button"
            onClick={() => setPipelineTab('resolved')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              pipelineTab === 'resolved' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            Di Selesaikan ({diSelesaikanList.length})
          </button>
        </div>
      </div>

      {/* TICKETS LIST */}
      {filteredComplaints.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>
          <h4 className="text-sm font-bold text-slate-800 mb-1">Tidak Ada Tiket Keluhan</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            Semua keluhan telah tertangani atau tidak ditemukan data pada filter yang dipilih.
          </p>
          <button
            type="button"
            onClick={() => {
              setPipelineTab('all');
              setSearchQuery('');
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Tampilkan Semua Tiket
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredComplaints.map((ticket) => {
            const isOpen = ticket.status === 'open';
            const isInProgress = ticket.status === 'in_progress';
            const isResolved = ticket.status === 'resolved';

            return (
              <div
                key={ticket.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow p-4 flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {ticket.ticketNumber}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {getPriorityBadge(ticket.priority)}
                      {isOpen && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                          Di Buat
                        </span>
                      )}
                      {isInProgress && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                          Di Kerjakan
                        </span>
                      )}
                      {isResolved && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Di Selesaikan
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Area & Floor */}
                  <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{ticket.areaName}</h4>
                  <p className="text-xs text-slate-500 mb-2">
                    {ticket.floor} · Kategori: {ticket.category}
                  </p>

                  {/* Description Box */}
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 line-clamp-2 leading-relaxed mb-3">
                    "{ticket.description}"
                  </p>

                  {/* Countdown Timer or Completed Tag */}
                  {!isResolved ? (
                    <div className="mb-3">
                      <ComplaintCountdown
                        deadlineTimestamp={ticket.deadlineTimestamp}
                        status={ticket.status}
                        slaDeadline={ticket.slaDeadline}
                        compact
                      />
                    </div>
                  ) : (
                    <div className="bg-emerald-50/70 p-2 rounded-xl border border-emerald-100 text-xs text-emerald-800 mb-3 flex items-center justify-between">
                      <span className="flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Diselesaikan: {ticket.resolvedAt || 'Hari Ini'}
                      </span>
                    </div>
                  )}

                  {/* Photo Thumbnails */}
                  <div className="flex items-center gap-2 mb-3">
                    {ticket.photoBefore && (
                      <div className="relative w-14 h-11 rounded-lg bg-slate-100 overflow-hidden border border-slate-200">
                        <img src={ticket.photoBefore} alt="Before" className="w-full h-full object-cover" />
                        <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[7.5px] text-white text-center">
                          Awal
                        </span>
                      </div>
                    )}
                    {ticket.photoResolved && (
                      <div className="relative w-14 h-11 rounded-lg bg-slate-100 overflow-hidden border border-slate-200">
                        <img src={ticket.photoResolved} alt="Resolved" className="w-full h-full object-cover" />
                        <span className="absolute bottom-0 inset-x-0 bg-emerald-700/80 text-[7.5px] text-white text-center font-bold">
                          Selesai
                        </span>
                      </div>
                    )}
                    <div className="text-[11px] text-slate-500 ml-auto text-right">
                      <span className="block text-slate-400">Pelapor</span>
                      <span className="font-semibold text-slate-700">{ticket.reporterName}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedComplaint(ticket)}
                    className="flex-1 py-1.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>Detail</span>
                  </button>

                  {isOpen && (
                    <button
                      type="button"
                      onClick={() => {
                        startHandlingComplaint(ticket.id);
                        showToast(`Tiket ${ticket.ticketNumber} mulai dikerjakan petugas.`);
                      }}
                      className="py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Kerjakan</span>
                    </button>
                  )}

                  {isInProgress && (
                    <button
                      type="button"
                      onClick={() => {
                        setResolvingComplaint(ticket);
                        setResolutionNotes('');
                        setResolutionPhotoAfter('');
                        setShowResolveModal(true);
                      }}
                      className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Selesaikan</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                    {selectedComplaint.ticketNumber}
                  </span>
                  {getPriorityBadge(selectedComplaint.priority)}
                </div>
                <h3 className="text-base font-bold text-slate-900">{selectedComplaint.areaName}</h3>
                <p className="text-xs text-slate-500">{selectedComplaint.floor} · {selectedComplaint.category}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedComplaint(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Photos */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1">Foto Kondisi Awal</span>
                <div className="h-36 rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
                  <img
                    src={
                      selectedComplaint.photoBefore ||
                      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80'
                    }
                    alt="Before"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1">Foto Hasil Selesai</span>
                <div className="h-36 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center">
                  {selectedComplaint.photoResolved ? (
                    <img
                      src={selectedComplaint.photoResolved}
                      alt="Resolved"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-3 text-slate-400">
                      <Clock className="w-6 h-6 mx-auto mb-1 opacity-50" />
                      <p className="text-xs">Dalam pengerjaan</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Description & Notes */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs space-y-2">
              <div>
                <span className="font-bold text-slate-700 block mb-0.5">Uraian Masalah:</span>
                <p className="text-slate-600">{selectedComplaint.description}</p>
              </div>

              {selectedComplaint.resolutionNotes && (
                <div className="pt-2 border-t border-slate-200/60">
                  <span className="font-bold text-emerald-800 block mb-0.5">Catatan Penyelesaian:</span>
                  <p className="text-emerald-700">{selectedComplaint.resolutionNotes}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Dibuat Oleh</span>
                  <span className="font-semibold text-slate-700">{selectedComplaint.reporterName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Petugas Penangan</span>
                  <span className="font-semibold text-slate-700">{selectedComplaint.assignedCleanerName || 'Tim Kebersihan'}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedComplaint(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BUAT KELUHAN MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Ajukan Keluhan Baru</h3>
                  <p className="text-xs text-slate-500">Tiket langsung masuk antrian prioritas operasional</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateComplaint} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Pilih Lokasi Area *</label>
                <select
                  value={newAreaId}
                  onChange={(e) => setNewAreaId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.floor})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kategori Masalah</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="Kebersihan Lantai & Noda">Kebersihan Lantai & Noda</option>
                    <option value="Sanitasi Kloset & Bau">Sanitasi Kloset & Bau</option>
                    <option value="Tempat Sampah Penuh">Tempat Sampah Penuh</option>
                    <option value="Kaca / Cermin Kotor">Kaca / Cermin Kotor</option>
                    <option value="Kehabisan Sabun / Tisu">Kehabisan Sabun / Tisu</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Prioritas</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="urgent">Mendesak / Urgent (1 Jam)</option>
                    <option value="high">Tinggi (2 Jam)</option>
                    <option value="medium">Sedang (4 Jam)</option>
                    <option value="low">Rendah (8 Jam)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Deskripsi Keluhan *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Jelaskan kondisi kotor/keluhan yang perlu segera ditangani..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Target Durasi SLA (Jam)</label>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={newSlaHours}
                    onChange={(e) => setNewSlaHours(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Foto Bukti (Opsional)</label>
                  <button
                    type="button"
                    onClick={() =>
                      setNewPhotoBefore(
                        'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80'
                      )
                    }
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium cursor-pointer"
                  >
                    {newPhotoBefore ? 'Foto Terpasang ✓' : 'Pakai Foto Contoh'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Kirim Tiket Keluhan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESOLVE MODAL */}
      {showResolveModal && resolvingComplaint && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Selesaikan Keluhan</h3>
                <p className="text-xs text-slate-500">Tiket {resolvingComplaint.ticketNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowResolveModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmResolve} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Catatan Tindakan Penyelesaian *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Jelaskan tindakan pembersihan yang telah dilakukan..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Foto Bukti Bersih Selesai</label>
                <button
                  type="button"
                  onClick={() =>
                    setResolutionPhotoAfter(
                      'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=600&auto=format&fit=crop&q=80'
                    )
                  }
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium cursor-pointer"
                >
                  {resolutionPhotoAfter ? 'Foto Selesai Terpasang ✓' : 'Sematkan Foto Selesai'}
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Konfirmasi Selesai</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
