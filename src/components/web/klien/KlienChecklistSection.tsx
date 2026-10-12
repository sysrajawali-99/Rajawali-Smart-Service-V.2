import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardList,
  Calendar,
  Clock,
  CheckCircle2,
  Building2,
  ChevronDown,
  FileDown,
  ShieldCheck,
  MapPin,
  Smartphone,
  Table,
  Eye,
} from 'lucide-react';
import { useCleaning } from '../../../context/CleaningContext';
import { renderParameterIcon } from '../../common/ChecklistParameterIcons';
import {
  exportChecklistToPDF,
  getProjectKop,
  toBKRCode,
} from '../../../utils/pdfExport';
import {
  STANDARD_TOILET_PARAMETERS,
  findMatchingSlotItem,
  calculateShiftChecklistStats,
} from '../../../utils/checklistHelper';

interface ShiftSlotDefinition {
  hour: number;
  dateStr: string;
  isNextDay: boolean;
  timeLabel: string;
}

export const KlienChecklistSection: React.FC = () => {
  const {
    activeProject,
    checklistLocations,
    getOrCreateDailyChecklist,
    ensureDailyChecklist,
    shifts,
    companyProfile,
  } = useCleaning();

  const [selectedDate, setSelectedDate] = useState('2026-09-13');
  const [selectedLocationId, setSelectedLocationId] = useState<string>(
    checklistLocations[0]?.id || 'cloc-1'
  );
  const [selectedShiftId, setSelectedShiftId] = useState<string>('shift-1');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Synchronize selectedLocationId when active project changes or checklist locations update
  useEffect(() => {
    if (checklistLocations.length > 0) {
      const exists = checklistLocations.some((loc) => loc.id === selectedLocationId);
      if (!exists) {
        setSelectedLocationId(checklistLocations[0].id);
      }
    }
  }, [checklistLocations, selectedLocationId]);

  const currentLocation =
    checklistLocations.find((l) => l.id === selectedLocationId) ||
    checklistLocations[0];

  useEffect(() => {
    if (activeProject?.id && currentLocation?.id && selectedDate) {
      ensureDailyChecklist(activeProject.id, currentLocation.id, selectedDate);
    }
  }, [activeProject?.id, currentLocation?.id, selectedDate, ensureDailyChecklist]);

  const currentDailyChecklist = currentLocation
    ? getOrCreateDailyChecklist(activeProject.id, currentLocation.id, selectedDate)
    : null;

  // Helper date formatter (DD/MM/YYYY) with optional day offset
  const computeDateFormatted = (dateInput: string, offsetDays = 0): string => {
    const parts = dateInput.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10) + offsetDays;
      const dateObj = new Date(y, m, d);
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const yyyy = dateObj.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }
    return dateInput;
  };

  // Indonesian long date display
  const formattedSelectedDate = useMemo(() => {
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  const activeShift = shifts.find((s) => s.id === selectedShiftId);

  // Dynamically compute the time slots and corresponding dates based on the selected shift
  const shiftSlotDefs = useMemo<ShiftSlotDefinition[]>(() => {
    const curDateStr = computeDateFormatted(selectedDate, 0);
    const nextDateStr = computeDateFormatted(selectedDate, 1);

    if (selectedShiftId === 'all_24' || !activeShift) {
      return Array.from({ length: 24 }, (_, h) => {
        const hStr = h.toString().padStart(2, '0');
        const nextHStr = ((h + 1) === 24 ? 24 : (h + 1) % 24).toString().padStart(2, '0');
        return {
          hour: h,
          dateStr: curDateStr,
          isNextDay: false,
          timeLabel: `${hStr}.00 - ${nextHStr}.00`,
        };
      });
    }

    const startH = parseInt((activeShift.startTime || '07:00').split(':')[0], 10) || 0;
    const endH = parseInt((activeShift.endTime || '15:00').split(':')[0], 10) || 0;

    const defs: ShiftSlotDefinition[] = [];

    if (startH === endH) {
      for (let h = 0; h < 24; h++) {
        const hStr = h.toString().padStart(2, '0');
        const nextHStr = ((h + 1) === 24 ? 24 : (h + 1) % 24).toString().padStart(2, '0');
        defs.push({
          hour: h,
          dateStr: curDateStr,
          isNextDay: false,
          timeLabel: `${hStr}.00 - ${nextHStr}.00`,
        });
      }
    } else if (startH < endH) {
      for (let h = startH; h < endH; h++) {
        const hStr = h.toString().padStart(2, '0');
        const nextHStr = (h + 1).toString().padStart(2, '0');
        defs.push({
          hour: h,
          dateStr: curDateStr,
          isNextDay: false,
          timeLabel: `${hStr}.00 - ${nextHStr}.00`,
        });
      }
    } else {
      for (let h = startH; h < 24; h++) {
        const hStr = h.toString().padStart(2, '0');
        const nextHStr = (h + 1 === 24 ? 24 : h + 1).toString().padStart(2, '0');
        defs.push({
          hour: h,
          dateStr: curDateStr,
          isNextDay: false,
          timeLabel: `${hStr}.00 - ${nextHStr}.00`,
        });
      }
      for (let h = 0; h < endH; h++) {
        const hStr = h.toString().padStart(2, '0');
        const nextHStr = (h + 1).toString().padStart(2, '0');
        defs.push({
          hour: h,
          dateStr: nextDateStr,
          isNextDay: true,
          timeLabel: `${hStr}.00 - ${nextHStr}.00`,
        });
      }
    }

    return defs;
  }, [selectedShiftId, activeShift, selectedDate]);

  const shiftSlotHours = useMemo(() => shiftSlotDefs.map((d) => d.hour), [shiftSlotDefs]);

  const standardToiletHeaders = STANDARD_TOILET_PARAMETERS.map((param) => ({
    key: param.key,
    id: param.id,
    name: param.name,
    icon: renderParameterIcon(param.name, 18, 'text-sky-700'),
  }));

  const firstSlot = currentDailyChecklist?.hourlySlots[0];
  const isToiletCategory = currentLocation?.category === 'toilet';

  const tableColumns = isToiletCategory
    ? standardToiletHeaders
    : (firstSlot?.items || []).slice(0, 11).map((it) => ({
        key: it.itemId,
        id: it.itemId,
        name: it.itemName,
        icon: renderParameterIcon(it.itemName, 18, 'text-sky-700'),
      }));

  // Hourly slots matching active shift with date and time metadata
  const displayedSlotsWithMeta = useMemo(() => {
    return shiftSlotDefs.map((def) => {
      const rawSlot = currentDailyChecklist?.hourlySlots.find((s) => s.hour === def.hour);
      if (rawSlot) {
        return {
          ...rawSlot,
          timeLabel: def.timeLabel,
          dateStr: def.dateStr,
          isNextDay: def.isNextDay,
        };
      }
      return {
        hour: def.hour,
        hourLabel: def.timeLabel,
        timeLabel: def.timeLabel,
        dateStr: def.dateStr,
        isNextDay: def.isNextDay,
        status: 'pending' as const,
        checkedBy: '',
        supervisorVerified: false,
        items: [],
      };
    });
  }, [shiftSlotDefs, currentDailyChecklist]);

  // Stats calculation matching Inspeksi Report / Ceklist Kebersihan Area
  const {
    totalSlots,
    cleanSlots,
    dirtyFindingsCount,
    cleanlinessRate,
  } = useMemo(
    () => calculateShiftChecklistStats(displayedSlotsWithMeta, tableColumns),
    [displayedSlotsWithMeta, tableColumns]
  );

  const handleDownloadPDF = () => {
    if (!currentDailyChecklist || !currentLocation) return;
    setIsDownloadingPdf(true);

    const slotDateMap: Record<number, string> = {};
    shiftSlotDefs.forEach((def) => {
      slotDateMap[def.hour] = def.dateStr;
    });

    try {
      exportChecklistToPDF({
        dailyChecklist: currentDailyChecklist,
        location: currentLocation,
        project: activeProject,
        kopSurat: getProjectKop(activeProject, companyProfile),
        allowedHours: shiftSlotHours,
        shiftName: activeShift ? activeShift.name : '24 Jam Penuh',
        shiftHoursText: activeShift
          ? `${activeShift.startTime} - ${activeShift.endTime} WIB (${activeShift.durationText || `${activeShift.workHoursDuration || 8} Jam`})`
          : '00:00 - 24:00 WIB (24 Jam Penuh)',
        slotDateMap,
      });
    } catch (err) {
      console.error('Error exporting checklist PDF:', err);
    } finally {
      setTimeout(() => setIsDownloadingPdf(false), 800);
    }
  };

  return (
    <div className="space-y-5">
      {/* FILTER & SETUP BAR DARI MENU INSPEKSI REPORT / CEKLIST KEBERSIHAN AREA */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
        {/* Keterangan Header (Disembunyikan saat diakses menggunakan ponsel) */}
        <div className="hidden md:flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-sky-600" />
              <span>Informasi Ceklist Kebersihan Area Proyek</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Data terintegrasi langsung dari menu Inspeksi Report / Ceklist Kebersihan Area
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isDownloadingPdf}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-60 cursor-pointer shrink-0"
          >
            <FileDown className="w-4 h-4" />
            <span>{isDownloadingPdf ? 'Menyiapkan PDF...' : 'Download PDF Ceklist'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {/* 1. DROPDOWN AREA PROYEK (DARI CEKLIST KEBERSIHAN AREA) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                <span>Area Proyek:</span>
              </label>
              <span className="hidden md:inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                {checklistLocations.length} Area Terdaftar
              </span>
            </div>
            <div className="relative">
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                aria-label="Pilih Area Proyek"
                className="w-full pl-3 pr-8 py-2 bg-emerald-50/50 border border-emerald-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 appearance-none cursor-pointer"
              >
                {checklistLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.floor})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-emerald-700 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="hidden md:block text-[10.5px] text-slate-500 truncate">
              Kategori: <strong className="capitalize">{currentLocation?.category || 'Toilet'}</strong> • Kode: {currentLocation?.code || '-'}
            </p>
          </div>

          {/* 2. PILIHAN JAM KERJA / SHIFT */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Shift & Waktu:</span>
              </label>
              <span className="hidden md:inline-block text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                {shiftSlotHours.length} Jam Aktif
              </span>
            </div>
            <div className="relative">
              <select
                value={selectedShiftId}
                onChange={(e) => setSelectedShiftId(e.target.value)}
                aria-label="Pilih Shift dan Waktu"
                className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500 appearance-none cursor-pointer"
              >
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.startTime} - {s.endTime} WIB • {s.durationText || `${s.workHoursDuration || 8} Jam`})
                  </option>
                ))}
                <option value="all_24">
                  Semua Jam (24 Jam Penuh: 00:00 - 24:00 WIB)
                </option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="hidden md:block text-[10.5px] text-slate-500 truncate">
              {activeShift
                ? `${activeShift.description || 'Pembersihan operasional'}`
                : 'Pemantauan checklist kebersihan 24 jam penuh'}
            </p>
          </div>

          {/* 3. PILIHAN TANGGAL CEKLIST */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-sky-700" />
                <span>Tanggal Ceklist:</span>
              </label>
              <button
                type="button"
                onClick={() => setSelectedDate('2026-09-13')}
                className="hidden md:inline-block text-[10px] font-semibold text-slate-500 hover:text-sky-700 underline cursor-pointer"
              >
                Default (13 Sep)
              </button>
            </div>
            <div className="relative flex items-center">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <p className="hidden md:block text-[10.5px] text-slate-500 truncate">
              {formattedSelectedDate}
            </p>
          </div>
        </div>
      </div>

      {/* 4 KPI STAT CARDS DARI MENU CEKLIST KEBERSIHAN AREA */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-semibold block">
              Total Slot Ditampilkan
            </span>
            <span className="text-[15px] font-bold text-slate-800">
              {totalSlots} Jam ({activeShift ? activeShift.name.split('(')[0].trim() : '24 Jam'})
            </span>
          </div>
          <Clock className="w-6 h-6 text-slate-300 shrink-0" />
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-emerald-600 font-semibold block">
              Status Bersih (B)
            </span>
            <span className="text-lg font-bold text-emerald-700">{cleanSlots} Jam</span>
          </div>
          <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-xs shrink-0">
            B
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-rose-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-rose-600 font-semibold block">
              Temuan Kotor (K)
            </span>
            <span className="text-lg font-bold text-rose-700">{dirtyFindingsCount} Kali</span>
          </div>
          <span className="w-7 h-7 rounded-lg bg-rose-100 text-rose-800 font-black flex items-center justify-center text-xs shrink-0">
            K
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-sky-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-sky-600 font-semibold block">
              Tingkat Kebersihan
            </span>
            <span className="text-lg font-bold text-sky-800">{cleanlinessRate}%</span>
          </div>
          <ShieldCheck className="w-6 h-6 text-sky-400 shrink-0" />
        </div>
      </div>

      {/* TABEL CEKLIST RESMI (Selalu tampil di semua perangkat dengan mode tabel resmi; keterangan di atas tabel disembunyikan pada ponsel) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Keterangan di atas ceklist (Disembunyikan saat diakses menggunakan ponsel) */}
        <div className="hidden md:flex p-4 border-b border-slate-200 bg-slate-50/60 flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold">
              📍 {currentLocation?.name} ({currentLocation?.floor})
            </span>
            <span className="px-2.5 py-1 bg-sky-50 text-sky-800 border border-sky-200 rounded-lg text-xs font-bold">
              🕒 {activeShift ? `${activeShift.name} (${activeShift.startTime} - ${activeShift.endTime} WIB)` : '24 Jam Penuh'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 text-white text-xs font-bold shadow-xs">
            <Table className="w-3.5 h-3.5" />
            <span>Mode Tabel Resmi</span>
          </div>
        </div>

        <div className="p-3 sm:p-4 space-y-4">
          <div className="border border-slate-300 rounded-xl overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-center text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 divide-x divide-slate-200 text-slate-900">
                  <th className="px-2.5 py-2.5 w-24 text-center font-bold text-[11px] align-middle bg-slate-200/60 whitespace-nowrap">
                    Tanggal
                  </th>
                  <th className="px-2.5 py-2.5 w-28 text-center font-bold text-[11px] align-middle bg-slate-200/60 whitespace-nowrap">
                    Jam
                  </th>
                  {tableColumns.map((col) => (
                    <th
                      key={col.key}
                      className="px-2 py-2.5 min-w-[68px] sm:min-w-[76px] text-center align-middle"
                      title={col.name}
                    >
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center shrink-0 shadow-2xs">
                          {col.icon}
                        </div>
                        <span className="text-[10px] sm:text-[10.5px] font-bold leading-none text-slate-800 whitespace-nowrap">
                          {col.name}
                        </span>
                      </div>
                    </th>
                  ))}
                  <th className="px-2.5 py-2.5 w-28 text-center font-bold text-[11px] align-middle bg-slate-200/60 whitespace-nowrap">
                    Pengawas
                  </th>
                  <th className="px-2 py-2.5 w-14 text-center font-bold text-[11px] align-middle bg-slate-200/60 whitespace-nowrap">
                    Paraf
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {displayedSlotsWithMeta.map((slot) => (
                  <tr
                    key={`${slot.hour}-${slot.dateStr}`}
                    className="divide-x divide-slate-200 hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="p-1.5 text-[10.5px] font-medium text-slate-700 whitespace-nowrap">
                      {slot.dateStr}
                    </td>
                    <td className="p-1.5 text-[10.5px] font-bold text-slate-900 whitespace-nowrap bg-slate-50/70">
                      {slot.timeLabel}
                    </td>
                    {tableColumns.map((col) => {
                      const matchedItem =
                        findMatchingSlotItem(slot.items, col.key) ||
                        findMatchingSlotItem(slot.items, col.name);
                      const currentVal = matchedItem ? toBKRCode(matchedItem.status) : '-';

                      return (
                        <td key={col.key} className="p-1">
                          <div className="flex items-center justify-center">
                            {currentVal === 'B' ? (
                              <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300 font-black text-[11px] flex items-center justify-center">
                                B
                              </span>
                            ) : currentVal === 'K' ? (
                              <span className="w-6 h-6 rounded-md bg-rose-100 text-rose-900 border border-rose-300 font-black text-[11px] flex items-center justify-center">
                                K
                              </span>
                            ) : currentVal === 'R' ? (
                              <span className="w-6 h-6 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-black text-[11px] flex items-center justify-center">
                                R
                              </span>
                            ) : (
                              <span className="w-6 h-6 rounded-md bg-slate-50 text-slate-300 border border-dashed border-slate-200 font-bold text-[11px] flex items-center justify-center">
                                -
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td className="p-1.5 text-[11px] font-medium text-slate-700">
                      {slot.checkedBy || '-'}
                    </td>
                    <td className="p-1.5 text-center">
                      {slot.status !== 'pending' || slot.supervisorVerified ? (
                        <span className="inline-flex w-5 h-5 items-center justify-center rounded bg-sky-100 text-sky-800 font-bold text-[11px]">
                          ✓
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Keterangan Kode B / K / R */}
          <div className="flex items-center flex-nowrap gap-2 sm:gap-4 text-[11px] sm:text-xs text-slate-600 pt-1 whitespace-nowrap">
            <span className="font-bold text-slate-700 shrink-0">Keterangan Status:</span>
            <span className="inline-flex items-center gap-1 sm:gap-1.5 shrink-0">
              <span className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-black text-[10px] sm:text-[11px] flex items-center justify-center">
                B
              </span>
              <span>Bersih</span>
            </span>
            <span className="inline-flex items-center gap-1 sm:gap-1.5 shrink-0">
              <span className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-rose-100 text-rose-800 border border-rose-300 font-black text-[10px] sm:text-[11px] flex items-center justify-center">
                K
              </span>
              <span>Kotor</span>
            </span>
            <span className="inline-flex items-center gap-1 sm:gap-1.5 shrink-0">
              <span className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-amber-100 text-amber-800 border border-amber-300 font-black text-[10px] sm:text-[11px] flex items-center justify-center">
                R
              </span>
              <span>Rusak</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
