import React, { useMemo, useState } from 'react';
import {
  Users,
  Clock,
  UserCheck,
  UserX,
  Calendar,
  CheckCircle2,
  Edit2,
  Plus,
  Trash2,
  Briefcase,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Layers,
} from 'lucide-react';
import { useCleaning } from '../../../context/CleaningContext';
import { AttendanceStatusCode, Cleaner, Shift } from '../../../types';
import {
  DailyRosterPersonStatus,
  deriveManpowerPlottingAndManday,
} from '../../../utils/manpowerManday';
import { getTodayDateString } from '../../../utils/shiftUtils';

const ATTENDANCE_BADGE_MAP: Record<AttendanceStatusCode, string> = {
  H: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  L: 'bg-purple-100 text-purple-800 border-purple-200',
  I: 'bg-sky-100 text-sky-800 border-sky-200',
  S: 'bg-amber-100 text-amber-800 border-amber-200',
  A: 'bg-rose-100 text-rose-800 border-rose-200',
  '-': 'bg-slate-100 text-slate-600 border-slate-200',
};

const ATTENDANCE_DOT_MAP: Record<AttendanceStatusCode, string> = {
  H: 'bg-emerald-500',
  L: 'bg-purple-600',
  I: 'bg-sky-500',
  S: 'bg-amber-500',
  A: 'bg-rose-500',
  '-': 'bg-slate-400',
};

export const KlienManpowerSection: React.FC = () => {
  const {
    cleaners,
    shifts,
    uploadedWorkSchedules,
    updateShift,
    updateCleaner,
    updateCleanerAttendance,
    employeeTurnovers,
    addEmployeeTurnover,
    deleteEmployeeTurnover,
    activeProject,
  } = useCleaning();

  const todayStr = getTodayDateString();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Active shift tab selection
  const [selectedShiftId, setSelectedShiftId] = useState<string>(() => shifts[0]?.id || 'shift-all');
  const effectiveSelectedShiftId =
    selectedShiftId === 'shift-all' || shifts.some((s) => s.id === selectedShiftId)
      ? selectedShiftId
      : shifts[0]?.id || 'shift-all';

  // Modal State for Shift Time Editing
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [shiftStartTime, setShiftStartTime] = useState('');
  const [shiftEndTime, setShiftEndTime] = useState('');
  const [shiftDesc, setShiftDesc] = useState('');

  // Modal State for Turnover (Karyawan Resign)
  const [showTurnoverModal, setShowTurnoverModal] = useState(false);
  const [turnoverName, setTurnoverName] = useState('');
  const [turnoverNik, setTurnoverNik] = useState('');
  const [turnoverRole] = useState('Petugas Kebersihan');
  const [turnoverShift, setTurnoverShift] = useState(() => shifts[0]?.name || 'Shift 1 ( satu )');
  const [turnoverResignDate, setTurnoverResignDate] = useState(todayStr);
  const [turnoverReason, setTurnoverReason] = useState('Pindah domisili keluarga');
  const [turnoverStatus, setTurnoverStatus] = useState<'replaced' | 'recruiting' | 'pending'>('replaced');
  const [turnoverReplacement, setTurnoverReplacement] = useState('');
  const [turnoverNotes, setTurnoverNotes] = useState('');
  const [turnoverFormError, setTurnoverFormError] = useState<string | null>(null);
  const [confirmDeleteTurnoverId, setConfirmDeleteTurnoverId] = useState<string | null>(null);

  // Modal State for Plotting Area Edit
  const [editingCleanerPlotting, setEditingCleanerPlotting] = useState<Cleaner | null>(null);
  const [customPlottingText, setCustomPlottingText] = useState('');

  // Feedback Toast
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  // Unified derivation from Roster Petugas + Presensi Interaktif + Plotingan Kerja per Shift for selectedDate
  const summary = useMemo(
    () =>
      deriveManpowerPlottingAndManday({
        selectedDate,
        cleaners,
        shifts,
        uploadedWorkSchedules,
        selectedShiftId: effectiveSelectedShiftId,
      }),
    [selectedDate, cleaners, shifts, uploadedWorkSchedules, effectiveSelectedShiftId]
  );

  const activeShiftObj =
    shifts.find((s) => s.id === effectiveSelectedShiftId) || shifts[0];

  const selectedDateDisplay = useMemo(() => {
    const d = new Date(summary.year, summary.month - 1, summary.day);
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [summary.year, summary.month, summary.day]);

  const stepSelectedDate = (deltaDays: number) => {
    const d = new Date(summary.year, summary.month - 1, summary.day + deltaDays);
    setSelectedDate(getTodayDateString(d));
  };

  // Open Edit Shift Time Modal
  const openEditShift = (shift: Shift) => {
    setEditingShift(shift);
    setShiftStartTime(shift.startTime || '07:00');
    setShiftEndTime(shift.endTime || '15:00');
    setShiftDesc(shift.description || '');
  };

  const handleSaveShiftTime = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShift) return;

    const startParts = shiftStartTime.split(':').map(Number);
    const endParts = shiftEndTime.split(':').map(Number);
    let diff = endParts[0] + endParts[1] / 60 - (startParts[0] + startParts[1] / 60);
    if (diff < 0) diff += 24;
    const durHours = Math.round(diff * 10) / 10;

    updateShift(editingShift.id, {
      startTime: shiftStartTime,
      endTime: shiftEndTime,
      workHoursDuration: durHours,
      durationText: `${durHours} Jam`,
      description: shiftDesc,
    });

    showToast(`Jam kerja ${editingShift.name} berhasil diperbarui: ${shiftStartTime} - ${shiftEndTime} WIB.`);
    setEditingShift(null);
  };

  // Change Attendance Handler (writes to selectedDate's day & monthKey)
  const handleChangeAttendance = (cleaner: Cleaner, newStatus: AttendanceStatusCode) => {
    updateCleanerAttendance(cleaner.id, summary.day, newStatus, summary.monthKey);

    if (summary.selectedDate === todayStr) {
      const isWorking = newStatus === 'H' || newStatus === 'L';
      updateCleaner(cleaner.id, {
        isClockedIn: isWorking,
        status: isWorking ? 'active' : 'off',
      });
    }

    const labelMap: Record<AttendanceStatusCode, string> = {
      H: 'Hadir',
      L: 'Lembur',
      I: 'Izin',
      S: 'Sakit',
      A: 'Alpa',
      '-': 'Off / Libur',
    };
    showToast(
      `Presensi ${cleaner.name} tgl ${summary.day}/${summary.month}/${summary.year} diubah menjadi "${labelMap[newStatus]}".`
    );
  };

  // Set All Synced Cleaners in Shift to Hadir for selectedDate
  const handleSetAllHadirInShift = () => {
    const syncable = summary.items.filter((item) => Boolean(item.cleaner));
    syncable.forEach((item) => {
      if (!item.cleaner) return;
      updateCleanerAttendance(item.cleaner.id, summary.day, 'H', summary.monthKey);
      if (summary.selectedDate === todayStr) {
        updateCleaner(item.cleaner.id, { isClockedIn: true, status: 'active' });
      }
    });
    showToast(
      `${syncable.length} personil di ${
        effectiveSelectedShiftId === 'shift-all' ? 'Semua Shift' : activeShiftObj?.name || 'Shift ini'
      } pada ${summary.selectedDate} diset HADIR.`
    );
  };

  // Handle Save Plotting
  const handleSavePlotting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCleanerPlotting) return;

    const timeNow = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    updateCleaner(editingCleanerPlotting.id, {
      workPlotting: customPlottingText,
      workPlottingUpdatedAt: timeNow,
    });

    showToast(`Plotingan area kerja untuk ${editingCleanerPlotting.name} berhasil diperbarui.`);
    setEditingCleanerPlotting(null);
  };

  // Handle Submit Turnover Resign
  const handleCreateTurnover = (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnoverName.trim()) {
      setTurnoverFormError('Silakan masukkan nama karyawan yang resign.');
      return;
    }
    setTurnoverFormError(null);

    addEmployeeTurnover({
      projectId: activeProject.id,
      cleanerName: turnoverName,
      nik: turnoverNik || `CLN-${Date.now().toString().slice(-4)}`,
      role: turnoverRole,
      shiftName: turnoverShift,
      resignDate: turnoverResignDate,
      reason: turnoverReason,
      replacementStatus: turnoverStatus,
      replacementCleanerName: turnoverStatus === 'replaced' ? turnoverReplacement : undefined,
      notes: turnoverNotes,
    });

    showToast(`Data karyawan resign atas nama "${turnoverName}" berhasil dicatat.`);
    setShowTurnoverModal(false);
    setTurnoverName('');
    setTurnoverNik('');
    setTurnoverReplacement('');
    setTurnoverNotes('');
  };

  const renderDateControlGroup = (compact = false) => (
    <div className="flex items-center gap-1.5 flex-wrap">
      <div className="inline-flex items-center bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <button
          type="button"
          onClick={() => stepSelectedDate(-1)}
          className="px-2 py-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
          title="Hari sebelumnya"
          aria-label="Hari sebelumnya"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <div className="flex items-center gap-1.5 px-2 border-x border-slate-100">
          <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <input
            type="date"
            value={summary.selectedDate}
            onChange={(e) => {
              if (e.target.value) setSelectedDate(e.target.value);
            }}
            aria-label="Pilih Tanggal Penentuan"
            className="text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer py-1"
          />
        </div>
        <button
          type="button"
          onClick={() => stepSelectedDate(1)}
          className="px-2 py-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
          title="Hari berikutnya"
          aria-label="Hari berikutnya"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {summary.selectedDate !== todayStr && (
        <button
          type="button"
          onClick={() => setSelectedDate(todayStr)}
          className={`inline-flex items-center gap-1 rounded-xl font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors cursor-pointer ${
            compact ? 'px-2 py-1 text-[10.5px]' : 'px-2.5 py-1.5 text-xs'
          }`}
          title="Kembali ke tanggal hari ini"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Hari Ini</span>
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2.5 text-xs animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{feedbackToast}</span>
        </div>
      )}

      {/* SECTION 1: TOTAL MANPOWER & ATTENDANCE SUMMARY CARDS */}
      <div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-600" />
              <span>Total Manpower & Kehadiran Harian</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                  summary.hasRosterForMonth
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {summary.hasRosterForMonth ? `Roster ${summary.monthLabel}` : 'Data Petugas & Shift'}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Monitoring ketersediaan personil tanggal{' '}
              <strong className="text-slate-700">{selectedDateDisplay}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {renderDateControlGroup()}

            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-sky-600 shrink-0" />
              <select
                value={effectiveSelectedShiftId}
                onChange={(e) => setSelectedShiftId(e.target.value)}
                aria-label="Pilih Shift dan Waktu"
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200 hover:border-sky-300 focus:outline-hidden focus:ring-2 focus:ring-sky-500 cursor-pointer transition-colors shadow-2xs"
              >
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.startTime || '07:00'} - {s.endTime || '15:00'} WIB)
                  </option>
                ))}
                <option value="shift-all">Semua Shift (00:00 - 24:00 WIB)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Card 1: Total Manpower */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Manpower Tugas</span>
              <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-slate-900">{summary.totalScheduledOnDate}</div>
              <p className="text-[10.5px] text-slate-500 mt-0.5 truncate">
                {effectiveSelectedShiftId === 'shift-all'
                  ? `Semua Shift (${summary.totalPersonnelInScope} terdaftar)`
                  : `${activeShiftObj?.name} (${activeShiftObj?.startTime || '07:00'}-${activeShiftObj?.endTime || '15:00'})`}
              </p>
            </div>
          </div>

          {/* Card 2: Hadir (H + L) */}
          <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-800 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Hadir (H/L)</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-200/80 text-emerald-800 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-emerald-700">{summary.workingPresentCount}</div>
              <p className="text-[10.5px] text-emerald-600 mt-0.5 font-medium">
                {summary.attendanceRatePercent}% Kehadiran{summary.lemburCount > 0 ? ` (L: ${summary.lemburCount})` : ''}
              </p>
            </div>
          </div>

          {/* Card 3: Izin / Sakit */}
          <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-800 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Izin / Sakit (I/S)</span>
              <div className="w-7 h-7 rounded-lg bg-amber-200/80 text-amber-800 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-amber-700">{summary.izinCount}</div>
              <p className="text-[10.5px] text-amber-600 mt-0.5 font-medium">Dengan Keterangan</p>
            </div>
          </div>

          {/* Card 4: Alpha */}
          <div className="bg-rose-50/70 p-3.5 rounded-2xl border border-rose-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-rose-800 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Alpa (A)</span>
              <div className="w-7 h-7 rounded-lg bg-rose-200/80 text-rose-800 flex items-center justify-center">
                <UserX className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-rose-700">{summary.alphaCount}</div>
              <p className="text-[10.5px] text-rose-600 mt-0.5 font-medium">Tanpa Keterangan</p>
            </div>
          </div>

          {/* Card 5: Off / Libur */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-600 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Off / Libur</span>
              <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-slate-700">{summary.offCount}</div>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Lepas Piket / Belum Presensi</p>
            </div>
          </div>

          {/* Card 6: Man Day Realization */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-3.5 rounded-2xl border border-indigo-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-indigo-800 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Fulfillment Manday</span>
              <div className="w-7 h-7 rounded-lg bg-indigo-200 text-indigo-800 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-indigo-900">{summary.mandayFulfillmentPercent}%</div>
              <p className="text-[10.5px] text-indigo-700 mt-0.5 font-medium">
                {summary.realizedToDateManday} / {summary.targetToDateManday} MD (s/d Tgl {summary.day})
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: SHIFT MANAGEMENT WITH MANUAL HOURS & ATTENDANCE BUTTONS (Hidden on mobile) */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Shift Tabs Header */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/70">
          <div>
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-600" />
              <span>Manpower Shift & Presensi Interaktif ({selectedDateDisplay})</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Terhubung dengan Roster Petugas, Presensi Interaktif & Plotingan Kerja per Shift sesuai tanggal pilihan
            </p>
          </div>

          {/* Shift Tab Switcher */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {shifts.map((s) => {
              const countInShift = summary.shiftCountsOnDate[s.id] || 0;
              const isActive = effectiveSelectedShiftId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedShiftId(s.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color || '#0284c7' }} />
                  <span>{s.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-sky-800 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {countInShift}
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setSelectedShiftId('shift-all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                effectiveSelectedShiftId === 'shift-all'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Semua Shift ({summary.allItems.length})
            </button>
          </div>
        </div>

        {/* Selected Shift Meta Banner (Manual Hour Setup) */}
        {activeShiftObj && effectiveSelectedShiftId !== 'shift-all' && (
          <div className="p-4 bg-sky-50/50 border-b border-sky-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-xs shrink-0"
                style={{ backgroundColor: activeShiftObj.color || '#0284c7' }}
              >
                {activeShiftObj.code || 'S'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h5 className="font-bold text-slate-900 text-sm">{activeShiftObj.name}</h5>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-white border border-sky-200 text-sky-800">
                    🕒 {activeShiftObj.startTime || '07:00'} - {activeShiftObj.endTime || '15:00'} WIB ({activeShiftObj.durationText || '8 Jam'})
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">{activeShiftObj.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => openEditShift(activeShiftObj)}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                title="Atur jam mulai dan selesai shift ini secara manual"
              >
                <Edit2 className="w-3.5 h-3.5 text-sky-600" />
                <span>Atur Jam Shift Manual</span>
              </button>

              <button
                type="button"
                onClick={handleSetAllHadirInShift}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                title="Tandai semua personil tersinkron di shift ini sebagai Hadir"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Set Semua Hadir</span>
              </button>
            </div>
          </div>
        )}

        {/* Cleaners List for Shift with Attendance Buttons (H / L / I / S / A / Off) */}
        <div className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10.5px]">
                  <th className="pb-3 pl-2">Personil</th>
                  <th className="pb-3">Shift & Roster</th>
                  <th className="pb-3">Plotingan Kerja</th>
                  <th className="pb-3 text-center">Presensi Tgl {summary.day}/{summary.month}</th>
                  <th className="pb-3 pr-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.items.map((item: DailyRosterPersonStatus) => {
                  const status = item.attendanceStatus;
                  const cleaner = item.cleaner;

                  return (
                    <tr key={item.key} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & Photo */}
                      <td className="py-3 pl-2">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={cleaner?.photoUrl || ''}
                            alt={item.nama}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
                            }}
                          />
                          <div>
                            <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5 flex-wrap">
                              <span>{item.nama}</span>
                              {item.jabatan && (
                                <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  {item.jabatan}
                                </span>
                              )}
                              {item.isSlotKosong && (
                                <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                  Slot Kosong
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {item.nik}
                              {cleaner?.phone ? ` • ${cleaner.phone}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Shift & Roster Badge */}
                      <td className="py-3">
                        <div className="flex flex-col items-start gap-1">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {item.assignedShiftName}
                          </span>
                          {item.hasRosterForMonth && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                item.rosterShiftCode === 'P'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : item.rosterShiftCode === 'S'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              Roster Tgl {summary.day}: {item.rosterShiftCode || '-'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Work Plotting */}
                      <td className="py-3">
                        <div className="max-w-xs">
                          <p className="font-medium text-slate-800 text-xs truncate">
                            {item.plottingArea}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            {item.plottingSource === 'shift_plotting'
                              ? `Update Ploting: ${item.plottingUpdatedAt || 'Terbaru'}`
                              : item.plottingSource === 'roster'
                              ? 'Sumber: Roster Jadwal Kerja'
                              : 'Belum ada plotingan'}
                          </span>
                        </div>
                      </td>

                      {/* Interactive Attendance Buttons: H / L / I / S / A / Off */}
                      <td className="py-3">
                        {cleaner ? (
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleChangeAttendance(cleaner, 'H')}
                              className={`px-2 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                                status === 'H'
                                  ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-300'
                                  : 'bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-800'
                              }`}
                              title="Hadir"
                            >
                              H
                            </button>

                            <button
                              type="button"
                              onClick={() => handleChangeAttendance(cleaner, 'L')}
                              className={`px-2 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                                status === 'L'
                                  ? 'bg-purple-600 text-white shadow-xs ring-2 ring-purple-300'
                                  : 'bg-slate-100 text-slate-600 hover:bg-purple-100 hover:text-purple-800'
                              }`}
                              title="Lembur"
                            >
                              L
                            </button>

                            <button
                              type="button"
                              onClick={() => handleChangeAttendance(cleaner, 'I')}
                              className={`px-2 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                                status === 'I'
                                  ? 'bg-sky-500 text-white shadow-xs ring-2 ring-sky-300'
                                  : 'bg-slate-100 text-slate-600 hover:bg-sky-100 hover:text-sky-800'
                              }`}
                              title="Izin"
                            >
                              I
                            </button>

                            <button
                              type="button"
                              onClick={() => handleChangeAttendance(cleaner, 'S')}
                              className={`px-2 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                                status === 'S'
                                  ? 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-300'
                                  : 'bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-800'
                              }`}
                              title="Sakit"
                            >
                              S
                            </button>

                            <button
                              type="button"
                              onClick={() => handleChangeAttendance(cleaner, 'A')}
                              className={`px-2 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                                status === 'A'
                                  ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-300'
                                  : 'bg-slate-100 text-slate-600 hover:bg-rose-100 hover:text-rose-800'
                              }`}
                              title="Alpa (Tanpa Keterangan)"
                            >
                              A
                            </button>

                            <button
                              type="button"
                              onClick={() => handleChangeAttendance(cleaner, '-')}
                              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                status === '-'
                                  ? 'bg-slate-700 text-white shadow-xs ring-2 ring-slate-400'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
                              }`}
                              title="Off / Libur"
                            >
                              Off
                            </button>
                          </div>
                        ) : (
                          <div className="text-center text-[11px] text-slate-400 italic">
                            {item.isSlotKosong
                              ? 'Slot Roster Kosong'
                              : 'Sinkronkan Roster ke Data Petugas untuk presensi'}
                          </div>
                        )}
                      </td>

                      {/* Action: Edit Plotting */}
                      <td className="py-3 pr-2 text-right">
                        {cleaner ? (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCleanerPlotting(cleaner);
                              setCustomPlottingText(cleaner.workPlotting || item.plottingArea || '');
                            }}
                            className="px-2.5 py-1 text-xs text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg font-bold border border-sky-200 transition-colors cursor-pointer"
                          >
                            Edit Ploting
                          </button>
                        ) : (
                          <span className="text-[10.5px] text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {summary.items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Tidak ada personil pada shift & tanggal ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 3: TURN OVER (KARYAWAN RESIGN) & STATUS PLOTTING / MAN DAY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Turn Over (Karyawan Resign) Container (Hidden on mobile) */}
        <div className="hidden md:flex bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <UserX className="w-4 h-4 text-rose-600" />
                  <span>Turn Over (Karyawan Resign)</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daftar riwayat pergantian personil & karyawan resign di lokasi proyek ini
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setTurnoverFormError(null);
                  setShowTurnoverModal(true);
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Catat Resign</span>
              </button>
            </div>

            {/* Turnover Rate Summary Metric */}
            <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200/80 mb-4 flex items-center justify-between text-xs">
              <div>
                <span className="text-rose-900 font-bold block">Tingkat Turnover Bulan Ini:</span>
                <span className="text-slate-600 text-[11px]">
                  Total {employeeTurnovers.length} pergantian tercatat di site ini
                </span>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-rose-700">
                  {summary.allItems.length > 0
                    ? ((employeeTurnovers.length / summary.allItems.length) * 100).toFixed(1)
                    : 0}
                  %
                </span>
                <span className="text-[10px] text-rose-600 block font-medium">Turnover Rate</span>
              </div>
            </div>

            {/* Turnover List */}
            <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
              {employeeTurnovers.map((to) => (
                <div
                  key={to.id}
                  className="p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{to.cleanerName}</span>
                      <span className="text-[10px] text-slate-500 font-mono">({to.nik})</span>
                      <span
                        className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded ${
                          to.replacementStatus === 'replaced'
                            ? 'bg-emerald-100 text-emerald-800'
                            : to.replacementStatus === 'recruiting'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {to.replacementStatus === 'replaced'
                          ? '✓ Ada Pengganti'
                          : to.replacementStatus === 'recruiting'
                          ? 'Proses Rekrutmen'
                          : 'Pending'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600">
                      📅 Resign: <strong>{to.resignDate}</strong> • Shift: {to.shiftName}
                    </p>
                    <p className="text-[11px] text-slate-500 italic">
                      Alasan: &quot;{to.reason}&quot;
                    </p>
                    {to.replacementCleanerName && (
                      <p className="text-[10.5px] text-emerald-700 font-medium">
                        Pengganti: {to.replacementCleanerName}
                      </p>
                    )}
                  </div>

                  {confirmDeleteTurnoverId === to.id ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          deleteEmployeeTurnover(to.id);
                          setConfirmDeleteTurnoverId(null);
                          showToast('Catatan turnover dihapus.');
                        }}
                        className="px-2 py-1 rounded bg-rose-600 text-white text-[10px] font-bold hover:bg-rose-700 cursor-pointer"
                      >
                        Hapus
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteTurnoverId(null)}
                        className="px-2 py-1 rounded bg-slate-200 text-slate-700 text-[10px] font-bold hover:bg-slate-300 cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteTurnoverId(to.id)}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                      title="Hapus data turnover"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}

              {employeeTurnovers.length === 0 && (
                <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl">
                  Belum ada catatan turnover / karyawan resign di proyek ini.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status Plotting & Man Day Calculation */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                  <span>Status Plotting & Kalkulasi Man Day</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Diambil dari Roster Petugas, Presensi Interaktif &amp; Plotingan Kerja per Shift
                </p>
              </div>

              {renderDateControlGroup(true)}
            </div>

            {/* Data Source Sync Chips */}
            <div className="flex flex-wrap items-center gap-1.5 mb-3 text-[10.5px]">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold border ${
                  summary.hasRosterForMonth
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                <Layers className="w-3 h-3" />
                {summary.hasRosterForMonth
                  ? `Roster: ${summary.monthLabel}`
                  : `Roster: Fallback Data Petugas (${summary.monthLabel})`}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                <Clock className="w-3 h-3" />
                {effectiveSelectedShiftId === 'shift-all'
                  ? 'Semua Shift'
                  : activeShiftObj?.name || 'Shift'}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Calendar className="w-3 h-3" />
                Tanggal: {summary.day}/{summary.month}/{summary.year}
              </span>
            </div>

            {/* Man Day Breakdown Box */}
            <div className="p-4 bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl shadow-sm mb-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs text-slate-300 font-medium block">
                    Kalkulasi Billing Man-Day ({summary.monthLabel}):
                  </span>
                  <span className="text-[10.5px] text-slate-400">
                    Akumulasi Tgl 1 s/d {summary.day} {summary.monthLabel} • Target s/d Tgl {summary.day}:{' '}
                    <strong className="text-slate-200">{summary.targetToDateManday} MD</strong>
                  </span>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Target Bulan: {summary.targetMonthManday} Man-Day
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-800">
                <div>
                  <span className="text-[10.5px] text-slate-400 block">Realisasi Hadir</span>
                  <span className="text-base font-extrabold text-emerald-400">
                    {summary.realizedToDateManday} MD
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Tgl {summary.day}: {summary.workingPresentCount}/{summary.totalScheduledOnDate} org
                  </span>
                </div>
                <div>
                  <span className="text-[10.5px] text-slate-400 block">
                    {summary.surplusToDateManday > 0 ? 'Surplus Lembur' : 'Variance (Loss)'}
                  </span>
                  <span
                    className={`text-base font-extrabold ${
                      summary.surplusToDateManday > 0
                        ? 'text-purple-300'
                        : summary.varianceToDateManday === 0
                        ? 'text-emerald-300'
                        : 'text-rose-400'
                    }`}
                  >
                    {summary.surplusToDateManday > 0
                      ? `+${summary.surplusToDateManday} MD`
                      : `-${summary.varianceToDateManday} MD`}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    vs {summary.targetToDateManday} MD terjadwal
                  </span>
                </div>
                <div>
                  <span className="text-[10.5px] text-slate-400 block">Kepatuhan SLA</span>
                  <span className="text-base font-extrabold text-amber-300">
                    {summary.mandayFulfillmentPercent}%
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    {summary.mandayMonthlyProgressPercent}% dari target bln
                  </span>
                </div>
              </div>

              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-400 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${summary.mandayFulfillmentPercent}%` }}
                />
              </div>
            </div>

            {/* Plotting Readiness Stats (Visible on all viewports) */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Status Plotingan &amp; Presensi ({summary.items.length} Personil)
                </h5>
                <div className="flex flex-wrap items-center gap-1 text-[10px] font-bold">
                  <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                    Terplot: {summary.plottedCountOnDate}/{summary.totalPersonnelInScope}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    H/L: {summary.workingPresentCount}
                  </span>
                  {summary.izinCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                      I/S: {summary.izinCount}
                    </span>
                  )}
                  {summary.alphaCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                      A: {summary.alphaCount}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {summary.items.map((item) => {
                  const badgeCls = ATTENDANCE_BADGE_MAP[item.attendanceStatus] || ATTENDANCE_BADGE_MAP['-'];
                  const dotCls = ATTENDANCE_DOT_MAP[item.attendanceStatus] || ATTENDANCE_DOT_MAP['-'];

                  return (
                    <div
                      key={item.key}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2 text-xs hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${dotCls}`} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-800 truncate">{item.nama}</span>
                            {item.jabatan && (
                              <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {item.jabatan}
                              </span>
                            )}
                            {item.isScheduledOffOnDate && (
                              <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200">
                                OFF Roster
                              </span>
                            )}
                          </div>
                          <span className="text-[10.5px] text-slate-600 block truncate">
                            📍 {item.plottingArea}
                          </span>
                          <span className="text-[9.5px] text-slate-400 block">
                            {item.plottingSource === 'shift_plotting'
                              ? `Plotingan Shift (${item.plottingUpdatedAt || 'Aktif'})`
                              : item.plottingSource === 'roster'
                              ? 'Area dari Roster Petugas'
                              : 'Belum diplot'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-600 font-semibold bg-white px-2 py-0.5 rounded border border-slate-200">
                            {item.assignedShiftName}
                            {item.rosterShiftCode ? ` (${item.rosterShiftCode})` : ''}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badgeCls}`}>
                            [{item.attendanceStatus}] {item.attendanceLabel}
                          </span>
                        </div>
                        {item.cleaner && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCleanerPlotting(item.cleaner);
                              setCustomPlottingText(item.cleaner?.workPlotting || item.plottingArea || '');
                            }}
                            className="text-[10px] font-bold text-sky-700 hover:text-sky-900 hover:underline cursor-pointer"
                          >
                            Ubah Plotingan
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {summary.items.length === 0 && (
                  <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    Belum ada data personil untuk tanggal dan shift yang dipilih.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: ATUR JAM SHIFT SECARA MANUAL */}
      {editingShift && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-600" />
                <span>Atur Jam Shift Manual - {editingShift.name}</span>
              </h4>
              <button
                type="button"
                onClick={() => setEditingShift(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveShiftTime} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jam Mulai (WIB)
                  </label>
                  <input
                    type="time"
                    required
                    value={shiftStartTime}
                    onChange={(e) => setShiftStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jam Selesai (WIB)
                  </label>
                  <input
                    type="time"
                    required
                    value={shiftEndTime}
                    onChange={(e) => setShiftEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Uraian Deskripsi Shift
                </label>
                <textarea
                  rows={2}
                  value={shiftDesc}
                  onChange={(e) => setShiftDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-sky-500"
                  placeholder="Misal: Pembersihan pagi, sanitasi toilet, dan operasional lobby..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingShift(null)}
                  className="px-3 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Simpan Jam Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CATAT KARYAWAN RESIGN (TURN OVER) */}
      {showTurnoverModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <UserX className="w-4 h-4 text-rose-600" />
                <span>Form Catat Karyawan Resign / Turnover</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowTurnoverModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTurnover} className="space-y-3">
              {turnoverFormError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {turnoverFormError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Karyawan Resign *
                  </label>
                  <input
                    type="text"
                    required
                    value={turnoverName}
                    onChange={(e) => setTurnoverName(e.target.value)}
                    placeholder="Nama personil..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nomor Induk Karyawan (NIK)
                  </label>
                  <input
                    type="text"
                    value={turnoverNik}
                    onChange={(e) => setTurnoverNik(e.target.value)}
                    placeholder="CLN-2024-xxx"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Posisi / Shift Terakhir
                  </label>
                  <select
                    value={turnoverShift}
                    onChange={(e) => setTurnoverShift(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500"
                  >
                    {shifts.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tanggal Efektif Resign *
                  </label>
                  <input
                    type="date"
                    required
                    value={turnoverResignDate}
                    onChange={(e) => setTurnoverResignDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alasan Resign / Pengunduran Diri
                </label>
                <input
                  type="text"
                  required
                  value={turnoverReason}
                  onChange={(e) => setTurnoverReason(e.target.value)}
                  placeholder="Misal: Pindah domisili, habis masa kontrak, dll"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status Pengganti (Replacement)
                  </label>
                  <select
                    value={turnoverStatus}
                    onChange={(e) => setTurnoverStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="replaced">Sudah Ada Pengganti</option>
                    <option value="recruiting">Sedang Proses Rekrutmen</option>
                    <option value="pending">Belum Ditentukan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Personil Pengganti
                  </label>
                  <input
                    type="text"
                    disabled={turnoverStatus !== 'replaced'}
                    value={turnoverReplacement}
                    onChange={(e) => setTurnoverReplacement(e.target.value)}
                    placeholder="Nama pengganti..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500 disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Tambahan (Serah Terima Aset)
                </label>
                <textarea
                  rows={2}
                  value={turnoverNotes}
                  onChange={(e) => setTurnoverNotes(e.target.value)}
                  placeholder="ID Card, seragam kerja, checklist perlengkapan..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowTurnoverModal(false)}
                  className="px-3 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Simpan Data Turnover
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT PLOTINGAN KERJA MANUAL */}
      {editingCleanerPlotting && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-sky-600" />
                <span>Ubah Plotingan Area Kerja</span>
              </h4>
              <button
                type="button"
                onClick={() => setEditingCleanerPlotting(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePlotting} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Personil
                </label>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800">
                  {editingCleanerPlotting.name} ({editingCleanerPlotting.shiftName})
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lokasi & Tugas Plotingan Baru
                </label>
                <textarea
                  rows={3}
                  required
                  value={customPlottingText}
                  onChange={(e) => setCustomPlottingText(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-sky-500 font-medium"
                  placeholder="Contoh: Toilet Lantai 1 & Lobby Utama, Sanitasi Hand Dryer & Urinoir..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingCleanerPlotting(null)}
                  className="px-3 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Simpan Plotingan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
