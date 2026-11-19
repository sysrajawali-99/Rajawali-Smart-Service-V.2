import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Calendar,
  CalendarRange,
  Check,
  CheckCircle2,
  Download,
  Edit3,
  FileSpreadsheet,
  Filter,
  Info,
  Layers,
  MapPin,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
  XCircle,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import { UploadedMcpDocument, UploadedMcpRow } from '../../types';
import {
  MONTH_NAMES_ID,
  ParseMcpResult,
  calculateMcpRecapAndLegend,
  downloadMcpTemplate,
  extractMcpMetadataFromInputs,
  getDaysInMonth,
  getIndonesianDayCode,
  normalizeFrqCode,
  normalizeLokasiProyekKey,
  parseMcpBuffers,
} from '../../utils/mcpExcel';

export type McpReportMode = 'MCP' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

interface StagedBuffer {
  name: string;
  size: number;
  buffer: ArrayBuffer;
}

const MODE_META: Record<
  McpReportMode,
  {
    reportTitlePrefix: string;
    menuTitle: string;
    subtitle: string;
    frqBadgeLabel: string;
  }
> = {
  MCP: {
    reportTitlePrefix: 'PLANING MONTHLY REPORT',
    menuTitle: 'Master Cleaning Program (MCP)',
    subtitle: 'Sumber data tunggal perencanaan & monitoring kebersihan (seluruh FRQ)',
    frqBadgeLabel: 'Semua FRQ (D, W, M & lainnya)',
  },
  DAILY: {
    reportTitlePrefix: 'PLANING DAILY REPORT',
    menuTitle: 'Daily Activity',
    subtitle: 'Otomatis diambil dari data MCP dengan FRQ = D (perubahan sel tersinkron ke MCP)',
    frqBadgeLabel: 'Filter Otomatis: FRQ = D (Daily)',
  },
  WEEKLY: {
    reportTitlePrefix: 'PLANING WEEKLY REPORT',
    menuTitle: 'Weekly Activity',
    subtitle: 'Otomatis diambil dari data MCP dengan FRQ = W (perubahan sel tersinkron ke MCP)',
    frqBadgeLabel: 'Filter Otomatis: FRQ = W (Weekly)',
  },
  MONTHLY: {
    reportTitlePrefix: 'PLANING MONTHLY REPORT',
    menuTitle: 'Monthly Activity',
    subtitle: 'Otomatis diambil dari data MCP dengan FRQ = M (perubahan sel tersinkron ke MCP)',
    frqBadgeLabel: 'Filter Otomatis: FRQ = M (Monthly)',
  },
};

interface EditingCellState {
  rowKey: string;
  tanggal: number;
  currentValue: string;
  rowLabel: string;
}

interface PlanningReportGridProps {
  mode: McpReportMode;
  lokasiProyek: string;
  bulan: number;
  tahun: number;
  daysCount: number;
  dayCodes?: Record<number, string>;
  rows: UploadedMcpRow[];
  editable?: boolean;
  onCellChange?: (rowKey: string, tanggal: number, newValue: string) => Promise<void> | void;
}

const PlanningReportGrid: React.FC<PlanningReportGridProps> = ({
  mode,
  lokasiProyek,
  bulan,
  tahun,
  daysCount,
  dayCodes,
  rows,
  editable = false,
  onCellChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLokasiKerja, setFilterLokasiKerja] = useState<string>('ALL');
  const [filterAreaPekerjaan, setFilterAreaPekerjaan] = useState<string>('ALL');
  const [filterJenisPekerjaan, setFilterJenisPekerjaan] = useState<string>('ALL');
  const [filterFrq, setFilterFrq] = useState<string>('ALL');

  const [editingCell, setEditingCell] = useState<EditingCellState | null>(null);
  const [draftValue, setDraftValue] = useState<string>('');
  const [isSavingCell, setIsSavingCell] = useState(false);

  const days = useMemo(() => Array.from({ length: daysCount }, (_, i) => i + 1), [daysCount]);
  const monthNameUpper = (MONTH_NAMES_ID[bulan - 1] || 'BULAN').toUpperCase();
  const reportTitle = `${MODE_META[mode].reportTitlePrefix} ${monthNameUpper} ${tahun}`;
  const areaLabel = lokasiProyek.trim() || '-';

  // Filter rows by menu FRQ rule first (Daily=D, Weekly=W, Monthly=M, MCP=all)
  const modeScopedRows = useMemo(() => {
    if (mode === 'MCP') return rows;
    const targetFrq = mode === 'DAILY' ? 'D' : mode === 'WEEKLY' ? 'W' : 'M';
    return rows.filter((r) => normalizeFrqCode(r.frq) === targetFrq);
  }, [rows, mode]);

  const filterOptions = useMemo(() => {
    const lokasiSet = new Set<string>();
    const areaSet = new Set<string>();
    const jenisSet = new Set<string>();
    const frqSet = new Set<string>();

    modeScopedRows.forEach((r) => {
      if (r.lokasi_kerja) lokasiSet.add(r.lokasi_kerja);
      if (r.area_pekerjaan) areaSet.add(r.area_pekerjaan);
      if (r.jenis_pekerjaan) jenisSet.add(r.jenis_pekerjaan);
      const frqNorm = normalizeFrqCode(r.frq);
      if (frqNorm) frqSet.add(frqNorm);
    });

    const sortId = (a: string, b: string) =>
      a.localeCompare(b, 'id', { numeric: true, sensitivity: 'base' });

    return {
      lokasiKerja: Array.from(lokasiSet).sort(sortId),
      areaPekerjaan: Array.from(areaSet).sort(sortId),
      jenisPekerjaan: Array.from(jenisSet).sort(sortId),
      frq: Array.from(frqSet).sort(sortId),
    };
  }, [modeScopedRows]);

  const visibleRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return modeScopedRows.filter((row) => {
      if (filterLokasiKerja !== 'ALL' && row.lokasi_kerja !== filterLokasiKerja) return false;
      if (filterAreaPekerjaan !== 'ALL' && row.area_pekerjaan !== filterAreaPekerjaan) return false;
      if (filterJenisPekerjaan !== 'ALL' && row.jenis_pekerjaan !== filterJenisPekerjaan) return false;
      if (mode === 'MCP' && filterFrq !== 'ALL' && normalizeFrqCode(row.frq) !== filterFrq) {
        return false;
      }
      if (q) {
        const hit =
          (row.lokasi_kerja || '').toLowerCase().includes(q) ||
          (row.area_pekerjaan || '').toLowerCase().includes(q) ||
          (row.jenis_pekerjaan || '').toLowerCase().includes(q) ||
          (row.frq || '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [
    modeScopedRows,
    filterLokasiKerja,
    filterAreaPekerjaan,
    filterJenisPekerjaan,
    filterFrq,
    searchQuery,
    mode,
  ]);

  // Contiguous group rowSpans for Lokasi Kerja (empty spacer rows do not merge into neighbors)
  const lokasiKerjaRowSpans = useMemo(() => {
    const spans: number[] = Array(visibleRows.length).fill(0);
    let i = 0;
    while (i < visibleRows.length) {
      const currentGroup = visibleRows[i].lokasi_kerja || '';
      if (!currentGroup) {
        spans[i] = 1;
        i++;
        continue;
      }
      let count = 1;
      while (
        i + count < visibleRows.length &&
        (visibleRows[i + count].lokasi_kerja || '') === currentGroup
      ) {
        count++;
      }
      spans[i] = count;
      i += count;
    }
    return spans;
  }, [visibleRows]);

  const hasActiveFilter =
    searchQuery.trim() !== '' ||
    filterLokasiKerja !== 'ALL' ||
    filterAreaPekerjaan !== 'ALL' ||
    filterJenisPekerjaan !== 'ALL' ||
    (mode === 'MCP' && filterFrq !== 'ALL');

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterLokasiKerja('ALL');
    setFilterAreaPekerjaan('ALL');
    setFilterJenisPekerjaan('ALL');
    setFilterFrq('ALL');
  };

  // Footer & legend calculated live from the rows displayed in this menu
  const { footer, legend, tokenStyleMap } = useMemo(
    () => calculateMcpRecapAndLegend(visibleRows, daysCount),
    [visibleRows, daysCount]
  );

  const fullLegendData = useMemo(
    () => (hasActiveFilter ? calculateMcpRecapAndLegend(modeScopedRows, daysCount) : null),
    [hasActiveFilter, modeScopedRows, daysCount]
  );
  const activeTokenStyleMap = fullLegendData?.tokenStyleMap || tokenStyleMap;
  const activeLegend = fullLegendData?.legend || legend;

  const openCellEditor = (row: UploadedMcpRow, idx: number, tanggal: number, val: string) => {
    if (!editable || !onCellChange) return;
    const rowKey = row.rowId || `idx-${row.urutan ?? idx + 1}`;
    setEditingCell({
      rowKey,
      tanggal,
      currentValue: val,
      rowLabel: `${row.lokasi_kerja || '-'} › ${row.jenis_pekerjaan || row.area_pekerjaan || `Baris ${idx + 1}`}`,
    });
    setDraftValue(val);
  };

  const commitCellEdit = async (nextVal: string) => {
    if (!editingCell || !onCellChange || isSavingCell) return;
    setIsSavingCell(true);
    try {
      await onCellChange(editingCell.rowKey, editingCell.tanggal, nextVal);
      setEditingCell(null);
    } finally {
      setIsSavingCell(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Report Title Banner matching template ("PLANING ... REPORT <BULAN TAHUN>" & "AREA : ...") */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-base sm:text-lg font-extrabold tracking-wide uppercase">
            {reportTitle}
          </h3>
          <div className="flex items-center gap-2 text-xs font-bold text-teal-100">
            <Building2 className="w-3.5 h-3.5 text-teal-300 shrink-0" />
            <span>AREA : {areaLabel}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
          <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/20 text-white">
            {MODE_META[mode].frqBadgeLabel}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-teal-500/20 border border-teal-300/30 text-teal-100">
            {visibleRows.length} Baris
          </span>
          {editable && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-300/30 text-emerald-100">
              <Edit3 className="w-3 h-3" />
              <span>Klik sel tanggal untuk ubah nilai</span>
            </span>
          )}
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-52">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari lokasi, area, jenis..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <select
            value={filterLokasiKerja}
            onChange={(e) => setFilterLokasiKerja(e.target.value)}
            aria-label="Filter Lokasi Kerja"
            className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500 max-w-[190px]"
          >
            <option value="ALL">Semua Lokasi Kerja ({filterOptions.lokasiKerja.length})</option>
            {filterOptions.lokasiKerja.map((val) => (
              <option key={val} value={val}>
                {val}
              </option>
            ))}
          </select>

          <select
            value={filterAreaPekerjaan}
            onChange={(e) => setFilterAreaPekerjaan(e.target.value)}
            aria-label="Filter Area Pekerjaan"
            className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500 max-w-[200px]"
          >
            <option value="ALL">Semua Area Pekerjaan ({filterOptions.areaPekerjaan.length})</option>
            {filterOptions.areaPekerjaan.map((val) => (
              <option key={val} value={val}>
                {val}
              </option>
            ))}
          </select>

          <select
            value={filterJenisPekerjaan}
            onChange={(e) => setFilterJenisPekerjaan(e.target.value)}
            aria-label="Filter Jenis Pekerjaan"
            className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500 max-w-[200px]"
          >
            <option value="ALL">Semua Jenis Pekerjaan ({filterOptions.jenisPekerjaan.length})</option>
            {filterOptions.jenisPekerjaan.map((val) => (
              <option key={val} value={val}>
                {val}
              </option>
            ))}
          </select>

          {mode === 'MCP' && filterOptions.frq.length > 0 && (
            <select
              value={filterFrq}
              onChange={(e) => setFilterFrq(e.target.value)}
              aria-label="Filter FRQ"
              className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="ALL">Semua FRQ</option>
              {filterOptions.frq.map((val) => (
                <option key={val} value={val}>
                  FRQ: {val}
                </option>
              ))}
            </select>
          )}

          {hasActiveFilter && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}

          <div className="ml-auto text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-teal-600" />
            <span>
              Menampilkan <strong className="text-slate-800">{visibleRows.length}</strong> dari{' '}
              <strong className="text-slate-800">{modeScopedRows.length}</strong> baris
            </span>
          </div>
        </div>

        {/* Automatic Legend */}
        <div className="pt-2 border-t border-slate-200/70 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-600 mr-1">
            Legenda Karakter ({activeLegend.length} unik):
          </span>
          {activeLegend.map((item) => (
            <span
              key={item.token}
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-[11px] font-bold ${item.badgeClass}`}
            >
              <span className={`w-2 h-2 rounded-full ${item.dotClass}`} />
              <span className="font-mono">{item.token}</span>
              <span className="text-[10px] opacity-75 font-semibold">({item.count})</span>
            </span>
          ))}
          {activeLegend.length === 0 && (
            <span className="text-[11px] italic text-slate-400">Belum ada sel terjadwal</span>
          )}
        </div>
      </div>

      {/* Template Table Grid */}
      <div className="border border-slate-200 rounded-2xl bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[68vh]">
          <table className="w-full border-collapse text-[11px]">
            <thead className="sticky top-0 z-20 bg-slate-100 text-slate-800 shadow-2xs">
              <tr>
                <th
                  rowSpan={2}
                  className="border-b border-r border-slate-200 px-3 py-2 text-left font-bold min-w-[160px] whitespace-nowrap bg-slate-100"
                >
                  Lokasi Kerja
                </th>
                <th
                  rowSpan={2}
                  className="border-b border-r border-slate-200 px-3 py-2 text-left font-bold min-w-[175px] whitespace-nowrap bg-slate-100"
                >
                  Area Pekerjaan
                </th>
                <th
                  rowSpan={2}
                  className="border-b border-r border-slate-200 px-3 py-2 text-left font-bold min-w-[195px] whitespace-nowrap bg-slate-100"
                >
                  Jenis Pekerjaan
                </th>
                <th
                  rowSpan={2}
                  className="border-b border-r border-slate-200 px-2.5 py-2 text-center font-bold w-14 whitespace-nowrap bg-slate-100"
                >
                  FRQ
                </th>
                {days.map((d) => {
                  const code = dayCodes?.[d] || getIndonesianDayCode(bulan, tahun, d);
                  const isSunday = code.toUpperCase() === 'MG';
                  return (
                    <th
                      key={`d-${d}`}
                      className={`border-b border-r border-slate-200 px-1.5 py-1 text-center font-extrabold min-w-[36px] ${
                        isSunday ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {d}
                    </th>
                  );
                })}
              </tr>
              <tr>
                {days.map((d) => {
                  const code = dayCodes?.[d] || getIndonesianDayCode(bulan, tahun, d);
                  const isSunday = code.toUpperCase() === 'MG';
                  return (
                    <th
                      key={`c-${d}`}
                      className={`border-b border-r border-slate-200 px-1 py-1 text-center text-[9px] font-extrabold tracking-wide ${
                        isSunday ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-500'
                      }`}
                    >
                      {code}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {visibleRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={4 + days.length}
                    className="py-10 text-center text-xs text-slate-400 font-medium"
                  >
                    Tidak ada data pekerjaan yang cocok untuk tampilan ini.
                  </td>
                </tr>
              ) : (
                visibleRows.map((row, rowIdx) => {
                  const dayMap = new Map<number, string>();
                  for (const cell of row.jadwal || []) {
                    if (!dayMap.has(cell.tanggal)) {
                      dayMap.set(cell.tanggal, cell.nilai_asli);
                    }
                  }

                  const groupSpan = lokasiKerjaRowSpans[rowIdx];
                  const isBlankSpacer =
                    !row.lokasi_kerja &&
                    !row.area_pekerjaan &&
                    !row.jenis_pekerjaan &&
                    !row.frq &&
                    (row.jadwal?.length || 0) === 0;
                  const frqNorm = normalizeFrqCode(row.frq);

                  return (
                    <tr
                      key={`${row.rowId || row.urutan}-${rowIdx}`}
                      className={
                        isBlankSpacer
                          ? 'bg-slate-50/40 h-6'
                          : 'bg-white hover:bg-teal-50/40 transition-colors'
                      }
                    >
                      {groupSpan > 0 && (
                        <td
                          rowSpan={groupSpan}
                          className="border-r border-b border-slate-200 px-3 py-2 align-top font-bold text-slate-900 bg-slate-50/70 min-w-[160px]"
                        >
                          <div className="sticky top-14">{row.lokasi_kerja || ''}</div>
                        </td>
                      )}

                      <td className="border-r border-slate-200 px-3 py-1.5 text-slate-700 font-medium max-w-[230px]">
                        <div className="line-clamp-2 break-words">{row.area_pekerjaan || ''}</div>
                      </td>

                      <td className="border-r border-slate-200 px-3 py-1.5 text-slate-800 font-semibold max-w-[260px]">
                        <div className="line-clamp-2 break-words">{row.jenis_pekerjaan || ''}</div>
                      </td>

                      <td className="border-r border-slate-200 px-2 py-1.5 text-center whitespace-nowrap">
                        {frqNorm ? (
                          <span
                            className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${
                              frqNorm === 'D'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : frqNorm === 'W'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : frqNorm === 'M'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {frqNorm}
                          </span>
                        ) : (
                          ''
                        )}
                      </td>

                      {days.map((d) => {
                        const rawVal = dayMap.get(d) ?? '';
                        const isScheduled = rawVal !== '';
                        const tokenStyle = isScheduled ? activeTokenStyleMap.get(rawVal) : undefined;
                        return (
                          <td
                            key={d}
                            onClick={() => openCellEditor(row, rowIdx, d, rawVal)}
                            title={
                              editable
                                ? `Klik untuk ubah Tgl ${d}${rawVal ? ` (Saat ini: "${rawVal}")` : ' (Kosong)'}`
                                : isScheduled
                                ? `Tgl ${d}: ${rawVal}`
                                : `Tgl ${d}: Kosong`
                            }
                            className={`border-r border-slate-200 px-1 py-1.5 text-center whitespace-nowrap transition-all ${
                              editable ? 'cursor-pointer hover:ring-2 hover:ring-inset hover:ring-teal-500' : ''
                            } ${
                              isScheduled
                                ? tokenStyle?.cellClass || 'bg-teal-100 text-teal-900 font-bold'
                                : 'bg-white text-slate-300'
                            }`}
                          >
                            {isScheduled ? rawVal : ''}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Exact 3 Footer Rows calculated live from displayed rows */}
            <tfoot className="border-t-2 border-slate-300 font-bold">
              <tr className="bg-sky-50/90 text-sky-950 border-b border-slate-200">
                <td colSpan={2} className="border-r border-slate-200 px-3 py-1.5 text-slate-500" />
                <td className="border-r border-slate-200 px-3 py-1.5 font-extrabold">
                  PLANNING R RENCANA
                </td>
                <td className="border-r border-slate-200 px-2 py-1.5 text-center text-[10px] font-extrabold text-sky-700">
                  {footer.totalR}
                </td>
                {days.map((d) => (
                  <td
                    key={`r-${d}`}
                    className="border-r border-slate-200 px-1 py-1.5 text-center tabular-nums font-extrabold text-sky-900"
                  >
                    {footer.planningR[d] ?? 0}
                  </td>
                ))}
              </tr>

              <tr className="bg-emerald-50/90 text-emerald-950 border-b border-slate-200">
                <td colSpan={2} className="border-r border-slate-200 px-3 py-1.5 text-slate-500" />
                <td className="border-r border-slate-200 px-3 py-1.5 font-extrabold">
                  REALISASI
                </td>
                <td className="border-r border-slate-200 px-2 py-1.5 text-center text-[10px] font-extrabold text-emerald-700">
                  {footer.totalV}
                </td>
                {days.map((d) => (
                  <td
                    key={`v-${d}`}
                    className="border-r border-slate-200 px-1 py-1.5 text-center tabular-nums font-extrabold text-emerald-900"
                  >
                    {footer.realisasiV[d] ?? 0}
                  </td>
                ))}
              </tr>

              <tr className="bg-rose-50/90 text-rose-950">
                <td colSpan={2} className="border-r border-slate-200 px-3 py-1.5 text-slate-500" />
                <td className="border-r border-slate-200 px-3 py-1.5 font-extrabold">
                  TIDAK TEREALISASI
                </td>
                <td className="border-r border-slate-200 px-2 py-1.5 text-center text-[10px] font-extrabold text-rose-700">
                  {footer.totalX}
                </td>
                {days.map((d) => (
                  <td
                    key={`x-${d}`}
                    className="border-r border-slate-200 px-1 py-1.5 text-center tabular-nums font-extrabold text-rose-900"
                  >
                    {footer.tidakTerealisasiX[d] ?? 0}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Inline Cell Editor Modal */}
      {editingCell && (
        <div
          onClick={() => !isSavingCell && setEditingCell(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-5 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Ubah Nilai Tanggal {editingCell.tanggal}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                  {editingCell.rowLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCell(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Status Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'R', desc: 'Planning', cls: 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-200' },
                { label: 'V', desc: 'Realisasi', cls: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200' },
                { label: 'X', desc: 'Tdk Real', cls: 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200' },
                { label: '', desc: 'Kosong', cls: 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200' },
              ].map((opt) => (
                <button
                  key={opt.desc}
                  type="button"
                  disabled={isSavingCell}
                  onClick={() => commitCellEdit(opt.label)}
                  className={`p-2 rounded-xl border text-center transition-colors cursor-pointer ${opt.cls}`}
                >
                  <div className="text-sm font-extrabold font-mono">{opt.label || '∅'}</div>
                  <div className="text-[10px] font-semibold">{opt.desc}</div>
                </button>
              ))}
            </div>

            {/* Free text input for ANY custom character */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                commitCellEdit(draftValue);
              }}
              className="space-y-2 pt-2 border-t border-slate-100"
            >
              <label className="text-[11px] font-bold text-slate-600 block">
                Atau ketik karakter / nilai bebas:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  autoFocus
                  value={draftValue}
                  onChange={(e) => setDraftValue(e.target.value)}
                  placeholder="Contoh: R, V, X, /, 0..."
                  className="flex-1 px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  type="submit"
                  disabled={isSavingCell}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold cursor-pointer"
                >
                  {isSavingCell ? '...' : 'Simpan'}
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                Perubahan otomatis tersinkron ke Master Cleaning Program &amp; menu Daily/Weekly/Monthly.
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export interface McpReportViewProps {
  mode: McpReportMode;
}

export const McpReportView: React.FC<McpReportViewProps> = ({ mode }) => {
  const {
    activeProject,
    uploadedMcpPrograms,
    saveUploadedMcpProgram,
    updateUploadedMcpCell,
    deleteUploadedMcpProgram,
    setActiveTab,
  } = useCleaning();

  const sortedDocs = useMemo(
    () =>
      [...uploadedMcpPrograms].sort((a, b) =>
        (b.updatedAt || '').localeCompare(a.updatedAt || '')
      ),
    [uploadedMcpPrograms]
  );

  const latestDoc: UploadedMcpDocument | null = sortedDocs[0] || null;
  const [selectedDocId, setSelectedDocId] = useState<string | null>(latestDoc?.id || null);

  // Automatically switch to newly uploaded MCP whenever latestDoc changes (so re-uploading MCP refreshes MCP, Daily, Weekly, Monthly immediately)
  const latestSignature = latestDoc ? `${latestDoc.id}::${latestDoc.updatedAt}` : '';
  useEffect(() => {
    if (latestDoc) {
      setSelectedDocId(latestDoc.id);
    } else {
      setSelectedDocId(null);
    }
  }, [latestSignature]);

  const activeDoc = useMemo(
    () => sortedDocs.find((d) => d.id === selectedDocId) || latestDoc,
    [sortedDocs, selectedDocId, latestDoc]
  );

  // Upload states (ONLY active in mode === 'MCP')
  const now = new Date();
  const [showUploadPanel, setShowUploadPanel] = useState<boolean>(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [lokasiProyekInput, setLokasiProyekInput] = useState<string>(activeProject?.name || '');
  const [stagedBuffers, setStagedBuffers] = useState<StagedBuffer[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showOverwriteModal, setShowOverwriteModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const yearOptions = useMemo(() => {
    const base = now.getFullYear();
    return Array.from({ length: 7 }, (_, i) => base - 2 + i);
  }, []);

  const previewResult: ParseMcpResult | null = useMemo(() => {
    if (mode !== 'MCP' || stagedBuffers.length === 0) return null;
    return parseMcpBuffers(
      stagedBuffers.map((b) => ({ name: b.name, buffer: b.buffer })),
      selectedMonth,
      selectedYear,
      lokasiProyekInput.trim() || activeProject?.name || ''
    );
  }, [mode, stagedBuffers, selectedMonth, selectedYear, lokasiProyekInput, activeProject?.name]);

  const effectivePreviewLokasi = (
    lokasiProyekInput.trim() ||
    previewResult?.lokasiProyek ||
    activeProject?.name ||
    'Default'
  ).trim();

  const existingCollisionDoc = useMemo(() => {
    const targetLocKey = normalizeLokasiProyekKey(effectivePreviewLokasi);
    return (
      uploadedMcpPrograms.find(
        (doc) =>
          doc.bulan === selectedMonth &&
          doc.tahun === selectedYear &&
          normalizeLokasiProyekKey(doc.lokasi_proyek || '') === targetLocKey
      ) || null
    );
  }, [uploadedMcpPrograms, selectedMonth, selectedYear, effectivePreviewLokasi]);

  const handleFilesAccepted = async (fileList: FileList | File[]) => {
    const rawFiles = Array.from(fileList);
    if (rawFiles.length === 0) return;

    const allowedExt = /\.(xlsx|xls|csv)$/i;
    const validFiles = rawFiles.filter((f) => allowedExt.test(f.name));
    const rejectedCount = rawFiles.length - validFiles.length;

    if (validFiles.length === 0) {
      setBannerMessage({
        type: 'error',
        text: 'Format file tidak didukung. Hanya menerima file .xlsx, .xls, atau .csv.',
      });
      return;
    }

    setIsParsing(true);
    setBannerMessage(null);
    try {
      const loaded: StagedBuffer[] = await Promise.all(
        validFiles.map(async (f) => ({
          name: f.name,
          size: f.size,
          buffer: await f.arrayBuffer(),
        }))
      );

      const meta = extractMcpMetadataFromInputs(
        loaded.map((l) => ({ name: l.name, buffer: l.buffer }))
      );

      if (meta.bulan) setSelectedMonth(meta.bulan);
      if (meta.tahun) setSelectedYear(meta.tahun);
      if (meta.lokasiProyek) {
        setLokasiProyekInput(meta.lokasiProyek);
      } else if (!lokasiProyekInput.trim() && activeProject?.name) {
        setLokasiProyekInput(activeProject.name);
      }

      setStagedBuffers(loaded);
      setShowUploadPanel(true);

      if (rejectedCount > 0) {
        setBannerMessage({
          type: 'info',
          text: `${rejectedCount} file diabaikan karena bukan berformat .xlsx, .xls, atau .csv.`,
        });
      }
    } catch (err: any) {
      setBannerMessage({
        type: 'error',
        text: `Gagal membaca file MCP: ${err?.message || 'Error tidak dikenal'}`,
      });
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      handleFilesAccepted(e.dataTransfer.files);
    }
  };

  const executeSave = async () => {
    if (!previewResult || previewResult.errors.length > 0 || previewResult.rows.length === 0) {
      return;
    }
    setIsSaving(true);
    setBannerMessage(null);
    try {
      const targetLokasi = effectivePreviewLokasi;
      const saved = await saveUploadedMcpProgram({
        lokasi_proyek: targetLokasi,
        bulan: selectedMonth,
        tahun: selectedYear,
        daysCount: previewResult.daysCount,
        dayCodes: previewResult.dayCodes,
        sheetNames: previewResult.sheetNames,
        fileName: stagedBuffers.map((b) => b.name).join(', '),
        rows: previewResult.rows.map((r, idx) => ({
          ...r,
          lokasi_proyek: targetLokasi,
          bulan: selectedMonth,
          tahun: selectedYear,
          urutan: r.urutan ?? idx + 1,
        })),
      });

      setSelectedDocId(saved.id);
      setStagedBuffers([]);
      setShowOverwriteModal(false);
      setShowUploadPanel(false);
      setBannerMessage({
        type: 'success',
        text: `MCP berhasil disimpan (${previewResult.totalRows} baris terbaca: D=${previewResult.frqCounts.D}, W=${previewResult.frqCounts.W}, M=${previewResult.frqCounts.M}). Menu Daily, Weekly, dan Monthly otomatis diperbarui.`,
      });
    } catch (err: any) {
      setBannerMessage({
        type: 'error',
        text: `Gagal menyimpan MCP ke server: ${err?.message || 'Terjadi kesalahan'}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClickSave = () => {
    if (!previewResult || previewResult.errors.length > 0 || previewResult.rows.length === 0) {
      return;
    }
    if (existingCollisionDoc) {
      setShowOverwriteModal(true);
    } else {
      executeSave();
    }
  };

  const handleCancelPreview = () => {
    setStagedBuffers([]);
    setShowOverwriteModal(false);
    setBannerMessage(null);
  };

  const handleConfirmDeleteSaved = async () => {
    if (!activeDoc) return;
    try {
      await deleteUploadedMcpProgram(activeDoc.id);
      setShowDeleteConfirmModal(false);
      setBannerMessage({
        type: 'success',
        text: `Data MCP "${activeDoc.lokasi_proyek}" (${MONTH_NAMES_ID[activeDoc.bulan - 1]} ${activeDoc.tahun}) berhasil dihapus.`,
      });
    } catch (err: any) {
      setShowDeleteConfirmModal(false);
      setBannerMessage({
        type: 'error',
        text: `Gagal menghapus MCP: ${err?.message || 'Terjadi kesalahan'}`,
      });
    }
  };

  const isUploadExpanded = mode === 'MCP' && (!activeDoc || showUploadPanel || Boolean(previewResult));

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1600px] mx-auto">
      {/* Top Menu Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <CalendarRange className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              {MODE_META[mode].menuTitle}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{MODE_META[mode].subtitle}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-900 border border-teal-200 font-semibold">
                <Building2 className="w-3.5 h-3.5 text-teal-700" />
                Proyek: {activeProject?.name || '-'}
              </span>
              {activeDoc && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                  Sumber MCP: {activeDoc.lokasi_proyek} • {MONTH_NAMES_ID[activeDoc.bulan - 1]}{' '}
                  {activeDoc.tahun}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {mode === 'MCP' ? (
            <>
              <button
                type="button"
                onClick={() =>
                  downloadMcpTemplate(
                    selectedMonth,
                    selectedYear,
                    lokasiProyekInput.trim() || activeProject?.name || 'PROYEK CONTOH'
                  )
                }
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-teal-600" />
                <span>Download Template</span>
              </button>
              <button
                type="button"
                onClick={() => setShowUploadPanel((prev) => !prev)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{isUploadExpanded && activeDoc && !previewResult ? 'Tutup Upload' : 'Upload Excel MCP'}</span>
              </button>
              {activeDoc && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirmModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus MCP</span>
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => setActiveTab('master_program')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Kelola / Upload MCP</span>
            </button>
          )}
        </div>
      </div>

      {/* Saved MCP Period Switcher (when > 1 saved MCP exists) */}
      {sortedDocs.length > 1 && !previewResult && (
        <div className="flex flex-wrap items-center gap-1.5 bg-white px-4 py-2.5 rounded-2xl border border-slate-200/80 shadow-xs text-[11px]">
          <span className="font-bold text-slate-500 mr-1">Arsip MCP Tersimpan:</span>
          {sortedDocs.map((doc, i) => {
            const isActive = activeDoc?.id === doc.id;
            return (
              <button
                key={doc.id}
                type="button"
                onClick={() => setSelectedDocId(doc.id)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer border ${
                  isActive
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {doc.lokasi_proyek} • {MONTH_NAMES_ID[doc.bulan - 1]?.slice(0, 3)} {doc.tahun}
                {i === 0 ? ' (Terbaru)' : ''}
              </button>
            );
          })}
        </div>
      )}

      {/* Banner Notification */}
      {bannerMessage && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 ${
            bannerMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : bannerMessage.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-sky-50 border-sky-200 text-sky-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {bannerMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : bannerMessage.type === 'error' ? (
              <XCircle className="w-4 h-4 shrink-0 text-rose-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-sky-600" />
            )}
            <span>{bannerMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerMessage(null)}
            className="p-1 rounded-lg hover:bg-black/5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* UPLOAD SECTION — ONLY IN MCP MODE (Daily/Weekly/Monthly NEVER have upload) */}
      {isUploadExpanded && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-teal-500 bg-teal-50/70'
                : 'border-slate-300 hover:border-teal-400 hover:bg-slate-50/70'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFilesAccepted(e.target.files);
              }}
            />
            <div className="flex flex-col items-center gap-2">
              <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-800">
                  {isParsing
                    ? 'Membaca file Excel MCP...'
                    : 'Seret & lepas file Excel MCP (.xlsx, .xls, .csv) ke sini, atau klik untuk memilih file'}
                </p>
                <p className="text-[11px] text-slate-500">
                  Membaca otomatis judul &amp; area, header <strong>Lokasi Kerja</strong>, kode FRQ (D/W/M), semua sheet, dan memperbarui menu Daily/Weekly/Monthly secara otomatis.
                </p>
              </div>

              {stagedBuffers.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
                  {stagedBuffers.map((file, i) => (
                    <span
                      key={`${file.name}-${i}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 shadow-2xs"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600" />
                      <span>{file.name}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* PREVIEW & VALIDATION PANEL */}
          {previewResult && (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 border-2 border-teal-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-teal-600" />
                    Preview &amp; Ringkasan Validasi Upload MCP
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Periksa jumlah baris, pembagian D/W/M, dan baris yang dilewati sebelum menyimpan.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancelPreview}
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleClickSave}
                    disabled={
                      isSaving || previewResult.errors.length > 0 || previewResult.rows.length === 0
                    }
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Menyimpan...' : 'Simpan & Sinkronkan Semua Menu'}</span>
                  </button>
                </div>
              </div>

              {/* Editable Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-xl bg-white border border-teal-200/80">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block">
                    AREA / Lokasi Proyek
                  </label>
                  <input
                    type="text"
                    value={lokasiProyekInput}
                    onChange={(e) => setLokasiProyekInput(e.target.value)}
                    placeholder="Contoh: GEDUNG RAJAWALI"
                    className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block">Bulan</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                  >
                    {MONTH_NAMES_ID.map((name, idx) => (
                      <option key={name} value={idx + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block">Tahun</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Validation Error Box (when "Lokasi Kerja" header not found or unreadable file) */}
              {previewResult.errors.length > 0 && (
                <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-300 space-y-1.5">
                  <div className="text-xs font-extrabold text-rose-800 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Gagal Membaca Struktur Header ({previewResult.errors.length} Error)</span>
                  </div>
                  <ul className="space-y-1 text-xs text-rose-800 font-semibold">
                    {previewResult.errors.map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Validation Summary Stats: Total Rows + D / W / M + Other + Unique Chars */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                <div className="p-3 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Baris Terbaca
                  </span>
                  <div className="text-lg font-extrabold text-slate-900 mt-0.5 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-teal-600" />
                    <span>{previewResult.totalRows}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200">
                  <span className="text-[10px] font-bold text-blue-700 uppercase block">
                    Daily (D)
                  </span>
                  <div className="text-lg font-extrabold text-blue-900 mt-0.5">
                    {previewResult.frqCounts.D}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200">
                  <span className="text-[10px] font-bold text-purple-700 uppercase block">
                    Weekly (W)
                  </span>
                  <div className="text-lg font-extrabold text-purple-900 mt-0.5">
                    {previewResult.frqCounts.W}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
                  <span className="text-[10px] font-bold text-amber-700 uppercase block">
                    Monthly (M)
                  </span>
                  <div className="text-lg font-extrabold text-amber-900 mt-0.5">
                    {previewResult.frqCounts.M}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    FRQ Lain / Kosong
                  </span>
                  <div className="text-lg font-extrabold text-slate-700 mt-0.5">
                    {previewResult.frqCounts.other}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Kelompok Lokasi
                  </span>
                  <div className="text-lg font-extrabold text-slate-900 mt-0.5 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-teal-600" />
                    <span>{previewResult.lokasiKerjaGroups.length}</span>
                  </div>
                </div>
              </div>

              {/* Skipped Rows & Reasons + Structural Warnings */}
              {(previewResult.skippedItems.length > 0 ||
                previewResult.structuralWarnings.length > 0) && (
                <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 space-y-2 text-[11px]">
                  {previewResult.structuralWarnings.length > 0 && (
                    <div className="space-y-1">
                      <div className="font-bold text-amber-900 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Catatan Kalender / Struktur:</span>
                      </div>
                      <ul className="space-y-0.5 text-amber-900 pl-5 list-disc">
                        {previewResult.structuralWarnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {previewResult.skippedItems.length > 0 && (
                    <div className="space-y-1">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-slate-600" />
                        <span>Baris / Bagian yang Dilewati ({previewResult.skippedItems.length}):</span>
                      </div>
                      <ul className="space-y-0.5 text-slate-700 pl-5 list-disc">
                        {previewResult.skippedItems.map((sk, i) => (
                          <li key={i}>
                            <strong>[{sk.sheetName}] {sk.rowLabel}:</strong> {sk.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Unique characters list */}
              <div className="flex flex-wrap items-center gap-1.5 p-2.5 rounded-xl bg-white border border-slate-200 text-[11px]">
                <span className="font-bold text-slate-600 flex items-center gap-1 mr-1">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                  Karakter Unik ({previewResult.uniqueTokens.length}):
                </span>
                {previewResult.uniqueTokens.map((tok) => (
                  <span
                    key={tok}
                    className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-mono font-bold text-slate-800"
                  >
                    {tok}
                  </span>
                ))}
              </div>

              {/* Preview Table */}
              {previewResult.rows.length > 0 && (
                <PlanningReportGrid
                  mode="MCP"
                  lokasiProyek={effectivePreviewLokasi}
                  bulan={selectedMonth}
                  tahun={selectedYear}
                  daysCount={previewResult.daysCount}
                  dayCodes={previewResult.dayCodes}
                  rows={previewResult.rows}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* MAIN ACTIVE REPORT TABLE (Shown across MCP, Daily, Weekly, Monthly when not previewing) */}
      {!previewResult && (
        <>
          {activeDoc && activeDoc.rows && activeDoc.rows.length > 0 ? (
            <PlanningReportGrid
              mode={mode}
              lokasiProyek={activeDoc.lokasi_proyek || activeProject?.name || '-'}
              bulan={activeDoc.bulan}
              tahun={activeDoc.tahun}
              daysCount={
                activeDoc.daysCount || getDaysInMonth(activeDoc.bulan, activeDoc.tahun)
              }
              dayCodes={activeDoc.dayCodes}
              rows={activeDoc.rows}
              editable
              onCellChange={(rowKey, tanggal, newValue) =>
                updateUploadedMcpCell(activeDoc.id, rowKey, tanggal, newValue)
              }
            />
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-3">
              <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-700">
                  Belum Ada Data Master Cleaning Program (MCP) yang Diupload
                </p>
                <p className="text-xs text-slate-500 max-w-lg mx-auto">
                  {mode === 'MCP'
                    ? 'Unggah file Excel Planning Monthly Report (.xlsx / .xls) di atas untuk mengisi data MCP, Daily Activity, Weekly Activity, dan Monthly Activity secara otomatis.'
                    : `Menu ${MODE_META[mode].menuTitle} mengambil data langsung dari file MCP yang terakhir diupload. Silakan upload file MCP pada menu Master Cleaning Program terlebih dahulu.`}
                </p>
              </div>
              {mode !== 'MCP' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('master_program')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Buka Menu Upload MCP</span>
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL: KONFIRMASI TIMPA MCP */}
      {showOverwriteModal && existingCollisionDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  Timpa Data MCP yang Sudah Ada?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Data MCP untuk area <strong>{effectivePreviewLokasi}</strong> periode{' '}
                  <strong>
                    {MONTH_NAMES_ID[selectedMonth - 1]} {selectedYear}
                  </strong>{' '}
                  sudah tersimpan sebelumnya ({existingCollisionDoc.rows?.length || 0} baris). Timpa dengan data baru ini?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowOverwriteModal(false)}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Menyimpan...' : 'Ya, Timpa & Simpan'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: KONFIRMASI HAPUS MCP */}
      {showDeleteConfirmModal && activeDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Hapus Data MCP Ini?</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Data MCP <strong>{activeDoc.lokasi_proyek}</strong> ({MONTH_NAMES_ID[activeDoc.bulan - 1]}{' '}
                  {activeDoc.tahun}) akan dihapus dari proyek aktif.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSaved}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Hapus MCP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
