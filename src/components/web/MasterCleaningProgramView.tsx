import React, { useState, useMemo } from 'react';
import {
  CalendarRange,
  Plus,
  Search,
  Filter,
  Download,
  FileDown,
  CheckCircle2,
  Clock,
  Calendar,
  Building2,
  Edit2,
  Trash2,
  Copy,
  Info,
  Check,
  X,
  Sparkles,
  Layers,
  ChevronRight,
  UserCheck,
  AlertCircle,
  HelpCircle,
  Smartphone,
  Table,
  ChevronDown,
  ChevronUp,
  MapPin,
  User,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import { MasterCleaningProgramItem, ProgramDayStatus, ProgramFrequencyCode } from '../../types';
import { exportMasterCleaningProgramToPDF } from '../../utils/pdfExport';
import { normalizeFrequencyCode, FREQUENCY_META, PROGRAM_STATUS_META } from '../../utils/mcpUtils';

export const MasterCleaningProgramView: React.FC = () => {
  const {
    masterPrograms,
    activeProject,
    cleaners,
    areas,
    addMasterProgram,
    updateMasterProgram,
    deleteMasterProgram,
    toggleMasterProgramDay,
    batchSetMasterProgramDays,
    duplicateMasterProgram,
    userRole,
  } = useCleaning();

  // Filter and period states
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1); // 1 - 12
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFrequency, setFilterFrequency] = useState<string>('all');
  const [filterLocation, setFilterLocation] = useState<string>('all');

  // Mobile vs Table View Mode
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'cards' : 'table'
  );
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterCleaningProgramItem | null>(null);

  // Form states for Add / Edit
  const [formWorkDescription, setFormWorkDescription] = useState('');
  const [formWorkMethod, setFormWorkMethod] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formFrequency, setFormFrequency] = useState<ProgramFrequencyCode>('M');
  const [formPicName, setFormPicName] = useState('');
  const [formDays, setFormDays] = useState<Record<number, ProgramDayStatus>>({});

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Month names in Indonesian
  const monthOptions = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Desember' },
  ];

  // Filter programs by project (already filtered in context), month, year, search term, and category
  const filteredPrograms = useMemo(() => {
    return masterPrograms.filter((item) => {
      if (item.month !== selectedMonth || item.year !== selectedYear) return false;
      if (filterFrequency !== 'all') {
        const itemFreq = normalizeFrequencyCode(item.frequency);
        if (itemFreq !== filterFrequency) return false;
      }
      if (filterLocation !== 'all' && item.location !== filterLocation) return false;

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
  }, [masterPrograms, selectedMonth, selectedYear, filterFrequency, filterLocation, searchTerm]);

  // Unique locations from programs for filter
  const availableLocations = useMemo(() => {
    const locSet = new Set<string>();
    masterPrograms.forEach((p) => {
      if (p.location) locSet.add(p.location);
    });
    return Array.from(locSet);
  }, [masterPrograms]);

  // Statistics
  const statistics = useMemo(() => {
    let totalPlan = 0;
    let dailyCount = 0;
    let weeklyCount = 0;
    let monthlyCount = 0;

    filteredPrograms.forEach((prog) => {
      const code = normalizeFrequencyCode(prog.frequency);
      if (code === 'D') dailyCount++;
      else if (code === 'W') weeklyCount++;
      else if (code === 'M') monthlyCount++;

      for (let day = 1; day <= 31; day++) {
        const st = prog.days[day];
        if (st === 'planned' || st === 'done' || st === 'in_progress' || st === 'rescheduled') {
          totalPlan++;
        }
      }
    });

    return {
      totalPrograms: filteredPrograms.length,
      totalPlan,
      dailyCount,
      weeklyCount,
      monthlyCount,
    };
  }, [filteredPrograms]);

  // Open modal for new item
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormWorkDescription('');
    setFormWorkMethod('');
    setFormLocation(areas[0]?.name || 'Lobby Utama');
    setFormFrequency('bulanan');
    setFormPicName(cleaners[0]?.name || 'Budi Santoso');

    // Default empty days
    const initialDays: Record<number, ProgramDayStatus> = {};
    for (let i = 1; i <= 31; i++) {
      initialDays[i] = 'none';
    }
    setFormDays(initialDays);
    setIsAddModalOpen(true);
  };

  // Open modal for editing existing item
  const handleOpenEditModal = (item: MasterCleaningProgramItem) => {
    setEditingItem(item);
    setFormWorkDescription(item.workDescription);
    setFormWorkMethod(item.workMethod);
    setFormLocation(item.location);
    setFormFrequency(item.frequency);
    setFormPicName(item.picName);
    setFormDays({ ...item.days });
    setIsAddModalOpen(true);
  };

  // Save Add / Edit
  const handleSaveProgram = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formWorkDescription.trim() || !formWorkMethod.trim()) {
      alert('Mohon lengkapi uraian pekerjaan dan metode pekerjaan.');
      return;
    }

    if (editingItem) {
      updateMasterProgram(editingItem.id, {
        workDescription: formWorkDescription.trim(),
        workMethod: formWorkMethod.trim(),
        location: formLocation,
        frequency: formFrequency,
        picName: formPicName,
        days: formDays,
      });
      showToast('Program kerja berhasil diperbarui.');
    } else {
      addMasterProgram({
        projectId: activeProject.id,
        month: selectedMonth,
        year: selectedYear,
        workDescription: formWorkDescription.trim(),
        workMethod: formWorkMethod.trim(),
        location: formLocation,
        frequency: formFrequency,
        picName: formPicName,
        days: formDays,
      });
      showToast('Program kerja baru berhasil ditambahkan.');
    }

    setIsAddModalOpen(false);
  };

  // Export PDF
  const handleDownloadPDF = () => {
    exportMasterCleaningProgramToPDF({
      programs: filteredPrograms,
      project: activeProject,
      month: selectedMonth,
      year: selectedYear,
    });
    showToast('Dokumen PDF Master Cleaning Program berhasil diunduh.');
  };

  // Export CSV
  const handleExportCSV = () => {
    const dayHeaders = Array.from({ length: 31 }, (_, i) => `Tgl_${i + 1}`);
    const csvHeaders = [
      'No',
      'Lokasi Proyek',
      'Uraian Pekerjaan',
      'Metode Pekerjaan',
      'Lokasi Area',
      'Frekuensi',
      'PIC',
      ...dayHeaders,
      'Total_Rencana_R',
    ];

    const csvRows = filteredPrograms.map((prog, idx) => {
      let plan = 0;
      const dayValues = Array.from({ length: 31 }, (_, i) => {
        const d = i + 1;
        const st = prog.days[d] || 'none';
        if (st === 'planned' || st === 'done' || st === 'in_progress' || st === 'rescheduled') {
          plan++;
          return 'R';
        }
        return '-';
      });

      return [
        (idx + 1).toString(),
        `"${activeProject.name}"`,
        `"${prog.workDescription.replace(/"/g, '""')}"`,
        `"${prog.workMethod.replace(/"/g, '""')}"`,
        `"${prog.location}"`,
        `"${prog.frequency}"`,
        `"${prog.picName}"`,
        ...dayValues,
        plan,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [csvHeaders.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Master_Cleaning_Program_${activeProject.name}_${selectedYear}_${selectedMonth}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('File CSV Master Cleaning Program berhasil diekspor.');
  };

  // Quick preset helper in modal
  const applyPresetDays = (preset: 'all' | 'workdays' | 'weekends' | 'alternate' | 'clear') => {
    const updated: Record<number, ProgramDayStatus> = {};
    for (let day = 1; day <= 31; day++) {
      if (preset === 'all') {
        updated[day] = 'planned';
      } else if (preset === 'workdays') {
        // Approximate workdays assuming standard month distribution
        const dayOfWeek = (day % 7);
        updated[day] = dayOfWeek !== 0 && dayOfWeek !== 6 ? 'planned' : 'none';
      } else if (preset === 'weekends') {
        const dayOfWeek = (day % 7);
        updated[day] = dayOfWeek === 0 || dayOfWeek === 6 ? 'planned' : 'none';
      } else if (preset === 'alternate') {
        updated[day] = day % 2 === 1 ? 'planned' : 'none';
      } else {
        updated[day] = 'none';
      }
    }
    setFormDays(updated);
  };

  // Status visual styles for Day Cell in calendar table - only R or -
  const renderStatusCell = (status: ProgramDayStatus | undefined) => {
    if (status === 'planned' || status === 'done' || status === 'in_progress' || status === 'rescheduled') {
      return (
        <span
          className="w-5 h-5 rounded-md bg-sky-100 text-sky-700 border border-sky-300 font-bold text-[10px] flex items-center justify-center shadow-2xs select-none"
          title="R : Rencana (Planned)"
        >
          R
        </span>
      );
    }
    return (
      <span
        className="w-5 h-5 rounded-md text-slate-300 hover:text-slate-500 hover:bg-slate-100 font-medium text-[11px] flex items-center justify-center transition-colors select-none"
        title="Tidak Terjadwal (Klik untuk set rencana)"
      >
        -
      </span>
    );
  };

  // Frequency badge renderer: "D" (Daily), "W" (Weekly), "M" (Monthly)
  const renderFrequencyBadge = (freq: string | undefined) => {
    const code = normalizeFrequencyCode(freq);
    const meta = FREQUENCY_META[code];
    return (
      <span
        className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-extrabold text-[11px] shadow-2xs border ${meta.badgeClass}`}
        title={`${code} - ${meta.label} (${meta.description})`}
      >
        {code}
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Project Location Notice */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <CalendarRange className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Master Cleaning Program (MCP)
                <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[11px] font-bold">
                  Siklus Tanggal 1 - 31
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Rencana & monitoring berkala uraian pekerjaan, metode SOP, lokasi, dan status harian
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-slate-600 bg-teal-50/70 border border-teal-200/60 px-3 py-1.5 rounded-xl w-fit">
            <Building2 className="w-3.5 h-3.5 text-teal-700 shrink-0" />
            <span>
              Lokasi Aktif Pengguna:&nbsp;
              <strong className="text-teal-950 font-bold">{activeProject.name}</strong>
              &nbsp;({activeProject.clientName} • {activeProject.city})
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold shadow-xs transition-colors"
            title="Download PDF Master Cleaning Program Landscape Lengkap Kop Surat"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Download PDF MCP</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Ekspor Excel / CSV</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Program Kerja</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Program Kerja</span>
            <span className="p-1.5 rounded-lg bg-teal-50 text-teal-600">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{statistics.totalPrograms}</span>
            <span className="text-[11px] text-slate-500">Item Pekerjaan</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Titik Jadwal Terencana</span>
            <span className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-sky-700">{statistics.totalPlan}</span>
            <span className="text-[11px] text-slate-500">Titik Rencana [R]</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Program Harian</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-700">{statistics.dailyCount}</span>
            <span className="text-[11px] text-slate-500">Item [D]</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Program Berkala (W & M)</span>
            <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-700">{statistics.weeklyCount + statistics.monthlyCount}</span>
            <span className="text-[11px] text-purple-600 font-bold">Mingguan / Bulanan</span>
          </div>
        </div>
      </div>

      {/* Filter and Period Selection Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        <div className="flex flex-wrap items-center gap-3">
          {/* Period Selector: Bulan & Tahun */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <Calendar className="w-3.5 h-3.5 text-teal-600" />
            <span className="text-[11px] text-slate-500 font-medium">Bulan:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent font-bold text-slate-800 text-xs focus:outline-hidden cursor-pointer"
            >
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <span className="text-[11px] text-slate-500 font-medium">Tahun:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent font-bold text-slate-800 text-xs focus:outline-hidden cursor-pointer"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>

          {/* Category / Frequency Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] text-slate-500 font-medium">Frekuensi:</span>
            <select
              value={filterFrequency}
              onChange={(e) => setFilterFrequency(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 text-xs focus:outline-hidden cursor-pointer"
            >
              <option value="all">Semua Frekuensi</option>
              <option value="D">D - Daily Activity (Harian)</option>
              <option value="W">W - Weekly Activity (Mingguan)</option>
              <option value="M">M - Monthly Activity (Bulanan)</option>
            </select>
          </div>

          {/* Location Filter */}
          {availableLocations.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
              <span className="text-[11px] text-slate-500 font-medium">Lokasi:</span>
              <select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 text-xs focus:outline-hidden cursor-pointer"
              >
                <option value="all">Semua Area</option>
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
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Kartu Program</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                viewMode === 'table'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Tabel Grid</span>
            </button>
          </div>
        </div>

        {/* Search Field */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari uraian, metode, PIC..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-teal-500 focus:bg-white transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1. VIEW MODE: KARTU PROGRAM (OPTIMAL UNTUK LAYAR PONSEL)      */}
      {/* ============================================================ */}
      {viewMode === 'cards' && (
        <div className="space-y-3">
          {filteredPrograms.length === 0 ? (
            <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl text-slate-400">
              Belum ada program kerja untuk filter ini.
            </div>
          ) : (
            filteredPrograms.map((program, index) => {
              const freqMeta = FREQUENCY_META[normalizeFrequencyCode(program.frequencyCode)];
              const planCount = Object.values(program.days).filter((s) => s === 'planned').length;
              const isExpanded = expandedCardId === program.id;

              return (
                <div
                  key={program.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3 transition-all"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <span
                        className={`shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg font-black text-xs border ${freqMeta.badgeClass}`}
                        title={freqMeta.label}
                      >
                        {freqMeta.code}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold">
                          <span>#{index + 1}</span>
                          <span>·</span>
                          <span className="text-teal-700 font-bold">{freqMeta.shortLabel}</span>
                          <span>·</span>
                          <span className="text-sky-600 font-bold">{planCount} Rencana</span>
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
                        className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                        title="Ubah Program"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => duplicateMasterProgram(program.id)}
                        className="p-1.5 text-slate-400 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors"
                        title="Duplikat Program"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Hapus program: "${program.workDescription}"?`)) {
                            deleteMasterProgram(program.id);
                            showToast('Program kerja berhasil dihapus.');
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus Program"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Location, PIC & Method */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span className="text-slate-700 font-medium truncate">
                        {program.location || 'Semua Area'}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-1.5 truncate">
                      <User className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span className="text-slate-700 font-medium truncate">
                        {program.picName || 'Semua Cleaner'}
                      </span>
                    </div>
                  </div>

                  {program.workMethod && (
                    <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80 text-xs flex items-start gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="text-slate-600 line-clamp-2">
                        <strong className="text-slate-800">SOP:</strong> {program.workMethod}
                      </span>
                    </div>
                  )}

                  {/* Expandable 31 Days Matrix for this Task */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setExpandedCardId(isExpanded ? null : program.id)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-teal-600" />
                        <span>Siklus Tanggal 1 - 31 ({planCount} hari dijadwalkan)</span>
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-500">
                          {isExpanded ? 'Tutup' : 'Atur Jadwal'}
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
                          Ketuk tanggal untuk mengaktifkan / menonaktifkan rencana (R):
                        </p>
                        <div className="grid grid-cols-7 gap-1 text-center">
                          {Array.from({ length: 31 }, (_, i) => {
                            const d = i + 1;
                            const isPlanned = program.days[d] === 'planned';
                            return (
                              <button
                                key={d}
                                type="button"
                                onClick={() => {
                                  const nextSt = isPlanned ? 'none' : 'planned';
                                  toggleMasterProgramDay(program.id, d, nextSt);
                                }}
                                className={`p-1.5 rounded-lg border text-center transition-all ${
                                  isPlanned
                                    ? 'bg-sky-100 text-sky-800 border-sky-300 font-bold shadow-2xs'
                                    : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                <span className="text-[9px] text-slate-400 block leading-none">
                                  {d}
                                </span>
                                <span className="text-xs font-black block mt-0.5">
                                  {isPlanned ? 'R' : '-'}
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
      {/* 2. VIEW MODE: TABEL GRID BULANAN                            */}
      {/* ============================================================ */}
      {viewMode === 'table' && (
        <div className="space-y-3">
          {/* Mobile swipe helper */}
          <div className="md:hidden flex items-center justify-between gap-2 p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900 shadow-2xs">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-teal-600 shrink-0" />
              <span className="text-[11px] leading-tight">
                Tabel master 31 hari: Geser ke samping, atau gunakan <strong>Kartu Program</strong> untuk layar ponsel.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className="shrink-0 px-2.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-lg text-[11px] shadow-xs"
            >
              Mode Kartu
            </button>
          </div>

          {/* Legend Information Box */}
          <div className="bg-slate-50/80 border border-slate-200/80 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600 font-medium">
              <Info className="w-4 h-4 text-teal-600 shrink-0" />
              <span>Petunjuk Status Tanggal (Klik sel tanggal untuk mengatur status):</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 font-semibold text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md bg-sky-100 text-sky-700 border border-sky-300 text-[10px] font-bold flex items-center justify-center shadow-2xs">
                  R
                </span>
                <span className="text-slate-800 font-bold">R : Rencana (Planned)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md text-slate-400 font-bold flex items-center justify-center bg-white border border-slate-200">
                  -
                </span>
                <span className="text-slate-500">Tidak Terjadwal</span>
              </div>
            </div>
          </div>

          {/* Main Master Cleaning Program Grid Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white font-semibold text-[11px]">
                <th className="py-3 px-2.5 text-center w-10 border-r border-slate-700 sticky left-0 z-20 bg-slate-800">
                  No
                </th>
                <th className="py-3 px-3 min-w-[220px] max-w-[280px] border-r border-slate-700 sticky left-10 z-20 bg-slate-800 shadow-sm">
                  Uraian Pekerjaan
                </th>
                <th className="py-3 px-3 min-w-[200px] border-r border-slate-700">
                  Metode Pekerjaan (SOP)
                </th>
                <th className="py-3 px-3 min-w-[130px] border-r border-slate-700">
                  Lokasi / Area
                </th>
                <th className="py-3 px-2 text-center w-12 min-w-[48px] border-r border-slate-700 font-bold" title="Frekuensi Program: D (Daily), W (Weekly), M (Monthly)">
                  Freq
                </th>
                <th className="py-3 px-3 min-w-[110px] border-r border-slate-700">
                  PIC
                </th>

                {/* Date Columns 1 - 31 */}
                {Array.from({ length: 31 }, (_, i) => (
                  <th
                    key={i + 1}
                    className="py-2.5 px-1 text-center w-8 min-w-[32px] border-r border-slate-700 text-[10px] font-bold"
                  >
                    {i + 1}
                  </th>
                ))}

                <th className="py-3 px-2 text-center w-20 border-r border-slate-700 font-bold text-sky-300">
                  Plan (R)
                </th>
                <th className="py-3 px-3 text-center w-24">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {filteredPrograms.length === 0 ? (
                <tr>
                  <td colSpan={40} className="py-12 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Layers className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-semibold text-slate-700 text-sm">
                        Belum ada program kerja untuk periode ini
                      </p>
                      <p className="text-xs text-slate-400">
                        Klik tombol "+ Tambah Program Kerja" di atas untuk menambahkan program kerja kebersihan pada lokasi {activeProject.name}.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPrograms.map((program, index) => {
                  let planCount = 0;
                  let doneCount = 0;
                  for (let d = 1; d <= 31; d++) {
                    const st = program.days[d];
                    if (st === 'planned') planCount++;
                    else if (st === 'done') {
                      planCount++;
                      doneCount++;
                    } else if (st === 'in_progress') planCount++;
                    else if (st === 'rescheduled') planCount++;
                  }
                  const pct = planCount > 0 ? Math.round((doneCount / planCount) * 100) : 100;
                  const freqCode = normalizeFrequencyCode(program.frequency);
                  const freqMeta = FREQUENCY_META[freqCode];

                  return (
                    <tr
                      key={program.id}
                      className="hover:bg-teal-50/30 transition-colors group"
                    >
                      {/* No */}
                      <td className="py-2.5 px-2.5 text-center font-bold text-slate-500 border-r border-slate-200 sticky left-0 z-10 bg-white group-hover:bg-teal-50/30">
                        {index + 1}
                      </td>

                      {/* Uraian Pekerjaan */}
                      <td className="py-2.5 px-3 border-r border-slate-200 sticky left-10 z-10 bg-white group-hover:bg-teal-50/30 shadow-xs">
                        <p className="font-bold text-slate-900 line-clamp-2">
                          {program.workDescription}
                        </p>
                        <span
                          className={`inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${freqMeta.badgeClass}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          {freqCode} · {freqMeta.label}
                        </span>
                      </td>

                      {/* Metode Pekerjaan */}
                      <td className="py-2.5 px-3 border-r border-slate-200 text-slate-700">
                        <p className="line-clamp-2 text-[11px] leading-relaxed">
                          {program.workMethod}
                        </p>
                      </td>

                      {/* Lokasi */}
                      <td className="py-2.5 px-3 border-r border-slate-200">
                        <div className="flex items-center gap-1 text-slate-800 font-semibold text-[11px]">
                          <span>{program.location}</span>
                        </div>
                      </td>

                      {/* Freq Column */}
                      <td className="py-2.5 px-2 text-center border-r border-slate-200">
                        {renderFrequencyBadge(program.frequency)}
                      </td>

                      {/* PIC */}
                      <td className="py-2.5 px-3 border-r border-slate-200">
                        <p className="font-semibold text-slate-800 text-[11px]">
                          {program.picName}
                        </p>
                      </td>

                      {/* Day Cells 1 - 31 */}
                      {Array.from({ length: 31 }, (_, i) => {
                        const dayNumber = i + 1;
                        const status = program.days[dayNumber];
                        return (
                          <td
                            key={dayNumber}
                            onClick={() => {
                              const currentSt = program.days[dayNumber];
                              const nextSt = currentSt === 'planned' ? 'none' : 'planned';
                              toggleMasterProgramDay(program.id, dayNumber, nextSt);
                            }}
                            className="py-1 px-0.5 text-center border-r border-slate-100 cursor-pointer hover:bg-teal-100/60 transition-colors"
                          >
                            <div className="flex items-center justify-center">
                              {renderStatusCell(status)}
                            </div>
                          </td>
                        );
                      })}

                      {/* Plan (R) */}
                      <td className="py-2.5 px-2 text-center font-bold text-sky-700 border-r border-slate-200 bg-sky-50/20">
                        {planCount}
                      </td>

                      {/* Action buttons */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(program)}
                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-teal-700 transition-colors"
                            title="Ubah Program"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => duplicateMasterProgram(program.id)}
                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-sky-700 transition-colors"
                            title="Duplikat Program"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Hapus program: "${program.workDescription}"?`)) {
                                deleteMasterProgram(program.id);
                                showToast('Program kerja berhasil dihapus.');
                              }
                            }}
                            className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Hapus Program"
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

      {/* Add / Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
                  <CalendarRange className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {editingItem ? 'Edit Master Cleaning Program' : 'Tambah Master Cleaning Program'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Lokasi Proyek: <strong>{activeProject.name}</strong> • Periode: {monthOptions[selectedMonth - 1]?.label} {selectedYear}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveProgram} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Uraian Pekerjaan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Uraian Pekerjaan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={formWorkDescription}
                  onChange={(e) => setFormWorkDescription(e.target.value)}
                  placeholder="Contoh: Stripping dan recoating lantai vinyl ruang tindakan medik..."
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
              </div>

              {/* Metode Pekerjaan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Metode Pekerjaan (SOP Teknis) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={formWorkMethod}
                  onChange={(e) => setFormWorkMethod(e.target.value)}
                  placeholder="Contoh: 1. Pasang wet floor sign. 2. Larutkan wax stripper 1:4. 3. Scrubbing mesin single disc pad hitam..."
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
              </div>

              {/* 3 Columns: Lokasi, Frekuensi, PIC */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Lokasi / Area <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="Contoh: Lobby Utama Lantai 1"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Frekuensi Program <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formFrequency}
                    onChange={(e) => setFormFrequency(e.target.value as ProgramFrequencyCode)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-500 cursor-pointer font-medium"
                  >
                    <option value="D">D - Daily Activity (Harian)</option>
                    <option value="W">W - Weekly Activity (Mingguan)</option>
                    <option value="M">M - Monthly Activity (Bulanan)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Petugas Penanggung Jawab (PIC)
                  </label>
                  <select
                    value={formPicName}
                    onChange={(e) => setFormPicName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-500 cursor-pointer"
                  >
                    {cleaners.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name} ({c.shift})
                      </option>
                    ))}
                    <option value="Tim Reguler">Tim Reguler Operasional</option>
                    <option value="Tim Khusus Periodic">Tim Khusus Periodic</option>
                  </select>
                </div>
              </div>

              {/* Day Picker: 1 - 31 */}
              <div className="border-t border-slate-200 pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                  <div>
                    <label className="text-xs font-bold text-slate-800">
                      Jadwal Tanggal (1 - 31)
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Klik tanggal untuk mengatur status (R = Rencana, - = Tidak Terjadwal)
                    </p>
                  </div>

                  {/* Preset buttons */}
                  <div className="flex flex-wrap items-center gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => applyPresetDays('all')}
                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                    >
                      Semua Hari (1-31)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetDays('workdays')}
                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                    >
                      Hari Kerja
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetDays('alternate')}
                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                    >
                      Selang-Seling
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetDays('clear')}
                      className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold cursor-pointer"
                    >
                      Kosongkan
                    </button>
                  </div>
                </div>

                {/* 31 Days Buttons Grid */}
                <div className="grid grid-cols-7 sm:grid-cols-11 gap-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {Array.from({ length: 31 }, (_, idx) => {
                    const day = idx + 1;
                    const st = formDays[day] || 'none';
                    const isPlanned = st === 'planned' || st === 'done' || st === 'in_progress' || st === 'rescheduled';
                    const badgeColor = isPlanned
                      ? 'bg-sky-500 text-white border-sky-600 font-bold shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-sky-50';
                    const label = isPlanned ? 'R' : '-';

                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          const nextStatus: ProgramDayStatus = isPlanned ? 'none' : 'planned';
                          setFormDays((prev) => ({ ...prev, [day]: nextStatus }));
                        }}
                        className={`p-1.5 rounded-lg border text-center transition-all flex flex-col items-center justify-center cursor-pointer ${badgeColor}`}
                      >
                        <span className="text-[10px] leading-none opacity-80">{day}</span>
                        <span className="text-[11px] font-bold leading-tight">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  {editingItem ? 'Simpan Perubahan' : 'Tambahkan ke Program Kerja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
