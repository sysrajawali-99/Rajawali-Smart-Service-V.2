import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  User,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  X,
  FileSpreadsheet,
  FileText,
  Sparkles,
  Info,
  CheckSquare,
  Square,
  MapPin,
  Check,
  Layers,
  Smartphone,
  Table,
  ChevronDown,
  ChevronUp,
  Phone,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import { Cleaner, AttendanceStatusCode, AttendanceBookPeriod } from '../../types';
import {
  PeriodDateItem,
  buildPeriodDates,
  calculateWorkingDaysForPeriod,
  getCleanerAttendanceStatus,
  getDaysInMonthCount,
} from '../../utils/shiftUtils';
import { resolveShiftForCleaner } from '../../utils/manpowerManday';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const ATTENDANCE_STATUS_LIST: Array<{
  code: AttendanceStatusCode;
  label: string;
  badgeClass: string;
  description: string;
  weightText: string;
}> = [
  {
    code: 'H',
    label: 'Hadir',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
    description: 'Hadir reguler sesuai jam shift kerja',
    weightText: '1x Hari Kerja',
  },
  {
    code: 'L',
    label: 'Lembur',
    badgeClass: 'bg-purple-100 text-purple-900 border-purple-300 font-black ring-1 ring-purple-400',
    description: 'Masuk saat hari libur / tugas lembur ekstra',
    weightText: '★ Dihitung 2x Hari Kerja',
  },
  {
    code: 'I',
    label: 'Izin',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-300 font-semibold',
    description: 'Izin terencana dengan pemberitahuan',
    weightText: '0x Hari Kerja',
  },
  {
    code: 'S',
    label: 'Sakit',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-semibold',
    description: 'Sakit dengan surat dokter / pemberitahuan',
    weightText: '0x Hari Kerja',
  },
  {
    code: 'A',
    label: 'Alpa',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
    description: 'Tanpa keterangan / mangkir',
    weightText: '0x Hari Kerja',
  },
  {
    code: '-',
    label: 'Libur',
    badgeClass: 'bg-slate-100 text-slate-400 border-slate-200 font-normal',
    description: 'Libur rotasi mingguan / belum dijadwalkan',
    weightText: '0x Hari Kerja',
  },
];

export const PetugasView: React.FC = () => {
  const {
    cleaners,
    shifts: allShifts,
    getProjectShifts,
    addCleaner,
    updateCleaner,
    deleteCleaner,
    updateCleanerAttendance,
    batchSetCleanerAttendance,
    activeProjectId,
    activeProject,
    updateProject,
  } = useCleaning();

  const shifts = useMemo(() => {
    const scoped = getProjectShifts(activeProjectId);
    return scoped.length > 0 ? scoped : allShifts;
  }, [getProjectShifts, activeProjectId, activeProject?.shiftIds, allShifts]);

  // Period filter (Periode Buka Buku & Tutup Buku)
  const today = new Date();
  const currentYear = today.getFullYear();

  const getDefaultBookPeriod = (): AttendanceBookPeriod => {
    const y = today.getFullYear();
    const m = today.getMonth() + 1;
    return {
      openDay: 1,
      openMonth: m,
      openYear: y,
      closeDay: getDaysInMonthCount(y, m),
      closeMonth: m,
      closeYear: y,
    };
  };

  const storagePeriodKey = `petugas_book_period_${activeProjectId || 'default'}`;

  const [bookPeriod, setBookPeriod] = useState<AttendanceBookPeriod>(() => {
    if (activeProject?.attendancePeriod) {
      return activeProject.attendancePeriod;
    }
    try {
      const saved = localStorage.getItem(storagePeriodKey);
      if (saved) {
        const parsed = JSON.parse(saved) as AttendanceBookPeriod;
        if (
          parsed &&
          parsed.openDay >= 1 &&
          parsed.openMonth >= 1 &&
          parsed.openYear >= 2000 &&
          parsed.closeDay >= 1 &&
          parsed.closeMonth >= 1 &&
          parsed.closeYear >= 2000
        ) {
          return parsed;
        }
      }
    } catch {
      // ignore invalid stored value
    }
    return getDefaultBookPeriod();
  });

  // Sync when switching project or receiving remote update for project's attendancePeriod
  useEffect(() => {
    if (activeProject?.attendancePeriod) {
      const remote = activeProject.attendancePeriod;
      setBookPeriod((prev) => {
        if (
          prev.openDay === remote.openDay &&
          prev.openMonth === remote.openMonth &&
          prev.openYear === remote.openYear &&
          prev.closeDay === remote.closeDay &&
          prev.closeMonth === remote.closeMonth &&
          prev.closeYear === remote.closeYear
        ) {
          return prev;
        }
        return remote;
      });
      return;
    }
    try {
      const saved = localStorage.getItem(storagePeriodKey);
      if (saved) {
        const parsed = JSON.parse(saved) as AttendanceBookPeriod;
        if (parsed?.openYear && parsed?.closeYear) {
          setBookPeriod(parsed);
          return;
        }
      }
    } catch {
      // ignore
    }
    setBookPeriod(getDefaultBookPeriod());
  }, [activeProjectId, activeProject?.attendancePeriod, storagePeriodKey]);

  const updateBookPeriod = (updater: (prev: AttendanceBookPeriod) => AttendanceBookPeriod) => {
    setBookPeriod((prev) => {
      const rawNext = updater(prev);
      const safeOpenMax = getDaysInMonthCount(rawNext.openYear, rawNext.openMonth);
      const safeCloseMax = getDaysInMonthCount(rawNext.closeYear, rawNext.closeMonth);
      const next: AttendanceBookPeriod = {
        ...rawNext,
        openDay: Math.max(1, Math.min(rawNext.openDay, safeOpenMax)),
        closeDay: Math.max(1, Math.min(rawNext.closeDay, safeCloseMax)),
      };
      try {
        localStorage.setItem(storagePeriodKey, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      if (activeProject?.id) {
        updateProject(activeProject.id, { attendancePeriod: next });
      }
      return next;
    });
  };

  const yearOptions = useMemo(() => {
    const base = Array.from({ length: 16 }, (_, i) => currentYear - 5 + i);
    const set = new Set<number>([...base, bookPeriod.openYear, bookPeriod.closeYear]);
    return Array.from(set).sort((a, b) => a - b);
  }, [currentYear, bookPeriod.openYear, bookPeriod.closeYear]);

  const openMonthMaxDays = useMemo(
    () => getDaysInMonthCount(bookPeriod.openYear, bookPeriod.openMonth),
    [bookPeriod.openYear, bookPeriod.openMonth]
  );

  const closeMonthMaxDays = useMemo(
    () => getDaysInMonthCount(bookPeriod.closeYear, bookPeriod.closeMonth),
    [bookPeriod.closeYear, bookPeriod.closeMonth]
  );

  const {
    dates: periodDates,
    isInvalidOrder: isPeriodInvalidOrder,
    isTruncated: isPeriodTruncated,
    totalRawDays: periodTotalRawDays,
  } = useMemo(() => buildPeriodDates(bookPeriod, 62), [bookPeriod]);

  const openLabel = `${bookPeriod.openDay} ${MONTH_NAMES[bookPeriod.openMonth - 1] || ''} ${bookPeriod.openYear}`;
  const closeLabel = `${bookPeriod.closeDay} ${MONTH_NAMES[bookPeriod.closeMonth - 1] || ''} ${bookPeriod.closeYear}`;

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<string>('all');

  // Modal State for Add / Edit Cleaner
  const [showCleanerModal, setShowCleanerModal] = useState(false);
  const [editingCleanerId, setEditingCleanerId] = useState<string | null>(null);
  const [cleanerFormName, setCleanerFormName] = useState('');
  const [cleanerFormShiftId, setCleanerFormShiftId] = useState('');
  const [cleanerFormPlotting, setCleanerFormPlotting] = useState('');

  // Plotingan Modal State (Terhubung ke Uraian Tugas & Deskripsi Shift)
  const [plottingCleaner, setPlottingCleaner] = useState<Cleaner | null>(null);
  const [plottingSelectedShiftId, setPlottingSelectedShiftId] = useState<string>('');
  const [selectedAllocationIds, setSelectedAllocationIds] = useState<string[]>([]);
  const [manualPlottingText, setManualPlottingText] = useState('');

  // Mobile vs Table Matrix View Mode
  const [viewMode, setViewMode] = useState<'cards' | 'matrix'>(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'cards' : 'matrix'
  );
  const [expandedCleanerCalendar, setExpandedCleanerCalendar] = useState<string | null>(null);

  // Delete confirm modal
  const [deleteCleanerId, setDeleteCleanerId] = useState<string | null>(null);

  // Quick Popover Picker for cell status
  const [activeCellPicker, setActiveCellPicker] = useState<{
    cleanerId: string;
    dateItem: PeriodDateItem;
  } | null>(null);

  // Toast / Status banner
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 3500);
  };

  // Keyboard shortcut: Escape to close active modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showCleanerModal) setShowCleanerModal(false);
        else if (deleteCleanerId) setDeleteCleanerId(null);
        else if (plottingCleaner) setPlottingCleaner(null);
        else if (activeCellPicker) setActiveCellPicker(null);
      }
    };
    if (showCleanerModal || deleteCleanerId || plottingCleaner || activeCellPicker) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [showCleanerModal, deleteCleanerId, plottingCleaner, activeCellPicker]);

  // Filtered cleaners
  const filteredCleaners = useMemo(() => {
    return cleaners.filter((c) => {
      const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchShift = selectedShiftFilter === 'all' || c.shiftId === selectedShiftFilter;
      return matchSearch && matchShift;
    });
  }, [cleaners, searchQuery, selectedShiftFilter]);

  // Overall Statistics across active Buka Buku - Tutup Buku period
  const overallStats = useMemo(() => {
    let totalWorkDays = 0;
    let totalHadir = 0;
    let totalLembur = 0;

    filteredCleaners.forEach((c) => {
      const { hadirCount, lemburCount, totalWorkingDays } = calculateWorkingDaysForPeriod(
        c.attendanceByMonth,
        c.attendance,
        periodDates
      );
      totalWorkDays += totalWorkingDays;
      totalHadir += hadirCount;
      totalLembur += lemburCount;
    });

    return {
      cleanerCount: filteredCleaners.length,
      totalWorkDays,
      totalHadir,
      totalLembur,
    };
  }, [filteredCleaners, periodDates]);

  // Handle cell click (cycle or picker)
  const handleCellClick = (cleaner: Cleaner, dateItem: PeriodDateItem) => {
    const currentStatus = getCleanerAttendanceStatus(
      cleaner.attendanceByMonth,
      cleaner.attendance,
      dateItem
    );

    // Cycle order: H -> L -> I -> S -> A -> - -> H
    const cycleOrder: AttendanceStatusCode[] = ['H', 'L', 'I', 'S', 'A', '-'];
    const currentIndex = cycleOrder.indexOf(currentStatus);
    const nextStatus = cycleOrder[(currentIndex + 1) % cycleOrder.length];

    updateCleanerAttendance(cleaner.id, dateItem.day, nextStatus, dateItem.monthKey);
  };

  // Direct set from picker
  const handleSelectStatus = (cleanerId: string, dateItem: PeriodDateItem, status: AttendanceStatusCode) => {
    updateCleanerAttendance(cleanerId, dateItem.day, status, dateItem.monthKey);
    setActiveCellPicker(null);
  };

  // Open modal for add
  const handleOpenAdd = () => {
    setEditingCleanerId(null);
    setCleanerFormName('');
    setCleanerFormShiftId(shifts[0]?.id || 'shift-1');
    setCleanerFormPlotting('');
    setShowCleanerModal(true);
  };

  // Open modal for edit
  const handleOpenEdit = (cleaner: Cleaner) => {
    setEditingCleanerId(cleaner.id);
    setCleanerFormName(cleaner.name);
    setCleanerFormShiftId(cleaner.shiftId || shifts[0]?.id || 'shift-1');
    setCleanerFormPlotting(cleaner.workPlotting || '');
    setShowCleanerModal(true);
  };

  // Submit Add / Edit
  const handleSubmitCleaner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cleanerFormName.trim()) return;

    const matchedShift = shifts.find((s) => s.id === cleanerFormShiftId) || shifts[0];
    const nowTimeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

    if (editingCleanerId) {
      updateCleaner(editingCleanerId, {
        name: cleanerFormName.trim(),
        shiftId: matchedShift?.id || 'shift-1',
        shiftName: matchedShift?.name || 'Shift 1 ( satu )',
        workPlotting: cleanerFormPlotting.trim() || 'Lobby & Koridor Utama',
        workPlottingUpdatedAt: nowTimeStr,
      });
      showToast(`Data petugas "${cleanerFormName.trim()}" & plotingan lokasi berhasil diperbarui.`);
    } else {
      // Create with default H attendance for weekdays across the active Buka Buku - Tutup Buku period
      const newAtt: Record<number, AttendanceStatusCode> = {};
      const newAttByMonth: Record<string, Record<number, AttendanceStatusCode>> = {};

      if (periodDates.length > 0) {
        periodDates.forEach((item) => {
          const st: AttendanceStatusCode = item.isWeekend ? '-' : 'H';
          newAtt[item.day] = st;
          if (!newAttByMonth[item.monthKey]) newAttByMonth[item.monthKey] = {};
          newAttByMonth[item.monthKey][item.day] = st;
        });
      } else {
        const fallbackMonthKey = `${bookPeriod.openYear}-${String(bookPeriod.openMonth).padStart(2, '0')}`;
        newAttByMonth[fallbackMonthKey] = {};
        for (let d = 1; d <= 31; d++) {
          const isWeekend = d % 7 === 0 || d % 7 === 6;
          const st: AttendanceStatusCode = isWeekend ? '-' : 'H';
          newAtt[d] = st;
          newAttByMonth[fallbackMonthKey][d] = st;
        }
      }

      addCleaner({
        name: cleanerFormName.trim(),
        nik: `CLN-${bookPeriod.openYear}-${Math.floor(100 + Math.random() * 900)}`,
        phone: '0812-0000-0000',
        shiftId: matchedShift?.id || 'shift-1',
        shiftName: matchedShift?.name || 'Shift 1 ( satu )',
        photoUrl: '',
        assignedAreas: ['area-1'],
        status: 'active',
        rating: 5.0,
        tasksCompletedToday: 0,
        totalTasksToday: 4,
        isClockedIn: true,
        clockInTime: '07:00 WIB',
        attendance: newAtt,
        attendanceByMonth: newAttByMonth,
        workPlotting: cleanerFormPlotting.trim() || 'Lobby Utama & Area Publik',
        workPlottingUpdatedAt: nowTimeStr,
      });
      showToast(`Petugas baru "${cleanerFormName.trim()}" berhasil ditambahkan.`);
    }

    setShowCleanerModal(false);
  };

  // Handle delete
  const handleConfirmDelete = () => {
    if (deleteCleanerId) {
      deleteCleaner(deleteCleanerId);
      setDeleteCleanerId(null);
      showToast('Petugas berhasil dihapus.');
    }
  };

  // Batch Fill: Set all weekdays to H across active period
  const handleBatchFillWeekdays = (cleanerId: string) => {
    const byMonth: Record<string, Record<number, AttendanceStatusCode>> = {};
    periodDates.forEach((item) => {
      if (!byMonth[item.monthKey]) byMonth[item.monthKey] = {};
      byMonth[item.monthKey][item.day] = item.isWeekend ? '-' : 'H';
    });
    Object.entries(byMonth).forEach(([mKey, days]) => {
      batchSetCleanerAttendance(cleanerId, days, mKey);
    });
    showToast('Kehadiran hari kerja diatur ke Hadir (H).');
  };

  // Plotingan Handlers (Terhubung ke Uraian Tugas & Deskripsi Shift)
  const handleOpenPlottingModal = (cleaner: Cleaner) => {
    setPlottingCleaner(cleaner);
    setManualPlottingText(cleaner.workPlotting || '');
    const currentShiftId = cleaner.shiftId || shifts[0]?.id || '';
    setPlottingSelectedShiftId(currentShiftId);

    const targetShift = shifts.find((s) => s.id === currentShiftId) || shifts[0];
    const initialSelectedIds: string[] = [];
    if (targetShift?.plottingAllocations && cleaner.workPlotting) {
      targetShift.plottingAllocations.forEach((alloc) => {
        if (cleaner.workPlotting?.toLowerCase().includes(alloc.areaName.toLowerCase())) {
          initialSelectedIds.push(alloc.id);
        }
      });
    }
    setSelectedAllocationIds(initialSelectedIds);
  };

  const handleTogglePlottingAllocation = (allocId: string) => {
    let nextIds: string[];
    if (selectedAllocationIds.includes(allocId)) {
      nextIds = selectedAllocationIds.filter((id) => id !== allocId);
    } else {
      nextIds = [...selectedAllocationIds, allocId];
    }
    setSelectedAllocationIds(nextIds);

    const targetShift = shifts.find((s) => s.id === plottingSelectedShiftId) || shifts[0];
    const chosenAllocs = (targetShift?.plottingAllocations || []).filter((a) => nextIds.includes(a.id));

    if (chosenAllocs.length === 0) {
      setManualPlottingText('');
      return;
    }

    const compiled = chosenAllocs
      .map((a) => `${a.areaName}${a.taskDescription ? ` (${a.taskDescription})` : ''}`)
      .join(' • ');
    setManualPlottingText(compiled);
  };

  const handleSelectAllPlottingAllocations = () => {
    const targetShift = shifts.find((s) => s.id === plottingSelectedShiftId) || shifts[0];
    const allIds = (targetShift?.plottingAllocations || []).map((a) => a.id);
    setSelectedAllocationIds(allIds);

    const compiled = (targetShift?.plottingAllocations || [])
      .map((a) => `${a.areaName}${a.taskDescription ? ` (${a.taskDescription})` : ''}`)
      .join(' • ');
    setManualPlottingText(compiled);
  };

  const handleClearPlottingAllocations = () => {
    setSelectedAllocationIds([]);
    setManualPlottingText('');
  };

  const handleSaveWorkPlotting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plottingCleaner) return;

    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const finalLocation = manualPlottingText.trim() || 'Lobby & Koridor Utama';

    updateCleaner(plottingCleaner.id, {
      workPlotting: finalLocation,
      workPlottingUpdatedAt: nowTime,
    });

    showToast(`Plotingan lokasi ${plottingCleaner.name} berhasil diubah ke "${finalLocation}".`);
    setPlottingCleaner(null);
  };

  // Export to PDF
  const handleExportPDF = () => {
    if (periodDates.length === 0) {
      showToast('Rentang tanggal Buka Buku & Tutup Buku belum valid.');
      return;
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    // Title
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('REKAPITULASI PRESENSI KEHADIRAN PETUGAS KEBERSIHAN', 14, 15);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(
      `Periode Buka/Tutup Buku: ${openLabel} s/d ${closeLabel} (${periodDates.length} Hari) | H=Hadir, I=Izin, S=Sakit, A=Alpa, L=Lembur (2x)`,
      14,
      21
    );

    const crossesMultipleMonths =
      bookPeriod.openMonth !== bookPeriod.closeMonth || bookPeriod.openYear !== bookPeriod.closeYear;

    const headers = [
      'No',
      'Nama Petugas',
      'Shift',
      ...periodDates.map((item) => (crossesMultipleMonths ? `${item.day}/${item.month}` : String(item.day))),
      'H',
      'I',
      'S',
      'A',
      'L (2x)',
      'Total Hari',
    ];

    const bodyData = filteredCleaners.map((c, index) => {
      const { hadirCount, lemburCount, izinCount, sakitCount, alpaCount, totalWorkingDays } =
        calculateWorkingDaysForPeriod(c.attendanceByMonth, c.attendance, periodDates);

      const daysArr = periodDates.map((item) =>
        getCleanerAttendanceStatus(c.attendanceByMonth, c.attendance, item)
      );

      return [
        index + 1,
        c.name,
        resolveShiftForCleaner(c, shifts).name,
        ...daysArr,
        hadirCount,
        izinCount,
        sakitCount,
        alpaCount,
        lemburCount,
        `${totalWorkingDays} Hari`,
      ];
    });

    const statColStart = 3 + periodDates.length;

    autoTable(doc, {
      head: [headers],
      body: bodyData,
      startY: 26,
      styles: {
        fontSize: periodDates.length > 35 ? 6 : 7,
        cellPadding: 1.1,
        halign: 'center',
      },
      headStyles: {
        fillColor: [14, 116, 144], // Cyan/sky dark
        textColor: 255,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { halign: 'left', cellWidth: 28 },
        2: { halign: 'left', cellWidth: 24 },
        [statColStart]: { fillColor: [236, 253, 245], fontStyle: 'bold' }, // H
        [statColStart + 1]: { fillColor: [240, 249, 255] }, // I
        [statColStart + 2]: { fillColor: [254, 243, 199] }, // S
        [statColStart + 3]: { fillColor: [255, 228, 230] }, // A
        [statColStart + 4]: { fillColor: [243, 232, 255], fontStyle: 'bold' }, // L (2x)
        [statColStart + 5]: { fillColor: [224, 242, 254], fontStyle: 'bold' }, // Total
      },
    });

    const openFilePart = `${bookPeriod.openYear}-${String(bookPeriod.openMonth).padStart(2, '0')}-${String(bookPeriod.openDay).padStart(2, '0')}`;
    const closeFilePart = `${bookPeriod.closeYear}-${String(bookPeriod.closeMonth).padStart(2, '0')}-${String(bookPeriod.closeDay).padStart(2, '0')}`;
    doc.save(`Rekap_Kehadiran_Petugas_${openFilePart}_sd_${closeFilePart}.pdf`);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (periodDates.length === 0) {
      showToast('Rentang tanggal Buka Buku & Tutup Buku belum valid.');
      return;
    }

    const daysHeader = periodDates
      .map((item) => `Tgl_${String(item.day).padStart(2, '0')}-${String(item.month).padStart(2, '0')}-${item.year}`)
      .join(',');
    let csv = `No,Nama Petugas,Shift,${daysHeader},Hadir,Izin,Sakit,Alpa,Lembur,Total Hari Kerja (L=2x)\n`;

    filteredCleaners.forEach((c, idx) => {
      const { hadirCount, lemburCount, izinCount, sakitCount, alpaCount, totalWorkingDays } =
        calculateWorkingDaysForPeriod(c.attendanceByMonth, c.attendance, periodDates);

      const daysArr = periodDates
        .map((item) => getCleanerAttendanceStatus(c.attendanceByMonth, c.attendance, item))
        .join(',');
      csv += `${idx + 1},"${c.name}","${resolveShiftForCleaner(c, shifts).name}",${daysArr},${hadirCount},${izinCount},${sakitCount},${alpaCount},${lemburCount},${totalWorkingDays}\n`;
    });

    const openFilePart = `${bookPeriod.openYear}-${String(bookPeriod.openMonth).padStart(2, '0')}-${String(bookPeriod.openDay).padStart(2, '0')}`;
    const closeFilePart = `${bookPeriod.closeYear}-${String(bookPeriod.closeMonth).padStart(2, '0')}-${String(bookPeriod.closeDay).padStart(2, '0')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Rekap_Kehadiran_Petugas_${openFilePart}_sd_${closeFilePart}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-full mx-auto">
      {/* Toast Notification */}
      {notificationMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-600" />
            Data Petugas & Presensi Kehadiran
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar petugas kebersihan, penugasan shift kerja, dan rekap kehadiran periode{' '}
            <strong className="text-slate-700">
              {openLabel} s/d {closeLabel}
            </strong>{' '}
            ({periodDates.length} Hari).{' '}
            <strong className="text-purple-700 font-semibold">Khusus Lembur (L) dihitung 2x hari kerja.</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Export Buttons */}
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-2xs"
            title="Download PDF Rekap Presensi"
          >
            <Download className="w-3.5 h-3.5 text-rose-600" />
            <span>PDF</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-2xs"
            title="Download Excel CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel</span>
          </button>

          {/* Add Cleaner Button */}
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Petugas</span>
          </button>
        </div>
      </div>

      {/* Pengaturan Periode Buka Buku & Tutup Buku */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-600 shrink-0" />
            <div>
              <h3 className="text-xs font-bold text-slate-900">
                Pengaturan Periode Buka Buku & Tutup Buku
              </h3>
              <p className="text-[11px] text-slate-500">
                Atur tanggal, bulan, dan tahun mulai (Buka Buku) serta berakhir (Tutup Buku) presensi petugas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-sky-800 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-lg">
              {isPeriodInvalidOrder ? 'Rentang Tidak Valid' : `${periodDates.length} Hari Terjadwal`}
            </span>
            <button
              type="button"
              onClick={() => updateBookPeriod(() => getDefaultBookPeriod())}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer"
              title="Kembalikan ke tanggal 1 s/d akhir bulan berjalan"
            >
              Bulan Ini
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Buka Buku */}
          <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900">
                Buka Buku (Tanggal Mulai)
              </span>
              <span className="text-[11px] font-semibold text-emerald-700">{openLabel}</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                  Tanggal
                </label>
                <select
                  aria-label="Tanggal Buka Buku"
                  value={bookPeriod.openDay}
                  onChange={(e) =>
                    updateBookPeriod((prev) => ({ ...prev, openDay: Number(e.target.value) }))
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                >
                  {Array.from({ length: openMonthMaxDays }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {String(d).padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                  Bulan
                </label>
                <select
                  aria-label="Bulan Buka Buku"
                  value={bookPeriod.openMonth}
                  onChange={(e) =>
                    updateBookPeriod((prev) => ({ ...prev, openMonth: Number(e.target.value) }))
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                  Tahun
                </label>
                <select
                  aria-label="Tahun Buka Buku"
                  value={bookPeriod.openYear}
                  onChange={(e) =>
                    updateBookPeriod((prev) => ({ ...prev, openYear: Number(e.target.value) }))
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tutup Buku */}
          <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900">
                Tutup Buku (Tanggal Akhir)
              </span>
              <span className="text-[11px] font-semibold text-amber-700">{closeLabel}</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                  Tanggal
                </label>
                <select
                  aria-label="Tanggal Tutup Buku"
                  value={bookPeriod.closeDay}
                  onChange={(e) =>
                    updateBookPeriod((prev) => ({ ...prev, closeDay: Number(e.target.value) }))
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-amber-200 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
                >
                  {Array.from({ length: closeMonthMaxDays }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {String(d).padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                  Bulan
                </label>
                <select
                  aria-label="Bulan Tutup Buku"
                  value={bookPeriod.closeMonth}
                  onChange={(e) =>
                    updateBookPeriod((prev) => ({ ...prev, closeMonth: Number(e.target.value) }))
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-amber-200 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                  Tahun
                </label>
                <select
                  aria-label="Tahun Tutup Buku"
                  value={bookPeriod.closeYear}
                  onChange={(e) =>
                    updateBookPeriod((prev) => ({ ...prev, closeYear: Number(e.target.value) }))
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-amber-200 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {isPeriodInvalidOrder && (
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>
              Tanggal <strong>Tutup Buku</strong> ({closeLabel}) harus sama dengan atau setelah tanggal{' '}
              <strong>Buka Buku</strong> ({openLabel}).
            </span>
          </div>
        )}

        {isPeriodTruncated && (
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0 text-amber-600" />
            <span>
              Rentang terpilih ({periodTotalRawDays} hari) melebihi batas tampilan 62 hari. Menampilkan 62 hari pertama dari tanggal Buka Buku.
            </span>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500">Total Petugas</span>
            <p className="text-xl font-black text-slate-900 mt-0.5 font-heading">
              {overallStats.cleanerCount} Orang
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500">Total Hari Hadir (H)</span>
            <p className="text-xl font-black text-emerald-600 mt-0.5 font-heading">
              {overallStats.totalHadir} Hari
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500">Lembur (L) [2x Bobot]</span>
            <p className="text-xl font-black text-purple-700 mt-0.5 font-heading">
              {overallStats.totalLembur} Hari ({overallStats.totalLembur * 2}x)
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50 border border-sky-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-sky-800">Total Akumulasi Hari Kerja</span>
            <p className="text-xl font-black text-indigo-900 mt-0.5 font-heading">
              {overallStats.totalWorkDays} Hari
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
            H+2L
          </div>
        </div>
      </div>

      {/* Legend & Instructions Bar */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-sky-600 shrink-0" />
            <span className="font-bold text-slate-800">Petunjuk Kode Kehadiran:</span>
            <span className="text-slate-500 text-[11px]">
              (Klik pada kotak tanggal untuk mengganti status kehadiran)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {ATTENDANCE_STATUS_LIST.map((item) => (
              <div
                key={item.code}
                className={`px-2 py-0.5 rounded-lg border text-[11px] flex items-center gap-1.5 ${item.badgeClass}`}
                title={item.description}
              >
                <span className="font-black">[{item.code}]</span>
                <span>{item.label}</span>
                <span className="text-[10px] opacity-80">({item.weightText})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama petugas..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedShiftFilter}
              onChange={(e) => setSelectedShiftFilter(e.target.value)}
              className="text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Shift</option>
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          {/* Toggle View: Mobile Cards vs Matrix Table */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs shadow-inner">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                viewMode === 'cards'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Kartu Petugas</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                viewMode === 'matrix'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Matriks ({periodDates.length} Hari)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1. VIEW MODE: KARTU PETUGAS (OPTIMAL UNTUK LAYAR PONSEL)      */}
      {/* ============================================================ */}
      {viewMode === 'cards' && (
        <div className="space-y-3">
          {filteredCleaners.length === 0 ? (
            <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl text-slate-400">
              Tidak ada data petugas yang cocok dengan pencarian atau filter.
            </div>
          ) : (
            filteredCleaners.map((cleaner) => {
              const {
                hadirCount,
                lemburCount,
                izinCount,
                sakitCount,
                alpaCount,
                totalWorkingDays,
              } = calculateWorkingDaysForPeriod(
                cleaner.attendanceByMonth,
                cleaner.attendance,
                periodDates
              );

              const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
              const quickDateItem =
                periodDates.find((d) => d.isoDate === todayIso) || periodDates[0];
              const todayStatus = quickDateItem
                ? getCleanerAttendanceStatus(cleaner.attendanceByMonth, cleaner.attendance, quickDateItem)
                : '-';
              const isCalendarExpanded = expandedCleanerCalendar === cleaner.id;

              return (
                <div
                  key={cleaner.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3 transition-all"
                >
                  {/* Cleaner Header Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center font-bold text-xs shadow-2xs">
                          <User className="w-5 h-5 text-slate-500" />
                        </div>
                        <span
                          className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                            cleaner.isClockedIn ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                          title={cleaner.isClockedIn ? 'Clock In' : 'Belum Clock In'}
                        />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h4 className="text-sm font-bold text-slate-900">{cleaner.name}</h4>
                          <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                            {resolveShiftForCleaner(cleaner, shifts).name}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>NIK: {cleaner.nik || '-'}</span>
                          {cleaner.phone && (
                            <a
                              href={`tel:${cleaner.phone}`}
                              className="text-sky-600 hover:underline flex items-center gap-0.5"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{cleaner.phone}</span>
                            </a>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(cleaner)}
                        className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                        title="Edit Petugas"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteCleanerId(cleaner.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus Petugas"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Plotingan Lokasi Area Kerja */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="font-semibold text-slate-700 truncate">
                        Plotingan: {cleaner.workPlotting || 'Lobby Utama & Area Publik'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenPlottingModal(cleaner)}
                      className="shrink-0 text-[11px] font-bold text-sky-600 hover:text-sky-700 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-2xs"
                    >
                      Atur Plotingan
                    </button>
                  </div>

                  {/* Today / Period Date Quick Tapper (Touch Friendly) */}
                  {quickDateItem && (
                    <div className="p-3 rounded-xl bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-sky-900 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-sky-600" />
                          <span>
                            Presensi Cepat (Tgl {quickDateItem.day} {MONTH_NAMES[quickDateItem.month - 1]} {quickDateItem.year}):
                          </span>
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-black ${
                            todayStatus === 'H'
                              ? 'bg-emerald-600 text-white'
                              : todayStatus === 'L'
                              ? 'bg-purple-600 text-white'
                              : todayStatus === 'I'
                              ? 'bg-sky-600 text-white'
                              : todayStatus === 'S'
                              ? 'bg-amber-600 text-white'
                              : todayStatus === 'A'
                              ? 'bg-rose-600 text-white'
                              : 'bg-slate-300 text-slate-700'
                          }`}
                        >
                          Status: [{todayStatus}]
                        </span>
                      </div>

                      {/* Touch Buttons */}
                      <div className="grid grid-cols-6 gap-1.5">
                        {(['H', 'L', 'I', 'S', 'A', '-'] as AttendanceStatusCode[]).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() =>
                              updateCleanerAttendance(
                                cleaner.id,
                                quickDateItem.day,
                                st,
                                quickDateItem.monthKey
                              )
                            }
                            className={`h-9 rounded-lg text-xs font-black transition-all flex items-center justify-center ${
                              todayStatus === st
                                ? st === 'H'
                                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-300 shadow-xs'
                                  : st === 'L'
                                  ? 'bg-purple-600 text-white ring-2 ring-purple-300 shadow-xs'
                                  : st === 'I'
                                  ? 'bg-sky-600 text-white ring-2 ring-sky-300 shadow-xs'
                                  : st === 'S'
                                  ? 'bg-amber-600 text-white ring-2 ring-amber-300 shadow-xs'
                                  : st === 'A'
                                  ? 'bg-rose-600 text-white ring-2 ring-rose-300 shadow-xs'
                                  : 'bg-slate-600 text-white ring-2 ring-slate-300 shadow-xs'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {st === 'L' ? 'L (2x)' : st}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Monthly Summary Badges */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-center text-xs">
                    <div className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
                      <span className="text-[10px] text-emerald-700 font-bold block">Hadir</span>
                      <span className="font-black text-emerald-900">{hadirCount}</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-purple-50 border border-purple-200">
                      <span className="text-[10px] text-purple-700 font-bold block">Lembur (2x)</span>
                      <span className="font-black text-purple-900">{lemburCount}</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-sky-50 border border-sky-200">
                      <span className="text-[10px] text-sky-700 font-bold block">Izin</span>
                      <span className="font-black text-sky-900">{izinCount}</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-amber-50 border border-amber-200">
                      <span className="text-[10px] text-amber-700 font-bold block">Sakit</span>
                      <span className="font-black text-amber-900">{sakitCount}</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-rose-50 border border-rose-200">
                      <span className="text-[10px] text-rose-700 font-bold block">Alpa</span>
                      <span className="font-black text-rose-900">{alpaCount}</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-indigo-50 border border-indigo-200">
                      <span className="text-[10px] text-indigo-700 font-bold block">Total Kerja</span>
                      <span className="font-black text-indigo-950">{totalWorkingDays} H</span>
                    </div>
                  </div>

                  {/* Expandable Period Days Matrix for this Cleaner */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedCleanerCalendar(isCalendarExpanded ? null : cleaner.id)
                      }
                      className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-sky-600" />
                        <span>Riwayat Presensi Periode ({periodDates.length} Hari)</span>
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-500">
                          {isCalendarExpanded ? 'Tutup' : 'Buka Kalender'}
                        </span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                            isCalendarExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </button>

                    {isCalendarExpanded && (
                      <div className="mt-2 p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="text-[11px] text-slate-500">
                            Ketuk tanggal untuk mengganti status kehadiran:
                          </p>
                          <button
                            type="button"
                            onClick={() => handleBatchFillWeekdays(cleaner.id)}
                            className="px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[10px] font-bold text-emerald-700 cursor-pointer"
                          >
                            Isi Hari Kerja (H)
                          </button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center">
                          {periodDates.map((item) => {
                            const st = getCleanerAttendanceStatus(
                              cleaner.attendanceByMonth,
                              cleaner.attendance,
                              item
                            );
                            return (
                              <button
                                key={item.isoDate}
                                type="button"
                                onClick={() => handleCellClick(cleaner, item)}
                                title={`${item.day} ${MONTH_NAMES[item.month - 1]} ${item.year}`}
                                className={`p-1.5 rounded-lg border text-center transition-all ${
                                  st === 'H'
                                    ? 'bg-emerald-100 border-emerald-300 text-emerald-900 font-black'
                                    : st === 'L'
                                    ? 'bg-purple-100 border-purple-300 text-purple-900 font-black'
                                    : st === 'I'
                                    ? 'bg-sky-100 border-sky-300 text-sky-900 font-black'
                                    : st === 'S'
                                    ? 'bg-amber-100 border-amber-300 text-amber-900 font-black'
                                    : st === 'A'
                                    ? 'bg-rose-100 border-rose-300 text-rose-900 font-black'
                                    : item.isWeekend
                                    ? 'bg-rose-50/60 border-rose-200/70 text-slate-400'
                                    : 'bg-white border-slate-200 text-slate-400'
                                }`}
                              >
                                <span className="text-[9px] text-slate-500 block leading-none">
                                  {item.day} {item.monthShort}
                                </span>
                                <span className="text-xs font-black block mt-0.5">{st}</span>
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
      {/* 2. VIEW MODE: TABEL MATRIKS PERIODE BUKA - TUTUP BUKU        */}
      {/* ============================================================ */}
      {viewMode === 'matrix' && (
        <div className="space-y-3">
          {/* Mobile swipe helper */}
          <div className="md:hidden flex items-center justify-between gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 shadow-2xs">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-[11px] leading-tight">
                Tabel lebar {periodDates.length} hari: Geser ke samping, atau gunakan <strong>Kartu Petugas</strong> untuk tampilan ramah layar ponsel.
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

          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                <th className="p-2.5 text-center w-8 border-r border-slate-200 sticky left-0 bg-slate-100 z-10">
                  No
                </th>
                <th className="p-2.5 min-w-[170px] border-r border-slate-200 sticky left-8 bg-slate-100 z-10">
                  Nama Petugas
                </th>
                <th className="p-2.5 min-w-[140px] border-r border-slate-200">
                  Shift
                </th>

                {/* Period Dates: Buka Buku -> Tutup Buku */}
                {periodDates.map((item) => (
                  <th
                    key={item.isoDate}
                    className={`p-1 text-center w-8 border-r border-slate-200 ${
                      item.isWeekend ? 'bg-rose-50 text-rose-700' : 'bg-slate-100'
                    }`}
                    title={`Tanggal ${item.day} ${MONTH_NAMES[item.month - 1]} ${item.year}`}
                  >
                    <span className="block leading-tight">{item.day}</span>
                    <span className="block text-[9px] font-medium opacity-75 leading-none mt-0.5">
                      {item.monthShort}
                    </span>
                  </th>
                ))}

                {/* Recapitulation Headers */}
                <th
                  className="p-1.5 text-center w-9 bg-emerald-50 text-emerald-800 border-r border-emerald-200"
                  title="Total Hari Hadir (H)"
                >
                  H
                </th>
                <th
                  className="p-1.5 text-center w-9 bg-sky-50 text-sky-800 border-r border-sky-200"
                  title="Total Izin (I)"
                >
                  I
                </th>
                <th
                  className="p-1.5 text-center w-9 bg-amber-50 text-amber-800 border-r border-amber-200"
                  title="Total Sakit (S)"
                >
                  S
                </th>
                <th
                  className="p-1.5 text-center w-9 bg-rose-50 text-rose-800 border-r border-rose-200"
                  title="Total Alpa (A)"
                >
                  A
                </th>
                <th
                  className="p-1.5 text-center w-12 bg-purple-50 text-purple-900 border-r border-purple-200 font-black"
                  title="Total Lembur (L) - Dihitung 2x!"
                >
                  L (2x)
                </th>
                <th
                  className="p-2 text-center min-w-[110px] bg-indigo-50 text-indigo-900 font-black"
                  title="Total Hari Kerja = H + (L × 2)"
                >
                  Total Hari Kerja
                </th>
                <th className="p-2 text-center w-16 text-slate-500">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredCleaners.length === 0 ? (
                <tr>
                  <td colSpan={periodDates.length + 10} className="p-8 text-center text-slate-400">
                    Tidak ada data petugas yang cocok dengan pencarian atau filter.
                  </td>
                </tr>
              ) : (
                filteredCleaners.map((cleaner, index) => {
                  const {
                    hadirCount,
                    lemburCount,
                    izinCount,
                    sakitCount,
                    alpaCount,
                    totalWorkingDays,
                  } = calculateWorkingDaysForPeriod(
                    cleaner.attendanceByMonth,
                    cleaner.attendance,
                    periodDates
                  );

                  const shiftObj = shifts.find((s) => s.id === cleaner.shiftId);

                  return (
                    <tr key={cleaner.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Row number */}
                      <td className="p-2 text-center text-slate-400 font-medium border-r border-slate-100 sticky left-0 bg-white z-10">
                        {index + 1}
                      </td>

                      {/* Cleaner Name & Work Plotting */}
                      <td className="p-2.5 font-bold text-slate-900 border-r border-slate-100 sticky left-8 bg-white z-10">
                        <div className="flex items-center gap-2">
                          <div className="min-w-0">
                            <span className="truncate block text-xs font-bold text-slate-900">{cleaner.name}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {cleaner.workPlotting ? (
                                <span className="text-[10px] text-sky-700 font-medium flex items-center gap-1 truncate max-w-[150px]" title={`Plotingan: ${cleaner.workPlotting}`}>
                                  <span className="text-sky-500 font-bold">📍</span>
                                  <span className="truncate">{cleaner.workPlotting}</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">Belum di-plot</span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenPlottingModal(cleaner)}
                                className="px-1.5 py-0.5 rounded bg-sky-50 hover:bg-sky-100 text-sky-700 text-[9px] font-bold border border-sky-200 shrink-0 transition-colors cursor-pointer"
                                title="Ganti alokasi plotingan tugas dari setting shift"
                              >
                                Ganti
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Shift Badge */}
                      <td className="p-2.5 border-r border-slate-100">
                        {(() => {
                          const resolvedShift = resolveShiftForCleaner(cleaner, shifts);
                          return (
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: shiftObj?.color || resolvedShift.color || '#0284c7' }}
                              />
                              <span className="font-semibold text-slate-800 text-[11px] truncate">
                                {resolvedShift.name}
                              </span>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Period Date Cells (Buka Buku -> Tutup Buku) */}
                      {periodDates.map((item) => {
                        const status = getCleanerAttendanceStatus(
                          cleaner.attendanceByMonth,
                          cleaner.attendance,
                          item
                        );

                        let cellStyle = 'bg-slate-50/60 text-slate-400 hover:bg-slate-100';
                        if (status === 'H') {
                          cellStyle = 'bg-emerald-100 text-emerald-900 font-bold border border-emerald-300';
                        } else if (status === 'L') {
                          cellStyle = 'bg-purple-200 text-purple-950 font-black border-2 border-purple-400 shadow-2xs';
                        } else if (status === 'I') {
                          cellStyle = 'bg-sky-100 text-sky-900 font-bold border border-sky-300';
                        } else if (status === 'S') {
                          cellStyle = 'bg-amber-100 text-amber-900 font-bold border border-amber-300';
                        } else if (status === 'A') {
                          cellStyle = 'bg-rose-100 text-rose-900 font-black border border-rose-300';
                        }

                        return (
                          <td
                            key={item.isoDate}
                            onClick={() => handleCellClick(cleaner, item)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setActiveCellPicker({ cleanerId: cleaner.id, dateItem: item });
                            }}
                            className="p-0.5 text-center border-r border-slate-100 cursor-pointer select-none"
                            title={`Tgl ${item.day} ${MONTH_NAMES[item.month - 1]} ${item.year}: Status ${status} (Klik untuk rotasi status H -> L -> I -> S -> A -> -)`}
                          >
                            <div
                              className={`w-6 h-6 mx-auto rounded-md flex items-center justify-center text-[11px] transition-all hover:scale-110 active:scale-95 ${cellStyle}`}
                            >
                              {status === 'L' ? (
                                <span className="relative">
                                  L
                                  <span className="absolute -top-1 -right-1 text-[8px] text-purple-600 font-black">
                                    ★
                                  </span>
                                </span>
                              ) : (
                                status
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* Total Hadir */}
                      <td className="p-2 text-center font-bold text-emerald-800 bg-emerald-50/60 border-r border-emerald-100">
                        {hadirCount}
                      </td>

                      {/* Total Izin */}
                      <td className="p-2 text-center font-medium text-sky-800 bg-sky-50/60 border-r border-sky-100">
                        {izinCount}
                      </td>

                      {/* Total Sakit */}
                      <td className="p-2 text-center font-medium text-amber-800 bg-amber-50/60 border-r border-amber-100">
                        {sakitCount}
                      </td>

                      {/* Total Alpa */}
                      <td className="p-2 text-center font-bold text-rose-800 bg-rose-50/60 border-r border-rose-100">
                        {alpaCount}
                      </td>

                      {/* Total Lembur (Counts 2x) */}
                      <td className="p-2 text-center font-black text-purple-900 bg-purple-100/70 border-r border-purple-200">
                        <span className="flex items-center justify-center gap-0.5">
                          {lemburCount}
                          <span className="text-[9px] text-purple-600 font-bold">(x2)</span>
                        </span>
                      </td>

                      {/* TOTAL HARI KERJA (H + 2L) */}
                      <td className="p-2 text-center bg-indigo-50/80 font-black text-indigo-950 border-r border-indigo-100">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-600 text-white text-xs shadow-2xs">
                          <span>{totalWorkingDays} Hari</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(cleaner)}
                            className="p-1 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                            title="Edit Petugas & Shift"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteCleanerId(cleaner.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Hapus Petugas"
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

      {/* Popover / Quick Status Selector when right-clicked or selected */}
      {activeCellPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-2xl p-4 shadow-2xl border border-slate-200 max-w-xs w-full text-center space-y-3 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-xs font-bold text-slate-900">
                Pilih Status Tanggal {activeCellPicker.dateItem.day}{' '}
                {MONTH_NAMES[activeCellPicker.dateItem.month - 1]} {activeCellPicker.dateItem.year}:
              </h4>
              <button
                onClick={() => setActiveCellPicker(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {ATTENDANCE_STATUS_LIST.map((item) => (
                <button
                  key={item.code}
                  onClick={() =>
                    handleSelectStatus(
                      activeCellPicker.cleanerId,
                      activeCellPicker.dateItem,
                      item.code
                    )
                  }
                  className={`p-2 rounded-xl border text-xs flex flex-col items-center justify-center gap-0.5 hover:shadow-xs transition-all ${item.badgeClass}`}
                >
                  <span className="text-sm font-black">[{item.code}]</span>
                  <span className="font-semibold text-[11px]">{item.label}</span>
                  <span className="text-[9px] opacity-75">{item.weightText}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Petugas (Hanya Nama Petugas & Shift) */}
      {showCleanerModal && (
        <div
          id="cleaner-modal-backdrop"
          onClick={() => setShowCleanerModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
        >
          <div
            id="cleaner-modal-card"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 max-h-[92dvh] overflow-y-auto overscroll-contain my-auto"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 gap-2">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                  {editingCleanerId ? 'Edit Data Petugas & Shift' : 'Tambah Petugas Baru'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  Tentukan nama petugas dan shift operasional yang ditugaskan
                </p>
              </div>
              <button
                id="close-cleaner-modal-btn"
                type="button"
                onClick={() => setShowCleanerModal(false)}
                aria-label="Tutup Form Petugas"
                className="p-2 rounded-full text-slate-400 hover:text-slate-700 active:text-slate-900 hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCleaner} className="space-y-4 pt-4">
              {/* Nama Petugas */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Petugas <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={cleanerFormName}
                  onChange={(e) => setCleanerFormName(e.target.value)}
                  placeholder="Masukkan nama lengkap petugas"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              {/* Shift */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-sky-600" />
                  Shift Operasional <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={cleanerFormShiftId}
                  onChange={(e) => setCleanerFormShiftId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none bg-slate-50/50 cursor-pointer"
                >
                  {shifts.map((shift) => (
                    <option key={shift.id} value={shift.id}>
                      {shift.name} ({shift.startTime} - {shift.endTime} WIB) • {shift.durationText || '8 Jam'}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Pilihan shift dapat diatur secara manual di menu "Shift".
                </span>
              </div>

              {/* Plotingan Lokasi Kerja Manual & Alokasi dari Shift */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                    <span className="text-sky-600">📍</span>
                    Alokasi Plotingan Tugas & Area:
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Berdasarkan Uraian Tugas Shift terpilih
                  </span>
                </div>

                {/* Chips from selected shift */}
                {(() => {
                  const selShift = shifts.find((s) => s.id === cleanerFormShiftId);
                  const allocs = selShift?.plottingAllocations || [];
                  if (allocs.length === 0) return null;

                  return (
                    <div className="mb-2 p-2.5 rounded-xl bg-sky-50/60 border border-sky-100 space-y-1.5">
                      <span className="text-[10px] font-bold text-sky-900 block">
                        Pilih Tugas dari {selShift?.name}:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {allocs.map((a) => {
                          const isAlreadyIn = cleanerFormPlotting.toLowerCase().includes(a.areaName.toLowerCase());
                          return (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => {
                                if (isAlreadyIn) {
                                  // remove
                                  const parts = cleanerFormPlotting.split(' • ').filter(p => !p.toLowerCase().includes(a.areaName.toLowerCase()));
                                  setCleanerFormPlotting(parts.join(' • '));
                                } else {
                                  const addition = `${a.areaName}${a.taskDescription ? ` (${a.taskDescription})` : ''}`;
                                  setCleanerFormPlotting(cleanerFormPlotting ? `${cleanerFormPlotting} • ${addition}` : addition);
                                }
                              }}
                              className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                                isAlreadyIn
                                  ? 'bg-sky-600 text-white border-sky-600'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-sky-300 hover:bg-sky-50'
                              }`}
                            >
                              <span>{isAlreadyIn ? '✓' : '+'}</span>
                              <span>{a.areaName}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                <input
                  type="text"
                  value={cleanerFormPlotting}
                  onChange={(e) => setCleanerFormPlotting(e.target.value)}
                  placeholder="Contoh: Toilet Lantai 1 & Lobby Utama..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Bisa memilih lebih dari satu tugas dari daftar di atas atau ketik manual.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  id="cancel-cleaner-modal-btn"
                  type="button"
                  onClick={() => setShowCleanerModal(false)}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-100 active:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl min-h-[44px] flex items-center justify-center cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs min-h-[44px] flex items-center justify-center cursor-pointer transition-colors"
                >
                  {editingCleanerId ? 'Simpan Perubahan' : 'Tambahkan Petugas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCleanerId && (
        <div
          id="delete-cleaner-modal-backdrop"
          onClick={() => setDeleteCleanerId(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
        >
          <div
            id="delete-cleaner-modal-card"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl sm:rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 text-center space-y-3.5 my-auto animate-in zoom-in-95 duration-150"
          >
            <div className="w-11 h-11 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm sm:text-base">Hapus Data Petugas?</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Petugas ini dan rekap kehadirannya akan dihapus dari sistem. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-center gap-2 pt-2">
              <button
                id="cancel-delete-cleaner-btn"
                type="button"
                onClick={() => setDeleteCleanerId(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 active:bg-slate-200 min-h-[44px] flex items-center justify-center cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 text-xs font-bold text-white hover:bg-rose-700 active:bg-rose-800 shadow-xs min-h-[44px] flex items-center justify-center cursor-pointer transition-colors"
              >
                Ya, Hapus Petugas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL GANTI PLOTINGAN PETUGAS                                */}
      {/* ============================================================ */}
      {plottingCleaner && (() => {
        const activeShift = shifts.find((s) => s.id === plottingSelectedShiftId) || shifts[0];
        const shiftAllocations = activeShift?.plottingAllocations || [];

        return (
          <div
            id="plotting-modal-backdrop"
            onClick={() => setPlottingCleaner(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
          >
            <div
              id="plotting-modal-card"
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 max-h-[92dvh] overflow-y-auto overscroll-contain my-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      Ganti Alokasi Plotingan Tugas
                    </h3>
                    <p className="text-xs text-slate-500 truncate">
                      Petugas: <span className="font-bold text-slate-800">{plottingCleaner.name}</span>
                    </p>
                  </div>
                </div>

                <button
                  id="close-plotting-modal-btn"
                  type="button"
                  onClick={() => setPlottingCleaner(null)}
                  aria-label="Tutup Plotingan Tugas"
                  className="p-2 rounded-full text-slate-400 hover:text-slate-700 active:text-slate-900 hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveWorkPlotting} className="space-y-4 pt-4 text-xs">
                {/* Shift Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-sky-600" />
                    Shift Operasional Petugas:
                  </label>
                  <select
                    value={plottingSelectedShiftId}
                    onChange={(e) => {
                      const newShiftId = e.target.value;
                      setPlottingSelectedShiftId(newShiftId);
                      setSelectedAllocationIds([]);
                      setManualPlottingText('');
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none bg-slate-50/50 cursor-pointer"
                  >
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.startTime} - {s.endTime} WIB)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Plotting Allocations from Uraian Tugas & Deskripsi Shift */}
                <div className="p-3.5 rounded-2xl bg-sky-50/50 border border-sky-100 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-sky-600" />
                      <h4 className="text-xs font-bold text-slate-900">
                        Lokasi & Tugas pada {activeShift?.name}:
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-extrabold">
                        {selectedAllocationIds.length} Dipilih
                      </span>
                    </div>

                    {shiftAllocations.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={handleSelectAllPlottingAllocations}
                          className="px-2 py-0.5 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-800 font-bold transition-colors cursor-pointer"
                        >
                          Pilih Semua
                        </button>
                        <button
                          type="button"
                          onClick={handleClearPlottingAllocations}
                          className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold transition-colors cursor-pointer"
                        >
                          Reset
                        </button>
                      </div>
                    )}
                  </div>

                  {shiftAllocations.length === 0 ? (
                    <div className="p-4 rounded-xl bg-white border border-dashed border-sky-200 text-center space-y-1">
                      <p className="text-xs text-slate-600 font-semibold">
                        Shift ini belum memiliki alokasi plotting pada pengaturan shift.
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Anda dapat menambahkannya di menu "Shift" &gt; "Edit Pengaturan Shift", atau ketik manual di bawah.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 max-h-52 overflow-y-auto pr-1">
                      {shiftAllocations.map((alloc) => {
                        const isSelected = selectedAllocationIds.includes(alloc.id);

                        return (
                          <div
                            key={alloc.id}
                            onClick={() => handleTogglePlottingAllocation(alloc.id)}
                            className={`p-3 rounded-xl border text-xs transition-all cursor-pointer flex items-start gap-2.5 ${
                              isSelected
                                ? 'bg-white border-sky-500 shadow-xs ring-1 ring-sky-400/40'
                                : 'bg-white/80 border-slate-200 hover:border-sky-300 hover:bg-white'
                            }`}
                          >
                            <div className="pt-0.5 shrink-0">
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-sky-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300 hover:text-sky-400" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className={`font-bold ${isSelected ? 'text-sky-950 font-extrabold' : 'text-slate-800'}`}>
                                  {alloc.areaName}
                                </span>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {alloc.personnelQuota && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                                      Target: {alloc.personnelQuota} Staf
                                    </span>
                                  )}
                                  {alloc.priority && (
                                    <span
                                      className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                                        alloc.priority === 'intensif'
                                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                          : alloc.priority === 'periodic'
                                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      }`}
                                    >
                                      {alloc.priority}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                                {alloc.taskDescription || 'Pembersihan rutin sesuai SOP kebersihan.'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Final Plotingan Textarea */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-800">
                      Rincian Plotingan Akhir yang Disimpan: <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Dapat diedit atau memilih lebih dari satu tugas
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    required
                    value={manualPlottingText}
                    onChange={(e) => setManualPlottingText(e.target.value)}
                    placeholder="Pilih lokasi di atas atau ketik manual..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium leading-relaxed"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Data ini langsung disinkronkan ke Presensi Interaktif, Roster Petugas & Shift.
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    id="cancel-plotting-modal-btn"
                    type="button"
                    onClick={() => setPlottingCleaner(null)}
                    className="px-5 py-2.5 border border-slate-200 hover:bg-slate-100 active:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl min-h-[44px] flex items-center justify-center cursor-pointer transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    Simpan Plotingan
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
