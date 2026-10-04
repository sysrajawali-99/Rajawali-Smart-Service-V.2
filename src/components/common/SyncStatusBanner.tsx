import React, { useState, useEffect } from 'react';
import {
  WifiOff,
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Trash2,
  X,
  ExternalLink,
} from 'lucide-react';
import {
  syncService,
  type SyncStatusInfo,
} from '../../services/syncService';
import {
  retryRejectedOutboxItems,
  discardOutboxItem,
} from '../../services/offlineDb';

export const SyncStatusBanner: React.FC = () => {
  const [status, setStatus] = useState<SyncStatusInfo>({
    state: 'synced',
    isOnline: true,
    pendingCount: 0,
    syncingCount: 0,
    rejectedCount: 0,
    rejectedItems: [],
    lastSyncedAt: null,
  });

  const [showRejectedModal, setShowRejectedModal] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    const unsubscribe = syncService.subscribe((newStatus) => {
      setStatus(newStatus);
    });
    return () => unsubscribe();
  }, []);

  const handleRetryAll = async () => {
    setIsRetrying(true);
    try {
      await retryRejectedOutboxItems();
      await syncService.triggerSync();
      setShowRejectedModal(false);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDiscard = async (id: string) => {
    await discardOutboxItem(id);
    await syncService.getStatus().then((s) => setStatus(s));
  };

  // Only render banner if there is notable state (offline, pending, syncing, or rejected)
  // When completely synced and online, display minimal compact pill or auto-fade
  return (
    <>
      <div className="w-full bg-slate-900 border-b border-slate-800 text-xs px-3 py-1.5 flex items-center justify-between gap-2 select-none">
        <div className="flex items-center gap-2 overflow-hidden">
          {/* Status Indicator Badges */}
          {!status.isOnline ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30 shrink-0">
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              Offline
            </span>
          ) : status.state === 'syncing' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/30 shrink-0">
              <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin" />
              Mengirim data...
            </span>
          ) : status.rejectedCount > 0 ? (
            <button
              type="button"
              onClick={() => setShowRejectedModal(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30 hover:bg-rose-500/30 transition-colors cursor-pointer shrink-0"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              {status.rejectedCount} item ditolak - perlu ditinjau
            </button>
          ) : status.pendingCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30 shrink-0">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              {status.pendingCount} item menunggu dikirim
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium text-[11px] shrink-0">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Semua tersinkron
            </span>
          )}

          {/* Contextual Subtitle */}
          <span className="text-[11px] text-slate-400 truncate hidden sm:inline">
            {!status.isOnline
              ? 'Pengisian ceklist tetap aktif & tersimpan di perangkat'
              : status.state === 'syncing'
              ? 'Menghubungkan ke server basis data...'
              : status.pendingCount > 0
              ? 'Akan dikirim otomatis saat koneksi stabil'
              : 'Data sinkron dengan server'}
          </span>
        </div>

        {/* Right Action Button */}
        <div className="flex items-center gap-2 shrink-0">
          {status.isOnline && (status.pendingCount > 0 || status.state === 'pending') && (
            <button
              type="button"
              onClick={() => syncService.triggerSync()}
              className="px-2.5 py-0.5 bg-sky-600 hover:bg-sky-500 text-white rounded-md text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Sinkron Sekarang
            </button>
          )}

          {status.rejectedCount > 0 && (
            <button
              type="button"
              onClick={() => setShowRejectedModal(true)}
              className="px-2.5 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded-md text-[11px] font-medium transition-colors cursor-pointer"
            >
              Tinjau ({status.rejectedCount})
            </button>
          )}
        </div>
      </div>

      {/* Modal Tinjau Item Ditolak */}
      {showRejectedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                Item Pengisian Ditolak Server
              </div>
              <button
                type="button"
                onClick={() => setShowRejectedModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs text-slate-700">
              <p className="text-slate-500 leading-relaxed">
                Beberapa entri ceklist yang direkam saat offline ditolak oleh server karena validasi hak akses proyek atau format data. Anda dapat meninjau alasan penolakan dan mengirim ulang.
              </p>

              {status.rejectedItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-800">
                        {item.locationName || 'Lokasi Area Ceklist'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Waktu Rekam: {new Date(item.captured_at).toLocaleString('id-ID')}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-700 font-bold rounded text-[10px] uppercase">
                      Ditolak
                    </span>
                  </div>

                  <div className="p-2 bg-rose-50 rounded-lg border border-rose-200 text-rose-700 text-[11px]">
                    <strong>Alasan:</strong> {item.rejectionReason || 'Gagal divalidasi server'}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleDiscard(item.id)}
                      className="px-2.5 py-1 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Buang
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowRejectedModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handleRetryAll}
                disabled={isRetrying}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                {isRetrying ? 'Mencoba Kirim...' : 'Kirim Ulang Semua'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
