import * as XLSX from 'xlsx';
import { McpChecklistResultRecord, UploadedMcpRow } from '../types';
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

export interface ParsedMcpSkippedInfo {
  sheetName: string;
  rowLabel: string;
  reason: string;
}

export interface ParsedMcpSheetSummary {
  fileName: string;
  sheetName: string;
  rowCount: number;
  dCount: number;
  wCount: number;
  mCount: number;
  otherFrqCount: number;
  datesCount: number;
  scheduledCells: number;
  hasHeader: boolean;
  hasDayRow: boolean;
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
  dayCodes: Record<number, string>;
  sheetNames: string[];
  sheetSummaries: ParsedMcpSheetSummary[];
  rows: UploadedMcpRow[];
  datesDetected: number[];
  lokasiKerjaGroups: string[];
  totalRows: number;
  frqCounts: {
    D: number;
    W: number;
    M: number;
    other: number;
  };
  totalScheduledCells: number;
  uniqueTokens: string[];
  errors: string[];
  structuralWarnings: string[];
  skippedItems: ParsedMcpSkippedInfo[];
  detectedMetadata: ExtractedMcpMetadata;
}

export interface McpTokenStyle {
  token: string;
  count: number;
  cellClass: string;
  badgeClass: string;
  dotClass: string;
}

export interface McpFooterRecap {
  planningR: Record<number, number>;
  realisasiV: Record<number, number>;
  tidakTerealisasiX: Record<number, number>;
  totalR: number;
  totalV: number;
  totalX: number;
}

export interface McpChecklistFooterContext {
  bulan: number;
  tahun: number;
  docId?: string;
  results: McpChecklistResultRecord[];
}

export interface McpRecapAndLegend {
  dailyCounts: Record<number, number>;
  footer: McpFooterRecap;
  totalScheduledCells: number;
  legend: McpTokenStyle[];
  tokenStyleMap: Map<string, McpTokenStyle>;
}

const FIXED_STATUS_STYLES: Record<
  string,
  { cellClass: string; badgeClass: string; dotClass: string }
> = {
  R: {
    cellClass: 'bg-sky-100 text-sky-900 font-extrabold',
    badgeClass: 'bg-sky-100 text-sky-900 border-sky-300',
    dotClass: 'bg-sky-600',
  },
  V: {
    cellClass: 'bg-emerald-100 text-emerald-900 font-extrabold',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    dotClass: 'bg-emerald-600',
  },
  X: {
    cellClass: 'bg-rose-100 text-rose-900 font-extrabold',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-300',
    dotClass: 'bg-rose-600',
  },
};

const EXTRA_TOKEN_PALETTE: Array<{
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
    cellClass: 'bg-cyan-100 text-cyan-900 font-bold',
    badgeClass: 'bg-cyan-100 text-cyan-900 border-cyan-300',
    dotClass: 'bg-cyan-600',
  },
  {
    cellClass: 'bg-orange-100 text-orange-900 font-bold',
    badgeClass: 'bg-orange-100 text-orange-900 border-orange-300',
    dotClass: 'bg-orange-600',
  },
  {
    cellClass: 'bg-lime-100 text-lime-900 font-bold',
    badgeClass: 'bg-lime-100 text-lime-900 border-lime-300',
    dotClass: 'bg-lime-600',
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

export function normalizeFrqCode(raw: unknown): string {
  return trimCell(raw).replace(/\s+/g, '').toUpperCase();
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
 * Extracts displayed text from a SheetJS cell (preserving `0` as `"0"`, etc.).
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
 * Checks whether a cell contains a formula (either SheetJS `.f` or text starting with `=`).
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

function parseAreaMetadataFromRow(
  sheet: XLSX.WorkSheet,
  r: number,
  maxCol: number
): { lokasiProyek: string; rawText: string } | null {
  const scanCols = Math.min(maxCol, 15);
  for (let c = 0; c <= scanCols; c++) {
    const txt = getSheetCellDisplayText(sheet, r, c);
    if (!txt) continue;

    const inlineMatch = txt.match(/^AREA\s*[:=]\s*(.+)$/i);
    if (inlineMatch && trimCell(inlineMatch[1])) {
      return {
        lokasiProyek: trimCell(inlineMatch[1]),
        rawText: txt,
      };
    }

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
  frqCol: number;
  dateColumns: ParsedMcpDateColumn[];
}

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
 * Automatically finds the header row by searching for the cell "Lokasi Kerja"
 * (case-insensitive, extra spaces collapsed), then maps Area Pekerjaan,
 * Jenis Pekerjaan, FRQ, and date columns 1..31.
 */
function detectMcpTemplateHeader(
  sheet: XLSX.WorkSheet,
  maxRow: number,
  maxCol: number,
  merges: XLSX.Range[]
): { header: DetectedTemplateHeader | null; foundLokasiKerjaRow: number } {
  const scanLimit = Math.min(maxRow, 80);

  const getHeaderResolvedText = (r: number, c: number): string => {
    const direct = getSheetCellDisplayText(sheet, r, c);
    if (direct) return direct;
    const m = merges.find((rng) => r >= rng.s.r && r <= rng.e.r && c >= rng.s.c && c <= rng.e.c);
    if (m) return getSheetCellDisplayText(sheet, m.s.r, m.s.c);
    return '';
  };

  let firstFoundLokasiRow = -1;

  for (let r = 0; r <= scanLimit; r++) {
    let lokasiCol = -1;
    let areaCol = -1;
    let jenisCol = -1;
    let frqCol = -1;

    for (let c = 0; c <= maxCol; c++) {
      const norm = normalizeHeaderNorm(getHeaderResolvedText(r, c));
      if (!norm) continue;
      if (lokasiCol === -1 && (norm === 'LOKASI KERJA' || norm.includes('LOKASI KERJA'))) {
        lokasiCol = c;
      } else if (
        areaCol === -1 &&
        (norm === 'AREA PEKERJAAN' || norm.includes('AREA PEKERJAAN'))
      ) {
        areaCol = c;
      } else if (
        jenisCol === -1 &&
        (norm === 'JENIS PEKERJAAN' || norm.includes('JENIS PEKERJAAN'))
      ) {
        jenisCol = c;
      } else if (
        frqCol === -1 &&
        (norm === 'FRQ' || norm === 'FREQ' || norm === 'FREKUENSI' || norm === 'FREK')
      ) {
        frqCol = c;
      }
    }

    if (lokasiCol === -1) continue;
    if (firstFoundLokasiRow === -1) firstFoundLokasiRow = r;

    // Fallback positional resolution relative to Lokasi Kerja if slightly varied names exist
    const resolvedAreaCol = areaCol !== -1 ? areaCol : lokasiCol + 1;
    const resolvedJenisCol = jenisCol !== -1 ? jenisCol : resolvedAreaCol + 1;

    // Scan for dates starting after the rightmost detected info column (FRQ or Jenis Pekerjaan)
    const infoRightCol = Math.max(lokasiCol, resolvedAreaCol, resolvedJenisCol, frqCol);

    let dateCols = extractSequentialDateColumns(sheet, r, infoRightCol, maxCol);
    let dateRowIndex = r;

    if (dateCols.length === 0 && r + 1 <= scanLimit) {
      const nextDateCols = extractSequentialDateColumns(sheet, r + 1, infoRightCol, maxCol);
      if (nextDateCols.length > 0) {
        dateCols = nextDateCols;
        dateRowIndex = r + 1;
      }
    }

    if (dateCols.length > 0) {
      // If FRQ column wasn't labeled explicitly, check column right before dateCols[0] if not Jenis Pekerjaan
      let resolvedFrqCol = frqCol;
      if (resolvedFrqCol === -1) {
        for (let c = resolvedJenisCol + 1; c < dateCols[0].colIndex; c++) {
          const norm = normalizeHeaderNorm(getHeaderResolvedText(r, c));
          if (norm === 'FRQ' || norm === 'FREQ' || norm === 'FREKUENSI' || norm === 'FREK') {
            resolvedFrqCol = c;
            break;
          }
        }
      }

      return {
        foundLokasiKerjaRow: r,
        header: {
          headerRowIndex: Math.max(r, dateRowIndex),
          dateRowIndex,
          lokasiKerjaCol: lokasiCol,
          areaPekerjaanCol: resolvedAreaCol,
          jenisPekerjaanCol: resolvedJenisCol,
          frqCol: resolvedFrqCol,
          dateColumns: dateCols,
        },
      };
    }
  }

  return { header: null, foundLokasiKerjaRow: firstFoundLokasiRow };
}

/**
 * Extracts metadata (bulan, tahun, lokasi_proyek) from title rows above the header,
 * sheet names, and file names without hardcoding row positions.
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
        const { header, foundLokasiKerjaRow } = detectMcpTemplateHeader(
          sheet,
          range.e.r,
          range.e.c,
          merges
        );
        const metaRowLimit = header
          ? header.headerRowIndex - 1
          : foundLokasiKerjaRow > 0
          ? foundLokasiKerjaRow - 1
          : Math.min(range.e.r, 12);

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
      // Ignore corrupt files during metadata probe
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
 * Parses one or more .xlsx, .xls, or .csv files across ALL sheets using the unified
 * Planning Monthly Report MCP specification:
 * - Auto-locates "Lokasi Kerja" header row (no hardcoded coordinates)
 * - Captures day codes verbatim (KM, JM, SB, MG, SN, SL, RB)
 * - Fills merged/grouped Lokasi Kerja downwards
 * - Stops reading when "Jenis Pekerjaan" contains "PLANNING" (footer start)
 * - Ignores formula cells (`=...`) and computes totals dynamically
 * - Preserves blank rows/cells inside table body and stores ALL non-empty date tokens as scheduled
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

  const errors: string[] = [];
  const structuralWarnings: string[] = [];
  const skippedItems: ParsedMcpSkippedInfo[] = [];
  const allRows: UploadedMcpRow[] = [];
  const sheetNames: string[] = [];
  const sheetSummaries: ParsedMcpSheetSummary[] = [];
  const detectedDateNumbers = new Set<number>();
  const uniqueTokenSet = new Set<string>();
  const lokasiKerjaGroupSet = new Set<string>();
  const combinedDayCodes: Record<number, string> = {};

  const frqCounts = { D: 0, W: 0, M: 0, other: 0 };
  let totalScheduledCells = 0;
  let maxDaySeen = getDaysInMonth(selectedMonth, selectedYear);
  let globalUrutan = 1;

  for (const input of inputs) {
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(input.buffer, { type: 'array', cellDates: false });
    } catch (err: any) {
      errors.push(
        `File "${input.name}": gagal dibaca (${err?.message || 'format file tidak valid'}).`
      );
      continue;
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      errors.push(`File "${input.name}": tidak memiliki sheet yang dapat dibaca.`);
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
      if (!hasAnyContent) {
        skippedItems.push({
          sheetName: rawSheetName,
          rowLabel: 'Seluruh sheet',
          reason: 'Sheet kosong tanpa isi',
        });
        continue;
      }

      const sheetLabel = inputs.length > 1 ? `${input.name} :: ${rawSheetName}` : rawSheetName;
      sheetNames.push(sheetLabel);

      const merges = sheet['!merges'] || [];
      const { header, foundLokasiKerjaRow } = detectMcpTemplateHeader(
        sheet,
        range.e.r,
        range.e.c,
        merges
      );

      if (!header) {
        const errorMsg =
          foundLokasiKerjaRow === -1
            ? `Sheet "${sheetLabel}": Header "Lokasi Kerja" tidak ditemukan.`
            : `Sheet "${sheetLabel}": Header "Lokasi Kerja" ditemukan di baris ${
                foundLokasiKerjaRow + 1
              }, namun deretan kolom tanggal 1–31 di sebelah kanannya tidak ditemukan.`;
        errors.push(errorMsg);
        skippedItems.push({
          sheetName: sheetLabel,
          rowLabel: 'Seluruh sheet',
          reason: errorMsg,
        });
        sheetSummaries.push({
          fileName: input.name,
          sheetName: rawSheetName,
          rowCount: 0,
          dCount: 0,
          wCount: 0,
          mCount: 0,
          otherFrqCount: 0,
          datesCount: 0,
          scheduledCells: 0,
          hasHeader: false,
          hasDayRow: false,
        });
        continue;
      }

      const {
        headerRowIndex,
        dateRowIndex,
        lokasiKerjaCol,
        areaPekerjaanCol,
        jenisPekerjaanCol,
        frqCol,
        dateColumns,
      } = header;

      for (const dc of dateColumns) {
        detectedDateNumbers.add(dc.tanggal);
        if (dc.tanggal > maxDaySeen) maxDaySeen = dc.tanggal;
      }

      // Check row immediately below dateRowIndex for verbatim day codes (KM, JM, SB, MG, SN, SL, RB)
      let dataStartRow = Math.max(headerRowIndex, dateRowIndex) + 1;
      let hasDayRow = false;

      if (dataStartRow <= range.e.r) {
        let recognizedDowCount = 0;
        let checkedDays = 0;
        let mismatches = 0;
        let sampleMismatch: { day: number; actual: string; expected: string } | undefined;
        const daysInSelectedMonth = getDaysInMonth(selectedMonth, selectedYear);

        for (const dc of dateColumns) {
          const rawDow = getSheetCellDisplayText(sheet, dataStartRow, dc.colIndex);
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
          for (const dc of dateColumns) {
            const rawDow = getSheetCellDisplayText(sheet, dataStartRow, dc.colIndex);
            if (rawDow && !combinedDayCodes[dc.tanggal]) {
              combinedDayCodes[dc.tanggal] = rawDow;
            }
          }
          skippedItems.push({
            sheetName: sheetLabel,
            rowLabel: `Baris ${dataStartRow + 1}`,
            reason: 'Baris header kode hari (KM/JM/SB/MG/SN/SL/RB) di bawah tanggal',
          });
          if (mismatches > 0 && sampleMismatch) {
            structuralWarnings.push(
              `Sheet "${sheetLabel}": kode hari pada baris template (${mismatches}/${checkedDays} hari berbeda, contoh tgl ${sampleMismatch.day}: "${sampleMismatch.actual}") berbeda dengan kalender ${
                MONTH_NAMES_ID[selectedMonth - 1]
              } ${selectedYear} (kode tetap ditampilkan apa adanya).`
            );
          }
          dataStartRow++;
        }
      }

      // First scan for footer ("Jenis Pekerjaan" contains "PLANNING") and last non-empty row before it
      // so trailing unused Excel sheet rows after the table are not imported.
      let planningFooterRow = -1;
      for (let r = dataStartRow; r <= range.e.r; r++) {
        const directJenis = getSheetCellDisplayText(sheet, r, jenisPekerjaanCol);
        if (directJenis && /\bPLAN+ING\b/i.test(directJenis)) {
          planningFooterRow = r;
          break;
        }
      }

      const scanUpperBound = planningFooterRow !== -1 ? planningFooterRow - 1 : range.e.r;

      if (planningFooterRow !== -1) {
        const footerSample = getSheetCellDisplayText(sheet, planningFooterRow, jenisPekerjaanCol);
        skippedItems.push({
          sheetName: sheetLabel,
          rowLabel: `Baris ${planningFooterRow + 1} s/d ${range.e.r + 1}`,
          reason: `Baris footer rekap ("${footerSample}") dan seluruh baris di bawahnya`,
        });
      }

      // Find the last non-empty row inside [dataStartRow .. scanUpperBound] so trailing empty grid padding is trimmed,
      // while ALL blank rows inside the table body itself are preserved!
      let lastNonEmptyTableRow = dataStartRow - 1;
      for (let r = scanUpperBound; r >= dataStartRow; r--) {
        const hasInfoText =
          getSheetCellDisplayText(sheet, r, lokasiKerjaCol) !== '' ||
          getSheetCellDisplayText(sheet, r, areaPekerjaanCol) !== '' ||
          getSheetCellDisplayText(sheet, r, jenisPekerjaanCol) !== '' ||
          (frqCol !== -1 && getSheetCellDisplayText(sheet, r, frqCol) !== '');
        let hasDateVal = false;
        if (!hasInfoText) {
          for (const dc of dateColumns) {
            if (
              !cellHasFormula(sheet, r, dc.colIndex) &&
              getSheetCellDisplayText(sheet, r, dc.colIndex) !== ''
            ) {
              hasDateVal = true;
              break;
            }
          }
        }
        if (hasInfoText || hasDateVal) {
          lastNonEmptyTableRow = r;
          break;
        }
      }

      const resolveMergedCell = (r: number, c: number): string => {
        if (c < 0) return '';
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
      let sheetD = 0;
      let sheetW = 0;
      let sheetM = 0;
      let sheetOther = 0;
      let sheetScheduledCount = 0;
      let lastLokasiKerja = '';

      for (let r = dataStartRow; r <= lastNonEmptyTableRow; r++) {
        const mergedLokasi = resolveMergedCell(r, lokasiKerjaCol);
        const areaPekerjaan = resolveMergedCell(r, areaPekerjaanCol);
        const jenisPekerjaan = resolveMergedCell(r, jenisPekerjaanCol);
        const frqNormalized = frqCol !== -1 ? normalizeFrqCode(resolveMergedCell(r, frqCol)) : '';

        // Date cells: ignore formula cells (`=...`); preserve ANY other non-empty character verbatim
        const jadwalCells: Array<{ tanggal: number; nilai_asli: string }> = [];
        for (const dc of dateColumns) {
          if (cellHasFormula(sheet, r, dc.colIndex)) {
            continue;
          }
          const val = getSheetCellDisplayText(sheet, r, dc.colIndex);
          if (val !== '') {
            jadwalCells.push({
              tanggal: dc.tanggal,
              nilai_asli: val,
            });
            uniqueTokenSet.add(val);
          }
        }

        const rowHasOwnContent =
          areaPekerjaan !== '' ||
          jenisPekerjaan !== '' ||
          frqNormalized !== '' ||
          jadwalCells.length > 0;

        let lokasiKerja = mergedLokasi;
        if (lokasiKerja !== '') {
          lastLokasiKerja = lokasiKerja;
        } else if (rowHasOwnContent) {
          lokasiKerja = lastLokasiKerja;
        }

        if (lokasiKerja) {
          lokasiKerjaGroupSet.add(lokasiKerja);
        }

        if (frqNormalized === 'D') {
          frqCounts.D++;
          sheetD++;
        } else if (frqNormalized === 'W') {
          frqCounts.W++;
          sheetW++;
        } else if (frqNormalized === 'M') {
          frqCounts.M++;
          sheetM++;
        } else {
          frqCounts.other++;
          sheetOther++;
        }

        allRows.push({
          rowId: `mcp-row-${globalUrutan}`,
          lokasi_proyek: resolvedLokasiProyek,
          bulan: selectedMonth,
          tahun: selectedYear,
          lokasi_kerja: lokasiKerja,
          area_pekerjaan: areaPekerjaan,
          jenis_pekerjaan: jenisPekerjaan,
          frq: frqNormalized,
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
        dCount: sheetD,
        wCount: sheetW,
        mCount: sheetM,
        otherFrqCount: sheetOther,
        datesCount: dateColumns.length,
        scheduledCells: sheetScheduledCount,
        hasHeader: true,
        hasDayRow,
      });
    }
  }

  return {
    lokasiProyek: resolvedLokasiProyek,
    bulan: selectedMonth,
    tahun: selectedYear,
    daysCount: Math.min(31, Math.max(28, maxDaySeen)),
    dayCodes: combinedDayCodes,
    sheetNames,
    sheetSummaries,
    rows: allRows,
    datesDetected: Array.from(detectedDateNumbers).sort((a, b) => a - b),
    lokasiKerjaGroups: Array.from(lokasiKerjaGroupSet),
    totalRows: allRows.length,
    frqCounts,
    totalScheduledCells,
    uniqueTokens: Array.from(uniqueTokenSet).sort((a, b) =>
      a.localeCompare(b, 'id', { numeric: true, sensitivity: 'base' })
    ),
    errors,
    structuralWarnings,
    skippedItems,
    detectedMetadata,
  };
}

function normalizeChecklistMatchKey(value: string | undefined | null): string {
  return String(value ?? '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/**
 * Computes the 3 footer rows (`PLANNING R RENCANA` = count of `"R"` in schedule,
 * `REALISASI` = count of checklist status `"R"` per date when checklistContext is provided,
 * `TIDAK TEREALISASI` = count of checklist status `"X"` per date when checklistContext is provided)
 * plus automatic unique character legend from the displayed rows.
 */
export function calculateMcpRecapAndLegend(
  rows: UploadedMcpRow[],
  daysCount: number,
  checklistContext?: McpChecklistFooterContext
): McpRecapAndLegend {
  const dailyCounts: Record<number, number> = {};
  const planningR: Record<number, number> = {};
  const realisasiV: Record<number, number> = {};
  const tidakTerealisasiX: Record<number, number> = {};

  for (let d = 1; d <= daysCount; d++) {
    dailyCounts[d] = 0;
    planningR[d] = 0;
    realisasiV[d] = 0;
    tidakTerealisasiX[d] = 0;
  }

  const tokenCounts = new Map<string, number>();
  let totalScheduledCells = 0;
  let totalR = 0;
  let totalV = 0;
  let totalX = 0;

  const useChecklistCounts = Boolean(checklistContext);

  for (const row of rows) {
    const seenDayInRow = new Set<number>();
    for (const cell of row.jadwal || []) {
      const val = trimCell(cell.nilai_asli);
      if (!val) continue;
      tokenCounts.set(val, (tokenCounts.get(val) || 0) + 1);
      totalScheduledCells++;

      if (cell.tanggal >= 1 && cell.tanggal <= daysCount) {
        if (!seenDayInRow.has(cell.tanggal)) {
          dailyCounts[cell.tanggal] = (dailyCounts[cell.tanggal] || 0) + 1;
          seenDayInRow.add(cell.tanggal);
        }
        const upperVal = val.toUpperCase();
        if (upperVal === 'R') {
          planningR[cell.tanggal] = (planningR[cell.tanggal] || 0) + 1;
          totalR++;
        } else if (!useChecklistCounts && upperVal === 'V') {
          realisasiV[cell.tanggal] = (realisasiV[cell.tanggal] || 0) + 1;
          totalV++;
        } else if (!useChecklistCounts && upperVal === 'X') {
          tidakTerealisasiX[cell.tanggal] = (tidakTerealisasiX[cell.tanggal] || 0) + 1;
          totalX++;
        }
      }
    }
  }

  if (checklistContext) {
    const resultsByDay = new Map<number, McpChecklistResultRecord[]>();
    for (const rec of checklistContext.results || []) {
      if (
        Number(rec.bulan) !== Number(checklistContext.bulan) ||
        Number(rec.tahun) !== Number(checklistContext.tahun)
      ) {
        continue;
      }
      if (rec.status !== 'R' && rec.status !== 'X') continue;
      const tgl = Number(rec.tanggal);
      if (tgl < 1 || tgl > daysCount) continue;
      const list = resultsByDay.get(tgl);
      if (list) {
        list.push(rec);
      } else {
        resultsByDay.set(tgl, [rec]);
      }
    }

    // Ensure deterministic newest record wins if multiple records match the same item
    for (const list of resultsByDay.values()) {
      list.sort((a, b) => String(b.checkedAt || '').localeCompare(String(a.checkedAt || '')));
    }

    for (const row of rows) {
      const rowAreaKey = normalizeChecklistMatchKey(row.lokasi_kerja);
      const rowAreaPek = normalizeChecklistMatchKey(row.area_pekerjaan);
      const rowJenisPek = normalizeChecklistMatchKey(row.jenis_pekerjaan);

      for (const [tgl, dayRecords] of resultsByDay.entries()) {
        const matched =
          dayRecords.find(
            (r) =>
              Boolean(row.rowId) &&
              r.rowId === row.rowId &&
              (!checklistContext.docId || !r.docId || r.docId === checklistContext.docId)
          ) ||
          dayRecords.find(
            (r) =>
              normalizeChecklistMatchKey(r.areaKey || r.lokasi_kerja) === rowAreaKey &&
              normalizeChecklistMatchKey(r.area_pekerjaan) === rowAreaPek &&
              normalizeChecklistMatchKey(r.jenis_pekerjaan) === rowJenisPek &&
              (!checklistContext.docId || !r.docId || r.docId === checklistContext.docId)
          ) ||
          dayRecords.find(
            (r) =>
              normalizeChecklistMatchKey(r.areaKey || r.lokasi_kerja) === rowAreaKey &&
              normalizeChecklistMatchKey(r.area_pekerjaan) === rowAreaPek &&
              normalizeChecklistMatchKey(r.jenis_pekerjaan) === rowJenisPek
          );

        if (!matched) continue;
        if (matched.status === 'R') {
          realisasiV[tgl] = (realisasiV[tgl] || 0) + 1;
          totalV++;
        } else if (matched.status === 'X') {
          tidakTerealisasiX[tgl] = (tidakTerealisasiX[tgl] || 0) + 1;
          totalX++;
        }
      }
    }
  }

  const sortedTokens = Array.from(tokenCounts.keys()).sort((a, b) =>
    a.localeCompare(b, 'id', { numeric: true, sensitivity: 'base' })
  );

  const tokenStyleMap = new Map<string, McpTokenStyle>();
  let extraIdx = 0;
  const legend: McpTokenStyle[] = sortedTokens.map((token) => {
    const fixed = FIXED_STATUS_STYLES[token.toUpperCase()];
    const palette = fixed || EXTRA_TOKEN_PALETTE[extraIdx++ % EXTRA_TOKEN_PALETTE.length];
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
    footer: {
      planningR,
      realisasiV,
      tidakTerealisasiX,
      totalR,
      totalV,
      totalX,
    },
    totalScheduledCells,
    legend,
    tokenStyleMap,
  };
}

/**
 * Generates and downloads an Excel (.xlsx) template matching the
 * Planning Monthly Report MCP format:
 * Title row, AREA row, header (Lokasi Kerja | Area Pekerjaan | Jenis Pekerjaan | FRQ | 1..31),
 * day code row (KM, JM, SB, MG, SN, SL, RB), merged Lokasi Kerja sample rows,
 * and PLANNING / REALISASI / TIDAK TEREALISASI footer rows.
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
  const headerRow = ['Lokasi Kerja', 'Area Pekerjaan', 'Jenis Pekerjaan', 'FRQ', ...dayHeaders];
  const dayCodeRow = ['', '', '', '', ...dayCodes];

  const sampleItems = [
    {
      lokasiKerja: 'LOBBY & RESEPSIONIS',
      areaPekerjaan: 'Lantai Marmer Lobby Utama',
      jenisPekerjaan: 'Dry & Damp Mopping Harian',
      frq: 'D',
      pattern: (d: number) => (d % 3 === 0 ? 'V' : 'R'),
    },
    {
      lokasiKerja: 'LOBBY & RESEPSIONIS',
      areaPekerjaan: 'Kaca Entrance & Frame',
      jenisPekerjaan: 'Glass Cleaning & Detailing',
      frq: 'W',
      pattern: (d: number) => (d % 7 === 6 ? 'R' : ''),
    },
    {
      lokasiKerja: 'TOILET UMUM',
      areaPekerjaan: 'Closet, Urinal & Wastafel',
      jenisPekerjaan: 'Deep Cleaning & Disinfeksi',
      frq: 'D',
      pattern: (d: number) => (d % 5 === 0 ? 'X' : 'V'),
    },
    {
      lokasiKerja: 'AREA EKSTERNAL',
      areaPekerjaan: 'Saluran Air & Taman',
      jenisPekerjaan: 'General Cleaning & Flushing',
      frq: 'M',
      pattern: (d: number) => (d === 15 ? 'R' : ''),
    },
  ];

  const dataRows = sampleItems.map((item) => [
    item.lokasiKerja,
    item.areaPekerjaan,
    item.jenisPekerjaan,
    item.frq,
    ...dayHeaders.map((d) => item.pattern(d)),
  ]);

  const startDataRowIdx = 5;
  const planningRowIdx = startDataRowIdx + dataRows.length;
  const realisasiRowIdx = planningRowIdx + 1;
  const tidakRowIdx = planningRowIdx + 2;

  const planningRow: (string | number)[] = ['', '', 'PLANNING R RENCANA', '', ...dayHeaders.map(() => 0)];
  const realisasiRow: (string | number)[] = ['', '', 'REALISASI', '', ...dayHeaders.map(() => 0)];
  const tidakRow: (string | number)[] = ['', '', 'TIDAK TEREALISASI', '', ...dayHeaders.map(() => 0)];

  const aoa = [
    titleRow,
    areaMetaRow,
    spacerRow,
    headerRow,
    dayCodeRow,
    ...dataRows,
    planningRow,
    realisasiRow,
    tidakRow,
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  dayHeaders.forEach((_, idx) => {
    const colIdx = 4 + idx;
    const colLetter = XLSX.utils.encode_col(colIdx);
    const startExcelRow = startDataRowIdx + 1;
    const endExcelRow = startExcelRow + dataRows.length - 1;
    const rangeRef = `${colLetter}${startExcelRow}:${colLetter}${endExcelRow}`;

    const countChar = (ch: string) =>
      dataRows.reduce((s, row) => (trimCell(row[colIdx]).toUpperCase() === ch ? s + 1 : s), 0);

    const rCount = countChar('R');
    const vCount = countChar('V');
    const xCount = countChar('X');

    ws[XLSX.utils.encode_cell({ r: planningRowIdx, c: colIdx })] = {
      t: 'n',
      f: `COUNTIF(${rangeRef},"R")`,
      v: rCount,
      w: String(rCount),
    };
    ws[XLSX.utils.encode_cell({ r: realisasiRowIdx, c: colIdx })] = {
      t: 'n',
      f: `COUNTIF(${rangeRef},"V")`,
      v: vCount,
      w: String(vCount),
    };
    ws[XLSX.utils.encode_cell({ r: tidakRowIdx, c: colIdx })] = {
      t: 'n',
      f: `COUNTIF(${rangeRef},"X")`,
      v: xCount,
      w: String(xCount),
    };
  });

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 + daysCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 + daysCount - 1 } },
    { s: { r: startDataRowIdx, c: 0 }, e: { r: startDataRowIdx + 1, c: 0 } },
  ];

  ws['!cols'] = [
    { wch: 24 },
    { wch: 28 },
    { wch: 30 },
    { wch: 8 },
    ...dayHeaders.map(() => ({ wch: 4.5 })),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${monthLabel.slice(0, 3)} ${tahun}`);
  XLSX.writeFile(wb, `Template_MCP_${monthLabel}_${tahun}.xlsx`);
}
