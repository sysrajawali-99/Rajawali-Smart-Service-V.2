import { UploadedMcpRow, UploadedMcpScheduleCell } from '../types';
import { normalizeFrqCode } from './mcpExcel';

export const NEW_LOKASI_OPTION_VALUE = '__NEW_LOKASI__';

export interface ManualMcpItemInput {
  editingRowId?: string;
  lokasi_kerja: string;
  area_pekerjaan: string;
  jenis_pekerjaan: string;
  frq: 'D' | 'W' | 'M';
  selectedDates: number[];
  bulan: number;
  tahun: number;
  lokasi_proyek: string;
}

export function normalizeTextKey(val: string | undefined | null): string {
  return String(val ?? '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

export function getDistinctLokasiKerjaList(rows: UploadedMcpRow[]): string[] {
  const seen = new Set<string>();
  const list: string[] = [];
  for (const row of rows || []) {
    const trimmed = String(row.lokasi_kerja || '').trim();
    if (!trimmed) continue;
    const key = normalizeTextKey(trimmed);
    if (!seen.has(key)) {
      seen.add(key);
      list.push(trimmed);
    }
  }
  return list;
}

export function findDuplicateMcpRow(
  rows: UploadedMcpRow[],
  lokasiKerja: string,
  areaPekerjaan: string,
  jenisPekerjaan: string,
  excludeRowId?: string
): UploadedMcpRow | undefined {
  const targetLokasi = normalizeTextKey(lokasiKerja);
  const targetArea = normalizeTextKey(areaPekerjaan);
  const targetJenis = normalizeTextKey(jenisPekerjaan);
  if (!targetLokasi || !targetArea || !targetJenis) return undefined;

  return (rows || []).find((row) => {
    if (excludeRowId && row.rowId === excludeRowId) return false;
    return (
      normalizeTextKey(row.lokasi_kerja) === targetLokasi &&
      normalizeTextKey(row.area_pekerjaan) === targetArea &&
      normalizeTextKey(row.jenis_pekerjaan) === targetJenis
    );
  });
}

function buildScheduleForDates(
  selectedDates: number[],
  existingJadwal?: UploadedMcpScheduleCell[]
): UploadedMcpScheduleCell[] {
  const existingMap = new Map<number, string>();
  for (const cell of existingJadwal || []) {
    const val = String(cell.nilai_asli ?? '').trim();
    if (val) existingMap.set(Number(cell.tanggal), val);
  }

  const uniqueDates = Array.from(new Set(selectedDates))
    .filter((d) => Number.isInteger(d) && d >= 1 && d <= 31)
    .sort((a, b) => a - b);

  return uniqueDates.map((d) => ({
    tanggal: d,
    nilai_asli: existingMap.get(d) || 'R',
  }));
}

function findLastIndexOfLokasiGroup(rows: UploadedMcpRow[], lokasiKey: string): number {
  let lastIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    if (normalizeTextKey(rows[i].lokasi_kerja) === lokasiKey) {
      lastIdx = i;
    }
  }
  return lastIdx;
}

export function upsertManualMcpRow(
  rows: UploadedMcpRow[],
  input: ManualMcpItemInput
): { nextRows: UploadedMcpRow[]; savedRow: UploadedMcpRow } {
  const cleanLokasi = input.lokasi_kerja.trim();
  const cleanArea = input.area_pekerjaan.trim();
  const cleanJenis = input.jenis_pekerjaan.trim();
  const cleanFrq = (normalizeFrqCode(input.frq) || 'D') as 'D' | 'W' | 'M';
  const targetLokasiKey = normalizeTextKey(cleanLokasi);

  // Align casing with existing group if one matches
  const existingMatchingGroupRow = (rows || []).find(
    (r) => normalizeTextKey(r.lokasi_kerja) === targetLokasiKey
  );
  const canonicalLokasi = existingMatchingGroupRow?.lokasi_kerja?.trim() || cleanLokasi;

  const workingRows = [...(rows || [])];

  if (input.editingRowId) {
    const existingIdx = workingRows.findIndex((r) => r.rowId === input.editingRowId);
    if (existingIdx >= 0) {
      const prevRow = workingRows[existingIdx];
      const sameLokasiGroup = normalizeTextKey(prevRow.lokasi_kerja) === targetLokasiKey;
      const updatedRow: UploadedMcpRow = {
        ...prevRow,
        lokasi_proyek: input.lokasi_proyek,
        bulan: input.bulan,
        tahun: input.tahun,
        lokasi_kerja: canonicalLokasi,
        area_pekerjaan: cleanArea,
        jenis_pekerjaan: cleanJenis,
        frq: cleanFrq,
        jadwal: buildScheduleForDates(input.selectedDates, prevRow.jadwal),
        needsManualCheck: false,
        isAddedManually: true,
      };

      if (sameLokasiGroup) {
        workingRows[existingIdx] = updatedRow;
      } else {
        workingRows.splice(existingIdx, 1);
        const lastGroupIdx = findLastIndexOfLokasiGroup(workingRows, targetLokasiKey);
        if (lastGroupIdx >= 0) {
          workingRows.splice(lastGroupIdx + 1, 0, updatedRow);
        } else {
          workingRows.push(updatedRow);
        }
      }

      const renumbered = workingRows.map((r, i) => ({ ...r, urutan: i + 1 }));
      const finalSaved = renumbered.find((r) => r.rowId === updatedRow.rowId) || updatedRow;
      return { nextRows: renumbered, savedRow: finalSaved };
    }
  }

  const newRowId = `mcp-manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const newRow: UploadedMcpRow = {
    rowId: newRowId,
    lokasi_proyek: input.lokasi_proyek,
    bulan: input.bulan,
    tahun: input.tahun,
    lokasi_kerja: canonicalLokasi,
    area_pekerjaan: cleanArea,
    jenis_pekerjaan: cleanJenis,
    frq: cleanFrq,
    urutan: workingRows.length + 1,
    jadwal: buildScheduleForDates(input.selectedDates),
    isAddedManually: true,
  };

  const lastGroupIdx = findLastIndexOfLokasiGroup(workingRows, targetLokasiKey);
  if (lastGroupIdx >= 0) {
    workingRows.splice(lastGroupIdx + 1, 0, newRow);
  } else {
    workingRows.push(newRow);
  }

  const renumbered = workingRows.map((r, i) => ({ ...r, urutan: i + 1 }));
  const finalSaved = renumbered.find((r) => r.rowId === newRowId) || newRow;
  return { nextRows: renumbered, savedRow: finalSaved };
}

export function deleteManualMcpRow(
  rows: UploadedMcpRow[],
  targetRowId: string
): UploadedMcpRow[] {
  return (rows || [])
    .filter((r) => r.rowId !== targetRowId)
    .map((r, i) => ({ ...r, urutan: i + 1 }));
}

export function getDatesForWeekdayInMonth(
  bulan: number,
  tahun: number,
  daysCount: number,
  targetDow: number // 0 = Minggu .. 6 = Sabtu
): number[] {
  const result: number[] = [];
  for (let d = 1; d <= daysCount; d++) {
    const dow = new Date(tahun, bulan - 1, d, 12, 0, 0).getDay();
    if (dow === targetDow) {
      result.push(d);
    }
  }
  return result;
}
