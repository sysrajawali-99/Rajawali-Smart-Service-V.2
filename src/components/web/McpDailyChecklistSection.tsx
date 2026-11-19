import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Save,
  UserCheck,
  AlertCircle,
} from 'lucide-react';
import { McpChecklistResultRecord, McpChecklistStatus } from '../../types';
import {
  findSavedResultForItem,
  isValidMcpStatus,
  LocalDateParts,
  TodayScheduledMcpItem,
} from '../../utils/mcpChecklist';

interface McpDailyChecklistSectionProps {
  todayParts: LocalDateParts;
  selectedAreaLabel: string;
  allTodayItems: TodayScheduledMcpItem[];
  areaTodayItems: TodayScheduledMcpItem[];
  savedResults: McpChecklistResultRecord[];
  onSave: (
    entries: Array<{
      item: TodayScheduledMcpItem;
      status: McpChecklistStatus;
    }>
  ) => Promise<void>;
  onSelectAreaValue?: (areaOptionId: string) => void;
}

const STATUS_OPTIONS: Array<{
  code: McpChecklistStatus;
  label: string;
  activeClass: string;
  idleClass: string;
}> = [
  {
    code: 'R',
    label: 'Realisasi',
    activeClass: 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-200',
    idleClass: 'bg-white text-emerald-700 border-slate-300 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800',
  },
  {
    code: 'X',
    label: 'Belum Realisasi',
    activeClass: 'bg-rose-600 text-white border-rose-700 shadow-xs ring-2 ring-rose-200',
    idleClass: 'bg-white text-rose-600 border-rose-300 hover:bg-rose-50 hover:border-rose-400 hover:text-rose-700',
  },
];

function formatSavedTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
  } catch {
    return '';
  }
}

export const McpDailyChecklistSection: React.FC<McpDailyChecklistSectionProps> = ({
  todayParts,
  selectedAreaLabel,
  allTodayItems,
  areaTodayItems,
  savedResults,
  onSave,
  onSelectAreaValue,
}) => {
  const [draftStatuses, setDraftStatuses] = useState<Record<string, McpChecklistStatus>>({});
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const savedByItemKey = useMemo(() => {
    const map = new Map<string, McpChecklistResultRecord>();
    for (const item of areaTodayItems) {
      const found = findSavedResultForItem(item, savedResults, todayParts.dateStr);
      if (found && isValidMcpStatus(found.status)) {
        map.set(item.itemKey, found);
      }
    }
    return map;
  }, [areaTodayItems, savedResults, todayParts.dateStr]);

  // Re-initialize drafts from saved statuses whenever date/area/savedResults change, preserving any un-saved dirty selections
  useEffect(() => {
    setDraftStatuses((prev) => {
      const next: Record<string, McpChecklistStatus> = {};
      for (const item of areaTodayItems) {
        if (dirtyKeys.has(item.itemKey) && prev[item.itemKey]) {
          next[item.itemKey] = prev[item.itemKey];
        } else {
          const saved = savedByItemKey.get(item.itemKey);
          if (saved && isValidMcpStatus(saved.status)) {
            next[item.itemKey] = saved.status;
          }
        }
      }
      return next;
    });
  }, [areaTodayItems, savedByItemKey, todayParts.dateStr]);

  // Clear dirty keys when switching date
  useEffect(() => {
    setDirtyKeys(new Set());
    setSaveFeedback(null);
  }, [todayParts.dateStr]);

  const savedRealisasiCount = useMemo(() => {
    let count = 0;
    for (const rec of savedByItemKey.values()) {
      if (rec.status === 'R') count += 1;
    }
    return count;
  }, [savedByItemKey]);

  const savedBelumRealisasiCount = useMemo(() => {
    let count = 0;
    for (const rec of savedByItemKey.values()) {
      if (rec.status === 'X') count += 1;
    }
    return count;
  }, [savedByItemKey]);

  const totalAreaCount = areaTodayItems.length;
  const progressPct = totalAreaCount > 0 ? Math.round((savedRealisasiCount / totalAreaCount) * 100) : 0;

  const pendingChanges = useMemo(() => {
    const list: Array<{ item: TodayScheduledMcpItem; status: McpChecklistStatus }> = [];
    for (const item of areaTodayItems) {
      const draft = draftStatuses[item.itemKey];
      if (!isValidMcpStatus(draft)) continue;
      const saved = savedByItemKey.get(item.itemKey);
      if (!saved || saved.status !== draft) {
        list.push({ item, status: draft });
      }
    }
    return list;
  }, [areaTodayItems, draftStatuses, savedByItemKey]);

  const handleSelectStatus = (itemKey: string, code: McpChecklistStatus) => {
    setSaveFeedback(null);
    setDraftStatuses((prev) => {
      const next = { ...prev };
      const saved = savedByItemKey.get(itemKey);
      if (next[itemKey] === code && !saved) {
        delete next[itemKey];
      } else {
        next[itemKey] = code;
      }
      return next;
    });
    setDirtyKeys((prev) => {
      const next = new Set(prev);
      next.add(itemKey);
      return next;
    });
  };

  const handleSaveChecklist = async () => {
    if (pendingChanges.length === 0 || isSaving) return;
    setIsSaving(true);
    setSaveFeedback(null);
    try {
      await onSave(pendingChanges);
      setDirtyKeys((prev) => {
        const next = new Set(prev);
        for (const entry of pendingChanges) {
          next.delete(entry.item.itemKey);
        }
        return next;
      });
      setSaveFeedback(`${pendingChanges.length} item berhasil disimpan`);
    } catch {
      setSaveFeedback('Gagal menyimpan ceklist, silakan coba lagi');
    } finally {
      setIsSaving(false);
    }
  };

  // Summary of other areas that have today's MCP tasks (for quick switch when selected area has 0 MCP items)
  const otherMcpAreas = useMemo(() => {
    const map = new Map<string, { label: string; targetAreaId: string; count: number }>();
    for (const item of allTodayItems) {
      const cur = map.get(item.areaKey);
      if (cur) {
        cur.count += 1;
      } else {
        map.set(item.areaKey, {
          label: item.lokasi_kerja,
          targetAreaId: item.targetAreaId,
          count: 1,
        });
      }
    }
    return Array.from(map.values());
  }, [allTodayItems]);

  const formattedTodayLabel = useMemo(() => {
    try {
      const [y, m, d] = todayParts.dateStr.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return todayParts.dateStr;
    }
  }, [todayParts.dateStr]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header & Progress Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-emerald-50/70 via-white to-sky-50/60 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-sm sm:text-base font-extrabold text-slate-900">
                <ClipboardCheck className="w-5 h-5 text-emerald-700" />
                <span>Daftar Ceklist Kebersihan Area (MCP Hari Ini)</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                {formattedTodayLabel}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Area dipilih: <strong className="text-slate-900">{selectedAreaLabel}</strong> • Keterangan Status:{' '}
              <strong className="text-emerald-700">R = Realisasi</strong>,{' '}
              <strong className="text-rose-600">X = Belum Realisasi</strong>
            </p>
          </div>

          {totalAreaCount > 0 && (
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="px-3 py-1.5 rounded-xl bg-white border border-emerald-200 shadow-2xs text-xs font-extrabold text-emerald-900">
                {savedRealisasiCount}/{totalAreaCount} sudah direalisasi
              </div>
              <button
                type="button"
                onClick={handleSaveChecklist}
                disabled={pendingChanges.length === 0 || isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>
                  {isSaving
                    ? 'Menyimpan...'
                    : pendingChanges.length > 0
                    ? `Simpan Ceklist (${pendingChanges.length})`
                    : 'Simpan Ceklist'}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Visual Progress Bar */}
        {totalAreaCount > 0 && (
          <div className="space-y-1">
            <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-emerald-600 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
              <span>
                Progres area ini: <strong className="text-slate-800">{savedRealisasiCount}/{totalAreaCount} sudah direalisasi</strong> ({progressPct}%)
                {savedBelumRealisasiCount > 0 && (
                  <span className="ml-2 font-bold text-rose-600">
                    • {savedBelumRealisasiCount} belum realisasi (X)
                  </span>
                )}
              </span>
              {pendingChanges.length > 0 ? (
                <span className="font-bold text-amber-700">
                  {pendingChanges.length} pilihan status belum disimpan — klik &quot;Simpan Ceklist&quot; untuk menyimpan
                </span>
              ) : saveFeedback ? (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{saveFeedback}</span>
                </span>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Checklist Rows or Empty State */}
      {totalAreaCount === 0 ? (
        <div className="p-5 sm:p-6 text-center space-y-3 bg-slate-50/50">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 text-slate-500">
            <AlertCircle className="w-5 h-5" />
          </div>
          {allTodayItems.length === 0 ? (
            <div className="max-w-lg mx-auto space-y-1">
              <p className="text-xs sm:text-sm font-bold text-slate-800">
                Belum ada pekerjaan MCP yang terjadwal hari ini ({formattedTodayLabel})
              </p>
              <p className="text-xs text-slate-500">
                Pastikan Master Cleaning Program (MCP) untuk bulan dan tahun berjalan sudah diupload dan memiliki tanda jadwal pada tanggal {todayParts.tanggal}.
              </p>
            </div>
          ) : (
            <div className="max-w-xl mx-auto space-y-2.5">
              <p className="text-xs sm:text-sm font-bold text-slate-800">
                Tidak ada jadwal pekerjaan MCP hari ini untuk area &quot;{selectedAreaLabel}&quot;
              </p>
              <p className="text-xs text-slate-500">
                Pilih area berikut di dropdown Area Proyek untuk membuka daftar ceklist MCP hari ini:
              </p>
              {onSelectAreaValue && (
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                  {otherMcpAreas.map((area) => (
                    <button
                      key={area.targetAreaId}
                      type="button"
                      onClick={() => onSelectAreaValue(area.targetAreaId)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
                    >
                      {area.label} ({area.count})
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="px-3.5 py-2.5 w-10 text-center">No</th>
                <th className="px-3.5 py-2.5">Lokasi Kerja</th>
                <th className="px-3.5 py-2.5">Area Pekerjaan</th>
                <th className="px-3.5 py-2.5">Jenis Pekerjaan</th>
                <th className="px-3.5 py-2.5 text-center w-20">FRQ</th>
                <th className="px-3.5 py-2.5 text-center w-64">Status Ceklist (R / X)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {areaTodayItems.map((item, idx) => {
                const draftStatus = draftStatuses[item.itemKey];
                const savedRec = savedByItemKey.get(item.itemKey);
                const isDirty = isValidMcpStatus(draftStatus) && (!savedRec || savedRec.status !== draftStatus);

                return (
                  <tr
                    key={item.itemKey}
                    className={`transition-colors ${
                      isDirty
                        ? 'bg-amber-50/40'
                        : savedRec
                        ? 'bg-emerald-50/20'
                        : 'bg-white hover:bg-slate-50/70'
                    }`}
                  >
                    <td className="px-3.5 py-3 text-center font-semibold text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="px-3.5 py-3 font-bold text-slate-900">
                      {item.lokasi_kerja}
                    </td>
                    <td className="px-3.5 py-3 font-semibold text-slate-800">
                      {item.area_pekerjaan || '-'}
                    </td>
                    <td className="px-3.5 py-3 text-slate-700">
                      {item.jenis_pekerjaan || '-'}
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      <span
                        className={`inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-md text-[11px] font-extrabold border ${
                          item.frq === 'D'
                            ? 'bg-sky-50 text-sky-800 border-sky-200'
                            : item.frq === 'W'
                            ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                            : item.frq === 'M'
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {item.frq || '-'}
                      </span>
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="inline-flex items-center gap-1.5" role="radiogroup" aria-label={`Status ${item.area_pekerjaan} ${item.jenis_pekerjaan}`}>
                          {STATUS_OPTIONS.map((opt) => {
                            const isActive = draftStatus === opt.code;
                            return (
                              <button
                                key={opt.code}
                                type="button"
                                role="radio"
                                aria-checked={isActive}
                                title={`${opt.code} = ${opt.label}`}
                                onClick={() => handleSelectStatus(item.itemKey, opt.code)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border transition-all cursor-pointer flex items-center gap-1 ${
                                  isActive ? opt.activeClass : opt.idleClass
                                }`}
                              >
                                <span>{opt.code}</span>
                                <span className="hidden sm:inline text-[10px] font-semibold opacity-90">
                                  ({opt.label})
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        {savedRec && !isDirty && (
                          <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                              <UserCheck className="w-3 h-3" />
                              {savedRec.checkedBy}
                            </span>
                            <span className="inline-flex items-center gap-0.5">
                              <Clock className="w-3 h-3" />
                              {formatSavedTime(savedRec.checkedAt)}
                            </span>
                          </div>
                        )}
                        {isDirty && (
                          <span className="text-[10px] font-bold text-amber-700">
                            Belum disimpan
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
