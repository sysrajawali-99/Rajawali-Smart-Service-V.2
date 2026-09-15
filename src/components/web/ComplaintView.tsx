import React, { useState } from 'react';
import {
  AlertCircle,
  Plus,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  User,
  Eye,
  Check,
  X,
  Search,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import { Complaint, PriorityLevel } from '../../types';
import { NewComplaintModal } from '../modals/NewComplaintModal';

export const ComplaintView: React.FC = () => {
  const { complaints, resolveComplaint, userRole } = useCleaning();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('Pembersihan darurat telah dilakukan, kondisi area sudah bersih dan aman.');

  const filtered = complaints.filter((c) => {
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchSearch =
      c.ticketNumber.toLowerCase().includes(search.toLowerCase()) ||
      c.reporterName.toLowerCase().includes(search.toLowerCase()) ||
      c.areaName.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const getPriorityBadge = (priority: PriorityLevel) => {
    switch (priority) {
      case 'urgent':
        return { label: 'Darurat (SLA 15m)', bg: 'bg-rose-100 text-rose-800 border-rose-300' };
      case 'high':
        return { label: 'Tinggi (SLA 30m)', bg: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'medium':
        return { label: 'Sedang (SLA 45m)', bg: 'bg-blue-100 text-blue-800 border-blue-300' };
      case 'low':
      default:
        return { label: 'Rendah (SLA 60m)', bg: 'bg-slate-100 text-slate-700 border-slate-300' };
    }
  };

  const handleConfirmResolve = (complaintId: string) => {
    resolveComplaint(complaintId, resolutionNotes);
    setResolvingId(null);
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
            Pencatatan tiket dari pengguna gedung/tenant, monitoring batas waktu SLA, dan verifikasi resolusi
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors shadow-xs"
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
            placeholder="Cari nomor tiket, nama pelapor, atau lokasi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto bg-slate-100 p-1 rounded-xl text-xs w-full sm:w-auto">
          {[
            { id: 'all', label: 'Semua Tiket' },
            { id: 'open', label: 'Terbuka' },
            { id: 'in_progress', label: 'Sedang Ditangani' },
            { id: 'resolved', label: 'Selesai (Resolved)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
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
      <div className="space-y-3">
        {filtered.map((ticket) => {
          const prio = getPriorityBadge(ticket.priority);

          return (
            <div
              key={ticket.id}
              className={`p-4 sm:p-5 rounded-2xl bg-white border transition-all shadow-xs ${
                ticket.status === 'open'
                  ? 'border-rose-200 bg-rose-50/20'
                  : ticket.status === 'in_progress'
                  ? 'border-amber-200 bg-amber-50/20'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded">
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
                        : 'bg-rose-100 text-rose-800 animate-pulse'
                    }`}
                  >
                    {ticket.status === 'resolved'
                      ? '✓ Selesai Ditangani'
                      : ticket.status === 'in_progress'
                      ? 'Sedang Dikerjakan'
                      : 'Menunggu Penanganan'}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Dibuat: {ticket.createdAt}
                  </span>
                  <span>•</span>
                  <span className="text-rose-600 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Batas SLA: {ticket.slaDeadline}
                  </span>
                </div>
              </div>

              {/* Main Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 text-xs">
                <div className="md:col-span-2 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-sm">{ticket.category}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-600 font-medium">{ticket.areaName} ({ticket.floor})</span>
                  </div>

                  <p className="text-slate-700 text-xs leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                    "{ticket.description}"
                  </p>

                  <div className="flex items-center gap-4 text-slate-500 text-[11px] pt-1">
                    <span>
                      Pelapor: <strong className="text-slate-800">{ticket.reporterName}</strong> ({ticket.reporterRole})
                    </span>
                    <span>•</span>
                    <span>
                      Petugas Ditugaskan: <strong className="text-sky-700">{ticket.assignedCleanerName}</strong>
                    </span>
                  </div>
                </div>

                {/* Resolution Status & Action */}
                <div className="flex flex-col justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                  {ticket.status === 'resolved' ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Terselesaikan ({ticket.resolvedAt})</span>
                      </div>
                      <p className="text-[11px] text-slate-600 italic">
                        "{ticket.resolutionNotes}"
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[11px] text-slate-500">
                        Petugas lapangan sedang menuju lokasi untuk penanganan cepat.
                      </p>

                      {resolvingId === ticket.id ? (
                        <div className="space-y-2 pt-1 border-t border-slate-200">
                          <textarea
                            rows={2}
                            value={resolutionNotes}
                            onChange={(e) => setResolutionNotes(e.target.value)}
                            placeholder="Catatan penanganan komplain..."
                            className="w-full p-2 text-[11px] border border-slate-200 rounded-lg bg-white"
                          />
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleConfirmResolve(ticket.id)}
                              className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs"
                            >
                              Konfirmasi Selesai
                            </button>
                            <button
                              onClick={() => setResolvingId(null)}
                              className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 rounded-lg text-xs"
                            >
                              Batal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setResolvingId(ticket.id)}
                          className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-xs flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Tandai Selesai Ditangani</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal New Complaint */}
      <NewComplaintModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
      />
    </div>
  );
};
