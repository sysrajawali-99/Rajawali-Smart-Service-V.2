import * as XLSX from 'xlsx';
import { UploadedMcpRow } from '../types';
import {
  DAY_CODES_ID,
  MONTH_NAMES_ID,
  getDaysInMonth,
  getIndonesianDayCode,
  guessMonthYearFromNames,
} from './workScheduleExcel';

export { DAY_CODES_ID, MONTH_NAMES_ID, getDaysInMonth, getIndonesianDayCode };

export interface ParsedMcpDateColumn {
  colIndex: number;
  tanggal: number;
}

export interface ParsedMcpSheetSummary {
  fileName: string;
  sheetName: string;
  rowCount: number;
  datesCount: number;
  scheduledCells: number;
  hasHeader: boolean;
  hasDayRow: boolean;
  dayMismatchCount: number;
}

export interface ExtractedMcpMetadata {
  bulan?: number;
  tahun?: number;
  lokasiProyek?: string;
  sourceTitleText?: string;
  sourceAreaText?: string;
}

export interface ParseMcpResult {
  lokasiProyek: string;
  bulan: number;
  tahun: number;
  daysCount: number;
  sheetNames: string[];
  sheetSummaries: ParsedMcpSheetSummary[];
  rows: UploadedMcpRow[];
  datesDetected: number[];
  lokasiKerjaGroups: string[];
  totalRows: number;
  totalScheduledCells: number;
  uniqueTokens: string[];
  structuralWarnings: string[];
  detectedMetadata: ExtractedMcpMetadata;
}

export interface McpTokenStyle {
  token: string;
  count: number;
  cellClass: string;
  badgeClass: string;
  dotClass: string;
}

export interface McpRecapAndLegend {
  dailyCounts: Record<number, number>;
  totalScheduledCells: number;
  legend: McpTokenStyle[];
  tokenStyleMap: Map<string, McpTokenStyle>;
}

const TOKEN_COLOR_PALETTE: Array<{
  cellClass: string;
  badgeClass: string;
  dotClass: string;
}> = [
  {
    cellClass: 'bg-teal-100 text-teal-900 font-bold',
    badgeClass: 'bg-teal-100 text-teal-900 border-teal-300',
    dotClass: 'bg-teal-600',
  },
  {
    cellClass: 'bg-sky-100 text-sky-900 font-bold',
    badgeClass: 'bg-sky-100 text-sky-900 border-sky-300',
    dotClass: 'bg-sky-600',
  },
  {
    cellClass: 'bg-emerald-100 text-emerald-900 font-bold',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    dotClass: 'bg-emerald-600',
  },
  {
    cellClass: 'bg-amber-100 text-amber-900 font-bold',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    dotClass: 'bg-amber-500',
  },
  {
    cellClass: 'bg-indigo-100 text-indigo-900 font-bold',
    badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-300',
    dotClass: 'bg-indigo-600',
  },
  {
    cellClass: 'bg-violet-100 text-violet-900 font-bold',
    badgeClass: 'bg-violet-100 text-violet-900 border-violet-300',
    dotClass: 'bg-violet-600',
  },
  {
    cellClass: 'bg-rose-100 text-rose-900 font-bold',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-300',
    dotClass: 'bg-rose-600',
  },
  {
    cellClass: 'bg-cyan-100 text-cyan-900 font-bold',
    badgeClass: 'bg-cyan-100 text-cyan-900 border-cyan-300',
    dotClass: 'bg-cyan-600',
  },
  {
    cellClass: 'bg-lime-100 text-lime-900 font-bold',
    badgeClass: 'bg-lime-100 text-lime-900 border-lime-300',
    dotClass: 'bg-lime-600',
  },
  {
    cellClass: 'bg-orange-100 text-orange-900 font-bold',
    badgeClass: 'bg-orange-100 text-orange-900 border-orange-300',
    dotClass: 'bg-orange-600',
  },
  {
    cellClass: 'bg-fuchsia-100 text-fuchsia-900 font-bold',
    badgeClass: 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300',
    dotClass: 'bg-fuchsia-600',
  },
  {
    cellClass: 'bg-slate-200 text-slate-900 font-bold',
    badgeClass: 'bg-slate-200 text-slate-900 border-slate-400',
    dotClass: 'bg-slate-600',
  },
];

function trimCell(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).replace(/^[\s\u00A0]+|[\s\u00A0]+$/g, '');
}

function normalizeHeaderNorm(val: unknown): string {
  return trimCell(val)
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

export function normalizeLokasiProyekKey(name: string): string {
  return (
    trimCell(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'default'
  );
}

function getRawCell(sheet: XLSX.WorkSheet, r: number, c: number): XLSX.CellObject | undefined {
  const addr = XLSX.utils.encode_cell({ r, c });
  return sheet[addr] as XLSX.CellObject | undefined;
}

/**
 * Extracts displayed value from a SheetJS cell (preserving numeric `0` as `"0"`,
 * formula cached display `.w`, etc.) without rejecting any character.
 */
function getSheetCellDisplayText(sheet: XLSX.WorkSheet, r: number, c: number): string {
  const cell = getRawCell(sheet, r, c);
  if (!cell) return '';
  if (cell.w !== undefined && cell.w !== null) {
    return trimCell(cell.w);
  }
  if (cell.v !== undefined && cell.v !== null) {
    if (cell.v instanceof Date) {
      return `${cell.v.getDate()}/${cell.v.getMonth() + 1}/${cell.v.getFullYear()}`;
    }
    return trimCell(cell.v);
  }
  return '';
}

/**
 * Checks whether a cell in date columns contains an Excel/CSV formula (starts with `=`).
 */
function cellHasFormula(sheet: XLSX.WorkSheet, r: number, c: number): boolean {
  const cell = getRawCell(sheet, r, c);
  if (!cell) return false;
  if (typeof cell.f === 'string' && cell.f.trim() !== '') return true;
  const rawStr = trimCell(cell.v ?? cell.w ?? '');
  return rawStr.startsWith('=');
}

const MONTH_NAME_MAP: Record<string, number> = {
  JANUARI: 1, JANUARY: 1, JAN: 1,
  FEBRUARI: 2, PEBRUARI: 2, FEBRUARY: 2, FEB: 2, PEB: 2,
  MARET: 3, MARCH: 3, MAR: 3,
  APRIL: 4, APR: 4,
  MEI: 5, MAY: 5,
  JUNI: 6, JUNE: 6, JUN: 6,
  JULI: 7, JULY: 7, JUL: 7,
  AGUSTUS: 8, AUGUST: 8, AGU: 8, AGS: 8, AUG: 8,
  SEPTEMBER: 9, SEPT: 9, SEP: 9,
  OKTOBER: 10, OCTOBER: 10, OKT: 10, OCT: 10,
  NOVEMBER: 11, NOPEMBER: 11, NOV: 11, NOP: 11,
  DESEMBER: 12, DECEMBER: 12, DES: 12, DEC: 12,
};

function parseMonthYearFromText(text: string): { bulan?: number; tahun?: number } {
  const upper = trimCell(text).replace(/\s+/g, ' ').toUpperCase();
  if (!upper) return {};

  let bulan: number | undefined;
  let tahun: number | undefined;

  const yearMatch = upper.match(/\b(20[2-9]\d)\b/);
  if (yearMatch) {
    tahun = Number(yearMatch[1]);
  }

  for (const [token, m] of Object.entries(MONTH_NAME_MAP)) {
    const regex = new RegExp(`\\b${token}\\b`, 'i');
    if (regex.test(upper)) {
      bulan = m;
      break;
    }
  }

  return { bulan, tahun };
}

/**
 * Extracts `AREA : <nama>` from a row, handling both single-cell `"AREA : GEDUNG X"`
 * and split cells `"AREA"` / `": GEDUNG X"` or `"AREA :"` / `"GEDUNG X"`.
 */
function parseAreaMetadataFromRow(
  sheet: XLSX.WorkSheet,
  r: number,
  maxCol: number
): { lokasiProyek: string; rawText: string } | null {
  const scanCols = Math.min(maxCol, 15);
  for (let c = 0; c <= scanCols; c++) {
    const txt = getSheetCellDisplayText(sheet, r, c);
    if (!txt) continue;

    // Case 1: Same cell has "AREA : <nama>" or "AREA: <nama>"
    const inlineMatch = txt.match(/^AREA\s*[:=]\s*(.+)$/i);
    if (inlineMatch && trimCell(inlineMatch[1])) {
      return {
        lokasiProyek: trimCell(inlineMatch[1]),
        rawText: txt,
      };
    }

    // Case 2: Cell is "AREA" or "AREA :" and next non-empty cell has "<nama>" or ": <nama>"
    if (/^AREA\s*[:=]?$/i.test(txt)) {
      for (let nc = c + 1; nc <= Math.min(c + 4, maxCol); nc++) {
        const nextTxt = getSheetCellDisplayText(sheet, r, nc);
        if (!nextTxt) continue;
        const cleaned = trimCell(nextTxt.replace(/^[:=]\s*/, ''));
        if (cleaned && !/^LOKASI KERJA$/i.test(cleaned)) {
          return {
            lokasiProyek: cleaned,
            rawText: `${txt} ${nextTxt}`,
          };
        }
      }
    }
  }
  return null;
}

const DAY_OF_WEEK_MAP: Record<string, number> = {
  MG: 0, MIN: 0, MINGGU: 0, MGG: 0, SUN: 0, SUNDAY: 0,
  SN: 1, SEN: 1, SENIN: 1, SNN: 1, MON: 1, MONDAY: 1,
  SL: 2, SEL: 2, SELASA: 2, SLS: 2, TUE: 2, TUESDAY: 2,
  RB: 3, RAB: 3, RABU: 3, WED: 3, WEDNESDAY: 3,
  KM: 4, KAM: 4, KAMIS: 4, KMS: 4, THU: 4, THURSDAY: 4,
  JM: 5, JUM: 5, JUMAT: 5, "JUM'AT": 5, JMT: 5, FRI: 5, FRIDAY: 5,
  SB: 6, SAB: 6, SABTU: 6, SBT: 6, SAT: 6, SATURDAY: 6,
};

function parseDayOfWeekCode(raw: string): number | null {
  const token = trimCell(raw)
    .toUpperCase()
    .replace(/[^A-Z']/g, '');
  if (!token) return null;
  return DAY_OF_WEEK_MAP[token] ?? null;
}

function parseDateNumberHeader(sheet: XLSX.WorkSheet, r: number, c: number): number | null {
  const cell = getRawCell(sheet, r, c);
  if (!cell) return null;

  if (cell.t === 'd' && cell.v instanceof Date && !Number.isNaN(cell.v.getTime())) {
    return cell.v.getDate();
  }
  if (cell.t === 'n' && typeof cell.v === 'number') {
    if (Number.isInteger(cell.v) && cell.v >= 1 && cell.v <= 31) {
      return cell.v;
    }
    const zStr = typeof cell.z === 'string' ? cell.z : '';
    if (
      ((zStr && XLSX.SSF?.is_date?.(zStr)) || (cell.v >= 35000 && cell.v <= 75000)) &&
      XLSX.SSF?.parse_date_code
    ) {
      const parsed = XLSX.SSF.parse_date_code(cell.v);
      if (parsed && parsed.d >= 1 && parsed.d <= 31) return parsed.d;
    }
  }

  const txt = getSheetCellDisplayText(sheet, r, c);
  if (!txt) return null;
  const plainMatch = txt.match(/^(?:TGL|TANGGAL)?\.?\s*0?([1-9]|[12]\d|3[01])\.?$/i);
  if (plainMatch) return Number(plainMatch[1]);

  const dmyMatch = txt.match(/^0?([1-9]|[12]\d|3[01])[-/]0?([1-9]|1[0-2])(?:[-/](\d{2,4}))?$/);
  if (dmyMatch) return Number(dmyMatch[1]);

  const isoMatch = txt.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const day = Number(isoMatch[3]);
    if (day >= 1 && day <= 31) return day;
  }

  return null;
}

interface DetectedTemplateHeader {
  headerRowIndex: number;
  dateRowIndex: number;
  lokasiKerjaCol: number;
  areaPekerjaanCol: number;
  jenisPekerjaanCol: number;
  dateColumns: ParsedMcpDateColumn[];
}

function matchesTemplateField(
  norm: string,
  target: 'LOKASI KERJA' | 'AREA PEKERJAAN' | 'JENIS PEKERJAAN'
): boolean {
  if (!norm) return false;
  if (target === 'LOKASI KERJA') {
    return norm === 'LOKASI KERJA' || norm.includes('LOKASI KERJA');
  }
  if (target === 'AREA PEKERJAAN') {
    return norm === 'AREA PEKERJAAN' || norm.includes('AREA PEKERJAAN');
  }
  return norm === 'JENIS PEKERJAAN' || norm.includes('JENIS PEKERJAAN');
}

/**
 * Extracts sequential day columns `1..28..31` starting strictly to the right of `minColExclusive`.
 * Stops before trailing columns on the right (such as TOTAL/JUMLAH) once the month sequence finishes.
 */
function extractSequentialDateColumns(
  sheet: XLSX.WorkSheet,
  r: number,
  minColExclusive: number,
  maxCol: number
): ParsedMcpDateColumn[] {
  const found: ParsedMcpDateColumn[] = [];
  for (let c = minColExclusive + 1; c <= maxCol; c++) {
    const d = parseDateNumberHeader(sheet, r, c);
    if (d !== null) {
      found.push({ colIndex: c, tanggal: d });
    }
  }
  if (found.length < 7) return [];

  // Longest strictly increasing run (1..28..31)
  let bestRun: ParsedMcpDateColumn[] = [];
  for (let start = 0; start < found.length; start++) {
    const run: ParsedMcpDateColumn[] = [found[start]];
    for (let k = start + 1; k < found.length; k++) {
      const prev = run[run.length - 1];
      const curr = found[k];
      if (
        curr.tanggal > prev.tanggal &&
        curr.tanggal - prev.tanggal <= 3 &&
        curr.colIndex - prev.colIndex <= 3
      ) {
        run.push(curr);
      } else if (curr.tanggal === 1 && prev.tanggal >= 28) {
        break;
      }
    }
    if (run.length > bestRun.length) {
      bestRun = run;
    }
  }

  if (bestRun.length < 7) return [];
  if (bestRun[0].tanggal !== 1 && bestRun.length < 20) return [];
  return bestRun;
}

/**
 * Automatically finds the header row containing "Lokasi Kerja", "Area Pekerjaan", "Jenis Pekerjaan"
 * and sequential date columns 1..28..31 to the right of them.
 */
function detectMcpTemplateHeader(
  sheet: XLSX.WorkSheet,
  maxRow: number,
  maxCol: number,
  merges: XLSX.Range[]
): DetectedTemplateHeader | null {
  const scanLimit = Math.min(maxRow, 60);

  const getHeaderResolvedText = (r: number, c: number): string => {
    const direct = getSheetCellDisplayText(sheet, r, c);
    if (direct) return direct;
    const m = merges.find((rng) => r >= rng.s.r && r <= rng.e.r && c >= rng.s.c && c <= rng.e.c);
    if (m) return getSheetCellDisplayText(sheet, m.s.r, m.s.c);
    return '';
  };

  for (let r = 0; r <= scanLimit; r++) {
    let lokasiCol = -1;
    let areaCol = -1;
    let jenisCol = -1;

    for (let c = 0; c <= maxCol; c++) {
      const norm = normalizeHeaderNorm(getHeaderResolvedText(r, c));
      if (!norm) continue;
      if (lokasiCol === -1 && matchesTemplateField(norm, 'LOKASI KERJA')) {
        lokasiCol = c;
      } else if (areaCol === -1 && matchesTemplateField(norm, 'AREA PEKERJAAN')) {
        areaCol = c;
      } else if (jenisCol === -1 && matchesTemplateField(norm, 'JENIS PEKERJAAN')) {
        jenisCol = c;
      }
    }

    if (lokasiCol !== -1 && areaCol !== -1 && jenisCol !== -1) {
      const rightMostInfoCol = Math.max(lokasiCol, areaCol, jenisCol);

      // Primary check: dates on the same row `r` to the right of Jenis Pekerjaan
      let dateCols = extractSequentialDateColumns(sheet, r, rightMostInfoCol, maxCol);
      let dateRowIndex = r;

      // Secondary check: if `Lokasi Kerja / Area Pekerjaan / Jenis Pekerjaan` are merged vertically 2 rows
      // and `1..31` sits on `r + 1` under a "TANGGAL" parent header
      if (dateCols.length === 0 && r + 1 <= scanLimit) {
        const nextDateCols = extractSequentialDateColumns(sheet, r + 1, rightMostInfoCol, maxCol);
        if (nextDateCols.length > 0) {
          dateCols = nextDateCols;
          dateRowIndex = r + 1;
        }
      }

      if (dateCols.length > 0) {
        return {
          headerRowIndex: Math.max(r, dateRowIndex),
          dateRowIndex,
          lokasiKerjaCol: lokasiCol,
          areaPekerjaanCol: areaCol,
          jenisPekerjaanCol: jenisCol,
          dateColumns: dateCols,
        };
      }
    }
  }

  return null;
}

/**
 * Checks whether a row is a footer recap row that stops table data reading:
 * - Lokasi Kerja and Area Pekerjaan (direct unmerged values) are empty AND Jenis Pekerjaan contains
 *   PLANNING / RENCANA / REALISASI / TIDAK TEREALISASI (or JUMLAH / TOTAL / REKAP), OR
 * - Any date cell on that row contains a formula (`=...`).
 */
function isFooterRecapRow(
  sheet: XLSX.WorkSheet,
  r: number,
  directLokasi: string,
  directArea: string,
  directJenis: string,
  dateColumns: ParsedMcpDateColumn[]
): boolean {
  // Check formula in date columns first
  for (const dc of dateColumns) {
    if (cellHasFormula(sheet, r, dc.colIndex)) {
      return true;
    }
  }

  if (directLokasi === '' && directArea === '' && directJenis !== '') {
    const upperJenis = directJenis.toUpperCase();
    if (
      /\bPLANNING\b/i.test(upperJenis) ||
      /\bPLANING\b/i.test(upperJenis) ||
      /\bRENCANA\b/i.test(upperJenis) ||
      /\bREALISASI\b/i.test(upperJenis) ||
      /\bTIDAK\s+TEREALISASI\b/i.test(upperJenis) ||
      /^(GRAND\s*TOTAL|SUB\s*TOTAL|SUBTOTAL|JUMLAH|TOTAL|REKAP(ITULASI)?)(\s*[:\-].*)?$/i.test(
        upperJenis
      )
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Extracts metadata (bulan, tahun, lokasi_proyek) from title rows above the header,
 * sheet names, and file names without hardcoding row numbers.
 */
export function extractMcpMetadataFromInputs(
  inputs: Array<{ name: string; buffer: ArrayBuffer }>
): ExtractedMcpMetadata {
  const meta: ExtractedMcpMetadata = {};
  const fallbackNames: string[] = [];

  for (const item of inputs) {
    fallbackNames.push(item.name);
    try {
      const wb = XLSX.read(item.buffer, { type: 'array', cellDates: false });
      for (const sheetName of wb.SheetNames) {
        fallbackNames.push(sheetName);
        const sheet = wb.Sheets[sheetName];
        if (!sheet || !sheet['!ref']) continue;
        const range = XLSX.utils.decode_range(sheet['!ref']);
        const merges = sheet['!merges'] || [];
        const headerInfo = detectMcpTemplateHeader(sheet, range.e.r, range.e.c, merges);
        const metaRowLimit = headerInfo ? headerInfo.headerRowIndex - 1 : Math.min(range.e.r, 12);

        for (let r = 0; r <= Math.max(0, metaRowLimit); r++) {
          if (!meta.lokasiProyek) {
            const areaFound = parseAreaMetadataFromRow(sheet, r, range.e.c);
            if (areaFound) {
              meta.lokasiProyek = areaFound.lokasiProyek;
              meta.sourceAreaText = areaFound.rawText;
            }
          }

          for (let c = 0; c <= Math.min(range.e.c, 15); c++) {
            const txt = getSheetCellDisplayText(sheet, r, c);
            if (!txt) continue;
            fallbackNames.push(txt);

            // Title text above header like "PLANING MONTHLY REPORT OKTOBER 2026"
            const parsedMY = parseMonthYearFromText(txt);
            if (parsedMY.bulan && !meta.bulan) {
              meta.bulan = parsedMY.bulan;
              meta.sourceTitleText = meta.sourceTitleText || txt;
            }
            if (parsedMY.tahun && !meta.tahun) {
              meta.tahun = parsedMY.tahun;
              meta.sourceTitleText = meta.sourceTitleText || txt;
            }
          }
        }
      }
    } catch {
      // Ignore corrupt files during metadata probe; parser handles errors
    }
  }

  if (!meta.bulan || !meta.tahun) {
    const guessed = guessMonthYearFromNames(fallbackNames);
    if (!meta.bulan && guessed.bulan) meta.bulan = guessed.bulan;
    if (!meta.tahun && guessed.tahun) meta.tahun = guessed.tahun;
  }

  return meta;
}

/**
 * Flexibly parses one or more .xlsx, .xls, or .csv files across ALL sheets
 * according to the Planning Monthly Report MCP template specification.
 */
export function parseMcpBuffers(
  inputs: Array<{ name: string; buffer: ArrayBuffer }>,
  selectedMonth: number,
  selectedYear: number,
  lokasiProyekOverride?: string
): ParseMcpResult {
  const detectedMetadata = extractMcpMetadataFromInputs(inputs);
  const resolvedLokasiProyek = trimCell(
    lokasiProyekOverride !== undefined
      ? lokasiProyekOverride
      : detectedMetadata.lokasiProyek || ''
  );

  const structuralWarnings: string[] = [];
  const allRows: UploadedMcpRow[] = [];
  const sheetNames: string[] = [];
  const sheetSummaries: ParsedMcpSheetSummary[] = [];
  const detectedDateNumbers = new Set<number>();
  const uniqueTokenSet = new Set<string>();
  const lokasiKerjaGroupSet = new Set<string>();

  let totalScheduledCells = 0;
  let maxDaySeen = getDaysInMonth(selectedMonth, selectedYear);
  let globalUrutan = 1;

  for (const input of inputs) {
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(input.buffer, { type: 'array', cellDates: false });
    } catch (err: any) {
      structuralWarnings.push(
        `File "${input.name}": gagal dibaca (${err?.message || 'format file tidak valid'}).`
      );
      continue;
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      structuralWarnings.push(`File "${input.name}": tidak memiliki sheet yang dapat dibaca.`);
      continue;
    }

    for (const rawSheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[rawSheetName];
      if (!sheet || !sheet['!ref']) continue;

      const range = XLSX.utils.decode_range(sheet['!ref']);
      let hasAnyContent = false;
      for (let r = range.s.r; r <= range.e.r && !hasAnyContent; r++) {
        for (let c = range.s.c; c <= range.e.c; c++) {
          if (getSheetCellDisplayText(sheet, r, c)) {
            hasAnyContent = true;
            break;
          }
        }
      }
      if (!hasAnyContent) continue;

      const sheetLabel = inputs.length > 1 ? `${input.name} :: ${rawSheetName}` : rawSheetName;
      sheetNames.push(sheetLabel);

      const merges = sheet['!merges'] || [];
      const header = detectMcpTemplateHeader(sheet, range.e.r, range.e.c, merges);

      if (!header) {
        structuralWarnings.push(
          `Sheet "${sheetLabel}": baris header ("Lokasi Kerja", "Area Pekerjaan", "Jenis Pekerjaan" + kolom tanggal 1 s/d 28-31) tidak ditemukan.`
        );
        sheetSummaries.push({
          fileName: input.name,
          sheetName: rawSheetName,
          rowCount: 0,
          datesCount: 0,
          scheduledCells: 0,
          hasHeader: false,
          hasDayRow: false,
          dayMismatchCount: 0,
        });
        continue;
      }

      const {
        headerRowIndex,
        dateRowIndex,
        lokasiKerjaCol,
        areaPekerjaanCol,
        jenisPekerjaanCol,
        dateColumns,
      } = header;

      for (const dc of dateColumns) {
        detectedDateNumbers.add(dc.tanggal);
        if (dc.tanggal > maxDaySeen) maxDaySeen = dc.tanggal;
      }

      // Check row immediately below dateRowIndex for day-of-week codes (SN, SL, RB, KM, JM, SB, MG)
      // Used ONLY to validate selected Bulan & Tahun, NOT as data rows.
      let dataStartRow = Math.max(headerRowIndex, dateRowIndex) + 1;
      let hasDayRow = false;
      let dayMismatchCount = 0;

      for (
        let probe = dataStartRow;
        probe <= Math.min(dataStartRow + 1, range.e.r);
        probe++
      ) {
        let recognizedDowCount = 0;
        let checkedDays = 0;
        let mismatches = 0;
        let sampleMismatch: { day: number; actual: string; expected: string } | undefined;
        const daysInSelectedMonth = getDaysInMonth(selectedMonth, selectedYear);

        for (const dc of dateColumns) {
          const rawDow = getSheetCellDisplayText(sheet, probe, dc.colIndex);
          const dow = parseDayOfWeekCode(rawDow);
          if (dow !== null) {
            recognizedDowCount++;
            if (dc.tanggal <= daysInSelectedMonth) {
              checkedDays++;
              const expectedDow = new Date(selectedYear, selectedMonth - 1, dc.tanggal).getDay();
              if (dow !== expectedDow) {
                mismatches++;
                if (!sampleMismatch) {
                  sampleMismatch = {
                    day: dc.tanggal,
                    actual: rawDow.toUpperCase(),
                    expected: DAY_CODES_ID[expectedDow],
                  };
                }
              }
            }
          }
        }

        if (recognizedDowCount >= 5) {
          hasDayRow = true;
          dayMismatchCount = mismatches;
          dataStartRow = probe + 1;
          if (mismatches > 0 && sampleMismatch) {
            structuralWarnings.push(
              `Sheet "${sheetLabel}": kode hari tidak sesuai kalender ${
                MONTH_NAMES_ID[selectedMonth - 1]
              } ${selectedYear} (${mismatches}/${checkedDays} hari berbeda, contoh tgl ${
                sampleMismatch.day
              }: tertulis "${sampleMismatch.actual}" seharusnya "${sampleMismatch.expected}").`
            );
          }
          break;
        }
      }

      // Helper to read merged cell value in data columns
      const resolveMergedCell = (r: number, c: number): string => {
        const direct = getSheetCellDisplayText(sheet, r, c);
        if (direct) return direct;
        const merge = merges.find(
          (m) =>
            m.s.r >= dataStartRow &&
            r >= m.s.r &&
            r <= m.e.r &&
            c >= m.s.c &&
            c <= m.e.c
        );
        if (merge) {
          return getSheetCellDisplayText(sheet, merge.s.r, merge.s.c);
        }
        return '';
      };

      let sheetRowCount = 0;
      let sheetScheduledCount = 0;
      let lastLokasiKerja = '';

      for (let r = dataStartRow; r <= range.e.r; r++) {
        const directLokasi = getSheetCellDisplayText(sheet, r, lokasiKerjaCol);
        const directArea = getSheetCellDisplayText(sheet, r, areaPekerjaanCol);
        const directJenis = getSheetCellDisplayText(sheet, r, jenisPekerjaanCol);

        // Stop reading at footer recap rows (PLANNING/RENCANA, REALISASI, TIDAK TEREALISASI, or date formula `=...`)
        if (
          isFooterRecapRow(
            sheet,
            r,
            directLokasi,
            directArea,
            directJenis,
            dateColumns
          )
        ) {
          break;
        }

        const mergedLokasi = resolveMergedCell(r, lokasiKerjaCol);
        const areaPekerjaan = resolveMergedCell(r, areaPekerjaanCol);
        const jenisPekerjaan = resolveMergedCell(r, jenisPekerjaanCol);

        // Read all non-empty date cells (ANY character/symbol/number including "0" or "/")
        const jadwalCells: Array<{ tanggal: number; nilai_asli: string }> = [];
        for (const dc of dateColumns) {
          const val = getSheetCellDisplayText(sheet, r, dc.colIndex);
          if (val !== '') {
            jadwalCells.push({
              tanggal: dc.tanggal,
              nilai_asli: val,
            });
            uniqueTokenSet.add(val);
          }
        }

        // Completely blank row -> skip
        if (
          directLokasi === '' &&
          mergedLokasi === '' &&
          areaPekerjaan === '' &&
          jenisPekerjaan === '' &&
          jadwalCells.length === 0
        ) {
          continue;
        }

        // Fill Lokasi Kerja downwards from merged parent or preceding group value until a new value appears
        let lokasiKerja = mergedLokasi;
        if (lokasiKerja !== '') {
          lastLokasiKerja = lokasiKerja;
        } else if (areaPekerjaan !== '' || jenisPekerjaan !== '') {
          lokasiKerja = lastLokasiKerja;
        }

        // Skip trailing blank-text merge-only rows that have neither Area/Jenis nor schedule
        if (areaPekerjaan === '' && jenisPekerjaan === '' && jadwalCells.length === 0) {
          continue;
        }

        if (lokasiKerja) {
          lokasiKerjaGroupSet.add(lokasiKerja);
        }

        allRows.push({
          lokasi_proyek: resolvedLokasiProyek,
          bulan: selectedMonth,
          tahun: selectedYear,
          lokasi_kerja: lokasiKerja,
          area_pekerjaan: areaPekerjaan,
          jenis_pekerjaan: jenisPekerjaan,
          urutan: globalUrutan++,
          jadwal: jadwalCells,
          sheet: sheetLabel,
        });

        sheetRowCount++;
        sheetScheduledCount += jadwalCells.length;
        totalScheduledCells += jadwalCells.length;
      }

      sheetSummaries.push({
        fileName: input.name,
        sheetName: rawSheetName,
        rowCount: sheetRowCount,
        datesCount: dateColumns.length,
        scheduledCells: sheetScheduledCount,
        hasHeader: true,
        hasDayRow,
        dayMismatchCount,
      });
    }
  }

  return {
    lokasiProyek: resolvedLokasiProyek,
    bulan: selectedMonth,
    tahun: selectedYear,
    daysCount: Math.min(31, Math.max(28, maxDaySeen)),
    sheetNames,
    sheetSummaries,
    rows: allRows,
    datesDetected: Array.from(detectedDateNumbers).sort((a, b) => a - b),
    lokasiKerjaGroups: Array.from(lokasiKerjaGroupSet),
    totalRows: allRows.length,
    totalScheduledCells,
    uniqueTokens: Array.from(uniqueTokenSet).sort((a, b) =>
      a.localeCompare(b, 'id', { numeric: true, sensitivity: 'base' })
    ),
    structuralWarnings,
    detectedMetadata,
  };
}

/**
 * Builds automatic legend styles for EVERY unique `nilai_asli` token found
 * plus per-day scheduled job recap counts.
 */
export function calculateMcpRecapAndLegend(
  rows: UploadedMcpRow[],
  daysCount: number
): McpRecapAndLegend {
  const dailyCounts: Record<number, number> = {};
  for (let d = 1; d <= daysCount; d++) {
    dailyCounts[d] = 0;
  }

  const tokenCounts = new Map<string, number>();
  let totalScheduledCells = 0;

  for (const row of rows) {
    const seenDayInRow = new Set<number>();
    for (const cell of row.jadwal || []) {
      const val = trimCell(cell.nilai_asli);
      if (!val) continue;
      tokenCounts.set(val, (tokenCounts.get(val) || 0) + 1);
      totalScheduledCells++;
      if (cell.tanggal >= 1 && cell.tanggal <= daysCount && !seenDayInRow.has(cell.tanggal)) {
        dailyCounts[cell.tanggal] = (dailyCounts[cell.tanggal] || 0) + 1;
        seenDayInRow.add(cell.tanggal);
      }
    }
  }

  const sortedTokens = Array.from(tokenCounts.keys()).sort((a, b) =>
    a.localeCompare(b, 'id', { numeric: true, sensitivity: 'base' })
  );

  const tokenStyleMap = new Map<string, McpTokenStyle>();
  const legend: McpTokenStyle[] = sortedTokens.map((token, idx) => {
    const palette = TOKEN_COLOR_PALETTE[idx % TOKEN_COLOR_PALETTE.length];
    const style: McpTokenStyle = {
      token,
      count: tokenCounts.get(token) || 0,
      cellClass: palette.cellClass,
      badgeClass: palette.badgeClass,
      dotClass: palette.dotClass,
    };
    tokenStyleMap.set(token, style);
    return style;
  });

  return {
    dailyCounts,
    totalScheduledCells,
    legend,
    tokenStyleMap,
  };
}

/**
 * Generates and downloads a clean Excel (.xlsx) template matching the
 * Planning Monthly Report MCP format (Title, AREA, Lokasi Kerja / Area Pekerjaan /
 * Jenis Pekerjaan + 1..31 + day codes + merged Lokasi Kerja + formula recap footer).
 */
export function downloadMcpTemplate(
  bulan: number,
  tahun: number,
  lokasiProyek = 'PROYEK CONTOH'
): void {
  const daysCount = getDaysInMonth(bulan, tahun);
  const monthLabel = (MONTH_NAMES_ID[bulan - 1] || 'BULAN').toUpperCase();
  const cleanArea = trimCell(lokasiProyek) || 'PROYEK CONTOH';
  const dayHeaders = Array.from({ length: daysCount }, (_, i) => i + 1);
  const dayCodes = dayHeaders.map((d) => getIndonesianDayCode(bulan, tahun, d));

  const titleRow = [`PLANING MONTHLY REPORT ${monthLabel} ${tahun}`];
  const areaMetaRow = [`AREA : ${cleanArea}`];
  const spacerRow: (string | number)[] = [];
  const headerRow = ['Lokasi Kerja', 'Area Pekerjaan', 'Jenis Pekerjaan', ...dayHeaders];
  const dayCodeRow = ['', '', '', ...dayCodes];

  const sampleItems = [
    {
      lokasiKerja: 'LOBBY & RESEPSIONIS',
      areaPekerjaan: 'Lantai Marmer Lobby Utama',
      jenisPekerjaan: 'Dry & Damp Mopping Harian',
      pattern: (d: number) => (d % 2 === 1 ? '/' : 'V'),
    },
    {
      lokasiKerja: 'LOBBY & RESEPSIONIS',
      areaPekerjaan: 'Kaca Entrance & Frame',
      jenisPekerjaan: 'Glass Cleaning & Detailing',
      pattern: (d: number) => (d % 7 === 6 ? 'X' : ''),
    },
    {
      lokasiKerja: 'TOILET UMUM',
      areaPekerjaan: 'Closet, Urinal & Wastafel',
      jenisPekerjaan: 'Deep Cleaning & Disinfeksi',
      pattern: () => '/',
    },
    {
      lokasiKerja: 'AREA EKSTERNAL',
      areaPekerjaan: 'Saluran Air & Taman',
      jenisPekerjaan: 'General Cleaning & Flushing',
      pattern: (d: number) => (d === 5 || d === 20 ? '0' : ''),
    },
  ];

  const dataRows = sampleItems.map((item) => [
    item.lokasiKerja,
    item.areaPekerjaan,
    item.jenisPekerjaan,
    ...dayHeaders.map((d) => item.pattern(d)),
  ]);

  const startDataRowIdx = 5; // 0-indexed row 5 = Excel row 6
  const planningRowIdx = startDataRowIdx + dataRows.length;
  const planningRow: (string | number)[] = ['', '', 'PLANNING / RENCANA', ...dayHeaders.map(() => 0)];
  const realisasiRow: (string | number)[] = ['', '', 'REALISASI', ...dayHeaders.map(() => '')];
  const tidakTerealisasiRow: (string | number)[] = [
    '',
    '',
    'TIDAK TEREALISASI',
    ...dayHeaders.map(() => ''),
  ];

  const aoa = [
    titleRow,
    areaMetaRow,
    spacerRow,
    headerRow,
    dayCodeRow,
    ...dataRows,
    planningRow,
    realisasiRow,
    tidakTerealisasiRow,
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Set COUNTA formulas on PLANNING / RENCANA recap row
  dayHeaders.forEach((_, idx) => {
    const colIdx = 3 + idx;
    const colLetter = XLSX.utils.encode_col(colIdx);
    const startExcelRow = startDataRowIdx + 1;
    const endExcelRow = startExcelRow + dataRows.length - 1;
    const addr = XLSX.utils.encode_cell({ r: planningRowIdx, c: colIdx });
    const countVal = dataRows.reduce(
      (sum, row) => (trimCell(row[colIdx]) !== '' ? sum + 1 : sum),
      0
    );
    ws[addr] = {
      t: 'n',
      f: `COUNTA(${colLetter}${startExcelRow}:${colLetter}${endExcelRow})`,
      v: countVal,
      w: String(countVal),
    };
  });

  // Merge title banner and first group "LOBBY & RESEPSIONIS" across rows 5..6
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 + daysCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 + daysCount - 1 } },
    { s: { r: startDataRowIdx, c: 0 }, e: { r: startDataRowIdx + 1, c: 0 } },
  ];

  ws['!cols'] = [
    { wch: 24 },
    { wch: 28 },
    { wch: 32 },
    ...dayHeaders.map(() => ({ wch: 4.5 })),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${monthLabel.slice(0, 3)} ${tahun}`);
  XLSX.writeFile(wb, `Template_MCP_${monthLabel}_${tahun}.xlsx`);
}
