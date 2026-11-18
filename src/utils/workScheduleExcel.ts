import * as XLSX from 'xlsx';
import { UploadedWorkScheduleEntry } from '../types';

export const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

// Index follows JS Date.getDay(): 0 = Minggu ... 6 = Sabtu
export const DAY_CODES_ID = ['MG', 'SN', 'SL', 'RB', 'KM', 'JM', 'SB'] as const;

export const STANDARD_JABATAN = ['SPV', 'TL', 'CLEANING', 'GONDOLA'] as const;
export const STANDARD_AREAS = [
  'ALL AREA',
  'KORIDOR',
  'LOBBY',
  'FASILITAS',
  'RELIFER',
  'OFFICE',
  'TEAM GC',
  'ROOF',
] as const;

export interface ParsedScheduleRow {
  rowId: string;
  sourceFile: string;
  sourceSheet: string;
  nama: string;
  isSlotKosong: boolean;
  jabatan: string;
  area: string;
  shifts: Record<number, string>; // day (1..31) -> normalized shift ('P' | 'S' | 'OFF' | raw invalid)
  invalidDays: Record<number, string>; // day -> raw value when warning
}

export interface SheetDayValidationSummary {
  fileName: string;
  sheetName: string;
  hasDayRow: boolean;
  checkedDays: number;
  mismatchCount: number;
  sampleMismatch?: { day: number; actual: string; expected: string };
}

export interface ParseScheduleResult {
  bulan: number;
  tahun: number;
  daysCount: number;
  employeeCount: number;
  rows: ParsedScheduleRow[];
  entries: UploadedWorkScheduleEntry[];
  warnings: string[];
  errors: string[];
  invalidCellCount: number;
  sheetsProcessed: number;
  dayValidations: SheetDayValidationSummary[];
}

export interface DailyRecapCounts {
  spv: number;
  tl: number;
  pagi: number;
  siang: number;
  gondola: number;
  off: number;
  jumlah: number;
}

export function getDaysInMonth(bulan: number, tahun: number): number {
  return new Date(tahun, bulan, 0).getDate();
}

export function getIndonesianDayCode(bulan: number, tahun: number, day: number): string {
  const dow = new Date(tahun, bulan - 1, day).getDay();
  return DAY_CODES_ID[dow] || '';
}

function normalizeUpper(val: unknown): string {
  return String(val ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function normalizeHeaderToken(val: unknown): string {
  return String(val ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function matchesHeaderField(cellRaw: unknown, field: 'NAMA' | 'JABATAN' | 'AREA'): boolean {
  const token = normalizeHeaderToken(cellRaw);
  if (!token) return false;
  const words = token.split(' ');

  if (field === 'NAMA') {
    if (token === 'NAMA' || token.startsWith('NAMA ') || words.includes('NAMA')) return true;
    return words.some((w) => w.length >= 3 && w.length <= 5 && levenshtein(w, 'NAMA') <= 1);
  }
  if (field === 'JABATAN') {
    if (token === 'JABATAN' || token.includes('JABATAN') || token === 'POSISI') return true;
    return words.some((w) => w.length >= 5 && w.length <= 9 && levenshtein(w, 'JABATAN') <= 2);
  }
  // AREA
  if (token === 'AREA' || token.includes('AREA') || token === 'LOKASI') return true;
  return words.some((w) => w.length >= 3 && w.length <= 5 && levenshtein(w, 'AREA') <= 1);
}

function parseDayHeaderNumber(cellRaw: unknown): number | null {
  const s = String(cellRaw ?? '').trim();
  if (!s) return null;
  const match = s.match(/^(?:TGL|TANGGAL)?\s*0?([1-9]|[12]\d|3[01])\.?$/i);
  if (!match) return null;
  const num = Number(match[1]);
  if (num >= 1 && num <= 31) return num;
  return null;
}

const DAY_CODE_ALIASES: Record<string, number> = {
  MG: 0,
  MIN: 0,
  MINGGU: 0,
  MGG: 0,
  SN: 1,
  SEN: 1,
  SENIN: 1,
  SNN: 1,
  SL: 2,
  SEL: 2,
  SELASA: 2,
  SLS: 2,
  RB: 3,
  RAB: 3,
  RABU: 3,
  KM: 4,
  KAM: 4,
  KAMIS: 4,
  KMS: 4,
  JM: 5,
  JUM: 5,
  JUMAT: 5,
  "JUM'AT": 5,
  JMT: 5,
  SB: 6,
  SAB: 6,
  SABTU: 6,
  SBT: 6,
};

function parseDayOfWeekCode(cellRaw: unknown): number | null {
  const token = normalizeUpper(cellRaw).replace(/[^A-Z']/g, '');
  if (!token) return null;
  return DAY_CODE_ALIASES[token] ?? null;
}

function isAlwaysRecapLabel(rawNorm: string): boolean {
  const compact = rawNorm.replace(/\s+/g, '');
  return (
    compact === 'P(PAGI)' ||
    compact === 'S(SIANG)' ||
    compact === 'O(OFF)' ||
    compact === 'OFF(LIBUR)' ||
    compact === 'JUMLAH' ||
    compact === 'TOTAL' ||
    compact === 'REKAP' ||
    compact === 'REKAPITULASI'
  );
}

function isRoleRecapLabel(rawNorm: string): boolean {
  const compact = rawNorm.replace(/\s+/g, '');
  return compact === 'SPV' || compact === 'TL' || compact === 'GONDOLA';
}

export function normalizeShiftCode(raw: unknown): {
  normalized: string;
  isValid: boolean;
  rawCleaned: string;
} {
  const rawCleaned = normalizeUpper(raw);
  if (rawCleaned === 'P') return { normalized: 'P', isValid: true, rawCleaned };
  if (rawCleaned === 'S') return { normalized: 'S', isValid: true, rawCleaned };
  if (rawCleaned === 'OFF' || rawCleaned === 'O') {
    return { normalized: 'OFF', isValid: true, rawCleaned };
  }
  return { normalized: rawCleaned, isValid: false, rawCleaned };
}

/**
 * Guess Month (1-12) and Year (2020-2099) from file names and/or sheet names.
 */
export function guessMonthYearFromNames(names: string[]): { bulan?: number; tahun?: number } {
  const combined = names
    .join(' ')
    .replace(/[_\-./\\]+/g, ' ')
    .toUpperCase();
  if (!combined.trim()) return {};

  let tahun: number | undefined;
  let bulan: number | undefined;

  // Find 4-digit year
  const yearMatch = combined.match(/\b(20[2-9]\d)\b/);
  if (yearMatch) {
    tahun = Number(yearMatch[1]);
  }

  // Month dictionary (Indonesian & English, full & common abbreviations)
  const monthTokens: Array<{ regex: RegExp; month: number }> = [
    { regex: /\b(JANUARI|JANUARY|JAN)\b/, month: 1 },
    { regex: /\b(FEBRUARI|FEBRUARY|PEBRUARI|FEB|PEB)\b/, month: 2 },
    { regex: /\b(MARET|MARCH|MAR)\b/, month: 3 },
    { regex: /\b(APRIL|APR)\b/, month: 4 },
    { regex: /\b(MEI|MAY)\b/, month: 5 },
    { regex: /\b(JUNI|JUNE|JUN)\b/, month: 6 },
    { regex: /\b(JULI|JULY|JUL)\b/, month: 7 },
    { regex: /\b(AGUSTUS|AUGUST|AGST|AGT|AGU|AUG)\b/, month: 8 },
    { regex: /\b(SEPTEMBER|SEPT|SEP)\b/, month: 9 },
    { regex: /\b(OKTOBER|OCTOBER|OKT|OCT)\b/, month: 10 },
    { regex: /\b(NOVEMBER|NOPEMBER|NOV|NOP)\b/, month: 11 },
    { regex: /\b(DESEMBER|DECEMBER|DES|DEC)\b/, month: 12 },
  ];

  for (const item of monthTokens) {
    if (item.regex.test(combined)) {
      bulan = item.month;
      break;
    }
  }

  // Fallback numeric patterns such as 2026-04, 2026_04, 04-2026, 04_2026
  if (!bulan) {
    const ymdMatch = combined.match(/\b(20[2-9]\d)[\-_./\s](0?[1-9]|1[0-2])\b/);
    if (ymdMatch) {
      tahun = tahun ?? Number(ymdMatch[1]);
      bulan = Number(ymdMatch[2]);
    } else {
      const mdyMatch = combined.match(/\b(0?[1-9]|1[0-2])[\-_./\s](20[2-9]\d)\b/);
      if (mdyMatch) {
        bulan = Number(mdyMatch[1]);
        tahun = tahun ?? Number(mdyMatch[2]);
      }
    }
  }

  return { bulan, tahun };
}

/**
 * Extract all sheet names across uploaded Excel/CSV files (useful for month/year auto-guessing).
 */
export function extractSheetNamesFromBuffer(buffer: ArrayBuffer): string[] {
  try {
    const wb = XLSX.read(buffer, { type: 'array', bookSheets: true });
    return wb.SheetNames || [];
  } catch {
    return [];
  }
}

export async function parseWorkScheduleFiles(
  files: File[],
  selectedMonth: number,
  selectedYear: number
): Promise<ParseScheduleResult> {
  const inputs = await Promise.all(
    files.map(async (f) => ({
      name: f.name,
      buffer: await f.arrayBuffer(),
    }))
  );
  return parseWorkScheduleBuffers(inputs, selectedMonth, selectedYear);
}

export function parseWorkScheduleBuffers(
  inputs: Array<{ name: string; buffer: ArrayBuffer }>,
  selectedMonth: number,
  selectedYear: number
): ParseScheduleResult {
  const rows: ParsedScheduleRow[] = [];
  const entries: UploadedWorkScheduleEntry[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  const dayValidations: SheetDayValidationSummary[] = [];

  let maxDaysDetected = 0;
  let invalidCellCount = 0;
  let sheetsProcessed = 0;

  for (const input of inputs) {
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(input.buffer, {
        type: 'array',
        cellStyles: false,
        cellHTML: false,
      });
    } catch (err: any) {
      errors.push(`Gagal membaca file "${input.name}": ${err?.message || 'Format file tidak didukung'}`);
      continue;
    }

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      const rawMatrix = XLSX.utils.sheet_to_json<any[]>(sheet, {
        header: 1,
        defval: '',
        blankrows: true,
        raw: false,
      });

      if (!rawMatrix || rawMatrix.length === 0) continue;

      // 1. Auto-locate header row containing NAMA, JABATAN, AREA + sequential day columns 1..31
      let headerRowIndex = -1;
      let namaCol = -1;
      let jabatanCol = -1;
      let areaCol = -1;
      let dayColumns: Array<{ colIndex: number; day: number }> = [];

      for (let r = 0; r < rawMatrix.length; r++) {
        const row = rawMatrix[r] || [];
        let foundNama = -1;
        let foundJabatan = -1;
        let foundArea = -1;

        for (let c = 0; c < row.length; c++) {
          const val = row[c];
          if (foundNama === -1 && matchesHeaderField(val, 'NAMA')) {
            foundNama = c;
          } else if (foundJabatan === -1 && matchesHeaderField(val, 'JABATAN')) {
            foundJabatan = c;
          } else if (foundArea === -1 && matchesHeaderField(val, 'AREA')) {
            foundArea = c;
          }
        }

        const matchedMetaCount =
          (foundNama >= 0 ? 1 : 0) + (foundJabatan >= 0 ? 1 : 0) + (foundArea >= 0 ? 1 : 0);

        if (matchedMetaCount >= 2) {
          const metaMaxCol = Math.max(foundNama, foundJabatan, foundArea);
          const candidateDays: Array<{ colIndex: number; day: number }> = [];
          for (let c = metaMaxCol + 1; c < row.length; c++) {
            const d = parseDayHeaderNumber(row[c]);
            if (d !== null && !candidateDays.some((item) => item.day === d)) {
              candidateDays.push({ colIndex: c, day: d });
            }
          }

          if (candidateDays.length >= 28 || (matchedMetaCount === 3 && candidateDays.length > 0)) {
            headerRowIndex = r;
            namaCol = foundNama;
            jabatanCol = foundJabatan;
            areaCol = foundArea;
            dayColumns = candidateDays.sort((a, b) => a.day - b.day);
            break;
          }
        }
      }

      if (headerRowIndex === -1) {
        // Check whether sheet is genuinely blank before emitting an error
        const hasAnyText = rawMatrix.some((row) =>
          (row || []).some((cell) => String(cell ?? '').trim() !== '')
        );
        if (hasAnyText) {
          errors.push(
            `File "${input.name}" (Sheet "${sheetName}"): Baris header NAMA, JABATAN, AREA dan tanggal 1-31 tidak ditemukan.`
          );
        }
        continue;
      }

      sheetsProcessed++;

      if (dayColumns.length < 28) {
        warnings.push(
          `[${input.name} / ${sheetName}]: Hanya ditemukan ${dayColumns.length} kolom tanggal (normalnya 28-31 hari).`
        );
      }

      const sheetMaxDay = dayColumns.reduce((max, d) => Math.max(max, d.day), 0);
      maxDaysDetected = Math.max(maxDaysDetected, sheetMaxDay);

      if (namaCol === -1) {
        warnings.push(`[${input.name} / ${sheetName}]: Kolom NAMA tidak ditemukan secara eksplisit.`);
      }
      if (jabatanCol === -1) {
        warnings.push(`[${input.name} / ${sheetName}]: Kolom JABATAN tidak ditemukan secara eksplisit.`);
      }
      if (areaCol === -1) {
        warnings.push(`[${input.name} / ${sheetName}]: Kolom AREA tidak ditemukan secara eksplisit.`);
      }

      const metaCols = [namaCol, jabatanCol, areaCol].filter((c) => c >= 0);
      const metaMaxCol = metaCols.length > 0 ? Math.max(...metaCols) : 0;

      // 2. Detect & validate day-of-week row immediately below header (SN, SL, RB, KM, JM, SB, MG)
      let dataStartRow = headerRowIndex + 1;
      const dayValidation: SheetDayValidationSummary = {
        fileName: input.name,
        sheetName,
        hasDayRow: false,
        checkedDays: 0,
        mismatchCount: 0,
      };

      for (let probe = headerRowIndex + 1; probe <= Math.min(headerRowIndex + 2, rawMatrix.length - 1); probe++) {
        const probeRow = rawMatrix[probe] || [];
        let recognizedDowCount = 0;
        let checkedDays = 0;
        let mismatchCount = 0;
        let sampleMismatch: { day: number; actual: string; expected: string } | undefined;

        for (const dc of dayColumns) {
          const dow = parseDayOfWeekCode(probeRow[dc.colIndex]);
          if (dow !== null) {
            recognizedDowCount++;
            if (dc.day <= getDaysInMonth(selectedMonth, selectedYear)) {
              checkedDays++;
              const expectedDow = new Date(selectedYear, selectedMonth - 1, dc.day).getDay();
              if (dow !== expectedDow) {
                mismatchCount++;
                if (!sampleMismatch) {
                  sampleMismatch = {
                    day: dc.day,
                    actual: normalizeUpper(probeRow[dc.colIndex]),
                    expected: DAY_CODES_ID[expectedDow],
                  };
                }
              }
            }
          }
        }

        if (recognizedDowCount >= 5) {
          dayValidation.hasDayRow = true;
          dayValidation.checkedDays = checkedDays;
          dayValidation.mismatchCount = mismatchCount;
          dayValidation.sampleMismatch = sampleMismatch;
          dataStartRow = probe + 1;

          if (mismatchCount > 0 && sampleMismatch) {
            warnings.push(
              `[${input.name} / ${sheetName}]: Kode hari tidak sesuai kalender ${MONTH_NAMES_ID[selectedMonth - 1]} ${selectedYear} (${mismatchCount}/${checkedDays} hari berbeda, contoh tgl ${sampleMismatch.day}: tertulis "${sampleMismatch.actual}" seharusnya "${sampleMismatch.expected}").`
            );
          }
          break;
        }
      }
      dayValidations.push(dayValidation);

      // 3-6. Read data rows until recap footer rows
      for (let r = dataStartRow; r < rawMatrix.length; r++) {
        const row = rawMatrix[r] || [];

        const rawNama = namaCol >= 0 ? String(row[namaCol] ?? '').trim() : '';
        const rawJabatan = jabatanCol >= 0 ? String(row[jabatanCol] ?? '').trim() : '';
        const rawArea = areaCol >= 0 ? String(row[areaCol] ?? '').trim() : '';

        const leftCellsNorm: string[] = [];
        for (let c = 0; c <= metaMaxCol; c++) {
          const val = normalizeUpper(row[c]);
          if (val) leftCellsNorm.push(val);
        }

        const dayRawValues = dayColumns.map((dc) => String(row[dc.colIndex] ?? '').trim());
        const hasAnyDayValue = dayRawValues.some((v) => v !== '');

        // Skip completely empty rows
        if (!rawNama && !rawJabatan && !rawArea && !hasAnyDayValue) {
          continue;
        }

        const namaNorm = normalizeUpper(rawNama);
        const jabatanNorm = normalizeUpper(rawJabatan);
        const areaNorm = normalizeUpper(rawArea);

        // Stop condition (Rule 5): Recap footer rows
        if (leftCellsNorm.some(isAlwaysRecapLabel)) {
          break;
        }

        const hasRoleRecapCandidate = leftCellsNorm.some(isRoleRecapLabel);
        if (hasRoleRecapCandidate) {
          const nonEmptyDayNorms = dayRawValues.map(normalizeUpper).filter(Boolean);
          const numericDayCount = nonEmptyDayNorms.filter((v) => /^\d+$/.test(v)).length;
          const shiftTokenCount = nonEmptyDayNorms.filter((v) =>
            ['P', 'S', 'O', 'OFF'].includes(v)
          ).length;

          const isMetadataSingleLabel =
            (isRoleRecapLabel(namaNorm) && !jabatanNorm && !areaNorm) ||
            (!namaNorm && isRoleRecapLabel(areaNorm) && !jabatanNorm);
          const isNumericSummaryRow =
            nonEmptyDayNorms.length > 0 && numericDayCount > shiftTokenCount;

          if (isMetadataSingleLabel || isNumericSummaryRow) {
            break;
          }
        }

        // Empty Nama with Area/Shift -> Slot Kosong (Rule 4)
        const isSlotKosong = rawNama === '';
        const finalNama = isSlotKosong ? 'Slot Kosong' : rawNama.replace(/\s+/g, ' ').trim();
        const finalJabatan = jabatanNorm || '-';
        const finalArea = areaNorm || '-';

        if (finalJabatan !== '-' && !(STANDARD_JABATAN as readonly string[]).includes(finalJabatan)) {
          warnings.push(
            `[${input.name} / ${sheetName}] "${finalNama}": Jabatan "${finalJabatan}" di luar standar (SPV, TL, CLEANING, GONDOLA).`
          );
        }

        if (finalArea !== '-' && !(STANDARD_AREAS as readonly string[]).includes(finalArea)) {
          warnings.push(
            `[${input.name} / ${sheetName}] "${finalNama}": Area "${finalArea}" di luar daftar area standar.`
          );
        }

        const rowShifts: Record<number, string> = {};
        const invalidDays: Record<number, string> = {};
        const rowId = `${input.name}::${sheetName}::${r}::${rows.length}`;

        for (const dc of dayColumns) {
          const rawCell = row[dc.colIndex];
          const { normalized, isValid, rawCleaned } = normalizeShiftCode(rawCell);

          if (isValid) {
            rowShifts[dc.day] = normalized;
          } else {
            rowShifts[dc.day] = rawCleaned || '';
            invalidDays[dc.day] = rawCleaned || '(kosong)';
            invalidCellCount++;
            warnings.push(
              `[${input.name} / ${sheetName}] "${finalNama}" Tgl ${dc.day}: Kode shift "${
                rawCleaned || '(kosong)'
              }" tidak dikenal (gunakan P, S, OFF, atau O).`
            );
          }

          entries.push({
            bulan: selectedMonth,
            tahun: selectedYear,
            nama: finalNama,
            jabatan: finalJabatan,
            area: finalArea,
            tanggal: dc.day,
            shift: isValid ? normalized : rawCleaned,
          });
        }

        rows.push({
          rowId,
          sourceFile: input.name,
          sourceSheet: sheetName,
          nama: finalNama,
          isSlotKosong,
          jabatan: finalJabatan,
          area: finalArea,
          shifts: rowShifts,
          invalidDays,
        });
      }
    }
  }

  const daysCount =
    maxDaysDetected > 0 ? maxDaysDetected : getDaysInMonth(selectedMonth, selectedYear);

  return {
    bulan: selectedMonth,
    tahun: selectedYear,
    daysCount,
    employeeCount: rows.length,
    rows,
    entries,
    warnings,
    errors,
    invalidCellCount,
    sheetsProcessed,
    dayValidations,
  };
}

/**
 * Reconstruct table rows from flat stored entries:
 * { bulan, tahun, nama, jabatan, area, tanggal, shift }
 */
export function buildRowsFromEntries(
  entries: UploadedWorkScheduleEntry[]
): { rows: ParsedScheduleRow[]; daysCount: number } {
  const map = new Map<string, ParsedScheduleRow>();
  let maxDay = 0;

  entries.forEach((entry, idx) => {
    const key = `${entry.nama}__${entry.jabatan}__${entry.area}`;
    let existing = map.get(key);
    if (!existing) {
      existing = {
        rowId: `saved-${map.size}-${idx}`,
        sourceFile: 'Tersimpan',
        sourceSheet: 'Jadwal Kerja',
        nama: entry.nama,
        isSlotKosong: entry.nama.toUpperCase() === 'SLOT KOSONG',
        jabatan: entry.jabatan,
        area: entry.area,
        shifts: {},
        invalidDays: {},
      };
      map.set(key, existing);
    }
    const { normalized, isValid, rawCleaned } = normalizeShiftCode(entry.shift);
    existing.shifts[entry.tanggal] = isValid ? normalized : rawCleaned;
    if (!isValid) {
      existing.invalidDays[entry.tanggal] = rawCleaned || '(kosong)';
    }
    if (entry.tanggal > maxDay) maxDay = entry.tanggal;
  });

  return {
    rows: Array.from(map.values()),
    daysCount: maxDay > 0 ? maxDay : 31,
  };
}

/**
 * Auto-calculate daily recap metrics for each day 1..daysCount:
 * SPV, TL, P, S, Gondola, OFF, Jumlah.
 */
export function calculateScheduleDailyRecap(
  rows: ParsedScheduleRow[],
  daysCount: number
): Record<number, DailyRecapCounts> {
  const result: Record<number, DailyRecapCounts> = {};

  for (let d = 1; d <= daysCount; d++) {
    let spv = 0;
    let tl = 0;
    let pagi = 0;
    let siang = 0;
    let gondola = 0;
    let off = 0;
    let jumlah = 0;

    for (const row of rows) {
      const shift = normalizeUpper(row.shifts[d]);
      const jabatan = normalizeUpper(row.jabatan);

      const isWorking = shift === 'P' || shift === 'S';
      if (shift === 'P') pagi++;
      else if (shift === 'S') siang++;
      else if (shift === 'OFF' || shift === 'O') off++;

      if (isWorking) {
        if (jabatan === 'SPV') spv++;
        if (jabatan === 'TL') tl++;
        if (jabatan === 'GONDOLA') gondola++;
      }

      if (shift !== '') jumlah++;
    }

    result[d] = { spv, tl, pagi, siang, gondola, off, jumlah };
  }

  return result;
}

/**
 * Generate & download a clean .xlsx template matching the parser's exact specification.
 */
export function downloadWorkScheduleTemplate(bulan: number, tahun: number): void {
  const daysInMonth = getDaysInMonth(bulan, tahun);
  const monthName = MONTH_NAMES_ID[bulan - 1] || `Bulan ${bulan}`;
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const titleRow = [`TEMPLATE JADWAL KERJA & ROSTER - ${monthName.toUpperCase()} ${tahun}`];
  const noteRow = ['Keterangan Shift: P = Pagi, S = Siang, OFF / O = Libur'];
  const emptyRow: string[] = [];

  const headerRow: Array<string | number> = ['NAMA', 'JABATAN', 'AREA', ...days];
  const dayCodeRow: string[] = [
    '',
    '',
    '',
    ...days.map((d) => getIndonesianDayCode(bulan, tahun, d)),
  ];

  const sampleStaff: Array<{ nama: string; jabatan: string; area: string; pattern: string[] }> = [
    {
      nama: 'Budi Santoso',
      jabatan: 'SPV',
      area: 'ALL AREA',
      pattern: ['P', 'P', 'P', 'P', 'P', 'P', 'OFF'],
    },
    {
      nama: 'Andi Wijaya',
      jabatan: 'TL',
      area: 'LOBBY',
      pattern: ['P', 'P', 'P', 'OFF', 'P', 'P', 'P'],
    },
    {
      nama: 'Siti Aminah',
      jabatan: 'TL',
      area: 'KORIDOR',
      pattern: ['S', 'S', 'OFF', 'S', 'S', 'S', 'S'],
    },
    {
      nama: 'Rudi Hartono',
      jabatan: 'CLEANING',
      area: 'FASILITAS',
      pattern: ['P', 'P', 'P', 'P', 'OFF', 'P', 'P'],
    },
    {
      nama: 'Dewi Lestari',
      jabatan: 'CLEANING',
      area: 'OFFICE',
      pattern: ['S', 'S', 'S', 'S', 'S', 'OFF', 'S'],
    },
    {
      nama: 'Agus Pratama',
      jabatan: 'CLEANING',
      area: 'RELIFER',
      pattern: ['P', 'OFF', 'S', 'P', 'P', 'S', 'P'],
    },
    {
      nama: 'Hendra Gunawan',
      jabatan: 'CLEANING',
      area: 'TEAM GC',
      pattern: ['P', 'P', 'P', 'P', 'P', 'OFF', 'P'],
    },
    {
      nama: '',
      jabatan: 'GONDOLA',
      area: 'ROOF',
      pattern: ['P', 'P', 'OFF', 'P', 'P', 'P', 'OFF'],
    },
  ];

  const dataRows = sampleStaff.map((staff) => [
    staff.nama,
    staff.jabatan,
    staff.area,
    ...days.map((d) => staff.pattern[(d - 1) % staff.pattern.length]),
  ]);

  // Compute recap rows for completeness in the template
  const recapMeta = days.map((d) => {
    const idx = d - 1;
    let spv = 0;
    let tl = 0;
    let pagi = 0;
    let siang = 0;
    let gondola = 0;
    let off = 0;

    for (const staff of sampleStaff) {
      const s = staff.pattern[idx % staff.pattern.length];
      if (s === 'P') pagi++;
      else if (s === 'S') siang++;
      else if (s === 'OFF' || s === 'O') off++;
      if (s === 'P' || s === 'S') {
        if (staff.jabatan === 'SPV') spv++;
        if (staff.jabatan === 'TL') tl++;
        if (staff.jabatan === 'GONDOLA') gondola++;
      }
    }
    return { spv, tl, pagi, siang, gondola, off, jumlah: pagi + siang + off };
  });

  const recapRows: Array<Array<string | number>> = [
    ['SPV', '', '', ...recapMeta.map((m) => m.spv)],
    ['TL', '', '', ...recapMeta.map((m) => m.tl)],
    ['P (PAGI)', '', '', ...recapMeta.map((m) => m.pagi)],
    ['S (SIANG)', '', '', ...recapMeta.map((m) => m.siang)],
    ['GONDOLA', '', '', ...recapMeta.map((m) => m.gondola)],
    ['O (OFF)', '', '', ...recapMeta.map((m) => m.off)],
    ['JUMLAH', '', '', ...recapMeta.map((m) => m.jumlah)],
  ];

  const aoa: Array<Array<string | number>> = [
    titleRow,
    noteRow,
    emptyRow,
    headerRow,
    dayCodeRow,
    ...dataRows,
    recapRows[0],
    ...recapRows.slice(1),
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [
    { wch: 22 },
    { wch: 12 },
    { wch: 14 },
    ...days.map(() => ({ wch: 5 })),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${monthName} ${tahun}`.slice(0, 31));
  XLSX.writeFile(wb, `Template_Jadwal_Kerja_${monthName}_${tahun}.xlsx`);
}
