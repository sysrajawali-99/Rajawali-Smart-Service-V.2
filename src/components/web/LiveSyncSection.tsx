import React, { useState } from 'react';
import {
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Server,
  ShieldCheck,
  Building2,
  Users,
  MapPin,
  ClipboardList,
  AlertTriangle,
  Terminal,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';

export const LiveSyncSection: React.FC = () => {
  const { syncFromLiveVps, activeProject, areas, cleaners, tasks, complaints, shifts } = useCleaning();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    success?: boolean;
    message?: string;
    summary?: Record<string, number>;
  } | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const res = await syncFromLiveVps();
      setSyncStatus(res);
    } catch (err: any) {
      setSyncStatus({
        success: false,
        message: err?.message || 'Terjadi kesalahan saat menyinkronkan data live',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-sky-900 via-slate-900 to-indigo-950 text-white relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-semibold">
              <Server className="w-3.5 h-3.5" />
              <span>Metode 1: Sinkronisasi Data Real-Time VPS</span>
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Tarik Data Operasional Live dari VPS</span>
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Mengambil snapshot data operasional real-time dari server produksi{' '}
              <a
                href="https://jtismart.rtisystem.my.id"
                target="_blank"
                rel="noreferrer"
                className="underline font-mono text-sky-300 hover:text-sky-200"
              >
                https://jtismart.rtisystem.my.id
              </a>{' '}
              ke lingkungan pengujian lokal. Anda dapat menguji seluruh alur kerja dengan data lapangan asli tanpa risiko merusak basis data produksi.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <button
              type="button"
              onClick={handleSync}
              disabled={isSyncing}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-400 active:scale-[0.98] text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-sky-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Menyinkronkan Data...' : 'Tarik Data Live Sekarang'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncStatus && (
        <div
          className={`p-4 border-b flex items-start gap-3 text-xs ${
            syncStatus.success
              ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
              : 'bg-rose-50/90 border-rose-200 text-rose-900'
          }`}
        >
          {syncStatus.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 space-y-1">
            <div className="font-bold">{syncStatus.message}</div>
            {syncStatus.summary && (
              <div className="text-[11px] text-emerald-800 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono">
                <div>Proyek: <strong>{syncStatus.summary.projects ?? 0}</strong></div>
                <div>Area: <strong>{syncStatus.summary.areas ?? 0}</strong></div>
                <div>Petugas: <strong>{syncStatus.summary.cleaners ?? 0}</strong></div>
                <div>Shift: <strong>{syncStatus.summary.shifts ?? 0}</strong></div>
                <div>Jadwal: <strong>{syncStatus.summary.schedules ?? 0}</strong></div>
                <div>Tugas: <strong>{syncStatus.summary.tasks ?? 0}</strong></div>
                <div>Komplain: <strong>{syncStatus.summary.complaints ?? 0}</strong></div>
                <div>Ceklist: <strong>{syncStatus.summary.daily_checklists ?? 0}</strong></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Body Content */}
      <div className="p-5 sm:p-6 space-y-6">
        {/* Current Active Data Metrics */}
        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-sky-600" />
            <span>Data Operasional Aktif di Lingkungan Ini</span>
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] text-slate-500 block font-medium">Proyek Aktif</span>
              <span className="text-sm font-bold text-slate-900 truncate block mt-0.5" title={activeProject?.name}>
                {activeProject?.name || 'Belum dipilih'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono block">{activeProject?.code || '-'}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] text-slate-500 block font-medium">Total Area</span>
              <span className="text-base font-bold text-slate-900 block mt-0.5">{areas.length}</span>
              <span className="text-[10px] text-slate-400 block">Titik kerja</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] text-slate-500 block font-medium">Petugas Lapangan</span>
              <span className="text-base font-bold text-slate-900 block mt-0.5">{cleaners.length}</span>
              <span className="text-[10px] text-slate-400 block">Personil</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] text-slate-500 block font-medium">Shift Aktif</span>
              <span className="text-base font-bold text-slate-900 block mt-0.5">{shifts.length}</span>
              <span className="text-[10px] text-slate-400 block">Pola giliran</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] text-slate-500 block font-medium">Tugas Ceklis</span>
              <span className="text-base font-bold text-slate-900 block mt-0.5">{tasks.length}</span>
              <span className="text-[10px] text-slate-400 block">Task aktif</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] text-slate-500 block font-medium">Komplain Klien</span>
              <span className="text-base font-bold text-slate-900 block mt-0.5">{complaints.length}</span>
              <span className="text-[10px] text-slate-400 block">Tiket tercatat</span>
            </div>
          </div>
        </div>

        {/* Feature Explanations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-200/60 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h5 className="text-xs font-bold text-sky-950">Isolasi Keamanan Data VPS</h5>
              <p className="text-[11px] text-sky-800 leading-relaxed">
                Tindakan uji coba seperti edit parameter, pembuatan ceklist uji, penghapusan dummy, atau penyelesaian simulasi komplain hanya mengubah salinan data uji lokal, sehingga database produksi di VPS tetap aman dan tidak terganggu.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
            <Terminal className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h5 className="text-xs font-bold text-slate-900">Perintah Terminal CLI</h5>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Selain melalui tombol di atas, Anda juga dapat menjalankan sinkronisasi kapan saja melalui terminal dengan perintah:
              </p>
              <code className="inline-block px-2 py-1 rounded-md bg-slate-900 text-sky-300 font-mono text-[11px]">
                npm run sync:live
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
