import React, { useState, useMemo } from 'react';
import {
  Clock,
  Users,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Sparkles,
  X,
  Timer,
  Calendar,
  AlertCircle,
  ShieldCheck,
  UserCheck,
  MapPin,
  UserPlus,
  ArrowRightLeft,
  TrendingUp,
  Award,
  Check,
  ChevronDown,
  Info,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import { Shift, Cleaner, AttendanceStatusCode } from '../../types';
import { calculateShiftDuration } from '../../utils/shiftUtils';

interface ShiftFormState {
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  color: string;
  personnelCount: number;
  description: string;
}

const SHIFT_PRESETS: Array<{
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  color: string;
  description: string;
}> = [
  {
    name: 'Shift 1 ( satu )',
    code: 'S1',
    startTime: '07:00',
    endTime: '15:00',
    color: '#0284c7',
    description: 'Pembersihan awal harian, dusting meja kerja, sanitasi toilet pagi, lobby utama.',
  },
  {
    name: 'Shift 2 ( Midle )',
    code: 'S2',
    startTime: '11:00',
    endTime: '19:00',
    color: '#0d9488',
    description: 'Shift transisi & backup jam sibuk siang ke sore, sanitasi area publik intensif.',
  },
  {
    name: 'Shift 3 ( Siang )',
    code: 'S3',
    startTime: '15:00',
    endTime: '23:00',
    color: '#d97706',
    description: 'Maintenance kebersihan siang, pembersihan pantry pasca makan siang, restock toilet sore.',
  },
  {
    name: 'Shift 4 ( Malam )',
    code: 'S4',
    startTime: '23:00',
    endTime: '07:00',
    color: '#7c3aed',
    description: 'Deep cleaning, floor polishing/scrubbing, pencucian kaca luar, carpet vacuuming malam.',
  },
  {
    name: 'All Shift',
    code: 'AS',
    startTime: '07:00',
    endTime: '19:00',
    color: '#4f46e5',
    description: 'Shift operasional penuh / standby multi-tugas & pengawasan rotasi gedung seharian.',
  },
];

const COLOR_PALETTE = [
  { label: 'Sky Blue', hex: '#0284c7' },
  { label: 'Teal', hex: '#0d9488' },
  { label: 'Amber', hex: '#d97706' },
  { label: 'Purple', hex: '#7c3aed' },
  { label: 'Indigo', hex: '#4f46e5' },
  { label: 'Emerald', hex: '#059669' },
  { label: 'Rose', hex: '#e11d48' },
  { label: 'Slate', hex: '#475569' },
];

const ATTENDANCE_STATUSES: Array<{
  code: AttendanceStatusCode;
  label: string;
  badgeClass: string;
  bgDot: string;
  description: string;
  isWorking: boolean;
}> = [
  {
    code: 'H',
    label: 'Hadir',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
    bgDot: 'bg-emerald-500',
    description: 'Hadir bertugas reguler',
    isWorking: true,
  },
  {
    code: 'L',
    label: 'Lembur',
    badgeClass: 'bg-purple-100 text-purple-900 border-purple-300 font-black ring-1 ring-purple-300',
    bgDot: 'bg-purple-600',
    description: 'Lembur ekstra (Dihitung 2x)',
    isWorking: true,
  },
  {
    code: 'I',
    label: 'Izin',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-300 font-semibold',
    bgDot: 'bg-sky-500',
    description: 'Izin berencana',
    isWorking: false,
  },
  {
    code: 'S',
    label: 'Sakit',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-semibold',
    bgDot: 'bg-amber-500',
    description: 'Sakit surat dokter / izin medis',
    isWorking: false,
  },
  {
    code: 'A',
    label: 'Alpa',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
    bgDot: 'bg-rose-500',
    description: 'Tidak hadir tanpa keterangan',
    isWorking: false,
  },
  {
    code: '-',
    label: 'Libur',
    badgeClass: 'bg-slate-100 text-slate-500 border-slate-200 font-normal',
    bgDot: 'bg-slate-400',
    description: 'Jadwal libur rotasi',
    isWorking: false,
  },
];

const QUICK_AREA_CHIPS = [
  'Lobby Utama & Receptionist',
  'Toilet Pria & Wanita Lt. 1',
  'Toilet Lt. 2 & Pantry Barat',
  'Pantry Lt. LG & Area Makan',
  'Ruang Rapat Eksekutif & Lift',
  'Koridor Timur & Tangga Darurat',
  'Musholla & Area Tempat Wudhu',
  'Area Parkiran & Drop-Off',
  'Standby / Roaming Darurat (Mid-Shift)',
];

export const ShiftView: React.FC = () => {
  const {
    shifts,
    cleaners,
    addShift,
    updateShift,
    deleteShift,
    updateCleaner,
    addCleaner,
    updateCleanerAttendance,
    activeProjectId,
  } = useCleaning();

  // Date and Monitoring Day
  const today = new Date();
  const currentDay = today.getDate(); // 1 - 31
  const currentMonth = today.getMonth(); // 0 - 11
  const currentYear = today.getFullYear();
  const periodKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

  const [monitoringDay, setMonitoringDay] = useState<number>(currentDay);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Cleaner Allocation Modal
  const [allocationTargetShiftId, setAllocationTargetShiftId] = useState<string | null>(null);
  const [allocationTab, setAllocationTab] = useState<'existing' | 'new'>('existing');
  const [newCleanerName, setNewCleanerName] = useState('');
  const [newCleanerNik, setNewCleanerNik] = useState('');
  const [newCleanerPlotting, setNewCleanerPlotting] = useState('');

  // Mid-shift Work Plotting Modal
  const [plottingCleaner, setPlottingCleaner] = useState<Cleaner | null>(null);
  const [manualPlottingText, setManualPlottingText] = useState('');
  const [plottingReason, setPlottingReason] = useState('');

  // Quick Attendance Dropdown
  const [activeAttendanceCleanerId, setActiveAttendanceCleanerId] = useState<string | null>(null);

  // Form State for Shift
  const [formData, setFormData] = useState<ShiftFormState>({
    name: '',
    code: '',
    startTime: '07:00',
    endTime: '15:00',
    color: '#0284c7',
    personnelCount: 4,
    description: '',
  });

  // Calculate live duration for the form
  const liveDuration = calculateShiftDuration(formData.startTime, formData.endTime);

  const handleOpenAddModal = () => {
    setEditingShiftId(null);
    setFormData({
      name: 'Shift 1 ( satu )',
      code: 'S1',
      startTime: '07:00',
      endTime: '15:00',
      color: '#0284c7',
      personnelCount: 4,
      description: 'Pembersihan awal harian dan pemeliharaan area publik.',
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (shift: Shift) => {
    setEditingShiftId(shift.id);
    setFormData({
      name: shift.name,
      code: shift.code,
      startTime: shift.startTime,
      endTime: shift.endTime,
      color: shift.color,
      personnelCount: shift.personnelCount,
      description: shift.description,
    });
    setShowModal(true);
  };

  const handleApplyPreset = (preset: typeof SHIFT_PRESETS[0]) => {
    setFormData((prev) => ({
      ...prev,
      name: preset.name,
      code: preset.code,
      startTime: preset.startTime,
      endTime: preset.endTime,
      color: preset.color,
      description: preset.description,
    }));
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.startTime || !formData.endTime) return;

    if (editingShiftId) {
      updateShift(editingShiftId, {
        name: formData.name.trim(),
        code: formData.code.trim() || 'S',
        startTime: formData.startTime,
        endTime: formData.endTime,
        color: formData.color,
        personnelCount: Number(formData.personnelCount) || 1,
        description: formData.description.trim(),
      });
      showToast(`Pengaturan ${formData.name.trim()} berhasil diperbarui.`);
    } else {
      addShift({
        name: formData.name.trim(),
        code: formData.code.trim() || 'S',
        startTime: formData.startTime,
        endTime: formData.endTime,
        color: formData.color,
        personnelCount: Number(formData.personnelCount) || 1,
        description: formData.description.trim(),
      });
      showToast(`Shift baru "${formData.name.trim()}" berhasil ditambahkan.`);
    }

    setShowModal(false);
    setEditingShiftId(null);
  };

  const handleDeleteShift = (id: string) => {
    deleteShift(id);
    setDeleteConfirmId(null);
    showToast('Shift berhasil dihapus.');
  };

  // Helper: Get Cleaner's Attendance status for the monitoring day
  const getCleanerStatus = (cleaner: Cleaner): AttendanceStatusCode => {
    const fromMonth = cleaner.attendanceByMonth?.[periodKey]?.[monitoringDay];
    if (fromMonth) return fromMonth;
    const fromAtt = cleaner.attendance?.[monitoringDay];
    if (fromAtt) return fromAtt;
    return cleaner.isClockedIn ? 'H' : '-';
  };

  // Action: Update Cleaner Attendance (Interaktivitas Presensi oleh Pengawas)
  const handleSetCleanerAttendance = (cleaner: Cleaner, newStatus: AttendanceStatusCode) => {
    updateCleanerAttendance(cleaner.id, monitoringDay, newStatus, periodKey);

    // Sync clock-in and active status
    const isNowWorking = newStatus === 'H' || newStatus === 'L';
    const nowTimeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    updateCleaner(cleaner.id, {
      isClockedIn: isNowWorking,
      status: isNowWorking ? 'active' : 'off',
      clockInTime: isNowWorking ? cleaner.clockInTime || nowTimeStr : undefined,
    });

    const statusObj = ATTENDANCE_STATUSES.find((s) => s.code === newStatus);
    showToast(`Presensi ${cleaner.name} diubah ke ${statusObj?.label || newStatus} (${newStatus}) oleh pengawas.`);
    setActiveAttendanceCleanerId(null);
  };

  // Action: Open Mid-Shift Work Plotting Modal
  const handleOpenPlottingModal = (cleaner: Cleaner) => {
    setPlottingCleaner(cleaner);
    setManualPlottingText(cleaner.workPlotting || '');
    setPlottingReason('');
  };

  // Action: Submit Mid-Shift Work Plotting
  const handleSaveWorkPlotting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plottingCleaner) return;

    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const finalLocation = manualPlottingText.trim() || 'Lobby & Koridor Utama';

    updateCleaner(plottingCleaner.id, {
      workPlotting: finalLocation,
      workPlottingUpdatedAt: nowTime,
    });

    showToast(`Plotingan lokasi ${plottingCleaner.name} berhasil diupdate ke "${finalLocation}" (${nowTime}).`);
    setPlottingCleaner(null);
  };

  // Action: Allocate Cleaner to Shift
  const handleOpenAllocateModal = (shiftId: string) => {
    setAllocationTargetShiftId(shiftId);
    setAllocationTab('existing');
    setNewCleanerName('');
    setNewCleanerNik(`CLN-${currentYear}-${Math.floor(100 + Math.random() * 900)}`);
    setNewCleanerPlotting('');
  };

  const handleAssignExistingCleaner = (cleanerId: string) => {
    if (!allocationTargetShiftId) return;
    const targetShift = shifts.find((s) => s.id === allocationTargetShiftId);
    if (!targetShift) return;

    updateCleaner(cleanerId, {
      shiftId: targetShift.id,
      shiftName: targetShift.name,
    });

    const cln = cleaners.find((c) => c.id === cleanerId);
    showToast(`${cln?.name || 'Petugas'} berhasil dialokasikan ke ${targetShift.name}.`);
    setAllocationTargetShiftId(null);
  };

  const handleCreateNewCleanerInShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCleanerName.trim() || !allocationTargetShiftId) return;
    const targetShift = shifts.find((s) => s.id === allocationTargetShiftId);
    if (!targetShift) return;

    // Create default attendance
    const defaultAtt: Record<number, AttendanceStatusCode> = {};
    for (let d = 1; d <= 31; d++) {
      const isWeekend = d % 7 === 0 || d % 7 === 6;
      defaultAtt[d] = isWeekend ? '-' : 'H';
    }

    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

    addCleaner({
      name: newCleanerName.trim(),
      nik: newCleanerNik.trim() || `CLN-${currentYear}-${Math.floor(100 + Math.random() * 900)}`,
      phone: '0812-3456-7890',
      shiftId: targetShift.id,
      shiftName: targetShift.name,
      photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      assignedAreas: ['area-1'],
      status: 'active',
      rating: 5.0,
      tasksCompletedToday: 0,
      totalTasksToday: 4,
      isClockedIn: true,
      clockInTime: nowTime,
      attendance: defaultAtt,
      attendanceByMonth: {
        [periodKey]: defaultAtt,
      },
      workPlotting: newCleanerPlotting.trim() || 'Lobby Utama & Area Publik',
      workPlottingUpdatedAt: nowTime,
    });

    showToast(`Petugas baru "${newCleanerName.trim()}" berhasil ditambahkan ke ${targetShift.name}.`);
    setAllocationTargetShiftId(null);
  };

  // Building-wide Daily Presensi & KPI Statistics
  const overallStats = useMemo(() => {
    let totalTargetQuota = 0;
    shifts.forEach((s) => {
      totalTargetQuota += s.personnelCount || 0;
    });

    let countH = 0;
    let countL = 0;
    let countI = 0;
    let countS = 0;
    let countA = 0;
    let countLibur = 0;

    cleaners.forEach((c) => {
      const st = getCleanerStatus(c);
      if (st === 'H') countH++;
      else if (st === 'L') countL++;
      else if (st === 'I') countI++;
      else if (st === 'S') countS++;
      else if (st === 'A') countA++;
      else countLibur++;
    });

    const totalWorkingPresent = countH + countL; // Lembur dihitung hadir
    const targetQuotaSafe = totalTargetQuota > 0 ? totalTargetQuota : cleaners.length || 1;
    const buildingKpiPercentage = Math.min(100, Math.round((totalWorkingPresent / targetQuotaSafe) * 100));

    return {
      totalTargetQuota,
      totalRegistered: cleaners.length,
      countH,
      countL,
      countI,
      countS,
      countA,
      countLibur,
      totalWorkingPresent,
      buildingKpiPercentage,
    };
  }, [shifts, cleaners, monitoringDay, periodKey]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white ml-2 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-sky-600" />
            Pengaturan Jadwal Kerja & Shift Personel
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola shift kerja manual, plotingan lokasi dinamis mid-shift, presensi interaktif pengawas, dan pemantauan kuota untuk skor KPI harian
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Day / Date selector */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] font-semibold text-slate-600">Tanggal:</span>
            <select
              value={monitoringDay}
              onChange={(e) => setMonitoringDay(Number(e.target.value))}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  Tgl {d} {d === currentDay ? '(Hari Ini)' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Tambah Shift Manual
          </button>
        </div>
      </div>

      {/* KPI & ATTENDANCE SUMMARY BANNER (Mendukung Score KPI Harian) */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white shadow-lg border border-slate-700/50 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-radial from-sky-500/10 to-transparent pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase bg-sky-500/20 text-sky-300 border border-sky-400/30">
                Pemantauan KPI Presensi Harian
              </span>
              <span className="text-xs text-slate-300 font-medium">
                Tgl {monitoringDay} / {periodKey}
              </span>
            </div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              Kesiapan Kuota & Kehadiran Operasional Gedung
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
              Data kuota dan kehadiran riil yang diperbarui oleh pengawas lokasi secara interaktif diakumulasikan sebagai penentu skor KPI harian kebersihan gedung.
            </p>
          </div>

          {/* KPI Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
            {/* Target Kuota */}
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10 text-center">
              <span className="text-[10px] font-medium text-slate-300 block uppercase">Target Kuota</span>
              <span className="text-lg font-black text-white mt-0.5 block">
                {overallStats.totalTargetQuota}
              </span>
              <span className="text-[10px] text-slate-300">Personel Shift</span>
            </div>

            {/* Hadir (H + L) */}
            <div className="p-3 rounded-2xl bg-emerald-500/20 backdrop-blur-xs border border-emerald-400/30 text-center">
              <span className="text-[10px] font-medium text-emerald-300 block uppercase">Hadir Riil (H+L)</span>
              <span className="text-lg font-black text-emerald-400 mt-0.5 block">
                {overallStats.totalWorkingPresent}
              </span>
              <span className="text-[10px] text-emerald-200">
                H: {overallStats.countH} | L: {overallStats.countL}
              </span>
            </div>

            {/* Tidak Hadir (I, S, A) */}
            <div className="p-3 rounded-2xl bg-amber-500/20 backdrop-blur-xs border border-amber-400/30 text-center">
              <span className="text-[10px] font-medium text-amber-300 block uppercase">Izin / Sakit / Alpa</span>
              <span className="text-lg font-black text-amber-300 mt-0.5 block">
                {overallStats.countI + overallStats.countS + overallStats.countA}
              </span>
              <span className="text-[10px] text-amber-200">
                I: {overallStats.countI} S: {overallStats.countS} A: {overallStats.countA}
              </span>
            </div>

            {/* Score KPI Harian */}
            <div className="p-3 rounded-2xl bg-sky-500/20 backdrop-blur-xs border border-sky-400/30 text-center">
              <span className="text-[10px] font-medium text-sky-300 block uppercase">Skor KPI Presensi</span>
              <span className="text-lg font-black text-sky-300 mt-0.5 block">
                {overallStats.buildingKpiPercentage}%
              </span>
              <span className="text-[10px] text-sky-200">
                {overallStats.buildingKpiPercentage >= 90 ? 'Optimal' : overallStats.buildingKpiPercentage >= 75 ? 'Cukup' : 'Kritis'}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-4 text-xs">
          <div className="flex-1">
            <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1">
              <span>Pencapaian Kuota Terhadap KPI Hari Ini</span>
              <span className="font-bold text-white">
                {overallStats.totalWorkingPresent} dari {overallStats.totalTargetQuota} Personel ({overallStats.buildingKpiPercentage}%)
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  overallStats.buildingKpiPercentage >= 90
                    ? 'bg-emerald-400'
                    : overallStats.buildingKpiPercentage >= 75
                    ? 'bg-sky-400'
                    : 'bg-amber-400'
                }`}
                style={{ width: `${Math.min(100, overallStats.buildingKpiPercentage)}%` }}
              />
            </div>
          </div>
          <span className="hidden sm:inline text-[11px] text-slate-300 shrink-0">
            {overallStats.buildingKpiPercentage >= 90
              ? '✨ Kuota shift terpenuhi maksimal'
              : '⚠️ Diperlukan rotasi / alokasi petugas cadangan'}
          </span>
        </div>
      </div>

      {/* Template Preset Buttons Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Template Shift Cepat:
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Klik template di bawah untuk otomatis mengisi form shift sesuai standar operasional
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {SHIFT_PRESETS.map((preset) => {
              const dur = calculateShiftDuration(preset.startTime, preset.endTime);
              return (
                <button
                  key={preset.code}
                  onClick={() => {
                    setEditingShiftId(null);
                    handleApplyPreset(preset);
                    setShowModal(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 hover:border-sky-400 hover:shadow-xs text-xs font-medium text-slate-700 flex items-center gap-1.5 transition-all group cursor-pointer"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: preset.color }}
                  />
                  <span className="font-semibold text-slate-800">{preset.name}</span>
                  <span className="text-[10px] text-sky-700 font-bold bg-sky-50 px-1.5 py-0.5 rounded-md">
                    {dur.text}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Shift Cards with Work Duration & Timing */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Timer className="w-4 h-4 text-sky-600" />
            Daftar Master Shift & Durasi Jam Kerja ({shifts.length} Shift)
          </h3>
          <span className="text-[11px] text-slate-400">
            Jam operasional dan durasi kerja diatur mandiri
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shifts.map((shift) => {
            const duration = calculateShiftDuration(shift.startTime, shift.endTime);
            const shiftCleaners = cleaners.filter((c) => c.shiftId === shift.id);

            return (
              <div
                key={shift.id}
                className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all group relative overflow-hidden"
              >
                {/* Top color bar */}
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: shift.color }}
                />

                <div>
                  {/* Title & Badge */}
                  <div className="flex items-start justify-between gap-2 pt-1">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: shift.color }}
                        />
                        <h4 className="font-bold text-slate-900 text-sm">{shift.name}</h4>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">
                        Kode: {shift.code}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(shift)}
                        className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Shift"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(shift.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Shift"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Operational Time Box */}
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <Clock className="w-4 h-4 text-sky-600" />
                      <span>{shift.startTime} - {shift.endTime} WIB</span>
                    </div>

                    {/* Calculated Work Duration Badge */}
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs">
                      <Timer className="w-3 h-3 text-emerald-600" />
                      <span>{duration.text}</span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-500 mt-2.5 leading-relaxed line-clamp-2">
                    {shift.description || 'Tidak ada deskripsi pekerjaan khusus.'}
                  </p>
                </div>

                {/* Footer stats */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>Petugas Terdaftar:</span>
                    <span className="font-bold text-slate-800">{shiftCleaners.length} Orang</span>
                  </div>

                  <span className="text-[11px] text-slate-400">
                    Kuota Target: <strong className="text-slate-700">{shift.personnelCount}</strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 24-Hour Timeline Bar Visual */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-sky-600" />
            Alur Rotasi Shift Operasional & Durasi 24 Jam
          </span>
          <span className="text-[11px] text-slate-400">Zona Waktu: WIB (GMT+7)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {shifts.map((shift) => {
            const dur = calculateShiftDuration(shift.startTime, shift.endTime);
            return (
              <div
                key={shift.id}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between"
                style={{ borderTop: `4px solid ${shift.color}` }}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 truncate">{shift.name}</span>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white shrink-0"
                      style={{ backgroundColor: shift.color }}
                    >
                      {shift.code}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-700">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{shift.startTime} - {shift.endTime}</span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Durasi:</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                    {dur.text}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ROSTER & ASSIGNED PERSONNEL PER SHIFT (INTERAKTIF & PLOTINGAN MID-SHIFT) */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              Roster Petugas, Presensi Interaktif & Plotingan Kerja per Shift
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Status presensi (H, I, A, S, L) langsung di-update oleh pengawas dan plotingan lokasi kerja dapat diperbarui manual di tengah shift
            </p>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1" />
            Hadir (H) & Lembur (L: 2x) berkontribusi langsung pada Score KPI Shift
          </div>
        </div>

        {/* Shift Cards Grid - Menampilkan seluruh shift */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {shifts.map((shift) => {
            const shiftCleaners = cleaners.filter((c) => c.shiftId === shift.id);
            const dur = calculateShiftDuration(shift.startTime, shift.endTime);

            // Calculate shift attendance status for the selected monitoring day
            let countH = 0;
            let countL = 0;
            let countI = 0;
            let countS = 0;
            let countA = 0;
            let countLibur = 0;

            shiftCleaners.forEach((c) => {
              const st = getCleanerStatus(c);
              if (st === 'H') countH++;
              else if (st === 'L') countL++;
              else if (st === 'I') countI++;
              else if (st === 'S') countS++;
              else if (st === 'A') countA++;
              else countLibur++;
            });

            const presentCount = countH + countL; // Hadir riil
            const targetQuota = shift.personnelCount || 1;
            const shiftKpiScore = Math.min(100, Math.round((presentCount / targetQuota) * 100));

            return (
              <div
                key={shift.id}
                className="rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between overflow-hidden hover:border-slate-300 transition-all"
              >
                {/* Shift Card Header */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: shift.color }}
                        />
                        <h4 className="font-bold text-slate-900 text-sm">{shift.name}</h4>
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
                          style={{ backgroundColor: shift.color }}
                        >
                          {shift.code}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{shift.startTime} - {shift.endTime} WIB</span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          {dur.text}
                        </span>
                      </p>
                    </div>

                    <button
                      onClick={() => handleOpenAllocateModal(shift.id)}
                      className="px-2.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      title="Tambah Petugas ke Shift ini"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ Petugas</span>
                    </button>
                  </div>

                  {/* KPI & Quota Indicator Box */}
                  <div className="mt-3 p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-emerald-600" />
                        <span className="font-bold text-slate-800">
                          Presensi: {presentCount} / {shiftCleaners.length} Hadir
                        </span>
                      </div>

                      <span
                        className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md ${
                          shiftKpiScore >= 100
                            ? 'bg-emerald-100 text-emerald-800'
                            : shiftKpiScore >= 75
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        Score KPI: {shiftKpiScore}%
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          shiftKpiScore >= 100
                            ? 'bg-emerald-500'
                            : shiftKpiScore >= 75
                            ? 'bg-sky-500'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, shiftKpiScore)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                      <span>Target Kuota: <strong className="text-slate-700">{shift.personnelCount} Orang</strong></span>
                      <div className="flex items-center gap-1 font-semibold">
                        <span className="text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded">H: {countH}</span>
                        {countL > 0 && <span className="text-purple-700 bg-purple-50 px-1 py-0.2 rounded">L: {countL}</span>}
                        {countI > 0 && <span className="text-sky-700 bg-sky-50 px-1 py-0.2 rounded">I: {countI}</span>}
                        {countS > 0 && <span className="text-amber-700 bg-amber-50 px-1 py-0.2 rounded">S: {countS}</span>}
                        {countA > 0 && <span className="text-rose-700 bg-rose-50 px-1 py-0.2 rounded">A: {countA}</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cleaner List in Shift */}
                <div className="p-4 flex-1 space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Petugas Bertugas ({shiftCleaners.length}):</span>
                    <span>Status Kehadiran</span>
                  </div>

                  {shiftCleaners.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center space-y-2">
                      <Users className="w-6 h-6 text-slate-300 mx-auto" />
                      <p className="text-xs text-slate-400">Belum ada petugas yang dialokasikan ke shift ini.</p>
                      <button
                        onClick={() => handleOpenAllocateModal(shift.id)}
                        className="px-3 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        + Alokasikan Petugas Sekarang
                      </button>
                    </div>
                  ) : (
                    shiftCleaners.map((cleaner) => {
                      const currentStatus = getCleanerStatus(cleaner);
                      const statusObj = ATTENDANCE_STATUSES.find((s) => s.code === currentStatus) || ATTENDANCE_STATUSES[0];
                      const isDropdownOpen = activeAttendanceCleanerId === cleaner.id;

                      return (
                        <div
                          key={cleaner.id}
                          className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 hover:border-slate-300 transition-all space-y-2"
                        >
                          {/* Row 1: Profile & Attendance Status Badge */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={cleaner.photoUrl}
                                alt={cleaner.name}
                                className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-200 shrink-0"
                              />
                              <div className="min-w-0">
                                <h5 className="font-bold text-slate-900 text-xs truncate">{cleaner.name}</h5>
                                <span className="text-[10px] text-slate-400 block font-mono">{cleaner.nik}</span>
                              </div>
                            </div>

                            {/* Status Presensi Interaktif Button & Dropdown */}
                            <div className="relative shrink-0">
                              <button
                                type="button"
                                onClick={() => setActiveAttendanceCleanerId(isDropdownOpen ? null : cleaner.id)}
                                className={`px-2.5 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all ${statusObj.badgeClass}`}
                                title="Klik untuk ubah status presensi oleh pengawas"
                              >
                                <span className={`w-2 h-2 rounded-full ${statusObj.bgDot}`} />
                                <span>{statusObj.label} [{statusObj.code}]</span>
                                <ChevronDown className="w-3 h-3 opacity-60" />
                              </button>

                              {/* Dropdown Menu Status Presensi Pengawas */}
                              {isDropdownOpen && (
                                <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                                    Pilih Presensi Pengawas:
                                  </div>
                                  <div className="space-y-0.5">
                                    {ATTENDANCE_STATUSES.map((st) => (
                                      <button
                                        key={st.code}
                                        type="button"
                                        onClick={() => handleSetCleanerAttendance(cleaner, st.code)}
                                        className={`w-full px-2 py-1.5 rounded-lg text-left text-xs font-semibold flex items-center justify-between transition-colors ${
                                          currentStatus === st.code
                                            ? 'bg-sky-50 text-sky-800 font-bold'
                                            : 'hover:bg-slate-50 text-slate-700'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className={`w-2 h-2 rounded-full ${st.bgDot}`} />
                                          <span>{st.label} ({st.code})</span>
                                        </div>
                                        {currentStatus === st.code && (
                                          <Check className="w-3.5 h-3.5 text-sky-600" />
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Row 2: Plotingan Lokasi Kerja (Manual & Mid-Shift Editable) */}
                          <div className="pt-2 border-t border-slate-200/60 flex items-start justify-between gap-2 text-xs">
                            <div className="flex items-start gap-1.5 min-w-0">
                              <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <div className="text-[11px] text-slate-700 font-medium leading-tight">
                                  <span className="font-bold text-slate-900">Plotingan: </span>
                                  {cleaner.workPlotting || 'Belum ditentukan'}
                                </div>
                                {cleaner.workPlottingUpdatedAt && (
                                  <span className="text-[10px] text-sky-600 font-semibold mt-0.5 block">
                                    ⏱️ Update: {cleaner.workPlottingUpdatedAt}
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleOpenPlottingModal(cleaner)}
                              className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:border-sky-400 hover:text-sky-700 text-slate-600 text-[10px] font-bold shrink-0 transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                              title="Update plotingan kerja di tengah shift"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Ganti</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Shift Card Footer */}
                <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
                  <span className="text-[11px]">
                    Kebutuhan: <strong className="text-slate-800">{shiftCleaners.length}</strong> / {shift.personnelCount} Staf
                  </span>

                  <button
                    onClick={() => handleOpenAllocateModal(shift.id)}
                    className="font-bold text-sky-600 hover:text-sky-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Kelola Alokasi</span>
                    <span>&rarr;</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Shift Handover Note Section */}
      <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 shadow-xs text-xs">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-amber-900 text-xs">
              Catatan Serah Terima Shift & Pengawasan Lapangan (Handover Log):
            </h4>
            <p className="text-amber-800 mt-1 leading-relaxed">
              "Shift 1 Pagi ke Shift 2 Midle/Siang: Area Toilet Lt. 2 kran wastafel no. 2 masih dalam pemantauan teknisi gedung. Pantry Lt. LG sudah restock sabun & tisu 100%. Plotingan petugas dapat disesuaikan langsung di tengah shift jika terjadi peningkatan volume tamu di lantai lobby."
            </p>
            <span className="text-[10px] text-amber-600 font-semibold mt-1 block">
              Dibuat oleh: Hendra Wijaya (Supervisor Lapangan) • Terakhir diperbarui 14:10 WIB
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL 1: UPDATE PLOTINGAN LOKASI KERJA (MID-SHIFT)           */}
      {/* ============================================================ */}
      {plottingCleaner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Update Plotingan Lokasi Kerja
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Bisa di-update di tengah-tengah shift kerja sesuai kondisi lapangan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPlottingCleaner(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveWorkPlotting} className="mt-4 space-y-4">
              {/* Petugas Info */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
                <img
                  src={plottingCleaner.photoUrl}
                  alt={plottingCleaner.name}
                  className="w-10 h-10 rounded-xl object-cover"
                />
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">{plottingCleaner.name}</h4>
                  <span className="text-[10px] text-slate-500">{plottingCleaner.nik} • {plottingCleaner.shiftName}</span>
                </div>
              </div>

              {/* Manual Input Plotingan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Plotingan Lokasi Kerja Baru: <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={manualPlottingText}
                  onChange={(e) => setManualPlottingText(e.target.value)}
                  placeholder="Contoh: Toilet Lt. 2, Koridor Barat, & Siaga Ruang VIP 401..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Isi manual sesuai penugasan riil yang sedang berjalan di lapangan
                </span>
              </div>

              {/* Quick Area Suggestion Chips */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                  Rekomendasi Area Cepat (Klik untuk memilih):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_AREA_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => {
                        if (!manualPlottingText) {
                          setManualPlottingText(chip);
                        } else {
                          setManualPlottingText(`${manualPlottingText}, ${chip}`);
                        }
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-600 text-[10px] font-semibold transition-colors cursor-pointer"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason / Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alasan Perubahan Tengah Shift (Opsional):
                </label>
                <input
                  type="text"
                  value={plottingReason}
                  onChange={(e) => setPlottingReason(e.target.value)}
                  placeholder="Contoh: Rotasi jam sibuk siang, permintaan mendesak klien..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPlottingCleaner(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  Simpan Plotingan Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: ALOKASI / TAMBAH PETUGAS KE SHIFT                   */}
      {/* ============================================================ */}
      {allocationTargetShiftId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-sky-600" />
                  Alokasikan Petugas ke {shifts.find((s) => s.id === allocationTargetShiftId)?.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tugaskan personel yang sudah ada atau daftarkan staf baru ke shift ini
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAllocationTargetShiftId(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs: Existing vs New */}
            <div className="flex items-center gap-2 border-b border-slate-100 mt-4 pb-2">
              <button
                type="button"
                onClick={() => setAllocationTab('existing')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  allocationTab === 'existing'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Pilih Petugas yang Ada (Rotasi)
              </button>
              <button
                type="button"
                onClick={() => setAllocationTab('new')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  allocationTab === 'new'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                + Tambah Petugas Baru
              </button>
            </div>

            {/* TAB 1: Existing Cleaners */}
            {allocationTab === 'existing' && (
              <div className="mt-4 space-y-2.5">
                <p className="text-[11px] text-slate-500">
                  Pilih petugas di bawah untuk dipindahkan atau ditugaskan ke shift ini:
                </p>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {cleaners.map((cleaner) => {
                    const isAlreadyInTarget = cleaner.shiftId === allocationTargetShiftId;
                    return (
                      <div
                        key={cleaner.id}
                        className={`p-2.5 rounded-2xl border flex items-center justify-between gap-3 text-xs transition-all ${
                          isAlreadyInTarget
                            ? 'bg-emerald-50/50 border-emerald-200'
                            : 'bg-white border-slate-200 hover:border-sky-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={cleaner.photoUrl}
                            alt={cleaner.name}
                            className="w-8 h-8 rounded-xl object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 block truncate">{cleaner.name}</span>
                            <span className="text-[10px] text-slate-400 block">
                              Shift saat ini: <strong className="text-slate-600">{cleaner.shiftName}</strong>
                            </span>
                          </div>
                        </div>

                        {isAlreadyInTarget ? (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-bold shrink-0">
                            Sudah di Shift Ini
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAssignExistingCleaner(cleaner.id)}
                            className="px-3 py-1 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-2xs"
                          >
                            Tugaskan ke Shift
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: New Cleaner Form */}
            {allocationTab === 'new' && (
              <form onSubmit={handleCreateNewCleanerInShift} className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Petugas Baru: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newCleanerName}
                    onChange={(e) => setNewCleanerName(e.target.value)}
                    placeholder="Contoh: Dedi Mulyadi"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    NIK / ID Staf:
                  </label>
                  <input
                    type="text"
                    value={newCleanerNik}
                    onChange={(e) => setNewCleanerNik(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Plotingan Lokasi Kerja Awal:
                  </label>
                  <input
                    type="text"
                    value={newCleanerPlotting}
                    onChange={(e) => setNewCleanerPlotting(e.target.value)}
                    placeholder="Contoh: Toilet Lantai 1 & Lobby Utama"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setAllocationTargetShiftId(null)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
                  >
                    Simpan Petugas Baru
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: TAMBAH / EDIT SHIFT MANUAL                          */}
      {/* ============================================================ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingShiftId ? 'Edit Pengaturan Shift' : 'Pengaturan Tambah Shift Manual'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tentukan jam mulai, jam selesai, dan sistem otomatis menghitung durasi jam kerja
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 pt-4">
              {/* Preset Buttons */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Pilih Cepat dari Template Shift:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {SHIFT_PRESETS.map((preset) => (
                    <button
                      key={preset.code}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className={`px-2.5 py-2 rounded-xl text-left border text-xs transition-all cursor-pointer ${
                        formData.name === preset.name
                          ? 'border-sky-500 bg-sky-50/80 font-bold text-sky-900 shadow-xs'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">{preset.name}</span>
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: preset.color }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                        {preset.startTime} - {preset.endTime}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Shift Name & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Shift <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Shift 1 ( satu ), Shift 2 ( Midle )..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kode Shift
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="S1, S2, AS"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none uppercase font-mono"
                  />
                </div>
              </div>

              {/* Start Time & End Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-sky-600" />
                    Jam Mulai Shift <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none bg-slate-50/50"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Format 24 jam (HH:mm)</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-sky-600" />
                    Jam Selesai Shift <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none bg-slate-50/50"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Format 24 jam (HH:mm)</span>
                </div>
              </div>

              {/* LIVE DURATION DISPLAY BOX */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Timer className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-emerald-800 block">
                      Kalkulasi Durasi Jam Kerja Shift:
                    </span>
                    <span className="text-base font-black text-emerald-900 tracking-tight">
                      {liveDuration.text}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-emerald-700 font-medium block">
                    {formData.startTime} WIB s/d {formData.endTime} WIB
                  </span>
                  <span className="text-[10px] text-emerald-600 italic">
                    {liveDuration.hours >= 8 ? 'Shift Penuh Standar' : 'Shift Parsial'}
                  </span>
                </div>
              </div>

              {/* Color & Personnel Count */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Warna Indikator Shift:
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {COLOR_PALETTE.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: c.hex })}
                        className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                          formData.color === c.hex
                            ? 'ring-2 ring-offset-2 ring-slate-800 scale-110'
                            : 'hover:scale-105 opacity-80'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.label}
                      >
                        {formData.color === c.hex && (
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Target Kuota Personel:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={formData.personnelCount}
                      onChange={(e) => setFormData({ ...formData, personnelCount: parseInt(e.target.value, 10) || 1 })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                    <span className="text-xs text-slate-500 shrink-0 font-medium">Orang</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Uraian Tugas & Deskripsi Shift:
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Contoh: Pembersihan awal harian, sanitasi toilet pagi, lobby utama..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  {editingShiftId ? 'Simpan Perubahan Shift' : 'Simpan Shift Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 4: KONFIRMASI HAPUS SHIFT                              */}
      {/* ============================================================ */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-100 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Hapus Pengaturan Shift?</h4>
            <p className="text-xs text-slate-500">
              Shift ini akan dihapus dari daftar. Petugas yang ditugaskan ke shift ini akan memerlukan alokasi ulang.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDeleteShift(deleteConfirmId)}
                className="px-4 py-2 rounded-xl bg-rose-600 text-xs font-bold text-white hover:bg-rose-700 shadow-xs cursor-pointer"
              >
                Ya, Hapus Shift
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
