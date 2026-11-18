import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Filter,
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
import { UploadedMcpRow } from '../../types';
import {
  MONTH_NAMES_ID,
  ParseMcpResult,
  calculateMcpRecapAndLegend,
  downloadMcpTemplate,
  extractMcpMetadataFromInputs,
  getDaysInMonth,
  getIndonesianDayCode,
  normalizeLokasiProyekKey,
  parseMcpBuffers,
} from '../../utils/mcpExcel';

interface StagedBuffer {
  name: string;
  size: number;
  buffer: ArrayBuffer;
}

interface McpTemplateGridProps {
  bulan: number;
  tahun: number;
  daysCount: number;
  rows: UploadedMcpRow[];
}

const McpTemplateGrid: React.FC<McpTemplateGridProps> = ({
  bulan,
  tahun,
  daysCount,
  rows,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLokasiKerja, setFilterLokasiKerja] = useState<string>('ALL');
  const [filterAreaPekerjaan, setFilterAreaPekerjaan] = useState<string>('ALL');
  const [filterJenisPekerjaan, setFilterJenisPekerjaan] = useState<string>('ALL');

  const days = useMemo(() => Array.from({ length: daysCount }, (_, i) => i + 1), [daysCount]);

  // Distinct dropdown options for Lokasi Kerja, Area Pekerjaan, and Jenis Pekerjaan
  const filterOptions = useMemo(() => {
    const lokasiSet = new Set<string>();
    const areaSet = new Set<string>();
    const jenisSet = new Set<string>();

    rows.forEach((r) => {
      if (r.lokasi_kerja) lokasiSet.add(r.lokasi_kerja);
      if (r.area_pekerjaan) areaSet.add(r.area_pekerjaan);
      if (r.jenis_pekerjaan) jenisSet.add(r.jenis_pekerjaan);
    });

    const sortId = (a: string, b: string) =>
      a.localeCompare(b, 'id', { numeric: true, sensitivity: 'base' });

    return {
      lokasiKerja: Array.from(lokasiSet).sort(sortId),
      areaPekerjaan: Array.from(areaSet).sort(sortId),
      jenisPekerjaan: Array.from(jenisSet).sort(sortId),
    };
  }, [rows]);

  const visibleRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((row) => {
      if (filterLokasiKerja !== 'ALL' && row.lokasi_kerja !== filterLokasiKerja) {
        return false;
      }
      if (filterAreaPekerjaan !== 'ALL' && row.area_pekerjaan !== filterAreaPekerjaan) {
        return false;
      }
      if (filterJenisPekerjaan !== 'ALL' && row.jenis_pekerjaan !== filterJenisPekerjaan) {
        return false;
      }
      if (q) {
        const matchText =
          (row.lokasi_kerja || '').toLowerCase().includes(q) ||
          (row.area_pekerjaan || '').toLowerCase().includes(q) ||
          (row.jenis_pekerjaan || '').toLowerCase().includes(q);
        if (!matchText) return false;
      }
      return true;
    });
  }, [rows, filterLokasiKerja, filterAreaPekerjaan, filterJenisPekerjaan, searchQuery]);

  // Precompute contiguous group rowSpans for Lokasi Kerja so the grid visually mirrors the template
  const lokasiKerjaRowSpans = useMemo(() => {
    const spans: number[] = Array(visibleRows.length).fill(0);
    let i = 0;
    while (i < visibleRows.length) {
      const currentGroup = visibleRows[i].lokasi_kerja || '';
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
    filterJenisPekerjaan !== 'ALL';

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterLokasiKerja('ALL');
    setFilterAreaPekerjaan('ALL');
    setFilterJenisPekerjaan('ALL');
  };

  // Automatic legend & daily recap from visible rows, plus full palette reference so colors stay consistent
  const { dailyCounts, totalScheduledCells, legend, tokenStyleMap } = useMemo(
    () => calculateMcpRecapAndLegend(visibleRows, daysCount),
    [visibleRows, daysCount]
  );

  const fullLegendData = useMemo(
    () => (hasActiveFilter ? calculateMcpRecapAndLegend(rows, daysCount) : null),
    [hasActiveFilter, rows, daysCount]
  );
  const activeTokenStyleMap = fullLegendData?.tokenStyleMap || tokenStyleMap;
  const activeLegend = fullLegendData?.legend || legend;

  return (
    <div className="space-y-3">
      {/* Filters Toolbar: Lokasi Kerja, Area Pekerjaan, Jenis Pekerjaan + Search */}
      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-56">
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
            className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500 max-w-[200px]"
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
            className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500 max-w-[210px]"
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
            className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500 max-w-[220px]"
          >
            <option value="ALL">Semua Jenis Pekerjaan ({filterOptions.jenisPekerjaan.length})</option>
            {filterOptions.jenisPekerjaan.map((val) => (
              <option key={val} value={val}>
                {val}
              </option>
            ))}
          </select>

          {hasActiveFilter && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filter</span>
            </button>
          )}

          <div className="ml-auto text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-teal-600" />
            <span>
              <strong className="text-slate-800">{visibleRows.length}</strong> dari{' '}
              <strong className="text-slate-800">{rows.length}</strong> pekerjaan
            </span>
          </div>
        </div>

        {/* Automatic Legend from Unique Characters */}
        <div className="pt-2 border-t border-slate-200/70 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-600 mr-1">
            Legenda Karakter Terjadwal ({activeLegend.length} unik):
          </span>
          {activeLegend.length === 0 ? (
            <span className="text-[11px] italic text-slate-400">
              Belum ada sel tanggal yang terjadwal
            </span>
          ) : (
            activeLegend.map((item) => (
              <span
                key={item.token}
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-[11px] font-bold ${item.badgeClass}`}
                title={`Nilai sel asli: "${item.token}" (${item.count} sel)`}
              >
                <span className={`w-2 h-2 rounded-full ${item.dotClass}`} />
                <span className="font-mono">{item.token}</span>
                <span className="text-[10px] opacity-75 font-semibold">({item.count})</span>
              </span>
            ))
          )}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border border-slate-200 bg-white text-slate-400 text-[11px] font-medium">
            Sel Kosong = Tidak Terjadwal
          </span>
        </div>
      </div>

      {/* Grouped Template Grid Table */}
      <div className="border border-slate-200 rounded-2xl bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[65vh]">
          <table className="w-full border-collapse text-[11px]">
            <thead className="sticky top-0 z-20 bg-slate-100 text-slate-700 shadow-2xs">
              <tr>
                <th className="sticky left-0 z-30 bg-slate-100 border-b border-r border-slate-200 px-2.5 py-2 text-center font-bold w-10">
                  NO
                </th>
                <th className="border-b border-r border-slate-200 px-3 py-2 text-left font-bold min-w-[165px] whitespace-nowrap">
                  Lokasi Kerja
                </th>
                <th className="border-b border-r border-slate-200 px-3 py-2 text-left font-bold min-w-[180px] whitespace-nowrap">
                  Area Pekerjaan
                </th>
                <th className="border-b border-r border-slate-200 px-3 py-2 text-left font-bold min-w-[200px] whitespace-nowrap">
                  Jenis Pekerjaan
                </th>
                {days.map((d) => {
                  const dowCode = getIndonesianDayCode(bulan, tahun, d);
                  const isSunday = dowCode === 'MG';
                  return (
                    <th
                      key={d}
                      className={`border-b border-r border-slate-200 px-1.5 py-1.5 text-center font-bold min-w-[38px] ${
                        isSunday ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="leading-tight">{d}</div>
                      <div
                        className={`text-[9px] font-extrabold tracking-wide ${
                          isSunday ? 'text-rose-600' : 'text-slate-400'
                        }`}
                      >
                        {dowCode}
                      </div>
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
                    Tidak ada baris pekerjaan yang cocok dengan filter aktif.
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

                  return (
                    <tr
                      key={`${row.urutan}-${rowIdx}`}
                      className="bg-white hover:bg-teal-50/40 transition-colors"
                    >
                      <td className="sticky left-0 z-10 bg-inherit border-r border-slate-200 px-2.5 py-1.5 text-center font-semibold text-slate-500">
                        {row.urutan || rowIdx + 1}
                      </td>

                      {groupSpan > 0 && (
                        <td
                          rowSpan={groupSpan}
                          className="border-r border-b border-slate-200 px-3 py-2 align-top font-bold text-slate-900 bg-slate-50/70 min-w-[165px]"
                        >
                          <div className="sticky top-12">{row.lokasi_kerja || '-'}</div>
                        </td>
                      )}

                      <td className="border-r border-slate-200 px-3 py-1.5 text-slate-700 font-medium max-w-[240px]">
                        <div className="line-clamp-2 break-words">{row.area_pekerjaan || '-'}</div>
                      </td>

                      <td className="border-r border-slate-200 px-3 py-1.5 text-slate-800 font-semibold max-w-[260px]">
                        <div className="line-clamp-2 break-words">{row.jenis_pekerjaan || '-'}</div>
                      </td>

                      {days.map((d) => {
                        const rawVal = dayMap.get(d);
                        const isScheduled = rawVal !== undefined && rawVal !== '';
                        const tokenStyle = isScheduled ? activeTokenStyleMap.get(rawVal) : undefined;
                        return (
                          <td
                            key={d}
                            title={
                              isScheduled
                                ? `Tgl ${d}: Terjadwal ("${rawVal}")`
                                : `Tgl ${d}: Tidak terjadwal`
                            }
                            className={`border-r border-slate-200 px-1 py-1.5 text-center whitespace-nowrap ${
                              isScheduled
                                ? tokenStyle?.cellClass || 'bg-teal-100 text-teal-900 font-bold'
                                : 'bg-white text-transparent select-none'
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

            {/* Automatic Daily Scheduled Job Recap Footer */}
            <tfoot className="border-t-2 border-slate-300 bg-teal-50/80 font-bold text-teal-950">
              <tr>
                <td
                  colSpan={4}
                  className="sticky left-0 z-10 bg-teal-50 border-r border-slate-200 px-3 py-2 text-left"
                >
                  <span>REKAP HARIAN: JUMLAH PEKERJAAN TERJADWAL</span>
                  <span className="ml-2 px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 text-[10px] font-extrabold border border-teal-200">
                    Total {totalScheduledCells} sel terjadwal
                  </span>
                </td>
                {days.map((d) => (
                  <td
                    key={d}
                    className="border-r border-slate-200 px-1 py-2 text-center tabular-nums text-teal-900 font-extrabold"
                  >
                    {dailyCounts[d] ?? 0}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export const UploadMcpSection: React.FC = () => {
  const {
    activeProject,
    uploadedMcpPrograms,
    saveUploadedMcpProgram,
    deleteUploadedMcpProgram,
  } = useCleaning();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [lokasiProyekInput, setLokasiProyekInput] = useState<string>(activeProject?.name || '');
  const [autoDetectedNote, setAutoDetectedNote] = useState<string | null>(null);

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

  // Re-parse staged files whenever Bulan / Tahun / Lokasi Proyek changes so day-of-week validation updates live
  const previewResult: ParseMcpResult | null = useMemo(() => {
    if (stagedBuffers.length === 0) return null;
    return parseMcpBuffers(
      stagedBuffers.map((b) => ({ name: b.name, buffer: b.buffer })),
      selectedMonth,
      selectedYear,
      lokasiProyekInput.trim() || activeProject?.name || ''
    );
  }, [stagedBuffers, selectedMonth, selectedYear, lokasiProyekInput, activeProject?.name]);

  const effectivePreviewLokasi = (
    lokasiProyekInput.trim() ||
    previewResult?.lokasiProyek ||
    activeProject?.name ||
    'Default'
  ).trim();

  // Match existing saved MCP by lokasi_proyek + bulan + tahun
  const existingSavedDoc = useMemo(() => {
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

  // Also allow selecting from any saved MCP doc if none matches the exact typed location
  const activeSavedDoc = useMemo(() => {
    if (existingSavedDoc) return existingSavedDoc;
    return (
      uploadedMcpPrograms.find(
        (doc) => doc.bulan === selectedMonth && doc.tahun === selectedYear
      ) || null
    );
  }, [existingSavedDoc, uploadedMcpPrograms, selectedMonth, selectedYear]);

  const sortedSavedDocs = useMemo(
    () =>
      [...uploadedMcpPrograms].sort((a, b) => {
        if (a.tahun !== b.tahun) return b.tahun - a.tahun;
        if (a.bulan !== b.bulan) return a.bulan - b.bulan;
        return (a.lokasi_proyek || '').localeCompare(b.lokasi_proyek || '');
      }),
    [uploadedMcpPrograms]
  );

  const savedStats = useMemo(() => {
    if (!activeSavedDoc) return null;
    const lokasiKerjaSet = new Set<string>();
    const tokenSet = new Set<string>();
    let scheduledCount = 0;
    for (const row of activeSavedDoc.rows || []) {
      if (row.lokasi_kerja) lokasiKerjaSet.add(row.lokasi_kerja);
      for (const cell of row.jadwal || []) {
        scheduledCount++;
        if (cell.nilai_asli) tokenSet.add(cell.nilai_asli);
      }
    }
    return {
      rowCount: activeSavedDoc.rows?.length || 0,
      lokasiKerjaCount: lokasiKerjaSet.size,
      scheduledCount,
      uniqueTokens: Array.from(tokenSet),
    };
  }, [activeSavedDoc]);

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

      const detectedParts: string[] = [];
      if (meta.bulan || meta.tahun) {
        const mLabel = meta.bulan ? MONTH_NAMES_ID[meta.bulan - 1] : '';
        const yLabel = meta.tahun ? String(meta.tahun) : '';
        detectedParts.push([mLabel, yLabel].filter(Boolean).join(' '));
      }
      if (meta.lokasiProyek) {
        detectedParts.push(`AREA: ${meta.lokasiProyek}`);
      }

      setAutoDetectedNote(
        detectedParts.length > 0
          ? `Metadata terdeteksi otomatis: ${detectedParts.join(' • ')}`
          : null
      );

      setStagedBuffers(loaded);

      if (rejectedCount > 0) {
        setBannerMessage({
          type: 'info',
          text: `${rejectedCount} file diabaikan karena bukan berformat .xlsx, .xls, atau .csv.`,
        });
      }
    } catch (err: any) {
      setBannerMessage({
        type: 'error',
        text: `Gagal membaca file MCP yang diupload: ${err?.message || 'Error tidak dikenal'}`,
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
    if (!previewResult || previewResult.rows.length === 0) return;
    setIsSaving(true);
    setBannerMessage(null);
    try {
      const targetLokasi = effectivePreviewLokasi;
      await saveUploadedMcpProgram({
        lokasi_proyek: targetLokasi,
        bulan: selectedMonth,
        tahun: selectedYear,
        daysCount: previewResult.daysCount,
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

      const savedRowsCount = previewResult.totalRows;
      const savedCellsCount = previewResult.totalScheduledCells;
      setStagedBuffers([]);
      setAutoDetectedNote(null);
      setShowOverwriteModal(false);
      setBannerMessage({
        type: 'success',
        text: `MCP "${targetLokasi}" (${MONTH_NAMES_ID[selectedMonth - 1]} ${selectedYear} — ${savedRowsCount} pekerjaan, ${savedCellsCount} sel terjadwal) berhasil disimpan.`,
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
    if (!previewResult || previewResult.rows.length === 0) return;
    if (existingSavedDoc) {
      setShowOverwriteModal(true);
    } else {
      executeSave();
    }
  };

  const handleCancelPreview = () => {
    setStagedBuffers([]);
    setAutoDetectedNote(null);
    setShowOverwriteModal(false);
    setBannerMessage(null);
  };

  const handleConfirmDeleteSaved = async () => {
    if (!activeSavedDoc) return;
    try {
      await deleteUploadedMcpProgram(activeSavedDoc.id);
      setShowDeleteConfirmModal(false);
      setBannerMessage({
        type: 'success',
        text: `MCP Upload "${activeSavedDoc.lokasi_proyek}" (${MONTH_NAMES_ID[activeSavedDoc.bulan - 1]} ${activeSavedDoc.tahun}) berhasil dihapus.`,
      });
    } catch (err: any) {
      setShowDeleteConfirmModal(false);
      setBannerMessage({
        type: 'error',
        text: `Gagal menghapus MCP: ${err?.message || 'Terjadi kesalahan'}`,
      });
    }
  };

  return (
    <div className="space-y-5">
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

      {/* Upload Box & Metadata Controls */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-teal-600" />
              Upload MCP (Master Cleaning Program) — .xlsx, .xls, .csv
            </h3>
            <p className="text-xs text-slate-500">
              Otomatis membaca judul (Bulan &amp; Tahun), baris <code className="px-1 py-0.5 bg-slate-100 rounded text-[11px]">AREA : ...</code>, kolom <strong>Lokasi Kerja</strong>, <strong>Area Pekerjaan</strong>, <strong>Jenis Pekerjaan</strong>, dan tanggal 1–31.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() =>
                downloadMcpTemplate(
                  selectedMonth,
                  selectedYear,
                  lokasiProyekInput.trim() || activeProject?.name || 'PROYEK CONTOH'
                )
              }
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Template</span>
            </button>
          </div>
        </div>

        {/* Saved Archive Selector */}
        {sortedSavedDocs.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-[11px]">
            <span className="text-slate-500 font-bold mr-1">Arsip MCP Tersimpan:</span>
            {sortedSavedDocs.map((doc) => {
              const isActive = activeSavedDoc?.id === doc.id;
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => {
                    setSelectedMonth(doc.bulan);
                    setSelectedYear(doc.tahun);
                    setLokasiProyekInput(doc.lokasi_proyek || '');
                    setAutoDetectedNote(null);
                  }}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer border ${
                    isActive
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {doc.lokasi_proyek || 'Proyek'} • {MONTH_NAMES_ID[doc.bulan - 1]?.slice(0, 3)}{' '}
                  {doc.tahun}
                </button>
              );
            })}
          </div>
        )}

        {/* Multi-file Drag & Drop Zone */}
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
                  ? 'Membaca & memproses template MCP...'
                  : 'Seret & lepas file MCP ke sini, atau klik untuk memilih file'}
              </p>
              <p className="text-[11px] text-slate-500">
                Mendukung <span className="font-semibold text-slate-700">.xlsx, .xls, .csv</span> • Bisa banyak file • Semua sheet dibaca otomatis
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
      </div>

      {/* PREVIEW PANEL */}
      {previewResult && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-teal-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-600" />
                Preview Hasil Upload MCP
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {autoDetectedNote ||
                  'Periksa atau sesuaikan metadata Bulan, Tahun, dan Nama Lokasi Proyek di bawah sebelum menyimpan.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancelPreview}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleClickSave}
                disabled={isSaving || previewResult.rows.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Menyimpan...' : 'Simpan'}</span>
              </button>
            </div>
          </div>

          {/* Editable Metadata Controls inside Preview: Bulan, Tahun, Nama Lokasi Proyek */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-xl bg-teal-50/60 border border-teal-200/70">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-teal-950 block">
                Nama Lokasi / Proyek (AREA)
              </label>
              <div className="relative">
                <Building2 className="w-3.5 h-3.5 text-teal-600 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={lokasiProyekInput}
                  onChange={(e) => setLokasiProyekInput(e.target.value)}
                  placeholder="Contoh: GEDUNG GRAHA RAJAWALI"
                  aria-label="Edit Nama Lokasi Proyek"
                  className="w-full pl-8 pr-3 py-2 text-xs font-bold text-slate-900 bg-white border border-teal-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-teal-950 block">Bulan Laporan</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                aria-label="Edit Bulan MCP"
                className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-teal-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
              >
                {MONTH_NAMES_ID.map((name, idx) => (
                  <option key={name} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-teal-950 block">Tahun Laporan</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                aria-label="Edit Tahun MCP"
                className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-teal-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Preview Summary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Periode
              </span>
              <div className="text-sm font-extrabold text-slate-900 mt-1">
                {MONTH_NAMES_ID[selectedMonth - 1]} {selectedYear}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Nama Lokasi
              </span>
              <div className="text-sm font-extrabold text-slate-900 mt-1 truncate" title={effectivePreviewLokasi}>
                {effectivePreviewLokasi}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Kelompok Lokasi Kerja
              </span>
              <div className="text-lg font-extrabold text-slate-900 mt-0.5 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-teal-600" />
                <span>{previewResult.lokasiKerjaGroups.length}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Jumlah Pekerjaan
              </span>
              <div className="text-lg font-extrabold text-slate-900 mt-0.5 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-teal-600" />
                <span>{previewResult.totalRows}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Sel Terjadwal
              </span>
              <div className="text-lg font-extrabold text-teal-700 mt-0.5">
                {previewResult.totalScheduledCells} Sel
              </div>
            </div>
          </div>

          {/* Unique Characters Found in Preview */}
          <div className="flex flex-wrap items-center gap-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px]">
            <span className="font-bold text-slate-700 flex items-center gap-1 mr-1">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              Karakter Unik Ditemukan ({previewResult.uniqueTokens.length}):
            </span>
            {previewResult.uniqueTokens.length === 0 ? (
              <span className="italic text-slate-400">Tidak ada sel tanggal terisi</span>
            ) : (
              previewResult.uniqueTokens.map((tok) => (
                <span
                  key={tok}
                  className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-mono font-bold text-slate-800"
                >
                  {tok}
                </span>
              ))
            )}
          </div>

          {/* Structural Warnings ONLY (header/dates missing or month/day mismatch) */}
          {previewResult.structuralWarnings.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1.5">
              <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Peringatan Struktur Template ({previewResult.structuralWarnings.length})</span>
              </div>
              <ul className="space-y-1 text-[11px] text-amber-900">
                {previewResult.structuralWarnings.map((warn, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span>•</span>
                    <span>{warn}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview Grid */}
          {previewResult.rows.length > 0 ? (
            <McpTemplateGrid
              bulan={selectedMonth}
              tahun={selectedYear}
              daysCount={previewResult.daysCount}
              rows={previewResult.rows}
            />
          ) : (
            <div className="py-8 text-center text-xs font-semibold text-amber-800 bg-amber-50/70 rounded-xl border border-amber-200">
              Tidak ada baris pekerjaan yang dapat dibaca. Pastikan baris header memuat kolom Lokasi Kerja, Area Pekerjaan, Jenis Pekerjaan, serta deretan tanggal 1 s/d 28-31.
            </div>
          )}
        </div>
      )}

      {/* SAVED MCP VIEW (When no preview is active) */}
      {!previewResult && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-600" />
                {activeSavedDoc
                  ? `MCP Tersimpan — ${activeSavedDoc.lokasi_proyek || 'Proyek'} (${MONTH_NAMES_ID[activeSavedDoc.bulan - 1]} ${activeSavedDoc.tahun})`
                  : `MCP Tersimpan — ${MONTH_NAMES_ID[selectedMonth - 1]} ${selectedYear}`}
              </h4>
              {activeSavedDoc && savedStats ? (
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {savedStats.lokasiKerjaCount} kelompok Lokasi Kerja • {savedStats.rowCount}{' '}
                  pekerjaan • {savedStats.scheduledCount} sel terjadwal • Diperbarui:{' '}
                  {new Date(activeSavedDoc.updatedAt).toLocaleString('id-ID')}
                  {activeSavedDoc.fileName ? ` • File: ${activeSavedDoc.fileName}` : ''}
                </p>
              ) : (
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Belum ada file MCP yang diupload untuk bulan {MONTH_NAMES_ID[selectedMonth - 1]}{' '}
                  {selectedYear}.
                </p>
              )}
            </div>

            {activeSavedDoc && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus MCP Ini</span>
              </button>
            )}
          </div>

          {activeSavedDoc && activeSavedDoc.rows && activeSavedDoc.rows.length > 0 ? (
            <McpTemplateGrid
              bulan={activeSavedDoc.bulan}
              tahun={activeSavedDoc.tahun}
              daysCount={
                activeSavedDoc.daysCount ||
                getDaysInMonth(activeSavedDoc.bulan, activeSavedDoc.tahun)
              }
              rows={activeSavedDoc.rows}
            />
          ) : (
            <div className="py-10 text-center space-y-2 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
              <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-600">
                Belum ada data upload MCP untuk {MONTH_NAMES_ID[selectedMonth - 1]} {selectedYear}
              </p>
              <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                Seret file Planning Monthly Report MCP Anda ke area upload di atas, atau klik{' '}
                <strong className="text-slate-600">Download Template</strong> untuk mengunduh formatnya.
              </p>
            </div>
          )}
        </div>
      )}

      {/* MODAL: KONFIRMASI TIMPA LOKASI + BULAN + TAHUN SUDAH ADA */}
      {showOverwriteModal && existingSavedDoc && (
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
                  Data Upload MCP untuk lokasi{' '}
                  <strong>{effectivePreviewLokasi}</strong> periode{' '}
                  <strong>
                    {MONTH_NAMES_ID[selectedMonth - 1]} {selectedYear}
                  </strong>{' '}
                  sudah tersimpan sebelumnya ({existingSavedDoc.rows?.length || 0} pekerjaan). Apakah Anda yakin ingin menimpanya dengan data baru ini?
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

      {/* MODAL: KONFIRMASI HAPUS MCP TERSIMPAN */}
      {showDeleteConfirmModal && activeSavedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  Hapus MCP Upload Tersimpan?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Seluruh data upload MCP lokasi{' '}
                  <strong>{activeSavedDoc.lokasi_proyek}</strong> periode{' '}
                  <strong>
                    {MONTH_NAMES_ID[activeSavedDoc.bulan - 1]} {activeSavedDoc.tahun}
                  </strong>{' '}
                  akan dihapus dari proyek aktif.
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
