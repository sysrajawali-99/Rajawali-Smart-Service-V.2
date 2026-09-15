import React, { useState } from 'react';
import {
  MapPin,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
  ChevronRight,
  Eye,
  Filter,
  ClipboardList,
  Building2,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import { BeforeAfterModal } from '../modals/BeforeAfterModal';
import { NewComplaintModal } from '../modals/NewComplaintModal';

export const DashboardView: React.FC = () => {
  const {
    areas,
    cleaners,
    tasks,
    complaints,
    inspections,
    activeProject,
    checklistLocations,
    dailyChecklists,
    setActiveTab,
    setSelectedTaskId,
  } = useCleaning();

  const [previewTask, setPreviewTask] = useState<any | null>(null);
  const [showComplaintModal, setShowComplaintModal] = useState(false);

  // Statistics calculation
  const totalAreas = areas.length;
  const cleanAreas = areas.filter((a) => a.status === 'clean' || a.status === 'inspected').length;
  const areaCleanlinessPercentage = Math.round((cleanAreas / totalAreas) * 100);

  const activeCleaners = cleaners.filter((c) => c.status === 'active').length;
  const totalCleaners = cleaners.length;

  const passedInspections = inspections.filter((i) => i.status === 'passed').length;
  const totalInspections = inspections.length || 1;
  const inspectionPassRate = Math.round((passedInspections / totalInspections) * 100);

  const openComplaints = complaints.filter((c) => c.status !== 'resolved');
  const urgentComplaints = openComplaints.filter((c) => c.priority === 'urgent' || c.priority === 'high');

  const pendingQCTasks = tasks.filter((t) => t.status === 'pending_qc');
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress');

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner Alert if Urgent Complaints exist */}
      {urgentComplaints.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <p className="font-bold text-rose-900">
                Peringatan SLA: Ada {urgentComplaints.length} Komplain Prioritas Tinggi / Urgent!
              </p>
              <p className="text-rose-700 text-[11px] mt-0.5">
                {urgentComplaints[0].reporterName}: "{urgentComplaints[0].description}" ({urgentComplaints[0].areaName})
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('complaint')}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-colors shrink-0 shadow-xs flex items-center gap-1.5"
          >
            <span>Tinjau Komplain</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Area Cleanliness Rate */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tingkat Kebersihan Area</span>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-heading">
              {areaCleanlinessPercentage}%
            </span>
            <span className="text-xs text-emerald-600 font-semibold flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5" /> +4.2%
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {cleanAreas} dari {totalAreas} zona berstatus Bersih
          </p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${areaCleanlinessPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* KPI 2: Active Cleaners */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Petugas On-Duty</span>
            <span className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-heading">
              {activeCleaners} / {totalCleaners}
            </span>
            <span className="text-xs text-sky-600 font-semibold">Shift 1 Pagi</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Semua petugas telah clock-in tepat waktu
          </p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-sky-500 h-1.5 rounded-full"
              style={{ width: `${(activeCleaners / totalCleaners) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* KPI 3: Quality Control Pass Rate */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Lolos QC Inspeksi</span>
            <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-heading">
              {inspectionPassRate}%
            </span>
            <span className="text-xs text-slate-500 font-medium">Avg Score 95/100</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {pendingQCTasks.length} tugas menunggu verifikasi SPV
          </p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-amber-500 h-1.5 rounded-full"
              style={{ width: `${inspectionPassRate}%` }}
            ></div>
          </div>
        </div>

        {/* KPI 4: Open Complaints & SLA */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tiket Komplain Aktif</span>
            <span className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-heading">
              {openComplaints.length}
            </span>
            <span className="text-xs text-rose-600 font-medium">
              SLA Respon &lt; 30m
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {complaints.filter((c) => c.status === 'resolved').length} tiket sudah terselesaikan hari ini
          </p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-rose-500 h-1.5 rounded-full"
              style={{ width: `${Math.min(100, openComplaints.length * 25)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Middle Section: Real-time Status Map & Performance Graph */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Area Cleaning Real-time Map Summary */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Status Pembersihan Area per Lantai</h3>
              <p className="text-xs text-slate-400">Monitoring kondisi kebersihan real-time per zona</p>
            </div>
            <button
              onClick={() => setActiveTab('area')}
              className="text-xs text-sky-600 hover:text-sky-700 font-semibold flex items-center gap-1"
            >
              Lihat Semua Area ({areas.length})
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {areas.map((area) => {
              const statusConfig = {
                clean: { label: 'Bersih Terawat', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
                inspected: { label: 'Telah Diinspeksi QC', bg: 'bg-teal-50 text-teal-700 border-teal-200', dot: 'bg-teal-500' },
                in_progress: { label: 'Sedang Dikerjakan', bg: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-500' },
                needs_cleaning: { label: 'Perlu Pembersihan', bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
              }[area.status];

              return (
                <div
                  key={area.id}
                  className="p-3 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors bg-slate-50/40 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {area.floor} • {area.zone}
                      </span>
                      <h4 className="font-bold text-slate-900 text-xs mt-0.5">{area.name}</h4>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${statusConfig.bg}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`}></span>
                      {statusConfig.label}
                    </span>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      {area.cleanerName}
                    </span>
                    <span className="text-slate-400">
                      Terakhir: {area.lastCleaned || 'Baru'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Quick Action & Performance Metric */}
        <div className="space-y-4">
          {/* Quick Actions Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xs">
            <h3 className="font-bold text-sm mb-1">Aksi Cepat Operasional</h3>
            <p className="text-xs text-slate-300 mb-4">Akses langsung fungsi harian pengawas</p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => setShowComplaintModal(true)}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-left transition-colors flex flex-col justify-between"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 mb-2" />
                <span className="font-semibold text-white">Catat Komplain</span>
                <span className="text-[10px] text-slate-300">Tiket baru</span>
              </button>

              <button
                onClick={() => setActiveTab('inspeksi')}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-left transition-colors flex flex-col justify-between"
              >
                <CheckCircle2 className="w-4 h-4 text-amber-400 mb-2" />
                <span className="font-semibold text-white">Mulai QC Audit</span>
                <span className="text-[10px] text-slate-300">{pendingQCTasks.length} menunggu</span>
              </button>

              <button
                onClick={() => setActiveTab('jadwal')}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-left transition-colors flex flex-col justify-between"
              >
                <Clock className="w-4 h-4 text-sky-400 mb-2" />
                <span className="font-semibold text-white">Jadwal Shift</span>
                <span className="text-[10px] text-slate-300">Roster harian</span>
              </button>

              <button
                onClick={() => setActiveTab('ceklist')}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-left transition-colors flex flex-col justify-between"
              >
                <ClipboardList className="w-4 h-4 text-emerald-400 mb-2" />
                <span className="font-semibold text-white">Ceklist 24 Jam</span>
                <span className="text-[10px] text-slate-300">Kontrol per jam</span>
              </button>
            </div>
          </div>

          {/* 24-Hour Area Checklist Quick Status */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs text-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-slate-800">Ceklist Area Hari Ini (24 Jam)</span>
              <button
                onClick={() => setActiveTab('ceklist')}
                className="text-sky-600 font-semibold hover:underline"
              >
                Buka Ceklist
              </button>
            </div>
            <div className="space-y-2.5">
              {checklistLocations.slice(0, 3).map((loc) => {
                const todayChecklist = dailyChecklists.find(
                  (d) => d.locationId === loc.id && d.date === '2026-09-13'
                );
                const cleanCount =
                  todayChecklist?.hourlySlots.filter((s) => s.status === 'clean').length || 0;
                const issueCount =
                  todayChecklist?.hourlySlots.filter((s) => s.status === 'has_issue').length || 0;

                return (
                  <div
                    key={loc.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-slate-800">{loc.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {loc.floor} • {cleanCount} jam bersih, {issueCount} isu
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        issueCount > 0
                          ? 'bg-rose-100 text-rose-800'
                          : cleanCount > 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {issueCount > 0 ? `${issueCount} Isu` : `${cleanCount}/24 Jam`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Live Activity Feed with Before/After inspection */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Aktivitas Pembersihan Terkini (Live Feed)</h3>
            <p className="text-xs text-slate-400">
              Dokumentasi pengerjaan sebelum dan sesudah oleh petugas lapangan
            </p>
          </div>
          <button
            onClick={() => setActiveTab('activity')}
            className="text-xs text-sky-600 hover:text-sky-700 font-semibold flex items-center gap-1"
          >
            Lihat Semua Aktivitas
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 transition-all bg-white flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {task.scheduledTime}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      task.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : task.status === 'in_progress'
                        ? 'bg-sky-100 text-sky-800 animate-pulse'
                        : task.status === 'pending_qc'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {task.status === 'completed'
                      ? 'Selesai'
                      : task.status === 'in_progress'
                      ? 'Sedang Berjalan'
                      : task.status === 'pending_qc'
                      ? 'Menunggu QC'
                      : 'Pending'}
                  </span>
                </div>

                <h4 className="font-bold text-xs text-slate-900">{task.areaName}</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Petugas: <span className="font-semibold text-slate-700">{task.cleanerName}</span> ({task.shift})
                </p>

                {/* Before / After Preview Thumbnail */}
                {task.photoBefore && task.photoAfter ? (
                  <div className="mt-3 relative rounded-lg overflow-hidden border border-slate-200 group cursor-pointer"
                       onClick={() => setPreviewTask(task)}>
                    <div className="grid grid-cols-2 h-24">
                      <div className="relative">
                        <img
                          src={task.photoBefore}
                          alt="Before"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1 left-1 bg-rose-600/90 text-[9px] font-bold text-white px-1.5 py-0.2 rounded">
                          Before
                        </span>
                      </div>
                      <div className="relative">
                        <img
                          src={task.photoAfter}
                          alt="After"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1 right-1 bg-emerald-600/90 text-[9px] font-bold text-white px-1.5 py-0.2 rounded">
                          After
                        </span>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      Bandingkan Foto
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 h-16 rounded-lg bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-[11px] text-slate-400">
                    Belum ada foto dokumentasi
                  </div>
                )}
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">
                  Checklist: {task.checklistArea.filter((c) => c.checked).length}/{task.checklistArea.length}
                </span>
                {task.photoBefore && task.photoAfter && (
                  <button
                    onClick={() => setPreviewTask(task)}
                    className="text-sky-600 font-semibold hover:underline flex items-center gap-0.5"
                  >
                    Verifikasi Foto &rarr;
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Before / After Comparison Modal */}
      {previewTask && (
        <BeforeAfterModal
          isOpen={!!previewTask}
          onClose={() => setPreviewTask(null)}
          title={`Verifikasi Hasil Kerja: ${previewTask.areaName}`}
          areaName={previewTask.areaName}
          cleanerName={previewTask.cleanerName}
          photoBefore={previewTask.photoBefore}
          photoAfter={previewTask.photoAfter}
          completedTime={previewTask.completedTime}
          remarks={previewTask.remarks}
        />
      )}

      {/* New Complaint Modal */}
      <NewComplaintModal
        isOpen={showComplaintModal}
        onClose={() => setShowComplaintModal(false)}
      />
    </div>
  );
};
