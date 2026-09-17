import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  FileDown,
  Calendar,
  Filter,
  CheckCircle2,
  Users,
  Package,
  TrendingUp,
  Award,
  Sparkles,
  ArrowDownToLine,
  Eye,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  MapPin,
  Clock,
  ShieldCheck,
  ChevronRight,
  Search,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import { CleaningTask } from '../../types';
import { BeforeAfterModal } from '../modals/BeforeAfterModal';
import { exportMonthlyReportToPDF } from '../../utils/pdfExport';

export const LaporanReportView: React.FC = () => {
  const {
    tasks,
    cleaners,
    inspections,
    complaints,
    activeProject,
    checklistLocations,
    dailyChecklists,
    removeTaskFromMonthlyReport,
    bulkExportToMonthlyReport,
    updateTaskWorkDescription,
    setActiveTab,
  } = useCleaning();

  // Active view tab inside Laporan: 'monthly_jobs' (Before, Progress, After) vs 'executive_kpi'
  const [activeSubTab, setActiveSubTab] = useState<'monthly_jobs' | 'executive_kpi'>('monthly_jobs');

  // Month period filter
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');

  // Modal / preview state
  const [previewTask, setPreviewTask] = useState<CleaningTask | null>(null);

  // Add tasks from history modal
  const [showAddFromHistoryModal, setShowAddFromHistoryModal] = useState<boolean>(false);
  const [selectedTaskIdsToAdd, setSelectedTaskIdsToAdd] = useState<string[]>([]);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewTask) {
          setPreviewTask(null);
        } else if (showAddFromHistoryModal) {
          setShowAddFromHistoryModal(false);
        }
      }
    };

    if (showAddFromHistoryModal || previewTask) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [showAddFromHistoryModal, previewTask]);

  // Inline editing of work description
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState<string>('');

  // Search filter inside monthly report
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Filter tasks that have been exported to monthly report for this period
  const monthlyTasks = tasks
    .filter((t) => t.exportedToMonthlyReport && (!t.monthPeriod || t.monthPeriod === selectedMonth))
    .sort((a, b) => (a.monthlyOrderNo || 0) - (b.monthlyOrderNo || 0));

  const filteredMonthlyTasks = monthlyTasks.filter((t) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      t.areaName.toLowerCase().includes(term) ||
      t.cleanerName.toLowerCase().includes(term) ||
      (t.workDescription && t.workDescription.toLowerCase().includes(term)) ||
      (t.monthlyOrderNo && String(t.monthlyOrderNo).includes(term))
    );
  });

  // Eligible tasks from history in the same month that are NOT YET exported
  const candidateHistoryTasks = tasks.filter(
    (t) => !t.exportedToMonthlyReport && (t.status === 'completed' || t.status === 'pending_qc')
  );

  // General KPIs
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const completionRate = Math.round((completedTasks / totalTasks) * 100);

  const avgQCScore =
    inspections.length > 0
      ? Math.round(inspections.reduce((acc, curr) => acc + curr.score, 0) / inspections.length)
      : 95;

  const resolvedComplaints = complaints.filter((c) => c.status === 'resolved').length;
  const totalComplaints = complaints.length || 1;
  const slaComplianceRate = Math.round((resolvedComplaints / totalComplaints) * 100);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      await exportMonthlyReportToPDF({
        tasks: monthlyTasks,
        project: activeProject,
        selectedMonth,
        monthLabel: getMonthLabel(selectedMonth),
      });
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleExportCSV = () => {
    const csvRows = [
      ['No. Urut', 'ID Tugas', 'Bulan Periode', 'Tanggal Selesai', 'Area / Lokasi', 'Petugas', 'Shift', 'Uraian Pekerjaan', 'Foto Before (URL)', 'Foto Progress (URL)', 'Foto After (URL)', 'Catatan Petugas'],
      ...monthlyTasks.map((t) => [
        t.monthlyOrderNo || '',
        t.id,
        t.monthPeriod || selectedMonth,
        t.completedTime || 'Hari ini',
        `"${t.areaName} (${t.buildingFloor})"`,
        `"${t.cleanerName}"`,
        `"${t.shift}"`,
        `"${(t.workDescription || t.remarks || 'Pembersihan rutin area sesuai standar operasional').replace(/"/g, '""')}"`,
        t.photoBefore || '',
        t.photoProgress || '',
        t.photoAfter || '',
        `"${(t.remarks || '').replace(/"/g, '""')}"`,
      ]),
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' + csvRows.map((r) => r.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Bulanan_Pekerjaan_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const startEditDescription = (task: CleaningTask) => {
    setEditingTaskId(task.id);
    setEditingDescription(
      task.workDescription ||
        `Pembersihan menyeluruh area ${task.areaName} (${task.buildingFloor}), sanitasi permukaan, sweeping & mopping, penataan inventaris, pembuangan sampah ke TPS.`
    );
  };

  const saveEditDescription = (taskId: string) => {
    updateTaskWorkDescription(taskId, editingDescription);
    setEditingTaskId(null);
  };

  const handleAddCandidatesToReport = () => {
    if (selectedTaskIdsToAdd.length === 0) return;
    bulkExportToMonthlyReport(selectedTaskIdsToAdd, selectedMonth);
    setSelectedTaskIdsToAdd([]);
    setShowAddFromHistoryModal(false);
  };

  const toggleSelectCandidate = (id: string) => {
    setSelectedTaskIdsToAdd((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const getMonthLabel = (m: string) => {
    switch (m) {
      case '2026-09':
        return 'September 2026';
      case '2026-08':
        return 'Agustus 2026';
      case '2026-07':
        return 'Juli 2026';
      default:
        return m;
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto print:p-0 print:space-y-4">
      {/* Header (Hidden on Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Laporan Bulanan Operasional
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[11px] font-bold">
              {getMonthLabel(selectedMonth)}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Dokumentasi komparasi pengerjaan (Before, Progress, After) terverifikasi watermark tanggal, bulan, dan tahun
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Month selector dropdown */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px] text-slate-500 font-medium">Pilih Periode:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent font-bold text-slate-800 text-xs focus:outline-hidden cursor-pointer"
            >
              <option value="2026-09">September 2026</option>
              <option value="2026-08">Agustus 2026</option>
              <option value="2026-07">Juli 2026</option>
            </select>
          </div>

          <button
            onClick={() => setShowAddFromHistoryModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Pilih Dari Historis ({candidateHistoryTasks.length})</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Ekspor CSV</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPdf}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-semibold text-xs shadow-xs transition-colors disabled:opacity-60"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>{isGeneratingPdf ? 'Membuat Dokumen PDF...' : 'Download PDF Laporan'}</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation (Hidden on Print) */}
      <div className="flex items-center gap-2 border-b border-slate-200 print:hidden">
        <button
          onClick={() => setActiveSubTab('monthly_jobs')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeSubTab === 'monthly_jobs'
              ? 'border-sky-600 text-sky-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Laporan Bulanan Pengerjaan (Before, Progress, After)</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeSubTab === 'monthly_jobs'
                ? 'bg-sky-100 text-sky-800'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {monthlyTasks.length} Pekerjaan
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('executive_kpi')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeSubTab === 'executive_kpi'
              ? 'border-sky-600 text-sky-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Ringkasan Eksekutif, SLA & Konsumsi Material</span>
        </button>
      </div>

      {/* Official Print Header for Corporate Handover */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-sky-700 uppercase tracking-widest block">
              Smart Cleaning Operations System
            </span>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">
              BERITA ACARA & LAPORAN BULANAN HASIL PEKERJAAN
            </h1>
            <p className="text-xs text-slate-600">
              Site: {activeProject.name} • Periode Kerja: {getMonthLabel(selectedMonth)} • Tanggal Dokumen: {new Date().toLocaleDateString('id-ID')}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono font-bold text-slate-500 block">
              DOC-REF: SCO/{selectedMonth.replace('-', '/')}/VOL-1
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 inline-block mt-1">
              ✓ TERVERIFIKASI WATERMARK TANGGAL
            </span>
          </div>
        </div>
      </div>

      {/* TAB 1: Monthly Jobs with Before, Progress, After */}
      {activeSubTab === 'monthly_jobs' && (
        <div className="space-y-4">
          {/* Top Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs print:hidden">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari uraian pekerjaan, nama area, atau petugas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="font-medium">
                Total:{' '}
                <strong className="text-slate-900">{filteredMonthlyTasks.length}</strong> pekerjaan tercatat dalam laporan
              </span>
              <button
                onClick={() => setShowAddFromHistoryModal(true)}
                className="ml-2 font-bold text-sky-600 hover:text-sky-800 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Historis Lain</span>
              </button>
            </div>
          </div>

          {/* Empty State */}
          {monthlyTasks.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white border border-dashed border-slate-300 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto">
                <FileText className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Belum Ada Pekerjaan Dipindahkan ke Laporan {getMonthLabel(selectedMonth)}
                </h3>
                <p className="text-xs text-slate-500">
                  Pilih historis dari pekerjaan yang telah dikerjakan pada bulan ini untuk dimasukkan ke laporan bulanan lengkap dengan nomor urut, uraian pekerjaan, foto before, progress, dan after.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setShowAddFromHistoryModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Pilih dari Historis Pekerjaan ({candidateHistoryTasks.length} Tersedia)</span>
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
                >
                  Buka Timeline Activity
                </button>
              </div>
            </div>
          ) : (
            /* Monthly Report List - Card/Table Representation */
            <div className="space-y-4">
              {filteredMonthlyTasks.map((task, index) => {
                const orderNumber = task.monthlyOrderNo || index + 1;
                const formattedOrderNo = `No. ${String(orderNumber).padStart(3, '0')}`;
                const isEditingThis = editingTaskId === task.id;

                const defaultDescription =
                  task.workDescription ||
                  `Pembersihan berkala ${task.areaName} (${task.buildingFloor}), pencucian dan sanitasi menyeluruh, pembersihan debu (dusting), mopping lantai, pengecekan kran/saluran, pembuangan sampah serta disinfeksi titik sentuh tinggi.`;

                return (
                  <div
                    key={task.id}
                    className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4 hover:border-slate-300 transition-all print:border-slate-300 print:shadow-none print:break-inside-avoid"
                  >
                    {/* Top Row: Nomor Urut, Area, Petugas & Timestamp */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="px-3 py-1 rounded-xl bg-slate-900 text-white font-mono font-bold text-xs shadow-xs">
                          {formattedOrderNo}
                        </span>

                        <div>
                          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{task.areaName}</span>
                            <span className="text-xs font-normal text-slate-500">
                              ({task.buildingFloor})
                            </span>
                          </h3>
                        </div>

                        <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 text-[11px] font-medium border border-sky-200">
                          {task.zone || 'Zona Service'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1 font-medium">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          Petugas: <strong className="text-slate-800">{task.cleanerName}</strong>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-600 font-mono">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {task.completedTime || 'Hari ini, 09:30 WIB'}
                        </span>

                        {/* Actions (Hidden on Print) */}
                        <div className="flex items-center gap-1.5 ml-2 print:hidden">
                          <button
                            onClick={() => setPreviewTask(task)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                            title="Buka Pratinjau Komparasi Penuh"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => removeTaskFromMonthlyReport(task.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Keluarkan dari Laporan Bulanan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Uraian Pekerjaan (Editable) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-sky-600" />
                          <span>Uraian Pekerjaan:</span>
                        </label>
                        {!isEditingThis && (
                          <button
                            onClick={() => startEditDescription(task)}
                            className="text-[11px] text-sky-600 hover:text-sky-800 font-semibold flex items-center gap-1 print:hidden"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit Uraian</span>
                          </button>
                        )}
                      </div>

                      {isEditingThis ? (
                        <div className="space-y-2">
                          <textarea
                            rows={3}
                            value={editingDescription}
                            onChange={(e) => setEditingDescription(e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-sky-300 text-xs focus:ring-2 focus:ring-sky-500/20 focus:outline-hidden"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingTaskId(null)}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50"
                            >
                              Batal
                            </button>
                            <button
                              onClick={() => saveEditDescription(task.id)}
                              className="px-3 py-1.5 rounded-lg bg-sky-600 text-xs text-white font-semibold hover:bg-sky-700 flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Simpan Uraian
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 text-xs text-slate-700 leading-relaxed font-normal">
                          {defaultDescription}
                          {task.remarks && (
                            <p className="mt-1 text-[11px] text-slate-500 italic">
                              Catatan Khusus Lapangan: "{task.remarks}"
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bottom: 3 Photo Proofs (Before, Progress, After) with Watermark Validation */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Dokumentasi Foto Bukti Pengerjaan (Watermark Terverifikasi):</span>
                        </span>
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Format Wajib: Before • Progress • After
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* 1. Foto Before */}
                        <div
                          onClick={() => setPreviewTask(task)}
                          className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 cursor-pointer shadow-xs transition-transform hover:shadow-md"
                        >
                          <div className="h-44 sm:h-48 w-full overflow-hidden">
                            <img
                              src={
                                task.photoBefore ||
                                'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80'
                              }
                              alt="Before"
                              className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                            />
                          </div>

                          {/* Stage Badge */}
                          <div className="absolute top-2 left-2 bg-rose-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                            1. SEBELUM (BEFORE)
                          </div>

                          {/* Simulated Date/Time Watermark Bar */}
                          <div className="absolute bottom-0 inset-x-0 bg-black/80 backdrop-blur-xs px-2 py-1 text-[9px] text-white font-mono flex items-center justify-between border-t border-white/10">
                            <span className="text-amber-300 font-bold">
                              📅 {selectedMonth}-12 • 06:45 WIB
                            </span>
                            <span className="text-slate-300 truncate max-w-[110px]">
                              {task.cleanerName}
                            </span>
                          </div>
                        </div>

                        {/* 2. Foto Progress */}
                        <div
                          onClick={() => setPreviewTask(task)}
                          className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 cursor-pointer shadow-xs transition-transform hover:shadow-md"
                        >
                          <div className="h-44 sm:h-48 w-full overflow-hidden">
                            <img
                              src={
                                task.photoProgress ||
                                'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop&q=80'
                              }
                              alt="Progress"
                              className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                            />
                          </div>

                          {/* Stage Badge */}
                          <div className="absolute top-2 left-2 bg-amber-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                            2. PENGERJAAN (PROGRESS)
                          </div>

                          {/* Watermark Bar */}
                          <div className="absolute bottom-0 inset-x-0 bg-black/80 backdrop-blur-xs px-2 py-1 text-[9px] text-white font-mono flex items-center justify-between border-t border-white/10">
                            <span className="text-amber-300 font-bold">
                              📅 {selectedMonth}-12 • 07:15 WIB
                            </span>
                            <span className="text-slate-300 truncate max-w-[110px]">
                              Proses Sanitasi
                            </span>
                          </div>
                        </div>

                        {/* 3. Foto After */}
                        <div
                          onClick={() => setPreviewTask(task)}
                          className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 cursor-pointer shadow-xs transition-transform hover:shadow-md"
                        >
                          <div className="h-44 sm:h-48 w-full overflow-hidden">
                            <img
                              src={
                                task.photoAfter ||
                                'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=600&auto=format&fit=crop&q=80'
                              }
                              alt="After"
                              className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                            />
                          </div>

                          {/* Stage Badge */}
                          <div className="absolute top-2 left-2 bg-emerald-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                            3. SESUDAH (AFTER)
                          </div>

                          {/* Watermark Bar */}
                          <div className="absolute bottom-0 inset-x-0 bg-black/80 backdrop-blur-xs px-2 py-1 text-[9px] text-white font-mono flex items-center justify-between border-t border-white/10">
                            <span className="text-emerald-300 font-bold">
                              📅 {selectedMonth}-12 • 07:40 WIB
                            </span>
                            <span className="text-slate-300">✓ Lolos QC</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Signatures for Print Handover */}
          <div className="pt-8 border-t-2 border-slate-200 grid grid-cols-3 gap-6 text-center text-xs print:pt-4">
            <div>
              <p className="text-slate-500 mb-14">Dibuat Oleh (Supervisor):</p>
              <p className="font-bold text-slate-900">Hendra Wijaya</p>
              <p className="text-[10px] text-slate-400">Supervisor Operasional Lapangan</p>
            </div>
            <div>
              <p className="text-slate-500 mb-14">Diverifikasi & Disetujui:</p>
              <p className="font-bold text-slate-900">Bambang Suryo, S.T.</p>
              <p className="text-[10px] text-slate-400">Building Facility Manager</p>
            </div>
            <div>
              <p className="text-slate-500 mb-14">Perwakilan Klien / Tenant:</p>
              <p className="font-bold text-slate-900">PT Mandiri Capital Indonesia</p>
              <p className="text-[10px] text-slate-400">Pihak Pengelola Gedung</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Executive Summary & KPIs */}
      {activeSubTab === 'executive_kpi' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Ringkasan Eksekutif & KPI Kinerja Site
              </h3>
              <p className="text-xs text-slate-500">
                Site: Menara Mandiri Tower A • Periode: {getMonthLabel(selectedMonth)}
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              SLA Compliance: {slaComplianceRate}%
            </span>
          </div>

          {/* 4 Executive KPI Blocks */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[11px] text-slate-500 font-semibold">Tingkat Penyelesaian</span>
              <p className="text-2xl font-black text-slate-900 font-heading mt-1">
                {completionRate}%
              </p>
              <span className="text-[10px] text-emerald-600 font-medium">
                {completedTasks} dari {totalTasks} tugas selesai
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[11px] text-slate-500 font-semibold">Kehadiran Petugas</span>
              <p className="text-2xl font-black text-sky-600 font-heading mt-1">100%</p>
              <span className="text-[10px] text-slate-500 font-medium">
                5 dari 5 personel hadir tepat waktu
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[11px] text-slate-500 font-semibold">Rata-rata Skor QC Mutu</span>
              <p className="text-2xl font-black text-amber-600 font-heading mt-1">
                {avgQCScore} / 100
              </p>
              <span className="text-[10px] text-emerald-600 font-medium">
                Target minimum 85 tercapai
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[11px] text-slate-500 font-semibold">SLA Respon Komplain</span>
              <p className="text-2xl font-black text-emerald-600 font-heading mt-1">
                {slaComplianceRate}%
              </p>
              <span className="text-[10px] text-slate-500 font-medium">
                Rata-rata respon 14.5 menit
              </span>
            </div>
          </div>

          {/* Section 1: Staff Performance Table */}
          <div className="space-y-2 pt-2">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              1. Rekapitulasi Kinerja & Presensi Staf Kebersihan
            </h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Nama Petugas</th>
                    <th className="p-3">NIK</th>
                    <th className="p-3">Shift Kerja</th>
                    <th className="p-3 text-center">Tugas Hari Ini</th>
                    <th className="p-3 text-center">Jam Clock In</th>
                    <th className="p-3 text-right">Rating Mutu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cleaners.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-900">{c.name}</td>
                      <td className="p-3 font-mono text-slate-500">{c.nik}</td>
                      <td className="p-3 text-slate-700">{c.shiftName}</td>
                      <td className="p-3 text-center">
                        <span className="font-bold text-slate-800">
                          {c.tasksCompletedToday} / {c.totalTasksToday}
                        </span>
                      </td>
                      <td className="p-3 text-center text-slate-600">
                        {c.isClockedIn ? c.clockInTime : 'Off'}
                      </td>
                      <td className="p-3 text-right font-bold text-amber-600">
                        ★ {c.rating}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Rekapitulasi Kontrol Ceklist Kebersihan Area (24 Jam) */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                2. Rekapitulasi Kontrol Ceklist Kebersihan Area (24 Jam) - {activeProject.name}
              </h4>
              <button
                onClick={() => setActiveTab('ceklist')}
                className="text-xs text-sky-600 font-semibold hover:underline"
              >
                Lihat Detail Ceklist →
              </button>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Nama Area / Ruangan</th>
                    <th className="p-3">Kategori</th>
                    <th className="p-3">Lantai</th>
                    <th className="p-3 text-center">Status Ceklist Hari Ini</th>
                    <th className="p-3 text-right">Tingkat Kebersihan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {checklistLocations.map((loc) => {
                    const todayChecklist = dailyChecklists.find(
                      (d) => d.locationId === loc.id && d.date === '2026-09-13'
                    );
                    const cleanCount =
                      todayChecklist?.hourlySlots.filter((s) => s.status === 'clean').length || 0;
                    const issueCount =
                      todayChecklist?.hourlySlots.filter((s) => s.status === 'has_issue').length || 0;
                    const rate = Math.round((cleanCount / 24) * 100);

                    return (
                      <tr key={loc.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-900">{loc.name}</td>
                        <td className="p-3 uppercase text-[10px] font-bold text-slate-500">
                          {loc.category}
                        </td>
                        <td className="p-3 text-slate-700">{loc.floor}</td>
                        <td className="p-3 text-center">
                          <span className="font-mono text-slate-700">
                            {cleanCount} Bersih • {issueCount} Isu (dari 24 Jam)
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              rate >= 70
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {rate}% Bersih
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Select Tasks From Month's History To Add to Monthly Report */}
      {showAddFromHistoryModal && (
        <div
          id="history-candidate-modal-backdrop"
          onClick={() => setShowAddFromHistoryModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
        >
          <div
            id="history-candidate-modal-card"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 max-w-xl w-full border border-slate-200 shadow-2xl space-y-4 max-h-[92dvh] overflow-y-auto overscroll-contain my-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div className="min-w-0">
                <h4 className="font-bold text-slate-900 text-sm sm:text-base truncate">
                  Pilih Pekerjaan dari Historis Bulan Ini
                </h4>
                <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                  Pindahkan pekerjaan yang selesai ke Laporan Bulanan ({getMonthLabel(selectedMonth)})
                </p>
              </div>
              <button
                id="close-history-candidate-btn"
                type="button"
                onClick={() => setShowAddFromHistoryModal(false)}
                aria-label="Tutup Pilihan Historis"
                className="p-2 rounded-full text-slate-400 hover:text-slate-700 active:text-slate-900 hover:bg-slate-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {candidateHistoryTasks.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Semua pekerjaan selesai sudah dimasukkan ke laporan bulanan!
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1 overscroll-contain">
                {candidateHistoryTasks.map((t) => {
                  const isSelected = selectedTaskIdsToAdd.includes(t.id);
                  return (
                    <div
                      key={t.id}
                      onClick={() => toggleSelectCandidate(t.id)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-sky-500 bg-sky-50/60 text-slate-900'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="mt-0.5 accent-sky-600 rounded w-4 h-4"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{t.areaName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({t.buildingFloor})
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Petugas: <strong>{t.cleanerName}</strong> • {t.completedTime || '09:00 WIB'}
                          </p>
                        </div>
                      </div>

                      {/* Photo indicator */}
                      <div className="flex items-center gap-1 shrink-0">
                        {t.photoBefore && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                            3 Foto
                          </span>
                        )}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          Siap Ekspor
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 text-xs">
              <span className="text-slate-500 text-center sm:text-left">
                Dipilih: <strong>{selectedTaskIdsToAdd.length}</strong> pekerjaan
              </span>

              <div className="flex items-center gap-2">
                <button
                  id="cancel-history-candidate-btn"
                  type="button"
                  onClick={() => setShowAddFromHistoryModal(false)}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 font-semibold min-h-[44px] flex items-center justify-center transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="submit-history-candidate-btn"
                  type="button"
                  disabled={selectedTaskIdsToAdd.length === 0}
                  onClick={handleAddCandidatesToReport}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-1.5 min-h-[44px] transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Pindahkan ke Laporan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal for 3-Stage Photo Verification (Before, Progress, After) */}
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
