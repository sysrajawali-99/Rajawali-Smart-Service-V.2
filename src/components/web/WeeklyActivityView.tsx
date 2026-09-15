import React, { useState, useMemo } from 'react';
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Filter,
  Download,
  Building2,
  CheckCircle2,
  Layers,
  Sparkles,
  HelpCircle,
  Edit2,
  Trash2,
  User,
  MapPin,
  Calendar,
  FileText,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import { MasterCleaningProgramItem, ProgramDayStatus } from '../../types';
import {
  normalizeFrequencyCode,
  getNextProgramDayStatus,
  PROGRAM_STATUS_META,
  FREQUENCY_META,
  MONTH_OPTIONS,
} from '../../utils/mcpUtils';
import { exportWeeklyActivityToPDF } from '../../utils/pdfExport';

export const WeeklyActivityView: React.FC = () => {
  const {
    masterPrograms,
    activeProject,
    cleaners,
    areas,
    addMasterProgram,
    updateMasterProgram,
    deleteMasterProgram,
    toggleMasterProgramDay,
    setActiveTab,
  } = useCleaning();

  // Date selection state: Default is 15 September 2026
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(9);
  const [selectedDay, setSelectedDay] = useState<number>(15);

  // Week Filter: 'all' | 'w1' (1-7) | 'w2' (8-14) | 'w3' (15-21) | 'w4' (22-28) | 'w5' (29-31)
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<string>('all');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterLocation, setFilterLocation] = useState<string>('all');

  // Modal State for adding/editing Weekly Activity
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterCleaningProgramItem | null>(null);
  const [formWorkDescription, setFormWorkDescription] = useState('');
  const [formWorkMethod, setFormWorkMethod] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formPicName, setFormPicName] = useState('');
  const [formDays, setFormDays] = useState<Record<number, ProgramDayStatus>>({});

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Days in selected month
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  }, [selectedYear, selectedMonth]);

  const safeSelectedDay = Math.min(selectedDay, daysInMonth);

  // Calculate current week of selected day
  const currentWeekNumber = Math.ceil(safeSelectedDay / 7);

  const selectedDateObj = new Date(selectedYear, selectedMonth - 1, safeSelectedDay);
  const dayNameIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][
    selectedDateObj.getDay()
  ];
  const monthNameIndo = MONTH_OPTIONS.find((m) => m.value === selectedMonth)?.label || 'Bulan';
  const formattedFullDate = `${dayNameIndo}, ${safeSelectedDay} ${monthNameIndo} ${selectedYear}`;

  // Week definitions
  const weeks = useMemo(() => [
    { id: 'w1', label: 'Minggu 1', range: 'Tgl 1 - 7', start: 1, end: 7 },
    { id: 'w2', label: 'Minggu 2', range: 'Tgl 8 - 14', start: 8, end: 14 },
    { id: 'w3', label: 'Minggu 3', range: 'Tgl 15 - 21', start: 15, end: 21 },
    { id: 'w4', label: 'Minggu 4', range: 'Tgl 22 - 28', start: 22, end: 28 },
    { id: 'w5', label: 'Minggu 5', range: `Tgl 29 - ${daysInMonth}`, start: 29, end: daysInMonth },
  ], [daysInMonth]);

  // Determine active days displayed in calendar strip based on week filter
  const activeDayRange = useMemo(() => {
    if (selectedWeekFilter === 'all') {
      return Array.from({ length: daysInMonth }, (_, i) => i + 1);
    }
    const found = weeks.find((w) => w.id === selectedWeekFilter);
    if (!found) return Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const list: number[] = [];
    for (let d = found.start; d <= Math.min(found.end, daysInMonth); d++) {
      list.push(d);
    }
    return list;
  }, [selectedWeekFilter, daysInMonth, weeks]);

  // Filter Master Programs for Weekly Activity: Frequency === 'W'
  const weeklyPrograms = useMemo(() => {
    return masterPrograms.filter((item) => {
      // Must be Weekly Activity ('W')
      if (normalizeFrequencyCode(item.frequency) !== 'W') return false;
      // Must match selected month & year
      if (item.month !== selectedMonth || item.year !== selectedYear) return false;

      // Status filter on selected day
      if (filterStatus !== 'all') {
        const dayStatus = item.days[safeSelectedDay] || 'none';
        if (filterStatus === 'active_only') {
          if (dayStatus === 'none') return false;
        } else if (dayStatus !== filterStatus) {
          return false;
        }
      }

      // Week filter check (if not all, ensure at least one day in that week has planned/done/in_prog/resched)
      if (selectedWeekFilter !== 'all') {
        const currentWeekDef = weeks.find((w) => w.id === selectedWeekFilter);
        if (currentWeekDef) {
          let hasTaskInWeek = false;
          for (let d = currentWeekDef.start; d <= Math.min(currentWeekDef.end, daysInMonth); d++) {
            if (item.days[d] && item.days[d] !== 'none') {
              hasTaskInWeek = true;
              break;
            }
          }
          if (!hasTaskInWeek) return false;
        }
      }

      // Location filter
      if (filterLocation !== 'all' && item.location !== filterLocation) return false;

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchDesc = item.workDescription.toLowerCase().includes(term);
        const matchMethod = item.workMethod.toLowerCase().includes(term);
        const matchLoc = item.location.toLowerCase().includes(term);
        const matchPic = item.picName.toLowerCase().includes(term);
        if (!matchDesc && !matchMethod && !matchLoc && !matchPic) return false;
      }

      return true;
    });
  }, [
    masterPrograms,
    selectedMonth,
    selectedYear,
    safeSelectedDay,
    filterStatus,
    selectedWeekFilter,
    filterLocation,
    searchTerm,
    weeks,
    daysInMonth,
  ]);

  // Unique locations from weekly programs
  const availableLocations = useMemo(() => {
    const locSet = new Set<string>();
    masterPrograms
      .filter((p) => normalizeFrequencyCode(p.frequency) === 'W')
      .forEach((p) => {
        if (p.location) locSet.add(p.location);
      });
    return Array.from(locSet);
  }, [masterPrograms]);

  // Statistics for selected day and selected week
  const stats = useMemo(() => {
    const allWeeklies = masterPrograms.filter(
      (p) =>
        normalizeFrequencyCode(p.frequency) === 'W' &&
        p.month === selectedMonth &&
        p.year === selectedYear
    );

    let countR = 0;
    let countP = 0;
    let countT = 0;
    let countS = 0;
    let countNone = 0;
    let weekPlanTotal = 0;

    const currentWeekDef = weeks.find((w) => w.id === `w${currentWeekNumber}`) || weeks[0];

    allWeeklies.forEach((p) => {
      const st = p.days[safeSelectedDay] || 'none';
      if (st === 'planned') countR++;
      else if (st === 'in_progress') countP++;
      else if (st === 'rescheduled') countT++;
      else if (st === 'done') countS++;
      else countNone++;

      // Week stats
      for (let d = currentWeekDef.start; d <= Math.min(currentWeekDef.end, daysInMonth); d++) {
        const wst = p.days[d];
        if (wst === 'planned' || wst === 'in_progress' || wst === 'rescheduled' || wst === 'done') {
          weekPlanTotal++;
        }
      }
    });

    return {
      total: allWeeklies.length,
      countR,
      countP,
      countT,
      countS,
      countNone,
      weekPlanTotal,
    };
  }, [masterPrograms, selectedMonth, selectedYear, safeSelectedDay, currentWeekNumber, weeks, daysInMonth]);

  // Day navigation
  const handlePrevDay = () => {
    if (safeSelectedDay > 1) {
      setSelectedDay(safeSelectedDay - 1);
    } else {
      if (selectedMonth > 1) {
        setSelectedMonth(selectedMonth - 1);
        const prevMonthDays = new Date(selectedYear, selectedMonth - 1, 0).getDate();
        setSelectedDay(prevMonthDays);
      } else {
        setSelectedYear(selectedYear - 1);
        setSelectedMonth(12);
        setSelectedDay(31);
      }
    }
  };

  const handleNextDay = () => {
    if (safeSelectedDay < daysInMonth) {
      setSelectedDay(safeSelectedDay + 1);
    } else {
      if (selectedMonth < 12) {
        setSelectedMonth(selectedMonth + 1);
        setSelectedDay(1);
      } else {
        setSelectedYear(selectedYear + 1);
        setSelectedMonth(1);
        setSelectedDay(1);
      }
    }
  };

  // Open Modal for Add
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormWorkDescription('');
    setFormWorkMethod('');
    setFormLocation(areas[0]?.name || 'Koridor & Tangga Darurat');
    setFormPicName(cleaners[0]?.name || 'Asep Supriyadi');

    // Default: set every Friday or weekend in month to planned
    const days: Record<number, ProgramDayStatus> = {};
    for (let i = 1; i <= 31; i++) {
      days[i] = (i === safeSelectedDay || i % 7 === 5) && i <= daysInMonth ? 'planned' : 'none';
    }
    setFormDays(days);
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (item: MasterCleaningProgramItem) => {
    setEditingItem(item);
    setFormWorkDescription(item.workDescription);
    setFormWorkMethod(item.workMethod);
    setFormLocation(item.location);
    setFormPicName(item.picName);
    setFormDays({ ...item.days });
    setIsModalOpen(true);
  };

  // Save Modal
  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formWorkDescription.trim()) return;

    if (editingItem) {
      updateMasterProgram(editingItem.id, {
        workDescription: formWorkDescription.trim(),
        workMethod: formWorkMethod.trim(),
        location: formLocation,
        frequency: 'W',
        picName: formPicName,
        days: formDays,
      });
      showToast('Weekly Activity berhasil diperbarui!');
    } else {
      addMasterProgram({
        projectId: activeProject.id,
        workDescription: formWorkDescription.trim(),
        workMethod: formWorkMethod.trim(),
        location: formLocation,
        category: 'weekly',
        frequency: 'W',
        picName: formPicName,
        month: selectedMonth,
        year: selectedYear,
        days: formDays,
        targetDurationMinutes: 120,
      });
      showToast('Weekly Activity baru berhasil ditambahkan ke Master Cleaning Program!');
    }
    setIsModalOpen(false);
  };

  // Quick Action: Mark all active tasks for this day as Done (S)
  const handleMarkAllDone = () => {
    weeklyPrograms.forEach((p) => {
      toggleMasterProgramDay(p.id, safeSelectedDay, 'done');
    });
    showToast(`Semua pekerjaan Weekly Activity tanggal ${safeSelectedDay} berhasil ditandai Selesai (S)!`);
  };

  // Quick Action: Set all tasks for this day to Planned (R)
  const handleSetAllPlanned = () => {
    weeklyPrograms.forEach((p) => {
      toggleMasterProgramDay(p.id, safeSelectedDay, 'planned');
    });
    showToast(`Semua pekerjaan Weekly Activity tanggal ${safeSelectedDay} diset ke Rencana (R)!`);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'No',
      'Lokasi Proyek',
      'Tanggal',
      'Minggu Ke',
      'Frekuensi',
      'Uraian Pekerjaan Mingguan',
      'Metode SOP',
      'Lokasi',
      'PIC',
      'Status Tanggal Terpilih',
    ];

    const rows = weeklyPrograms.map((prog, idx) => {
      const st = prog.days[safeSelectedDay] || 'none';
      const stLabel = PROGRAM_STATUS_META[st].label;
      return [
        (idx + 1).toString(),
        `"${activeProject.name}"`,
        `"${safeSelectedDay} ${monthNameIndo} ${selectedYear}"`,
        `"Minggu ${currentWeekNumber}"`,
        '"W - Weekly Activity"',
        `"${prog.workDescription.replace(/"/g, '""')}"`,
        `"${prog.workMethod.replace(/"/g, '""')}"`,
        `"${prog.location}"`,
        `"${prog.picName}"`,
        `"${stLabel}"`,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Weekly_Activity_${activeProject.name}_${selectedYear}-${selectedMonth}_W${currentWeekNumber}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Data Weekly Activity berhasil diekspor ke CSV.');
  };

  // Export PDF (Standard Company Form)
  const handleExportPDF = () => {
    try {
      const currentWeekDef = weeks.find((w) => w.id === selectedWeekFilter) || weeks[0];
      const start = currentWeekDef ? currentWeekDef.start : 1;
      const end = currentWeekDef ? Math.min(currentWeekDef.end, daysInMonth) : daysInMonth;
      const weekNum = currentWeekDef ? parseInt(currentWeekDef.id.replace('w', '')) || 1 : 1;

      exportWeeklyActivityToPDF({
        programs: weeklyPrograms,
        project: activeProject,
        selectedWeek: weekNum,
        startDay: start,
        endDay: end,
        month: selectedMonth,
        year: selectedYear,
      });
      showToast('Formulir Laporan Weekly Activity standar perusahaan berhasil disimpan ke PDF!');
    } catch (err) {
      console.error(err);
      showToast('Gagal mengekspor PDF Weekly Activity.');
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-purple-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center shadow-xs">
              <CalendarRange className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Weekly Activity
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-extrabold border border-purple-200">
                  Kode: W · Mingguan
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
                  Terhubung MCP
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Jadwal & pengawasan pekerjaan berkala mingguan (deep cleaning, dusting tinggi, scrubbing tangga, washroom detail).
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-slate-600 bg-purple-50/70 border border-purple-200/60 px-3 py-1.5 rounded-xl w-fit">
            <Building2 className="w-3.5 h-3.5 text-purple-700 shrink-0" />
            <span>
              Lokasi Aktif:&nbsp;
              <strong className="text-purple-950 font-bold">{activeProject.name}</strong>
              &nbsp;({activeProject.clientName} • {activeProject.city})
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold shadow-xs transition-colors"
            title="Simpan Formulir Laporan Weekly Activity standar form perusahaan ke PDF"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" />
            <span>Simpan ke PDF</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Ekspor CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mcp')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-semibold transition-colors"
            title="Buka tampilan Master Cleaning Program lengkap 1-31 hari"
          >
            <Layers className="w-3.5 h-3.5 text-purple-600" />
            <span>Buka di MCP</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Weekly Activity</span>
          </button>
        </div>
      </div>

      {/* Week Navigator Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Day & Month Selectors */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={handlePrevDay}
                className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-colors"
                title="Hari Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-xs font-bold text-slate-800 select-none">
                {formattedFullDate}
              </span>
              <button
                type="button"
                onClick={handleNextDay}
                className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-colors"
                title="Hari Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-2.5 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-xl text-slate-800 cursor-pointer focus:outline-hidden focus:border-purple-500"
              >
                {MONTH_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-2.5 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-xl text-slate-800 cursor-pointer focus:outline-hidden focus:border-purple-500"
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  setSelectedYear(2026);
                  setSelectedMonth(9);
                  setSelectedDay(15);
                }}
                className="px-2.5 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
              >
                Hari Ini
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSetAllPlanned}
              className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-semibold border border-purple-200 transition-colors"
              title="Set semua tugas mingguan tanggal ini ke status Rencana (R)"
            >
              Set Semua R
            </button>

            <button
              type="button"
              onClick={handleMarkAllDone}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-200 transition-colors"
              title="Set semua tugas mingguan tanggal ini ke status Selesai (S)"
            >
              Tandai Semua Selesai (S)
            </button>
          </div>
        </div>

        {/* Quick Week Filters (Minggu 1 - 5) */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Filter Periode Minggu:
          </span>
          <button
            type="button"
            onClick={() => setSelectedWeekFilter('all')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
              selectedWeekFilter === 'all'
                ? 'bg-purple-700 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Semua Minggu (1 - 5)
          </button>
          {weeks.map((w) => {
            const isWeekActive = selectedWeekFilter === w.id;
            const isSelectedDayInWeek = safeSelectedDay >= w.start && safeSelectedDay <= w.end;
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => {
                  setSelectedWeekFilter(w.id);
                  if (!isSelectedDayInWeek) {
                    setSelectedDay(w.start);
                  }
                }}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  isWeekActive
                    ? 'bg-purple-700 text-white font-bold shadow-2xs'
                    : isSelectedDayInWeek
                    ? 'bg-purple-100 text-purple-900 border border-purple-300 font-bold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{w.label}</span>
                <span className="text-[10px] opacity-80">({w.range})</span>
              </button>
            );
          })}
        </div>

        {/* Day Number Strip for active range */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Pilih Hari Spesifik:
            </span>
            <span className="text-[11px] text-purple-700 font-bold">
              Saat ini: Tanggal {safeSelectedDay} (Minggu ke-{currentWeekNumber})
            </span>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1.5 scrollbar-thin">
            {activeDayRange.map((d) => {
              const isSelected = d === safeSelectedDay;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDay(d)}
                  className={`shrink-0 w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-purple-700 text-white shadow-sm ring-2 ring-purple-300 ring-offset-1 scale-105'
                      : 'bg-slate-50 hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-200/80'
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[10px] font-semibold text-slate-500">Total Program (W)</p>
          <p className="text-xl font-extrabold text-slate-900 mt-0.5">{stats.total}</p>
          <p className="text-[10px] text-slate-400">Item Mingguan</p>
        </div>

        <div className="bg-sky-50/70 p-3 rounded-2xl border border-sky-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-sky-800">R : Rencana</p>
            <span className="w-5 h-5 rounded-md bg-sky-200 text-sky-800 font-extrabold text-[10px] flex items-center justify-center">
              R
            </span>
          </div>
          <p className="text-xl font-extrabold text-sky-900 mt-0.5">{stats.countR}</p>
          <p className="text-[10px] text-sky-700">Tgl {safeSelectedDay}</p>
        </div>

        <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-amber-800">P : Progres</p>
            <span className="w-5 h-5 rounded-md bg-amber-200 text-amber-800 font-extrabold text-[10px] flex items-center justify-center">
              P
            </span>
          </div>
          <p className="text-xl font-extrabold text-amber-900 mt-0.5">{stats.countP}</p>
          <p className="text-[10px] text-amber-700">Tgl {safeSelectedDay}</p>
        </div>

        <div className="bg-rose-50/70 p-3 rounded-2xl border border-rose-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-rose-800">T : Tunda</p>
            <span className="w-5 h-5 rounded-md bg-rose-200 text-rose-800 font-extrabold text-[10px] flex items-center justify-center">
              T
            </span>
          </div>
          <p className="text-xl font-extrabold text-rose-900 mt-0.5">{stats.countT}</p>
          <p className="text-[10px] text-rose-700">Tgl {safeSelectedDay}</p>
        </div>

        <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-emerald-800">S : Selesai</p>
            <span className="w-5 h-5 rounded-md bg-emerald-200 text-emerald-800 font-extrabold text-[10px] flex items-center justify-center">
              S
            </span>
          </div>
          <p className="text-xl font-extrabold text-emerald-900 mt-0.5">{stats.countS}</p>
          <p className="text-[10px] text-emerald-700">Tgl {safeSelectedDay}</p>
        </div>

        <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-700">- : Off</p>
            <span className="w-5 h-5 rounded-md bg-slate-200 text-slate-600 font-extrabold text-[10px] flex items-center justify-center">
              -
            </span>
          </div>
          <p className="text-xl font-extrabold text-slate-800 mt-0.5">{stats.countNone}</p>
          <p className="text-[10px] text-slate-500">Tgl {safeSelectedDay}</p>
        </div>

        <div className="bg-purple-50/70 p-3 rounded-2xl border border-purple-200/80 shadow-xs">
          <p className="text-[10px] font-bold text-purple-800">Minggu {currentWeekNumber}</p>
          <p className="text-xl font-extrabold text-purple-900 mt-0.5">{stats.weekPlanTotal}</p>
          <p className="text-[10px] text-purple-700">Total Tugas W{currentWeekNumber}</p>
        </div>
      </div>

      {/* Petunjuk Status Tanggal */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm border border-slate-800">
        <div className="flex items-center gap-2 mb-2.5">
          <HelpCircle className="w-4 h-4 text-purple-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Status Pekerjaan Weekly Activity (Klik sel tanggal untuk beralih siklus status)
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs">
          <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/60 p-2.5 rounded-xl">
            <span className="w-6 h-6 rounded-md bg-sky-100 text-sky-800 border border-sky-300 font-extrabold text-xs flex items-center justify-center shadow-2xs">
              R
            </span>
            <div>
              <p className="font-bold text-slate-100">R : Rencana</p>
              <p className="text-[10px] text-slate-400">Pekerjaan Terjadwal</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/60 p-2.5 rounded-xl">
            <span className="w-6 h-6 rounded-md bg-amber-100 text-amber-800 border border-amber-300 font-extrabold text-xs flex items-center justify-center shadow-2xs">
              P
            </span>
            <div>
              <p className="font-bold text-slate-100">P : Progres</p>
              <p className="text-[10px] text-slate-400">Sedang Dikerjakan</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/60 p-2.5 rounded-xl">
            <span className="w-6 h-6 rounded-md bg-rose-100 text-rose-800 border border-rose-300 font-extrabold text-xs flex items-center justify-center shadow-2xs">
              T
            </span>
            <div>
              <p className="font-bold text-slate-100">T : Tunda</p>
              <p className="text-[10px] text-slate-400">Tertunda / Pending</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/60 p-2.5 rounded-xl">
            <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-xs flex items-center justify-center shadow-2xs">
              S
            </span>
            <div>
              <p className="font-bold text-slate-100">S : Selesai</p>
              <p className="text-[10px] text-slate-400">Telah Selesai</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/60 p-2.5 rounded-xl">
            <span className="w-6 h-6 rounded-md bg-slate-700 text-slate-300 border border-slate-600 font-extrabold text-xs flex items-center justify-center">
              -
            </span>
            <div>
              <p className="font-bold text-slate-100">- : Off</p>
              <p className="text-[10px] text-slate-400">Tidak Terjadwal</p>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 mt-2.5 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>
            Urutan siklus klik tanggal: <strong>- (Off)</strong> ➔ <strong>R (Rencana)</strong> ➔ <strong>P (Progres)</strong> ➔ <strong>T (Tunda)</strong> ➔ <strong>S (Selesai)</strong> ➔ <strong>-</strong>
          </span>
        </p>
      </div>

      {/* Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] text-slate-500 font-medium">Status Tgl {safeSelectedDay}:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 text-xs focus:outline-hidden cursor-pointer"
            >
              <option value="all">Semua Status</option>
              <option value="planned">R : Rencana</option>
              <option value="in_progress">P : Progres</option>
              <option value="rescheduled">T : Tunda</option>
              <option value="done">S : Selesai</option>
              <option value="none">- : Tidak Terjadwal</option>
            </select>
          </div>

          {/* Location Filter */}
          {availableLocations.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
              <span className="text-[11px] text-slate-500 font-medium">Area:</span>
              <select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 text-xs focus:outline-hidden cursor-pointer"
              >
                <option value="all">Semua Lokasi</option>
                {availableLocations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari uraian mingguan, SOP, PIC..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-purple-500"
          />
        </div>
      </div>

      {/* Main Weekly Activity Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white font-semibold text-[11px]">
                <th className="py-3 px-2.5 text-center w-10 border-r border-slate-700 sticky left-0 z-20 bg-slate-800">
                  No
                </th>
                <th className="py-3 px-2 text-center w-12 min-w-[48px] border-r border-slate-700 font-bold">
                  Freq
                </th>
                <th className="py-3 px-3 min-w-[240px] border-r border-slate-700 sticky left-10 z-20 bg-slate-800 shadow-sm">
                  Uraian Pekerjaan Mingguan
                </th>
                <th className="py-3 px-3 min-w-[140px] border-r border-slate-700">
                  Lokasi / Area
                </th>
                <th className="py-3 px-3 min-w-[130px] border-r border-slate-700">
                  PIC Petugas
                </th>
                {/* Calendar strip for active week range */}
                <th className="py-3 px-3 min-w-[280px] border-r border-slate-700">
                  Kalender Siklus ({activeDayRange.length} Hari)
                </th>
                <th className="py-3 px-3 text-center w-24">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {weeklyPrograms.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="max-w-sm mx-auto space-y-2">
                      <Layers className="w-9 h-9 text-slate-300 mx-auto" />
                      <p className="font-semibold text-slate-700 text-sm">
                        Belum ada item Weekly Activity untuk kriteria ini
                      </p>
                      <p className="text-xs text-slate-400">
                        Pastikan terdapat program dengan frekuensi "W" pada Master Cleaning Program atau klik tombol "+ Tambah Weekly Activity" di atas.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                weeklyPrograms.map((program, index) => {
                  const currentDayStatus = program.days[safeSelectedDay] || 'none';
                  const currentMeta = PROGRAM_STATUS_META[currentDayStatus];

                  return (
                    <tr
                      key={program.id}
                      className="hover:bg-purple-50/30 transition-colors group"
                    >
                      {/* No */}
                      <td className="py-3 px-2.5 text-center font-bold text-slate-500 border-r border-slate-200 sticky left-0 z-10 bg-white group-hover:bg-purple-50/30">
                        {index + 1}
                      </td>

                      {/* Frequency Badge W */}
                      <td className="py-3 px-2 text-center border-r border-slate-200">
                        <span
                          className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-purple-100 text-purple-800 border border-purple-300 font-extrabold text-[11px] shadow-2xs"
                          title="W - Weekly Activity (Mingguan)"
                        >
                          W
                        </span>
                      </td>

                      {/* Uraian Pekerjaan */}
                      <td className="py-3 px-3 border-r border-slate-200 sticky left-10 z-10 bg-white group-hover:bg-purple-50/30 shadow-xs">
                        <p className="font-bold text-slate-900 leading-snug">
                          {program.workDescription}
                        </p>
                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                          Weekly Activity · Mingguan
                        </span>
                      </td>

                      {/* Lokasi */}
                      <td className="py-3 px-3 border-r border-slate-200 font-semibold text-slate-800 text-[11px]">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{program.location}</span>
                        </div>
                      </td>

                      {/* PIC */}
                      <td className="py-3 px-3 border-r border-slate-200 font-semibold text-slate-800 text-[11px]">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{program.picName}</span>
                        </div>
                      </td>

                      {/* Calendar strip */}
                      <td className="py-2 px-2.5 border-r border-slate-200">
                        <div className="flex items-center gap-0.5 overflow-x-auto max-w-[340px] py-1 scrollbar-thin">
                          {activeDayRange.map((d) => {
                            const st = program.days[d] || 'none';
                            const m = PROGRAM_STATUS_META[st];
                            const isCurrentDay = d === safeSelectedDay;

                            return (
                              <button
                                key={d}
                                type="button"
                                onClick={() => {
                                  toggleMasterProgramDay(program.id, d);
                                  const next = getNextProgramDayStatus(st);
                                  showToast(`Tgl ${d}: ${PROGRAM_STATUS_META[next].label}`);
                                }}
                                className={`shrink-0 w-6 h-6 rounded-md font-bold text-[10px] flex items-center justify-center transition-all ${
                                  isCurrentDay
                                    ? 'ring-2 ring-purple-600 ring-offset-1 z-10'
                                    : 'hover:scale-110'
                                } ${m.badgeClass}`}
                                title={`Tgl ${d}: ${m.label} (Klik untuk ubah status)`}
                              >
                                {m.code}
                              </button>
                            );
                          })}
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(program)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-purple-600 transition-colors"
                            title="Edit Weekly Activity"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Hapus program "${program.workDescription}"?`)) {
                                deleteMasterProgram(program.id);
                                showToast('Weekly Activity berhasil dihapus.');
                              }
                            }}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Hapus Weekly Activity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Weekly Activity Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-700 text-white flex items-center justify-center">
                  <CalendarRange className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingItem ? 'Edit Weekly Activity' : 'Tambah Weekly Activity Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Frekuensi otomatis terkunci sebagai "W" (Weekly Activity) & terhubung ke Master Cleaning Program
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-5 space-y-4">
              {/* Uraian Pekerjaan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Uraian Pekerjaan Mingguan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formWorkDescription}
                  onChange={(e) => setFormWorkDescription(e.target.value)}
                  placeholder="Contoh: Scrubbing Keramik Tangga Darurat & Polishing Handrail Stainless"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-purple-500"
                />
              </div>

              {/* Metode SOP */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Metode Pekerjaan (SOP Standar)
                </label>
                <textarea
                  rows={2}
                  value={formWorkMethod}
                  onChange={(e) => setFormWorkMethod(e.target.value)}
                  placeholder="Contoh: Aplikasi chemical heavy duty alkali, manual scrubbing dengan sikat deck, rinse bersih, lap stainless polish"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-purple-500"
                />
              </div>

              {/* Lokasi, PIC, Frekuensi (Locked to W) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Lokasi / Area <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="Contoh: Tangga Darurat Zona A & B"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Petugas Penanggung Jawab (PIC)
                  </label>
                  <select
                    value={formPicName}
                    onChange={(e) => setFormPicName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-purple-500 cursor-pointer"
                  >
                    {cleaners.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name} ({c.shift})
                      </option>
                    ))}
                    <option value="Tim Khusus Periodic">Tim Khusus Periodic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kategori Frekuensi
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-xl text-purple-900 text-xs font-bold">
                    <span className="w-5 h-5 rounded-md bg-purple-700 text-white flex items-center justify-center text-[10px]">
                      W
                    </span>
                    <span>Weekly Activity (Mingguan)</span>
                  </div>
                </div>
              </div>

              {/* Day Status Setup 1 - 31 */}
              <div className="border-t border-slate-200 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="text-xs font-bold text-slate-800">
                      Pengaturan Jadwal Mingguan (Pilih Hari Pelaksanaan)
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Klik tanggal untuk siklus: R (Rencana) &rarr; P (Progress) &rarr; S (Done) &rarr; T (Tertunda) &rarr; -
                    </p>
                  </div>

                  <div className="flex items-center gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        const updated: Record<number, ProgramDayStatus> = {};
                        for (let d = 1; d <= 31; d++) updated[d] = (d % 7 === 5 || d % 7 === 6) && d <= daysInMonth ? 'planned' : 'none';
                        setFormDays(updated);
                      }}
                      className="px-2 py-1 bg-purple-50 hover:bg-purple-100 rounded-lg text-purple-800 font-semibold"
                    >
                      Set Tiap Akhir Pekan
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const updated: Record<number, ProgramDayStatus> = {};
                        for (let d = 1; d <= 31; d++) updated[d] = 'none';
                        setFormDays(updated);
                      }}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-semibold"
                    >
                      Kosongkan
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200 max-h-40 overflow-y-auto">
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const st = formDays[day] || 'none';
                    const meta = PROGRAM_STATUS_META[st];
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          const next = getNextProgramDayStatus(st);
                          setFormDays((prev) => ({ ...prev, [day]: next }));
                        }}
                        className={`p-1.5 rounded-lg border text-center transition-all ${
                          day === safeSelectedDay ? 'ring-2 ring-purple-600' : ''
                        } ${meta.pillClass}`}
                      >
                        <span className="block text-[10px] text-slate-500 font-medium">Tgl {day}</span>
                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-md font-extrabold text-[10px] mt-0.5 ${meta.badgeClass}`}>
                          {meta.code}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  {editingItem ? 'Simpan Perubahan' : 'Tambahkan ke MCP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
