import React, { useState, useMemo } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  MapPin,
  Users,
  Eye,
  FileCheck,
  Package,
  Calendar,
  ArrowRight,
  FileText,
  X,
  Plus,
  ChevronDown,
  ClipboardList,
  Edit3,
  RotateCcw,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import { CleaningTask, TaskStatus } from '../../types';
import { BeforeAfterModal } from '../modals/BeforeAfterModal';

// Helper: convert YYYY-MM-DD to DD/MM/YYYY
const toDdMmYyyy = (isoDate: string): string => {
  if (!isoDate) return '';
  if (isoDate.includes('/')) return isoDate;
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
};

// Helper: convert DD/MM/YYYY to YYYY-MM-DD for <input type="date">
const toIsoDate = (ddMmYyyy?: string): string => {
  if (!ddMmYyyy) return '2026-09-13';
  if (ddMmYyyy.includes('-')) return ddMmYyyy;
  const parts = ddMmYyyy.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return '2026-09-13';
};

export const CleaningActivityView: React.FC = () => {
  const {
    tasks,
    areas,
    checklistLocations,
    shifts,
    cleaners,
    activeProject,
    setActiveTab,
    setSelectedTaskId,
    exportTasksToMonthlyReport,
    removeTaskFromMonthlyReport,
    toggleTaskChecklist,
    updateTaskMeta,
    addTaskChecklistItem,
    addCleaningTask,
  } = useCleaning();

  // Filter states: Status, Shift, Area Kerja, Tanggal (dd/mm/yyyy), Month
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [shiftFilter, setShiftFilter] = useState<string>('all');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [dateFilterIso, setDateFilterIso] = useState<string>(''); // '' = Semua Tanggal, or YYYY-MM-DD
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');

  // Preview & Notification states
  const [previewTask, setPreviewTask] = useState<CleaningTask | null>(null);
  const [exportSuccessNotice, setExportSuccessNotice] = useState<string | null>(null);

  // Inline editing state for Checklist Kebersihan Area metadata (Shift, Area Kerja, DD/MM/YYYY)
  const [editingMetaTaskId, setEditingMetaTaskId] = useState<string | null>(null);
  const [addingItemTaskId, setAddingItemTaskId] = useState<string | null>(null);
  const [newChecklistLabel, setNewChecklistLabel] = useState<string>('');

  // Modal state for adding a new Cleaning Activity & Checklist
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [newTaskShift, setNewTaskShift] = useState<string>(
    shifts[0] ? `${shifts[0].name} (${shifts[0].startTime} - ${shifts[0].endTime})` : 'Shift 1 (Pagi)'
  );
  const [newTaskAreaName, setNewTaskAreaName] = useState<string>(
    areas[0]?.name || checklistLocations[0]?.name || 'Toilet Pria & Wanita Lt. 2'
  );
  const [newTaskFloor, setNewTaskFloor] = useState<string>(
    areas[0]?.floor || checklistLocations[0]?.floor || 'Tower A - Lantai 2'
  );
  const [newTaskDateIso, setNewTaskDateIso] = useState<string>('2026-09-13');
  const [newTaskCleanerId, setNewTaskCleanerId] = useState<string>(cleaners[0]?.id || 'cln-1');
  const [newTaskScheduledTime, setNewTaskScheduledTime] = useState<string>('08:00 WIB');
  const [newTaskDeadlineTime, setNewTaskDeadlineTime] = useState<string>('09:00 WIB');
  const [newTaskChecklistText, setNewTaskChecklistText] = useState<string>(
    'Lantai dibersihkan & dipel kering\nKaca & cermin dilap bersih bebas bercak\nTempat sampah dikosongkan & diganti plastik\nPengharum ruangan & kelengkapan dicek'
  );

  // Combined Area Kerja options from project areas, checklistLocations, and existing tasks
  const areaOptions = useMemo(() => {
    const map = new Map<string, { name: string; floor: string; id: string }>();
    areas.forEach((a) => {
      map.set(a.name, { name: a.name, floor: a.floor || activeProject.name, id: a.id });
    });
    checklistLocations.forEach((loc) => {
      if (!map.has(loc.name)) {
        map.set(loc.name, { name: loc.name, floor: loc.floor, id: loc.id });
      }
    });
    tasks.forEach((t) => {
      if (t.areaName && !map.has(t.areaName)) {
        map.set(t.areaName, {
          name: t.areaName,
          floor: t.buildingFloor || activeProject.name,
          id: t.areaId || t.id,
        });
      }
    });
    return Array.from(map.values());
  }, [areas, checklistLocations, tasks, activeProject.name]);

  // Combined Shift options from shifts setup and existing tasks
  const shiftOptions = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();
    shifts.forEach((s) => {
      const label = s.name;
      if (!seen.has(label)) {
        seen.add(label);
        list.push(label);
      }
    });
    tasks.forEach((t) => {
      if (t.shift && !seen.has(t.shift)) {
        seen.add(t.shift);
        list.push(t.shift);
      }
    });
    return list;
  }, [shifts, tasks]);

  // Active formatted DD/MM/YYYY filter string
  const activeDateFilterDdMmYyyy = useMemo(
    () => (dateFilterIso ? toDdMmYyyy(dateFilterIso) : ''),
    [dateFilterIso]
  );

  // Filter tasks by Status, Shift, Area Kerja, and Tanggal (dd/mm/yyyy)
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // 1. Status filter
      if (statusFilter === 'exported') {
        if (!t.exportedToMonthlyReport) return false;
      } else if (statusFilter !== 'all' && t.status !== statusFilter) {
        return false;
      }

      // 2. Shift filter
      if (shiftFilter !== 'all') {
        const taskShiftNorm = (t.shift || '').toLowerCase();
        const filterShiftNorm = shiftFilter.toLowerCase();
        // Match exact or shift number (e.g. "Shift 1")
        const shiftNumMatch = filterShiftNorm.match(/shift\s*\d+/i);
        const matchesExact = taskShiftNorm === filterShiftNorm || taskShiftNorm.includes(filterShiftNorm);
        const matchesShiftNum = shiftNumMatch ? taskShiftNorm.includes(shiftNumMatch[0].toLowerCase()) : false;
        if (!matchesExact && !matchesShiftNum) return false;
      }

      // 3. Area Kerja filter
      if (areaFilter !== 'all' && t.areaName !== areaFilter) {
        return false;
      }

      // 4. Tanggal (DD/MM/YYYY) filter
      if (activeDateFilterDdMmYyyy) {
        const taskDateFormatted = t.taskDate ? toDdMmYyyy(t.taskDate) : '13/09/2026';
        if (taskDateFormatted !== activeDateFilterDdMmYyyy) return false;
      }

      return true;
    });
  }, [tasks, statusFilter, shiftFilter, areaFilter, activeDateFilterDdMmYyyy]);

  const handleExportToMonthly = (taskId: string, areaName: string) => {
    exportTasksToMonthlyReport([taskId], selectedMonth);
    setExportSuccessNotice(
      `Pekerjaan "${areaName}" berhasil diekspor ke Laporan Bulanan (${selectedMonth})!`
    );
    setTimeout(() => {
      setExportSuccessNotice(null);
    }, 4000);
  };

  const handleCreateActivity = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedCleaner = cleaners.find((c) => c.id === newTaskCleanerId) || cleaners[0];
    const matchedArea = areaOptions.find((a) => a.name === newTaskAreaName);
    const formattedDate = toDdMmYyyy(newTaskDateIso || '2026-09-13');
    const monthPeriod = (newTaskDateIso || '2026-09-13').slice(0, 7);

    const checklistItems = newTaskChecklistText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((label, idx) => ({
        id: `chk-new-${Date.now()}-${idx}`,
        label,
        checked: false,
      }));

    addCleaningTask({
      projectId: activeProject.id,
      areaId: matchedArea?.id || `area-${Date.now()}`,
      areaName: newTaskAreaName,
      buildingFloor: newTaskFloor || matchedArea?.floor || activeProject.name,
      cleanerId: selectedCleaner?.id || 'cln-1',
      cleanerName: selectedCleaner?.name || 'Petugas Kebersihan',
      shift: newTaskShift,
      taskDate: formattedDate,
      monthPeriod,
      scheduledTime: newTaskScheduledTime,
      deadlineTime: newTaskDeadlineTime,
      status: 'in_progress',
      startTime: newTaskScheduledTime,
      checklistArea:
        checklistItems.length > 0
          ? checklistItems
          : [{ id: `chk-${Date.now()}`, label: 'Pembersihan menyeluruh area kerja', checked: false }],
      suppliesUsed: [],
      remarks: '',
      exportedToMonthlyReport: false,
    });

    setShowAddActivityModal(false);
    setExportSuccessNotice(
      `Cleaning Activity & Checklist Kebersihan Area "${newTaskAreaName}" (${newTaskShift} • ${formattedDate}) berhasil ditambahkan!`
    );
    setTimeout(() => setExportSuccessNotice(null), 4000);
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
            Pemantauan Cleaning Activity & Checklist Kebersihan Area
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar aktivitas kebersihan berdasarkan Shift, Area Kerja, dan Tanggal (DD/MM/YYYY) beserta verifikasi SOP
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddActivityModal(true)}
            className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Activity / Checklist</span>
          </button>

          <div className="flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px] text-slate-500 font-medium">Periode Ekspor:</span>
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

      {/* ===================================================================== */}
      {/* FITUR FILTER & KONTROL UTAMA: SHIFT, AREA KERJA, TANGGAL (DD/MM/YYYY) */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. SHIFT KERJA */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>1. Shift Kerja:</span>
              </label>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                {shiftFilter === 'all' ? 'Semua Shift' : shiftFilter}
              </span>
            </div>
            <div className="relative">
              <select
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500 appearance-none cursor-pointer"
              >
                <option value="all">Semua Shift Kerja</option>
                {shiftOptions.map((sName) => (
                  <option key={sName} value={sName}>
                    {sName}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="text-[10.5px] text-slate-500 truncate">
              Filter jadwal petugas berdasarkan pembagian shift operasional
            </p>
          </div>

          {/* 2. AREA KERJA */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                <span>2. Area Kerja:</span>
              </label>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                {areaOptions.length} Area Tersedia
              </span>
            </div>
            <div className="relative">
              <select
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500 appearance-none cursor-pointer"
              >
                <option value="all">Semua Area Kerja ({activeProject.name})</option>
                {areaOptions.map((area) => (
                  <option key={area.name} value={area.name}>
                    {area.name} ({area.floor})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="text-[10.5px] text-slate-500 truncate">
              Lokasi aktif:{' '}
              <strong className="text-slate-700">
                {areaFilter === 'all' ? 'Seluruh Area Proyek' : areaFilter}
              </strong>
            </p>
          </div>

          {/* 3. TANGGAL (DD/MM/YYYY) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-sky-700" />
                <span>3. Tanggal (DD/MM/YYYY):</span>
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold text-sky-800 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                  {activeDateFilterDdMmYyyy || 'Semua Tanggal'}
                </span>
                {dateFilterIso && (
                  <button
                    type="button"
                    onClick={() => setDateFilterIso('')}
                    className="text-[10px] font-semibold text-slate-500 hover:text-rose-600 underline cursor-pointer"
                    title="Tampilkan semua tanggal"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1 flex items-center">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                <input
                  type="date"
                  value={dateFilterIso}
                  onChange={(e) => setDateFilterIso(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <button
                type="button"
                onClick={() => setDateFilterIso('2026-09-13')}
                className={`px-2.5 py-2 rounded-xl text-[11px] font-bold border transition-colors shrink-0 cursor-pointer ${
                  dateFilterIso === '2026-09-13'
                    ? 'bg-sky-600 text-white border-sky-600'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
                title="Pilih tanggal 13/09/2026"
              >
                13/09/2026
              </button>
            </div>
            <p className="text-[10.5px] text-slate-500 truncate">
              Format tanggal:{' '}
              <strong className="font-mono text-slate-700">
                {activeDateFilterDdMmYyyy || 'DD/MM/YYYY (Semua Tanggal)'}
              </strong>
            </p>
          </div>
        </div>

        {/* Status Filter Bar & Reset Summary */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                className={`px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 cursor-pointer ${
                  statusFilter === btn.id
                    ? 'bg-white text-sky-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
            <span className="text-slate-500 font-medium">
              Menampilkan <strong className="text-slate-900">{filteredTasks.length}</strong> dari{' '}
              {tasks.length} aktivitas
            </span>
            {(shiftFilter !== 'all' || areaFilter !== 'all' || dateFilterIso !== '' || statusFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setShiftFilter('all');
                  setAreaFilter('all');
                  setDateFilterIso('');
                  setStatusFilter('all');
                }}
                className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] flex items-center gap-1 border border-rose-200 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filter</span>
              </button>
            )}
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
            onClick={() => setActiveTab('report')}
            className="font-bold text-indigo-700 underline hover:text-indigo-900 text-xs shrink-0 flex items-center gap-1 ml-4 cursor-pointer"
          >
            <span>Buka Laporan Bulanan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Empty State */}
      {filteredTasks.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800">
              Tidak ada Cleaning Activity pada filter yang dipilih
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Filter aktif: Shift <strong>{shiftFilter === 'all' ? 'Semua' : shiftFilter}</strong> • Area Kerja{' '}
              <strong>{areaFilter === 'all' ? 'Semua' : areaFilter}</strong> • Tanggal{' '}
              <strong className="font-mono">{activeDateFilterDdMmYyyy || 'Semua Tanggal'}</strong>
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setShiftFilter('all');
                setAreaFilter('all');
                setDateFilterIso('');
                setStatusFilter('all');
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
            >
              Tampilkan Semua Aktivitas
            </button>
            <button
              type="button"
              onClick={() => setShowAddActivityModal(true)}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buat Aktivitas Baru</span>
            </button>
          </div>
        </div>
      )}

      {/* Task Activity Cards */}
      <div className="space-y-4">
        {filteredTasks.map((task) => {
          const statusBadge = getStatusBadge(task.status);
          const checkedCount = task.checklistArea.filter((c) => c.checked).length;
          const totalChecklist = task.checklistArea.length;
          const checklistPercent =
            totalChecklist > 0 ? Math.round((checkedCount / totalChecklist) * 100) : 0;
          const formattedTaskDate = task.taskDate ? toDdMmYyyy(task.taskDate) : '13/09/2026';
          const isEditingMeta = editingMetaTaskId === task.id;
          const isAddingItem = addingItemTaskId === task.id;

          return (
            <div
              key={task.id}
              className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 transition-all shadow-xs"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                {/* Left Task Title & Info */}
                <div className="space-y-2 min-w-0 flex-1">
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

                    {/* Explicit Badges for Shift, Area Kerja, and DD/MM/YYYY */}
                    <span className="px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-bold flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3 text-amber-600" />
                      <span>Shift: {task.shift || 'Shift 1 (Pagi)'}</span>
                    </span>

                    <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 text-[11px] font-bold flex items-center gap-1 shrink-0">
                      <MapPin className="w-3 h-3 text-emerald-600" />
                      <span>Area Kerja: {task.areaName}</span>
                    </span>

                    <span className="px-2.5 py-0.5 rounded-lg bg-sky-50 text-sky-900 border border-sky-200 text-[11px] font-mono font-bold flex items-center gap-1 shrink-0">
                      <Calendar className="w-3 h-3 text-sky-600" />
                      <span>{formattedTaskDate}</span>
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                    {task.areaName}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1 shrink-0 font-medium text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{task.buildingFloor}</span>
                    </span>

                    <span className="text-slate-300 hidden sm:inline">•</span>

                    <span className="inline-flex items-center gap-1.5 shrink-0">
                      <Users className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span>
                        Petugas:{' '}
                        <strong className="text-slate-800 font-semibold">{task.cleanerName}</strong>{' '}
                        <span className="text-slate-500">({task.shift})</span>
                      </span>
                    </span>

                    <span className="text-slate-300 hidden sm:inline">•</span>

                    <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                      Jadwal:{' '}
                      <strong className="text-slate-700 font-semibold">{task.scheduledTime}</strong>{' '}
                      <span className="text-slate-400 font-normal">(Batas: {task.deadlineTime})</span>
                    </span>

                    {task.startTime && (
                      <>
                        <span className="text-slate-300 hidden sm:inline">•</span>
                        <span className="inline-flex items-center gap-1 shrink-0 text-slate-600">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            Mulai:{' '}
                            <strong className="text-slate-700 font-semibold">{task.startTime}</strong>
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
                        onClick={() => setActiveTab('report')}
                        className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs flex items-center gap-1.5 border border-indigo-200 transition-colors cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Di Laporan Bulanan (No. {task.monthlyOrderNo || 1})</span>
                      </button>
                      <button
                        onClick={() => removeTaskFromMonthlyReport(task.id)}
                        className="p-2 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 cursor-pointer"
                        title="Batalkan dari Laporan Bulanan"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleExportToMonthly(task.id, task.areaName)}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Ekspor ke Laporan Bulan</span>
                    </button>
                  )}

                  {task.photoBefore && task.photoAfter && (
                    <button
                      onClick={() => setPreviewTask(task)}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
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
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Audit QC Sekarang</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Detail Content: Checklists, Supplies, Remarks, Photos */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-xs">
                {/* 1. Checklist Kebersihan Area (with Shift, Area Kerja, DD/MM/YYYY) */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>
                        Checklist Kebersihan Area ({checkedCount}/{totalChecklist})
                      </span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                        {checklistPercent}%
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingMetaTaskId(isEditingMeta ? null : task.id)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 border transition-colors cursor-pointer ${
                          isEditingMeta
                            ? 'bg-sky-600 text-white border-sky-600'
                            : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                        }`}
                        title="Ubah Shift, Area Kerja, atau Tanggal (DD/MM/YYYY) pada Checklist ini"
                      >
                        <Edit3 className="w-2.5 h-2.5" />
                        <span>{isEditingMeta ? 'Selesai' : 'Atur'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Info / Editor Bar for Shift, Area Kerja, DD/MM/YYYY inside Checklist Kebersihan Area */}
                  {isEditingMeta ? (
                    <div className="p-2.5 rounded-xl bg-white border border-sky-200 space-y-2 shadow-2xs">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">
                          Shift Kerja:
                        </label>
                        <select
                          value={task.shift}
                          onChange={(e) => updateTaskMeta(task.id, { shift: e.target.value })}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-800"
                        >
                          {shiftOptions.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">
                          Area Kerja:
                        </label>
                        <select
                          value={task.areaName}
                          onChange={(e) => {
                            const selectedArea = areaOptions.find((a) => a.name === e.target.value);
                            updateTaskMeta(task.id, {
                              areaName: e.target.value,
                              ...(selectedArea
                                ? { areaId: selectedArea.id, buildingFloor: selectedArea.floor }
                                : {}),
                            });
                          }}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-800"
                        >
                          {areaOptions.map((a) => (
                            <option key={a.name} value={a.name}>
                              {a.name} ({a.floor})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">
                            Tanggal (DD/MM/YYYY):
                          </label>
                          <span className="text-[10px] font-mono font-bold text-sky-700">
                            {formattedTaskDate}
                          </span>
                        </div>
                        <input
                          type="date"
                          value={toIsoDate(task.taskDate)}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              updateTaskMeta(task.id, {
                                taskDate: toDdMmYyyy(val),
                                monthPeriod: val.slice(0, 7),
                              });
                            }
                          }}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-800"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 rounded-lg bg-white border border-slate-200/80 grid grid-cols-3 gap-1.5 text-[10.5px]">
                      <div className="min-w-0">
                        <span className="text-[9.5px] font-bold text-slate-400 uppercase block">
                          Shift
                        </span>
                        <span className="font-bold text-amber-800 truncate block" title={task.shift}>
                          {task.shift || 'Shift 1'}
                        </span>
                      </div>
                      <div className="min-w-0 border-x border-slate-100 px-1.5">
                        <span className="text-[9.5px] font-bold text-slate-400 uppercase block">
                          Area Kerja
                        </span>
                        <span
                          className="font-bold text-emerald-800 truncate block"
                          title={task.areaName}
                        >
                          {task.areaName}
                        </span>
                      </div>
                      <div className="min-w-0 pl-0.5">
                        <span className="text-[9.5px] font-bold text-slate-400 uppercase block">
                          DD/MM/YYYY
                        </span>
                        <span className="font-mono font-bold text-sky-800 truncate block">
                          {formattedTaskDate}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Interactive Checklist Items */}
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
                    {task.checklistArea.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleTaskChecklist(task.id, item.id)}
                        className="w-full text-left flex items-start gap-2 text-[11px] text-slate-600 p-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer group"
                      >
                        <span
                          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            item.checked
                              ? 'bg-emerald-500 text-white font-bold'
                              : 'border border-slate-300 bg-white group-hover:border-sky-500'
                          }`}
                        >
                          {item.checked && '✓'}
                        </span>
                        <span
                          className={
                            item.checked ? 'text-slate-800 font-medium' : 'text-slate-500'
                          }
                        >
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Quick Add Checklist Item */}
                  {isAddingItem ? (
                    <div className="flex items-center gap-1.5 pt-1">
                      <input
                        type="text"
                        value={newChecklistLabel}
                        onChange={(e) => setNewChecklistLabel(e.target.value)}
                        placeholder="Nama item checklist..."
                        className="flex-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newChecklistLabel.trim()) {
                            addTaskChecklistItem(task.id, newChecklistLabel);
                            setNewChecklistLabel('');
                            setAddingItemTaskId(null);
                          }
                        }}
                        className="px-2.5 py-1 bg-sky-600 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                      >
                        Simpan
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAddingItemTaskId(null);
                          setNewChecklistLabel('');
                        }}
                        className="px-2 py-1 bg-slate-200 text-slate-700 rounded-lg text-[11px] cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setAddingItemTaskId(task.id);
                        setNewChecklistLabel('');
                      }}
                      className="text-[11px] font-semibold text-sky-700 hover:text-sky-800 flex items-center gap-1 pt-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Tambah Item Checklist Area</span>
                    </button>
                  )}
                </div>

                {/* 2. Checklist Consumable Supplies */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
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
                          <span className="text-slate-700 font-medium truncate">
                            {sup.supplyName}
                          </span>
                          <span className="font-bold text-slate-900 bg-sky-50 px-1.5 py-0.5 rounded text-sky-700">
                            {sup.amountUsed} {sup.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Remarks & 3-Stage Photo Preview */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
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
                            src={
                              task.photoProgress ||
                              'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&auto=format&fit=crop&q=80'
                            }
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

      {/* Modal Tambah Cleaning Activity & Checklist Kebersihan Area */}
      {showAddActivityModal && (
        <div
          onClick={() => setShowAddActivityModal(false)}
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92dvh] overflow-y-auto my-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">
                    Tambah Cleaning Activity & Checklist Area
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Tentukan Shift, Area Kerja, dan Tanggal (DD/MM/YYYY)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddActivityModal(false)}
                className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateActivity} className="space-y-3.5 text-xs">
              {/* 1. Shift */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">1. Shift Kerja</label>
                <select
                  value={newTaskShift}
                  onChange={(e) => setNewTaskShift(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold text-slate-800 bg-slate-50"
                >
                  {shifts.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.startTime} - {s.endTime} WIB)
                    </option>
                  ))}
                  {shiftOptions
                    .filter((so) => !shifts.some((s) => s.name === so))
                    .map((so) => (
                      <option key={so} value={so}>
                        {so}
                      </option>
                    ))}
                </select>
              </div>

              {/* 2. Area Kerja */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">2. Area Kerja</label>
                  <select
                    value={newTaskAreaName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewTaskAreaName(val);
                      const found = areaOptions.find((a) => a.name === val);
                      if (found) setNewTaskFloor(found.floor);
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold text-slate-800 bg-slate-50"
                  >
                    {areaOptions.map((a) => (
                      <option key={a.name} value={a.name}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Gedung / Lantai</label>
                  <input
                    type="text"
                    value={newTaskFloor}
                    onChange={(e) => setNewTaskFloor(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold text-slate-800"
                    placeholder="Tower A - Lantai 1"
                  />
                </div>
              </div>

              {/* 3. Tanggal (DD/MM/YYYY) & Petugas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">3. Tanggal (DD/MM/YYYY)</label>
                    <span className="font-mono text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                      {toDdMmYyyy(newTaskDateIso)}
                    </span>
                  </div>
                  <input
                    type="date"
                    required
                    value={newTaskDateIso}
                    onChange={(e) => setNewTaskDateIso(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold text-slate-800 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Petugas Pelaksana</label>
                  <select
                    value={newTaskCleanerId}
                    onChange={(e) => setNewTaskCleanerId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold text-slate-800 bg-slate-50"
                  >
                    {cleaners.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Jam Jadwal & Batas Waktu */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jam Jadwal</label>
                  <input
                    type="text"
                    value={newTaskScheduledTime}
                    onChange={(e) => setNewTaskScheduledTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    placeholder="08:00 WIB"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Batas Selesai</label>
                  <input
                    type="text"
                    value={newTaskDeadlineTime}
                    onChange={(e) => setNewTaskDeadlineTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    placeholder="09:00 WIB"
                  />
                </div>
              </div>

              {/* Daftar Checklist Kebersihan Area */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Item Checklist Kebersihan Area (1 baris per item)
                </label>
                <textarea
                  rows={4}
                  value={newTaskChecklistText}
                  onChange={(e) => setNewTaskChecklistText(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddActivityModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  Simpan Cleaning Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Foto Before/Progress/After */}
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
