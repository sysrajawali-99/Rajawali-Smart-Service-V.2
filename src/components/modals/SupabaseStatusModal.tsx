import React, { useState } from 'react';
import { X, Database, CheckCircle2, AlertCircle, RefreshCw, Copy, Check, Radio, ExternalLink } from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';

interface SupabaseStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseStatusModal: React.FC<SupabaseStatusModalProps> = ({ isOpen, onClose }) => {
  const { supabaseStatus, syncToSupabase } = useCleaning();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncSuccess(false);
    try {
      await syncToSupabase();
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const isConnected = supabaseStatus.isConfigured && (supabaseStatus.status === 'CONNECTED' || supabaseStatus.status === 'SUBSCRIBED');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-base">Supabase Realtime &amp; Deployment</h3>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isConnected
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  {isConnected ? 'Realtime Connected' : 'Mode Lokal (Browser)'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Sinkronisasi database PostgreSQL &amp; otomasi update via GitHub + Vercel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-600">
          {/* Status Card */}
          <div className={`p-4 rounded-xl border ${
            isConnected
              ? 'bg-emerald-50/50 border-emerald-200'
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Status Koneksi Saat Ini</span>
                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                  )}
                  <span className="text-sm font-semibold text-slate-800">
                    {isConnected
                      ? 'Terhubung ke Database Supabase'
                      : 'Berjalan dalam Local Storage (Siap Disambungkan)'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Status Channel: <code className="bg-white px-1.5 py-0.5 rounded font-mono text-slate-700 border border-slate-200">{supabaseStatus.status}</code>
                  {supabaseStatus.lastSyncedAt && ` • Terakhir sinkron: ${supabaseStatus.lastSyncedAt}`}
                </p>
              </div>

              {supabaseStatus.isConfigured && (
                <button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-medium text-xs shadow-2xs transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
                </button>
              )}
            </div>

            {syncSuccess && (
              <div className="mt-2.5 p-2 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg text-[11px] flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 shrink-0" />
                Seluruh data tugas, komplain, dan pekerjaan berhasil disinkronkan ke Supabase!
              </div>
            )}
          </div>

          {/* Panduan Alur CI/CD Otomatis: GitHub -> Vercel -> Supabase */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-sky-600" />
              Alur Realtime Otomatis: GitHub ➔ Vercel ➔ Supabase
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] mb-2">1</div>
                  <h5 className="font-bold text-slate-800 mb-1">Update di GitHub</h5>
                  <p className="text-[11px] text-slate-500">
                    Setiap kali Anda melakukan <code className="bg-white px-1 py-0.5 rounded text-slate-700">git push</code> ke repository GitHub, webhook Vercel langsung mendeteksi perubahan.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-[10px] mb-2">2</div>
                  <h5 className="font-bold text-slate-800 mb-1">Auto-Deploy di Vercel</h5>
                  <p className="text-[11px] text-slate-500">
                    Vercel secara otomatis membangun dan menyebarkan versi web terbaru dalam hitungan detik tanpa downtime.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] mb-2">3</div>
                  <h5 className="font-bold text-slate-800 mb-1">Supabase Realtime</h5>
                  <p className="text-[11px] text-slate-500">
                    Semua tester dan user yang membuka aplikasi langsung melihat data real-time via WebSocket tanpa refresh halaman.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Konfigurasi Environment Variables untuk Vercel */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-800 text-xs">Variabel Environment di Vercel (Project Settings ➔ Environment Variables)</h4>
            <div className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-[11px] space-y-2">
              <div className="flex items-center justify-between">
                <span>VITE_SUPABASE_URL=https://[YOUR-PROJECT].supabase.co</span>
                <button
                  onClick={() => copyToClipboard('VITE_SUPABASE_URL=https://your-project.supabase.co', 'url')}
                  className="text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 transition-colors"
                >
                  {copiedKey === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="flex items-center justify-between border-t border-slate-800 pt-2">
                <span>VITE_SUPABASE_ANON_KEY=[YOUR-ANON-PUBLIC-KEY]</span>
                <button
                  onClick={() => copyToClipboard('VITE_SUPABASE_ANON_KEY=your-anon-key', 'key')}
                  className="text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 transition-colors"
                >
                  {copiedKey === 'key' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Lokasi Schema SQL */}
          <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sky-900 text-xs">Skrip Database Supabase Siap Pakai</span>
              <span className="text-[10px] bg-sky-200 text-sky-800 px-2 py-0.5 rounded-full font-bold">Tersedia di file</span>
            </div>
            <p className="text-[11px] text-sky-800">
              Skrip tabel lengkap beserta policy RLS dan Realtime telah disiapkan pada file <code className="bg-white/80 px-1 py-0.5 rounded text-sky-950 font-bold font-mono">supabase/schema.sql</code>. Anda cukup membuka Supabase Dashboard ➔ <strong>SQL Editor</strong> ➔ Tempel &amp; klik <strong>Run</strong>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-end bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
