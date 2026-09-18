import React, { useState } from 'react';
import {
  Settings,
  Building,
  Shield,
  Bell,
  Check,
  Save,
  Key,
  Users,
  Clock,
  Layers,
  ClipboardList,
  Plus,
  Trash2,
  Building2,
  Lock,
  SlidersHorizontal,
  RotateCcw,
  Sparkles,
  BarChart3,
  Award,
  FileCheck2,
  Wrench,
  Activity,
  CheckCircle2,
  LayoutDashboard,
  Eye,
  EyeOff,
  ArrowRight,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import { ChecklistLocationCategory, DashboardKpiVisibilityConfig } from '../../types';
import { UserManagementSection } from './UserManagementSection';
import { CompanyProfileSettingsSection } from './CompanyProfileSettingsSection';
import { SuperAdminBulkDeleteSection } from './SuperAdminBulkDeleteSection';

export const PengaturanView: React.FC = () => {
  const {
    userRole,
    activeProject,
    checklistTemplates,
    addChecklistTemplate,
    deleteChecklistTemplate,
    setActiveTab,
    kpiConfig,
    updateKpiConfig,
    resetKpiConfig,
    toggleKpiWidget,
    rbacPermissions,
    updateRbacPermission,
    resetRbacPermissions,
  } = useCleaning();

  const [deadlineAlertMins, setDeadlineAlertMins] = useState(15);
  const [autoQCThreshold, setAutoQCThreshold] = useState(85);
  const [isSaved, setIsSaved] = useState(false);
  const [rbacMessage, setRbacMessage] = useState<string | null>(null);
  const [deleteToast, setDeleteToast] = useState<string | null>(null);

  // Master Data Checklist Item state
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<ChecklistLocationCategory>('toilet');
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<ChecklistLocationCategory>('toilet');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleAddTemplateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const currentCatItems = checklistTemplates.filter((t) => t.category === newItemCategory);
    addChecklistTemplate({
      category: newItemCategory,
      name: newItemName.trim(),
      order: currentCatItems.length + 1,
    });

    setNewItemName('');
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  // KPI widget section metadata for configuration
  const kpiSections: {
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
      description: 'Statistik tiket kerusakan fasilitas gedung, tingkat kritis/urgent, progres penanganan teknisi, dan status penyelesaian perbaikan.',
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

  const handleSelectAllKpi = (visible: boolean) => {
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
    updateKpiConfig(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handlePresetFocusKpi = () => {
    updateKpiConfig({
      kpiSummaryCards: true,
      kpiWorkLifecycle: true,
      kpiQualityScore: true,
      kpiChecklistCompliance: true,
      kpiDamageReports: true,
      areaRealtimeStatus: false,
      quickActions: false,
      checklist24QuickView: false,
      liveActivityFeed: false,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handlePresetCompact = () => {
    updateKpiConfig({
      kpiSummaryCards: true,
      kpiWorkLifecycle: true,
      kpiQualityScore: true,
      kpiChecklistCompliance: false,
      kpiDamageReports: false,
      areaRealtimeStatus: false,
      quickActions: false,
      checklist24QuickView: false,
      liveActivityFeed: false,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const activeWidgetsCount = Object.values(kpiConfig).filter(Boolean).length;
  const totalWidgetsCount = Object.keys(kpiConfig).length;

  const categoryList: { key: ChecklistLocationCategory; label: string; icon: string }[] = [
    { key: 'toilet', label: 'Toilet', icon: '🚽' },
    { key: 'public_area', label: 'Public Area', icon: '🏢' },
    { key: 'koridor', label: 'Koridor', icon: '🚶' },
    { key: 'musholla', label: 'Musholla', icon: '🕌' },
    { key: 'lift', label: 'Lift & Eskalator', icon: '🛗' },
    { key: 'pantry', label: 'Pantry', icon: '☕' },
  ];

  const activeCategoryTemplates = checklistTemplates.filter(
    (t) => t.category === selectedCategoryTab
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Pengaturan Sistem & Master Data
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Konfigurasi master data item ceklist, pengaturan tampilan KPI dashboard, aturan notifikasi, dan hak akses
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSaved && (
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Pengaturan Berhasil Disimpan!</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Lihat Hasil di Dashboard →</span>
          </button>
        </div>
      </div>

      {/* SECTION: Profil Perusahaan, Logo & Kop Surat Resmi (PDF & Login) */}
      <CompanyProfileSettingsSection />

      {/* SECTION: Pengaturan Tampilan KPI & Widget Dashboard (Dipindahkan dari Dashboard) */}
      <div
        id="section-kpi-settings"
        className="p-5 sm:p-6 rounded-2xl bg-white border border-blue-200/80 shadow-xs space-y-5 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-50/50 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 relative">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Pengaturan Tampilan KPI & Widget Dashboard
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  {activeWidgetsCount} dari {totalWidgetsCount} Widget Aktif
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
                Tentukan metrik, diagram, kartu operasional, dan feed aktivitas apa saja yang ditampilkan pada layar utama Dashboard.
                Semua perubahan langsung tersimpan dan dapat disesuaikan kembali sewaktu-waktu.
              </p>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <span className="text-slate-400 text-[11px] mr-1 hidden lg:inline">Preset:</span>
            <button
              type="button"
              onClick={() => handleSelectAllKpi(true)}
              className="px-2.5 py-1.5 font-semibold text-xs text-blue-700 hover:text-blue-800 hover:bg-blue-100/70 bg-blue-50 rounded-xl border border-blue-200 transition-colors cursor-pointer"
              title="Aktifkan seluruh widget KPI di dashboard"
            >
              Aktifkan Semua
            </button>
            <button
              type="button"
              onClick={handlePresetFocusKpi}
              className="px-2.5 py-1.5 font-semibold text-xs text-amber-800 hover:text-amber-900 hover:bg-amber-100/70 bg-amber-50 rounded-xl border border-amber-200 transition-colors cursor-pointer"
              title="Fokus hanya pada kartu KPI kinerja & mutu"
            >
              🎯 Fokus KPI Kinerja
            </button>
            <button
              type="button"
              onClick={handlePresetCompact}
              className="px-2.5 py-1.5 font-semibold text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-100 bg-white rounded-xl border border-slate-200 transition-colors cursor-pointer"
              title="Tampilkan hanya ringkasan siklus kerja & skor kualitas"
            >
              ⚡ Ringkas
            </button>
            <button
              type="button"
              onClick={() => handleSelectAllKpi(false)}
              className="px-2.5 py-1.5 font-semibold text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-100 bg-slate-50 rounded-xl border border-slate-200 transition-colors cursor-pointer"
              title="Sembunyikan semua widget (Dashboard bersih)"
            >
              Kosongkan Dashboard
            </button>
            <button
              type="button"
              onClick={() => {
                resetKpiConfig();
                setIsSaved(true);
                setTimeout(() => setIsSaved(false), 2500);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 font-semibold text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-100 bg-white rounded-xl border border-slate-200 transition-colors cursor-pointer"
              title="Reset ke kondisi awal default"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Status explanation notice if 0 widgets active */}
        {activeWidgetsCount === 0 && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Dashboard saat ini dalam kondisi kosong</strong>. Aktifkan sakelar widget di bawah untuk mulai menampilkan data yang diinginkan di dashboard.
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleSelectAllKpi(true)}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shrink-0 transition-colors"
            >
              Tampilkan Semua
            </button>
          </div>
        )}

        {/* List of KPI Widgets to Toggle */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {kpiSections.map((section) => {
            const Icon = section.icon;
            const isVisible = kpiConfig[section.key];

            return (
              <div
                key={section.key}
                onClick={() => {
                  toggleKpiWidget(section.key);
                  setIsSaved(true);
                  setTimeout(() => setIsSaved(false), 2000);
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                  isVisible
                    ? 'bg-blue-50/40 border-blue-200 hover:bg-blue-50/70 shadow-2xs'
                    : 'bg-slate-50/60 border-slate-200 hover:border-slate-300 opacity-70'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`p-2 rounded-xl shrink-0 transition-colors ${
                          isVisible ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                          {section.category}
                        </span>
                        <h4
                          className={`text-xs font-bold leading-tight line-clamp-1 ${
                            isVisible ? 'text-slate-900' : 'text-slate-600'
                          }`}
                        >
                          {section.title}
                        </h4>
                      </div>
                    </div>

                    {/* Switch Toggle */}
                    <div className="shrink-0 pt-0.5">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isVisible}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          isVisible ? 'bg-blue-600' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            isVisible ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {section.description}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span
                    className={`font-semibold flex items-center gap-1 ${
                      isVisible ? 'text-blue-700' : 'text-slate-400'
                    }`}
                  >
                    {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    {isVisible ? 'Tampil di Dashboard' : 'Disembunyikan'}
                  </span>
                  {section.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded">
                      {section.badge}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 1: Master Data Item Ceklist Kebersihan Area */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Master Data Item Ceklist Kebersihan Area
              </h3>
              <p className="text-[11px] text-slate-400">
                Item-item yang wajib diperiksa petugas per jam (00.00 - 24.00) di setiap area
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-500">
            Total Item Master: <span className="font-bold text-slate-800">{checklistTemplates.length} Item</span>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {categoryList.map((cat) => {
            const isSelected = selectedCategoryTab === cat.key;
            const count = checklistTemplates.filter((t) => t.category === cat.key).length;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => {
                  setSelectedCategoryTab(cat.key);
                  setNewItemCategory(cat.key);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Add New Item Form */}
        <form onSubmit={handleAddTemplateItem} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
          <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-emerald-600" />
            Tambah Item Baru untuk Kategori: <span className="capitalize font-bold text-emerald-700">{selectedCategoryTab}</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              required
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder={`Contoh untuk ${selectedCategoryTab}: Kloset disikat bersih, cermin di lap mengkilap...`}
              className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors shrink-0 shadow-xs"
            >
              + Tambah ke Master Data
            </button>
          </div>
        </form>

        {/* Checklist Items List */}
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
          {activeCategoryTemplates.length === 0 ? (
            <div className="p-6 text-center text-slate-400">
              Belum ada item ceklist master untuk kategori ini. Tambahkan item di atas.
            </div>
          ) : (
            activeCategoryTemplates.map((tpl, index) => (
              <div
                key={tpl.id}
                className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[11px] shrink-0">
                    {index + 1}
                  </span>
                  <span className="font-medium text-slate-800">{tpl.name}</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    deleteChecklistTemplate(tpl.id);
                    setDeleteToast(`Item "${tpl.name}" berhasil dihapus.`);
                    setTimeout(() => setDeleteToast(null), 3000);
                  }}
                  className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                  title="Hapus Item dari Master Data"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {deleteToast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-xs z-50 animate-in fade-in slide-in-from-bottom-2">
          <Trash2 className="w-4 h-4 text-rose-400" />
          <span>{deleteToast}</span>
        </div>
      )}

      {/* Section 2: User Management & Project Access Control (Super Admin) */}
      <UserManagementSection />

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 3: SLA & Push Notification Rules */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Bell className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Aturan Notifikasi Push & Ambang Batas SLA
              </h3>
              <p className="text-[11px] text-slate-400">
                Pengingat otomatis saat tugas mendekati batas waktu pengerjaan
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
              <div className="flex items-center justify-between font-semibold text-slate-800">
                <span>Waktu Peringatan Sebelum Batas Waktu:</span>
                <span className="text-amber-600 font-bold">{deadlineAlertMins} Menit</span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                step="5"
                value={deadlineAlertMins}
                onChange={(e) => setDeadlineAlertMins(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <p className="text-[10px] text-slate-500">
                Petugas akan menerima notifikasi push otomatis di ponsel sebelum jadwal tugas berakhir.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
              <div className="flex items-center justify-between font-semibold text-slate-800">
                <span>Nilai Minimum Kelolosan Audit QC:</span>
                <span className="text-emerald-600 font-bold">{autoQCThreshold} / 100</span>
              </div>
              <input
                type="range"
                min="70"
                max="95"
                step="5"
                value={autoQCThreshold}
                onChange={(e) => setAutoQCThreshold(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <p className="text-[10px] text-slate-500">
                Hasil inspeksi di bawah nilai ini akan otomatis ditandai memerlukan pembersihan ulang (re-work).
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: RBAC Roles & Permissions Matrix */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Matriks Hak Akses Pengguna (Role-Based Access Control)
                </h3>
                <p className="text-[11px] text-slate-500">
                  {userRole === 'admin'
                    ? 'Super Admin: Klik sakelar untuk mengaktifkan / menonaktifkan hak akses modul per role secara instan.'
                    : 'Pratinjau izin modul per role. Hanya Super Admin yang dapat mengubah konfigurasi ini.'}
                </p>
              </div>
            </div>

            {userRole === 'admin' && (
              <button
                type="button"
                onClick={() => {
                  resetRbacPermissions();
                  setRbacMessage('Matriks hak akses dikembalikan ke pengaturan default pabrik.');
                  setTimeout(() => setRbacMessage(null), 3000);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors shrink-0 cursor-pointer shadow-2xs"
                title="Reset Matriks Hak Akses ke Nilai Standar"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Reset ke Default</span>
              </button>
            )}
          </div>

          {/* Quick Summary Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div className="p-2.5 rounded-xl border border-indigo-100 bg-indigo-50/50">
              <span className="text-[10px] font-semibold text-indigo-600 block uppercase">Super Admin</span>
              <span className="text-xs font-bold text-indigo-950">100% Modul Aktif</span>
              <span className="text-[10px] text-indigo-400 block mt-0.5">Akses Penuh & Terkunci</span>
            </div>
            <div className="p-2.5 rounded-xl border border-amber-100 bg-amber-50/50">
              <span className="text-[10px] font-semibold text-amber-600 block uppercase">Supervisor</span>
              <span className="text-xs font-bold text-amber-950">
                {rbacPermissions.filter((p) => p.supervisor).length} / {rbacPermissions.length} Modul Aktif
              </span>
              <span className="text-[10px] text-amber-500 block mt-0.5">Operasional & QC</span>
            </div>
            <div className="p-2.5 rounded-xl border border-emerald-100 bg-emerald-50/50">
              <span className="text-[10px] font-semibold text-emerald-600 block uppercase">Petugas</span>
              <span className="text-xs font-bold text-emerald-950">
                {rbacPermissions.filter((p) => p.petugas).length} / {rbacPermissions.length} Modul Aktif
              </span>
              <span className="text-[10px] text-emerald-500 block mt-0.5">Tugas Lapangan</span>
            </div>
            <div className="p-2.5 rounded-xl border border-sky-100 bg-sky-50/50">
              <span className="text-[10px] font-semibold text-sky-600 block uppercase">Klien / Tenant</span>
              <span className="text-xs font-bold text-sky-950">
                {rbacPermissions.filter((p) => p.klien).length} / {rbacPermissions.length} Modul Aktif
              </span>
              <span className="text-[10px] text-sky-500 block mt-0.5">Monitoring & Komplain</span>
            </div>
          </div>

          {rbacMessage && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">{rbacMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setRbacMessage(null)}
                className="text-emerald-500 hover:text-emerald-700 text-xs font-bold"
              >
                ✕
              </button>
            </div>
          )}

          <div className="border border-slate-200 rounded-xl overflow-x-auto text-xs shadow-2xs">
            <table className="w-full min-w-[620px] text-left">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Modul & Navigasi Sistem</th>
                  <th className="p-3 text-center w-28">Super Admin</th>
                  <th className="p-3 text-center w-32">Supervisor</th>
                  <th className="p-3 text-center w-32">Petugas Lapangan</th>
                  <th className="p-3 text-center w-32">Klien / Tenant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rbacPermissions.map((row) => (
                  <tr key={row.moduleId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3">
                      <p className="font-semibold text-slate-800">{row.moduleName}</p>
                      <span className="text-[10px] text-slate-400 font-mono">ID: {row.moduleId}</span>
                    </td>

                    {/* Admin Column: Always Locked Full */}
                    <td className="p-3 text-center">
                      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold text-[11px]" title="Super Admin memiliki akses penuh tidak dapat dibatasi">
                        <Lock className="w-3 h-3 text-indigo-500" />
                        <span>Full</span>
                      </div>
                    </td>

                    {/* Supervisor Column */}
                    <td className="p-3 text-center">
                      {userRole === 'admin' ? (
                        <button
                          type="button"
                          onClick={() => {
                            updateRbacPermission(row.moduleId, 'supervisor', !row.supervisor);
                            setRbacMessage(`Izin [${row.moduleName}] untuk Supervisor: ${!row.supervisor ? 'DIBUKA' : 'DITUTUP'}`);
                            setTimeout(() => setRbacMessage(null), 3000);
                          }}
                          className={`inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                            row.supervisor
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                          }`}
                        >
                          {row.supervisor ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Diizinkan</span>
                            </>
                          ) : (
                            <span>Dibatasi</span>
                          )}
                        </button>
                      ) : (
                        <span className={row.supervisor ? 'text-emerald-600 font-bold' : 'text-slate-300'}>
                          {row.supervisor ? '✓ Diizinkan' : '—'}
                        </span>
                      )}
                    </td>

                    {/* Petugas Column */}
                    <td className="p-3 text-center">
                      {userRole === 'admin' ? (
                        <button
                          type="button"
                          onClick={() => {
                            updateRbacPermission(row.moduleId, 'petugas', !row.petugas);
                            setRbacMessage(`Izin [${row.moduleName}] untuk Petugas: ${!row.petugas ? 'DIBUKA' : 'DITUTUP'}`);
                            setTimeout(() => setRbacMessage(null), 3000);
                          }}
                          className={`inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                            row.petugas
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                          }`}
                        >
                          {row.petugas ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Diizinkan</span>
                            </>
                          ) : (
                            <span>Dibatasi</span>
                          )}
                        </button>
                      ) : (
                        <span className={row.petugas ? 'text-emerald-600 font-bold' : 'text-slate-300'}>
                          {row.petugas ? '✓ Diizinkan' : '—'}
                        </span>
                      )}
                    </td>

                    {/* Klien Column */}
                    <td className="p-3 text-center">
                      {userRole === 'admin' ? (
                        <button
                          type="button"
                          onClick={() => {
                            updateRbacPermission(row.moduleId, 'klien', !row.klien);
                            setRbacMessage(`Izin [${row.moduleName}] untuk Klien: ${!row.klien ? 'DIBUKA' : 'DITUTUP'}`);
                            setTimeout(() => setRbacMessage(null), 3000);
                          }}
                          className={`inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                            row.klien
                              ? 'bg-sky-50 border-sky-300 text-sky-700 hover:bg-sky-100'
                              : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                          }`}
                        >
                          {row.klien ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-sky-600" />
                              <span>Diizinkan</span>
                            </>
                          ) : (
                            <span>Dibatasi</span>
                          )}
                        </button>
                      ) : (
                        <span className={row.klien ? 'text-sky-600 font-bold' : 'text-slate-300'}>
                          {row.klien ? '✓ Portal' : '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Perubahan Pengaturan</span>
          </button>
        </div>
      </form>

      {/* SECTION: Hapus Data Masal per Sub-Menu (Khusus Super Admin) */}
      <SuperAdminBulkDeleteSection />
    </div>
  );
};
