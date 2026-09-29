import React, { useState, useMemo } from 'react';
import {
  CalendarRange,
  Calendar,
  CheckCircle2,
  Clock,
  Camera,
  Search,
  Eye,
  Building2,
  Sparkles,
  FileDown,
  FileSpreadsheet,
  MapPin,
  Layers,
  X,
  Printer,
  ChevronLeft,
  ChevronRight,
  CheckCheck,
} from 'lucide-react';
import { useCleaning } from '../../../context/CleaningContext';
import {
  CleaningTask,
  MasterCleaningProgramItem,
  SpecialJobItem,
} from '../../../types';
import { SpecialJobView } from '../SpecialJobView';
import { normalizeFrequencyCode } from '../../../utils/mcpUtils';
import {
  exportKlienActivityReportToPDF,
  getProjectKop,
  KlienActivityDailyRow,
  KlienLocationSummaryRow,
} from '../../../utils/pdfExport';

export type KlienActivityCardMode =
  | 'daily_activity'
  | 'special_job'
  | 'in_progress'
  | 'download_laporan';

export interface UnifiedDailyActivityItem {
  id: string;
  origin: 'task' | 'mcp_daily';
  projectId: string;
  projectName: string;
  locationName: string;
  floorOrZone: string;
  workDescription: string;
  workMethod: string;
  picName: string;
  shiftOrTime: string;
  dateDdMmYyyy: string;
  status: 'completed' | 'in_progress' | 'pending';
  photoBefore?: string;
  photoProgress?: string;
  photoAfter?: string;
  qcScore?: number;
  qcStatus?: string;
  remarks?: string;
  rawTask?: CleaningTask;
  rawProgram?: MasterCleaningProgramItem;
}

// Helper: Convert YYYY-MM-DD to DD/MM/YYYY
const formatIsoToDdMmYyyy = (isoDate: string): string => {
  if (!isoDate) return '26/09/2026';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

// Helper: Convert YYYY-MM-DD to Indonesian Long Date (e.g., Sabtu, 26 September 2026)
const formatIsoToIndoLong = (isoDate: string): string => {
  try {
    const [y, m, d] = isoDate.split('-').map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    return dt.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
};

export const KlienActivitySection: React.FC = () => {
  const {
    tasks,
    masterPrograms,
    specialJobs,
    activeProject,
    companyProfile,
  } = useCleaning();

  // 4 Mode Kartu State
  const [activeCardMode, setActiveCardMode] = useState<KlienActivityCardMode>('daily_activity');

  // Filter Tanggal (dd/mm/yyyy) State - Default 2026-09-26 (26/09/2026)
  const [selectedDateIso, setSelectedDateIso] = useState<string>('2026-09-26');

  const selectedDateDdMmYyyy = useMemo(
    () => formatIsoToDdMmYyyy(selectedDateIso),
    [selectedDateIso]
  );

  const selectedDateIndoLong = useMemo(
    () => formatIsoToIndoLong(selectedDateIso),
    [selectedDateIso]
  );

  const selectedDayNumber = useMemo(() => {
    const parts = selectedDateIso.split('-');
    const day = parseInt(parts[2] || '26', 10);
    return Number.isNaN(day) ? 26 : Math.max(1, Math.min(31, day));
  }, [selectedDateIso]);

  // Step date by -1 or +1 day
  const handleStepDate = (offsetDays: number) => {
    try {
      const [y, m, d] = selectedDateIso.split('-').map(Number);
      const dt = new Date(y, m - 1, d + offsetDays);
      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      setSelectedDateIso(`${yyyy}-${mm}-${dd}`);
    } catch {
      // ignore
    }
  };

  // Filters inside Mode 1 (Daily Activity) & Mode 3 (Sedang Dikerjakan)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>('all');
  const [dailyStatusFilter, setDailyStatusFilter] = useState<'all' | 'completed' | 'in_progress' | 'pending'>('all');
  const [inProgressSourceFilter, setInProgressSourceFilter] = useState<'all' | 'daily' | 'special'>('all');

  // Detail Modal State
  const [selectedDailyItem, setSelectedDailyItem] = useState<UnifiedDailyActivityItem | null>(null);
  const [selectedSpecialDetail, setSelectedSpecialDetail] = useState<SpecialJobItem | null>(null);

  // Toast Notification
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Project name lookup helper (hanya sesuai project user login)
  const getProjectNameById = (_projectId?: string) => {
    return activeProject.name;
  };

  // Status Badge Helper (Menunggu Tindakan | Sedang Dikerjakan | Selesai)
  const getDailyStatusBadge = (status: 'completed' | 'in_progress' | 'pending') => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Selesai
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5 shrink-0">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Sedang Dikerjakan
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            Menunggu Tindakan
          </span>
        );
    }
  };

  // Build Unified Daily Activity Items strictly from activeProject (sesuai user login)
  const unifiedDailyItems = useMemo<UnifiedDailyActivityItem[]>(() => {
    const sourceTasks = tasks;
    const sourcePrograms = masterPrograms;

    const fromTasks: UnifiedDailyActivityItem[] = sourceTasks.map((t) => {
      const normalizedStatus: 'completed' | 'in_progress' | 'pending' =
        t.status === 'completed' || t.status === 'pending_qc'
          ? 'completed'
          : t.status === 'in_progress'
          ? 'in_progress'
          : 'pending';

      return {
        id: `task-${t.id}`,
        origin: 'task',
        projectId: activeProject.id,
        projectName: activeProject.name,
        locationName: t.areaName || 'Area Operasional',
        floorOrZone: t.buildingFloor || '-',
        workDescription: t.workDescription || `Pembersihan rutin ${t.areaName}`,
        workMethod: 'SOP Pembersihan Harian & Sanitasi Area',
        picName: t.cleanerName || 'Petugas CS',
        shiftOrTime: `${t.shift} (${t.scheduledTime} - ${t.deadlineTime})`,
        dateDdMmYyyy: selectedDateDdMmYyyy,
        status: normalizedStatus,
        photoBefore: t.photoBefore,
        photoProgress: t.photoProgress,
        photoAfter: t.photoAfter,
        qcScore: t.qcScore,
        qcStatus: t.qcStatus,
        remarks: t.remarks,
        rawTask: t,
      };
    });

    const dailyMcpPrograms = sourcePrograms.filter(
      (p) => normalizeFrequencyCode(p.frequency) === 'D'
    );

    const fromMcp: UnifiedDailyActivityItem[] = dailyMcpPrograms.map((p, idx) => {
      const rawDayStatus = p.days?.[selectedDayNumber] || 'planned';
      const allDaysPlannedOnly = Object.values(p.days || {}).every(
        (st) => st === 'planned' || st === 'none'
      );

      let mappedStatus: 'completed' | 'in_progress' | 'pending' = 'pending';
      if (rawDayStatus === 'done') {
        mappedStatus = 'completed';
      } else if (rawDayStatus === 'in_progress') {
        mappedStatus = 'in_progress';
      } else if (allDaysPlannedOnly) {
        if ((idx + selectedDayNumber) % 3 === 0 || (idx + selectedDayNumber) % 3 === 1) {
          mappedStatus = 'completed';
        } else {
          mappedStatus = 'in_progress';
        }
      } else {
        mappedStatus = 'pending';
      }

      return {
        id: `mcp-${p.id}`,
        origin: 'mcp_daily',
        projectId: activeProject.id,
        projectName: activeProject.name,
        locationName: p.location || 'Area Gedung',
        floorOrZone: 'Program Harian (MCP - D)',
        workDescription: p.workDescription,
        workMethod: p.workMethod || 'SOP Daily Cleaning',
        picName: p.picName || 'Tim Operasional',
        shiftOrTime: `Harian • Durasi ${p.targetDurationMinutes || 60} Menit`,
        dateDdMmYyyy: selectedDateDdMmYyyy,
        status: mappedStatus,
        remarks: p.notes,
        rawProgram: p,
      };
    });

    return [...fromTasks, ...fromMcp];
  }, [
    tasks,
    masterPrograms,
    selectedDayNumber,
    selectedDateDdMmYyyy,
    activeProject,
  ]);

  // Special Jobs strictly for activeProject (sesuai user login)
  const scopedSpecialJobs = useMemo<SpecialJobItem[]>(() => {
    return specialJobs;
  }, [specialJobs]);

  // Summary Per Lokasi Kerja (for Daily Activity dari semua lokasi kerja)
  const locationSummaries = useMemo<KlienLocationSummaryRow[]>(() => {
    const map = new Map<string, KlienLocationSummaryRow>();

    unifiedDailyItems.forEach((item) => {
      const key = `${item.projectId}::${item.locationName}`;
      const existing = map.get(key) || {
        locationName: item.locationName,
        projectName: item.projectName,
        completedCount: 0,
        inProgressCount: 0,
        pendingCount: 0,
        totalCount: 0,
      };

      existing.totalCount += 1;
      if (item.status === 'completed') existing.completedCount += 1;
      else if (item.status === 'in_progress') existing.inProgressCount += 1;
      else existing.pendingCount += 1;

      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.totalCount - a.totalCount);
  }, [unifiedDailyItems]);

  // Unique location names for dropdown filter
  const availableLocationNames = useMemo(() => {
    return Array.from(new Set(unifiedDailyItems.map((i) => i.locationName)));
  }, [unifiedDailyItems]);

  // ==================== METRICS FOR THE 4 MODE CARDS ====================
  // 1. Daily Activity dari semua lokasi kerja (Pekerjaan Selesai / Total Pekerjaan)
  const completedDailyCount = useMemo(
    () => unifiedDailyItems.filter((i) => i.status === 'completed').length,
    [unifiedDailyItems]
  );
  const inProgressDailyCount = useMemo(
    () => unifiedDailyItems.filter((i) => i.status === 'in_progress').length,
    [unifiedDailyItems]
  );
  const pendingDailyCount = useMemo(
    () => unifiedDailyItems.filter((i) => i.status === 'pending').length,
    [unifiedDailyItems]
  );
  const totalDailyCount = unifiedDailyItems.length;
  const dailyCompletionPercent =
    totalDailyCount > 0 ? Math.round((completedDailyCount / totalDailyCount) * 100) : 0;

  // 2. Special Job (Pekerjaan Selesai / Total Pekerjaan)
  const completedSpecialCount = useMemo(
    () => scopedSpecialJobs.filter((j) => j.status === 'completed').length,
    [scopedSpecialJobs]
  );
  const inProgressSpecialCount = useMemo(
    () => scopedSpecialJobs.filter((j) => j.status === 'in_progress').length,
    [scopedSpecialJobs]
  );
  const totalSpecialCount = scopedSpecialJobs.length;
  const specialCompletionPercent =
    totalSpecialCount > 0 ? Math.round((completedSpecialCount / totalSpecialCount) * 100) : 0;

  // 3. Sedang Dikerjakan (Total In Progress across Daily Activity + Special Job)
  const totalInProgressCount = inProgressDailyCount + inProgressSpecialCount;

  // Filtered Daily Activity Items for Mode 1
  const filteredDailyItems = useMemo(() => {
    return unifiedDailyItems.filter((item) => {
      if (selectedLocationFilter !== 'all' && item.locationName !== selectedLocationFilter) {
        return false;
      }
      if (dailyStatusFilter !== 'all' && item.status !== dailyStatusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchLoc = item.locationName.toLowerCase().includes(q);
        const matchProj = item.projectName.toLowerCase().includes(q);
        const matchDesc = item.workDescription.toLowerCase().includes(q);
        const matchPic = item.picName.toLowerCase().includes(q);
        if (!matchLoc && !matchProj && !matchDesc && !matchPic) return false;
      }
      return true;
    });
  }, [unifiedDailyItems, selectedLocationFilter, dailyStatusFilter, searchQuery]);

  // Export PDF Handler
  const handleDownloadPDFReport = (
    reportMode: 'combined' | 'daily_all_locations' | 'special_job'
  ) => {
    const scopeLabel = `Lokasi Proyek ${activeProject.name}`;

    const dailyRows: KlienActivityDailyRow[] = unifiedDailyItems.map((i) => ({
      locationName: i.locationName,
      projectName: i.projectName,
      workDescription: i.workDescription,
      picName: i.picName,
      shiftOrTime: i.shiftOrTime,
      status: i.status,
    }));

    exportKlienActivityReportToPDF({
      reportMode,
      project: activeProject,
      scopeLabel,
      dateLabel: `${selectedDateDdMmYyyy} (${selectedDateIndoLong})`,
      dailyItems: dailyRows,
      locationSummaries,
      specialJobs: scopedSpecialJobs,
      kopSurat: getProjectKop(activeProject, companyProfile),
    });

    const label =
      reportMode === 'daily_all_locations'
        ? 'Laporan PDF Daily Activity Semua Lokasi Kerja'
        : reportMode === 'special_job'
        ? 'Laporan PDF Special Job'
        : 'Laporan PDF Eksekutif Gabungan Activity Report';
    showToast(`${label} (${selectedDateDdMmYyyy}) berhasil diunduh!`);
  };

  // Export CSV Handler
  const handleDownloadCSVReport = () => {
    const headers = [
      'No',
      'Tanggal (dd/mm/yyyy)',
      'Kategori Activity',
      'Sumber / Frekuensi',
      'Site Proyek',
      'Lokasi Kerja / Area',
      'Uraian Pekerjaan',
      'Petugas / PIC',
      'Jadwal / Shift',
      'Status Pelaksanaan',
    ];

    const dailyRows = unifiedDailyItems.map((item, idx) => [
      (idx + 1).toString(),
      `"${selectedDateDdMmYyyy}"`,
      '"Daily Activity"',
      item.origin === 'task' ? '"Agenda Harian Area"' : '"Program Harian (MCP - D)"',
      `"${item.projectName.replace(/"/g, '""')}"`,
      `"${item.locationName.replace(/"/g, '""')}"`,
      `"${item.workDescription.replace(/"/g, '""')}"`,
      `"${item.picName.replace(/"/g, '""')}"`,
      `"${item.shiftOrTime.replace(/"/g, '""')}"`,
      item.status === 'completed'
        ? '"Selesai"'
        : item.status === 'in_progress'
        ? '"Sedang Dikerjakan"'
        : '"Menunggu Tindakan"',
    ]);

    const specialRows = scopedSpecialJobs.map((job, idx) => [
      (unifiedDailyItems.length + idx + 1).toString(),
      `"${selectedDateDdMmYyyy}"`,
      '"Special Job"',
      job.sourceType === 'supervisor_request'
        ? '"By Request Supervisor"'
        : job.sourceType === 'weekly_activity'
        ? '"Dari Weekly Activity"'
        : '"Dari Monthly Activity"',
      `"${getProjectNameById(job.projectId).replace(/"/g, '""')}"`,
      `"${job.location.replace(/"/g, '""')} (${job.floor})"`,
      `"${job.title.replace(/"/g, '""')}"`,
      `"${job.assignedPicName.replace(/"/g, '""')}"`,
      `"${job.shiftName} (${job.scheduledDate})"`,
      job.status === 'completed'
        ? '"Selesai"'
        : job.status === 'in_progress'
        ? '"Sedang Dikerjakan"'
        : '"Menunggu Tindakan"',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...dailyRows.map((r) => r.join(',')), ...specialRows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Activity_Report_Klien_${selectedDateDdMmYyyy.replace(/\//g, '-')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Data CSV Activity Report (${selectedDateDdMmYyyy}) berhasil diunduh!`);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2.5 text-xs animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{toastMsg}</span>
        </div>
      )}

      {/* ==================== SECTION 1: HEADER, FILTER (DD/MM/YYYY) & 4 MODE KARTU (MODEL KARTU SEPERTI SCREENSHOT) ==================== */}
      <div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2.5">
              <CalendarRange className="w-6 h-6 text-sky-600 shrink-0" />
              <span>Activity Report &amp; Realisasi Pekerjaan Harian</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Monitoring penyelesaian pekerjaan operasional per tanggal terpilih,{' '}
              <strong className="font-semibold text-slate-700">{selectedDateIndoLong}</strong> ({selectedDateDdMmYyyy})
            </p>
          </div>

          {/* PILL FILTER BAR (FILTER TANGGAL DD/MM/YYYY - HANYA PROYEK SESUAI USER LOGIN) */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Pill Filter Tanggal (dd/mm/yyyy) */}
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-sky-600 shrink-0" />
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-50/90 border border-sky-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleStepDate(-1)}
                  title="Tanggal Sebelumnya"
                  className="p-0.5 rounded-full hover:bg-sky-200/60 text-sky-800 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold text-sky-900 tracking-tight">
                    Periode
                  </span>
                  <span className="text-sky-300">|</span>
                  <input
                    type="date"
                    value={selectedDateIso}
                    onChange={(e) => {
                      if (e.target.value) setSelectedDateIso(e.target.value);
                    }}
                    aria-label="Filter Tanggal (dd/mm/yyyy)"
                    className="text-xs font-bold text-sky-900 bg-transparent focus:outline-none cursor-pointer"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleStepDate(1)}
                  title="Tanggal Berikutnya"
                  className="p-0.5 rounded-full hover:bg-sky-200/60 text-sky-800 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Badge Lokasi Proyek Sesuai User Login (Tanpa Dropdown Pilih Lokasi Kerja) */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
              <Building2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>{activeProject.name}</span>
            </div>
          </div>
        </div>

        {/* 4 MODE KARTU DENGAN DESAIN PERSIS SEPERTI CONTOH GAMBAR */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* KARTU 1: DAILY ACTIVITY DARI SEMUA LOKASI KERJA (PEKERJAAN SELESAI / TOTAL PEKERJAAN) */}
          <button
            type="button"
            onClick={() => setActiveCardMode('daily_activity')}
            className={`text-left p-4 sm:p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between min-h-[142px] active:scale-[0.99] ${
              activeCardMode === 'daily_activity'
                ? 'bg-white border-sky-400 ring-2 ring-sky-500/20 shadow-md'
                : 'bg-white hover:border-slate-300 border-slate-200/90 shadow-xs'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-[11px] sm:text-xs font-bold text-slate-600 uppercase tracking-wider leading-snug">
                DAILY ACTIVITY
                <span className="block text-[10px] font-semibold text-slate-400 mt-0.5">
                  SEMUA LOKASI KERJA
                </span>
              </span>
              <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                <CalendarRange className="w-4 h-4" />
              </div>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums tracking-tight">
                {completedDailyCount} / {totalDailyCount}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-1 font-medium truncate">
                {dailyCompletionPercent}% Selesai ({locationSummaries.length} Area Kerja)
              </p>
            </div>
          </button>

          {/* KARTU 2: SPECIAL JOB (PEKERJAAN SELESAI / TOTAL PEKERJAAN) */}
          <button
            type="button"
            onClick={() => setActiveCardMode('special_job')}
            className={`text-left p-4 sm:p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between min-h-[142px] active:scale-[0.99] ${
              activeCardMode === 'special_job'
                ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/25 shadow-md'
                : 'bg-emerald-50/70 hover:bg-emerald-50 border-emerald-200 shadow-xs'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-[11px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider leading-snug">
                SPECIAL JOB
                <span className="block text-[10px] font-semibold text-emerald-700/80 mt-0.5">
                  SELESAI / TOTAL
                </span>
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-200/80 text-emerald-800 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 tabular-nums tracking-tight">
                {completedSpecialCount} / {totalSpecialCount}
              </div>
              <p className="text-[11px] sm:text-xs text-emerald-600 mt-1 font-medium truncate">
                {specialCompletionPercent}% Penyelesaian Special Job
              </p>
            </div>
          </button>

          {/* KARTU 3: SEDANG DIKERJAKAN */}
          <button
            type="button"
            onClick={() => setActiveCardMode('in_progress')}
            className={`text-left p-4 sm:p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between min-h-[142px] active:scale-[0.99] ${
              activeCardMode === 'in_progress'
                ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-500/25 shadow-md'
                : 'bg-amber-50/70 hover:bg-amber-50 border-amber-200 shadow-xs'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-[11px] sm:text-xs font-bold text-amber-800 uppercase tracking-wider leading-snug">
                SEDANG DIKERJAKAN
                <span className="block text-[10px] font-semibold text-amber-700/80 mt-0.5">
                  PROGRES LAPANGAN
                </span>
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-200/80 text-amber-800 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-700 tabular-nums tracking-tight">
                {totalInProgressCount}
              </div>
              <p className="text-[11px] sm:text-xs text-amber-600 mt-1 font-medium truncate">
                {inProgressDailyCount} Daily • {inProgressSpecialCount} Special Job
              </p>
            </div>
          </button>

          {/* KARTU 4: DOWNLOAD LAPORAN */}
          <div
            onClick={() => setActiveCardMode('download_laporan')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setActiveCardMode('download_laporan');
            }}
            className={`text-left p-4 sm:p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between min-h-[142px] active:scale-[0.99] ${
              activeCardMode === 'download_laporan'
                ? 'bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-500 ring-2 ring-indigo-500/25 shadow-md'
                : 'bg-gradient-to-br from-indigo-50 to-blue-50 hover:border-indigo-300 border-indigo-200 shadow-xs'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-[11px] sm:text-xs font-bold text-indigo-800 uppercase tracking-wider leading-snug">
                DOWNLOAD LAPORAN
                <span className="block text-[10px] font-semibold text-indigo-600/80 mt-0.5">
                  PDF &amp; CSV / EXCEL
                </span>
              </span>
              <div className="w-9 h-9 rounded-xl bg-indigo-200 text-indigo-800 flex items-center justify-center shrink-0">
                <FileDown className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-end justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xl sm:text-2xl font-extrabold text-indigo-900 tracking-tight truncate">
                  {totalDailyCount + totalSpecialCount} Data
                </div>
                <p className="text-[11px] sm:text-xs text-indigo-700 mt-0.5 font-medium truncate">
                  Target SLA Tercapai
                </p>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadPDFReport('combined');
                }}
                className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold shadow-xs flex items-center gap-1 cursor-pointer shrink-0"
                title="Unduh Cepat PDF Laporan Gabungan"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Unduh PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== ISI MENU 1: DAILY ACTIVITY DARI SEMUA LOKASI KERJA ==================== */}
      {activeCardMode === 'daily_activity' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* REKAPITULASI PER LOKASI KERJA (PEKERJAAN SELESAI / TOTAL PEKERJAAN) - Disembunyikan saat mode Ponsel */}
          <div className="hidden md:block bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-sky-600" />
                  <span>
                    Daily Activity dari Semua Lokasi Kerja — {completedDailyCount} / {totalDailyCount} Pekerjaan Selesai ({dailyCompletionPercent}%)
                  </span>
                </h4>
                <p className="text-xs text-slate-500">
                  Tanggal Pelaksanaan: <strong>{selectedDateDdMmYyyy}</strong> • Klik salah satu area kerja untuk melihat detail pekerjaan pada lokasi tersebut.
                </p>
              </div>

              {selectedLocationFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedLocationFilter('all')}
                  className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold border border-sky-200 transition-colors cursor-pointer self-start sm:self-auto"
                >
                  Tampilkan Semua Area ({locationSummaries.length})
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {locationSummaries.map((loc) => {
                const isSelected = selectedLocationFilter === loc.locationName;
                const pct =
                  loc.totalCount > 0
                    ? Math.round((loc.completedCount / loc.totalCount) * 100)
                    : 0;

                return (
                  <button
                    key={`${loc.projectName}-${loc.locationName}`}
                    type="button"
                    onClick={() =>
                      setSelectedLocationFilter(
                        isSelected ? 'all' : loc.locationName
                      )
                    }
                    className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-sky-50/90 border-sky-500 ring-2 ring-sky-500/20 shadow-xs'
                        : 'bg-slate-50/70 hover:bg-white border-slate-200/90'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {loc.locationName}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{loc.projectName}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-lg text-[11px] font-extrabold bg-sky-100 text-sky-800 shrink-0 tabular-nums">
                        {loc.completedCount} / {loc.totalCount}
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-1.5">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                      <span>{pct}% Penyelesaian</span>
                      {loc.inProgressCount > 0 ? (
                        <span className="text-amber-700 font-bold">
                          {loc.inProgressCount} Sedang Dikerjakan
                        </span>
                      ) : loc.pendingCount > 0 ? (
                        <span className="text-rose-700 font-semibold">
                          {loc.pendingCount} Menunggu Tindakan
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-semibold">100% Selesai</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* FILTER BAR (PENCARIAN, FILTER TANGGAL DD/MM/YYYY & STATUS — TANPA DROPDOWN PILIH LOKASI KERJA) */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari detail pekerjaan harian, area gedung, petugas..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              {/* Filter Tanggal (dd/mm/yyyy) langsung pada bar pencarian detail */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <Calendar className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span className="font-bold text-slate-700 whitespace-nowrap">
                  Tgl ({selectedDateDdMmYyyy}):
                </span>
                <input
                  type="date"
                  value={selectedDateIso}
                  onChange={(e) => {
                    if (e.target.value) setSelectedDateIso(e.target.value);
                  }}
                  aria-label="Filter Tanggal Detail Pekerjaan"
                  className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setDailyStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  dailyStatusFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua ({totalDailyCount})
              </button>
              <button
                type="button"
                onClick={() => setDailyStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  dailyStatusFilter === 'pending'
                    ? 'bg-white text-rose-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Menunggu Tindakan ({pendingDailyCount})
              </button>
              <button
                type="button"
                onClick={() => setDailyStatusFilter('in_progress')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  dailyStatusFilter === 'in_progress'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sedang Dikerjakan ({inProgressDailyCount})
              </button>
              <button
                type="button"
                onClick={() => setDailyStatusFilter('completed')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  dailyStatusFilter === 'completed'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Selesai ({completedDailyCount})
              </button>
            </div>
          </div>

          {/* DAFTAR KARTU DAILY ACTIVITY DARI SEMUA LOKASI KERJA */}
          {filteredDailyItems.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-2">
              <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">
                Tidak Ada Data Daily Activity yang Sesuai Filter
              </h4>
              <p className="text-xs text-slate-500">
                Silakan ubah kata kunci pencarian atau pilih "Semua Area Kerja".
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredDailyItems.map((item) => {
                const hasPhotos = item.photoBefore || item.photoAfter;

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
                  >
                    <div className="p-4">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 truncate max-w-[180px]">
                          {item.projectName}
                        </span>
                        <span className="text-[10.5px] font-bold text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-sky-600" />
                          {item.dateDdMmYyyy}
                        </span>
                      </div>

                      {/* Location & Work Description */}
                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-700 mb-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="line-clamp-1">{item.locationName}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 line-clamp-2 mb-2.5">
                        {item.workDescription}
                      </h4>

                      {/* Officer & Schedule Info */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1 mb-3">
                        <div className="flex items-center justify-between text-slate-700">
                          <span className="text-slate-400">Petugas / PIC:</span>
                          <span className="font-semibold">{item.picName}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-700">
                          <span className="text-slate-400">Jadwal:</span>
                          <span className="font-medium text-[11px] truncate max-w-[180px]">
                            {item.shiftOrTime}
                          </span>
                        </div>
                        {item.qcScore && (
                          <div className="flex items-center justify-between text-slate-700 pt-1 border-t border-slate-200/60">
                            <span className="text-slate-400">Skor Mutu QC:</span>
                            <span className="font-bold text-sky-700">{item.qcScore}/100</span>
                          </div>
                        )}
                      </div>

                      {/* Photo Thumbnail Preview */}
                      {hasPhotos && (
                        <div className="flex items-center gap-2">
                          {item.photoBefore && (
                            <div className="relative w-16 h-11 rounded-lg bg-slate-100 overflow-hidden border border-slate-200">
                              <img
                                src={item.photoBefore}
                                alt="Before"
                                className="w-full h-full object-cover"
                              />
                              <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-white text-center font-bold">
                                Before
                              </span>
                            </div>
                          )}
                          {item.photoAfter && (
                            <div className="relative w-16 h-11 rounded-lg bg-slate-100 overflow-hidden border border-slate-200">
                              <img
                                src={item.photoAfter}
                                alt="After"
                                className="w-full h-full object-cover"
                              />
                              <span className="absolute bottom-0 inset-x-0 bg-emerald-700/80 text-[8px] text-white text-center font-bold">
                                After
                              </span>
                            </div>
                          )}
                          <span className="text-[10.5px] text-slate-500 flex items-center gap-1 ml-auto">
                            <Camera className="w-3.5 h-3.5 text-slate-400" />
                            Foto Bukti
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Footer: Status Badge + Detail Lengkap */}
                    <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="shrink-0">
                        {getDailyStatusBadge(item.status)}
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedDailyItem(item)}
                        className="py-1.5 px-3.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>Detail Lengkap</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== ISI MENU 2: SPECIAL JOB (PEKERJAAN SELESAI / TOTAL PEKERJAAN) ==================== */}
      {activeCardMode === 'special_job' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="hidden md:flex bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200 flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-700" />
                <span>
                  Special Job (Pekerjaan Selesai / Total Pekerjaan): {completedSpecialCount} / {totalSpecialCount} Selesai ({specialCompletionPercent}%)
                </span>
              </h4>
              <p className="text-xs text-emerald-800 mt-0.5">
                Terintegrasi langsung dengan pembuatan request Special Job (<strong>By Request dari User Supervisor</strong>), pengambilan dari <strong>Weekly / Monthly Activity</strong>, dokumentasi foto ber-timestamp, dan verifikasi Supervisor.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-white text-emerald-800 border border-emerald-200 shadow-2xs">
                Tanggal: {selectedDateDdMmYyyy}
              </span>
              <span className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-200/80 text-emerald-900">
                {completedSpecialCount} / {totalSpecialCount} Selesai
              </span>
            </div>
          </div>

          <SpecialJobView readOnlyStatus={true} />
        </div>
      )}

      {/* ==================== ISI MENU 3: SEDANG DIKERJAKAN ==================== */}
      {activeCardMode === 'in_progress' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Banner Header Sedang Dikerjakan */}
          <div className="bg-amber-50/90 p-4 sm:p-5 rounded-2xl border border-amber-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-ping" />
                <h4 className="text-base font-extrabold text-amber-950">
                  Pekerjaan Sedang Dikerjakan di Lapangan ({totalInProgressCount} Pekerjaan Aktif)
                </h4>
              </div>
              <p className="text-xs text-amber-800 mt-1">
                Tanggal: <strong>{selectedDateDdMmYyyy}</strong> • Gabungan pekerjaan yang sedang berlangsung di <strong>{activeProject.name}</strong> dari{' '}
                <strong>Daily Activity ({inProgressDailyCount})</strong> dan{' '}
                <strong>Special Job ({inProgressSpecialCount})</strong> sesuai status yang diupdate oleh petugas lapangan.
              </p>
            </div>

            {/* Filter Sumber Pekerjaan Sedang Dikerjakan */}
            <div className="flex flex-wrap items-center gap-1 bg-white p-1 rounded-xl border border-amber-200 text-xs self-start lg:self-auto">
              <button
                type="button"
                onClick={() => setInProgressSourceFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  inProgressSourceFilter === 'all'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua Sumber ({totalInProgressCount})
              </button>
              <button
                type="button"
                onClick={() => setInProgressSourceFilter('daily')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  inProgressSourceFilter === 'daily'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Daily Activity ({inProgressDailyCount})
              </button>
              <button
                type="button"
                onClick={() => setInProgressSourceFilter('special')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  inProgressSourceFilter === 'special'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Special Job ({inProgressSpecialCount})
              </button>
            </div>
          </div>

          {totalInProgressCount === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-900">
                Semua Pekerjaan Telah Selesai / Tidak Ada yang Sedang Dikerjakan
              </h4>
              <p className="text-xs text-slate-500">
                Saat ini tidak ada antrian pekerjaan yang berstatus sedang dikerjakan pada tanggal {selectedDateDdMmYyyy}.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 1. In-Progress Daily Activity Items */}
              {(inProgressSourceFilter === 'all' || inProgressSourceFilter === 'daily') &&
                unifiedDailyItems
                  .filter((i) => i.status === 'in_progress')
                  .map((item) => (
                    <div
                      key={`inprog-daily-${item.id}`}
                      className="bg-white rounded-2xl border-2 border-amber-200/90 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                    >
                      <div className="p-4">
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <span className="px-2.5 py-0.5 rounded-md text-[10.5px] font-extrabold bg-sky-100 text-sky-800 border border-sky-200">
                            DAILY ACTIVITY
                          </span>
                          <span className="text-[11px] font-bold text-slate-500">
                            {item.dateDdMmYyyy}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs font-bold text-sky-700 mb-1">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span>{item.locationName}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mb-2">
                          Site: <strong>{item.projectName}</strong>
                        </p>

                        <h4 className="text-sm font-bold text-slate-900 mb-2.5">
                          {item.workDescription}
                        </h4>

                        <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/70 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Petugas Pelaksana:</span>
                            <span className="font-bold text-slate-800">{item.picName}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Jadwal / Shift:</span>
                            <span className="font-medium text-slate-700">{item.shiftOrTime}</span>
                          </div>
                        </div>
                      </div>

                      {/* Footer: Status Pekerjaan (Read-Only dari Petugas) + Detail Lengkap */}
                      <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="shrink-0">
                          {getDailyStatusBadge(item.status)}
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedDailyItem(item)}
                          className="py-1.5 px-3.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>Detail Lengkap</span>
                        </button>
                      </div>
                    </div>
                  ))}

              {/* 2. In-Progress Special Job Items */}
              {(inProgressSourceFilter === 'all' || inProgressSourceFilter === 'special') &&
                scopedSpecialJobs
                  .filter((j) => j.status === 'in_progress')
                  .map((job) => (
                    <div
                      key={`inprog-special-${job.id}`}
                      className="bg-white rounded-2xl border-2 border-emerald-200/90 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                    >
                      <div className="p-4">
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <span className="px-2.5 py-0.5 rounded-md text-[10.5px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            SPECIAL JOB
                          </span>
                          <span className="text-[11px] font-bold text-slate-500">
                            {selectedDateDdMmYyyy}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 mb-1">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {job.location} ({job.floor})
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mb-2">
                          Sumber:{' '}
                          <strong>
                            {job.sourceType === 'supervisor_request'
                              ? 'By Request Supervisor'
                              : job.sourceType === 'weekly_activity'
                              ? 'Dari Weekly Activity'
                              : 'Dari Monthly Activity'}
                          </strong>
                        </p>

                        <h4 className="text-sm font-bold text-slate-900 mb-2.5">
                          {job.title}
                        </h4>

                        <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200/70 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Request SPV:</span>
                            <span className="font-bold text-emerald-950">
                              {job.requestedBy}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Petugas:</span>
                            <span className="font-bold text-slate-800">
                              {job.assignedPicName}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Mulai Pengerjaan:</span>
                            <span className="font-medium text-amber-800">
                              {job.startedAt || 'Sedang Berlangsung'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Footer: Status Pekerjaan (Read-Only dari Petugas) + Detail Lengkap */}
                      <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="shrink-0">
                          {getDailyStatusBadge('in_progress')}
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedSpecialDetail(job)}
                          className="py-1.5 px-3.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>Detail Lengkap</span>
                        </button>
                      </div>
                    </div>
                  ))}
            </div>
          )}
        </div>
      )}

      {/* ==================== ISI MENU 4: DOWNLOAD LAPORAN ==================== */}
      {activeCardMode === 'download_laporan' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Header Download Laporan */}
          <div className="bg-indigo-50/80 p-5 rounded-2xl border border-indigo-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h4 className="text-base font-extrabold text-indigo-950 flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-700" />
                <span>Pusat Download Laporan Activity Report ({selectedDateDdMmYyyy})</span>
              </h4>
              <p className="text-xs text-indigo-800 mt-1">
                Unduh dokumen laporan resmi ber-Kop Surat perusahaan untuk{' '}
                <strong>Daily Activity dari Semua Lokasi Kerja ({completedDailyCount}/{totalDailyCount})</strong>,{' '}
                <strong>Special Job ({completedSpecialCount}/{totalSpecialCount})</strong>, dan pekerjaan{' '}
                <strong>Sedang Dikerjakan ({totalInProgressCount})</strong>.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleDownloadPDFReport('combined')}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <FileDown className="w-4 h-4" />
                <span>Download PDF Laporan Eksekutif Gabungan</span>
              </button>
            </div>
          </div>

          {/* 4 KARTU PILIHAN UNDUH DOKUMEN */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Opsi 1: PDF Gabungan Lengkap */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3">
                  <FileDown className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  REKOMENDASI KLIEN • {selectedDateDdMmYyyy}
                </span>
                <h5 className="text-sm font-bold text-slate-900 mt-1.5">
                  1. PDF Laporan Eksekutif Gabungan
                </h5>
                <p className="text-xs text-slate-500 mt-1">
                  Mencakup Rekapitulasi Daily Activity Semua Lokasi Kerja, Rincian Daily Activity, serta Daftar Special Job dalam 1 dokumen PDF resmi.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDownloadPDFReport('combined')}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileDown className="w-4 h-4" />
                <span>Unduh PDF Gabungan</span>
              </button>
            </div>

            {/* Opsi 2: PDF Daily Activity Semua Lokasi Kerja */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center mb-3">
                  <Calendar className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                  {completedDailyCount} / {totalDailyCount} PEKERJAAN SELESAI
                </span>
                <h5 className="text-sm font-bold text-slate-900 mt-1.5">
                  2. PDF Daily Activity Semua Lokasi Kerja
                </h5>
                <p className="text-xs text-slate-500 mt-1">
                  Laporan khusus capaian Daily Activity dari semua lokasi kerja ({locationSummaries.length} area kerja) beserta rincian petugas &amp; status.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDownloadPDFReport('daily_all_locations')}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileDown className="w-4 h-4" />
                <span>Unduh PDF Daily Activity</span>
              </button>
            </div>

            {/* Opsi 3: PDF Special Job */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                  <Sparkles className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {completedSpecialCount} / {totalSpecialCount} PEKERJAAN SELESAI
                </span>
                <h5 className="text-sm font-bold text-slate-900 mt-1.5">
                  3. PDF Laporan Special Job
                </h5>
                <p className="text-xs text-slate-500 mt-1">
                  Laporan pelaksanaan pekerjaan Special Job By Request Supervisor serta pekerjaan yang diambil dari Weekly &amp; Monthly Activity.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDownloadPDFReport('special_job')}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileDown className="w-4 h-4" />
                <span>Unduh PDF Special Job</span>
              </button>
            </div>

            {/* Opsi 4: CSV / Excel Spreadsheet */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-3">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  FORMAT EXCEL / CSV
                </span>
                <h5 className="text-sm font-bold text-slate-900 mt-1.5">
                  4. Ekspor CSV / Excel Rekapitulasi
                </h5>
                <p className="text-xs text-slate-500 mt-1">
                  Unduh seluruh baris data Daily Activity semua lokasi kerja dan Special Job tanggal {selectedDateDdMmYyyy} dalam format spreadsheet (.csv).
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadCSVReport}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Unduh CSV / Excel</span>
              </button>
            </div>
          </div>

          {/* PRATINJAU TABEL REKAPITULASI LAPORAN */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h5 className="text-sm font-bold text-slate-900">
                  Tabel Pratinjau Rekapitulasi Activity Report ({selectedDateDdMmYyyy})
                </h5>
                <p className="text-xs text-slate-500">
                  Ringkasan capaian Pekerjaan Selesai / Total Pekerjaan per area kerja.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 border border-sky-200">
                  Daily Activity: {completedDailyCount} / {totalDailyCount} ({dailyCompletionPercent}%)
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Special Job: {completedSpecialCount} / {totalSpecialCount} ({specialCompletionPercent}%)
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <th className="py-2.5 px-4 font-bold">No</th>
                    <th className="py-2.5 px-4 font-bold">Tanggal</th>
                    <th className="py-2.5 px-4 font-bold">Lokasi Kerja / Area</th>
                    <th className="py-2.5 px-4 font-bold">Site Proyek</th>
                    <th className="py-2.5 px-4 font-bold text-center">
                      Pekerjaan Selesai / Total Pekerjaan
                    </th>
                    <th className="py-2.5 px-4 font-bold text-center">Sedang Dikerjakan</th>
                    <th className="py-2.5 px-4 font-bold text-center">Persentase</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {locationSummaries.map((loc, idx) => {
                    const pct =
                      loc.totalCount > 0
                        ? Math.round((loc.completedCount / loc.totalCount) * 100)
                        : 0;
                    return (
                      <tr key={`${loc.projectName}-${loc.locationName}`} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-4 font-semibold text-slate-500">{idx + 1}</td>
                        <td className="py-2.5 px-4 font-medium text-slate-600">{selectedDateDdMmYyyy}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-900">{loc.locationName}</td>
                        <td className="py-2.5 px-4 text-slate-600">{loc.projectName}</td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="px-2.5 py-0.5 rounded-full font-extrabold bg-sky-50 text-sky-700 border border-sky-200">
                            {loc.completedCount} / {loc.totalCount} Pekerjaan
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center font-semibold text-amber-700">
                          {loc.inProgressCount} Pekerjaan
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="font-extrabold text-emerald-700">{pct}%</span>
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

      {/* MODAL DETAIL LENGKAP DAILY ACTIVITY */}
      {selectedDailyItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700">
                    {selectedDailyItem.projectName}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    Tanggal: {selectedDailyItem.dateDdMmYyyy}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedDailyItem.locationName}
                </h3>
                <p className="text-xs text-slate-500">
                  Petugas / PIC:{' '}
                  <span className="font-semibold text-slate-700">
                    {selectedDailyItem.picName}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDailyItem(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2 text-xs">
              <div>
                <span className="font-bold text-slate-700 block">Uraian Pekerjaan Daily Activity:</span>
                <p className="text-slate-800 font-medium mt-0.5">
                  {selectedDailyItem.workDescription}
                </p>
              </div>
              <div>
                <span className="font-bold text-slate-700 block">Metode &amp; SOP:</span>
                <p className="text-slate-600 mt-0.5">{selectedDailyItem.workMethod}</p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/70">
                <span className="text-slate-500">Jadwal / Shift:</span>
                <span className="font-bold text-slate-800">{selectedDailyItem.shiftOrTime}</span>
              </div>
            </div>

            {/* Dokumentasi Foto */}
            <div>
              <span className="text-xs font-bold text-slate-700 block mb-2">
                Dokumentasi Kerja (Before - Progress - After)
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <div className="h-28 rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
                    <img
                      src={
                        selectedDailyItem.photoBefore ||
                        'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&auto=format&fit=crop&q=80'
                      }
                      alt="Before"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-center block text-slate-600">
                    Foto Before
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="h-28 rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
                    <img
                      src={
                        selectedDailyItem.photoProgress ||
                        'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&auto=format&fit=crop&q=80'
                      }
                      alt="Progress"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-center block text-slate-600">
                    Foto Progress
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="h-28 rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
                    <img
                      src={
                        selectedDailyItem.photoAfter ||
                        'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=400&auto=format&fit=crop&q=80'
                      }
                      alt="After"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-center block text-emerald-700">
                    Foto After Selesai
                  </span>
                </div>
              </div>
            </div>

            {selectedDailyItem.remarks && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                <span className="font-bold text-slate-700 block mb-0.5">Catatan Lapangan:</span>
                <p className="text-slate-600">{selectedDailyItem.remarks}</p>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Status Pekerjaan:</span>
                {getDailyStatusBadge(selectedDailyItem.status)}
              </div>
              <button
                type="button"
                onClick={() => setSelectedDailyItem(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETAIL LENGKAP SPECIAL JOB DARI MODE 3 */}
      {selectedSpecialDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                  {selectedSpecialDetail.ticketNo} • Special Job ({selectedDateDdMmYyyy})
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {selectedSpecialDetail.title}
                </h3>
                <p className="text-xs text-slate-500">
                  Lokasi: {selectedSpecialDetail.location} ({selectedSpecialDetail.floor})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSpecialDetail(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2 text-xs">
              <div>
                <span className="font-bold text-slate-700 block">Deskripsi Pekerjaan:</span>
                <p className="text-slate-700 mt-0.5">{selectedSpecialDetail.workDescription || selectedSpecialDetail.title}</p>
              </div>
              <div>
                <span className="font-bold text-slate-700 block">Metode &amp; SOP:</span>
                <p className="text-slate-600 mt-0.5">{selectedSpecialDetail.workMethod}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/70">
                <div>
                  <span className="text-slate-400 block">Request Supervisor:</span>
                  <span className="font-bold text-slate-800">
                    {selectedSpecialDetail.requestedBy}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Petugas Pelaksana:</span>
                  <span className="font-bold text-slate-800">
                    {selectedSpecialDetail.assignedPicName}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Status Pekerjaan:</span>
                {getDailyStatusBadge(
                  selectedSpecialDetail.status === 'completed'
                    ? 'completed'
                    : selectedSpecialDetail.status === 'in_progress'
                    ? 'in_progress'
                    : 'pending'
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedSpecialDetail(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
