import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  MapPin,
  Users,
  Eye,
  AlertCircle,
  FileCheck,
  Package,
  Calendar,
  Filter,
  ArrowRight,
  Sparkles,
  FileText,
  X,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import { CleaningTask, TaskStatus } from '../../types';
import { BeforeAfterModal } from '../modals/BeforeAfterModal';

export const CleaningActivityView: React.FC = () => {
  const {
    tasks,
    setActiveTab,
    setSelectedTaskId,
    exportTasksToMonthlyReport,
    removeTaskFromMonthlyReport,
  } = useCleaning();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [previewTask, setPreviewTask] = useState<CleaningTask | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');
  const [exportSuccessNotice, setExportSuccessNotice] = useState<string | null>(null);

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'exported') return t.exportedToMonthlyReport;
    return t.status === statusFilter;
  });

  const handleExportToMonthly = (taskId: string, areaName: string) => {
    exportTasksToMonthlyReport([taskId], selectedMonth);
    setExportSuccessNotice(`Pekerjaan "${areaName}" berhasil diekspor ke Laporan Bulanan (${selectedMonth})!`);
    setTimeout(() => {
      setExportSuccessNotice(null);
    }, 4000);
  };

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'completed':
        return {
          label: 'Selesai & Lolos QC',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
        };
      case 'in_progress':
        return {
          label: 'Sedang Berjalan',
          bg: 'bg-sky-50 text-sky-700 border-sky-200',
          dot: 'bg-sky-500 animate-pulse',
        };
      case 'pending_qc':
        return {
          label: 'Menunggu QC Review',
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
        };
      case 'overdue':
        return {
          label: 'Terlambat / Overdue',
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
        };
      case 'pending':
      default:
        return {
          label: 'Belum Dimulai',
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
        };
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Pemantauan Cleaning Activity (Live Timeline)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar aktivitas kebersihan yang sedang berjalan, verifikasi checklist SOP, dan bukti dokumentasi
          </p>
        </div>

        {/* Status filter buttons and month selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            {[
              { id: 'all', label: 'Semua Status' },
              { id: 'in_progress', label: 'Sedang Berjalan' },
              { id: 'pending_qc', label: 'Menunggu QC' },
              { id: 'completed', label: 'Selesai' },
              { id: 'exported', label: '📋 Masuk Laporan Bulanan' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setStatusFilter(btn.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
                  statusFilter === btn.id
                    ? 'bg-white text-sky-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px] text-slate-500 font-medium">Periode:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent font-bold text-slate-800 text-xs focus:outline-hidden"
            >
              <option value="2026-09">September 2026</option>
              <option value="2026-08">Agustus 2026</option>
              <option value="2026-07">Juli 2026</option>
            </select>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {exportSuccessNotice && (
        <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>{exportSuccessNotice}</span>
          </div>
          <button
            onClick={() => setActiveTab('laporan')}
            className="font-bold text-indigo-700 underline hover:text-indigo-900 text-xs shrink-0 flex items-center gap-1 ml-4"
          >
            <span>Buka Laporan Bulanan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Task Activity Cards */}
      <div className="space-y-4">
        {filteredTasks.map((task) => {
          const statusBadge = getStatusBadge(task.status);
          const checkedCount = task.checklistArea.filter((c) => c.checked).length;
          const totalChecklist = task.checklistArea.length;
          const checklistPercent = totalChecklist > 0 ? Math.round((checkedCount / totalChecklist) * 100) : 0;

          return (
            <div
              key={task.id}
              className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 transition-all shadow-xs"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                {/* Left Task Title & Info */}
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                      {task.id.toUpperCase()}
                    </span>
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 whitespace-nowrap shrink-0 ${statusBadge.bg}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`}></span>
                      {statusBadge.label}
                    </span>
                    <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                      Jadwal: <strong className="text-slate-700 font-semibold">{task.scheduledTime}</strong> <span className="text-slate-400 font-normal">(Batas: {task.deadlineTime})</span>
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">{task.areaName}</h3>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1 shrink-0 font-medium text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{task.buildingFloor}</span>
                    </span>

                    <span className="text-slate-300 hidden sm:inline">•</span>

                    <span className="inline-flex items-center gap-1.5 shrink-0">
                      <Users className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span>
                        Petugas: <strong className="text-slate-800 font-semibold">{task.cleanerName}</strong>{' '}
                        <span className="text-slate-500">({task.shift})</span>
                      </span>
                    </span>

                    {task.startTime && (
                      <>
                        <span className="text-slate-300 hidden sm:inline">•</span>
                        <span className="inline-flex items-center gap-1 shrink-0 text-slate-600">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            Mulai: <strong className="text-slate-700 font-semibold">{task.startTime}</strong>
                          </span>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {/* Ekspor to Laporan Bulan Button */}
                  {task.exportedToMonthlyReport ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setActiveTab('laporan')}
                        className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs flex items-center gap-1.5 border border-indigo-200 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Di Laporan Bulanan (No. {task.monthlyOrderNo || 1})</span>
                      </button>
                      <button
                        onClick={() => removeTaskFromMonthlyReport(task.id)}
                        className="p-2 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200"
                        title="Batalkan dari Laporan Bulanan"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleExportToMonthly(task.id, task.areaName)}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Ekspor ke Laporan Bulan</span>
                    </button>
                  )}

                  {task.photoBefore && task.photoAfter && (
                    <button
                      onClick={() => setPreviewTask(task)}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-600" />
                      <span>Foto Before, Progress, After</span>
                    </button>
                  )}

                  {task.status === 'pending_qc' && (
                    <button
                      onClick={() => {
                        setSelectedTaskId(task.id);
                        setActiveTab('inspeksi');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Audit QC Sekarang</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Detail Content: Checklists, Supplies, Remarks, Photos */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-xs">
                {/* 1. Checklist Kondisi Area */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Checklist Kondisi Area ({checkedCount}/{totalChecklist})
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                      {checklistPercent}%
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {task.checklistArea.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-2 text-[11px] text-slate-600"
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 mt-0.5 ${
                            item.checked
                              ? 'bg-emerald-500 text-white'
                              : 'border border-slate-300 bg-white'
                          }`}
                        >
                          {item.checked && '✓'}
                        </span>
                        <span className={item.checked ? 'text-slate-800' : 'text-slate-400'}>
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Checklist Consumable Supplies */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                  <span className="font-bold text-slate-800 flex items-center gap-1">
                    <Package className="w-3.5 h-3.5 text-sky-600" />
                    Bahan / Supplies Digunakan
                  </span>

                  {task.suppliesUsed.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">
                      Belum ada pemakaian material tercatat
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {task.suppliesUsed.map((sup, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-[11px] p-1.5 rounded-lg bg-white border border-slate-200/70"
                        >
                          <span className="text-slate-700 font-medium truncate">{sup.supplyName}</span>
                          <span className="font-bold text-slate-900 bg-sky-50 px-1.5 py-0.5 rounded text-sky-700">
                            {sup.amountUsed} {sup.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Remarks & 3-Stage Photo Preview */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                  <div>
                    <span className="font-bold text-slate-800 block mb-1">
                      Catatan Petugas (Remark):
                    </span>
                    <p className="text-[11px] text-slate-600 italic bg-white p-2 rounded-lg border border-slate-200/70 min-h-12">
                      {task.remarks ? `"${task.remarks}"` : 'Tidak ada catatan tambahan.'}
                    </p>
                  </div>

                  {task.photoBefore && task.photoAfter && (
                    <div className="mt-2">
                      <div className="grid grid-cols-3 gap-1.5">
                        {/* Before */}
                        <div
                          className="h-14 rounded-lg overflow-hidden relative border border-slate-200 bg-slate-100 group cursor-pointer"
                          onClick={() => setPreviewTask(task)}
                        >
                          <img
                            src={task.photoBefore}
                            alt="Before"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <span className="absolute bottom-0 inset-x-0 bg-rose-900/80 text-[8px] text-white font-bold text-center py-0.5">
                            Before
                          </span>
                        </div>

                        {/* Progress */}
                        <div
                          className="h-14 rounded-lg overflow-hidden relative border border-slate-200 bg-slate-100 group cursor-pointer"
                          onClick={() => setPreviewTask(task)}
                        >
                          <img
                            src={task.photoProgress || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&auto=format&fit=crop&q=80'}
                            alt="Progress"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <span className="absolute bottom-0 inset-x-0 bg-amber-900/80 text-[8px] text-white font-bold text-center py-0.5">
                            Progress
                          </span>
                        </div>

                        {/* After */}
                        <div
                          className="h-14 rounded-lg overflow-hidden relative border border-slate-200 bg-slate-100 group cursor-pointer"
                          onClick={() => setPreviewTask(task)}
                        >
                          <img
                            src={task.photoAfter}
                            alt="After"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <span className="absolute bottom-0 inset-x-0 bg-emerald-900/80 text-[8px] text-white font-bold text-center py-0.5">
                            After
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] text-slate-400 block text-center mt-1">
                        Klik foto untuk komparasi 3 tahap
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {previewTask && (
        <BeforeAfterModal
          isOpen={!!previewTask}
          onClose={() => setPreviewTask(null)}
          title={`Verifikasi Hasil Kerja: ${previewTask.areaName}`}
          areaName={previewTask.areaName}
          cleanerName={previewTask.cleanerName}
          photoBefore={previewTask.photoBefore}
          photoProgress={previewTask.photoProgress}
          photoAfter={previewTask.photoAfter}
          completedTime={previewTask.completedTime}
          remarks={previewTask.remarks}
        />
      )}
    </div>
  );
};
