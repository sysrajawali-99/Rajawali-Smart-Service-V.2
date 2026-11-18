import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Save,
  Search,
  Trash2,
  UploadCloud,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import {
  MONTH_NAMES_ID,
  ParsedScheduleRow,
  ParseScheduleResult,
  buildRowsFromEntries,
  calculateScheduleDailyRecap,
  downloadWorkScheduleTemplate,
  extractSheetNamesFromBuffer,
  getDaysInMonth,
  getIndonesianDayCode,
  guessMonthYearFromNames,
  parseWorkScheduleBuffers,
} from '../../utils/workScheduleExcel';

interface StagedBuffer {
  name: string;
  size: number;
  buffer: ArrayBuffer;
}

interface ScheduleTableProps {
  bulan: number;
  tahun: number;
  daysCount: number;
  rows: ParsedScheduleRow[];
  isPreview?: boolean;
}

const ScheduleTemplateGrid: React.FC<ScheduleTableProps> = ({
  bulan,
  tahun,
  daysCount,
  rows,
  isPreview = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [areaFilter, setAreaFilter] = useState<string>('ALL');

  const days = useMemo(() => Array.from({ length: daysCount }, (_, i) => i + 1), [daysCount]);

  const uniqueAreas = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.area && r.area !== '-') set.add(r.area);
    });
    return Array.from(set).sort();
  }, [rows]);

  const visibleRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((r) => {
      const matchSearch =
        !q ||
        r.nama.toLowerCase().includes(q) ||
        r.jabatan.toLowerCase().includes(q) ||
        r.area.toLowerCase().includes(q);
      const matchArea = areaFilter === 'ALL' || r.area === areaFilter;
      return matchSearch && matchArea;
    });
  }, [rows, searchQuery, areaFilter]);

  // Daily recap always uses the complete rows of the schedule
  const dailyRecap = useMemo(
    () => calculateScheduleDailyRecap(rows, daysCount),
    [rows, daysCount]
  );

  return (
    <div className="space-y-3">
      {/* Toolbar: Search, Area filter & Color Legend */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, jabatan, atau area..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          {uniqueAreas.length > 0 && (
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="ALL">Semua Area ({rows.length})</option>
              {uniqueAreas.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            P = Pagi
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            S = Siang
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-700 border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-600" />
            OFF / O = Libur
          </span>
          {isPreview && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-600 text-white border border-red-700">
              ! = Kode Bermasalah
            </span>
          )}
        </div>
      </div>

      {/* Responsive Template Table */}
      <div className="border border-slate-200 rounded-2xl bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[65vh]">
          <table className="w-full border-collapse text-[11px]">
            <thead className="sticky top-0 z-20 bg-slate-100 text-slate-700 shadow-2xs">
              <tr>
                <th className="sticky left-0 z-30 bg-slate-100 border-b border-r border-slate-200 px-2.5 py-2 text-center font-bold w-10">
                  NO
                </th>
                <th className="sticky left-10 z-30 bg-slate-100 border-b border-r border-slate-200 px-3 py-2 text-left font-bold min-w-[165px]">
                  NAMA
                </th>
                <th className="border-b border-r border-slate-200 px-2.5 py-2 text-left font-bold min-w-[95px]">
                  JABATAN
                </th>
                <th className="border-b border-r border-slate-200 px-2.5 py-2 text-left font-bold min-w-[110px]">
                  AREA
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
                    className="py-8 text-center text-xs text-slate-400 font-medium"
                  >
                    Tidak ada baris karyawan yang cocok dengan pencarian/filter.
                  </td>
                </tr>
              ) : (
                visibleRows.map((row, idx) => (
                  <tr
                    key={row.rowId}
                    className={`hover:bg-sky-50/40 transition-colors ${
                      row.isSlotKosong ? 'bg-slate-50/70' : 'bg-white'
                    }`}
                  >
                    <td className="sticky left-0 z-10 bg-inherit border-r border-slate-200 px-2.5 py-1.5 text-center font-semibold text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="sticky left-10 z-10 bg-inherit border-r border-slate-200 px-3 py-1.5 font-bold text-slate-800 whitespace-nowrap">
                      {row.isSlotKosong ? (
                        <span className="italic text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          Slot Kosong
                        </span>
                      ) : (
                        row.nama
                      )}
                    </td>
                    <td className="border-r border-slate-200 px-2.5 py-1.5 font-semibold text-slate-700 whitespace-nowrap">
                      {row.jabatan}
                    </td>
                    <td className="border-r border-slate-200 px-2.5 py-1.5 font-medium text-slate-600 whitespace-nowrap">
                      {row.area}
                    </td>

                    {days.map((d) => {
                      const shiftVal = row.shifts[d] || '';
                      const invalidRaw = row.invalidDays[d];
                      const isInvalid = invalidRaw !== undefined;

                      let cellClass = 'bg-slate-50 text-slate-400';
                      if (isInvalid) {
                        cellClass =
                          'bg-red-600 text-white font-extrabold ring-1 ring-inset ring-red-800';
                      } else if (shiftVal === 'P') {
                        cellClass = 'bg-emerald-100 text-emerald-800 font-bold';
                      } else if (shiftVal === 'S') {
                        cellClass = 'bg-amber-100 text-amber-800 font-bold';
                      } else if (shiftVal === 'OFF') {
                        cellClass = 'bg-rose-100 text-rose-700 font-bold';
                      }

                      return (
                        <td
                          key={d}
                          title={
                            isInvalid
                              ? `Sel bermasalah: "${invalidRaw}" (harus P, S, OFF, atau O)`
                              : `Tgl ${d}: ${shiftVal}`
                          }
                          className={`border-r border-slate-200 px-1 py-1.5 text-center whitespace-nowrap ${cellClass}`}
                        >
                          {isInvalid ? (
                            <span className="inline-flex items-center justify-center gap-0.5">
                              <span>{shiftVal || '?'}</span>
                              <span className="text-[9px]">!</span>
                            </span>
                          ) : (
                            shiftVal
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>

            {/* Automatic Daily Recap Footer */}
            <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-bold text-slate-800">
              {[
                { key: 'spv', label: 'SPV', rowClass: 'bg-sky-50/70 text-sky-900' },
                { key: 'tl', label: 'TL', rowClass: 'bg-indigo-50/60 text-indigo-900' },
                { key: 'pagi', label: 'P (PAGI)', rowClass: 'bg-emerald-50 text-emerald-900' },
                { key: 'siang', label: 'S (SIANG)', rowClass: 'bg-amber-50 text-amber-900' },
                { key: 'gondola', label: 'GONDOLA', rowClass: 'bg-cyan-50/70 text-cyan-900' },
                { key: 'off', label: 'OFF', rowClass: 'bg-rose-50 text-rose-900' },
                {
                  key: 'jumlah',
                  label: 'JUMLAH',
                  rowClass: 'bg-slate-200/80 text-slate-950 font-extrabold',
                },
              ].map((recap) => (
                <tr key={recap.key} className={`border-t border-slate-200 ${recap.rowClass}`}>
                  <td
                    colSpan={2}
                    className="sticky left-0 z-10 bg-inherit border-r border-slate-200 px-3 py-1.5 text-left"
                  >
                    REKAP: {recap.label}
                  </td>
                  <td colSpan={2} className="border-r border-slate-200 px-2.5 py-1.5 text-slate-500 font-medium text-[10px]">
                    Otomatis / Hari
                  </td>
                  {days.map((d) => {
                    const count =
                      dailyRecap[d]?.[recap.key as keyof typeof dailyRecap[number]] ?? 0;
                    return (
                      <td
                        key={d}
                        className="border-r border-slate-200 px-1 py-1.5 text-center tabular-nums"
                      >
                        {count}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export const UploadJadwalKerjaSection: React.FC = () => {
  const {
    uploadedWorkSchedules,
    saveUploadedWorkSchedule,
    deleteUploadedWorkSchedule,
  } = useCleaning();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
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

  // Re-parse staged files live whenever Bulan/Tahun changes so calendar validation updates immediately
  const previewResult: ParseScheduleResult | null = useMemo(() => {
    if (stagedBuffers.length === 0) return null;
    return parseWorkScheduleBuffers(
      stagedBuffers.map((b) => ({ name: b.name, buffer: b.buffer })),
      selectedMonth,
      selectedYear
    );
  }, [stagedBuffers, selectedMonth, selectedYear]);

  // Saved schedule matching active Bulan & Tahun
  const existingSavedDoc = useMemo(
    () =>
      uploadedWorkSchedules.find(
        (doc) => doc.bulan === selectedMonth && doc.tahun === selectedYear
      ) || null,
    [uploadedWorkSchedules, selectedMonth, selectedYear]
  );

  const savedMatrix = useMemo(() => {
    if (!existingSavedDoc) return null;
    const { rows, daysCount } = buildRowsFromEntries(existingSavedDoc.entries || []);
    return {
      rows,
      daysCount: existingSavedDoc.daysCount || daysCount,
    };
  }, [existingSavedDoc]);

  const sortedSavedDocs = useMemo(
    () =>
      [...uploadedWorkSchedules].sort((a, b) =>
        a.tahun !== b.tahun ? b.tahun - a.tahun : b.bulan - a.bulan
      ),
    [uploadedWorkSchedules]
  );

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

      // Guess month & year from uploaded file names and sheet names
      const candidateNames: string[] = [];
      loaded.forEach((item) => {
        candidateNames.push(item.name);
        extractSheetNamesFromBuffer(item.buffer).forEach((s) => candidateNames.push(s));
      });
      const guessed = guessMonthYearFromNames(candidateNames);

      if (guessed.bulan) setSelectedMonth(guessed.bulan);
      if (guessed.tahun) setSelectedYear(guessed.tahun);

      if (guessed.bulan || guessed.tahun) {
        const mLabel = guessed.bulan ? MONTH_NAMES_ID[guessed.bulan - 1] : '';
        const yLabel = guessed.tahun ? String(guessed.tahun) : '';
        setAutoDetectedNote(
          `Terdeteksi otomatis dari nama file/sheet: ${[mLabel, yLabel].filter(Boolean).join(' ')}`
        );
      } else {
        setAutoDetectedNote(null);
      }

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
        text: `Gagal membaca file yang diupload: ${err?.message || 'Error tidak dikenal'}`,
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
      await saveUploadedWorkSchedule({
        bulan: selectedMonth,
        tahun: selectedYear,
        daysCount: previewResult.daysCount,
        fileName: stagedBuffers.map((b) => b.name).join(', '),
        entries: previewResult.entries,
      });

      setStagedBuffers([]);
      setAutoDetectedNote(null);
      setShowOverwriteModal(false);
      setBannerMessage({
        type: 'success',
        text: `Jadwal kerja ${MONTH_NAMES_ID[selectedMonth - 1]} ${selectedYear} (${previewResult.employeeCount} karyawan, ${previewResult.entries.length} entri harian) berhasil disimpan.`,
      });
    } catch (err: any) {
      setBannerMessage({
        type: 'error',
        text: `Gagal menyimpan jadwal ke server: ${err?.message || 'Terjadi kesalahan'}`,
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
    if (!existingSavedDoc) return;
    try {
      await deleteUploadedWorkSchedule(existingSavedDoc.id);
      setShowDeleteConfirmModal(false);
      setBannerMessage({
        type: 'success',
        text: `Jadwal kerja ${MONTH_NAMES_ID[selectedMonth - 1]} ${selectedYear} berhasil dihapus.`,
      });
    } catch (err: any) {
      setShowDeleteConfirmModal(false);
      setBannerMessage({
        type: 'error',
        text: `Gagal menghapus jadwal: ${err?.message || 'Terjadi kesalahan'}`,
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

      {/* Top Controls: Bulan & Tahun Dropdowns + Download Template */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-sky-600" />
              Upload Jadwal Kerja Bulanan (.xlsx, .xls, .csv)
            </h3>
            <p className="text-xs text-slate-500">
              Pilih Bulan &amp; Tahun periode jadwal (template Excel tidak menyimpan bulan), lalu unggah satu atau beberapa file sekaligus.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Required Month Dropdown */}
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-bold text-slate-700">Bulan:</label>
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(Number(e.target.value));
                  setAutoDetectedNote(null);
                }}
                aria-label="Pilih Bulan Jadwal"
                className="px-3 py-2 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                {MONTH_NAMES_ID.map((name, idx) => (
                  <option key={name} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Required Year Dropdown */}
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-bold text-slate-700">Tahun:</label>
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(Number(e.target.value));
                  setAutoDetectedNote(null);
                }}
                aria-label="Pilih Tahun Jadwal"
                className="px-3 py-2 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Download Template Button */}
            <button
              type="button"
              onClick={() => downloadWorkScheduleTemplate(selectedMonth, selectedYear)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Template</span>
            </button>
          </div>
        </div>

        {/* Auto-detected hint & Saved periods quick selector */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px]">
          <div className="flex items-center gap-2 flex-wrap">
            {autoDetectedNote ? (
              <span className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 font-semibold">
                {autoDetectedNote}
              </span>
            ) : (
              <span className="text-slate-500">
                Periode aktif: <strong className="text-slate-800">{MONTH_NAMES_ID[selectedMonth - 1]} {selectedYear}</strong> ({getDaysInMonth(selectedMonth, selectedYear)} hari)
              </span>
            )}

            {existingSavedDoc && (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                Jadwal Tersimpan ({savedMatrix?.rows.length || 0} Karyawan)
              </span>
            )}
          </div>

          {sortedSavedDocs.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-400 font-semibold">Arsip Tersimpan:</span>
              {sortedSavedDocs.map((doc) => {
                const isActive = doc.bulan === selectedMonth && doc.tahun === selectedYear;
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => {
                      setSelectedMonth(doc.bulan);
                      setSelectedYear(doc.tahun);
                      setAutoDetectedNote(null);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer border ${
                      isActive
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {MONTH_NAMES_ID[doc.bulan - 1]?.slice(0, 3)} {doc.tahun}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Drag & Drop Zone */}
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
              ? 'border-sky-500 bg-sky-50/70'
              : 'border-slate-300 hover:border-sky-400 hover:bg-slate-50/70'
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
            <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-800">
                {isParsing
                  ? 'Membaca & memvalidasi file jadwal...'
                  : 'Seret & lepas file jadwal ke sini, atau klik untuk memilih file'}
              </p>
              <p className="text-[11px] text-slate-500">
                Mendukung <span className="font-semibold text-slate-700">.xlsx, .xls, .csv</span> • Bisa upload banyak file sekaligus • Semua sheet akan dibaca otomatis
              </p>
            </div>

            {stagedBuffers.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
                {stagedBuffers.map((file, i) => (
                  <span
                    key={`${file.name}-${i}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 shadow-2xs"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{file.name}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PREVIEW SECTION (When files are uploaded & parsed) */}
      {previewResult && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-sky-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-600" />
                Preview Hasil Upload — {MONTH_NAMES_ID[selectedMonth - 1]} {selectedYear}
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Periksa jumlah karyawan, jumlah hari, serta sel berwarna merah sebelum menyimpan jadwal.
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
                disabled={isSaving || previewResult.rows.length === 0 || previewResult.errors.length > 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Menyimpan...' : 'Simpan'}</span>
              </button>
            </div>
          </div>

          {/* Preview Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Jumlah Karyawan
              </span>
              <div className="text-lg font-extrabold text-slate-900 mt-0.5 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-sky-600" />
                <span>{previewResult.employeeCount}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Jumlah Hari
              </span>
              <div className="text-lg font-extrabold text-slate-900 mt-0.5">
                {previewResult.daysCount} Hari
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Sheet Dibaca
              </span>
              <div className="text-lg font-extrabold text-slate-900 mt-0.5">
                {previewResult.sheetsProcessed} Sheet
              </div>
            </div>

            <div
              className={`p-3 rounded-xl border ${
                previewResult.errors.length > 0 || previewResult.warnings.length > 0
                  ? 'bg-rose-50 border-rose-200'
                  : 'bg-emerald-50 border-emerald-200'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider block text-slate-600">
                Error / Warning
              </span>
              <div
                className={`text-lg font-extrabold mt-0.5 ${
                  previewResult.errors.length > 0 || previewResult.warnings.length > 0
                    ? 'text-rose-700'
                    : 'text-emerald-700'
                }`}
              >
                {previewResult.errors.length} Error • {previewResult.warnings.length} Warning
              </div>
            </div>
          </div>

          {/* Errors & Warnings List */}
          {(previewResult.errors.length > 0 || previewResult.warnings.length > 0) && (
            <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Daftar Error &amp; Warning ({previewResult.errors.length + previewResult.warnings.length})
                </span>
                {previewResult.invalidCellCount > 0 && (
                  <span className="text-[11px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-md border border-red-200">
                    {previewResult.invalidCellCount} sel bermasalah ditandai merah
                  </span>
                )}
              </div>

              <ul className="max-h-40 overflow-y-auto space-y-1 text-[11px] pr-1">
                {previewResult.errors.map((err, i) => (
                  <li key={`err-${i}`} className="text-rose-800 font-bold flex items-start gap-1.5">
                    <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                    <span>{err}</span>
                  </li>
                ))}
                {previewResult.warnings.map((warn, i) => (
                  <li key={`warn-${i}`} className="text-amber-900 font-medium flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>{warn}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview Schedule Grid */}
          {previewResult.rows.length > 0 && (
            <ScheduleTemplateGrid
              bulan={selectedMonth}
              tahun={selectedYear}
              daysCount={previewResult.daysCount}
              rows={previewResult.rows}
              isPreview
            />
          )}
        </div>
      )}

      {/* SAVED SCHEDULE VIEW (When no preview is active, or below preview) */}
      {!previewResult && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-600" />
                Jadwal Kerja Tersimpan — {MONTH_NAMES_ID[selectedMonth - 1]} {selectedYear}
              </h4>
              {existingSavedDoc ? (
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {savedMatrix?.rows.length || 0} karyawan • {savedMatrix?.daysCount || 0} hari • Terakhir diperbarui:{' '}
                  {new Date(existingSavedDoc.updatedAt).toLocaleString('id-ID')}
                  {existingSavedDoc.fileName ? ` • File: ${existingSavedDoc.fileName}` : ''}
                </p>
              ) : (
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Belum ada jadwal kerja yang diupload untuk bulan {MONTH_NAMES_ID[selectedMonth - 1]} {selectedYear}.
                </p>
              )}
            </div>

            {existingSavedDoc && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Jadwal Bulan Ini</span>
              </button>
            )}
          </div>

          {savedMatrix && savedMatrix.rows.length > 0 ? (
            <ScheduleTemplateGrid
              bulan={selectedMonth}
              tahun={selectedYear}
              daysCount={savedMatrix.daysCount}
              rows={savedMatrix.rows}
            />
          ) : (
            <div className="py-10 text-center space-y-2 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
              <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-600">
                Belum ada data jadwal untuk {MONTH_NAMES_ID[selectedMonth - 1]} {selectedYear}
              </p>
              <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                Klik <strong className="text-slate-600">Download Template</strong> di atas untuk mengunduh format Excel standar, lalu unggah kembali di area upload.
              </p>
            </div>
          )}
        </div>
      )}

      {/* MODAL: KONFIRMASI TIMPA DATA BULAN/TAHUN SUDAH ADA */}
      {showOverwriteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  Timpa Jadwal Kerja yang Sudah Ada?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Jadwal kerja untuk periode{' '}
                  <strong>
                    {MONTH_NAMES_ID[selectedMonth - 1]} {selectedYear}
                  </strong>{' '}
                  sudah tersimpan sebelumnya ({savedMatrix?.rows.length || 0} karyawan). Apakah Anda yakin ingin menimpanya dengan data baru ini?
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

      {/* MODAL: KONFIRMASI HAPUS JADWAL BULAN TERSIMPAN */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  Hapus Jadwal Kerja Tersimpan?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Seluruh data jadwal upload untuk periode{' '}
                  <strong>
                    {MONTH_NAMES_ID[selectedMonth - 1]} {selectedYear}
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
                Hapus Jadwal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
