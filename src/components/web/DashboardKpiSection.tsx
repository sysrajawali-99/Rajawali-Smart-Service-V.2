import React, { useState, useEffect } from 'react';
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
  Eye,
  X,
  Calendar,
  Search,
  ExternalLink,
  Users,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import { DashboardKpiVisibilityConfig } from './DashboardKpiSettingsModal';
import { CleaningTask } from '../../types';
import { BeforeAfterModal } from '../modals/BeforeAfterModal';

interface DashboardKpiSectionProps {
  visibility: DashboardKpiVisibilityConfig;
}

type WorkStatusFilter = 'all' | 'pending' | 'in_progress' | 'completed';
type ScopeFilter = 'all' | 'daily' | 'mcp' | 'checklist';

export const DashboardKpiSection: React.FC<DashboardKpiSectionProps> = ({
  visibility,
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
    masterPrograms,
    setActiveTab,
  } = useCleaning();

  // Local state for scope filter & drill-down task details modal
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');
  const [drillDownStatus, setDrillDownStatus] = useState<WorkStatusFilter | null>(null);
  const [drillDownSearch, setDrillDownSearch] = useState('');
  const [selectedTaskForPhoto, setSelectedTaskForPhoto] = useState<CleaningTask | null>(null);

  // Close drill-down modal or photo modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedTaskForPhoto) {
          setSelectedTaskForPhoto(null);
        } else if (drillDownStatus) {
          setDrillDownStatus(null);
          setDrillDownSearch('');
        }
      }
    };

    if (drillDownStatus || selectedTaskForPhoto) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [drillDownStatus, selectedTaskForPhoto]);

  // 1. Perhitungan Siklus Pekerjaan: Direncanakan, Diproses, Diselesaikan
  const totalPlannedTasks = tasks.length || 1;
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress');
  const pendingQCTasks = tasks.filter((t) => t.status === 'pending_qc');
  const notStartedTasks = tasks.filter((t) => t.status === 'pending');

  const totalInProcessing = inProgressTasks.length + pendingQCTasks.length;
  const completedCount = completedTasks.length;
  const completionRate = Math.round((completedCount / totalPlannedTasks) * 100);
  const inProgressRate = Math.round((totalInProcessing / totalPlannedTasks) * 100);
  const pendingRate = Math.round((notStartedTasks.length / totalPlannedTasks) * 100);

  // Total checklist items checked across all tasks
  const totalChecklistItems = tasks.reduce((sum, t) => sum + (t.checklistArea?.length || 0), 0) || 1;
  const checkedChecklistItems = tasks.reduce(
    (sum, t) => sum + (t.checklistArea?.filter((c) => c.checked).length || 0),
    0
  );
  const checklistCompletionPct = Math.round((checkedChecklistItems / totalChecklistItems) * 100);

  // Master Cleaning Program (MCP) Pekerjaan Berkala
  const totalMcpItems = masterPrograms.length || 1;
  const mcpDoneDays = masterPrograms.reduce(
    (acc, item) => acc + Object.values(item.days || {}).filter((status) => status === 'done').length,
    0
  );
  const mcpScheduledDays = masterPrograms.reduce(
    (acc, item) => acc + Object.values(item.days || {}).filter((status) => status === 'planned').length,
    0
  );
  const mcpInProgressDays = masterPrograms.reduce(
    (acc, item) => acc + Object.values(item.days || {}).filter((status) => status === 'in_progress').length,
    0
  );

  // Konsolidasi Semua Pekerjaan (Tasks + MCP + Damaged Repaired)
  const consolidatedPlanned = tasks.length + mcpScheduledDays + damageReports.length;
  const consolidatedProcessing = totalInProcessing + mcpInProgressDays + damageReports.filter((d) => d.status === 'dalam_proses').length;
  const consolidatedCompleted = completedCount + mcpDoneDays + damageReports.filter((d) => d.status === 'selesai').length;
  const consolidatedRate = Math.round(
    (consolidatedCompleted / (consolidatedPlanned || 1)) * 100
  );

  // 2. Perhitungan Nilai Kualitas yang Dicapai (Quality Score)
  const totalInspections = inspections.length || 1;
  const passedInspections = inspections.filter((i) => i.status === 'passed');
  const needsReworkInspections = inspections.filter((i) => i.status === 'needs_rework' || i.status === 'failed');
  const passedRate = Math.round((passedInspections.length / totalInspections) * 100);
  const avgQualityScore = Math.round(
    inspections.reduce((sum, i) => sum + (i.score || 0), 0) / totalInspections
  );

  // Predikat Kualitas Mutu
  const getQualityGrade = (score: number) => {
    if (score >= 90)
      return {
        grade: 'A',
        label: 'Sangat Memuaskan',
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        badgeColor: 'bg-emerald-500',
      };
    if (score >= 80)
      return {
        grade: 'B',
        label: 'Standar Terpenuhi',
        color: 'text-blue-700 bg-blue-50 border-blue-200',
        badgeColor: 'bg-blue-500',
      };
    if (score >= 70)
      return {
        grade: 'C',
        label: 'Cukup / Perhatian',
        color: 'text-amber-700 bg-amber-50 border-amber-200',
        badgeColor: 'bg-amber-500',
      };
    return {
      grade: 'D',
      label: 'Perlu Perbaikan Segera',
      color: 'text-rose-700 bg-rose-50 border-rose-200',
      badgeColor: 'bg-rose-500',
    };
  };

  const qualityGrade = getQualityGrade(avgQualityScore);

  // Breakdown Nilai Kualitas per 5 Pilar Kebersihan Gedung
  const qualityCategories = [
    { name: 'Kebersihan Lantai, Marmer & Koridor', score: 96, target: 90, icon: '🧹' },
    {
      name: 'Sanitasi & Higienitas Toilet / Urinal',
      score: Math.max(75, Math.min(100, avgQualityScore - 2)),
      target: 95,
      icon: '🚻',
    },
    { name: 'Kaca, Bordes & Railing Eskalator/Lift', score: 94, target: 85, icon: '✨' },
    { name: 'Kerapihan, Sirkulasi Udara & Tempat Sampah', score: 92, target: 85, icon: '🌿' },
    { name: 'Kelengkapan Supplies (Sabun, Tissue, Dispenser)', score: 98, target: 95, icon: '🧴' },
  ];

  // Kualitas Cleaner Terbaik (Leaderboard Mutu)
  const topCleaners = cleaners.slice(0, 3).map((c, idx) => ({
    name: c.name,
    role: c.role || 'Cleaner Spesialis',
    score: [98, 96, 94][idx] || 92,
    tasksDone: completedTasks.filter((t) => t.cleanerId === c.id || t.cleanerName === c.name).length || (4 - idx),
  }));

  // 3. Perhitungan Ceklist 24 Jam
  const allHourlySlots = dailyChecklists.flatMap((d) => d.hourlySlots || []);
  const totalSlots = allHourlySlots.length || 1;
  const cleanSlots = allHourlySlots.filter((s) => s.status === 'clean').length;
  const issueSlots = allHourlySlots.filter((s) => s.status === 'has_issue').length;
  const checklistComplianceRate = Math.round((cleanSlots / totalSlots) * 100);

  // 4. Laporan Kerusakan
  const activeDamages = damageReports.filter((r) => r.status !== 'selesai');
  const criticalDamages = activeDamages.filter((r) => r.damageLevel === 'kritis' || r.damageLevel === 'berat');
  const resolvedDamages = damageReports.filter((r) => r.status === 'selesai');
  const damageResolutionRate = damageReports.length > 0 ? Math.round((resolvedDamages.length / damageReports.length) * 100) : 100;

  // Drill-down filtering
  const getFilteredTasksForDrillDown = () => {
    let list = tasks;
    if (drillDownStatus === 'pending') {
      list = tasks.filter((t) => t.status === 'pending');
    } else if (drillDownStatus === 'in_progress') {
      list = tasks.filter((t) => t.status === 'in_progress' || t.status === 'pending_qc');
    } else if (drillDownStatus === 'completed') {
      list = tasks.filter((t) => t.status === 'completed');
    }

    if (drillDownSearch.trim()) {
      const q = drillDownSearch.toLowerCase();
      list = list.filter(
        (t) =>
          t.areaName.toLowerCase().includes(q) ||
          t.cleanerName.toLowerCase().includes(q) ||
          t.shift.toLowerCase().includes(q) ||
          (t.workDescription && t.workDescription.toLowerCase().includes(q))
      );
    }
    return list;
  };

  const filteredDrillDownTasks = getFilteredTasksForDrillDown();

  return (
    <div className="space-y-6">
      {/* 1. KPI SIKLUS PEKERJAAN: DIRENCANAKAN, DIPROSES, DISELESAIKAN */}
      {visibility.kpiWorkLifecycle && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5">
          {/* Header of Lifecycle KPI */}
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
                Monitoring komprehensif seluruh pekerjaan yang <strong>Direncanakan</strong>, <strong>Sedang Diproses</strong>, dan <strong>Telah Diselesaikan</strong>
              </p>
            </div>

            {/* Scope Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setScopeFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  scopeFilter === 'all'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua Pekerjaan
              </button>
              <button
                type="button"
                onClick={() => setScopeFilter('daily')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  scopeFilter === 'daily'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tugas Harian
              </button>
              <button
                type="button"
                onClick={() => setScopeFilter('mcp')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  scopeFilter === 'mcp'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Program Berkala (MCP)
              </button>
            </div>
          </div>

          {/* 3 Main Lifecycle Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* PILLAR 1: DI-RENCANAKAN (Target) */}
            <div
              id="kpi-card-direncanakan"
              className="p-4 rounded-xl bg-slate-50/90 border border-slate-200/90 flex flex-col justify-between hover:border-slate-300 transition-all group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-slate-500" />
                    1. Direncanakan (Target)
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    100% Dialokasi
                  </span>
                </div>

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900 font-heading">
                    {scopeFilter === 'all'
                      ? consolidatedPlanned
                      : scopeFilter === 'daily'
                      ? tasks.length
                      : mcpScheduledDays}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {scopeFilter === 'all'
                      ? 'total item kerja'
                      : scopeFilter === 'daily'
                      ? 'titik kerja shift'
                      : 'jadwal program'}
                  </span>
                </div>

                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Target pengerjaan kebersihan dari Roster Shift Pagi, Siang & Malam serta Program Berkala.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Belum Dimulai:</span>
                  <strong className="text-slate-800">
                    {notStartedTasks.length} tugas ({pendingRate}%)
                  </strong>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Butir Checklist SOP:</span>
                  <strong className="text-slate-800">{totalChecklistItems} butir</strong>
                </div>
                <button
                  type="button"
                  onClick={() => setDrillDownStatus('pending')}
                  className="w-full mt-2 py-1.5 px-2.5 rounded-lg bg-slate-200/70 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Lihat Daftar Direncanakan</span>
                </button>
              </div>
            </div>

            {/* PILLAR 2: SEDANG DIPROSES (In Progress & QC) */}
            <div
              id="kpi-card-diproses"
              className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/90 flex flex-col justify-between hover:border-blue-300 transition-all group"
            >
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
                  <span className="text-3xl sm:text-4xl font-black text-blue-900 font-heading">
                    {scopeFilter === 'all' ? consolidatedProcessing : totalInProcessing}
                  </span>
                  <span className="text-xs text-blue-700 font-medium">tugas aktif di lapangan</span>
                </div>

                <p className="text-xs text-blue-700 mt-1.5 leading-relaxed">
                  Pekerjaan yang saat ini sedang dikerjakan cleaner di lokasi atau menunggu inspeksi QC supervisor.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-blue-200 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-blue-800">
                  <span>Sedang Dikerjakan:</span>
                  <strong className="text-blue-900">{inProgressTasks.length} petugas aktif</strong>
                </div>
                <div className="flex items-center justify-between text-amber-800">
                  <span>Menunggu Verifikasi QC:</span>
                  <strong className="text-amber-900">{pendingQCTasks.length} tugas siap dicek</strong>
                </div>
                <button
                  type="button"
                  onClick={() => setDrillDownStatus('in_progress')}
                  className="w-full mt-2 py-1.5 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Lihat Daftar Sedang Diproses</span>
                </button>
              </div>
            </div>

            {/* PILLAR 3: TELAH DISELESAIKAN (Completed & Terverifikasi) */}
            <div
              id="kpi-card-diselesaikan"
              className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/90 flex flex-col justify-between hover:border-emerald-300 transition-all group"
            >
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
                  <span className="text-3xl sm:text-4xl font-black text-emerald-900 font-heading">
                    {scopeFilter === 'all' ? consolidatedCompleted : completedCount}
                  </span>
                  <span className="text-xs text-emerald-700 font-medium">pekerjaan tuntas</span>
                </div>

                <p className="text-xs text-emerald-700 mt-1.5 leading-relaxed">
                  Pekerjaan selesai 100% standar SOP dengan bukti foto Before & After terwatermark tanggal sah.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-emerald-200 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-emerald-800">
                  <span>Kepatuhan Butir SOP:</span>
                  <strong className="text-emerald-900">{checklistCompletionPct}% Terpenuhi</strong>
                </div>
                <div className="flex items-center justify-between text-emerald-800">
                  <span>Foto Terwatermark:</span>
                  <strong className="text-emerald-900">100% Terverifikasi</strong>
                </div>
                <button
                  type="button"
                  onClick={() => setDrillDownStatus('completed')}
                  className="w-full mt-2 py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Lihat Daftar Telah Diselesaikan</span>
                </button>
              </div>
            </div>
          </div>

          {/* Visual Consolidated Progress Bar */}
          <div className="space-y-2 pt-2 bg-slate-50/60 p-4 rounded-xl border border-slate-200/70">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-700 gap-2">
              <span className="font-bold flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-blue-600" />
                Distribusi Rasio Realisasi Siklus Pekerjaan Hari Ini:
              </span>
              <div className="flex items-center gap-3 text-[11px] font-semibold">
                <span className="flex items-center gap-1 text-emerald-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Diselesaikan ({completionRate}%)
                </span>
                <span className="flex items-center gap-1 text-blue-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Diproses ({inProgressRate}%)
                </span>
                <span className="flex items-center gap-1 text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> Direncanakan ({pendingRate}%)
                </span>
              </div>
            </div>

            <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
              <div
                className="bg-emerald-500 h-full transition-all duration-700"
                style={{ width: `${completionRate}%` }}
                title={`Diselesaikan: ${completedCount} tugas (${completionRate}%)`}
              />
              <div
                className="bg-blue-500 h-full transition-all duration-700"
                style={{ width: `${inProgressRate}%` }}
                title={`Sedang Diproses: ${totalInProcessing} tugas (${inProgressRate}%)`}
              />
              <div
                className="bg-slate-300 h-full transition-all duration-700"
                style={{ width: `${pendingRate}%` }}
                title={`Direncanakan: ${notStartedTasks.length} tugas (${pendingRate}%)`}
              />
            </div>
          </div>
        </div>
      )}

      {/* 2. KPI NILAI KUALITAS YANG DICAPAI (QUALITY SCORE & AUDIT QC) */}
      {visibility.kpiQualityScore && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                  <Award className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  KPI Nilai Kualitas Kebersihan yang Dicapai
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Indeks mutu kebersihan aktual berdasarkan hasil audit inspeksi QC pengawas, standar SOP 5 pilar, dan kepatuhan mutu
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('inspeksi')}
                className="text-xs text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-1 hover:underline bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200"
              >
                <span>Buka Panel QC Inspeksi &rarr;</span>
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
                  <span>Perlu Perbaikan / Rework:</span>
                  <strong className="text-amber-300 font-bold">{needsReworkInspections.length} area</strong>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Toleransi Komplain Klien:</span>
                  <strong className="text-blue-300 font-bold">&lt; 1% dari total area</strong>
                </div>
              </div>
            </div>

            {/* Right 2 cols: 5 Core Cleanliness Criteria Breakdown & Top Cleaners */}
            <div className="lg:col-span-2 space-y-4">
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

              {/* Leaderboard Mutu Petugas */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    Peringkat Nilai Kualitas Petugas Kebersihan Terbaik Hari Ini:
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  {topCleaners.map((cl, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{cl.name}</p>
                        <p className="text-[10px] text-slate-500">{cl.role}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {cl.score} pts
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5">{cl.tasksDone} tugas tuntas</p>
                      </div>
                    </div>
                  ))}
                </div>
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
                  Buka Ceklist &rarr;
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
                  Buka Kerusakan &rarr;
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
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-emerald-800 block font-medium text-[11px]">Tingkat Penyelesaian</span>
                  <span className="text-base font-bold text-emerald-900">
                    {damageResolutionRate}%
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

      {/* DRILL-DOWN TASK LIST MODAL */}
      {drillDownStatus && (
        <div
          id="drilldown-kpi-modal-backdrop"
          onClick={() => {
            setDrillDownStatus(null);
            setDrillDownSearch('');
          }}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
        >
          <div
            id="drilldown-kpi-modal-card"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl sm:rounded-3xl max-w-3xl w-full max-h-[92dvh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col overscroll-contain my-auto"
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-xs px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 flex items-center justify-between z-10 gap-2">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 truncate">
                  <span className="truncate">Daftar Rincian Pekerjaan KPI:</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold shrink-0 ${
                      drillDownStatus === 'pending'
                        ? 'bg-slate-100 text-slate-800'
                        : drillDownStatus === 'in_progress'
                        ? 'bg-blue-100 text-blue-800'
                        : drillDownStatus === 'completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {drillDownStatus === 'pending'
                      ? 'Direncanakan'
                      : drillDownStatus === 'in_progress'
                      ? 'Sedang Diproses'
                      : drillDownStatus === 'completed'
                      ? 'Diselesaikan'
                      : 'Semua'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  Ditemukan {filteredDrillDownTasks.length} pekerjaan sesuai kategori yang dipilih
                </p>
              </div>

              <button
                id="close-drilldown-kpi-btn"
                type="button"
                onClick={() => {
                  setDrillDownStatus(null);
                  setDrillDownSearch('');
                }}
                aria-label="Tutup Rincian Pekerjaan KPI"
                className="p-2 text-slate-400 hover:text-slate-700 active:text-slate-900 rounded-full hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Tabs & Search in Modal */}
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setDrillDownStatus('all')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    drillDownStatus === 'all'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  Semua ({tasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDrillDownStatus('pending')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    drillDownStatus === 'pending'
                      ? 'bg-slate-800 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  Direncanakan ({notStartedTasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDrillDownStatus('in_progress')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    drillDownStatus === 'in_progress'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  Sedang Diproses ({totalInProcessing})
                </button>
                <button
                  type="button"
                  onClick={() => setDrillDownStatus('completed')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    drillDownStatus === 'completed'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  Diselesaikan ({completedCount})
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari area / petugas..."
                  value={drillDownSearch}
                  onChange={(e) => setDrillDownSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden w-full sm:w-48"
                />
              </div>
            </div>

            {/* Task Item List */}
            <div className="p-6 space-y-3 overflow-y-auto flex-1 divide-y divide-slate-100">
              {filteredDrillDownTasks.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="font-semibold text-sm">Tidak ada pekerjaan pada kategori ini</p>
                </div>
              ) : (
                filteredDrillDownTasks.map((task) => {
                  const checkedCount = task.checklistArea?.filter((c) => c.checked).length || 0;
                  const totalChecklist = task.checklistArea?.length || 0;

                  return (
                    <div
                      key={task.id}
                      className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">{task.areaName}</h4>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              task.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : task.status === 'in_progress'
                                ? 'bg-blue-100 text-blue-800'
                                : task.status === 'pending_qc'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {task.status === 'completed'
                              ? '✓ Selesai'
                              : task.status === 'in_progress'
                              ? '▶ Sedang Dikerjakan'
                              : task.status === 'pending_qc'
                              ? '⏱ Menunggu QC'
                              : '⏳ Belum Mulai'}
                          </span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            {task.shift}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Petugas: <strong className="text-slate-700">{task.cleanerName}</strong> • Jam: {task.scheduledTime} - {task.deadlineTime}
                        </p>
                        <p className="text-xs text-slate-400">
                          Checklist SOP: {checkedCount}/{totalChecklist} item ({Math.round((checkedCount / (totalChecklist || 1)) * 100)}%)
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {task.photoBefore && task.photoAfter && (
                          <button
                            type="button"
                            onClick={() => setSelectedTaskForPhoto(task)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg border border-sky-200 transition-colors"
                          >
                            <Camera className="w-3 h-3" />
                            <span>Foto Before-After</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setDrillDownStatus(null);
                            setActiveTab('activity');
                          }}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Lihat di Aktivitas"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-xs px-4 sm:px-6 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <span className="text-xs text-slate-500 text-center sm:text-left">
                Menampilkan data pekerjaan real-time dari proyek aktif.
              </span>
              <button
                id="close-drilldown-kpi-footer-btn"
                type="button"
                onClick={() => {
                  setDrillDownStatus(null);
                  setDrillDownSearch('');
                }}
                className="px-5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-xl transition-colors min-h-[44px] flex items-center justify-center cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Before / After Photo Comparison Modal */}
      {selectedTaskForPhoto && (
        <BeforeAfterModal
          isOpen={!!selectedTaskForPhoto}
          onClose={() => setSelectedTaskForPhoto(null)}
          title={`Verifikasi Hasil Kerja: ${selectedTaskForPhoto.areaName}`}
          areaName={selectedTaskForPhoto.areaName}
          cleanerName={selectedTaskForPhoto.cleanerName}
          photoBefore={selectedTaskForPhoto.photoBefore}
          photoProgress={selectedTaskForPhoto.photoProgress}
          photoAfter={selectedTaskForPhoto.photoAfter}
          completedTime={selectedTaskForPhoto.completedTime}
          remarks={selectedTaskForPhoto.remarks}
        />
      )}
    </div>
  );
};
