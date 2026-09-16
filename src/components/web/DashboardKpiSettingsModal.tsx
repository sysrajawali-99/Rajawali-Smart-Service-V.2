import React from 'react';
import {
  X,
  SlidersHorizontal,
  Check,
  RotateCcw,
  Eye,
  EyeOff,
  BarChart3,
  Award,
  CheckCircle2,
  Clock,
  Wrench,
  Sparkles,
  Layers,
  Activity,
  FileCheck2,
} from 'lucide-react';

export interface DashboardKpiVisibilityConfig {
  kpiSummaryCards: boolean; // Kartu Ringkasan Metrik Utama (4 Kartu)
  kpiWorkLifecycle: boolean; // KPI Status Pekerjaan (Direncanakan, Diproses, Diselesaikan)
  kpiQualityScore: boolean; // KPI Nilai Kualitas & Audit QC (Skor 0-100, Grade Kualitas)
  kpiChecklistCompliance: boolean; // KPI Kepatuhan Ceklist 24 Jam & Pemantauan SLA
  kpiDamageReports: boolean; // KPI Kerusakan Fasilitas & Pemeliharaan Aset
  areaRealtimeStatus: boolean; // Pemantauan Status Kebersihan Area per Lantai
  quickActions: boolean; // Panel Aksi Cepat Operasional
  checklist24QuickView: boolean; // Widget Ringkasan Ceklist 24 Jam
  liveActivityFeed: boolean; // Live Feed Aktivitas & Dokumentasi Before-After
}

export const DEFAULT_KPI_VISIBILITY: DashboardKpiVisibilityConfig = {
  kpiSummaryCards: true,
  kpiWorkLifecycle: true,
  kpiQualityScore: true,
  kpiChecklistCompliance: true,
  kpiDamageReports: true,
  areaRealtimeStatus: true,
  quickActions: true,
  checklist24QuickView: true,
  liveActivityFeed: true,
};

interface DashboardKpiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: DashboardKpiVisibilityConfig;
  onChange: (newConfig: DashboardKpiVisibilityConfig) => void;
  onReset: () => void;
}

export const DashboardKpiSettingsModal: React.FC<DashboardKpiSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onChange,
  onReset,
}) => {
  if (!isOpen) return null;

  const toggleItem = (key: keyof DashboardKpiVisibilityConfig) => {
    onChange({
      ...config,
      [key]: !config[key],
    });
  };

  const handleSelectAll = (visible: boolean) => {
    const updated: DashboardKpiVisibilityConfig = {
      kpiSummaryCards: visible,
      kpiWorkLifecycle: visible,
      kpiQualityScore: visible,
      kpiChecklistCompliance: visible,
      kpiDamageReports: visible,
      areaRealtimeStatus: visible,
      quickActions: visible,
      checklist24QuickView: visible,
      liveActivityFeed: visible,
    };
    onChange(updated);
  };

  const sections: {
    key: keyof DashboardKpiVisibilityConfig;
    title: string;
    description: string;
    category: 'KPI Kinerja' | 'Operasional & Area' | 'Aktivitas';
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[] = [
    {
      key: 'kpiWorkLifecycle',
      title: 'KPI Siklus Pekerjaan (Rencana, Proses, Selesai)',
      description: 'Menampilkan ringkasan volume tugas yang direncanakan, sedang dikerjakan/QC, telah selesai, dan persentase ketercapaian target harian.',
      category: 'KPI Kinerja',
      icon: BarChart3,
      badge: 'Utama',
    },
    {
      key: 'kpiQualityScore',
      title: 'KPI Nilai Kualitas & Audit QC (Skor Mutu)',
      description: 'Menampilkan rata-rata skor kualitas kebersihan (0-100), predikat mutu (Grade A/B/C), persentase kelulusan QC, dan rating per kriteria kebersihan.',
      category: 'KPI Kinerja',
      icon: Award,
      badge: 'Prioritas',
    },
    {
      key: 'kpiSummaryCards',
      title: 'Kartu Metrik Cepat (4 Indikator Utama)',
      description: 'Kartu metrik atas: Tingkat Kebersihan Area %, Petugas On-Duty, Lolos QC Inspeksi %, dan Tiket Komplain Aktif.',
      category: 'KPI Kinerja',
      icon: Sparkles,
    },
    {
      key: 'kpiChecklistCompliance',
      title: 'KPI Kepatuhan Ceklist 24 Jam & Kontrol Berkala',
      description: 'Metrik kepatuhan pengisian ceklist berkala 24 jam (00.00-24.00), slot jam bersih vs temuan isu, dan kepatuhan SOP.',
      category: 'KPI Kinerja',
      icon: FileCheck2,
    },
    {
      key: 'kpiDamageReports',
      title: 'KPI Laporan Kerusakan Barang / Fasilitas',
      description: 'Statistik tiket kerusakan fasilitas gedung, tingkat kritis/urgent, progres penanganan teknisi, dan estimasi biaya perbaikan.',
      category: 'KPI Kinerja',
      icon: Wrench,
    },
    {
      key: 'areaRealtimeStatus',
      title: 'Status Pembersihan Area per Lantai',
      description: 'Peta kartu kondisi kebersihan per zona lantai (Bersih, Sedang Dikerjakan, Perlu Pembersihan, Diinspeksi).',
      category: 'Operasional & Area',
      icon: Layers,
    },
    {
      key: 'quickActions',
      title: 'Panel Aksi Cepat Operasional',
      description: 'Tombol pintas pengawas untuk catat komplain cepat, mulai QC audit, jadwal shift, dan buka ceklist 24 jam.',
      category: 'Operasional & Area',
      icon: Clock,
    },
    {
      key: 'checklist24QuickView',
      title: 'Ringkasan Ceklist Area Hari Ini',
      description: 'Daftar lokasi ceklist toilet & koridor hari ini dengan indikator jumlah jam bersih dan jumlah isu terdeteksi.',
      category: 'Operasional & Area',
      icon: CheckCircle2,
    },
    {
      key: 'liveActivityFeed',
      title: 'Live Feed Aktivitas & Foto Before-After',
      description: 'Galeri dokumentasi pengerjaan pembersihan real-time dengan verifikasi foto sebelum vs sesudah terwatermark.',
      category: 'Aktivitas',
      icon: Activity,
    },
  ];

  const visibleCount = Object.values(config).filter(Boolean).length;
  const totalCount = Object.keys(config).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Pengaturan Tampilan KPI & Widget Dashboard
              </h2>
              <p className="text-xs text-slate-500">
                Pilih widget metrik mana yang ingin ditampilkan atau disembunyikan di dashboard Anda
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action bar on top */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-slate-600 font-medium">
            Status:{' '}
            <strong className="text-blue-700 font-bold">
              {visibleCount} dari {totalCount} widget aktif
            </strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSelectAll(true)}
              className="px-2.5 py-1 font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md border border-blue-200 transition-colors"
            >
              Tampilkan Semua
            </button>
            <button
              onClick={() => handleSelectAll(false)}
              className="px-2.5 py-1 font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors"
            >
              Sembunyikan Semua
            </button>
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1 px-2.5 py-1 font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors"
              title="Kembalikan ke susunan standar"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Default</span>
            </button>
          </div>
        </div>

        {/* Section List */}
        <div className="p-6 space-y-3 overflow-y-auto flex-1 divide-y divide-slate-100">
          {sections.map((section) => {
            const Icon = section.icon;
            const isVisible = config[section.key];

            return (
              <div
                key={section.key}
                onClick={() => toggleItem(section.key)}
                className={`pt-3 first:pt-0 flex items-start justify-between gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  isVisible
                    ? 'bg-blue-50/40 border-blue-200 hover:bg-blue-50/70'
                    : 'bg-white border-slate-200 hover:border-slate-300 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`p-2 rounded-xl shrink-0 transition-colors ${
                      isVisible ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4
                        className={`text-xs sm:text-sm font-bold truncate ${
                          isVisible ? 'text-slate-900' : 'text-slate-600'
                        }`}
                      >
                        {section.title}
                      </h4>
                      {section.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded">
                          {section.badge}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 border border-slate-200 px-1.5 py-0.2 rounded bg-slate-50">
                        {section.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {section.description}
                    </p>
                  </div>
                </div>

                {/* Switch Toggle */}
                <div className="shrink-0 pt-0.5">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isVisible}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      isVisible ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        isVisible ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white px-6 py-3.5 border-t border-slate-200 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            Pilihan disimpan secara otomatis ke browser Anda.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs transition-colors"
          >
            Selesai & Terapkan
          </button>
        </div>
      </div>
    </div>
  );
};
