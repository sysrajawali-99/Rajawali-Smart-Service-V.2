import React, { useState } from 'react';
import {
  Trash2,
  AlertTriangle,
  ShieldAlert,
  Lock,
  CheckCircle2,
  Building2,
  Layers,
  ClipboardList,
  Calendar,
  Activity,
  Award,
  Wrench,
  MessageSquareWarning,
  Users,
  Clock,
  Bell,
  X,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';

interface SubmenuDeleteOption {
  key: string;
  title: string;
  description: string;
  category: 'Ceklist & Area' | 'Aktivitas & Program' | 'Inspeksi & Fasilitas' | 'Personil & Jadwal' | 'Pembersihan Total';
  icon: React.ComponentType<{ className?: string }>;
  isDangerous?: boolean;
}

export const SuperAdminBulkDeleteSection: React.FC = () => {
  const {
    userRole,
    activeProject,
    bulkDeleteSubmenuData,
    dailyChecklists,
    areas,
    tasks,
    masterPrograms,
    inspections,
    damageReports,
    complaints,
    cleaners,
    shifts,
    schedules,
    notifications,
  } = useCleaning();

  const [scope, setScope] = useState<'active_project' | 'all'>('active_project');
  const [selectedSubmenu, setSelectedSubmenu] = useState<SubmenuDeleteOption | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [actionResult, setActionResult] = useState<{ count: number; label: string } | null>(null);

  const submenus: SubmenuDeleteOption[] = [
    {
      key: 'ceklist',
      title: 'Ceklist Area (24 Jam)',
      description: 'Menghapus seluruh rekaman lembar ceklist kebersihan harian beserta slot jam dan log checklist.',
      category: 'Ceklist & Area',
      icon: ClipboardList,
    },
    {
      key: 'area',
      title: 'Master Lokasi & Area Ceklist',
      description: 'Menghapus seluruh daftar titik lokasi (toilet, koridor, lift, pantry) pada area kebersihan.',
      category: 'Ceklist & Area',
      icon: Layers,
    },
    {
      key: 'master-program',
      title: 'Master Cleaning Program (MCP)',
      description: 'Menghapus seluruh jadwal program kerja periodik bulanan (1-31 hari) dan matriks frekuensi.',
      category: 'Aktivitas & Program',
      icon: Calendar,
    },
    {
      key: 'activity',
      title: 'Cleaning Activity & Riwayat Tugas',
      description: 'Menghapus seluruh daftar tugas operasional, status pengerjaan, dan foto sebelum/sesudah.',
      category: 'Aktivitas & Program',
      icon: Activity,
    },
    {
      key: 'daily-activity',
      title: 'Riwayat Tugas Harian Selesai',
      description: 'Menghapus arsip tugas yang telah selesai dikerjakan pada laporan Daily Activity.',
      category: 'Aktivitas & Program',
      icon: Activity,
    },
    {
      key: 'monthly-activity',
      title: 'Arsip Laporan Bulanan (Exported)',
      description: 'Mereset tanda ekspor pekerjaan laporan bulanan agar dapat dikelompokkan kembali.',
      category: 'Aktivitas & Program',
      icon: Calendar,
    },
    {
      key: 'inspeksi',
      title: 'Inspeksi & QC Control',
      description: 'Menghapus seluruh hasil audit pemeriksaan mutu kebersihan dan kartu skor inspeksi.',
      category: 'Inspeksi & Fasilitas',
      icon: Award,
    },
    {
      key: 'kerusakan',
      title: 'Laporan Kerusakan Fasilitas',
      description: 'Menghapus seluruh tiket pengaduan kerusakan sarana gedung dan bukti foto kerusakan.',
      category: 'Inspeksi & Fasilitas',
      icon: Wrench,
    },
    {
      key: 'complaint',
      title: 'Laporan Komplain & Tiket',
      description: 'Menghapus tiket keluhan kebersihan dari klien, permohonan perpanjangan waktu, dan eskalasi.',
      category: 'Inspeksi & Fasilitas',
      icon: MessageSquareWarning,
    },
    {
      key: 'petugas_presensi',
      title: 'Riwayat Presensi Petugas (1-31)',
      description: 'Mereset rekaman kehadiran harian petugas (H, S, I, A, C) untuk periode bulan berjalan.',
      category: 'Personil & Jadwal',
      icon: Clock,
    },
    {
      key: 'petugas',
      title: 'Data Petugas Lapangan',
      description: 'Menghapus master data personil cleaner dan profil karyawan yang terdaftar.',
      category: 'Personil & Jadwal',
      icon: Users,
    },
    {
      key: 'shift',
      title: 'Shift & Plotingan Kerja',
      description: 'Menghapus master daftar shift kerja operasional (Shift 1, 2, 3, Middle, dll).',
      category: 'Personil & Jadwal',
      icon: Clock,
    },
    {
      key: 'jadwal',
      title: 'Jadwal Kerja Petugas',
      description: 'Menghapus matriks penjadwalan personil harian per area kerja.',
      category: 'Personil & Jadwal',
      icon: Calendar,
    },
    {
      key: 'notifikasi',
      title: 'Notifikasi & Riwayat Audit',
      description: 'Mengosongkan seluruh lonceng pemberitahuan peringatan dan log aktivitas sistem.',
      category: 'Personil & Jadwal',
      icon: Bell,
    },
    {
      key: 'all_operational',
      title: '⚠️ Bersihkan Seluruh Data Operasional',
      description: 'Menghapus sekaligus seluruh data ceklist, tugas, MCP, inspeksi, komplain, dan kerusakan.',
      category: 'Pembersihan Total',
      icon: AlertTriangle,
      isDangerous: true,
    },
  ];

  // Helper to get estimated item count for display
  const getItemCount = (key: string): number => {
    const projId = activeProject?.id || 'proj-1';
    switch (key) {
      case 'ceklist':
        return scope === 'active_project'
          ? dailyChecklists.filter((d) => d.projectId === projId).length
          : dailyChecklists.length;
      case 'area':
        return scope === 'active_project'
          ? areas.filter((a) => !a.projectId || a.projectId === projId).length
          : areas.length;
      case 'master-program':
        return scope === 'active_project'
          ? masterPrograms.filter((m) => m.projectId === projId).length
          : masterPrograms.length;
      case 'activity':
        return scope === 'active_project'
          ? tasks.filter((t) => !t.projectId || t.projectId === projId).length
          : tasks.length;
      case 'daily-activity':
        return scope === 'active_project'
          ? tasks.filter((t) => (!t.projectId || t.projectId === projId) && t.status === 'completed').length
          : tasks.filter((t) => t.status === 'completed').length;
      case 'monthly-activity':
        return tasks.filter((t) => t.exportedToMonthlyReport).length;
      case 'inspeksi':
        return scope === 'active_project'
          ? inspections.filter((i) => !i.projectId || i.projectId === projId).length
          : inspections.length;
      case 'kerusakan':
        return scope === 'active_project'
          ? damageReports.filter((d) => !d.projectId || d.projectId === projId).length
          : damageReports.length;
      case 'complaint':
        return scope === 'active_project'
          ? complaints.filter((c) => !c.projectId || c.projectId === projId).length
          : complaints.length;
      case 'petugas_presensi':
        return cleaners.length;
      case 'petugas':
        return scope === 'active_project'
          ? cleaners.filter((c) => !c.projectId || c.projectId === projId).length
          : cleaners.length;
      case 'shift':
        return shifts.length;
      case 'jadwal':
        return scope === 'active_project'
          ? schedules.filter((s) => !s.projectId || s.projectId === projId).length
          : schedules.length;
      case 'notifikasi':
        return notifications.length;
      case 'all_operational':
        return (
          getItemCount('ceklist') +
          getItemCount('area') +
          getItemCount('master-program') +
          getItemCount('activity') +
          getItemCount('inspeksi') +
          getItemCount('kerusakan') +
          getItemCount('complaint')
        );
      default:
        return 0;
    }
  };

  const handleExecuteDelete = () => {
    if (!selectedSubmenu) return;

    const result = bulkDeleteSubmenuData(selectedSubmenu.key, scope);
    setActionResult(result);
    setSelectedSubmenu(null);
    setConfirmText('');

    setTimeout(() => {
      setActionResult(null);
    }, 6000);
  };

  // If user is not Super Admin, show restricted card
  if (userRole !== 'admin') {
    return (
      <div
        id="section-bulk-delete-restricted"
        className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs space-y-4"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center font-bold shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              Hapus Data Masal per Sub-Menu (Khusus Super Admin)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Fitur penghapusan data masal per sub-menu diproteksi khusus untuk akun dengan wewenang{' '}
              <span className="font-semibold text-indigo-700">Super Admin</span>. Peran Anda saat ini adalah{' '}
              <span className="font-semibold text-slate-700 uppercase">[{userRole}]</span> sehingga fitur ini tidak dapat
              diakses untuk menjaga keamanan dan integritas audit operasional.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      id="section-bulk-delete-superadmin"
      className="p-5 sm:p-6 rounded-2xl bg-white border border-rose-200 shadow-xs space-y-5"
    >
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-rose-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Hapus Data Masal per Sub-Menu (Khusus Super Admin)
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-rose-600" />
                Super Admin Only
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
              Fasilitas pembersihan data masal terkelola per modul. Memudahkan pengosongan riwayat ceklist, reset jadwal,
              ataupun penghapusan data pengujian sebelum serah terima resmi (Handover) proyek baru.
            </p>
          </div>
        </div>

        {/* Scope Selector */}
        <div className="flex items-center gap-2 shrink-0 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 font-semibold px-2 hidden sm:inline">Cakupan Data:</span>
          <button
            type="button"
            onClick={() => setScope('active_project')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              scope === 'active_project'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🏢 Proyek Ini ({activeProject.name})
          </button>
          <button
            type="button"
            onClick={() => setScope('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              scope === 'all'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🌐 Semua Proyek (Global)
          </button>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {actionResult && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">
              Berhasil menghapus {actionResult.count} data pada sub-menu &quot;{actionResult.label}&quot; ({scope === 'active_project' ? `Proyek ${activeProject.name}` : 'Semua Proyek'}). Log audit telah dicatat.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActionResult(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Scope Alert Notice */}
      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold">Perhatian Keamanan Data: </span>
          Saat ini filter aktif menghapus data untuk{' '}
          <span className="font-bold underline">
            {scope === 'active_project' ? `Lokasi Proyek Aktif: "${activeProject.name}"` : 'Seluruh Database Proyek (Global)'}
          </span>
          . Tindakan penghapusan bersifat permanen dan tidak dapat dibatalkan (Irreversible).
        </div>
      </div>

      {/* Submenu Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {submenus.map((item) => {
          const count = getItemCount(item.key);
          const Icon = item.icon;

          return (
            <div
              key={item.key}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                item.isDangerous
                  ? 'bg-rose-50/50 border-rose-300 md:col-span-2 lg:col-span-3'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        item.isDangerous
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-tight">{item.title}</h4>
                      <span className="text-[10px] text-slate-400 font-medium">{item.category}</span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                      count > 0
                        ? item.isDangerous
                          ? 'bg-rose-200 text-rose-900'
                          : 'bg-slate-100 text-slate-800'
                        : 'bg-slate-50 text-slate-400'
                    }`}
                  >
                    {count} Data
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">{item.description}</p>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">
                  {scope === 'active_project' ? 'Proyek Aktif' : 'Semua Lokasi'}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedSubmenu(item);
                    setConfirmText('');
                  }}
                  disabled={count === 0}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    item.isDangerous
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-2xs'
                      : 'border border-rose-200 text-rose-700 hover:bg-rose-50'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Data Masal</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      {selectedSubmenu && (
        <div
          id="bulk-delete-confirm-modal"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <button
                type="button"
                onClick={() => setSelectedSubmenu(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Konfirmasi Hapus Data Masal
              </h3>
              <p className="text-xs text-slate-500">
                Tindakan ini memerlukan otorisasi Super Admin. Anda akan menghapus data pada:
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-rose-900">Sub-Menu Target:</span>
                <span className="font-bold text-rose-950">{selectedSubmenu.title}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-rose-900">Cakupan:</span>
                <span className="font-bold text-rose-950">
                  {scope === 'active_project' ? `Hanya Proyek "${activeProject.name}"` : 'Seluruh Proyek (Global)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-rose-900">Volume Terhapus:</span>
                <span className="font-extrabold text-rose-600">
                  {getItemCount(selectedSubmenu.key)} Rekaman Data
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirm-delete-input" className="block text-xs font-semibold text-slate-700">
                Ketik kata <span className="font-bold text-rose-600">HAPUS</span> untuk mengonfirmasi:
              </label>
              <input
                id="confirm-delete-input"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Ketik HAPUS di sini"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-bold tracking-wider uppercase text-slate-900"
                autoFocus
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedSubmenu(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={confirmText.trim().toUpperCase() !== 'HAPUS'}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Data Masal Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
