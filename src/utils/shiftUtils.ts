import type { AttendanceBookPeriod, AttendanceStatusCode } from '../types';

// Utility functions for Shift durations and Attendance calculations

export interface ShiftDurationResult {
  hours: number;
  minutes: number;
  totalHoursDecimal: number;
  text: string;
}

/**
 * Calculates work duration between startTime and endTime (format "HH:mm").
 * Handles cross-midnight shifts (e.g., 23:00 to 07:00 = 8 hours)
 * and 24-hour shifts (00:00 to 24:00 or same start and end).
 */
export function calculateShiftDuration(startTime: string, endTime: string): ShiftDurationResult {
  if (!startTime || !endTime) {
    return { hours: 0, minutes: 0, totalHoursDecimal: 0, text: '0 Jam' };
  }

  const [startH, startM] = startTime.split(':').map((v) => parseInt(v, 10) || 0);
  const [endH, endM] = endTime.split(':').map((v) => parseInt(v, 10) || 0);

  const startTotalMinutes = startH * 60 + startM;
  let endTotalMinutes = endH * 60 + endM;

  if (endTotalMinutes <= startTotalMinutes) {
    // Crosses midnight (e.g. 23:00 to 07:00, or 24h cycle)
    endTotalMinutes += 24 * 60;
  }

  const diffMinutes = endTotalMinutes - startTotalMinutes;
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  const totalHoursDecimal = Number((diffMinutes / 60).toFixed(1));

  let text = '';
  if (minutes === 0) {
    text = `${hours} Jam`;
  } else {
    text = `${hours} Jam ${minutes} Menit`;
  }

  return {
    hours,
    minutes,
    totalHoursDecimal,
    text,
  };
}

export interface PeriodDateItem {
  date: Date;
  day: number;        // 1 - 31
  month: number;      // 1 - 12
  year: number;
  monthKey: string;   // "YYYY-MM"
  isoDate: string;    // "YYYY-MM-DD"
  shortLabel: string; // e.g. "26 Okt"
  monthShort: string; // e.g. "Okt"
  isWeekend: boolean;
}

const SHORT_MONTH_NAMES_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

export function getDaysInMonthCount(year: number, month1Based: number): number {
  if (!year || !month1Based) return 31;
  return new Date(year, month1Based, 0).getDate();
}

export function buildPeriodDates(
  period: AttendanceBookPeriod,
  maxDays = 62
): {
  dates: PeriodDateItem[];
  isInvalidOrder: boolean;
  isTruncated: boolean;
  totalRawDays: number;
} {
  const safeOpenDay = Math.max(1, Math.min(period.openDay, getDaysInMonthCount(period.openYear, period.openMonth)));
  const safeCloseDay = Math.max(1, Math.min(period.closeDay, getDaysInMonthCount(period.closeYear, period.closeMonth)));

  const start = new Date(period.openYear, period.openMonth - 1, safeOpenDay);
  const end = new Date(period.closeYear, period.closeMonth - 1, safeCloseDay);

  if (start.getTime() > end.getTime()) {
    return { dates: [], isInvalidOrder: true, isTruncated: false, totalRawDays: 0 };
  }

  const dates: PeriodDateItem[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  let totalRawDays = 0;

  while (cursor.getTime() <= end.getTime()) {
    totalRawDays++;
    if (dates.length < maxDays) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth() + 1;
      const d = cursor.getDate();
      const monthKey = `${y}-${String(m).padStart(2, '0')}`;
      const isoDate = `${monthKey}-${String(d).padStart(2, '0')}`;
      const monthShort = SHORT_MONTH_NAMES_ID[m - 1] || '';
      const dow = cursor.getDay();
      dates.push({
        date: new Date(y, m - 1, d),
        day: d,
        month: m,
        year: y,
        monthKey,
        isoDate,
        shortLabel: `${d} ${monthShort}`,
        monthShort,
        isWeekend: dow === 0 || dow === 6,
      });
    }
    cursor.setDate(cursor.getDate() + 1);
    if (totalRawDays > 400) break;
  }

  return {
    dates,
    isInvalidOrder: false,
    isTruncated: totalRawDays > maxDays,
    totalRawDays,
  };
}

export function getCleanerAttendanceStatus(
  attendanceByMonth: Record<string, Record<number, AttendanceStatusCode>> | undefined,
  legacyAttendance: Record<number, AttendanceStatusCode> | undefined,
  item: Pick<PeriodDateItem, 'day' | 'monthKey'>
): AttendanceStatusCode {
  const monthRecord = attendanceByMonth?.[item.monthKey];
  if (monthRecord && monthRecord[item.day] !== undefined) {
    return monthRecord[item.day];
  }
  if (!attendanceByMonth || Object.keys(attendanceByMonth).length === 0) {
    return legacyAttendance?.[item.day] || '-';
  }
  return '-';
}

export function calculateWorkingDaysForPeriod(
  attendanceByMonth: Record<string, Record<number, AttendanceStatusCode>> | undefined,
  legacyAttendance: Record<number, AttendanceStatusCode> | undefined,
  periodDates: PeriodDateItem[]
): {
  hadirCount: number;
  lemburCount: number;
  izinCount: number;
  sakitCount: number;
  alpaCount: number;
  totalWorkingDays: number;
} {
  let hadirCount = 0;
  let lemburCount = 0;
  let izinCount = 0;
  let sakitCount = 0;
  let alpaCount = 0;

  for (const item of periodDates) {
    const status = getCleanerAttendanceStatus(attendanceByMonth, legacyAttendance, item);
    if (status === 'H') hadirCount++;
    else if (status === 'L') lemburCount++;
    else if (status === 'I') izinCount++;
    else if (status === 'S') sakitCount++;
    else if (status === 'A') alpaCount++;
  }

  return {
    hadirCount,
    lemburCount,
    izinCount,
    sakitCount,
    alpaCount,
    totalWorkingDays: hadirCount + lemburCount * 2,
  };
}

/**
 * Calculate total working days for a cleaner based on attendance (1 - 31).
 * Formula: Total = (H × 1) + (L × 2)
 * I, S, A are counted as 0 working days.
 */
export function calculateWorkingDays(attendance: Record<number, string> | undefined): {
  hadirCount: number;
  lemburCount: number;
  izinCount: number;
  sakitCount: number;
  alpaCount: number;
  totalWorkingDays: number;
} {
  if (!attendance) {
    return {
      hadirCount: 0,
      lemburCount: 0,
      izinCount: 0,
      sakitCount: 0,
      alpaCount: 0,
      totalWorkingDays: 0,
    };
  }

  let hadirCount = 0;
  let lemburCount = 0;
  let izinCount = 0;
  let sakitCount = 0;
  let alpaCount = 0;

  for (let day = 1; day <= 31; day++) {
    const status = attendance[day];
    if (status === 'H') {
      hadirCount++;
    } else if (status === 'L') {
      lemburCount++;
    } else if (status === 'I') {
      izinCount++;
    } else if (status === 'S') {
      sakitCount++;
    } else if (status === 'A') {
      alpaCount++;
    }
  }

  // Khusus L dihitung 2x hari kerja!
  const totalWorkingDays = hadirCount + lemburCount * 2;

  return {
    hadirCount,
    lemburCount,
    izinCount,
    sakitCount,
    alpaCount,
    totalWorkingDays,
  };
}

/**
 * Returns an ordered array of hours (0-23) that correspond to a shift's operational window.
 * Supports standard daytime shifts (e.g. 07:00 to 15:00 -> [7, 8, 9, 10, 11, 12, 13, 14]),
 * cross-midnight shifts (e.g. 23:00 to 07:00 -> [23, 0, 1, 2, 3, 4, 5, 6]),
 * and 24-hour cycles.
 */
export function getShiftHours(startTime: string, endTime: string): number[] {
  if (!startTime || !endTime) {
    return Array.from({ length: 24 }, (_, i) => i);
  }

  const startH = parseInt(startTime.split(':')[0], 10) || 0;
  const endH = parseInt(endTime.split(':')[0], 10) || 0;

  if (startH === endH) {
    return Array.from({ length: 24 }, (_, i) => (startH + i) % 24);
  }

  const hours: number[] = [];
  const totalHours = endH > startH ? endH - startH : 24 - startH + endH;

  for (let i = 0; i < totalHours; i++) {
    hours.push((startH + i) % 24);
  }

  return hours;
}

/**
 * Returns today's local date string formatted as YYYY-MM-DD.
 */
export function getTodayDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Returns the current hour slot range label in format "HH.00 - HH.00 WIB".
 */
export function getCurrentHourRangeLabel(d: Date = new Date(), withWib = true): string {
  const h = d.getHours();
  const nextH = (h + 1) === 24 ? 24 : (h + 1) % 24;
  const hStr = String(h).padStart(2, '0');
  const nextHStr = String(nextH).padStart(2, '0');
  return `${hStr}.00 - ${nextHStr}.00${withWib ? ' WIB' : ''}`;
}

function parseShiftTimeMinutes(raw: string | undefined, fallbackH: number): number {
  if (!raw) return fallbackH * 60;
  const cleaned = String(raw).trim();
  const match = cleaned.match(/^(\d{1,2})[:.](\d{1,2})/);
  if (!match) {
    const hOnly = parseInt(cleaned, 10);
    return Number.isNaN(hOnly) ? fallbackH * 60 : hOnly * 60;
  }
  const h = parseInt(match[1], 10) || 0;
  const m = parseInt(match[2], 10) || 0;
  return h * 60 + m;
}

/**
 * Determines which shift from the given list covers the specified or current real-time hour.
 */
export function findShiftForCurrentTime(
  shiftsList: { id: string; startTime?: string; endTime?: string }[],
  d: Date = new Date()
): string {
  if (!shiftsList || shiftsList.length === 0) return 'all_24';
  const currentTotalMins = d.getHours() * 60 + d.getMinutes();

  const is24HourShift = (startMins: number, endMins: number) =>
    startMins === endMins || (startMins === 0 && endMins >= 24 * 60);

  // Pass 1: Match specific bounded shifts first (e.g., 07:00-15:00, 15:00-23:00, 23:00-07:00)
  for (const s of shiftsList) {
    const startMins = parseShiftTimeMinutes(s.startTime, 7);
    const endMins = parseShiftTimeMinutes(s.endTime, 15);
    if (is24HourShift(startMins, endMins)) continue;

    if (startMins < endMins) {
      if (currentTotalMins >= startMins && currentTotalMins < endMins) {
        return s.id;
      }
    } else {
      // Crosses midnight, e.g. 23:00 to 07:00
      if (currentTotalMins >= startMins || currentTotalMins < endMins) {
        return s.id;
      }
    }
  }

  // Pass 2: Fall back to any 24-hour shift if no bounded shift matched
  for (const s of shiftsList) {
    const startMins = parseShiftTimeMinutes(s.startTime, 7);
    const endMins = parseShiftTimeMinutes(s.endTime, 15);
    if (is24HourShift(startMins, endMins)) {
      return s.id;
    }
  }

  return shiftsList[0]?.id || 'all_24';
}
