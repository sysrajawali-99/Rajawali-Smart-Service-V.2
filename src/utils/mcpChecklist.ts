import {
  ChecklistLocation,
  McpChecklistResultRecord,
  McpChecklistStatus,
  UploadedMcpDocument,
} from '../types';
import { normalizeFrqCode } from './mcpExcel';

export const MCP_AREA_PREFIX = 'mcp-area::';

export interface LocalDateParts {
  dateStr: string; // YYYY-MM-DD (local device time)
  bulan: number;   // 1-12
  tahun: number;
  tanggal: number; // 1-31
}

export interface TodayScheduledMcpItem {
  itemKey: string;
  docId: string;
  rowId: string;
  lokasi_proyek: string;
  lokasi_kerja: string;
  areaKey: string;
  targetAreaId: string;
  matchedLocationId?: string;
  area_pekerjaan: string;
  jenis_pekerjaan: string;
  frq: string;
  urutan: number;
  scheduleMark: string;
}

export interface McpAreaOption {
  value: string; // ChecklistLocation.id or 'mcp-area::<AREAKEY>'
  areaKey: string;
  label: string;
  isMcpOnly: boolean;
  todayCount: number;
}

export interface UncheckedMcpGroup {
  lokasi_kerja: string;
  areaKey: string;
  targetAreaId: string;
  items: TodayScheduledMcpItem[];
}

export interface UncheckedReminderSummary {
  count: number;
  summaryText: string;
  groups: UncheckedMcpGroup[];
  primaryAreaId: string;
  primaryLokasiKerja: string;
}

export function getLocalDateParts(now: Date = new Date()): LocalDateParts {
  const tahun = now.getFullYear();
  const bulan = now.getMonth() + 1;
  const tanggal = now.getDate();
  const dateStr = `${tahun}-${String(bulan).padStart(2, '0')}-${String(tanggal).padStart(2, '0')}`;
  return { dateStr, bulan, tahun, tanggal };
}

export function normalizeMcpAreaKey(value: string | undefined | null): string {
  return String(value ?? '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

export function makeMcpAreaOptionId(areaKey: string): string {
  return `${MCP_AREA_PREFIX}${areaKey}`;
}

export function isMcpOnlyOptionId(value: string | undefined | null): boolean {
  return Boolean(value && value.startsWith(MCP_AREA_PREFIX));
}

export function extractAreaKeyFromOptionId(value: string | undefined | null): string {
  if (!value || !value.startsWith(MCP_AREA_PREFIX)) return '';
  return value.slice(MCP_AREA_PREFIX.length);
}

export function findMatchingChecklistLocation(
  lokasiKerja: string,
  checklistLocations: ChecklistLocation[]
): ChecklistLocation | undefined {
  const targetKey = normalizeMcpAreaKey(lokasiKerja);
  if (!targetKey) return undefined;
  return checklistLocations.find((loc) => normalizeMcpAreaKey(loc.name) === targetKey);
}

function fnv1aHex(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function makeMcpChecklistRecordId(
  projectKey: string,
  dateStr: string,
  item: Pick<TodayScheduledMcpItem, 'areaKey' | 'docId' | 'rowId' | 'area_pekerjaan' | 'jenis_pekerjaan'>
): string {
  const signature = `${item.areaKey}|${item.docId}|${item.rowId}|${normalizeMcpAreaKey(item.area_pekerjaan)}|${normalizeMcpAreaKey(item.jenis_pekerjaan)}`;
  return `mcpchk_${projectKey}_${dateStr}_${fnv1aHex(signature)}`;
}

export function getTodayScheduledMcpItems(
  uploadedMcpPrograms: UploadedMcpDocument[],
  checklistLocations: ChecklistLocation[],
  now: Date = new Date()
): TodayScheduledMcpItem[] {
  const today = getLocalDateParts(now);
  const matchingDocs = (uploadedMcpPrograms || []).filter(
    (doc) => Number(doc.bulan) === today.bulan && Number(doc.tahun) === today.tahun
  );

  if (matchingDocs.length === 0) return [];

  const items: TodayScheduledMcpItem[] = [];
  const seenItemKeys = new Set<string>();

  for (const doc of matchingDocs) {
    const rows = Array.isArray(doc.rows) ? doc.rows : [];
    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      const cell = (row.jadwal || []).find((c) => Number(c.tanggal) === today.tanggal);
      const rawMark = cell ? String(cell.nilai_asli ?? '').replace(/^[\s\u00A0]+|[\s\u00A0]+$/g, '') : '';
      if (!rawMark) continue; // Only non-empty date cells count as scheduled today

      const lokasiKerja = String(row.lokasi_kerja || '').trim() || 'Area Umum';
      const areaKey = normalizeMcpAreaKey(lokasiKerja);
      const matchedLoc = findMatchingChecklistLocation(lokasiKerja, checklistLocations);
      const targetAreaId = matchedLoc ? matchedLoc.id : makeMcpAreaOptionId(areaKey);

      const rowId = row.rowId || `mcp-row-${row.urutan ?? idx + 1}`;
      const itemKey = `${doc.id}::${rowId}`;
      if (seenItemKeys.has(itemKey)) continue;
      seenItemKeys.add(itemKey);

      const frqNorm = normalizeFrqCode(row.frq);
      const frqDisplay = frqNorm || String(row.frq || '').trim().toUpperCase();

      items.push({
        itemKey,
        docId: doc.id,
        rowId,
        lokasi_proyek: row.lokasi_proyek || doc.lokasi_proyek || '',
        lokasi_kerja: lokasiKerja,
        areaKey,
        targetAreaId,
        matchedLocationId: matchedLoc?.id,
        area_pekerjaan: String(row.area_pekerjaan || '').trim(),
        jenis_pekerjaan: String(row.jenis_pekerjaan || '').trim(),
        frq: frqDisplay,
        urutan: row.urutan ?? idx + 1,
        scheduleMark: rawMark,
      });
    }
  }

  return items;
}

export function getMcpDropdownOptions(
  scheduledItems: TodayScheduledMcpItem[],
  checklistLocations: ChecklistLocation[]
): McpAreaOption[] {
  const countByAreaKey = new Map<string, { label: string; count: number }>();
  for (const item of scheduledItems) {
    const existing = countByAreaKey.get(item.areaKey);
    if (existing) {
      existing.count += 1;
    } else {
      countByAreaKey.set(item.areaKey, { label: item.lokasi_kerja, count: 1 });
    }
  }

  const matchedAreaKeys = new Set<string>();
  const locOptions: McpAreaOption[] = checklistLocations.map((loc) => {
    const areaKey = normalizeMcpAreaKey(loc.name);
    const info = countByAreaKey.get(areaKey);
    if (info) matchedAreaKeys.add(areaKey);
    return {
      value: loc.id,
      areaKey,
      label: `${loc.name} (${loc.floor})`,
      isMcpOnly: false,
      todayCount: info?.count ?? 0,
    };
  });

  const mcpOnlyOptions: McpAreaOption[] = [];
  for (const [areaKey, info] of countByAreaKey.entries()) {
    if (!matchedAreaKeys.has(areaKey)) {
      mcpOnlyOptions.push({
        value: makeMcpAreaOptionId(areaKey),
        areaKey,
        label: info.label,
        isMcpOnly: true,
        todayCount: info.count,
      });
    }
  }

  return [...locOptions, ...mcpOnlyOptions];
}

export function resolveSelectedAreaKey(
  selectedOptionValue: string,
  checklistLocations: ChecklistLocation[]
): string {
  if (!selectedOptionValue) return '';
  if (isMcpOnlyOptionId(selectedOptionValue)) {
    return extractAreaKeyFromOptionId(selectedOptionValue);
  }
  const matchedLoc = checklistLocations.find((l) => l.id === selectedOptionValue);
  return matchedLoc ? normalizeMcpAreaKey(matchedLoc.name) : '';
}

export function isValidMcpStatus(val: unknown): val is McpChecklistStatus {
  return val === 'B' || val === 'K' || val === 'R';
}

export function findSavedResultForItem(
  item: TodayScheduledMcpItem,
  savedResults: McpChecklistResultRecord[],
  dateStr: string
): McpChecklistResultRecord | undefined {
  const sameDateArea = (savedResults || []).filter(
    (r) => r.date === dateStr && normalizeMcpAreaKey(r.areaKey || r.lokasi_kerja) === item.areaKey
  );
  if (sameDateArea.length === 0) return undefined;

  const exactIdMatch = sameDateArea.find(
    (r) => r.rowId === item.rowId && (!r.docId || !item.docId || r.docId === item.docId)
  );
  if (exactIdMatch) return exactIdMatch;

  return sameDateArea.find(
    (r) =>
      normalizeMcpAreaKey(r.area_pekerjaan) === normalizeMcpAreaKey(item.area_pekerjaan) &&
      normalizeMcpAreaKey(r.jenis_pekerjaan) === normalizeMcpAreaKey(item.jenis_pekerjaan)
  );
}

export function getUncheckedTodayMcpItems(
  scheduledItems: TodayScheduledMcpItem[],
  savedResults: McpChecklistResultRecord[],
  dateStr: string
): TodayScheduledMcpItem[] {
  return scheduledItems.filter((item) => {
    const saved = findSavedResultForItem(item, savedResults, dateStr);
    return !saved || !isValidMcpStatus(saved.status);
  });
}

export function buildUncheckedReminderSummary(
  uncheckedItems: TodayScheduledMcpItem[]
): UncheckedReminderSummary {
  const groupMap = new Map<string, UncheckedMcpGroup>();

  for (const item of uncheckedItems) {
    const existing = groupMap.get(item.areaKey);
    if (existing) {
      existing.items.push(item);
    } else {
      groupMap.set(item.areaKey, {
        lokasi_kerja: item.lokasi_kerja,
        areaKey: item.areaKey,
        targetAreaId: item.targetAreaId,
        items: [item],
      });
    }
  }

  const groups = Array.from(groupMap.values());
  const groupTexts = groups.map((grp) => {
    const itemLabels = grp.items.map((it) => {
      if (it.area_pekerjaan && it.jenis_pekerjaan) {
        return `${it.area_pekerjaan}: ${it.jenis_pekerjaan}`;
      }
      return it.area_pekerjaan || it.jenis_pekerjaan || 'Pekerjaan MCP';
    });
    return `${grp.lokasi_kerja} – ${itemLabels.join(', ')}`;
  });

  const count = uncheckedItems.length;
  const summaryText =
    count > 0 ? `Belum dicek (${count}): ${groupTexts.join('; ')}` : '';

  return {
    count,
    summaryText,
    groups,
    primaryAreaId: groups[0]?.targetAreaId || '',
    primaryLokasiKerja: groups[0]?.lokasi_kerja || '',
  };
}
