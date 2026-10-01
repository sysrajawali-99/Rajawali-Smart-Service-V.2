import React, { useState } from 'react';
import { X, Database, CheckCircle2, AlertCircle, RefreshCw, Copy, Check, Radio, Server } from 'lucide-react';
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
                <h3 className="font-bold text-slate-800 text-base">Backend VPS &amp; Realtime PostgreSQL</h3>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isConnected
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  {isConnected ? 'Realtime Socket.IO Connected' : 'Menghubungkan ke Server...'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Sinkronisasi data PostgreSQL (tabel records) &amp; update real-time multi-perangkat via Socket.IO
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
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
                      ? 'Terhubung ke Backend VPS & Realtime Socket.IO'
                      : 'Menghubungkan ke Backend VPS...'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Status Socket: <code className="bg-white px-1.5 py-0.5 rounded font-mono text-slate-700 border border-slate-200">{supabaseStatus.status}</code>
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
                Seluruh data tugas, komplain, laporan kerusakan, dan pekerjaan khusus berhasil disinkronkan ke PostgreSQL!
              </div>
            )}
          </div>

          {/* Arsitektur Backend VPS */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-sky-600" />
              Arsitektur Data Mandiri di VPS
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] mb-2">1</div>
                  <h5 className="font-bold text-slate-800 mb-1">Database PostgreSQL</h5>
                  <p className="text-[11px] text-slate-500">
                    Data disimpan satu baris per item pada tabel <code className="bg-white px-1 py-0.5 rounded text-slate-700 font-mono">records</code> (collection, id, data JSONB) mencegah race condition.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-[10px] mb-2">2</div>
                  <h5 className="font-bold text-slate-800 mb-1">REST API &amp; Uploads</h5>
                  <p className="text-[11px] text-slate-500">
                    Endpoint REST di Express mengelola CRUD data, dan foto diunggah ke folder <code className="bg-white px-1 py-0.5 rounded text-slate-700 font-mono">uploads/</code> tanpa base64.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] mb-2">3</div>
                  <h5 className="font-bold text-slate-800 mb-1">Realtime Socket.IO</h5>
                  <p className="text-[11px] text-slate-500">
                    Setiap simpan/ubah/hapus disiarkan langsung ke semua perangkat yang sedang membuka aplikasi tanpa perlu refresh halaman.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Konfigurasi Environment Variables di VPS */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-slate-600" />
              Variabel Environment di VPS (.env)
            </h4>
            <div className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-[11px] space-y-2">
              <div className="flex items-center justify-between">
                <span>DATABASE_URL=postgresql://user:password@localhost:5432/cleaning_db</span>
                <button
                  onClick={() => copyToClipboard('DATABASE_URL=postgresql://user:password@localhost:5432/cleaning_db', 'db')}
                  className="text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 transition-colors cursor-pointer"
                >
                  {copiedKey === 'db' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="flex items-center justify-between border-t border-slate-800 pt-2">
                <span>PORT=3000</span>
                <button
                  onClick={() => copyToClipboard('PORT=3000', 'port')}
                  className="text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 transition-colors cursor-pointer"
                >
                  {copiedKey === 'port' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
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
