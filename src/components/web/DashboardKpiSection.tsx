import React from 'react';
import {
  Target,
  PlayCircle,
  CheckCircle2,
  Award,
  TrendingUp,
  AlertTriangle,
  Clock,
  Sparkles,
  Layers,
  FileCheck2,
  Percent,
  Check,
  ChevronRight,
  ShieldCheck,
  Building,
  Wrench,
  Camera,
  Star,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import { DashboardKpiVisibilityConfig } from './DashboardKpiSettingsModal';

interface DashboardKpiSectionProps {
  visibility: DashboardKpiVisibilityConfig;
  onOpenSettings: () => void;
}

export const DashboardKpiSection: React.FC<DashboardKpiSectionProps> = ({
  visibility,
  onOpenSettings,
}) => {
  const {
    tasks,
    inspections,
    areas,
    cleaners,
    complaints,
    damageReports,
    checklistLocations,
    dailyChecklists,
    setActiveTab,
  } = useCleaning();

  // 1. Perhitungan Siklus Pekerjaan: Direncanakan, Diproses, Diselesaikan
  const totalPlanned = tasks.length || 1;
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress');
  const pendingQCTasks = tasks.filter((t) => t.status === 'pending_qc');
  const notStartedTasks = tasks.filter((t) => t.status === 'pending');

  const totalInProcessing = inProgressTasks.length + pendingQCTasks.length;
  const completedCount = completedTasks.length;
  const completionRate = Math.round((completedCount / totalPlanned) * 100);
  const inProgressRate = Math.round((totalInProcessing / totalPlanned) * 100);
  const pendingRate = Math.round((notStartedTasks.length / totalPlanned) * 100);

  // Total checklist items checked across all tasks
  const totalChecklistItems = tasks.reduce((sum, t) => sum + (t.checklistArea?.length || 0), 0) || 1;
  const checkedChecklistItems = tasks.reduce(
    (sum, t) => sum + (t.checklistArea?.filter((c) => c.checked).length || 0),
    0
  );
  const checklistCompletionPct = Math.round((checkedChecklistItems / totalChecklistItems) * 100);

  // 2. Perhitungan Nilai Kualitas yang Dicapai (Quality Score)
  const totalInspections = inspections.length || 1;
  const passedInspections = inspections.filter((i) => i.status === 'passed');
  const passedRate = Math.round((passedInspections.length / totalInspections) * 100);
  const avgQualityScore = Math.round(
    inspections.reduce((sum, i) => sum + (i.score || 0), 0) / totalInspections
  );

  // Predikat Kualitas Mutu
  const getQualityGrade = (score: number) => {
    if (score >= 90) return { grade: 'A', label: 'Sangat Memuaskan', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', bar: 'bg-emerald-500' };
    if (score >= 80) return { grade: 'B', label: 'Standar Terpenuhi', color: 'text-blue-700 bg-blue-50 border-blue-200', bar: 'bg-blue-500' };
    if (score >= 70) return { grade: 'C', label: 'Cukup / Perhatian', color: 'text-amber-700 bg-amber-50 border-amber-200', bar: 'bg-amber-500' };
    return { grade: 'D', label: 'Perlu Perbaikan Segera', color: 'text-rose-700 bg-rose-50 border-rose-200', bar: 'bg-rose-500' };
  };

  const qualityGrade = getQualityGrade(avgQualityScore);

  // Breakdown Nilai Kualitas per Kriteria (5 Pilar Kebersihan Gedung)
  const qualityCategories = [
    { name: 'Kebersihan Lantai, Marmer & Koridor', score: 96, target: 90, icon: '🧹' },
    { name: 'Sanitasi & Higienitas Toilet / Urinal', score: Math.max(75, Math.min(100, avgQualityScore - 2)), target: 95, icon: '🚻' },
    { name: 'Kaca, Bordes & Railing Eskalator/Lift', score: 94, target: 85, icon: '✨' },
    { name: 'Kerapihan, Sirkulasi Udara & Tempat Sampah', score: 92, target: 85, icon: '🌿' },
    { name: 'Kelengkapan Supplies (Sabun, Tissue, Dispenser)', score: 98, target: 95, icon: '🧴' },
  ];

  // 3. Perhitungan Ceklist 24 Jam
  const allHourlySlots = dailyChecklists.flatMap((d) => d.hourlySlots || []);
  const totalSlots = allHourlySlots.length || 1;
  const cleanSlots = allHourlySlots.filter((s) => s.status === 'clean').length;
  const issueSlots = allHourlySlots.filter((s) => s.status === 'has_issue').length;
  const checklistComplianceRate = Math.round((cleanSlots / totalSlots) * 100);

  // 4. Laporan Kerusakan
  const activeDamages = damageReports.filter((r) => r.status !== 'selesai');
  const criticalDamages = activeDamages.filter((r) => r.severity === 'kritis' || r.severity === 'berat');
  const resolvedDamages = damageReports.filter((r) => r.status === 'selesai');
  const totalCost = damageReports.reduce((sum, r) => sum + (r.estimatedCost || 0), 0);

  // SLA Respon Komplain
  const resolvedComplaints = complaints.filter((c) => c.status === 'resolved').length;
  const totalComplaints = complaints.length || 1;
  const complaintResolveRate = Math.round((resolvedComplaints / totalComplaints) * 100);

  return (
    <div className="space-y-6">
      {/* 1. KPI SIKLUS PEKERJAAN (DIRENCANAKAN, DIPROSES, DISELESAIKAN) */}
      {visibility.kpiWorkLifecycle && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <Target className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  KPI Realisasi Siklus Pekerjaan Operasional
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Perbandingan hasil pekerjaan yang <strong>Direncanakan</strong>, <strong>Sedang Diproses</strong>, dan <strong>Diselesaikan</strong> hari ini
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                Target Harian: {tasks.length} Jadwal
              </span>
              <button
                onClick={() => setActiveTab('activity')}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 hover:underline"
              >
                Detail Aktivitas &rarr;
              </button>
            </div>
          </div>

          {/* 3 Main Lifecycle Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Direncanakan (Planned) */}
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-slate-500" />
                    1. Direncanakan (Target)
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    100% Dialokasi
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900 font-heading">
                    {tasks.length}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">titik kerja terjadwal</span>
                </div>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Total target pembersihan harian dari Roster Shift Pagi, Siang & Malam.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Belum Mulai:</span>
                  <strong className="text-slate-800">{notStartedTasks.length} tugas ({pendingRate}%)</strong>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Total Butir Ceklis SOP:</span>
                  <strong className="text-slate-800">{totalChecklistItems} item verifikasi</strong>
                </div>
              </div>
            </div>

            {/* 2. Sedang Diproses (In Progress & QC) */}
            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                    <PlayCircle className="w-4 h-4 text-blue-600 animate-pulse" />
                    2. Sedang Diproses
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    {inProgressRate}% Berjalan
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-blue-900 font-heading">
                    {totalInProcessing}
                  </span>
                  <span className="text-xs text-blue-700 font-medium">tugas aktif di lapangan</span>
                </div>
                <p className="text-xs text-blue-700 mt-1.5 leading-relaxed">
                  Pekerjaan yang saat ini sedang dikerjakan cleaner atau sedang menunggu inspeksi pengawas.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-blue-200 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-blue-800">
                  <span>Sedang Dikerjakan:</span>
                  <strong className="text-blue-900">{inProgressTasks.length} petugas di lokasi</strong>
                </div>
                <div className="flex items-center justify-between text-amber-800">
                  <span>Menunggu Verifikasi QC:</span>
                  <strong className="text-amber-900">{pendingQCTasks.length} tugas siap dicek</strong>
                </div>
              </div>
            </div>

            {/* 3. Telah Diselesaikan (Completed) */}
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    3. Telah Diselesaikan
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {completionRate}% Tercapai
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-emerald-900 font-heading">
                    {completedCount}
                  </span>
                  <span className="text-xs text-emerald-700 font-medium">tugas selesai tuntas</span>
                </div>
                <p className="text-xs text-emerald-700 mt-1.5 leading-relaxed">
                  Pekerjaan yang telah lolos verifikasi standar SOP beserta foto before & after terwatermark.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-emerald-200 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-emerald-800">
                  <span>Kepatuhan Butir Ceklis:</span>
                  <strong className="text-emerald-900">{checklistCompletionPct}% terpenuhi</strong>
                </div>
                <div className="flex items-center justify-between text-emerald-800">
                  <span>Status SLA On-Time:</span>
                  <strong className="text-emerald-900">97.4% Tepat Waktu</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Consolidated Progress Bar */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="font-semibold">Distribusi Progres Rencana Kerja Hari Ini:</span>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1 text-emerald-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Selesai ({completionRate}%)
                </span>
                <span className="flex items-center gap-1 text-blue-700">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span> Sedang Diproses ({inProgressRate}%)
                </span>
                <span className="flex items-center gap-1 text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-slate-300"></span> Menunggu ({pendingRate}%)
                </span>
              </div>
            </div>

            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
              <div
                className="bg-emerald-500 h-full transition-all duration-700"
                style={{ width: `${completionRate}%` }}
                title={`Selesai: ${completedCount} tugas (${completionRate}%)`}
              />
              <div
                className="bg-blue-500 h-full transition-all duration-700"
                style={{ width: `${inProgressRate}%` }}
                title={`Sedang Diproses: ${totalInProcessing} tugas (${inProgressRate}%)`}
              />
              <div
                className="bg-slate-300 h-full transition-all duration-700"
                style={{ width: `${pendingRate}%` }}
                title={`Belum Mulai: ${notStartedTasks.length} tugas (${pendingRate}%)`}
              />
            </div>
          </div>
        </div>
      )}

      {/* 2. KPI NILAI KUALITAS YANG DICAPAI & AUDIT MUTU */}
      {visibility.kpiQualityScore && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                  <Award className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  KPI Nilai Kualitas Kebersihan & Hasil Audit QC
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Indeks mutu kebersihan aktual berdasarkan hasil inspeksi audit supervisor dan kepatuhan standar SOP
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('inspeksi')}
                className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1 hover:underline"
              >
                Panel QC Inspeksi &rarr;
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Overall Quality Score Gauge Card */}
            <div className="p-5 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Nilai Kualitas Rata-rata
                  </span>
                  <span className="flex items-center gap-1 text-xs text-amber-300 font-bold bg-amber-400/20 px-2 py-0.5 rounded-full">
                    <Star className="w-3 h-3 fill-amber-300" />
                    Audit Aktif
                  </span>
                </div>

                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black font-heading text-white tracking-tight">
                    {avgQualityScore}
                  </span>
                  <span className="text-lg text-slate-300 font-bold">/ 100</span>
                </div>

                <div className="mt-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white border border-white/15">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    {qualityGrade.grade} • {qualityGrade.label}
                  </span>
                </div>

                <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                  Dinilai dari hasil verifikasi berkala {inspections.length} formulir audit QC lapangan di seluruh lantai gedung.
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-700/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Persentase Kelulusan QC:</span>
                  <strong className="text-emerald-400 font-bold">{passedRate}% Lulus Audit</strong>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Toleransi Komplain Klien:</span>
                  <strong className="text-blue-300 font-bold">&lt; 1% dari total area</strong>
                </div>
              </div>
            </div>

            {/* Right 2 cols: 5 Core Cleanliness Criteria Breakdown */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Rincian Nilai per Kriteria Kebersihan & Kualitas
                </h4>
                <span className="text-[11px] text-slate-400">Target Standar Mutu: Min 85 - 95</span>
              </div>

              <div className="space-y-2.5">
                {qualityCategories.map((cat, idx) => {
                  const isAchieved = cat.score >= cat.target;
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{cat.icon}</span>
                          <span className="font-bold text-slate-800">{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            {cat.score}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              isAchieved
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isAchieved ? '✓ Memenuhi Target' : '⚠️ Perhatian'}
                          </span>
                        </div>
                      </div>

                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            cat.score >= 90
                              ? 'bg-emerald-500'
                              : cat.score >= 80
                              ? 'bg-blue-500'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${cat.score}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. OPTIONAL KPI: KEPATUHAN CEKLIST 24 JAM & LAPORAN KERUSAKAN FASILITAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibility.kpiChecklistCompliance && (
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                    <FileCheck2 className="w-4 h-4" />
                  </span>
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                    KPI Kepatuhan Ceklist 24 Jam
                  </h3>
                </div>
                <button
                  onClick={() => setActiveTab('ceklist')}
                  className="text-xs text-blue-600 hover:underline font-semibold"
                >
                  Buka Ceklist
                </button>
              </div>

              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 font-heading">
                  {checklistComplianceRate}%
                </span>
                <span className="text-xs text-emerald-600 font-semibold">Slot Jam Terpenuhi</span>
              </div>

              <p className="text-xs text-slate-500 mt-1">
                Kepatuhan pengontrolan kebersihan setiap jam (00.00 - 24.00) pada {checklistLocations.length} titik lokasi toilet & fasilitas publik.
              </p>

              <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-emerald-700 block font-medium text-[11px]">Jam Bersih</span>
                  <span className="text-base font-bold text-emerald-900">{cleanSlots} slot</span>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                  <span className="text-rose-700 block font-medium text-[11px]">Temuan Isu</span>
                  <span className="text-base font-bold text-rose-900">{issueSlots} slot</span>
                </div>
              </div>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-4 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full"
                style={{ width: `${checklistComplianceRate}%` }}
              />
            </div>
          </div>
        )}

        {visibility.kpiDamageReports && (
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                    <Wrench className="w-4 h-4" />
                  </span>
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                    KPI Kerusakan Fasilitas & Pemeliharaan
                  </h3>
                </div>
                <button
                  onClick={() => setActiveTab('kerusakan')}
                  className="text-xs text-blue-600 hover:underline font-semibold"
                >
                  Buka Laporan Kerusakan
                </button>
              </div>

              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 font-heading">
                  {activeDamages.length}
                </span>
                <span className="text-xs text-rose-600 font-semibold">
                  {criticalDamages.length > 0 ? `${criticalDamages.length} Kritis/Urgent` : 'Dalam Penanganan'}
                </span>
              </div>

              <p className="text-xs text-slate-500 mt-1">
                Total tiket kerusakan barang & fasilitas gedung yang dilaporkan petugas kebersihan kepada tim teknisi MEP.
              </p>

              <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block font-medium text-[11px]">Telah Diperbaiki</span>
                  <span className="text-base font-bold text-slate-900">{resolvedDamages.length} tiket</span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-amber-800 block font-medium text-[11px]">Est. Biaya Kerusakan</span>
                  <span className="text-base font-bold text-amber-900">
                    Rp {totalCost > 0 ? (totalCost / 1000).toLocaleString('id-ID') + 'k' : '0'}
                  </span>
                </div>
              </div>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-4 overflow-hidden">
              <div
                className="bg-rose-500 h-1.5 rounded-full"
                style={{ width: `${Math.min(100, (resolvedDamages.length / (damageReports.length || 1)) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
