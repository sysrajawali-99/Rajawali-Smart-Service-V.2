import React, { useState, useMemo } from 'react';
import {
  CalendarClock,
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
  AlertCircle,
  Award,
  FileText,
  Smartphone,
  Table,
  ChevronDown,
  ChevronUp,
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
import { exportMonthlyActivityToPDF } from '../../utils/pdfExport';

export const MonthlyActivityView: React.FC = () => {
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

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterLocation, setFilterLocation] = useState<string>('all');

  // Mobile vs Table View Mode
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'cards' : 'table'
  );
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Modal State for adding/editing Monthly Activity
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

  const selectedDateObj = new Date(selectedYear, selectedMonth - 1, safeSelectedDay);
  const dayNameIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][
    selectedDateObj.getDay()
  ];
  const monthNameIndo = MONTH_OPTIONS.find((m) => m.value === selectedMonth)?.label || 'Bulan';
  const formattedFullDate = `${dayNameIndo}, ${safeSelectedDay} ${monthNameIndo} ${selectedYear}`;

  // Filter Master Programs for Monthly Activity: Frequency === 'M'
  const monthlyPrograms = useMemo(() => {
    return masterPrograms.filter((item) => {
      // Must be Monthly Activity ('M')
      if (normalizeFrequencyCode(item.frequency) !== 'M') return false;
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
    filterLocation,
    searchTerm,
  ]);

  // Unique locations from monthly programs
  const availableLocations = useMemo(() => {
    const locSet = new Set<string>();
    masterPrograms
      .filter((p) => normalizeFrequencyCode(p.frequency) === 'M')
      .forEach((p) => {
        if (p.location) locSet.add(p.location);
      });
    return Array.from(locSet);
  }, [masterPrograms]);

  // Statistics for selected day and monthly totals
  const stats = useMemo(() => {
    const allMonthlies = masterPrograms.filter(
      (p) =>
        normalizeFrequencyCode(p.frequency) === 'M' &&
        p.month === selectedMonth &&
        p.year === selectedYear
    );

    let countR = 0;
    let countP = 0;
    let countT = 0;
    let countS = 0;
    let countNone = 0;
    let monthPlanTotal = 0;

    allMonthlies.forEach((p) => {
      const st = p.days[safeSelectedDay] || 'none';
      if (st === 'planned') countR++;
      else if (st === 'in_progress') countP++;
      else if (st === 'rescheduled') countT++;
      else if (st === 'done') countS++;
      else countNone++;

      // Whole month planned count
      for (let d = 1; d <= daysInMonth; d++) {
        const mst = p.days[d];
        if (mst === 'planned' || mst === 'in_progress' || mst === 'rescheduled' || mst === 'done') {
          monthPlanTotal++;
        }
      }
    });

    return {
      total: allMonthlies.length,
      countR,
      countP,
      countT,
      countS,
      countNone,
      monthPlanTotal,
    };
  }, [masterPrograms, selectedMonth, selectedYear, safeSelectedDay, daysInMonth]);

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
    setFormLocation(areas[0]?.name || 'Facade Kaca & Kanopi Luar');
    setFormPicName(cleaners[0]?.name || 'Asep Supriyadi');

    // Default: set selected day as planned
    const days: Record<number, ProgramDayStatus> = {};
    for (let i = 1; i <= 31; i++) {
      days[i] = i === safeSelectedDay ? 'planned' : 'none';
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
        frequency: 'M',
        picName: formPicName,
        days: formDays,
      });
      showToast('Monthly Activity berhasil diperbarui!');
    } else {
      addMasterProgram({
        projectId: activeProject.id,
        workDescription: formWorkDescription.trim(),
        workMethod: formWorkMethod.trim(),
        location: formLocation,
        category: 'monthly',
        frequency: 'M',
        picName: formPicName,
        month: selectedMonth,
        year: selectedYear,
        days: formDays,
        targetDurationMinutes: 240,
      });
      showToast('Monthly Activity baru berhasil ditambahkan ke Master Cleaning Program!');
    }
    setIsModalOpen(false);
  };

  // Quick Action: Mark all active tasks for this day as Done (S)
  const handleMarkAllDone = () => {
    monthlyPrograms.forEach((p) => {
      toggleMasterProgramDay(p.id, safeSelectedDay, 'done');
    });
    showToast(`Semua pekerjaan Monthly Activity tanggal ${safeSelectedDay} berhasil ditandai Selesai (S)!`);
  };

  // Quick Action: Set all tasks for this day to Planned (R)
  const handleSetAllPlanned = () => {
    monthlyPrograms.forEach((p) => {
      toggleMasterProgramDay(p.id, safeSelectedDay, 'planned');
    });
    showToast(`Semua pekerjaan Monthly Activity tanggal ${safeSelectedDay} diset ke Rencana (R)!`);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'No',
      'Lokasi Proyek',
      'Bulan/Tahun',
      'Tanggal Terpilih',
      'Frekuensi',
      'Uraian Pekerjaan Bulanan (Deep Clean)',
      'Metode SOP',
      'Lokasi',
      'PIC',
      'Status Tanggal Terpilih',
    ];

    const rows = monthlyPrograms.map((prog, idx) => {
      const st = prog.days[safeSelectedDay] || 'none';
      const stLabel = PROGRAM_STATUS_META[st].label;
      return [
        (idx + 1).toString(),
        `"${activeProject.name}"`,
        `"${monthNameIndo} ${selectedYear}"`,
        `"${safeSelectedDay}"`,
        '"M - Monthly Activity"',
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
      `Monthly_Activity_${activeProject.name}_${selectedYear}-${selectedMonth}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Data Monthly Activity berhasil diekspor ke CSV.');
  };

  // Export PDF (Standard Company Form)
  const handleExportPDF = () => {
    try {
      exportMonthlyActivityToPDF({
        programs: monthlyPrograms,
        project: activeProject,
        month: selectedMonth,
        year: selectedYear,
      });
      showToast('Formulir Laporan Monthly Activity standar perusahaan berhasil disimpan ke PDF!');
    } catch (err) {
      console.error(err);
      showToast('Gagal mengekspor PDF Monthly Activity.');
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Monthly Activity
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-extrabold border border-amber-300">
                  Kode: M · Bulanan
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
                  Terhubung MCP
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitoring program deep cleaning, treatment berkala marmer/granit, cuci karpet, kaca luar gedung, dan general cleaning bulanan.
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-slate-600 bg-amber-50/70 border border-amber-200/60 px-3 py-1.5 rounded-xl w-fit">
            <Building2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>
              Lokasi Aktif:&nbsp;
              <strong className="text-amber-950 font-bold">{activeProject.name}</strong>
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
            title="Simpan Formulir Laporan Monthly Activity standar form perusahaan ke PDF"
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
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold transition-colors"
            title="Buka tampilan Master Cleaning Program lengkap 1-31 hari"
          >
            <Layers className="w-3.5 h-3.5 text-amber-700" />
            <span>Buka di MCP</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Monthly Activity</span>
          </button>
        </div>
      </div>

      {/* Date Navigator Bar with Day Chips */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
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

            {/* Quick Month & Year Selectors */}
            <div className="flex items-center gap-1.5">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-2.5 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-xl text-slate-800 cursor-pointer focus:outline-hidden focus:border-amber-500"
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
                className="px-2.5 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-xl text-slate-800 cursor-pointer focus:outline-hidden focus:border-amber-500"
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
              className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold border border-amber-200 transition-colors"
              title="Set semua tugas bulanan tanggal ini ke status Rencana (R)"
            >
              Set Semua R
            </button>

            <button
              type="button"
              onClick={handleMarkAllDone}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-200 transition-colors"
              title="Set semua tugas bulanan tanggal ini ke status Selesai (S)"
            >
              Tandai Semua Selesai (S)
            </button>
          </div>
        </div>

        {/* Day Number Strip (1 - daysInMonth) */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Pilih Tanggal Pelaksanaan Bulanan ({monthNameIndo} {selectedYear}):
            </span>
            <span className="text-[11px] text-amber-800 font-bold">
              Total {daysInMonth} Hari
            </span>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1.5 scrollbar-thin">
            {Array.from({ length: daysInMonth }, (_, i) => {
              const d = i + 1;
              const isSelected = d === safeSelectedDay;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDay(d)}
                  className={`shrink-0 w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-300 ring-offset-1 scale-105'
                      : 'bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200/80'
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
          <p className="text-[10px] font-semibold text-slate-500">Total Program (M)</p>
          <p className="text-xl font-extrabold text-slate-900 mt-0.5">{stats.total}</p>
          <p className="text-[10px] text-slate-400">Deep Cleaning Bulanan</p>
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

        <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200/80 shadow-xs">
          <p className="text-[10px] font-bold text-amber-900">Total {monthNameIndo}</p>
          <p className="text-xl font-extrabold text-amber-900 mt-0.5">{stats.monthPlanTotal}</p>
          <p className="text-[10px] text-amber-700">Tugas Terjadwal Sebulan</p>
        </div>
      </div>

      {/* Petunjuk Status Tanggal */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm border border-slate-800">
        <div className="flex items-center gap-2 mb-2.5">
          <HelpCircle className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Status Pekerjaan Monthly Activity (Klik sel tanggal untuk beralih siklus status)
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
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
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
          {/* Toggle View: Mobile Cards vs Table */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs shadow-inner">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                viewMode === 'cards'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Kartu Tugas</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                viewMode === 'table'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Tabel Siklus</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari uraian bulanan, SOP, PIC..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-500"
          />
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1. VIEW MODE: KARTU TUGAS (OPTIMAL UNTUK LAYAR PONSEL)        */}
      {/* ============================================================ */}
      {viewMode === 'cards' && (
        <div className="space-y-3">
          {monthlyPrograms.length === 0 ? (
            <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl text-slate-400">
              Belum ada item Monthly Activity untuk kriteria ini.
            </div>
          ) : (
            monthlyPrograms.map((program, index) => {
              const currentDayStatus = program.days[safeSelectedDay] || 'none';
              const currentMeta = PROGRAM_STATUS_META[currentDayStatus];
              const isExpanded = expandedCardId === program.id;

              return (
                <div
                  key={program.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3 transition-all"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 text-amber-800 border border-amber-300 font-black text-xs">
                        M
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold">
                          <span>#{index + 1}</span>
                          <span>·</span>
                          <span className="text-amber-700 font-bold">Monthly Activity</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mt-0.5 leading-snug">
                          {program.workDescription}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(program)}
                        className="p-1.5 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Edit Monthly Activity"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          deleteMasterProgram(program.id);
                          showToast('Monthly Activity berhasil dihapus.');
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Monthly Activity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Location, PIC & Method */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="text-slate-700 font-medium truncate">
                        {program.location || 'Semua Area'}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-1.5 truncate">
                      <User className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="text-slate-700 font-medium truncate">
                        {program.picName || 'Semua Cleaner'}
                      </span>
                    </div>
                  </div>

                  {program.workMethod && (
                    <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80 text-xs flex items-start gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="text-slate-600 line-clamp-2">
                        <strong className="text-slate-800">SOP:</strong> {program.workMethod}
                      </span>
                    </div>
                  )}

                  {/* Status on Selected Day (Touch-Friendly Action Strip) */}
                  <div className="p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-900 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-amber-600" />
                        <span>Status Tanggal {safeSelectedDay} {monthNameIndo}:</span>
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-black border ${currentMeta.badgeClass}`}
                      >
                        {currentMeta.code} : {currentMeta.label}
                      </span>
                    </div>

                    {/* Quick Touch Buttons for all 5 Statuses */}
                    <div className="grid grid-cols-5 gap-1.5">
                      {(['planned', 'in_progress', 'rescheduled', 'done', 'none'] as ProgramDayStatus[]).map(
                        (st) => {
                          const meta = PROGRAM_STATUS_META[st];
                          const isCurrent = currentDayStatus === st;
                          return (
                            <button
                              key={st}
                              type="button"
                              onClick={() => {
                                const currentDays = { ...program.days };
                                currentDays[safeSelectedDay] = st;
                                updateMasterProgram({
                                  ...program,
                                  days: currentDays,
                                });
                              }}
                              className={`h-9 rounded-lg text-xs font-black transition-all flex flex-col items-center justify-center ${
                                isCurrent
                                  ? `${meta.badgeClass} ring-2 ring-amber-400 shadow-xs scale-102`
                                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <span className="text-[11px] font-black leading-none">
                                {meta.code}
                              </span>
                              <span className="text-[8px] font-semibold text-slate-500 leading-tight">
                                {meta.label.slice(0, 5)}
                              </span>
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>

                  {/* Expandable Month Days Matrix for this Task */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setExpandedCardId(isExpanded ? null : program.id)}
                      className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-600" />
                        <span>Siklus 31 Hari Bulan Ini</span>
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-500">
                          {isExpanded ? 'Tutup' : 'Lihat Siklus'}
                        </span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="mt-2 p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                        <p className="text-[11px] text-slate-500 text-center">
                          Ketuk tanggal untuk mengganti status siklus:
                        </p>
                        <div className="grid grid-cols-7 gap-1 text-center">
                          {Array.from({ length: daysInMonth }, (_, i) => {
                            const d = i + 1;
                            const st = program.days[d] || 'none';
                            const meta = PROGRAM_STATUS_META[st];
                            return (
                              <button
                                key={d}
                                type="button"
                                onClick={() => toggleMasterProgramDay(program.id, d)}
                                className={`p-1.5 rounded-lg border text-center transition-all ${meta.badgeClass}`}
                              >
                                <span className="text-[9px] text-slate-500 block leading-none">
                                  {d}
                                </span>
                                <span className="text-xs font-black block mt-0.5">
                                  {meta.code}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. VIEW MODE: TABEL SIKLUS BULANAN                           */}
      {/* ============================================================ */}
      {viewMode === 'table' && (
        <div className="space-y-3">
          {/* Mobile swipe helper */}
          <div className="md:hidden flex items-center justify-between gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 shadow-2xs">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-[11px] leading-tight">
                Tabel lebar siklus bulanan: Geser ke samping, atau gunakan <strong>Kartu Tugas</strong> untuk tampilan ramah layar ponsel.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className="shrink-0 px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] shadow-xs"
            >
              Mode Kartu
            </button>
          </div>

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
                  Uraian Pekerjaan Bulanan (Deep Clean)
                </th>
                <th className="py-3 px-3 min-w-[140px] border-r border-slate-700">
                  Lokasi / Area
                </th>
                <th className="py-3 px-3 min-w-[130px] border-r border-slate-700">
                  PIC Petugas
                </th>
                {/* Calendar strip 1 - 31 */}
                <th className="py-3 px-3 min-w-[280px] border-r border-slate-700">
                  Kalender Siklus 1 - {daysInMonth} {monthNameIndo}
                </th>
                <th className="py-3 px-3 text-center w-24">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {monthlyPrograms.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="max-w-sm mx-auto space-y-2">
                      <Layers className="w-9 h-9 text-slate-300 mx-auto" />
                      <p className="font-semibold text-slate-700 text-sm">
                        Belum ada item Monthly Activity untuk kriteria ini
                      </p>
                      <p className="text-xs text-slate-400">
                        Pastikan terdapat program dengan frekuensi "M" pada Master Cleaning Program atau klik tombol "+ Tambah Monthly Activity" di atas.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                monthlyPrograms.map((program, index) => {
                  const currentDayStatus = program.days[safeSelectedDay] || 'none';
                  const currentMeta = PROGRAM_STATUS_META[currentDayStatus];

                  return (
                    <tr
                      key={program.id}
                      className="hover:bg-amber-50/30 transition-colors group"
                    >
                      {/* No */}
                      <td className="py-3 px-2.5 text-center font-bold text-slate-500 border-r border-slate-200 sticky left-0 z-10 bg-white group-hover:bg-amber-50/30">
                        {index + 1}
                      </td>

                      {/* Frequency Badge M */}
                      <td className="py-3 px-2 text-center border-r border-slate-200">
                        <span
                          className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-amber-100 text-amber-800 border border-amber-300 font-extrabold text-[11px] shadow-2xs"
                          title="M - Monthly Activity (Bulanan)"
                        >
                          M
                        </span>
                      </td>

                      {/* Uraian Pekerjaan */}
                      <td className="py-3 px-3 border-r border-slate-200 sticky left-10 z-10 bg-white group-hover:bg-amber-50/30 shadow-xs">
                        <p className="font-bold text-slate-900 leading-snug">
                          {program.workDescription}
                        </p>
                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                          Monthly Activity · Deep Clean
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

                      {/* Calendar strip 1 - 31 */}
                      <td className="py-2 px-2.5 border-r border-slate-200">
                        <div className="flex items-center gap-0.5 overflow-x-auto max-w-[340px] py-1 scrollbar-thin">
                          {Array.from({ length: daysInMonth }, (_, i) => {
                            const d = i + 1;
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
                                    ? 'ring-2 ring-amber-600 ring-offset-1 z-10'
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
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-amber-600 transition-colors"
                            title="Edit Monthly Activity"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              deleteMasterProgram(program.id);
                              showToast('Monthly Activity berhasil dihapus.');
                            }}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Hapus Monthly Activity"
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
    </div>
  )}

      {/* Add / Edit Monthly Activity Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center">
                  <CalendarClock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingItem ? 'Edit Monthly Activity' : 'Tambah Monthly Activity Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Frekuensi otomatis terkunci sebagai "M" (Monthly Activity) & terhubung ke Master Cleaning Program
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
                  Uraian Pekerjaan Bulanan (Deep Clean) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formWorkDescription}
                  onChange={(e) => setFormWorkDescription(e.target.value)}
                  placeholder="Contoh: Kristalisasi Lantai Marmer & Coating Granit High-Traffic"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-500"
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
                  placeholder="Contoh: Stripping wax lama, buffing pad merah dengan chemical kristalisasi 5M, finishing steel wool pad"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* Lokasi, PIC, Frekuensi (Locked to M) */}
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
                    placeholder="Contoh: Main Lobby & Lift Corridor"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Petugas Penanggung Jawab (PIC)
                  </label>
                  <select
                    value={formPicName}
                    onChange={(e) => setFormPicName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-500 cursor-pointer"
                  >
                    {cleaners.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name} ({c.shift})
                      </option>
                    ))}
                    <option value="Tim Spesialis Deep Clean">Tim Spesialis Deep Clean</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kategori Frekuensi
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-bold">
                    <span className="w-5 h-5 rounded-md bg-amber-600 text-white flex items-center justify-center text-[10px]">
                      M
                    </span>
                    <span>Monthly Activity (Bulanan)</span>
                  </div>
                </div>
              </div>

              {/* Day Status Setup 1 - 31 */}
              <div className="border-t border-slate-200 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="text-xs font-bold text-slate-800">
                      Pengaturan Tanggal Eksekusi (1 - {daysInMonth})
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
                        for (let d = 1; d <= 31; d++) updated[d] = d === safeSelectedDay ? 'planned' : 'none';
                        setFormDays(updated);
                      }}
                      className="px-2 py-1 bg-amber-50 hover:bg-amber-100 rounded-lg text-amber-900 font-semibold"
                    >
                      Pilih Tgl {safeSelectedDay}
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
                          day === safeSelectedDay ? 'ring-2 ring-amber-600' : ''
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
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors"
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
