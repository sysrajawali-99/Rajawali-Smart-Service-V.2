import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Plus,
  Clock,
  MapPin,
  Users,
  User,
  CheckCircle2,
  Calendar,
  X,
  ListChecks,
  Search,
  Layers,
  CheckSquare,
  Square,
  Check,
  UserCheck,
  Sparkles,
  Trash2,
  Upload,
  RefreshCw,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import { CleaningSchedule, Cleaner, UploadedWorkScheduleEntry } from '../../types';
import { UploadJadwalKerjaSection } from './UploadJadwalKerjaSection';
import {
  MONTH_NAMES_ID,
  ParsedScheduleRow,
  buildRowsFromEntries,
  getDaysInMonth,
  getIndonesianDayCode,
  resolveRowOperationalShift,
  resolveShift1AndShift2,
} from '../../utils/workScheduleExcel';

export const JadwalCleaningView: React.FC = () => {
  const {
    schedules,
    areas,
    cleaners,
    shifts: allShifts,
    getProjectShifts,
    activeProject,
    updateCleaner,
    addCleaner,
    deleteSchedule,
    uploadedWorkSchedules,
    saveUploadedWorkSchedule,
    syncUploadedScheduleToCleaners,
  } = useCleaning();

  const shifts = React.useMemo(() => {
    const scoped = getProjectShifts(activeProject?.id);
    return scoped.length > 0 ? scoped : allShifts;
  }, [getProjectShifts, activeProject?.id, activeProject?.shiftIds, allShifts]);

  // Navigation tab: 'schedules' | 'roster' | 'upload'
  const [activeMainTab, setActiveMainTab] = useState<'schedules' | 'roster' | 'upload'>('schedules');

  // Frequency Filter for Schedules
  const [frequencyFilter, setFrequencyFilter] = useState<'all' | 'harian' | 'mingguan' | 'bulanan'>('all');
  const [scheduleList, setScheduleList] = useState<CleaningSchedule[]>(schedules);

  useEffect(() => {
    setScheduleList(schedules);
  }, [schedules]);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Schedule State
  const [newTitle, setNewTitle] = useState('');
  const [newAreaId, setNewAreaId] = useState(areas[0]?.id || '');
  const [newCleanerId, setNewCleanerId] = useState(cleaners[0]?.id || '');
  const [newFrequency, setNewFrequency] = useState<'harian' | 'mingguan' | 'bulanan'>('harian');
  const [newTimeSlot, setNewTimeSlot] = useState('08:00 - 09:00 WIB');
  const [newChecklistText, setNewChecklistText] = useState('Sapu dan pel bersih\nDisinfeksi gagang pintu\nKosongkan tempat sampah');

  // Periode Jadwal / Roster Petugas State
  const today = new Date();
  const [rosterMonth, setRosterMonth] = useState<number>(today.getMonth() + 1);
  const [rosterYear, setRosterYear] = useState<number>(today.getFullYear());
  const [rosterDay, setRosterDay] = useState<'dominant' | number>(() => today.getDate());
  const userPickedRosterPeriodRef = React.useRef(false);
  const [isSyncingCleaners, setIsSyncingCleaners] = useState(false);

  // Auto-focus latest approved schedule period on initial load if current month has none
  useEffect(() => {
    if (userPickedRosterPeriodRef.current || uploadedWorkSchedules.length === 0) return;
    const hasCurrent = uploadedWorkSchedules.some(
      (d) => d.bulan === rosterMonth && d.tahun === rosterYear
    );
    if (!hasCurrent) {
      const latest = [...uploadedWorkSchedules].sort((a, b) =>
        a.updatedAt > b.updatedAt ? -1 : 1
      )[0];
      if (latest) {
        setRosterMonth(latest.bulan);
        setRosterYear(latest.tahun);
        const daysInLatest = latest.daysCount || getDaysInMonth(latest.bulan, latest.tahun);
        if (today.getMonth() + 1 === latest.bulan && today.getFullYear() === latest.tahun) {
          setRosterDay(Math.min(today.getDate(), daysInLatest));
        } else {
          setRosterDay(1);
        }
      }
    }
  }, [uploadedWorkSchedules, rosterMonth, rosterYear]);

  // Roster Search & Filter
  const [rosterSearchQuery, setRosterSearchQuery] = useState('');
  const [rosterShiftFilter, setRosterShiftFilter] = useState<string>('all');

  // Plotingan Modal State
  const [plottingCleaner, setPlottingCleaner] = useState<Cleaner | null>(null);
  const [plottingRosterRow, setPlottingRosterRow] = useState<ParsedScheduleRow | null>(null);
  const [plottingSelectedShiftId, setPlottingSelectedShiftId] = useState<string>('');
  const [selectedAllocationIds, setSelectedAllocationIds] = useState<string[]>([]);
  const [manualPlottingText, setManualPlottingText] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filteredSchedules = scheduleList.filter(
    (s) => frequencyFilter === 'all' || s.frequency === frequencyFilter
  );

  // Resolve Shift 1 (P) and Shift 2 (S) from configured shifts
  const { shift1, shift2 } = React.useMemo(() => resolveShift1AndShift2(shifts), [shifts]);

  // Saved uploaded schedule matching selected Periode Jadwal / Roster Petugas
  const activeRosterDoc = React.useMemo(
    () =>
      uploadedWorkSchedules.find(
        (doc) => doc.bulan === rosterMonth && doc.tahun === rosterYear
      ) || null,
    [uploadedWorkSchedules, rosterMonth, rosterYear]
  );

  const sortedSavedRosterDocs = React.useMemo(
    () =>
      [...uploadedWorkSchedules].sort((a, b) =>
        a.tahun !== b.tahun ? b.tahun - a.tahun : b.bulan - a.bulan
      ),
    [uploadedWorkSchedules]
  );

  const rosterDaysCount = React.useMemo(() => {
    if (activeRosterDoc?.daysCount) return activeRosterDoc.daysCount;
    return getDaysInMonth(rosterMonth, rosterYear);
  }, [activeRosterDoc, rosterMonth, rosterYear]);

  const rosterYearOptions = React.useMemo(() => {
    const base = today.getFullYear();
    const set = new Set<number>(Array.from({ length: 7 }, (_, i) => base - 2 + i));
    set.add(rosterYear);
    uploadedWorkSchedules.forEach((d) => set.add(d.tahun));
    return Array.from(set).sort((a, b) => a - b);
  }, [rosterYear, uploadedWorkSchedules]);

  const activeRosterRows = React.useMemo(() => {
    if (!activeRosterDoc) return null;
    return buildRowsFromEntries(activeRosterDoc.entries || []);
  }, [activeRosterDoc]);

  const effectiveRefDay =
    rosterDay === 'dominant'
      ? undefined
      : Math.max(1, Math.min(rosterDay, rosterDaysCount));

  // Unified roster cards: matches approved Preview Hasil Upload when available, else falls back to cleaners
  const rosterCardItems = React.useMemo(() => {
    if (activeRosterRows) {
      return activeRosterRows.rows.map((row) => {
        const cleanNameLower = row.nama.trim().toLowerCase();
        const matchedCleaner = !row.isSlotKosong
          ? cleaners.find((c) => c.name.trim().toLowerCase() === cleanNameLower) || null
          : null;

        const shiftInfo = resolveRowOperationalShift(row, rosterDaysCount, effectiveRefDay);
        const mappedShift = shiftInfo.effectiveShiftCode === 'S' ? shift2 : shift1;
        const scheduleArea = row.area && row.area !== '-' ? row.area : '';
        const displayArea = matchedCleaner?.workPlotting || scheduleArea || '';

        return {
          key: row.rowId,
          fromSchedule: true,
          row,
          matchedCleaner,
          nama: row.nama,
          isSlotKosong: row.isSlotKosong,
          jabatan: row.jabatan,
          area: displayArea,
          shiftCodeOnDay: shiftInfo.dayCode,
          isOffOnSelectedDay: shiftInfo.isOffOnSelectedDay,
          effectiveShiftCode: shiftInfo.effectiveShiftCode,
          mappedShift,
          countP: shiftInfo.countP,
          countS: shiftInfo.countS,
          countOff: shiftInfo.countOff,
        };
      });
    }

    return cleaners.map((c) => {
      const shiftObj = shifts.find((s) => s.id === c.shiftId);
      const isShift2 =
        shiftObj?.code?.toUpperCase() === 'S2' || /\bshift\s*2\b/i.test(c.shiftName || '');
      const mappedShift = shiftObj || (isShift2 ? shift2 : shift1);

      return {
        key: c.id,
        fromSchedule: false,
        row: null as ParsedScheduleRow | null,
        matchedCleaner: c,
        nama: c.name,
        isSlotKosong: false,
        jabatan: c.role || '',
        area: c.workPlotting || '',
        shiftCodeOnDay: (isShift2 ? 'S' : 'P') as 'P' | 'S' | 'OFF' | '',
        isOffOnSelectedDay: false,
        effectiveShiftCode: (isShift2 ? 'S' : 'P') as 'P' | 'S',
        mappedShift,
        countP: 0,
        countS: 0,
        countOff: 0,
      };
    });
  }, [activeRosterRows, cleaners, shifts, shift1, shift2, rosterDaysCount, effectiveRefDay]);

  const filteredRosterItems = React.useMemo(() => {
    const q = rosterSearchQuery.trim().toLowerCase();
    return rosterCardItems.filter((item) => {
      const matchSearch =
        !q ||
        item.nama.toLowerCase().includes(q) ||
        item.area.toLowerCase().includes(q) ||
        item.jabatan.toLowerCase().includes(q);

      if (!matchSearch) return false;
      if (rosterShiftFilter === 'all') return true;
      if (rosterShiftFilter === 'code_P') return item.shiftCodeOnDay === 'P';
      if (rosterShiftFilter === 'code_S') return item.shiftCodeOnDay === 'S';
      if (rosterShiftFilter === 'code_OFF') return item.isOffOnSelectedDay;
      return item.mappedShift.id === rosterShiftFilter;
    });
  }, [rosterCardItems, rosterSearchQuery, rosterShiftFilter]);

  const handleManualSyncToCleaners = async () => {
    if (!activeRosterDoc) return;
    setIsSyncingCleaners(true);
    try {
      const res = await syncUploadedScheduleToCleaners(activeRosterDoc, effectiveRefDay);
      showToast(
        `Sinkronisasi berhasil: ${res.syncedCount} petugas disinkronkan ke Data Petugas (${res.createdCount} baru, ${res.updatedCount} diperbarui).`
      );
    } catch {
      showToast('Gagal menyinkronkan jadwal ke Data Petugas.');
    } finally {
      setIsSyncingCleaners(false);
    }
  };

  const toggleSchedule = (id: string) => {
    setScheduleList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s))
    );
  };

  const handleAddSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const area = areas.find((a) => a.id === newAreaId);
    const cleaner = cleaners.find((c) => c.id === newCleanerId);

    const newSched: CleaningSchedule = {
      id: `sch-${Date.now()}`,
      title: newTitle,
      areaId: newAreaId,
      areaName: area?.name || 'Area Gedung',
      cleanerId: newCleanerId,
      cleanerName: cleaner?.name || 'Petugas',
      frequency: newFrequency,
      timeSlot: newTimeSlot,
      shiftId: cleaner?.shiftId || 'shift-1',
      checklistTemplates: newChecklistText.split('\n').filter((t) => t.trim()),
      isActive: true,
    };

    setScheduleList([newSched, ...scheduleList]);
    setNewTitle('');
    setShowAddModal(false);
    showToast(`Jadwal rutinitas "${newTitle}" berhasil ditambahkan.`);
  };

  // Plotingan Handlers (Terhubung ke Uraian Tugas & Deskripsi Shift & Jadwal Upload)
  const handleOpenPlottingModal = (
    cleaner: Cleaner | null,
    rosterRow?: ParsedScheduleRow | null,
    defaultShiftId?: string,
    defaultAreaText?: string
  ) => {
    setPlottingRosterRow(rosterRow || null);

    if (cleaner) {
      setPlottingCleaner(cleaner);
      setManualPlottingText(cleaner.workPlotting || defaultAreaText || '');
      const currentShiftId = cleaner.shiftId || defaultShiftId || shifts[0]?.id || '';
      setPlottingSelectedShiftId(currentShiftId);

      const targetShift = shifts.find((s) => s.id === currentShiftId) || shifts[0];
      const initialSelectedIds: string[] = [];
      const areaText = cleaner.workPlotting || defaultAreaText || '';
      if (targetShift?.plottingAllocations && areaText) {
        targetShift.plottingAllocations.forEach((alloc) => {
          if (areaText.toLowerCase().includes(alloc.areaName.toLowerCase())) {
            initialSelectedIds.push(alloc.id);
          }
        });
      }
      setSelectedAllocationIds(initialSelectedIds);
    } else if (rosterRow) {
      // Synthetic placeholder so modal works smoothly even before cleaner record exists
      const fallbackShiftId = defaultShiftId || shift1.id;
      const synthetic: Cleaner = {
        id: '',
        nik: '',
        name: rosterRow.nama,
        phone: '',
        photoUrl: '',
        shiftId: fallbackShiftId,
        shiftName: fallbackShiftId === shift2.id ? shift2.name : shift1.name,
        assignedAreas: [],
        status: 'active',
        rating: 5,
        tasksCompletedToday: 0,
        totalTasksToday: 0,
        isClockedIn: false,
        workPlotting: defaultAreaText || (rosterRow.area !== '-' ? rosterRow.area : ''),
      };
      setPlottingCleaner(synthetic);
      setManualPlottingText(synthetic.workPlotting || '');
      setPlottingSelectedShiftId(fallbackShiftId);
      setSelectedAllocationIds([]);
    }
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

  const handleSaveWorkPlotting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plottingCleaner) return;

    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const finalLocation = manualPlottingText.trim() || 'Lobby & Koridor Utama';
    const selectedShiftObj =
      shifts.find((s) => s.id === plottingSelectedShiftId) ||
      (plottingSelectedShiftId === shift2.id ? shift2 : shift1);

    if (plottingCleaner.id) {
      updateCleaner(plottingCleaner.id, {
        workPlotting: finalLocation,
        workPlottingUpdatedAt: nowTime,
        ...(selectedShiftObj ? { shiftId: selectedShiftObj.id, shiftName: selectedShiftObj.name } : {}),
      });
    } else if (!plottingRosterRow?.isSlotKosong && plottingCleaner.name.trim()) {
      addCleaner({
        nik: '',
        name: plottingCleaner.name.trim(),
        phone: '',
        photoUrl: '',
        shiftId: selectedShiftObj.id,
        shiftName: selectedShiftObj.name,
        assignedAreas: [],
        status: 'active',
        rating: 5,
        tasksCompletedToday: 0,
        totalTasksToday: 0,
        isClockedIn: false,
        attendance: {},
        attendanceByMonth: {},
        workPlotting: finalLocation,
        workPlottingUpdatedAt: nowTime,
      });
    }

    // Keep active uploaded schedule document aligned if edited row came from uploaded schedule
    if (activeRosterDoc && plottingRosterRow) {
      const updatedEntries: UploadedWorkScheduleEntry[] = (activeRosterDoc.entries || []).map((entry) => {
        if (
          entry.nama === plottingRosterRow.nama &&
          entry.jabatan === plottingRosterRow.jabatan &&
          entry.area === plottingRosterRow.area
        ) {
          return { ...entry, area: finalLocation };
        }
        return entry;
      });
      await saveUploadedWorkSchedule({
        bulan: activeRosterDoc.bulan,
        tahun: activeRosterDoc.tahun,
        daysCount: activeRosterDoc.daysCount,
        fileName: activeRosterDoc.fileName,
        entries: updatedEntries,
      }).catch(() => {});
    }

    showToast(`Plotingan lokasi ${plottingCleaner.name} berhasil diubah ke "${finalLocation}".`);
    setPlottingCleaner(null);
    setPlottingRosterRow(null);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-sky-600" />
            Roster Petugas & Penjadwalan Kerja
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manajemen alokasi plotting petugas per shift serta rutinitas harian, mingguan, dan bulanan
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeMainTab === 'schedules' ? (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Jadwal Rutin</span>
            </button>
          ) : activeMainTab === 'roster' ? (
            <div className="text-xs text-slate-500 bg-sky-50 border border-sky-200 px-3 py-1.5 rounded-xl font-medium">
              Terhubung langsung dengan <span className="font-bold text-sky-900">Uraian Tugas Shift</span> & <span className="font-bold text-sky-900">Presensi</span>
            </div>
          ) : (
            <div className="text-xs text-slate-500 bg-sky-50 border border-sky-200 px-3 py-1.5 rounded-xl font-medium">
              Import Roster Bulanan (.xlsx, .xls, .csv) &amp; Rekap Shift Otomatis
            </div>
          )}
        </div>
      </div>

      {/* Main Tab Selector */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2 text-xs">
        <button
          onClick={() => setActiveMainTab('schedules')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeMainTab === 'schedules'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ListChecks className="w-4 h-4" />
          <span>Jadwal Rutinitas SOP ({scheduleList.length})</span>
        </button>

        <button
          onClick={() => setActiveMainTab('roster')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeMainTab === 'roster'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Roster Petugas & Plotingan Kerja ({rosterCardItems.length})</span>
        </button>

        <button
          onClick={() => setActiveMainTab('upload')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeMainTab === 'upload'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Upload Jadwal Kerja</span>
        </button>
      </div>

      {/* TAB 3: UPLOAD JADWAL KERJA */}
      {activeMainTab === 'upload' && (
        <UploadJadwalKerjaSection
          onScheduleSaved={(savedBulan, savedTahun) => {
            userPickedRosterPeriodRef.current = true;
            setRosterMonth(savedBulan);
            setRosterYear(savedTahun);
            const daysInSaved = getDaysInMonth(savedBulan, savedTahun);
            if (today.getMonth() + 1 === savedBulan && today.getFullYear() === savedTahun) {
              setRosterDay(Math.min(today.getDate(), daysInSaved));
            } else {
              setRosterDay(1);
            }
          }}
        />
      )}

      {/* TAB 1: JADWAL RUTINITAS SOP */}
      {activeMainTab === 'schedules' && (
        <div className="space-y-4">
          {/* Frequency Filter Tabs */}
          <div className="flex items-center gap-2 text-xs">
            {[
              { id: 'all', label: 'Semua Jadwal' },
              { id: 'harian', label: 'Harian (Daily Routine)' },
              { id: 'mingguan', label: 'Mingguan (Weekly Routine)' },
              { id: 'bulanan', label: 'Bulanan (Monthly Deep Clean)' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFrequencyFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  frequencyFilter === tab.id
                    ? 'bg-sky-50 text-sky-700 font-bold shadow-xs border border-sky-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Schedules List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSchedules.map((item) => {
              const freqBadge = {
                harian: { label: 'Harian', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
                mingguan: { label: 'Mingguan', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
                bulanan: { label: 'Bulanan', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
              }[item.frequency];

              const assignedCleaner = cleaners.find((c) => c.id === item.cleanerId || c.name === item.cleanerName);

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl bg-white border transition-all shadow-xs flex flex-col justify-between ${
                    item.isActive ? 'border-slate-200 hover:border-slate-300' : 'border-slate-200 opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${freqBadge.bg}`}
                      >
                        {freqBadge.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <label className="relative inline-flex items-center cursor-pointer" title="Aktif / Nonaktif">
                          <input
                            type="checkbox"
                            checked={item.isActive}
                            onChange={() => toggleSchedule(item.id)}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-sky-600"></div>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            deleteSchedule(item.id);
                            setScheduleList((prev) => prev.filter((s) => s.id !== item.id));
                            showToast(`Jadwal "${item.title}" berhasil dihapus.`);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Jadwal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 mt-2">{item.title}</h3>

                    <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-800">{item.areaName}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <span className="text-slate-700">{item.timeSlot}</span>
                      </div>

                      <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-slate-700 font-semibold">{item.cleanerName}</span>
                        </div>
                        {assignedCleaner?.workPlotting && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 font-bold border border-sky-200 flex items-center gap-1 truncate max-w-[150px]">
                            <span>📍</span>
                            <span className="truncate">{assignedCleaner.workPlotting}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* SOP Checklist Templates preview */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Standard Checklist SOP ({item.checklistTemplates.length}):
                      </span>
                      <ul className="space-y-1">
                        {item.checklistTemplates.slice(0, 3).map((tpl, i) => (
                          <li key={i} className="text-[11px] text-slate-600 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                            <span className="truncate">{tpl}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Status: {item.isActive ? 'Aktif Terjadwal' : 'Dinonaktifkan'}</span>
                    <span className="font-semibold text-sky-600 cursor-pointer hover:underline">
                      Edit Checklist &rarr;
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: ROSTER PETUGAS & PLOTINGAN KERJA PER SHIFT */}
      {activeMainTab === 'roster' && (
        <div className="space-y-4">
          {/* Periode Jadwal / Roster Petugas & Sync Bar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-sky-600" />
                  Periode Jadwal / Roster Petugas
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Menampilkan roster hasil <strong>Upload Jadwal Kerja</strong> yang sudah disetujui/disimpan &amp; sinkron dengan Data Petugas (P = Shift 1, S = Shift 2).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-600">Bulan:</span>
                  <select
                    aria-label="Bulan Periode Roster"
                    value={rosterMonth}
                    onChange={(e) => {
                      userPickedRosterPeriodRef.current = true;
                      const m = Number(e.target.value);
                      setRosterMonth(m);
                      if (typeof rosterDay === 'number') {
                        setRosterDay(Math.min(rosterDay, getDaysInMonth(m, rosterYear)));
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    {MONTH_NAMES_ID.map((name, idx) => (
                      <option key={name} value={idx + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-600">Tahun:</span>
                  <select
                    aria-label="Tahun Periode Roster"
                    value={rosterYear}
                    onChange={(e) => {
                      userPickedRosterPeriodRef.current = true;
                      const y = Number(e.target.value);
                      setRosterYear(y);
                      if (typeof rosterDay === 'number') {
                        setRosterDay(Math.min(rosterDay, getDaysInMonth(rosterMonth, y)));
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    {rosterYearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-600">Acuan Tanggal:</span>
                  <select
                    aria-label="Tanggal Acuan Shift Roster"
                    value={rosterDay}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRosterDay(val === 'dominant' ? 'dominant' : Number(val));
                    }}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="dominant">Dominan Bulan Ini</option>
                    {Array.from({ length: rosterDaysCount }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        Tgl {String(d).padStart(2, '0')} ({getIndonesianDayCode(rosterMonth, rosterYear, d)})
                      </option>
                    ))}
                  </select>
                </div>

                {activeRosterDoc && (
                  <button
                    type="button"
                    onClick={handleManualSyncToCleaners}
                    disabled={isSyncingCleaners}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCleaners ? 'animate-spin' : ''}`} />
                    <span>{isSyncingCleaners ? 'Menyinkronkan...' : 'Sinkronkan ke Data Petugas'}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px]">
              <div className="flex items-center gap-2 flex-wrap">
                {activeRosterDoc ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Sumber: Jadwal Upload Disetujui ({MONTH_NAMES_ID[rosterMonth - 1]} {rosterYear}) • {rosterCardItems.length} Baris
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                    Belum ada jadwal upload tersimpan untuk {MONTH_NAMES_ID[rosterMonth - 1]} {rosterYear}
                  </span>
                )}
              </div>

              {sortedSavedRosterDocs.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-slate-400 font-semibold">Periode Tersimpan:</span>
                  {sortedSavedRosterDocs.map((doc) => {
                    const isActive = doc.bulan === rosterMonth && doc.tahun === rosterYear;
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => {
                          userPickedRosterPeriodRef.current = true;
                          setRosterMonth(doc.bulan);
                          setRosterYear(doc.tahun);
                          if (typeof rosterDay === 'number') {
                            setRosterDay(Math.min(rosterDay, doc.daysCount || getDaysInMonth(doc.bulan, doc.tahun)));
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer border ${
                          isActive
                            ? 'bg-sky-600 text-white border-sky-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {MONTH_NAMES_ID[doc.bulan - 1]?.slice(0, 3)} {doc.tahun}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Search & Shift Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={rosterSearchQuery}
                onChange={(e) => setRosterSearchQuery(e.target.value)}
                placeholder="Cari nama petugas, jabatan, atau area..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-500 font-medium">Filter Shift:</span>
              <select
                value={rosterShiftFilter}
                onChange={(e) => setRosterShiftFilter(e.target.value)}
                className="text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
              >
                <option value="all">Semua Shift</option>
                <option value="code_P">P — {shift1.name}</option>
                <option value="code_S">S — {shift2.name}</option>
                {activeRosterDoc && <option value="code_OFF">OFF — Libur (Tanggal Dipilih)</option>}
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.startTime} - {s.endTime} WIB)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Empty state */}
          {filteredRosterItems.length === 0 ? (
            <div className="p-10 rounded-2xl bg-white border border-dashed border-slate-200 text-center space-y-2">
              <Users className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-700">
                Belum ada data Roster Petugas untuk periode {MONTH_NAMES_ID[rosterMonth - 1]} {rosterYear}.
              </p>
              <p className="text-[11px] text-slate-500">
                Unggah dan simpan jadwal kerja di tab{' '}
                <button
                  type="button"
                  onClick={() => setActiveMainTab('upload')}
                  className="text-sky-600 font-bold hover:underline cursor-pointer"
                >
                  Upload Jadwal Kerja
                </button>{' '}
                agar daftar roster tampil otomatis di sini dan tersinkron ke Data Petugas.
              </p>
            </div>
          ) : (
            /* Roster Cards List */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRosterItems.map((item) => {
                const shiftObj = item.mappedShift;
                const shiftAllocations =
                  shifts.find((s) => s.id === shiftObj?.id)?.plottingAllocations || [];

                return (
                  <div
                    key={item.key}
                    className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-3">
                      {/* Header: Cleaner info & Shift */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center shrink-0">
                            <User className="w-5 h-5 text-slate-500" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 truncate">
                              {item.isSlotKosong ? (
                                <span className="italic text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                  Slot Kosong
                                </span>
                              ) : (
                                item.nama
                              )}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              {item.jabatan && item.jabatan !== '-' && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                                  {item.jabatan}
                                </span>
                              )}
                              {item.matchedCleaner?.phone && (
                                <span className="text-[10px] text-slate-500">
                                  {item.matchedCleaner.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border"
                            style={{
                              backgroundColor: `${shiftObj?.color || '#0284c7'}15`,
                              color: shiftObj?.color || '#0284c7',
                              borderColor: `${shiftObj?.color || '#0284c7'}40`,
                            }}
                          >
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: shiftObj?.color || '#0284c7' }}
                            />
                            {shiftObj?.name}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {shiftObj?.startTime} - {shiftObj?.endTime} WIB
                          </span>
                          {item.fromSchedule && (
                            <span
                              className={`inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded mt-1 border ${
                                item.shiftCodeOnDay === 'P'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : item.shiftCodeOnDay === 'S'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                            >
                              {item.shiftCodeOnDay === 'P'
                                ? 'Kode P (Shift 1)'
                                : item.shiftCodeOnDay === 'S'
                                ? 'Kode S (Shift 2)'
                                : 'OFF (Libur)'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Plotingan Kerja Section */}
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-150 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-sky-600" />
                            Alokasi Plotingan Tugas &amp; Area:
                          </span>
                          {item.matchedCleaner?.workPlottingUpdatedAt && (
                            <span className="text-[9px] text-slate-400">
                              Update: {item.matchedCleaner.workPlottingUpdatedAt}
                            </span>
                          )}
                        </div>

                        <p className="text-xs font-bold text-slate-800 leading-relaxed">
                          {item.area || 'Belum ada alokasi tugas spesifik'}
                        </p>

                        {item.fromSchedule ? (
                          <p className="text-[10px] text-slate-500">
                            Rekap Bulan Ini: <strong className="text-emerald-700">P: {item.countP}</strong> •{' '}
                            <strong className="text-amber-700">S: {item.countS}</strong> •{' '}
                            <strong className="text-rose-700">OFF: {item.countOff}</strong>
                          </p>
                        ) : (
                          <p className="text-[10px] text-slate-400">
                            Shift ini memiliki {shiftAllocations.length} alokasi tugas standar pada master shift.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Footer Action: Ganti Plotingan Button */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      {item.isSlotKosong ? (
                        <span className="text-[10px] text-slate-500 italic">Slot Kosong (Roster)</span>
                      ) : item.matchedCleaner ? (
                        <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Tersinkron Data Petugas
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-600 font-semibold">
                          Belum disinkronkan
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          handleOpenPlottingModal(
                            item.matchedCleaner,
                            item.row,
                            shiftObj?.id,
                            item.area
                          )
                        }
                        className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs border border-sky-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Ganti Plotingan</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 1: TAMBAH JADWAL RUTIN                                 */}
      {/* ============================================================ */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Tambah Jadwal Rutinitas Baru</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSchedule} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Judul Rutinitas</label>
                <input
                  type="text"
                  placeholder="Misal: Sanitasi Kloset & Refill Sabun Lt. 2"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Area Lokasi</label>
                  <select
                    value={newAreaId}
                    onChange={(e) => setNewAreaId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white cursor-pointer"
                  >
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.floor})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Frekuensi</label>
                  <select
                    value={newFrequency}
                    onChange={(e) => setNewFrequency(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white cursor-pointer"
                  >
                    <option value="harian">Harian (Daily)</option>
                    <option value="mingguan">Mingguan (Weekly)</option>
                    <option value="bulanan">Bulanan (Monthly)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Petugas Pelaksana</label>
                  <select
                    value={newCleanerId}
                    onChange={(e) => setNewCleanerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white cursor-pointer"
                  >
                    {cleaners.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jam Pelaksanaan</label>
                  <input
                    type="text"
                    value={newTimeSlot}
                    onChange={(e) => setNewTimeSlot(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Item Checklist SOP (Pisahkan dengan baris baru)
                </label>
                <textarea
                  rows={3}
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs resize-none focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold cursor-pointer shadow-xs"
                >
                  Simpan Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: GANTI PLOTINGAN PETUGAS PADA ROSTER                 */}
      {/* ============================================================ */}
      {plottingCleaner && (() => {
        const availableModalShifts = shifts.length > 0 ? shifts : [shift1, shift2];
        const activeShift =
          availableModalShifts.find((s) => s.id === plottingSelectedShiftId) || availableModalShifts[0];
        const shiftAllocations =
          shifts.find((s) => s.id === activeShift?.id)?.plottingAllocations || [];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Ganti Alokasi Plotingan Tugas
                    </h3>
                    <p className="text-xs text-slate-500">
                      Petugas: <span className="font-bold text-slate-800">{plottingCleaner.name}</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPlottingCleaner(null);
                    setPlottingRosterRow(null);
                  }}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
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
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none bg-slate-50/50 cursor-pointer"
                  >
                    {availableModalShifts.map((s) => (
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
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setPlottingCleaner(null)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
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
