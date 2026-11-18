import {
  AttendanceStatusCode,
  Cleaner,
  Shift,
  UploadedWorkScheduleDocument,
} from '../types';
import {
  MONTH_NAMES_ID,
  buildRowsFromEntries,
  getDaysInMonth,
  resolveRowOperationalShift,
  resolveShift1AndShift2,
} from './workScheduleExcel';

export interface DailyRosterPersonStatus {
  key: string;
  cleaner: Cleaner | null;
  nama: string;
  nik: string;
  jabatan: string;
  isSlotKosong: boolean;
  hasRosterForMonth: boolean;
  rosterShiftCode: 'P' | 'S' | 'OFF' | '';
  isScheduledOffOnDate: boolean;
  assignedShiftId: string;
  assignedShiftName: string;
  assignedShiftCode: string;
  assignedShiftColor: string;
  plottingArea: string;
  plottingSource: 'shift_plotting' | 'roster' | 'none';
  plottingUpdatedAt?: string;
  attendanceStatus: AttendanceStatusCode;
  attendanceLabel: string;
  isPresentWorking: boolean;
}

export interface ManpowerMandaySummary {
  selectedDate: string;
  year: number;
  month: number;
  day: number;
  monthKey: string;
  monthLabel: string;
  daysInMonth: number;
  hasRosterForMonth: boolean;
  rosterDocId?: string;
  allItems: DailyRosterPersonStatus[];
  items: DailyRosterPersonStatus[];
  shiftCountsOnDate: Record<string, number>;
  totalScheduledOnDate: number;
  totalPersonnelInScope: number;
  plottedCountOnDate: number;
  unplottedCountOnDate: number;
  hadirCount: number;
  lemburCount: number;
  workingPresentCount: number;
  izinCount: number;
  alphaCount: number;
  offCount: number;
  attendanceRatePercent: number;
  targetMonthManday: number;
  targetToDateManday: number;
  realizedToDateManday: number;
  varianceToDateManday: number;
  surplusToDateManday: number;
  mandayFulfillmentPercent: number;
  mandayMonthlyProgressPercent: number;
}

export function getAttendanceStatusLabel(code: AttendanceStatusCode): string {
  switch (code) {
    case 'H':
      return 'Hadir';
    case 'L':
      return 'Lembur';
    case 'I':
      return 'Izin';
    case 'S':
      return 'Sakit';
    case 'A':
      return 'Alpa';
    case '-':
    default:
      return 'Off / Libur';
  }
}

export function parseIsoDateParts(
  isoDate: string,
  fallbackNow: Date = new Date()
): { year: number; month: number; day: number; monthKey: string; daysInMonth: number; safeIso: string } {
  const match = String(isoDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  let year = fallbackNow.getFullYear();
  let month = fallbackNow.getMonth() + 1;
  let day = fallbackNow.getDate();

  if (match) {
    const y = Number(match[1]);
    const m = Number(match[2]);
    const d = Number(match[3]);
    if (y >= 2000 && y <= 2100 && m >= 1 && m <= 12) {
      year = y;
      month = m;
      const maxD = getDaysInMonth(month, year);
      day = Math.max(1, Math.min(d, maxD));
    }
  }

  const daysInMonth = getDaysInMonth(month, year);
  day = Math.max(1, Math.min(day, daysInMonth));
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const safeIso = `${monthKey}-${String(day).padStart(2, '0')}`;
  return { year, month, day, monthKey, daysInMonth, safeIso };
}

export function resolveCleanerAttendanceOnDay(
  cleaner: Cleaner | null | undefined,
  year: number,
  month: number,
  day: number,
  now: Date = new Date()
): AttendanceStatusCode {
  if (!cleaner) return '-';
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const fromMonth = cleaner.attendanceByMonth?.[monthKey]?.[day];
  if (fromMonth) return fromMonth;

  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
  const hasAnyMonthMap =
    Boolean(cleaner.attendanceByMonth && Object.keys(cleaner.attendanceByMonth).length > 0);

  if (!hasAnyMonthMap || (isCurrentMonth && !cleaner.attendanceByMonth?.[monthKey])) {
    const legacy = cleaner.attendance?.[day];
    if (legacy) return legacy;
  }

  const isToday = isCurrentMonth && now.getDate() === day;
  if (isToday && cleaner.isClockedIn) {
    return 'H';
  }

  return '-';
}

function normalizeUpper(val: unknown): string {
  return String(val ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function resolveCleanerFallbackShift(cleaner: Cleaner, shifts: Shift[]) {
  const found =
    shifts.find((s) => s.id === cleaner.shiftId) ||
    shifts.find((s) => s.name?.toLowerCase() === (cleaner.shiftName || '').toLowerCase()) ||
    shifts[0];

  if (found) {
    return {
      id: found.id,
      name: found.name,
      code: found.code || 'S',
      color: found.color || '#0284c7',
    };
  }

  return {
    id: cleaner.shiftId || 'shift-1',
    name: cleaner.shiftName || 'Shift 1 ( satu )',
    code: 'S1',
    color: '#0284c7',
  };
}

export function deriveManpowerPlottingAndManday(params: {
  selectedDate: string;
  cleaners: Cleaner[];
  shifts: Shift[];
  uploadedWorkSchedules: UploadedWorkScheduleDocument[];
  selectedShiftId: string;
  now?: Date;
}): ManpowerMandaySummary {
  const {
    selectedDate,
    cleaners,
    shifts,
    uploadedWorkSchedules,
    selectedShiftId,
    now = new Date(),
  } = params;

  const { year, month, day, monthKey, daysInMonth, safeIso } = parseIsoDateParts(selectedDate, now);
  const monthLabel = `${MONTH_NAMES_ID[month - 1] || `Bulan ${month}`} ${year}`;

  const matchedRosterDoc =
    uploadedWorkSchedules.find((d) => d.bulan === month && d.tahun === year) || null;

  const { shift1, shift2 } = resolveShift1AndShift2(shifts);

  const allItems: DailyRosterPersonStatus[] = [];
  const shiftCountsOnDate: Record<string, number> = {};
  const matchedCleanerIds = new Set<string>();

  // Track Man-Day from roster rows (both monthly & to-date) per shift
  let targetMonthManday = 0;
  let targetToDateManday = 0;
  let realizedToDateManday = 0;

  if (matchedRosterDoc) {
    const { rows, daysCount } = buildRowsFromEntries(matchedRosterDoc.entries || []);
    const rosterDaysCount = matchedRosterDoc.daysCount || daysCount || daysInMonth;
    const boundedDay = Math.min(day, rosterDaysCount);

    for (const row of rows) {
      const cleanName = (row.nama || '').trim();
      const normName = cleanName.toLowerCase();

      const matchedCleaner =
        !row.isSlotKosong && normName
          ? cleaners.find(
              (c) => !matchedCleanerIds.has(c.id) && c.name.trim().toLowerCase() === normName
            ) || null
          : null;

      if (matchedCleaner) {
        matchedCleanerIds.add(matchedCleaner.id);
      }

      const shiftInfo = resolveRowOperationalShift(
        row,
        rosterDaysCount,
        day <= rosterDaysCount ? day : undefined
      );

      const effectiveIsS2 = shiftInfo.effectiveShiftCode === 'S';
      const targetShift =
        shiftInfo.dayCode === 'S'
          ? shift2
          : shiftInfo.dayCode === 'P'
          ? shift1
          : effectiveIsS2
          ? shift2
          : shift1;

      const cleanerPlotting = (matchedCleaner?.workPlotting || '').trim();
      const rosterArea = row.area && row.area !== '-' ? row.area.trim() : '';
      const plottingArea = cleanerPlotting || rosterArea || 'Belum diplot';
      const plottingSource: DailyRosterPersonStatus['plottingSource'] = cleanerPlotting
        ? 'shift_plotting'
        : rosterArea
        ? 'roster'
        : 'none';

      const attendanceStatus = resolveCleanerAttendanceOnDay(matchedCleaner, year, month, day, now);

      const item: DailyRosterPersonStatus = {
        key: row.rowId,
        cleaner: matchedCleaner,
        nama: cleanName || 'Slot Kosong',
        nik: matchedCleaner?.nik || (row.isSlotKosong ? 'SLOT-KOSONG' : 'ROSTER'),
        jabatan: row.jabatan && row.jabatan !== '-' ? row.jabatan : matchedCleaner?.role || '',
        isSlotKosong: row.isSlotKosong,
        hasRosterForMonth: true,
        rosterShiftCode: shiftInfo.dayCode,
        isScheduledOffOnDate: shiftInfo.isOffOnSelectedDay,
        assignedShiftId: targetShift.id,
        assignedShiftName: targetShift.name,
        assignedShiftCode: targetShift.code || (effectiveIsS2 ? 'S2' : 'S1'),
        assignedShiftColor: targetShift.color || '#0284c7',
        plottingArea,
        plottingSource,
        plottingUpdatedAt: matchedCleaner?.workPlottingUpdatedAt,
        attendanceStatus,
        attendanceLabel: getAttendanceStatusLabel(attendanceStatus),
        isPresentWorking: attendanceStatus === 'H' || attendanceStatus === 'L',
      };

      allItems.push(item);
      shiftCountsOnDate[targetShift.id] = (shiftCountsOnDate[targetShift.id] || 0) + 1;

      // Accumulate Man-Day over rosterDaysCount for this row according to selectedShiftId
      for (let d = 1; d <= rosterDaysCount; d++) {
        const codeD = normalizeUpper(row.shifts[d]);
        const dayShiftId = codeD === 'P' ? shift1.id : codeD === 'S' ? shift2.id : null;

        const dayMatchesShiftFilter =
          selectedShiftId === 'shift-all'
            ? dayShiftId !== null
            : dayShiftId === selectedShiftId;

        if (dayMatchesShiftFilter) {
          targetMonthManday++;
          if (d <= boundedDay) {
            targetToDateManday++;
          }
        }

        if (d <= boundedDay && matchedCleaner) {
          const attD = resolveCleanerAttendanceOnDay(matchedCleaner, year, month, d, now);
          if (attD === 'H' || attD === 'L') {
            if (selectedShiftId === 'shift-all') {
              realizedToDateManday++;
            } else if (dayShiftId === selectedShiftId) {
              realizedToDateManday++;
            } else if (dayShiftId === null && targetShift.id === selectedShiftId) {
              // Overtime/present on a scheduled OFF day attributed to their base shift
              realizedToDateManday++;
            }
          }
        }
      }
    }
  }

  // Add any cleaners not present in the matched roster document (or all cleaners when no roster exists)
  const extraCleaners: Cleaner[] = [];
  for (const cleaner of cleaners) {
    if (matchedCleanerIds.has(cleaner.id)) continue;
    extraCleaners.push(cleaner);

    const assigned = resolveCleanerFallbackShift(cleaner, shifts);
    const cleanerPlotting = (cleaner.workPlotting || '').trim();
    const attendanceStatus = resolveCleanerAttendanceOnDay(cleaner, year, month, day, now);

    allItems.push({
      key: `cln-${cleaner.id}`,
      cleaner,
      nama: cleaner.name,
      nik: cleaner.nik || '-',
      jabatan: cleaner.role || '',
      isSlotKosong: false,
      hasRosterForMonth: false,
      rosterShiftCode: '',
      isScheduledOffOnDate: false,
      assignedShiftId: assigned.id,
      assignedShiftName: assigned.name,
      assignedShiftCode: assigned.code,
      assignedShiftColor: assigned.color,
      plottingArea: cleanerPlotting || 'Belum diplot',
      plottingSource: cleanerPlotting ? 'shift_plotting' : 'none',
      plottingUpdatedAt: cleaner.workPlottingUpdatedAt,
      attendanceStatus,
      attendanceLabel: getAttendanceStatusLabel(attendanceStatus),
      isPresentWorking: attendanceStatus === 'H' || attendanceStatus === 'L',
    });

    shiftCountsOnDate[assigned.id] = (shiftCountsOnDate[assigned.id] || 0) + 1;
  }

  // Filter items by selectedShiftId
  const items =
    selectedShiftId === 'shift-all'
      ? allItems
      : allItems.filter((item) => item.assignedShiftId === selectedShiftId);

  // If no roster doc exists for this month, compute Man-Day from shifts/cleaners & Presensi Interaktif
  if (!matchedRosterDoc) {
    const standardMonthlyWorkingDays = Math.min(25, daysInMonth);
    const activeShiftObj = shifts.find((s) => s.id === selectedShiftId);
    const shiftQuotaSum =
      selectedShiftId === 'shift-all'
        ? shifts.reduce((acc, s) => acc + (s.personnelCount || 0), 0)
        : activeShiftObj?.personnelCount || 0;

    const effectiveDailyHeadcount =
      shiftQuotaSum > 0 ? Math.max(shiftQuotaSum, items.length) : items.length;

    const proportionalElapsedDays = Math.max(
      1,
      Math.round((day / daysInMonth) * standardMonthlyWorkingDays)
    );

    targetMonthManday = effectiveDailyHeadcount * standardMonthlyWorkingDays;
    targetToDateManday = effectiveDailyHeadcount * proportionalElapsedDays;

    for (const item of items) {
      if (!item.cleaner) continue;
      for (let d = 1; d <= day; d++) {
        const attD = resolveCleanerAttendanceOnDay(item.cleaner, year, month, d, now);
        if (attD === 'H' || attD === 'L') {
          realizedToDateManday++;
        }
      }
    }
  } else if (extraCleaners.length > 0) {
    // Also include realized attendance from any extra cleaners not in the roster doc
    const matchingExtras =
      selectedShiftId === 'shift-all'
        ? extraCleaners
        : extraCleaners.filter((c) => resolveCleanerFallbackShift(c, shifts).id === selectedShiftId);

    for (const extra of matchingExtras) {
      for (let d = 1; d <= day; d++) {
        const attD = resolveCleanerAttendanceOnDay(extra, year, month, d, now);
        if (attD === 'H' || attD === 'L') {
          realizedToDateManday++;
        }
      }
    }
  }

  // Single-day counts on selectedDate (from filtered items)
  const totalPersonnelInScope = items.length;
  const scheduledWorkingItemsOnDate = items.filter((item) => !item.isScheduledOffOnDate);
  const totalScheduledOnDate = matchedRosterDoc
    ? scheduledWorkingItemsOnDate.length
    : totalPersonnelInScope;

  let hadirCount = 0;
  let lemburCount = 0;
  let izinCount = 0;
  let alphaCount = 0;
  let offCount = 0;
  let plottedCountOnDate = 0;

  for (const item of items) {
    if (item.plottingSource !== 'none') plottedCountOnDate++;

    if (item.attendanceStatus === 'H') hadirCount++;
    else if (item.attendanceStatus === 'L') lemburCount++;
    else if (item.attendanceStatus === 'I' || item.attendanceStatus === 'S') izinCount++;
    else if (item.attendanceStatus === 'A') alphaCount++;
    else offCount++;
  }

  const workingPresentCount = hadirCount + lemburCount;
  const unplottedCountOnDate = Math.max(0, totalPersonnelInScope - plottedCountOnDate);

  const attendanceDenominator = totalScheduledOnDate > 0 ? totalScheduledOnDate : totalPersonnelInScope;
  const attendanceRatePercent =
    attendanceDenominator > 0
      ? Math.min(100, Math.round((workingPresentCount / attendanceDenominator) * 100))
      : 0;

  const varianceToDateManday = Math.max(0, targetToDateManday - realizedToDateManday);
  const surplusToDateManday = Math.max(0, realizedToDateManday - targetToDateManday);

  const mandayFulfillmentPercent =
    targetToDateManday > 0
      ? Math.min(100, Math.round((realizedToDateManday / targetToDateManday) * 100))
      : realizedToDateManday > 0
      ? 100
      : 0;

  const mandayMonthlyProgressPercent =
    targetMonthManday > 0
      ? Math.min(100, Math.round((realizedToDateManday / targetMonthManday) * 100))
      : 0;

  return {
    selectedDate: safeIso,
    year,
    month,
    day,
    monthKey,
    monthLabel,
    daysInMonth,
    hasRosterForMonth: Boolean(matchedRosterDoc),
    rosterDocId: matchedRosterDoc?.id,
    allItems,
    items,
    shiftCountsOnDate,
    totalScheduledOnDate,
    totalPersonnelInScope,
    plottedCountOnDate,
    unplottedCountOnDate,
    hadirCount,
    lemburCount,
    workingPresentCount,
    izinCount,
    alphaCount,
    offCount,
    attendanceRatePercent,
    targetMonthManday,
    targetToDateManday,
    realizedToDateManday,
    varianceToDateManday,
    surplusToDateManday,
    mandayFulfillmentPercent,
    mandayMonthlyProgressPercent,
  };
}
