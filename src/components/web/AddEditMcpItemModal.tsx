import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckSquare,
  Plus,
  RotateCcw,
  Save,
  X,
} from 'lucide-react';
import { UploadedMcpDocument, UploadedMcpRow } from '../../types';
import {
  MONTH_NAMES_ID,
  getDaysInMonth,
  getIndonesianDayCode,
  normalizeFrqCode,
} from '../../utils/mcpExcel';
import {
  NEW_LOKASI_OPTION_VALUE,
  ManualMcpItemInput,
  findDuplicateMcpRow,
  getDatesForWeekdayInMonth,
  getDistinctLokasiKerjaList,
} from '../../utils/mcpManualItem';

interface AddEditMcpItemModalProps {
  isOpen: boolean;
  doc: UploadedMcpDocument;
  editingRow?: UploadedMcpRow | null;
  onClose: () => void;
  onSubmit: (input: ManualMcpItemInput) => Promise<void>;
}

const WEEKDAY_HELPERS: Array<{ dow: number; fullName: string; shortCode: string }> = [
  { dow: 1, fullName: 'Senin', shortCode: 'SN' },
  { dow: 2, fullName: 'Selasa', shortCode: 'SL' },
  { dow: 3, fullName: 'Rabu', shortCode: 'RB' },
  { dow: 4, fullName: 'Kamis', shortCode: 'KM' },
  { dow: 5, fullName: 'Jumat', shortCode: 'JM' },
  { dow: 6, fullName: 'Sabtu', shortCode: 'SB' },
  { dow: 0, fullName: 'Minggu', shortCode: 'MG' },
];

export const AddEditMcpItemModal: React.FC<AddEditMcpItemModalProps> = ({
  isOpen,
  doc,
  editingRow = null,
  onClose,
  onSubmit,
}) => {
  const daysCount = useMemo(
    () => doc.daysCount || getDaysInMonth(doc.bulan, doc.tahun),
    [doc.daysCount, doc.bulan, doc.tahun]
  );

  const existingLocations = useMemo(
    () => getDistinctLokasiKerjaList(doc.rows || []),
    [doc.rows]
  );

  const [lokasiSelectValue, setLokasiSelectValue] = useState<string>('');
  const [newLokasiText, setNewLokasiText] = useState<string>('');
  const [areaPekerjaan, setAreaPekerjaan] = useState<string>('');
  const [jenisPekerjaan, setJenisPekerjaan] = useState<string>('');
  const [frq, setFrq] = useState<'D' | 'W' | 'M'>('D');
  const [selectedDates, setSelectedDates] = useState<number[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [duplicateWarningRow, setDuplicateWarningRow] = useState<UploadedMcpRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    setValidationError(null);
    setDuplicateWarningRow(null);
    setIsSubmitting(false);

    if (editingRow) {
      const existingLoc = existingLocations.find(
        (loc) => loc.trim().toUpperCase() === (editingRow.lokasi_kerja || '').trim().toUpperCase()
      );
      if (existingLoc) {
        setLokasiSelectValue(existingLoc);
        setNewLokasiText('');
      } else {
        setLokasiSelectValue(NEW_LOKASI_OPTION_VALUE);
        setNewLokasiText(editingRow.lokasi_kerja || '');
      }
      setAreaPekerjaan(editingRow.area_pekerjaan || '');
      setJenisPekerjaan(editingRow.jenis_pekerjaan || '');
      const normFrq = normalizeFrqCode(editingRow.frq);
      setFrq(normFrq === 'W' || normFrq === 'M' ? normFrq : 'D');
      const dates = Array.from(
        new Set(
          (editingRow.jadwal || [])
            .filter((c) => String(c.nilai_asli ?? '').trim() !== '')
            .map((c) => Number(c.tanggal))
            .filter((d) => d >= 1 && d <= daysCount)
        )
      ).sort((a, b) => a - b);
      setSelectedDates(dates);
    } else {
      setLokasiSelectValue(existingLocations[0] || NEW_LOKASI_OPTION_VALUE);
      setNewLokasiText('');
      setAreaPekerjaan('');
      setJenisPekerjaan('');
      setFrq('D');
      setSelectedDates([]);
    }
  }, [isOpen, editingRow, existingLocations, daysCount]);

  if (!isOpen) return null;

  const isNewLokasi = lokasiSelectValue === NEW_LOKASI_OPTION_VALUE;
  const resolvedLokasiKerja = (isNewLokasi ? newLokasiText : lokasiSelectValue).trim();

  const toggleDate = (day: number) => {
    setValidationError(null);
    setDuplicateWarningRow(null);
    setSelectedDates((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  };

  const handleSelectAllDates = () => {
    setValidationError(null);
    setDuplicateWarningRow(null);
    setSelectedDates(Array.from({ length: daysCount }, (_, i) => i + 1));
  };

  const handleSelectWeekday = (dow: number) => {
    setValidationError(null);
    setDuplicateWarningRow(null);
    const weekdayDates = getDatesForWeekdayInMonth(doc.bulan, doc.tahun, daysCount, dow);
    setSelectedDates((prev) => {
      const allAlreadySelected = weekdayDates.every((d) => prev.includes(d));
      if (allAlreadySelected) {
        return prev.filter((d) => !weekdayDates.includes(d));
      }
      return Array.from(new Set([...prev, ...weekdayDates])).sort((a, b) => a - b);
    });
  };

  const handleClearDates = () => {
    setValidationError(null);
    setSelectedDates([]);
  };

  const submitForm = async (bypassDuplicateCheck: boolean) => {
    if (!resolvedLokasiKerja) {
      setValidationError('Lokasi Kerja wajib diisi.');
      return;
    }
    if (!areaPekerjaan.trim()) {
      setValidationError('Area Pekerjaan wajib diisi.');
      return;
    }
    if (!jenisPekerjaan.trim()) {
      setValidationError('Jenis Pekerjaan wajib diisi.');
      return;
    }
    if (selectedDates.length === 0) {
      setValidationError('Pilih minimal 1 tanggal pelaksanaan untuk item pekerjaan ini.');
      return;
    }

    if (!bypassDuplicateCheck) {
      const duplicate = findDuplicateMcpRow(
        doc.rows || [],
        resolvedLokasiKerja,
        areaPekerjaan,
        jenisPekerjaan,
        editingRow?.rowId
      );
      if (duplicate) {
        setDuplicateWarningRow(duplicate);
        return;
      }
    }

    setIsSubmitting(true);
    setValidationError(null);
    try {
      await onSubmit({
        editingRowId: editingRow?.rowId,
        lokasi_kerja: resolvedLokasiKerja,
        area_pekerjaan: areaPekerjaan.trim(),
        jenis_pekerjaan: jenisPekerjaan.trim(),
        frq,
        selectedDates,
        bulan: doc.bulan,
        tahun: doc.tahun,
        lokasi_proyek: doc.lokasi_proyek,
      });
      onClose();
    } catch (err: any) {
      setValidationError(err?.message || 'Gagal menyimpan item pekerjaan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const days = Array.from({ length: daysCount }, (_, i) => i + 1);
  const monthLabel = MONTH_NAMES_ID[doc.bulan - 1] || `Bulan ${doc.bulan}`;

  return (
    <div
      onClick={() => !isSubmitting && onClose()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                {editingRow ? 'Edit Item Pekerjaan Tambahan' : 'Tambah Item Pekerjaan'}
              </h3>
              <p className="text-[11px] text-slate-500">
                Periode: <strong>{monthLabel} {doc.tahun}</strong> • Area Proyek: <strong>{doc.lokasi_proyek}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg hover:bg-slate-200/70 text-slate-500 cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Lokasi Kerja */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Lokasi Kerja <span className="text-rose-600">*</span>
              </label>
              <select
                value={lokasiSelectValue}
                onChange={(e) => {
                  setLokasiSelectValue(e.target.value);
                  setValidationError(null);
                  setDuplicateWarningRow(null);
                }}
                aria-label="Lokasi Kerja"
                className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
              >
                {existingLocations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
                <option value={NEW_LOKASI_OPTION_VALUE}>+ Lokasi baru</option>
              </select>
            </div>

            {isNewLokasi ? (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Nama Lokasi Baru <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={newLokasiText}
                  onChange={(e) => {
                    setNewLokasiText(e.target.value);
                    setValidationError(null);
                    setDuplicateWarningRow(null);
                  }}
                  placeholder="Ketik nama Lokasi Kerja baru..."
                  className="w-full px-3 py-2 text-xs font-semibold text-slate-900 bg-white border border-teal-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  FRQ (Frekuensi) <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['D', 'W', 'M'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setFrq(opt)}
                      className={`py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                        frq === opt
                          ? 'bg-teal-600 text-white border-teal-700 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {opt} ({opt === 'D' ? 'Daily' : opt === 'W' ? 'Weekly' : 'Monthly'})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {isNewLokasi && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                FRQ (Frekuensi) <span className="text-rose-600">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2 max-w-md">
                {(['D', 'W', 'M'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFrq(opt)}
                    className={`py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                      frq === opt
                        ? 'bg-teal-600 text-white border-teal-700 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {opt} ({opt === 'D' ? 'Daily' : opt === 'W' ? 'Weekly' : 'Monthly'})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Area Pekerjaan & Jenis Pekerjaan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Area Pekerjaan <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={areaPekerjaan}
                onChange={(e) => {
                  setAreaPekerjaan(e.target.value);
                  setValidationError(null);
                  setDuplicateWarningRow(null);
                }}
                placeholder="Contoh: Lantai Lobby Utama"
                className="w-full px-3 py-2 text-xs font-semibold text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Jenis Pekerjaan <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={jenisPekerjaan}
                onChange={(e) => {
                  setJenisPekerjaan(e.target.value);
                  setValidationError(null);
                  setDuplicateWarningRow(null);
                }}
                placeholder="Contoh: Polishing / Washing"
                className="w-full px-3 py-2 text-xs font-semibold text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Pemilihan Tanggal Manual */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Calendar className="w-4 h-4 text-teal-600" />
                <span>
                  Pemilihan Tanggal ({monthLabel} {doc.tahun}) — Terpilih:{' '}
                  <strong className="text-teal-700">{selectedDates.length}</strong> tanggal (diisi &quot;R&quot;)
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSelectAllDates}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-[11px] font-bold cursor-pointer"
                >
                  <CheckSquare className="w-3 h-3" />
                  <span>Pilih semua tanggal</span>
                </button>
                {selectedDates.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearDates}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-bold cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Kosongkan</span>
                  </button>
                )}
              </div>
            </div>

            {/* Helper Buttons per Weekday for Weekly (W) */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 mr-0.5">
                Bantu pilih per hari (W):
              </span>
              {WEEKDAY_HELPERS.map((wd) => {
                const wdDates = getDatesForWeekdayInMonth(doc.bulan, doc.tahun, daysCount, wd.dow);
                const isAllChecked = wdDates.length > 0 && wdDates.every((d) => selectedDates.includes(d));
                return (
                  <button
                    key={wd.dow}
                    type="button"
                    onClick={() => handleSelectWeekday(wd.dow)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      isAllChecked
                        ? 'bg-purple-600 text-white border-purple-700'
                        : 'bg-white hover:bg-purple-50 text-purple-800 border-purple-200'
                    }`}
                  >
                    Pilih semua hari {wd.fullName}
                  </button>
                );
              })}
            </div>

            {/* Date Checkboxes 1..daysCount with Day Code underneath */}
            <div className="grid grid-cols-7 sm:grid-cols-11 gap-1.5">
              {days.map((d) => {
                const dayCode = doc.dayCodes?.[d] || getIndonesianDayCode(doc.bulan, doc.tahun, d);
                const isChecked = selectedDates.includes(d);
                const isSunday = dayCode.toUpperCase() === 'MG';
                return (
                  <label
                    key={d}
                    className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl border text-center cursor-pointer select-none transition-all ${
                      isChecked
                        ? 'bg-teal-600 text-white border-teal-700 shadow-2xs'
                        : isSunday
                        ? 'bg-rose-50/70 text-rose-700 border-rose-200 hover:bg-rose-100/70'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-teal-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleDate(d)}
                      className="sr-only"
                    />
                    <span className="text-xs font-extrabold leading-tight">{d}</span>
                    <span
                      className={`text-[9px] font-bold mt-0.5 ${
                        isChecked
                          ? 'text-teal-100'
                          : isSunday
                          ? 'text-rose-500'
                          : 'text-slate-400'
                      }`}
                    >
                      {dayCode}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-xs font-bold text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Duplicate Combination Warning + Confirmation */}
          {duplicateWarningRow && (
            <div className="p-3.5 rounded-xl bg-amber-50 border-2 border-amber-300 space-y-2.5">
              <div className="flex items-start gap-2 text-xs text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold">
                    Kombinasi Lokasi Kerja + Area Pekerjaan + Jenis Pekerjaan sudah ada!
                  </p>
                  <p className="mt-0.5">
                    Item serupa ditemukan di <strong>{duplicateWarningRow.lokasi_kerja}</strong> —{' '}
                    {duplicateWarningRow.area_pekerjaan} : {duplicateWarningRow.jenis_pekerjaan} (FRQ:{' '}
                    {duplicateWarningRow.frq || '-'}). Tetap tambahkan item ini?
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDuplicateWarningRow(null)}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 rounded-lg border border-amber-300 bg-white hover:bg-amber-100 text-amber-900 text-xs font-bold cursor-pointer"
                >
                  Periksa Kembali
                </button>
                <button
                  type="button"
                  onClick={() => submitForm(true)}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Menyimpan...' : 'Ya, Tetap Tambahkan'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/80 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => submitForm(false)}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>
              {isSubmitting
                ? 'Menyimpan...'
                : editingRow
                ? 'Simpan Perubahan'
                : 'Simpan Item Pekerjaan'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
