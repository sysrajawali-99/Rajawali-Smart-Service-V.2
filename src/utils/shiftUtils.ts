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
