import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  BellOff,
  CheckCircle2,
  AlertTriangle,
  Send,
  Smartphone,
  Shield,
  Clock,
  Sparkles,
  Info,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  checkPushSupport,
  subscribeToWebPush,
  unsubscribeFromWebPush,
  triggerTestPushNotification,
  type PushStatus,
} from '../../services/pushNotificationService';
import { useCleaning } from '../../context/CleaningContext';
import { getAuthHeaders } from '../../services/apiService';

export const NotificationSettingsSection: React.FC = () => {
  const { currentUser, activeProject } = useCleaning();

  const [pushStatus, setPushStatus] = useState<PushStatus>({
    isSupported: false,
    permission: 'default',
    isSubscribed: false,
    isIOSWithoutPWA: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [preferences, setPreferences] = useState({
    reminder15Min: true,
    alertLate: true,
    alertMissed: true,
  });
  const [isSavingPref, setIsSavingPref] = useState(false);

  const refreshStatus = async () => {
    const s = await checkPushSupport();
    setPushStatus(s);
  };

  useEffect(() => {
    refreshStatus();

    // Fetch user preferences
    fetch('/api/push/preferences', {
      headers: getAuthHeaders(),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setPreferences({
            reminder15Min: data.reminder15Min !== false,
            alertLate: data.alertLate !== false,
            alertMissed: data.alertMissed !== false,
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleToggleSubscribe = async () => {
    setIsLoading(true);
    setTestResult(null);

    try {
      if (pushStatus.isSubscribed) {
        await unsubscribeFromWebPush();
      } else {
        const res = await subscribeToWebPush({
          userId: currentUser?.id,
          projectId: activeProject?.id,
        });

        if (!res.success) {
          setTestResult({
            success: false,
            message: res.error || 'Gagal mengaktifkan notifikasi push.',
          });
        }
      }
      await refreshStatus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendTestNotification = async () => {
    setIsLoading(true);
    setTestResult(null);

    try {
      const res = await triggerTestPushNotification();
      if (res.success) {
        setTestResult({
          success: true,
          message: 'Notifikasi uji berhasil dikirim ke perangkat Anda! Periksa bilah notifikasi sistem.',
        });
      } else {
        setTestResult({
          success: false,
          message: res.error || 'Gagal mengirim notifikasi uji.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePref = async (key: 'reminder15Min' | 'alertLate' | 'alertMissed') => {
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    setIsSavingPref(true);

    try {
      await fetch('/api/push/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(next),
      });
    } finally {
      setIsSavingPref(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 bg-gradient-to-r from-sky-900 via-sky-800 to-slate-900 rounded-2xl border border-sky-700/60 text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center shrink-0">
            <BellRing className="w-6 h-6 text-sky-300" />
          </div>
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              Pengaturan Notifikasi Web Push
              {pushStatus.isSubscribed ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Aktif di Perangkat Ini
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-semibold border border-amber-500/30 flex items-center gap-1">
                  <BellOff className="w-3 h-3 text-amber-400" />
                  Belum Aktif
                </span>
              )}
            </h3>
            <p className="text-xs text-sky-200 mt-0.5">
              Notifikasi otomatis 15 menit sebelum jam mulai, peringatan terlambat, dan tugas terlewat.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleToggleSubscribe}
            disabled={isLoading}
            className={`flex-1 sm:flex-none px-4 py-2 text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 ${
              pushStatus.isSubscribed
                ? 'bg-slate-700 hover:bg-rose-700 text-white'
                : 'bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white'
            }`}
          >
            {isLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : pushStatus.isSubscribed ? (
              <BellOff className="w-3.5 h-3.5" />
            ) : (
              <Bell className="w-3.5 h-3.5" />
            )}
            {pushStatus.isSubscribed ? 'Nonaktifkan di Perangkat' : 'Aktifkan Notifikasi'}
          </button>

          {pushStatus.isSubscribed && (
            <button
              type="button"
              onClick={handleSendTestNotification}
              disabled={isLoading}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs font-semibold rounded-xl border border-white/20 shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
              title="Kirim notifikasi uji coba"
            >
              <Send className="w-3.5 h-3.5 text-amber-300" />
              Kirim Notifikasi Uji
            </button>
          )}
        </div>
      </div>

      {/* Test Result Message */}
      {testResult && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in ${
            testResult.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <p className="leading-relaxed">{testResult.message}</p>
        </div>
      )}

      {/* Special Instruction for iPhone / Safari */}
      {pushStatus.isIOSWithoutPWA && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs space-y-2">
          <p className="font-bold flex items-center gap-1.5 text-amber-950">
            <Smartphone className="w-4 h-4 text-amber-600" />
            Petunjuk Khusus Pengguna iPhone & iPad:
          </p>
          <p className="leading-relaxed text-amber-800">
            Apple mewajibkan aplikasi web dipasang terlebih dahulu ke <strong>Layar Utama (Add to Home Screen)</strong> sebelum izin Web Push Notifications dapat diaktifkan.
          </p>
          <ol className="list-decimal list-inside space-y-1 text-amber-800 pl-1">
            <li>Tekan tombol <strong>Bagikan</strong> (ikon kotak dengan panah ke atas) di peramban Safari.</li>
            <li>Pilih <strong>"Tambahkan ke Layar Utama"</strong>.</li>
            <li>Buka ikon <strong>JTI Smart</strong> dari layar utama ponsel Anda, lalu kembali ke halaman ini untuk menyalakan notifikasi.</li>
          </ol>
        </div>
      )}

      {/* Permission Denied Notice */}
      {pushStatus.permission === 'denied' && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 text-xs space-y-1.5">
          <p className="font-bold flex items-center gap-1.5 text-rose-950">
            <BellOff className="w-4 h-4 text-rose-600" />
            Izin Notifikasi Ditolak di Peramban:
          </p>
          <p className="text-rose-800 leading-relaxed">
            Peramban Anda saat ini memblokir notifikasi untuk situs ini. Untuk menyalakannya kembali:
          </p>
          <p className="text-rose-800">
            Klik ikon gembok / perizinan situs di bilah alamat peramban Anda, cari <strong>"Notifikasi"</strong>, dan ubah nilainya menjadi <strong>"Izinkan" (Allow)</strong>, kemudian muat ulang halaman.
          </p>
        </div>
      )}

      {/* Notification Categories Configuration */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-600" />
            Preferensi Pemicu Notifikasi Tugas (Per User)
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Tentukan jenis peringatan otomatis yang ingin Anda terima di perangkat ponsel atau komputer Anda.
          </p>
        </div>

        <div className="space-y-3">
          {/* 1. Pengingat 15 Menit */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <span>Pengingat Tugas Ceklist (15 Menit Sebelum Jam Mulai)</span>
                <span className="px-2 py-0.2 rounded-full bg-sky-100 text-sky-700 text-[10px] font-semibold">
                  Petugas
                </span>
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Peringatan dini yang dikirim 15 menit sebelum waktu jadwal ceklist area dimulai, agar petugas dapat bersiap.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={preferences.reminder15Min}
                onChange={() => handleTogglePref('reminder15Min')}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
            </label>
          </div>

          {/* 2. Peringatan Terlambat */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <span>Peringatan Terlambat (Lewat Jam Mulai Belum Dikerjakan)</span>
                <span className="px-2 py-0.2 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold">
                  Petugas & Supervisor
                </span>
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Peringatan otomatis yang dikirim ke petugas pelaksana dan supervisor proyek saat tugas belum dikerjakan melewati jam mulai.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={preferences.alertLate}
                onChange={() => handleTogglePref('alertLate')}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
            </label>
          </div>

          {/* 3. Peringatan Terlewat / Missed */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <span>Peringatan Terlewat / Missed (Lewat Jam Selesai Tanpa Penyelesaian)</span>
                <span className="px-2 py-0.2 rounded-full bg-rose-100 text-rose-700 text-[10px] font-semibold">
                  Supervisor & Manager
                </span>
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Mengubah status tugas menjadi 'missed' (terlewat) dan mengabari supervisor serta manajer proyek agar segera dilakukan eskalasi.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={preferences.alertMissed}
                onChange={() => handleTogglePref('alertMissed')}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Technical Standards Card */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 text-xs text-slate-600 space-y-3">
        <h4 className="font-bold text-slate-800 flex items-center gap-2">
          <Shield className="w-4 h-4 text-sky-600" />
          Standar Teknis & Keamanan Web Push (VAPID)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
          <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
            <p className="font-semibold text-slate-800">Zona Waktu & Shift</p>
            <p className="text-slate-500 leading-relaxed">
              Waktu operasional dikalkulasi berdasarkan zona waktu resmi <strong>Asia/Jakarta (WIB)</strong>. Shift malam yang melewati tengah malam (misal 22.00 - 06.00) diperlakukan utuh sebagai satu siklus tugas berlanjut.
            </p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
            <p className="font-semibold text-slate-800">Keamanan Akses & Anti-Spam</p>
            <p className="text-slate-500 leading-relaxed">
              Notifikasi hanya dikirimkan kepada pengguna yang berwenang pada <code>project_id</code> terkait. Setiap kategori peringatan hanya dikirim <strong>SATU KALI per tugas</strong> untuk mencegah banjir notifikasi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
