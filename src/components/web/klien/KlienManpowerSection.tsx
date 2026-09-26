import React, { useState } from 'react';
import {
  Users,
  Clock,
  UserCheck,
  UserX,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Edit2,
  Plus,
  Trash2,
  Briefcase,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  Building2,
  Sparkles,
} from 'lucide-react';
import { useCleaning } from '../../../context/CleaningContext';
import { AttendanceStatusCode, Cleaner, EmployeeTurnoverRecord, Shift } from '../../../types';

export const KlienManpowerSection: React.FC = () => {
  const {
    cleaners,
    shifts,
    updateShift,
    updateCleaner,
    updateCleanerAttendance,
    employeeTurnovers,
    addEmployeeTurnover,
    deleteEmployeeTurnover,
    activeProject,
    userRole,
  } = useCleaning();

  const today = new Date();
  const currentDay = today.getDate();
  const currentMonthYear = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  // Active shift tab selection
  const [selectedShiftId, setSelectedShiftId] = useState<string>('shift-1');

  // Modal State for Shift Time Editing
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [shiftStartTime, setShiftStartTime] = useState('');
  const [shiftEndTime, setShiftEndTime] = useState('');
  const [shiftDesc, setShiftDesc] = useState('');

  // Modal State for Turnover (Karyawan Resign)
  const [showTurnoverModal, setShowTurnoverModal] = useState(false);
  const [turnoverName, setTurnoverName] = useState('');
  const [turnoverNik, setTurnoverNik] = useState('');
  const [turnoverRole, setTurnoverRole] = useState('Petugas Kebersihan');
  const [turnoverShift, setTurnoverShift] = useState('Shift 1 ( satu )');
  const [turnoverResignDate, setTurnoverResignDate] = useState(today.toISOString().split('T')[0]);
  const [turnoverReason, setTurnoverReason] = useState('Pindah domisili keluarga');
  const [turnoverStatus, setTurnoverStatus] = useState<'replaced' | 'recruiting' | 'pending'>('replaced');
  const [turnoverReplacement, setTurnoverReplacement] = useState('');
  const [turnoverNotes, setTurnoverNotes] = useState('');

  // Modal State for Plotting Area Edit
  const [editingCleanerPlotting, setEditingCleanerPlotting] = useState<Cleaner | null>(null);
  const [customPlottingText, setCustomPlottingText] = useState('');

  // Feedback Toast
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  // Filter cleaners for selected shift
  const currentShiftCleaners = cleaners.filter((c) => {
    if (selectedShiftId === 'shift-all') {
      return true;
    }
    return c.shiftId === selectedShiftId;
  });

  const activeShiftObj = shifts.find((s) => s.id === selectedShiftId) || shifts[0];

  // Calculations for Total Manpower & Attendance (automatically changes based on selected shift)
  const totalCleaners = currentShiftCleaners.length;

  const getAttendanceStatus = (c: Cleaner): AttendanceStatusCode => {
    if (c.attendance && c.attendance[currentDay]) {
      return c.attendance[currentDay];
    }
    // Default fallback to Hadir (H) if active
    return c.status === 'active' ? 'H' : 'L';
  };

  const hadirCount = currentShiftCleaners.filter((c) => getAttendanceStatus(c) === 'H').length;
  const izinCount = currentShiftCleaners.filter((c) => {
    const s = getAttendanceStatus(c);
    return s === 'I' || s === 'S';
  }).length;
  const alphaCount = currentShiftCleaners.filter((c) => getAttendanceStatus(c) === 'A').length;
  const offCount = currentShiftCleaners.filter((c) => {
    const s = getAttendanceStatus(c);
    return s === 'L' || s === '-';
  }).length;

  const attendanceRate = totalCleaners > 0 ? Math.round((hadirCount / totalCleaners) * 100) : 0;

  // Man Day Calculation (Target per month vs Realization)
  // Assuming 25 working days per standard month
  const targetWorkingDays = 25;
  const targetContractManday = totalCleaners * targetWorkingDays;
  // Accumulated Hadir days in current month so far across selected shift cleaners
  let accumulatedHadirDays = 0;
  currentShiftCleaners.forEach((c) => {
    const monthAtt = c.attendanceByMonth?.[currentMonthYear] || c.attendance || {};
    Object.values(monthAtt).forEach((st) => {
      if (st === 'H') accumulatedHadirDays++;
    });
  });
  if (accumulatedHadirDays === 0) {
    // Estimasi proporsional sampai hari ini
    accumulatedHadirDays = hadirCount * Math.min(currentDay, targetWorkingDays);
  }
  const mandayFulfillmentPercent = targetContractManday > 0 ? Math.min(100, Math.round((accumulatedHadirDays / (totalCleaners * Math.min(currentDay, targetWorkingDays) || 1)) * 100)) : 100;

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

    // Calculate duration in hours
    const startParts = shiftStartTime.split(':').map(Number);
    const endParts = shiftEndTime.split(':').map(Number);
    let diff = (endParts[0] + endParts[1] / 60) - (startParts[0] + startParts[1] / 60);
    if (diff < 0) diff += 24; // Cross midnight
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

  // Change Attendance Handler
  const handleChangeAttendance = (cleaner: Cleaner, newStatus: AttendanceStatusCode) => {
    updateCleanerAttendance(cleaner.id, currentDay, newStatus, currentMonthYear);
    const label =
      newStatus === 'H'
        ? 'Hadir'
        : newStatus === 'I'
        ? 'Izin'
        : newStatus === 'A'
        ? 'Alpha'
        : 'Off / Libur';
    showToast(`Status kehadiran ${cleaner.name} diubah menjadi "${label}".`);
  };

  // Set All Cleaners in Shift to Hadir
  const handleSetAllHadirInShift = () => {
    currentShiftCleaners.forEach((c) => {
      updateCleanerAttendance(c.id, currentDay, 'H', currentMonthYear);
    });
    showToast(`Semua personil (${currentShiftCleaners.length} orang) di ${activeShiftObj?.name || 'Shift ini'} diset HADIR.`);
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
      alert('Silakan masukkan nama karyawan yang resign.');
      return;
    }

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
    // Reset form
    setTurnoverName('');
    setTurnoverNik('');
    setTurnoverReplacement('');
    setTurnoverNotes('');
  };

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-600" />
              <span>Total Manpower & Kehadiran Harian</span>
            </h3>
            <p className="text-xs text-slate-500">
              Monitoring ketersediaan personil operasional per hari ini, {today.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-600 shrink-0" />
            <select
              value={selectedShiftId}
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

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Card 1: Total Manpower */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Total Manpower</span>
              <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-slate-900">{totalCleaners}</div>
              <p className="text-[10.5px] text-slate-500 mt-0.5 truncate">
                {selectedShiftId === 'shift-all'
                  ? 'Semua Shift (24 Jam)'
                  : `${activeShiftObj?.name} (${activeShiftObj?.startTime || '07:00'}-${activeShiftObj?.endTime || '15:00'})`}
              </p>
            </div>
          </div>

          {/* Card 2: Hadir */}
          <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-800 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Hadir (H)</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-200/80 text-emerald-800 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-emerald-700">{hadirCount}</div>
              <p className="text-[10.5px] text-emerald-600 mt-0.5 font-medium">{attendanceRate}% Kehadiran</p>
            </div>
          </div>

          {/* Card 3: Izin / Sakit */}
          <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-800 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Izin / Sakit (I)</span>
              <div className="w-7 h-7 rounded-lg bg-amber-200/80 text-amber-800 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-amber-700">{izinCount}</div>
              <p className="text-[10.5px] text-amber-600 mt-0.5 font-medium">Dengan Keterangan</p>
            </div>
          </div>

          {/* Card 4: Alpha */}
          <div className="bg-rose-50/70 p-3.5 rounded-2xl border border-rose-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-rose-800 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Alpha (A)</span>
              <div className="w-7 h-7 rounded-lg bg-rose-200/80 text-rose-800 flex items-center justify-center">
                <UserX className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-rose-700">{alphaCount}</div>
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
              <div className="text-2xl font-extrabold text-slate-700">{offCount}</div>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Lepas Piket</p>
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
              <div className="text-2xl font-extrabold text-indigo-900">{mandayFulfillmentPercent}%</div>
              <p className="text-[10.5px] text-indigo-700 mt-0.5 font-medium">Target SLA Tercapai</p>
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
              <span>Manpower Shift & Status Kehadiran (Hadir / Izin / Alpha / Off)</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Jam kerja shift dapat disesuaikan secara manual, dan status kehadiran personil dapat diubah langsung
            </p>
          </div>

          {/* Shift Tab Switcher */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {shifts.map((s) => {
              const countInShift = cleaners.filter((c) => c.shiftId === s.id).length;
              const isActive = selectedShiftId === s.id;
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
                selectedShiftId === 'shift-all'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Semua Shift ({cleaners.length})
            </button>
          </div>
        </div>

        {/* Selected Shift Meta Banner (Manual Hour Setup) */}
        {activeShiftObj && selectedShiftId !== 'shift-all' && (
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
                title="Tandai semua personil di shift ini sebagai Hadir"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Set Semua Hadir</span>
              </button>
            </div>
          </div>
        )}

        {/* Cleaners List for Shift with Attendance Buttons (H / I / A / Off) */}
        <div className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10.5px]">
                  <th className="pb-3 pl-2">Personil</th>
                  <th className="pb-3">Shift</th>
                  <th className="pb-3">Plotingan Kerja</th>
                  <th className="pb-3 text-center">Status Kehadiran Hari Ini</th>
                  <th className="pb-3 pr-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentShiftCleaners.map((cleaner) => {
                  const status = getAttendanceStatus(cleaner);
                  return (
                    <tr key={cleaner.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & Photo */}
                      <td className="py-3 pl-2">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={cleaner.photoUrl}
                            alt={cleaner.name}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
                            }}
                          />
                          <div>
                            <div className="font-bold text-slate-900 text-xs sm:text-sm">{cleaner.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{cleaner.nik} • {cleaner.phone || '0812-xxxx'}</div>
                          </div>
                        </div>
                      </td>

                      {/* Shift Badge */}
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {cleaner.shiftName}
                        </span>
                      </td>

                      {/* Work Plotting */}
                      <td className="py-3">
                        <div className="max-w-xs">
                          <p className="font-medium text-slate-800 text-xs truncate">
                            {cleaner.workPlotting || 'Lobby & Area Sanitair'}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            Update: {cleaner.workPlottingUpdatedAt || '07:00 WIB'}
                          </span>
                        </div>
                      </td>

                      {/* Interactive Attendance Buttons: H / I / A / Off */}
                      <td className="py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Button Hadir */}
                          <button
                            type="button"
                            onClick={() => handleChangeAttendance(cleaner, 'H')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                              status === 'H'
                                ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-300'
                                : 'bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-800'
                            }`}
                            title="Hadir"
                          >
                            H
                          </button>

                          {/* Button Izin */}
                          <button
                            type="button"
                            onClick={() => handleChangeAttendance(cleaner, 'I')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                              status === 'I' || status === 'S'
                                ? 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-300'
                                : 'bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-800'
                            }`}
                            title="Izin / Sakit"
                          >
                            I
                          </button>

                          {/* Button Alpha */}
                          <button
                            type="button"
                            onClick={() => handleChangeAttendance(cleaner, 'A')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                              status === 'A'
                                ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-300'
                                : 'bg-slate-100 text-slate-600 hover:bg-rose-100 hover:text-rose-800'
                            }`}
                            title="Alpha (Tanpa Keterangan)"
                          >
                            A
                          </button>

                          {/* Button Off */}
                          <button
                            type="button"
                            onClick={() => handleChangeAttendance(cleaner, 'L')}
                            className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              status === 'L' || status === '-'
                                ? 'bg-slate-700 text-white shadow-xs ring-2 ring-slate-400'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
                            }`}
                            title="Off / Libur"
                          >
                            Off
                          </button>
                        </div>
                      </td>

                      {/* Action: Edit Plotting */}
                      <td className="py-3 pr-2 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCleanerPlotting(cleaner);
                            setCustomPlottingText(cleaner.workPlotting || '');
                          }}
                          className="px-2.5 py-1 text-xs text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg font-bold border border-sky-200 transition-colors cursor-pointer"
                        >
                          Edit Ploting
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {currentShiftCleaners.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Tidak ada petugas terdaftar pada shift ini.
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
                onClick={() => setShowTurnoverModal(true)}
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
                  {totalCleaners > 0 ? ((employeeTurnovers.length / totalCleaners) * 100).toFixed(1) : 0}%
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

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Hapus catatan turnover ${to.cleanerName}?`)) {
                        deleteEmployeeTurnover(to.id);
                        showToast('Catatan turnover dihapus.');
                      }
                    }}
                    className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                    title="Hapus data turnover"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
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
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                  <span>Status Plotting & Kalkulasi Man Day</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Distribusi penempatan area kerja personil dan perhitungan kuota hari-orang (Man-Day)
                </p>
              </div>
            </div>

            {/* Man Day Breakdown Box */}
            <div className="p-4 bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl shadow-sm mb-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300 font-medium">Kalkulasi Billing Man-Day Bulan Ini:</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Target: {targetContractManday} Man-Day
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-800">
                <div>
                  <span className="text-[10.5px] text-slate-400 block">Realisasi Hadir</span>
                  <span className="text-base font-extrabold text-emerald-400">{accumulatedHadirDays} MD</span>
                </div>
                <div>
                  <span className="text-[10.5px] text-slate-400 block">Variance (Loss)</span>
                  <span className="text-base font-extrabold text-rose-400">
                    -{Math.max(0, totalCleaners * Math.min(currentDay, targetWorkingDays) - accumulatedHadirDays)} MD
                  </span>
                </div>
                <div>
                  <span className="text-[10.5px] text-slate-400 block">Kepatuhan SLA</span>
                  <span className="text-base font-extrabold text-amber-300">{mandayFulfillmentPercent}%</span>
                </div>
              </div>

              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-400 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${mandayFulfillmentPercent}%` }}
                />
              </div>
            </div>

            {/* Plotting Readiness Stats (Hidden on mobile) */}
            <div className="hidden md:block">
              <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Status Plotingan Area Kerja Petugas:
              </h5>
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {cleaners.map((c) => (
                  <div
                    key={c.id}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <div>
                        <span className="font-bold text-slate-800">{c.name}</span>
                        <span className="text-[10.5px] text-slate-400 block">
                          📍 {c.workPlotting || 'Belum diplot'}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                      {c.shiftName}
                    </span>
                  </div>
                ))}
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
