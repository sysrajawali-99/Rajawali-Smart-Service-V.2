import { UploadedMcpDocument, UploadedMcpRow, UploadedMcpScheduleCell } from '../types';
import {
  MONTH_NAMES_ID,
  getDaysInMonth,
  getIndonesianDayCode,
  normalizeFrqCode,
} from './mcpExcel';

const REALIZATION_OR_CHECKLIST_TOKENS = new Set(['V', 'X', 'B', 'K']);

export interface NextMonthMcpSummary {
  totalRows: number;
  frqCounts: {
    D: number;
    W: number;
    M: number;
    other: number;
  };
  manualCheckRows: Array<{
    urutan: number;
    lokasi_kerja: string;
    area_pekerjaan: string;
    jenis_pekerjaan: string;
    frq: string;
  }>;
}

export interface GeneratedNextMonthMcp {
  sourceBulan: number;
  sourceTahun: number;
  targetBulan: number;
  targetTahun: number;
  lokasiProyek: string;
  daysCount: number;
  dayCodes: Record<number, string>;
  rows: UploadedMcpRow[];
  summary: NextMonthMcpSummary;
}

export function sortMcpDocsByLatestPeriod(
  docs: UploadedMcpDocument[]
): UploadedMcpDocument[] {
  return [...(docs || [])].sort((a, b) => {
    const periodA = Number(a.tahun || 0) * 12 + Number(a.bulan || 0);
    const periodB = Number(b.tahun || 0) * 12 + Number(b.bulan || 0);
    if (periodB !== periodA) return periodB - periodA;
    return (b.updatedAt || '').localeCompare(a.updatedAt || '');
  });
}

export function getNextMonthPeriod(
  bulan: number,
  tahun: number
): { bulan: number; tahun: number } {
  if (bulan >= 12) {
    return { bulan: 1, tahun: tahun + 1 };
  }
  return { bulan: bulan + 1, tahun };
}

export function formatMcpPeriodLabel(bulan: number, tahun: number): string {
  const name = MONTH_NAMES_ID[bulan - 1] || `Bulan ${bulan}`;
  return `${name} ${tahun}`;
}

function makeNoonDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function addDaysNoon(date: Date, days: number): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + days,
    12,
    0,
    0,
    0
  );
}

function resolvePlanTokenForRow(jadwal: UploadedMcpScheduleCell[]): string {
  const counts = new Map<string, number>();
  for (const cell of jadwal || []) {
    const raw = String(cell.nilai_asli ?? '').replace(/^[\s\u00A0]+|[\s\u00A0]+$/g, '');
    if (!raw) continue;
    const upper = raw.toUpperCase();
    if (REALIZATION_OR_CHECKLIST_TOKENS.has(upper)) continue;
    counts.set(raw, (counts.get(raw) || 0) + 1);
  }
  if (counts.size === 0) return 'R';

  let bestToken = 'R';
  let bestCount = -1;
  for (const [tok, count] of counts.entries()) {
    if (count > bestCount) {
      bestCount = count;
      bestToken = tok;
    }
  }
  return bestToken;
}

function findDominantStep(diffs: number[]): number {
  const freq = new Map<number, number>();
  for (const d of diffs) {
    freq.set(d, (freq.get(d) || 0) + 1);
  }
  let bestDiff = diffs[0];
  let bestCount = -1;
  for (const [d, count] of freq.entries()) {
    if (count > bestCount) {
      bestCount = count;
      bestDiff = d;
    }
  }
  return bestDiff;
}

function mapWeeklyDays(
  sourceDays: number[],
  sourceMonth: number,
  sourceYear: number,
  targetMonth: number,
  targetYear: number,
  targetDaysCount: number
): number[] {
  const sourceDates = sourceDays.map((d) => makeNoonDate(sourceYear, sourceMonth, d));
  const diffs: number[] = [];
  for (let i = 1; i < sourceDates.length; i++) {
    const delta = Math.round(
      (sourceDates[i].getTime() - sourceDates[i - 1].getTime()) / 86400000
    );
    if (delta > 0) diffs.push(delta);
  }

  // Multi-weekly / fixed interval > 7 days (e.g., biweekly 14 days, triweekly 21 days):
  // keep the exact spacing continuing from the last scheduled date in the source month.
  if (diffs.length >= 1 && Math.min(...diffs) > 7) {
    const stepDays = findDominantStep(diffs);
    const lastSourceDate = sourceDates[sourceDates.length - 1];
    const targetEnd = makeNoonDate(targetYear, targetMonth, targetDaysCount);
    const result: number[] = [];

    let cursor = addDaysNoon(lastSourceDate, stepDays);
    let safety = 0;
    while (cursor.getTime() <= targetEnd.getTime() && safety < 64) {
      if (
        cursor.getFullYear() === targetYear &&
        cursor.getMonth() + 1 === targetMonth
      ) {
        result.push(cursor.getDate());
      }
      cursor = addDaysNoon(cursor, stepDays);
      safety++;
    }
    return Array.from(new Set(result)).sort((a, b) => a - b);
  }

  // Weekly (one or more specific weekdays per week): schedule every matching weekday in the new month.
  const targetDows = new Set<number>(sourceDates.map((dt) => dt.getDay()));
  const result: number[] = [];
  for (let d = 1; d <= targetDaysCount; d++) {
    const dow = makeNoonDate(targetYear, targetMonth, d).getDay();
    if (targetDows.has(dow)) {
      result.push(d);
    }
  }
  return result;
}

function mapMonthlyDays(
  sourceDays: number[],
  sourceMonth: number,
  sourceYear: number,
  targetMonth: number,
  targetYear: number,
  targetDaysCount: number
): number[] {
  const result = new Set<number>();

  // Precompute all dates per weekday (0..6) in the target month
  const datesByDow = new Map<number, number[]>();
  for (let dow = 0; dow < 7; dow++) datesByDow.set(dow, []);
  for (let d = 1; d <= targetDaysCount; d++) {
    const dow = makeNoonDate(targetYear, targetMonth, d).getDay();
    datesByDow.get(dow)!.push(d);
  }

  for (const oldDay of sourceDays) {
    const dow = makeNoonDate(sourceYear, sourceMonth, oldDay).getDay();
    const nth = Math.ceil(oldDay / 7); // 1st..5th occurrence of that weekday in source month
    const candidates = datesByDow.get(dow) || [];
    if (candidates.length === 0) continue;
    // If nth doesn't exist in target month (e.g. 5th Thursday), use the last occurrence of that weekday
    const chosen = candidates[Math.min(nth - 1, candidates.length - 1)];
    result.add(chosen);
  }

  return Array.from(result).sort((a, b) => a - b);
}

export function generateNextMonthMcp(
  sourceDoc: UploadedMcpDocument
): GeneratedNextMonthMcp {
  const sourceBulan = Number(sourceDoc.bulan);
  const sourceTahun = Number(sourceDoc.tahun);
  const { bulan: targetBulan, tahun: targetTahun } = getNextMonthPeriod(
    sourceBulan,
    sourceTahun
  );
  const daysCount = getDaysInMonth(targetBulan, targetTahun);
  const sourceDaysCount =
    sourceDoc.daysCount || getDaysInMonth(sourceBulan, sourceTahun);

  const dayCodes: Record<number, string> = {};
  for (let d = 1; d <= daysCount; d++) {
    dayCodes[d] = getIndonesianDayCode(targetBulan, targetTahun, d);
  }

  const frqCounts = { D: 0, W: 0, M: 0, other: 0 };
  const manualCheckRows: NextMonthMcpSummary['manualCheckRows'] = [];

  const nextRows: UploadedMcpRow[] = (sourceDoc.rows || []).map((row, idx) => {
    const urutan = row.urutan ?? idx + 1;
    const frqNorm = normalizeFrqCode(row.frq);

    const sourceDaysSet = new Set<number>();
    for (const cell of row.jadwal || []) {
      const val = String(cell.nilai_asli ?? '').replace(/^[\s\u00A0]+|[\s\u00A0]+$/g, '');
      if (
        val !== '' &&
        Number.isInteger(Number(cell.tanggal)) &&
        Number(cell.tanggal) >= 1 &&
        Number(cell.tanggal) <= sourceDaysCount
      ) {
        sourceDaysSet.add(Number(cell.tanggal));
      }
    }
    const sourceDays = Array.from(sourceDaysSet).sort((a, b) => a - b);

    const isBlankSpacer =
      !String(row.lokasi_kerja || '').trim() &&
      !String(row.area_pekerjaan || '').trim() &&
      !String(row.jenis_pekerjaan || '').trim() &&
      !frqNorm &&
      sourceDays.length === 0;

    let targetDays: number[] = [];
    let needsManualCheck = false;

    if (frqNorm === 'D') {
      frqCounts.D++;
      if (sourceDays.length > 0) {
        targetDays = Array.from({ length: daysCount }, (_, i) => i + 1);
      }
    } else if (frqNorm === 'W') {
      frqCounts.W++;
      if (sourceDays.length > 0) {
        targetDays = mapWeeklyDays(
          sourceDays,
          sourceBulan,
          sourceTahun,
          targetBulan,
          targetTahun,
          daysCount
        );
      }
    } else if (frqNorm === 'M') {
      frqCounts.M++;
      if (sourceDays.length > 0) {
        targetDays = mapMonthlyDays(
          sourceDays,
          sourceBulan,
          sourceTahun,
          targetBulan,
          targetTahun,
          daysCount
        );
      }
    } else {
      if (!isBlankSpacer) {
        frqCounts.other++;
        needsManualCheck = true;
        manualCheckRows.push({
          urutan,
          lokasi_kerja: row.lokasi_kerja || '-',
          area_pekerjaan: row.area_pekerjaan || '-',
          jenis_pekerjaan: row.jenis_pekerjaan || '-',
          frq: row.frq || '',
        });
      }
      targetDays = [];
    }

    const planToken = resolvePlanTokenForRow(row.jadwal || []);
    const nextJadwal: UploadedMcpScheduleCell[] = targetDays.map((d) => ({
      tanggal: d,
      nilai_asli: planToken,
    }));

    return {
      rowId: row.rowId || `mcp-row-${urutan}`,
      lokasi_proyek: sourceDoc.lokasi_proyek,
      bulan: targetBulan,
      tahun: targetTahun,
      lokasi_kerja: row.lokasi_kerja,
      area_pekerjaan: row.area_pekerjaan,
      jenis_pekerjaan: row.jenis_pekerjaan,
      frq: row.frq || '',
      urutan,
      jadwal: nextJadwal,
      ...(row.sheet ? { sheet: row.sheet } : {}),
      ...(needsManualCheck ? { needsManualCheck: true } : {}),
    };
  });

  return {
    sourceBulan,
    sourceTahun,
    targetBulan,
    targetTahun,
    lokasiProyek: sourceDoc.lokasi_proyek || 'Default',
    daysCount,
    dayCodes,
    rows: nextRows,
    summary: {
      totalRows: nextRows.length,
      frqCounts,
      manualCheckRows,
    },
  };
}
